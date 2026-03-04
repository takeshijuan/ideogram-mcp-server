/**
 * ideogram_upscale Tool
 *
 * Upscales images with optional prompt guidance using the Ideogram API.
 *
 * Features:
 * - Upscale images to higher resolution
 * - Optional text prompt for guided upscaling
 * - Configurable resemblance (similarity to original) and detail enhancement
 * - Magic prompt enhancement options
 * - Optional local image saving
 * - Cost tracking in all responses
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await ideogramUpscale({
 *   image: 'https://example.com/photo.jpg',
 * });
 *
 * // With all options
 * const result = await ideogramUpscale({
 *   image: 'https://example.com/photo.jpg',
 *   prompt: 'High detail landscape',
 *   resemblance: 70,
 *   detail: 80,
 *   magic_prompt: 'ON',
 *   save_locally: true,
 * });
 * ```
 */

import type { Logger } from 'pino';
import type { z } from 'zod';

import {
  UpscaleInputSchema,
  type UpscaleInput,
  type UpscaleOutput,
  type ToolErrorOutput,
  type GeneratedImageOutput,
} from '../types/tool.types.js';
import {
  IdeogramClient,
  createIdeogramClient,
  type IdeogramClientOptions,
} from '../services/ideogram.client.js';
import { calculateUpscaleCost, toCostEstimateOutput } from '../services/cost.calculator.js';
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
export const TOOL_NAME = 'ideogram_upscale';

/**
 * Tool description for MCP registration
 */
export const TOOL_DESCRIPTION = `Upscale images to higher resolution using Ideogram AI.

Enhances image resolution with optional text prompt guidance for controlling the upscaling process.

Features:
- Optional text prompt for guided upscaling
- Resemblance control (0-100): how similar to the original image
- Detail enhancement (0-100): level of detail to add
- Magic prompt enhancement options
- Generate 1-8 upscaled variants per request
- Optional local saving of upscaled images
- Cost tracking for usage monitoring

Input image can be provided as a URL, file path, or base64 data URL.

Returns upscaled image URLs, seeds for reproducibility, and cost estimates.`;

/**
 * Tool input schema for MCP registration
 */
export const TOOL_SCHEMA = UpscaleInputSchema;

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for the upscale tool handler
 */
export interface UpscaleToolOptions {
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
 * Result type from the upscale tool
 */
export type UpscaleToolResult = UpscaleOutput | ToolErrorOutput;

// =============================================================================
// Tool Handler Factory
// =============================================================================

/**
 * Creates a handler function for the ideogram_upscale tool.
 *
 * @param options - Configuration options for the handler
 * @returns The tool handler function
 *
 * @example
 * ```typescript
 * // Create handler with default options
 * const handler = createUpscaleHandler();
 *
 * // Create handler with custom client
 * const handler = createUpscaleHandler({
 *   client: new IdeogramClient({ apiKey: 'my-key' }),
 * });
 * ```
 */
export function createUpscaleHandler(
  options: UpscaleToolOptions = {}
): (input: UpscaleInput) => Promise<UpscaleToolResult> {
  // Initialize dependencies
  const log = options.logger ?? createChildLogger('tool:upscale');
  const client = options.client ?? createIdeogramClient(options.clientOptions);
  const storage = options.storage ?? createStorageService(options.storageOptions);

  /**
   * Tool handler implementation
   */
  return async function ideogramUpscaleHandler(input: UpscaleInput): Promise<UpscaleToolResult> {
    const startTime = Date.now();

    // Log tool invocation
    logToolInvocation(log, {
      tool: TOOL_NAME,
      params: {
        hasImage: !!input.image,
        prompt: input.prompt,
        resemblance: input.resemblance,
        detail: input.detail,
        magic_prompt: input.magic_prompt,
        num_images: input.num_images,
        save_locally: input.save_locally,
      },
    });

    try {
      // Build upscale params, only including defined optional fields
      // (required for exactOptionalPropertyTypes compliance)
      const upscaleParams: Parameters<typeof client.upscale>[0] = {
        image: input.image,
      };

      if (input.prompt !== undefined) {
        upscaleParams.prompt = input.prompt;
      }
      if (input.resemblance !== undefined) {
        upscaleParams.resemblance = input.resemblance;
      }
      if (input.detail !== undefined) {
        upscaleParams.detail = input.detail;
      }
      if (input.magic_prompt !== undefined) {
        upscaleParams.magicPrompt = input.magic_prompt;
      }
      if (input.num_images !== undefined) {
        upscaleParams.numImages = input.num_images;
      }
      if (input.seed !== undefined) {
        upscaleParams.seed = input.seed;
      }

      // Call Ideogram API
      const response = await client.upscale(upscaleParams);

      // Calculate cost estimate
      const cost = calculateUpscaleCost({
        numImages: response.data.length,
      });

      // Process images and optionally save locally
      const images: GeneratedImageOutput[] = [];

      // Determine if we should save locally
      const shouldSaveLocally = input.save_locally && storage.isEnabled();

      if (shouldSaveLocally) {
        // Download and save all images in parallel
        const urls = response.data.map((img) => img.url);
        const saveResult = await storage.downloadImages(urls, {
          prefix: 'upscaled',
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
      const result: UpscaleOutput = {
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
        'Upscale completed successfully'
      );

      return result;
    } catch (error) {
      // Convert to IdeogramMCPError if needed
      const mcpError = error instanceof IdeogramMCPError ? error : wrapError(error);

      // Log failure
      const durationMs = Date.now() - startTime;
      logError(log, mcpError, 'Upscale failed', {
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
let defaultHandler: ((input: UpscaleInput) => Promise<UpscaleToolResult>) | null = null;

/**
 * Gets the default handler instance, creating it if necessary.
 *
 * @returns The default handler function
 */
export function getDefaultHandler(): (input: UpscaleInput) => Promise<UpscaleToolResult> {
  if (!defaultHandler) {
    defaultHandler = createUpscaleHandler();
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
 * Upscales an image using the default configuration.
 *
 * This is a convenience function that uses the default handler.
 * For custom configuration, use `createUpscaleHandler()` instead.
 *
 * @param input - The upscale input parameters
 * @returns Promise resolving to the upscale result
 *
 * @example
 * ```typescript
 * const result = await ideogramUpscale({
 *   image: 'https://example.com/photo.jpg',
 *   prompt: 'High detail landscape',
 *   resemblance: 70,
 *   detail: 80,
 * });
 *
 * if (result.success) {
 *   console.log(`Upscaled ${result.num_images} images`);
 *   console.log(`Cost: ${result.total_cost.credits_used} credits`);
 *   for (const image of result.images) {
 *     console.log(`  - ${image.url}`);
 *   }
 * } else {
 *   console.error(`Error: ${result.user_message}`);
 * }
 * ```
 */
export async function ideogramUpscale(input: UpscaleInput): Promise<UpscaleToolResult> {
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
 * import { ideogramUpscaleTool } from './tools/upscale.js';
 *
 * const server = new McpServer({ name: 'ideogram', version: '1.0.0' });
 *
 * server.tool(
 *   ideogramUpscaleTool.name,
 *   ideogramUpscaleTool.description,
 *   ideogramUpscaleTool.schema,
 *   ideogramUpscaleTool.handler
 * );
 * ```
 */
export const ideogramUpscaleTool = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  schema: TOOL_SCHEMA,
  handler: ideogramUpscale,
} as const;

/**
 * Type for the tool schema shape (for MCP SDK compatibility)
 */
export type UpscaleToolSchema = z.infer<typeof UpscaleInputSchema>;
