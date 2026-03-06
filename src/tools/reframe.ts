/**
 * ideogram_reframe Tool
 *
 * Extends images to new resolutions via intelligent outpainting using the Ideogram API v3.
 *
 * Features:
 * - Reframe images to a target resolution
 * - Intelligent outpainting to fill new areas
 * - Configurable rendering speed (FLASH, TURBO, DEFAULT, QUALITY)
 * - Optional local image saving
 * - Cost tracking in all responses
 *
 * Note: This tool does not take a prompt parameter.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await ideogramReframe({
 *   image: 'https://example.com/photo.jpg',
 *   resolution: 'RESOLUTION_1024_768',
 * });
 *
 * // With rendering speed
 * const result = await ideogramReframe({
 *   image: 'https://example.com/photo.jpg',
 *   resolution: 'RESOLUTION_1920_1080',
 *   rendering_speed: 'QUALITY',
 *   save_locally: true,
 * });
 * ```
 */

import type { Logger } from 'pino';
import type { z } from 'zod';

import {
  ReframeInputSchema,
  type ReframeInput,
  type ReframeOutput,
  type ToolErrorOutput,
  type GeneratedImageOutput,
} from '../types/tool.types.js';
import type { RenderingSpeed } from '../types/api.types.js';
import {
  IdeogramClient,
  createIdeogramClient,
  type IdeogramClientOptions,
} from '../services/ideogram.client.js';
import { calculateReframeCost, toCostEstimateOutput } from '../services/cost.calculator.js';
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
export const TOOL_NAME = 'ideogram_reframe';

/**
 * Tool description for MCP registration
 */
export const TOOL_DESCRIPTION = `Extend images to new resolutions via intelligent outpainting using Ideogram AI v3.

Reframes an existing image to fit a new target resolution, intelligently filling in any new areas with contextually appropriate content.

Features:
- Target resolution specification (e.g. "RESOLUTION_1024_768")
- Rendering speed options: FLASH (fastest), TURBO (fast), DEFAULT (balanced), QUALITY (best quality)
- Generate 1-8 reframed variants per request
- Optional local saving of reframed images
- Cost tracking for usage monitoring

Input image can be provided as a URL, file path, or base64 data URL.

Returns reframed image URLs, seeds for reproducibility, and cost estimates.`;

/**
 * Tool input schema for MCP registration
 */
export const TOOL_SCHEMA = ReframeInputSchema;

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for the reframe tool handler
 */
export interface ReframeToolOptions {
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
 * Result type from the reframe tool
 */
export type ReframeToolResult = ReframeOutput | ToolErrorOutput;

// =============================================================================
// Tool Handler Factory
// =============================================================================

/**
 * Creates a handler function for the ideogram_reframe tool.
 *
 * @param options - Configuration options for the handler
 * @returns The tool handler function
 *
 * @example
 * ```typescript
 * // Create handler with default options
 * const handler = createReframeHandler();
 *
 * // Create handler with custom client
 * const handler = createReframeHandler({
 *   client: new IdeogramClient({ apiKey: 'my-key' }),
 * });
 * ```
 */
export function createReframeHandler(
  options: ReframeToolOptions = {}
): (input: ReframeInput) => Promise<ReframeToolResult> {
  // Initialize dependencies
  const log = options.logger ?? createChildLogger('tool:reframe');
  const client = options.client ?? createIdeogramClient(options.clientOptions);
  const storage = options.storage ?? createStorageService(options.storageOptions);

  /**
   * Tool handler implementation
   */
  return async function ideogramReframeHandler(input: ReframeInput): Promise<ReframeToolResult> {
    const startTime = Date.now();

    // Log tool invocation
    logToolInvocation(log, {
      tool: TOOL_NAME,
      params: {
        hasImage: !!input.image,
        resolution: input.resolution,
        num_images: input.num_images,
        rendering_speed: input.rendering_speed,
        save_locally: input.save_locally,
      },
    });

    try {
      // Build reframe params, only including defined optional fields
      // (required for exactOptionalPropertyTypes compliance)
      const reframeParams: Parameters<typeof client.reframe>[0] = {
        image: input.image,
        resolution: input.resolution,
      };

      if (input.num_images !== undefined) {
        reframeParams.numImages = input.num_images;
      }
      if (input.seed !== undefined) {
        reframeParams.seed = input.seed;
      }
      if (input.rendering_speed !== undefined) {
        reframeParams.renderingSpeed = input.rendering_speed as RenderingSpeed;
      }

      // Call Ideogram API
      const response = await client.reframe(reframeParams);

      // Calculate cost estimate
      const cost = calculateReframeCost({
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
          prefix: 'reframed',
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
      const result: ReframeOutput = {
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
        'Reframe completed successfully'
      );

      return result;
    } catch (error) {
      // Convert to IdeogramMCPError if needed
      const mcpError = error instanceof IdeogramMCPError ? error : wrapError(error);

      // Log failure
      const durationMs = Date.now() - startTime;
      logError(log, mcpError, 'Reframe failed', {
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
let defaultHandler: ((input: ReframeInput) => Promise<ReframeToolResult>) | null = null;

/**
 * Gets the default handler instance, creating it if necessary.
 *
 * @returns The default handler function
 */
export function getDefaultHandler(): (input: ReframeInput) => Promise<ReframeToolResult> {
  if (!defaultHandler) {
    defaultHandler = createReframeHandler();
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
 * Reframes an image using the default configuration.
 *
 * This is a convenience function that uses the default handler.
 * For custom configuration, use `createReframeHandler()` instead.
 *
 * @param input - The reframe input parameters
 * @returns Promise resolving to the reframe result
 *
 * @example
 * ```typescript
 * const result = await ideogramReframe({
 *   image: 'https://example.com/photo.jpg',
 *   resolution: 'RESOLUTION_1920_1080',
 *   rendering_speed: 'DEFAULT',
 * });
 *
 * if (result.success) {
 *   console.log(`Reframed ${result.num_images} images`);
 *   console.log(`Cost: ${result.total_cost.credits_used} credits`);
 *   for (const image of result.images) {
 *     console.log(`  - ${image.url}`);
 *   }
 * } else {
 *   console.error(`Error: ${result.user_message}`);
 * }
 * ```
 */
export async function ideogramReframe(input: ReframeInput): Promise<ReframeToolResult> {
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
 * import { ideogramReframeTool } from './tools/reframe.js';
 *
 * const server = new McpServer({ name: 'ideogram', version: '1.0.0' });
 *
 * server.tool(
 *   ideogramReframeTool.name,
 *   ideogramReframeTool.description,
 *   ideogramReframeTool.schema,
 *   ideogramReframeTool.handler
 * );
 * ```
 */
export const ideogramReframeTool = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  schema: TOOL_SCHEMA,
  handler: ideogramReframe,
} as const;

/**
 * Type for the tool schema shape (for MCP SDK compatibility)
 */
export type ReframeToolSchema = z.infer<typeof ReframeInputSchema>;
