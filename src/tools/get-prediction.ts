/**
 * ideogram_get_prediction Tool
 *
 * Polls for local job queue status and retrieves results for async predictions.
 * Since the Ideogram API is synchronous only, this tool provides a LOCAL implementation
 * for checking the status of predictions queued via ideogram_generate_async.
 *
 * Features:
 * - Returns current status (queued, processing, completed, failed, cancelled)
 * - Provides progress percentage and ETA for pending predictions
 * - Returns complete results with images and cost for completed predictions
 * - Returns error information for failed predictions
 *
 * @example
 * ```typescript
 * // Poll for a prediction status
 * const result = await ideogramGetPrediction({
 *   prediction_id: 'pred_abc123...',
 * });
 *
 * // Check the result
 * if (isPredictionCompleted(result)) {
 *   console.log('Images:', result.images);
 *   console.log('Cost:', result.total_cost);
 * } else if (isPredictionProcessing(result)) {
 *   console.log('Progress:', result.progress);
 *   console.log('ETA:', result.eta_seconds, 'seconds');
 * } else if (isPredictionFailed(result)) {
 *   console.log('Error:', result.error.message);
 * }
 * ```
 */

import type { Logger } from 'pino';
import type { z } from 'zod';

import {
  GetPredictionInputSchema,
  type GetPredictionInput,
  type GetPredictionOutput,
  type GetPredictionProcessingOutput,
  type GetPredictionCompletedOutput,
  type GetPredictionFailedOutput,
  type ToolErrorOutput,
  type GeneratedImageOutput,
} from '../types/tool.types.js';
import type { GenerateResponse, RenderingSpeed } from '../types/api.types.js';
import {
  PredictionStore,
  createPredictionStore,
  type PredictionStoreOptions,
  formatPredictionStatus,
} from '../services/prediction.store.js';
import {
  calculateCost,
  calculateEditCost,
  toCostEstimateOutput,
} from '../services/cost.calculator.js';
import { IdeogramMCPError, wrapError } from '../utils/error.handler.js';
import { createChildLogger, logToolInvocation, logToolResult, logError } from '../utils/logger.js';

// =============================================================================
// Tool Constants
// =============================================================================

/**
 * Tool name for MCP registration
 */
export const TOOL_NAME = 'ideogram_get_prediction';

/**
 * Tool description for MCP registration
 */
export const TOOL_DESCRIPTION = `Check the status of an async image generation request.

This tool polls the local job queue to check the status of a prediction created with ideogram_generate_async. Use it to:
- Monitor progress of queued or processing jobs
- Retrieve completed results including generated images and cost estimates
- Check if a job has failed and get error information

This is a LOCAL implementation since the Ideogram API is synchronous only. The prediction state is managed by the local job queue.

Parameters:
- prediction_id: The unique ID returned from ideogram_generate_async (required)

Returns one of:
1. **Processing** (status: 'queued' or 'processing'):
   - progress: Percentage complete (0-100)
   - eta_seconds: Estimated time remaining
   - message: Status description

2. **Completed** (status: 'completed'):
   - images: Array of generated images with URLs, seeds, etc.
   - total_cost: Estimated credits and USD cost
   - num_images: Count of generated images

3. **Failed** (status: 'failed' or 'cancelled'):
   - error: { code, message, retryable }
   - message: Description of what went wrong

Typical workflow:
1. Call ideogram_generate_async to queue a request
2. Poll with ideogram_get_prediction until status is 'completed' or 'failed'
3. Process the results or handle the error`;

/**
 * Tool input schema for MCP registration
 */
export const TOOL_SCHEMA = GetPredictionInputSchema;

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for the get prediction tool handler
 */
export interface GetPredictionToolOptions {
  /**
   * Custom PredictionStore instance
   */
  store?: PredictionStore;

  /**
   * Options for creating a new store (if store not provided)
   */
  storeOptions?: PredictionStoreOptions;

  /**
   * Custom logger instance
   */
  logger?: Logger;
}

/**
 * Result type from the get prediction tool
 */
export type GetPredictionToolResult = GetPredictionOutput | ToolErrorOutput;

// =============================================================================
// Tool Handler Factory
// =============================================================================

/**
 * Creates a handler function for the ideogram_get_prediction tool.
 *
 * @param options - Configuration options for the handler
 * @returns The tool handler function
 *
 * @example
 * ```typescript
 * // Create handler with default options
 * const handler = createGetPredictionHandler();
 *
 * // Create handler with custom store
 * const handler = createGetPredictionHandler({
 *   store: myPredictionStore,
 * });
 * ```
 */
export function createGetPredictionHandler(
  options: GetPredictionToolOptions = {}
): (input: GetPredictionInput) => Promise<GetPredictionToolResult> {
  // Initialize dependencies
  const log = options.logger ?? createChildLogger('tool:get-prediction');
  const store = options.store ?? createPredictionStore(options.storeOptions);

  /**
   * Tool handler implementation
   */
  return async function ideogramGetPredictionHandler(
    input: GetPredictionInput
  ): Promise<GetPredictionToolResult> {
    const startTime = Date.now();

    // Log tool invocation
    logToolInvocation(log, {
      tool: TOOL_NAME,
      params: {
        prediction_id: input.prediction_id,
      },
    });

    try {
      // Get the prediction from the store
      const prediction = store.getOrThrow(input.prediction_id);

      // Build response based on prediction status
      let result: GetPredictionOutput;

      switch (prediction.status) {
        case 'queued':
        case 'processing': {
          const processingResult: GetPredictionProcessingOutput = {
            success: true,
            prediction_id: prediction.id,
            status: prediction.status,
            message: `Prediction is ${formatPredictionStatus(prediction.status).toLowerCase()}. Please poll again in a few seconds.`,
          };

          // Add optional fields only if defined
          if (prediction.eta_seconds !== undefined) {
            processingResult.eta_seconds = prediction.eta_seconds;
          }
          if (prediction.progress !== undefined) {
            processingResult.progress = prediction.progress;
          }

          result = processingResult;
          break;
        }

        case 'completed': {
          // Extract images from the result
          const images: GeneratedImageOutput[] = [];
          const apiResult = prediction.result as GenerateResponse | undefined;

          if (apiResult?.data) {
            for (const apiImage of apiResult.data) {
              const outputImage: GeneratedImageOutput = {
                url: apiImage.url,
                seed: apiImage.seed,
                is_image_safe: apiImage.is_image_safe,
              };

              // Add optional fields only if defined
              if (apiImage.prompt !== undefined) {
                outputImage.prompt = apiImage.prompt;
              }
              if (apiImage.resolution !== undefined) {
                outputImage.resolution = apiImage.resolution;
              }

              images.push(outputImage);
            }
          }

          // Calculate cost estimate based on request parameters
          const renderingSpeed = (prediction.request.rendering_speed ??
            'DEFAULT') as RenderingSpeed;
          const numImages =
            images.length > 0 ? images.length : (prediction.request.num_images ?? 1);

          // Use different cost calculation for edit vs generate
          const cost =
            prediction.type === 'edit'
              ? calculateEditCost({ numImages, renderingSpeed })
              : calculateCost({ numImages, renderingSpeed });

          const completedResult: GetPredictionCompletedOutput = {
            success: true,
            prediction_id: prediction.id,
            status: 'completed',
            created: prediction.created_at,
            images,
            total_cost: toCostEstimateOutput(cost),
            num_images: images.length,
          };

          result = completedResult;
          break;
        }

        case 'failed':
        case 'cancelled': {
          const failedResult: GetPredictionFailedOutput = {
            success: false,
            prediction_id: prediction.id,
            status: prediction.status,
            error: prediction.error ?? {
              code: prediction.status === 'cancelled' ? 'CANCELLED' : 'UNKNOWN_ERROR',
              message:
                prediction.status === 'cancelled'
                  ? 'Prediction was cancelled by user'
                  : 'Prediction failed with an unknown error',
              retryable: false,
            },
            message:
              prediction.status === 'cancelled'
                ? 'This prediction was cancelled. Create a new async generation request to try again.'
                : `Prediction failed: ${prediction.error?.message ?? 'Unknown error'}. ${prediction.error?.retryable ? 'This error may be retryable.' : 'Please check your input and try again.'}`,
          };

          result = failedResult;
          break;
        }

        default: {
          // This should never happen, but handle it gracefully
          const unknownResult: GetPredictionFailedOutput = {
            success: false,
            prediction_id: prediction.id,
            status: 'failed',
            error: {
              code: 'UNKNOWN_STATUS',
              message: `Unknown prediction status: ${prediction.status}`,
              retryable: false,
            },
            message: 'Prediction has an unknown status. Please contact support.',
          };
          result = unknownResult;
        }
      }

      // Log success
      const durationMs = Date.now() - startTime;
      logToolResult(log, {
        tool: TOOL_NAME,
        success: true,
        durationMs,
      });

      log.debug(
        {
          predictionId: prediction.id,
          status: prediction.status,
          durationMs,
        },
        'Prediction status retrieved successfully'
      );

      return result;
    } catch (error) {
      // Convert to IdeogramMCPError if needed
      const mcpError = error instanceof IdeogramMCPError ? error : wrapError(error);

      // Log failure
      const durationMs = Date.now() - startTime;
      logError(log, mcpError, 'Get prediction failed', {
        tool: TOOL_NAME,
        predictionId: input.prediction_id,
        durationMs,
      });
      logToolResult(log, {
        tool: TOOL_NAME,
        success: false,
        durationMs,
        errorCode: mcpError.code,
      });

      // Return error response
      return mcpError.toToolError();
    }
  };
}

// =============================================================================
// Default Handler
// =============================================================================

/**
 * Default handler instance using environment configuration.
 * Created lazily on first access to allow config to be loaded.
 */
let defaultHandler: ((input: GetPredictionInput) => Promise<GetPredictionToolResult>) | null = null;

/**
 * Default prediction store instance.
 * Should be shared with the generate-async tool.
 */
let defaultStore: PredictionStore | null = null;

/**
 * Sets the default prediction store for sharing across tools.
 * This should be called with the same store used by ideogram_generate_async.
 *
 * @param store - The PredictionStore to use as the default
 */
export function setDefaultStore(store: PredictionStore): void {
  defaultStore = store;
  // Reset handler so it will be recreated with the new store
  defaultHandler = null;
}

/**
 * Gets the default prediction store instance.
 *
 * @returns The default PredictionStore
 */
export function getDefaultStore(): PredictionStore {
  if (!defaultStore) {
    defaultStore = createPredictionStore();
  }
  return defaultStore;
}

/**
 * Gets the default handler instance, creating it if necessary.
 *
 * @returns The default handler function
 */
export function getDefaultHandler(): (
  input: GetPredictionInput
) => Promise<GetPredictionToolResult> {
  if (!defaultHandler) {
    defaultHandler = createGetPredictionHandler({
      store: getDefaultStore(),
    });
  }
  return defaultHandler;
}

/**
 * Resets the default handler and store instances.
 * Useful for testing or when configuration changes.
 */
export function resetDefaultHandler(): void {
  if (defaultStore) {
    defaultStore.dispose();
    defaultStore = null;
  }
  defaultHandler = null;
}

// =============================================================================
// Standalone Function
// =============================================================================

/**
 * Gets the status and results of an async prediction using the default configuration.
 *
 * This is a convenience function that uses the default handler.
 * For custom configuration, use `createGetPredictionHandler()` instead.
 *
 * @param input - The get prediction input parameters
 * @returns Promise resolving to the prediction status/result
 *
 * @example
 * ```typescript
 * const result = await ideogramGetPrediction({
 *   prediction_id: 'pred_abc123...',
 * });
 *
 * if (result.success && result.status === 'completed') {
 *   console.log(`Generated ${result.num_images} images`);
 *   console.log(`Cost: ${result.total_cost.credits_used} credits`);
 *   for (const image of result.images) {
 *     console.log(`  - ${image.url}`);
 *   }
 * } else if (result.success && (result.status === 'queued' || result.status === 'processing')) {
 *   console.log(`Still ${result.status}... progress: ${result.progress}%`);
 *   console.log(`ETA: ${result.eta_seconds} seconds`);
 * } else {
 *   console.error(`Error: ${result.message}`);
 * }
 * ```
 */
export async function ideogramGetPrediction(
  input: GetPredictionInput
): Promise<GetPredictionToolResult> {
  return getDefaultHandler()(input);
}

// =============================================================================
// MCP Tool Registration Helper
// =============================================================================

/**
 * Tool definition for MCP server registration.
 *
 * Contains all the information needed to register this tool with an MCP server:
 * - name: The tool identifier
 * - description: Human-readable description
 * - schema: Zod schema for input validation
 * - handler: The function that executes the tool
 *
 * @example
 * ```typescript
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import { ideogramGetPredictionTool } from './tools/get-prediction.js';
 *
 * const server = new McpServer({ name: 'ideogram', version: '1.0.0' });
 *
 * server.tool(
 *   ideogramGetPredictionTool.name,
 *   ideogramGetPredictionTool.description,
 *   ideogramGetPredictionTool.schema,
 *   ideogramGetPredictionTool.handler
 * );
 * ```
 */
export const ideogramGetPredictionTool = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  schema: TOOL_SCHEMA,
  handler: ideogramGetPrediction,
} as const;

/**
 * Type for the tool schema shape (for MCP SDK compatibility)
 */
export type GetPredictionToolSchema = z.infer<typeof GetPredictionInputSchema>;
