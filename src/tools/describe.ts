/**
 * ideogram_describe Tool
 *
 * Generates text descriptions from images using the Ideogram API.
 *
 * Features:
 * - Supports V_2 and V_3 model versions for description
 * - Accepts images as URLs, file paths, or base64 data URLs
 * - Returns one or more text descriptions per image
 *
 * This is the simplest tool: no cost calculation, no local storage.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await ideogramDescribe({
 *   image: 'https://example.com/photo.jpg',
 * });
 *
 * // With specific model version
 * const result = await ideogramDescribe({
 *   image: 'https://example.com/photo.jpg',
 *   describe_model_version: 'V_2',
 * });
 * ```
 */

import type { Logger } from 'pino';
import type { z } from 'zod';

import {
  DescribeInputSchema,
  type DescribeInput,
  type DescribeOutput,
  type ToolErrorOutput,
} from '../types/tool.types.js';
import {
  IdeogramClient,
  createIdeogramClient,
  type IdeogramClientOptions,
} from '../services/ideogram.client.js';
import { IdeogramMCPError, wrapError } from '../utils/error.handler.js';
import { createChildLogger, logToolInvocation, logToolResult, logError } from '../utils/logger.js';

// =============================================================================
// Tool Constants
// =============================================================================

/**
 * Tool name for MCP registration
 */
export const TOOL_NAME = 'ideogram_describe';

/**
 * Tool description for MCP registration
 */
export const TOOL_DESCRIPTION = `Generate text descriptions from images using Ideogram AI.

Analyzes an image and produces one or more text descriptions of its contents.

Features:
- Model version selection: V_2 or V_3 (default)
- Accepts images as URLs, file paths, or base64 data URLs
- Returns detailed text descriptions of the image

Returns an array of text descriptions.`;

/**
 * Tool input schema for MCP registration
 */
export const TOOL_SCHEMA = DescribeInputSchema;

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for the describe tool handler
 */
export interface DescribeToolOptions {
  /**
   * Custom IdeogramClient instance
   */
  client?: IdeogramClient;

  /**
   * Options for creating a new client (if client not provided)
   */
  clientOptions?: IdeogramClientOptions;

  /**
   * Custom logger instance
   */
  logger?: Logger;
}

/**
 * Result type from the describe tool
 */
export type DescribeToolResult = DescribeOutput | ToolErrorOutput;

// =============================================================================
// Tool Handler Factory
// =============================================================================

/**
 * Creates a handler function for the ideogram_describe tool.
 *
 * @param options - Configuration options for the handler
 * @returns The tool handler function
 *
 * @example
 * ```typescript
 * // Create handler with default options
 * const handler = createDescribeHandler();
 *
 * // Create handler with custom client
 * const handler = createDescribeHandler({
 *   client: new IdeogramClient({ apiKey: 'my-key' }),
 * });
 * ```
 */
export function createDescribeHandler(
  options: DescribeToolOptions = {}
): (input: DescribeInput) => Promise<DescribeToolResult> {
  // Initialize dependencies
  const log = options.logger ?? createChildLogger('tool:describe');
  const client = options.client ?? createIdeogramClient(options.clientOptions);

  /**
   * Tool handler implementation
   */
  return async function ideogramDescribeHandler(
    input: DescribeInput
  ): Promise<DescribeToolResult> {
    const startTime = Date.now();

    // Log tool invocation
    logToolInvocation(log, {
      tool: TOOL_NAME,
      params: {
        hasImage: !!input.image,
        describe_model_version: input.describe_model_version,
      },
    });

    try {
      // Build describe params, only including defined optional fields
      // (required for exactOptionalPropertyTypes compliance)
      const describeParams: Parameters<typeof client.describe>[0] = {
        image: input.image,
      };

      if (input.describe_model_version !== undefined) {
        describeParams.describeModelVersion = input.describe_model_version;
      }

      // Call Ideogram API
      const response = await client.describe(describeParams);

      // Build successful response
      const result: DescribeOutput = {
        success: true,
        descriptions: response.descriptions.map((d) => ({ text: d.text })),
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
          numDescriptions: result.descriptions.length,
          durationMs,
        },
        'Describe completed successfully'
      );

      return result;
    } catch (error) {
      // Convert to IdeogramMCPError if needed
      const mcpError = error instanceof IdeogramMCPError ? error : wrapError(error);

      // Log failure
      const durationMs = Date.now() - startTime;
      logError(log, mcpError, 'Describe failed', {
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
let defaultHandler: ((input: DescribeInput) => Promise<DescribeToolResult>) | null = null;

/**
 * Gets the default handler instance, creating it if necessary.
 *
 * @returns The default handler function
 */
export function getDefaultHandler(): (input: DescribeInput) => Promise<DescribeToolResult> {
  if (!defaultHandler) {
    defaultHandler = createDescribeHandler();
  }
  return defaultHandler;
}

/**
 * Resets the default handler instance.
 * Useful for testing or when configuration changes.
 */
export function resetDefaultHandler(): void {
  defaultHandler = null;
}

// =============================================================================
// Standalone Function
// =============================================================================

/**
 * Describes an image using the default configuration.
 *
 * This is a convenience function that uses the default handler.
 * For custom configuration, use `createDescribeHandler()` instead.
 *
 * @param input - The describe input parameters
 * @returns Promise resolving to the describe result
 *
 * @example
 * ```typescript
 * const result = await ideogramDescribe({
 *   image: 'https://example.com/photo.jpg',
 *   describe_model_version: 'V_3',
 * });
 *
 * if (result.success) {
 *   for (const desc of result.descriptions) {
 *     console.log(desc.text);
 *   }
 * } else {
 *   console.error(`Error: ${result.user_message}`);
 * }
 * ```
 */
export async function ideogramDescribe(input: DescribeInput): Promise<DescribeToolResult> {
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
 * import { ideogramDescribeTool } from './tools/describe.js';
 *
 * const server = new McpServer({ name: 'ideogram', version: '1.0.0' });
 *
 * server.tool(
 *   ideogramDescribeTool.name,
 *   ideogramDescribeTool.description,
 *   ideogramDescribeTool.schema,
 *   ideogramDescribeTool.handler
 * );
 * ```
 */
export const ideogramDescribeTool = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  schema: TOOL_SCHEMA,
  handler: ideogramDescribe,
} as const;

/**
 * Type for the tool schema shape (for MCP SDK compatibility)
 */
export type DescribeToolSchema = z.infer<typeof DescribeInputSchema>;
