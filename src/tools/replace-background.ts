/**
 * ideogram_replace_background Tool
 *
 * Replaces image backgrounds while preserving foreground subjects using the Ideogram API v3.
 *
 * Features:
 * - Automatic foreground detection and preservation
 * - Text prompt for describing the desired new background
 * - Configurable rendering speed (FLASH, TURBO, DEFAULT, QUALITY)
 * - Magic prompt enhancement options
 * - Optional local image saving
 * - Cost tracking in all responses
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await ideogramReplaceBackground({
 *   image: 'https://example.com/portrait.jpg',
 *   prompt: 'A tropical beach at sunset',
 * });
 *
 * // With all options
 * const result = await ideogramReplaceBackground({
 *   image: 'https://example.com/portrait.jpg',
 *   prompt: 'Standing in a futuristic city',
 *   magic_prompt: 'ON',
 *   rendering_speed: 'QUALITY',
 *   num_images: 4,
 *   save_locally: true,
 * });
 * ```
 */

import type { Logger } from 'pino';
import type { z } from 'zod';

import {
  ReplaceBackgroundInputSchema,
  type ReplaceBackgroundInput,
  type ReplaceBackgroundOutput,
  type ToolErrorOutput,
  type GeneratedImageOutput,
} from '../types/tool.types.js';
import type { RenderingSpeed } from '../types/api.types.js';
import {
  IdeogramClient,
  createIdeogramClient,
  type IdeogramClientOptions,
} from '../services/ideogram.client.js';
import { calculateReplaceBgCost, toCostEstimateOutput } from '../services/cost.calculator.js';
import {
  StorageService,
  createStorageService,
  type StorageServiceOptions,
} from '../services/storage.service.js';
import { IdeogramMCPError, wrapError } from '../utils/error.handler.js';
import { createChildLogger, logToolInvocation, logToolResult, logError } from '../utils/logger.js';

// =============================================================================
// Tool Constants
// =============================================================================

/**
 * Tool name for MCP registration
 */
export const TOOL_NAME = 'ideogram_replace_background';

/**
 * Tool description for MCP registration
 */
export const TOOL_DESCRIPTION = `Replace the background of an image while preserving the foreground subject using Ideogram AI v3.

Automatically detects and preserves the foreground subject(s), then replaces the background based on a text description.

Features:
- Automatic foreground detection and preservation
- Text prompt for describing the desired new background
- Rendering speed options: FLASH (fastest), TURBO (fast), DEFAULT (balanced), QUALITY (best quality)
- Magic prompt enhancement to automatically improve prompts
- Generate 1-8 variants per request
- Optional local saving of modified images
- Cost tracking for usage monitoring

Input image can be provided as a URL, file path, or base64 data URL.

Returns modified image URLs, seeds for reproducibility, and cost estimates.`;

/**
 * Tool input schema for MCP registration
 */
export const TOOL_SCHEMA = ReplaceBackgroundInputSchema;

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for the replace-background tool handler
 */
export interface ReplaceBackgroundToolOptions {
  /**
   * Custom IdeogramClient instance
   */
  client?: IdeogramClient;

  /**
   * Options for creating a new client (if client not provided)
   */
  clientOptions?: IdeogramClientOptions;

  /**
   * Custom StorageService instance
   */
  storage?: StorageService;

  /**
   * Options for creating a new storage service (if storage not provided)
   */
  storageOptions?: StorageServiceOptions;

  /**
   * Custom logger instance
   */
  logger?: Logger;
}

/**
 * Result type from the replace-background tool
 */
export type ReplaceBackgroundToolResult = ReplaceBackgroundOutput | ToolErrorOutput;

// =============================================================================
// Tool Handler Factory
// =============================================================================

/**
 * Creates a handler function for the ideogram_replace_background tool.
 *
 * @param options - Configuration options for the handler
 * @returns The tool handler function
 *
 * @example
 * ```typescript
 * // Create handler with default options
 * const handler = createReplaceBackgroundHandler();
 *
 * // Create handler with custom client
 * const handler = createReplaceBackgroundHandler({
 *   client: new IdeogramClient({ apiKey: 'my-key' }),
 * });
 * ```
 */
export function createReplaceBackgroundHandler(
  options: ReplaceBackgroundToolOptions = {}
): (input: ReplaceBackgroundInput) => Promise<ReplaceBackgroundToolResult> {
  // Initialize dependencies
  const log = options.logger ?? createChildLogger('tool:replace-background');
  const client = options.client ?? createIdeogramClient(options.clientOptions);
  const storage = options.storage ?? createStorageService(options.storageOptions);

  /**
   * Tool handler implementation
   */
  return async function ideogramReplaceBackgroundHandler(
    input: ReplaceBackgroundInput
  ): Promise<ReplaceBackgroundToolResult> {
    const startTime = Date.now();

    // Log tool invocation
    logToolInvocation(log, {
      tool: TOOL_NAME,
      params: {
        prompt: input.prompt,
        hasImage: !!input.image,
        magic_prompt: input.magic_prompt,
        num_images: input.num_images,
        rendering_speed: input.rendering_speed,
        save_locally: input.save_locally,
      },
    });

    try {
      // Build replace-background params, only including defined optional fields
      // (required for exactOptionalPropertyTypes compliance)
      const replaceParams: Parameters<typeof client.replaceBackground>[0] = {
        image: input.image,
        prompt: input.prompt,
      };

      if (input.magic_prompt !== undefined) {
        replaceParams.magicPrompt = input.magic_prompt;
      }
      if (input.num_images !== undefined) {
        replaceParams.numImages = input.num_images;
      }
      if (input.seed !== undefined) {
        replaceParams.seed = input.seed;
      }
      if (input.rendering_speed !== undefined) {
        replaceParams.renderingSpeed = input.rendering_speed as RenderingSpeed;
      }

      // Call Ideogram API
      const response = await client.replaceBackground(replaceParams);

      // Calculate cost estimate
      const cost = calculateReplaceBgCost({
        numImages: response.data.length,
        renderingSpeed: input.rendering_speed as RenderingSpeed,
      });

      // Process images and optionally save locally
      const images: GeneratedImageOutput[] = [];

      // Determine if we should save locally
      const shouldSaveLocally = input.save_locally && storage.isEnabled();

      if (shouldSaveLocally) {
        // Download and save all images in parallel
        const urls = response.data.map((img) => img.url);
        const saveResult = await storage.downloadImages(urls, {
          prefix: 'replace-bg',
        });

        // Map results back to images
        for (let i = 0; i < response.data.length; i++) {
          const apiImage = response.data[i];
          if (!apiImage) continue;

          const savedImage = saveResult.saved.find((s) => s.originalUrl === apiImage.url);

          const outputImage: GeneratedImageOutput = {
            url: apiImage.url,
            seed: apiImage.seed,
            is_image_safe: apiImage.is_image_safe,
          };

          // Add optional fields only if defined
          if (savedImage) {
            outputImage.local_path = savedImage.filePath;
          }
          if (apiImage.prompt !== undefined) {
            outputImage.prompt = apiImage.prompt;
          }
          if (apiImage.resolution !== undefined) {
            outputImage.resolution = apiImage.resolution;
          }

          images.push(outputImage);
        }

        // Log if any saves failed
        if (saveResult.failureCount > 0) {
          log.warn({ failedCount: saveResult.failureCount }, 'Some images failed to save locally');
        }
      } else {
        // Just map API response to output format
        for (const apiImage of response.data) {
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

      // Build successful response
      const result: ReplaceBackgroundOutput = {
        success: true,
        created: response.created,
        images,
        total_cost: toCostEstimateOutput(cost),
        num_images: images.length,
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
          numImages: result.num_images,
          creditsUsed: result.total_cost.credits_used,
          durationMs,
        },
        'Replace background completed successfully'
      );

      return result;
    } catch (error) {
      // Convert to IdeogramMCPError if needed
      const mcpError = error instanceof IdeogramMCPError ? error : wrapError(error);

      // Log failure
      const durationMs = Date.now() - startTime;
      logError(log, mcpError, 'Replace background failed', {
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
let defaultHandler:
  | ((input: ReplaceBackgroundInput) => Promise<ReplaceBackgroundToolResult>)
  | null = null;

/**
 * Gets the default handler instance, creating it if necessary.
 *
 * @returns The default handler function
 */
export function getDefaultHandler(): (
  input: ReplaceBackgroundInput
) => Promise<ReplaceBackgroundToolResult> {
  if (!defaultHandler) {
    defaultHandler = createReplaceBackgroundHandler();
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
 * Replaces the background of an image using the default configuration.
 *
 * This is a convenience function that uses the default handler.
 * For custom configuration, use `createReplaceBackgroundHandler()` instead.
 *
 * @param input - The replace-background input parameters
 * @returns Promise resolving to the replace-background result
 *
 * @example
 * ```typescript
 * const result = await ideogramReplaceBackground({
 *   image: 'https://example.com/portrait.jpg',
 *   prompt: 'A tropical beach at sunset',
 *   magic_prompt: 'ON',
 *   rendering_speed: 'QUALITY',
 * });
 *
 * if (result.success) {
 *   console.log(`Modified ${result.num_images} images`);
 *   console.log(`Cost: ${result.total_cost.credits_used} credits`);
 *   for (const image of result.images) {
 *     console.log(`  - ${image.url}`);
 *   }
 * } else {
 *   console.error(`Error: ${result.user_message}`);
 * }
 * ```
 */
export async function ideogramReplaceBackground(
  input: ReplaceBackgroundInput
): Promise<ReplaceBackgroundToolResult> {
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
 * import { ideogramReplaceBackgroundTool } from './tools/replace-background.js';
 *
 * const server = new McpServer({ name: 'ideogram', version: '1.0.0' });
 *
 * server.tool(
 *   ideogramReplaceBackgroundTool.name,
 *   ideogramReplaceBackgroundTool.description,
 *   ideogramReplaceBackgroundTool.schema,
 *   ideogramReplaceBackgroundTool.handler
 * );
 * ```
 */
export const ideogramReplaceBackgroundTool = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  schema: TOOL_SCHEMA,
  handler: ideogramReplaceBackground,
} as const;

/**
 * Type for the tool schema shape (for MCP SDK compatibility)
 */
export type ReplaceBackgroundToolSchema = z.infer<typeof ReplaceBackgroundInputSchema>;
