/**
 * ideogram_remix Tool
 *
 * Remixes existing images based on a new prompt using the Ideogram API v3.
 *
 * Features:
 * - Remix images with new text prompts
 * - Configurable image weight (influence of original image)
 * - Supports all 15 aspect ratios (using "x" format like "16x9")
 * - Configurable rendering speed (FLASH, TURBO, DEFAULT, QUALITY)
 * - Magic prompt enhancement options
 * - Style type selection (V3 subset)
 * - Optional local image saving
 * - Cost tracking in all responses
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await ideogramRemix({
 *   image: 'https://example.com/photo.jpg',
 *   prompt: 'Transform into a watercolor painting',
 * });
 *
 * // With all options
 * const result = await ideogramRemix({
 *   image: 'https://example.com/photo.jpg',
 *   prompt: 'A cyberpunk version of this scene',
 *   image_weight: 60,
 *   aspect_ratio: '16x9',
 *   rendering_speed: 'QUALITY',
 *   magic_prompt: 'ON',
 *   style_type: 'FICTION',
 *   save_locally: true,
 * });
 * ```
 */

import type { Logger } from 'pino';
import type { z } from 'zod';

import {
  RemixInputSchema,
  type RemixInput,
  type RemixOutput,
  type ToolErrorOutput,
  type GeneratedImageOutput,
} from '../types/tool.types.js';
import type { RenderingSpeed } from '../types/api.types.js';
import {
  IdeogramClient,
  createIdeogramClient,
  type IdeogramClientOptions,
} from '../services/ideogram.client.js';
import { calculateRemixCost, toCostEstimateOutput } from '../services/cost.calculator.js';
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
export const TOOL_NAME = 'ideogram_remix';

/**
 * Tool description for MCP registration
 */
export const TOOL_DESCRIPTION = `Remix an existing image based on a new text prompt using Ideogram AI v3.

Takes an existing image and transforms it according to a new text description, blending the original image with the new concept.

Features:
- Image weight control (0-100): how much influence the original image has
- 15 aspect ratio options (1x1, 16x9, 9x16, 4x3, 3x4, 3x2, 2x3, 4x5, 5x4, 1x2, 2x1, 1x3, 3x1, 10x16, 16x10)
- Rendering speed options: FLASH (fastest), TURBO (fast), DEFAULT (balanced), QUALITY (best quality)
- Magic prompt enhancement to automatically improve prompts
- Style types: AUTO, GENERAL, REALISTIC, DESIGN, FICTION
- Negative prompt support
- Generate 1-8 remixed images per request
- Optional local saving of remixed images
- Cost tracking for usage monitoring

Input image can be provided as a URL, file path, or base64 data URL.

Returns remixed image URLs, seeds for reproducibility, and cost estimates.`;

/**
 * Tool input schema for MCP registration
 */
export const TOOL_SCHEMA = RemixInputSchema;

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for the remix tool handler
 */
export interface RemixToolOptions {
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
 * Result type from the remix tool
 */
export type RemixToolResult = RemixOutput | ToolErrorOutput;

// =============================================================================
// Tool Handler Factory
// =============================================================================

/**
 * Creates a handler function for the ideogram_remix tool.
 *
 * @param options - Configuration options for the handler
 * @returns The tool handler function
 *
 * @example
 * ```typescript
 * // Create handler with default options
 * const handler = createRemixHandler();
 *
 * // Create handler with custom client
 * const handler = createRemixHandler({
 *   client: new IdeogramClient({ apiKey: 'my-key' }),
 * });
 * ```
 */
export function createRemixHandler(
  options: RemixToolOptions = {}
): (input: RemixInput) => Promise<RemixToolResult> {
  // Initialize dependencies
  const log = options.logger ?? createChildLogger('tool:remix');
  const client = options.client ?? createIdeogramClient(options.clientOptions);
  const storage = options.storage ?? createStorageService(options.storageOptions);

  /**
   * Tool handler implementation
   */
  return async function ideogramRemixHandler(input: RemixInput): Promise<RemixToolResult> {
    const startTime = Date.now();

    // Log tool invocation
    logToolInvocation(log, {
      tool: TOOL_NAME,
      params: {
        prompt: input.prompt,
        hasImage: !!input.image,
        image_weight: input.image_weight,
        negative_prompt: input.negative_prompt,
        aspect_ratio: input.aspect_ratio,
        num_images: input.num_images,
        rendering_speed: input.rendering_speed,
        magic_prompt: input.magic_prompt,
        style_type: input.style_type,
        save_locally: input.save_locally,
      },
    });

    try {
      // Build remix params, only including defined optional fields
      // (required for exactOptionalPropertyTypes compliance)
      const remixParams: Parameters<typeof client.remix>[0] = {
        image: input.image,
        prompt: input.prompt,
      };

      if (input.image_weight !== undefined) {
        remixParams.imageWeight = input.image_weight;
      }
      if (input.negative_prompt !== undefined) {
        remixParams.negativePrompt = input.negative_prompt;
      }
      if (input.aspect_ratio !== undefined) {
        remixParams.aspectRatio = input.aspect_ratio;
      }
      if (input.num_images !== undefined) {
        remixParams.numImages = input.num_images;
      }
      if (input.seed !== undefined) {
        remixParams.seed = input.seed;
      }
      if (input.rendering_speed !== undefined) {
        remixParams.renderingSpeed = input.rendering_speed as RenderingSpeed;
      }
      if (input.magic_prompt !== undefined) {
        remixParams.magicPrompt = input.magic_prompt;
      }
      if (input.style_type !== undefined) {
        remixParams.styleType = input.style_type;
      }

      // Call Ideogram API
      const response = await client.remix(remixParams);

      // Calculate cost estimate
      const cost = calculateRemixCost({
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
          prefix: 'remixed',
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
      const result: RemixOutput = {
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
        'Remix completed successfully'
      );

      return result;
    } catch (error) {
      // Convert to IdeogramMCPError if needed
      const mcpError = error instanceof IdeogramMCPError ? error : wrapError(error);

      // Log failure
      const durationMs = Date.now() - startTime;
      logError(log, mcpError, 'Remix failed', {
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
let defaultHandler: ((input: RemixInput) => Promise<RemixToolResult>) | null = null;

/**
 * Gets the default handler instance, creating it if necessary.
 *
 * @returns The default handler function
 */
export function getDefaultHandler(): (input: RemixInput) => Promise<RemixToolResult> {
  if (!defaultHandler) {
    defaultHandler = createRemixHandler();
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
 * Remixes an image using the default configuration.
 *
 * This is a convenience function that uses the default handler.
 * For custom configuration, use `createRemixHandler()` instead.
 *
 * @param input - The remix input parameters
 * @returns Promise resolving to the remix result
 *
 * @example
 * ```typescript
 * const result = await ideogramRemix({
 *   image: 'https://example.com/photo.jpg',
 *   prompt: 'Transform into anime style',
 *   image_weight: 60,
 *   rendering_speed: 'QUALITY',
 * });
 *
 * if (result.success) {
 *   console.log(`Remixed ${result.num_images} images`);
 *   console.log(`Cost: ${result.total_cost.credits_used} credits`);
 *   for (const image of result.images) {
 *     console.log(`  - ${image.url}`);
 *   }
 * } else {
 *   console.error(`Error: ${result.user_message}`);
 * }
 * ```
 */
export async function ideogramRemix(input: RemixInput): Promise<RemixToolResult> {
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
 * import { ideogramRemixTool } from './tools/remix.js';
 *
 * const server = new McpServer({ name: 'ideogram', version: '1.0.0' });
 *
 * server.tool(
 *   ideogramRemixTool.name,
 *   ideogramRemixTool.description,
 *   ideogramRemixTool.schema,
 *   ideogramRemixTool.handler
 * );
 * ```
 */
export const ideogramRemixTool = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  schema: TOOL_SCHEMA,
  handler: ideogramRemix,
} as const;

/**
 * Type for the tool schema shape (for MCP SDK compatibility)
 */
export type RemixToolSchema = z.infer<typeof RemixInputSchema>;
