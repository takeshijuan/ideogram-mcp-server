/**
 * ideogram_cancel_prediction Tool
 *
 * Cancels locally queued async generation jobs before they're sent to the Ideogram API.
 * Since the Ideogram API is synchronous only, this tool provides a LOCAL implementation
 * for cancellation of predictions queued via ideogram_generate_async.
 *
 * Features:
 * - Cancels predictions in 'queued' status
 * - Returns appropriate status for already processing/completed predictions
 * - Cannot cancel jobs already submitted to the Ideogram API
 *
 * @example
 * ```typescript
 * // Cancel a queued prediction
 * const result = await ideogramCancelPrediction({
 *   prediction_id: 'pred_abc123...',
 * });
 *
 * // Check the result
 * if (isCancellationSuccessful(result)) {
 *   console.log('Prediction cancelled successfully');
 * } else {
 *   console.log('Could not cancel:', result.reason);
 * }
 * ```
 */

import type { Logger } from 'pino';
import type { z } from 'zod';

import {
  CancelPredictionInputSchema,
  type CancelPredictionInput,
  type CancelPredictionOutput,
  type CancelPredictionSuccessOutput,
  type CancelPredictionFailedOutput,
  type ToolErrorOutput,
} from '../types/tool.types.js';
import type { PredictionStatus } from '../types/api.types.js';
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
export const TOOL_NAME = 'ideogram_cancel_prediction';

/**
 * Tool description for MCP registration
 */
export const TOOL_DESCRIPTION = `Cancel a queued async image generation request.

This tool cancels a prediction that was created with ideogram_generate_async. It only works for predictions that are still in the queue - once a prediction starts processing (submitted to the Ideogram API), it cannot be cancelled.

This is a LOCAL implementation since the Ideogram API is synchronous only. Cancellation is managed by the local job queue.

Parameters:
- prediction_id: The unique ID returned from ideogram_generate_async (required)

Returns one of:
1. **Success** (status: 'cancelled'):
   - The prediction was successfully cancelled
   - It will not be processed and no credits will be used

2. **Failed** (status: 'processing' | 'completed' | 'failed'):
   - Cannot cancel because the prediction is already processing or completed
   - If 'processing': The job was already sent to the Ideogram API
   - If 'completed': The job finished successfully
   - If 'failed': The job already failed

Note: You can only cancel predictions that are in 'queued' status. Once processing begins, the Ideogram API call is in progress and cannot be stopped.

Typical workflow:
1. Call ideogram_generate_async to queue a request
2. If you change your mind, call ideogram_cancel_prediction before it starts processing
3. Use ideogram_get_prediction to verify the cancellation`;

/**
 * Tool input schema for MCP registration
 */
export const TOOL_SCHEMA = CancelPredictionInputSchema;

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for the cancel prediction tool handler
 */
export interface CancelPredictionToolOptions {
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
 * Result type from the cancel prediction tool
 */
export type CancelPredictionToolResult = CancelPredictionOutput | ToolErrorOutput;

// =============================================================================
// Tool Handler Factory
// =============================================================================

/**
 * Creates a handler function for the ideogram_cancel_prediction tool.
 *
 * @param options - Configuration options for the handler
 * @returns The tool handler function
 *
 * @example
 * ```typescript
 * // Create handler with default options
 * const handler = createCancelPredictionHandler();
 *
 * // Create handler with custom store
 * const handler = createCancelPredictionHandler({
 *   store: myPredictionStore,
 * });
 * ```
 */
export function createCancelPredictionHandler(
  options: CancelPredictionToolOptions = {}
): (input: CancelPredictionInput) => Promise<CancelPredictionToolResult> {
  // Initialize dependencies
  const log = options.logger ?? createChildLogger('tool:cancel-prediction');
  const store = options.store ?? createPredictionStore(options.storeOptions);

  /**
   * Tool handler implementation
   */
  return async function ideogramCancelPredictionHandler(
    input: CancelPredictionInput
  ): Promise<CancelPredictionToolResult> {
    const startTime = Date.now();

    // Log tool invocation
    logToolInvocation(log, {
      tool: TOOL_NAME,
      params: {
        prediction_id: input.prediction_id,
      },
    });

    try {
      // Attempt to cancel the prediction
      const cancelResult = store.cancel(input.prediction_id);

      // Build response based on cancellation result
      let result: CancelPredictionOutput;

      if (cancelResult.success) {
        // Successfully cancelled
        const successResult: CancelPredictionSuccessOutput = {
          success: true,
          prediction_id: input.prediction_id,
          status: 'cancelled',
          message: 'Prediction successfully cancelled. No credits will be used.',
        };
        result = successResult;
      } else {
        // Could not cancel - build appropriate failure message
        const statusLabels: Record<PredictionStatus, string> = {
          queued: 'is still queued',
          processing: 'is already being processed by the Ideogram API and cannot be stopped',
          completed: 'has already completed successfully',
          failed: 'has already failed',
          cancelled: 'was already cancelled',
        };

        const reasonMessages: Record<PredictionStatus, string> = {
          queued: 'Prediction is queued but cancellation failed unexpectedly',
          processing: 'Cannot cancel - prediction is already being processed',
          completed: 'Cannot cancel - prediction already completed',
          failed: 'Cannot cancel - prediction already failed',
          cancelled: 'Prediction was already cancelled',
        };

        // Determine if this status can be returned (processing, completed, failed per interface)
        // Note: 'cancelled' from store is converted to a success case above, so this branch
        // handles the edge case where it's already cancelled
        const failedResult: CancelPredictionFailedOutput = {
          success: false,
          prediction_id: input.prediction_id,
          status:
            cancelResult.status === 'cancelled'
              ? 'failed'
              : (cancelResult.status as 'completed' | 'processing' | 'failed'),
          reason: reasonMessages[cancelResult.status],
          message:
            `Cannot cancel this prediction because it ${statusLabels[cancelResult.status]}. ${
              cancelResult.status === 'processing'
                ? 'The job was already sent to the Ideogram API.'
                : cancelResult.status === 'completed'
                  ? 'Use ideogram_get_prediction to retrieve the results.'
                  : ''
            }`.trim(),
        };
        result = failedResult;
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
          predictionId: input.prediction_id,
          cancelled: cancelResult.success,
          status: cancelResult.status,
          durationMs,
        },
        'Cancel prediction request processed'
      );

      return result;
    } catch (error) {
      // Convert to IdeogramMCPError if needed
      const mcpError = error instanceof IdeogramMCPError ? error : wrapError(error);

      // Log failure
      const durationMs = Date.now() - startTime;
      logError(log, mcpError, 'Cancel prediction failed', {
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
let defaultHandler: ((input: CancelPredictionInput) => Promise<CancelPredictionToolResult>) | null =
  null;

/**
 * Default prediction store instance.
 * Should be shared with the generate-async and get-prediction tools.
 */
let defaultStore: PredictionStore | null = null;

/**
 * Sets the default prediction store for sharing across tools.
 * This should be called with the same store used by ideogram_generate_async
 * and ideogram_get_prediction.
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
  input: CancelPredictionInput
) => Promise<CancelPredictionToolResult> {
  if (!defaultHandler) {
    defaultHandler = createCancelPredictionHandler({
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
 * Cancels an async prediction using the default configuration.
 *
 * This is a convenience function that uses the default handler.
 * For custom configuration, use `createCancelPredictionHandler()` instead.
 *
 * @param input - The cancel prediction input parameters
 * @returns Promise resolving to the cancellation result
 *
 * @example
 * ```typescript
 * const result = await ideogramCancelPrediction({
 *   prediction_id: 'pred_abc123...',
 * });
 *
 * if (result.success) {
 *   console.log('Prediction cancelled');
 * } else if ('reason' in result) {
 *   console.log(`Cannot cancel: ${result.reason}`);
 * } else {
 *   console.error(`Error: ${result.error}`);
 * }
 * ```
 */
export async function ideogramCancelPrediction(
  input: CancelPredictionInput
): Promise<CancelPredictionToolResult> {
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
 * import { ideogramCancelPredictionTool } from './tools/cancel-prediction.js';
 *
 * const server = new McpServer({ name: 'ideogram', version: '1.0.0' });
 *
 * server.tool(
 *   ideogramCancelPredictionTool.name,
 *   ideogramCancelPredictionTool.description,
 *   ideogramCancelPredictionTool.schema,
 *   ideogramCancelPredictionTool.handler
 * );
 * ```
 */
export const ideogramCancelPredictionTool = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  schema: TOOL_SCHEMA,
  handler: ideogramCancelPrediction,
} as const;

/**
 * Type for the tool schema shape (for MCP SDK compatibility)
 */
export type CancelPredictionToolSchema = z.infer<typeof CancelPredictionInputSchema>;
