/**
 * ideogram_generate_async Tool
 *
 * Queues image generation requests for background processing using a local job queue.
 * Since the Ideogram API is synchronous only, this tool provides a local async implementation.
 *
 * Features:
 * - Returns immediately with a prediction_id for polling
 * - Supports all generate parameters (prompt, aspect_ratio, num_images, etc.)
 * - Provides ETA estimates based on request parameters
 * - Jobs are processed in FIFO order by the background processor
 * - Optional webhook URL for future notification support
 *
 * @example
 * ```typescript
 * // Queue an async generation
 * const result = await ideogramGenerateAsync({
 *   prompt: 'A beautiful sunset over mountains',
 * });
 *
 * // Returns immediately
 * console.log(result.prediction_id); // 'pred_abc123...'
 * console.log(result.status);        // 'queued'
 * console.log(result.eta_seconds);   // 30
 *
 * // Then poll with ideogram_get_prediction
 * ```
 */

import type { Logger } from 'pino';
import type { z } from 'zod';

import {
  GenerateAsyncInputSchema,
  type GenerateAsyncInput,
  type GenerateAsyncOutput,
  type ToolErrorOutput,
} from '../types/tool.types.js';
import type { GenerateRequest, RenderingSpeed } from '../types/api.types.js';
import {
  PredictionStore,
  createPredictionStore,
  type PredictionStoreOptions,
} from '../services/prediction.store.js';
import { IdeogramMCPError, wrapError } from '../utils/error.handler.js';
import { createChildLogger, logToolInvocation, logToolResult, logError } from '../utils/logger.js';

// =============================================================================
// Tool Constants
// =============================================================================

/**
 * Tool name for MCP registration
 */
export const TOOL_NAME = 'ideogram_generate_async';

/**
 * Tool description for MCP registration
 */
export const TOOL_DESCRIPTION = `Queue an image generation request for background processing.

Returns immediately with a prediction_id that can be used to poll for status and results using ideogram_get_prediction.

This is a LOCAL async implementation since the Ideogram API is synchronous only. Jobs are queued internally and processed in order. Use this when you want to:
- Queue multiple generations without waiting
- Continue working while images generate in the background
- Have more control over the generation workflow

Parameters are the same as ideogram_generate:
- prompt: Text description of the desired image (required)
- aspect_ratio: Image dimensions (1x1, 16x9, etc.)
- num_images: Number of images to generate (1-8)
- rendering_speed: FLASH (fastest), TURBO, DEFAULT, or QUALITY (best)
- magic_prompt: AUTO, ON, or OFF for prompt enhancement
- style_type: AUTO, GENERAL, REALISTIC, DESIGN, or FICTION

Returns:
- prediction_id: Unique ID for polling
- status: 'queued'
- eta_seconds: Estimated time to completion
- message: Status message

After calling this, use ideogram_get_prediction to check status and retrieve results.`;

/**
 * Tool input schema for MCP registration
 */
export const TOOL_SCHEMA = GenerateAsyncInputSchema;

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for the generate async tool handler
 */
export interface GenerateAsyncToolOptions {
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
 * Result type from the generate async tool
 */
export type GenerateAsyncToolResult = GenerateAsyncOutput | ToolErrorOutput;

// =============================================================================
// Tool Handler Factory
// =============================================================================

/**
 * Creates a handler function for the ideogram_generate_async tool.
 *
 * @param options - Configuration options for the handler
 * @returns The tool handler function
 *
 * @example
 * ```typescript
 * // Create handler with default options
 * const handler = createGenerateAsyncHandler();
 *
 * // Create handler with custom store
 * const handler = createGenerateAsyncHandler({
 *   store: myPredictionStore,
 * });
 * ```
 */
export function createGenerateAsyncHandler(
  options: GenerateAsyncToolOptions = {}
): (input: GenerateAsyncInput) => Promise<GenerateAsyncToolResult> {
  // Initialize dependencies
  const log = options.logger ?? createChildLogger('tool:generate-async');
  const store = options.store ?? createPredictionStore(options.storeOptions);

  /**
   * Tool handler implementation
   */
  return async function ideogramGenerateAsyncHandler(
    input: GenerateAsyncInput
  ): Promise<GenerateAsyncToolResult> {
    const startTime = Date.now();

    // Log tool invocation
    logToolInvocation(log, {
      tool: TOOL_NAME,
      params: {
        prompt: input.prompt,
        aspect_ratio: input.aspect_ratio,
        num_images: input.num_images,
        rendering_speed: input.rendering_speed,
        magic_prompt: input.magic_prompt,
        style_type: input.style_type,
        save_locally: input.save_locally,
        webhook_url: input.webhook_url,
      },
    });

    try {
      // Build the generate request for the prediction store
      // Only include defined optional fields (exactOptionalPropertyTypes compliance)
      const generateRequest: GenerateRequest = {
        prompt: input.prompt,
      };

      if (input.negative_prompt !== undefined) {
        generateRequest.negative_prompt = input.negative_prompt;
      }
      if (input.aspect_ratio !== undefined) {
        generateRequest.aspect_ratio = input.aspect_ratio;
      }
      if (input.num_images !== undefined) {
        generateRequest.num_images = input.num_images;
      }
      if (input.seed !== undefined) {
        generateRequest.seed = input.seed;
      }
      if (input.rendering_speed !== undefined) {
        generateRequest.rendering_speed = input.rendering_speed as RenderingSpeed;
      }
      if (input.magic_prompt !== undefined) {
        generateRequest.magic_prompt = input.magic_prompt;
      }
      if (input.style_type !== undefined) {
        generateRequest.style_type = input.style_type;
      }

      // Create the prediction in the store
      // Only include webhookUrl if defined (exactOptionalPropertyTypes compliance)
      const createOptions: Parameters<typeof store.create>[0] = {
        request: generateRequest,
        type: 'generate',
      };
      if (input.webhook_url !== undefined) {
        createOptions.webhookUrl = input.webhook_url;
      }
      const prediction = store.create(createOptions);

      // Build successful response
      const result: GenerateAsyncOutput = {
        success: true,
        prediction_id: prediction.id,
        status: 'queued',
        eta_seconds: prediction.eta_seconds ?? 30,
        message: `Image generation queued successfully. Use ideogram_get_prediction with prediction_id "${prediction.id}" to check status and retrieve results.`,
      };

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
          etaSeconds: result.eta_seconds,
          durationMs,
        },
        'Async generation queued successfully'
      );

      return result;
    } catch (error) {
      // Convert to IdeogramMCPError if needed
      const mcpError = error instanceof IdeogramMCPError ? error : wrapError(error);

      // Log failure
      const durationMs = Date.now() - startTime;
      logError(log, mcpError, 'Async generation queueing failed', {
        tool: TOOL_NAME,
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
let defaultHandler: ((input: GenerateAsyncInput) => Promise<GenerateAsyncToolResult>) | null = null;

/**
 * Default prediction store instance.
 * Shared across handlers to maintain queue state.
 */
let defaultStore: PredictionStore | null = null;

/**
 * Gets the default prediction store instance, creating it if necessary.
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
  input: GenerateAsyncInput
) => Promise<GenerateAsyncToolResult> {
  if (!defaultHandler) {
    defaultHandler = createGenerateAsyncHandler({
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
 * Queues an image generation request using the default configuration.
 *
 * This is a convenience function that uses the default handler.
 * For custom configuration, use `createGenerateAsyncHandler()` instead.
 *
 * @param input - The generation input parameters
 * @returns Promise resolving to the queued result
 *
 * @example
 * ```typescript
 * const result = await ideogramGenerateAsync({
 *   prompt: 'A serene Japanese garden with cherry blossoms',
 *   aspect_ratio: '16x9',
 *   num_images: 2,
 * });
 *
 * if (result.success) {
 *   console.log(`Queued with ID: ${result.prediction_id}`);
 *   console.log(`ETA: ${result.eta_seconds} seconds`);
 *   // Now poll with ideogram_get_prediction
 * } else {
 *   console.error(`Error: ${result.user_message}`);
 * }
 * ```
 */
export async function ideogramGenerateAsync(
  input: GenerateAsyncInput
): Promise<GenerateAsyncToolResult> {
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
 * import { ideogramGenerateAsyncTool } from './tools/generate-async.js';
 *
 * const server = new McpServer({ name: 'ideogram', version: '1.0.0' });
 *
 * server.tool(
 *   ideogramGenerateAsyncTool.name,
 *   ideogramGenerateAsyncTool.description,
 *   ideogramGenerateAsyncTool.schema,
 *   ideogramGenerateAsyncTool.handler
 * );
 * ```
 */
export const ideogramGenerateAsyncTool = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  schema: TOOL_SCHEMA,
  handler: ideogramGenerateAsync,
} as const;

/**
 * Type for the tool schema shape (for MCP SDK compatibility)
 */
export type GenerateAsyncToolSchema = z.infer<typeof GenerateAsyncInputSchema>;
