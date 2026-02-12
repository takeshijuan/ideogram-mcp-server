/**
 * Tools Index
 *
 * This module exports all MCP tools for the Ideogram MCP Server and provides
 * a registration helper for registering all tools with an MCP server.
 *
 * @example
 * ```typescript
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import { registerTools, initializeSharedStore } from './tools/index.js';
 *
 * const server = new McpServer({ name: 'ideogram', version: '1.0.0' });
 *
 * // Initialize shared prediction store (required for async tools)
 * initializeSharedStore();
 *
 * // Register all tools with the server
 * registerTools(server);
 * ```
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { PredictionStore, createPredictionStore } from '../services/prediction.store.js';

// =============================================================================
// Re-export Tool Modules
// =============================================================================

// Generate Tool
export {
  TOOL_NAME as GENERATE_TOOL_NAME,
  TOOL_DESCRIPTION as GENERATE_TOOL_DESCRIPTION,
  TOOL_SCHEMA as GENERATE_TOOL_SCHEMA,
  createGenerateHandler,
  getDefaultHandler as getGenerateDefaultHandler,
  resetDefaultHandler as resetGenerateDefaultHandler,
  ideogramGenerate,
  ideogramGenerateTool,
  type GenerateToolOptions,
  type GenerateToolResult,
  type GenerateToolSchema,
} from './generate.js';

// Edit Tool
export {
  TOOL_NAME as EDIT_TOOL_NAME,
  TOOL_DESCRIPTION as EDIT_TOOL_DESCRIPTION,
  TOOL_SCHEMA as EDIT_TOOL_SCHEMA,
  createEditHandler,
  getDefaultHandler as getEditDefaultHandler,
  resetDefaultHandler as resetEditDefaultHandler,
  ideogramEdit,
  ideogramEditTool,
  type EditToolOptions,
  type EditToolResult,
  type EditToolSchema,
} from './edit.js';

// Generate Async Tool
export {
  TOOL_NAME as GENERATE_ASYNC_TOOL_NAME,
  TOOL_DESCRIPTION as GENERATE_ASYNC_TOOL_DESCRIPTION,
  TOOL_SCHEMA as GENERATE_ASYNC_TOOL_SCHEMA,
  createGenerateAsyncHandler,
  getDefaultHandler as getGenerateAsyncDefaultHandler,
  getDefaultStore as getGenerateAsyncDefaultStore,
  resetDefaultHandler as resetGenerateAsyncDefaultHandler,
  ideogramGenerateAsync,
  ideogramGenerateAsyncTool,
  type GenerateAsyncToolOptions,
  type GenerateAsyncToolResult,
  type GenerateAsyncToolSchema,
} from './generate-async.js';

// Get Prediction Tool
export {
  TOOL_NAME as GET_PREDICTION_TOOL_NAME,
  TOOL_DESCRIPTION as GET_PREDICTION_TOOL_DESCRIPTION,
  TOOL_SCHEMA as GET_PREDICTION_TOOL_SCHEMA,
  createGetPredictionHandler,
  getDefaultHandler as getGetPredictionDefaultHandler,
  getDefaultStore as getGetPredictionDefaultStore,
  setDefaultStore as setGetPredictionDefaultStore,
  resetDefaultHandler as resetGetPredictionDefaultHandler,
  ideogramGetPrediction,
  ideogramGetPredictionTool,
  type GetPredictionToolOptions,
  type GetPredictionToolResult,
  type GetPredictionToolSchema,
} from './get-prediction.js';

// Cancel Prediction Tool
export {
  TOOL_NAME as CANCEL_PREDICTION_TOOL_NAME,
  TOOL_DESCRIPTION as CANCEL_PREDICTION_TOOL_DESCRIPTION,
  TOOL_SCHEMA as CANCEL_PREDICTION_TOOL_SCHEMA,
  createCancelPredictionHandler,
  getDefaultHandler as getCancelPredictionDefaultHandler,
  getDefaultStore as getCancelPredictionDefaultStore,
  setDefaultStore as setCancelPredictionDefaultStore,
  resetDefaultHandler as resetCancelPredictionDefaultHandler,
  ideogramCancelPrediction,
  ideogramCancelPredictionTool,
  type CancelPredictionToolOptions,
  type CancelPredictionToolResult,
  type CancelPredictionToolSchema,
} from './cancel-prediction.js';

// =============================================================================
// Tool Definition Type
// =============================================================================

/**
 * Tool definition object structure for MCP registration.
 * Each tool module exports an object of this shape.
 */
export interface ToolDefinition<TSchema extends z.ZodType> {
  /**
   * The tool name for MCP registration
   */
  name: string;

  /**
   * Human-readable description of the tool
   */
  description: string;

  /**
   * Zod schema for input validation
   */
  schema: TSchema;

  /**
   * The handler function that executes the tool
   */
  handler: (input: z.infer<TSchema>) => Promise<unknown>;
}

// =============================================================================
// All Tools Array
// =============================================================================

// Import the tool definition objects
import { ideogramGenerateTool } from './generate.js';
import { ideogramEditTool } from './edit.js';
import { ideogramGenerateAsyncTool } from './generate-async.js';
import { ideogramGetPredictionTool } from './get-prediction.js';
import { ideogramCancelPredictionTool } from './cancel-prediction.js';

/**
 * Array of all tool definitions for easy iteration.
 *
 * @example
 * ```typescript
 * import { allTools } from './tools/index.js';
 *
 * for (const tool of allTools) {
 *   console.log(`Tool: ${tool.name}`);
 * }
 * ```
 */
export const allTools = [
  ideogramGenerateTool,
  ideogramEditTool,
  ideogramGenerateAsyncTool,
  ideogramGetPredictionTool,
  ideogramCancelPredictionTool,
] as const;

/**
 * Type for the allTools array
 */
export type AllTools = typeof allTools;

/**
 * Tool names as a union type
 */
export type ToolName = (typeof allTools)[number]['name'];

// =============================================================================
// Shared Prediction Store
// =============================================================================

/**
 * Shared prediction store instance for async tools.
 * This store is shared between ideogram_generate_async, ideogram_get_prediction,
 * and ideogram_cancel_prediction tools.
 */
let sharedPredictionStore: PredictionStore | null = null;

/**
 * Initializes the shared prediction store for async tools.
 *
 * This must be called before using the async tools (ideogram_generate_async,
 * ideogram_get_prediction, ideogram_cancel_prediction) to ensure they all
 * share the same prediction state.
 *
 * @param options - Optional configuration for the prediction store
 * @returns The shared PredictionStore instance
 *
 * @example
 * ```typescript
 * import { initializeSharedStore, registerTools } from './tools/index.js';
 *
 * // Initialize the shared store before registering tools
 * const store = initializeSharedStore();
 *
 * // The store is now shared between all async tools
 * ```
 */
export function initializeSharedStore(
  options?: Parameters<typeof createPredictionStore>[0]
): PredictionStore {
  if (!sharedPredictionStore) {
    sharedPredictionStore = createPredictionStore(options);

    // Share the store with the tools that need it
    // Note: We import these dynamically to avoid circular dependencies
    import('./get-prediction.js').then(({ setDefaultStore }) => {
      if (sharedPredictionStore) {
        setDefaultStore(sharedPredictionStore);
      }
    });
    import('./cancel-prediction.js').then(({ setDefaultStore }) => {
      if (sharedPredictionStore) {
        setDefaultStore(sharedPredictionStore);
      }
    });
  }
  return sharedPredictionStore;
}

/**
 * Gets the shared prediction store instance.
 *
 * @returns The shared PredictionStore or null if not initialized
 */
export function getSharedStore(): PredictionStore | null {
  return sharedPredictionStore;
}

/**
 * Disposes of the shared prediction store and resets all tool handlers.
 *
 * Call this when shutting down the server or during testing.
 */
export function disposeSharedStore(): void {
  if (sharedPredictionStore) {
    sharedPredictionStore.dispose();
    sharedPredictionStore = null;
  }
}

/**
 * Resets all tool handlers to their initial state.
 *
 * This is useful for testing or when configuration changes.
 * It disposes of the shared store and resets all handlers.
 */
export function resetAllHandlers(): void {
  disposeSharedStore();

  // Reset individual tool handlers
  import('./generate.js').then(({ resetDefaultHandler }) => resetDefaultHandler());
  import('./edit.js').then(({ resetDefaultHandler }) => resetDefaultHandler());
  import('./generate-async.js').then(({ resetDefaultHandler }) => resetDefaultHandler());
  import('./get-prediction.js').then(({ resetDefaultHandler }) => resetDefaultHandler());
  import('./cancel-prediction.js').then(({ resetDefaultHandler }) => resetDefaultHandler());
}

// =============================================================================
// Tool Registration Helper
// =============================================================================

/**
 * Configuration options for tool registration.
 */
export interface RegisterToolsOptions {
  /**
   * If true, initialize the shared prediction store automatically.
   * Default: true
   */
  initializeStore?: boolean;

  /**
   * Options for the prediction store (if initializeStore is true).
   */
  storeOptions?: Parameters<typeof createPredictionStore>[0];
}

/**
 * Registers all Ideogram tools with an MCP server.
 *
 * This is the recommended way to set up the server. It:
 * - Initializes the shared prediction store for async tools
 * - Registers all 5 MVP tools with the server
 *
 * @param server - The MCP server instance
 * @param options - Optional configuration
 *
 * @example
 * ```typescript
 * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 * import { registerTools } from './tools/index.js';
 *
 * const server = new McpServer({
 *   name: 'ideogram-mcp-server',
 *   version: '1.0.0',
 * });
 *
 * // Register all tools
 * registerTools(server);
 *
 * // Now all tools are available:
 * // - ideogram_generate
 * // - ideogram_edit
 * // - ideogram_generate_async
 * // - ideogram_get_prediction
 * // - ideogram_cancel_prediction
 * ```
 */
export function registerTools(server: McpServer, options: RegisterToolsOptions = {}): void {
  const { initializeStore = true, storeOptions } = options;

  // Initialize shared store if requested
  if (initializeStore) {
    initializeSharedStore(storeOptions);
  }

  // Register each tool with the server using the 4-parameter pattern
  // server.tool(name, description, schema, handler)
  for (const tool of allTools) {
    server.tool(
      tool.name,
      tool.description,
      // Type assertion needed because the SDK types are complex
      // The schema is a valid Zod schema object - cast through unknown first
      tool.schema as unknown as Record<string, unknown>,
      // The handler receives validated input and returns a result
      async (input: unknown) => {
        // Cast handler to accept unknown input since MCP SDK already validates against schema
        const handler = tool.handler as (input: unknown) => Promise<unknown>;
        const result = await handler(input);

        // Return the result formatted for MCP
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );
  }
}

/**
 * Gets a tool definition by name.
 *
 * @param name - The tool name to look up
 * @returns The tool definition or undefined if not found
 *
 * @example
 * ```typescript
 * import { getToolByName } from './tools/index.js';
 *
 * const generateTool = getToolByName('ideogram_generate');
 * if (generateTool) {
 *   console.log(generateTool.description);
 * }
 * ```
 */
export function getToolByName(name: string): (typeof allTools)[number] | undefined {
  return allTools.find((tool) => tool.name === name);
}

/**
 * Gets all tool names.
 *
 * @returns Array of all tool names
 *
 * @example
 * ```typescript
 * import { getToolNames } from './tools/index.js';
 *
 * console.log(getToolNames());
 * // ['ideogram_generate', 'ideogram_edit', 'ideogram_generate_async', ...]
 * ```
 */
export function getToolNames(): string[] {
  return allTools.map((tool) => tool.name);
}
