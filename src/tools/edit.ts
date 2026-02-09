/**
 * ideogram_edit Tool
 *
 * Edits existing images using the Ideogram API v3 with inpainting and outpainting.
 *
 * Features:
 * - Inpainting: Edit specific areas using a mask (black=edit, white=preserve)
 * - Outpainting: Expand images in specified directions (left, right, up, down)
 * - Configurable rendering speed (FLASH, TURBO, DEFAULT, QUALITY)
 * - Magic prompt enhancement options
 * - Style type selection
 * - Optional local image saving
 * - Cost tracking in all responses
 *
 * @example
 * ```typescript
 * // Inpainting: Edit part of an image
 * const result = await ideogramEdit({
 *   prompt: 'Add a red balloon in the sky',
 *   image: 'https://example.com/photo.jpg',
 *   mask: maskDataUrl, // Black where you want changes
 *   mode: 'inpaint',
 * });
 *
 * // Outpainting: Expand an image
 * const result = await ideogramEdit({
 *   prompt: 'Continue the landscape with mountains',
 *   image: imageBuffer,
 *   mode: 'outpaint',
 *   expand_directions: ['left', 'right'],
 *   expand_pixels: 200,
 * });
 * ```
 */

import type { Logger } from 'pino';
import type { z } from 'zod';

import {
  EditInputSchema,
  type EditInput,
  type EditOutput,
  type ToolErrorOutput,
  type GeneratedImageOutput,
} from '../types/tool.types.js';
import type { Model } from '../types/api.types.js';
import {
  IdeogramClient,
  createIdeogramClient,
  type IdeogramClientOptions,
} from '../services/ideogram.client.js';
import {
  calculateEditCost,
  toCostEstimateOutput,
} from '../services/cost.calculator.js';
import {
  StorageService,
  createStorageService,
  type StorageServiceOptions,
} from '../services/storage.service.js';
import {
  IdeogramMCPError,
  wrapError,
} from '../utils/error.handler.js';
import {
  createChildLogger,
  logToolInvocation,
  logToolResult,
  logError,
} from '../utils/logger.js';

// =============================================================================
// Tool Constants
// =============================================================================

/**
 * Tool name for MCP registration
 */
export const TOOL_NAME = 'ideogram_inpaint';

/**
 * Tool description for MCP registration
 */
export const TOOL_DESCRIPTION = `Edit specific parts of an existing image using inpainting with Ideogram AI.

Inpainting uses a mask to define which areas to modify:
- Black pixels in mask = areas to edit/regenerate
- White pixels in mask = areas to preserve unchanged

The mask must be the same dimensions as the source image and contain only black and white pixels.

Features:
- Mask-based selective editing
- Magic prompt enhancement to automatically improve prompts
- Style types: AUTO, GENERAL, REALISTIC, DESIGN, FICTION, RENDER_3D, ANIME
- Model selection: V_2 (default) or V_2_TURBO (faster)
- Generate 1-8 variations per edit operation
- Optional local saving of edited images
- Cost tracking for usage monitoring

Input image and mask can be provided as URLs, file paths, or base64 data URLs.

Returns edited image URLs, seeds for reproducibility, and cost estimates.`;

/**
 * Tool input schema for MCP registration
 */
export const TOOL_SCHEMA = EditInputSchema;

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for the edit tool handler
 */
export interface EditToolOptions {
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
 * Result type from the edit tool
 */
export type EditToolResult = EditOutput | ToolErrorOutput;

// =============================================================================
// Tool Handler Factory
// =============================================================================

/**
 * Creates a handler function for the ideogram_edit tool.
 *
 * @param options - Configuration options for the handler
 * @returns The tool handler function
 *
 * @example
 * ```typescript
 * // Create handler with default options
 * const handler = createEditHandler();
 *
 * // Create handler with custom client
 * const handler = createEditHandler({
 *   client: new IdeogramClient({ apiKey: 'my-key' }),
 * });
 * ```
 */
export function createEditHandler(
  options: EditToolOptions = {}
): (input: EditInput) => Promise<EditToolResult> {
  // Initialize dependencies
  const log = options.logger ?? createChildLogger('tool:edit');
  const client = options.client ?? createIdeogramClient(options.clientOptions);
  const storage = options.storage ?? createStorageService(options.storageOptions);

  /**
   * Tool handler implementation
   */
  return async function ideogramEditHandler(
    input: EditInput
  ): Promise<EditToolResult> {
    const startTime = Date.now();

    // Log tool invocation
    logToolInvocation(log, {
      tool: TOOL_NAME,
      params: {
        prompt: input.prompt,
        hasImage: !!input.image,
        hasMask: !!input.mask,
        model: input.model,
        num_images: input.num_images,
        magic_prompt: input.magic_prompt,
        style_type: input.style_type,
        save_locally: input.save_locally,
      },
    });

    try {
      // Build edit params, only including defined optional fields
      // (required for exactOptionalPropertyTypes compliance)
      const editParams: Parameters<typeof client.edit>[0] = {
        prompt: input.prompt,
        image: input.image,
        mask: input.mask,
      };

      // Add optional params only if defined
      if (input.model !== undefined) {
        editParams.model = input.model as Model;
      }
      if (input.num_images !== undefined) {
        editParams.numImages = input.num_images;
      }
      if (input.seed !== undefined) {
        editParams.seed = input.seed;
      }
      if (input.magic_prompt !== undefined) {
        editParams.magicPrompt = input.magic_prompt;
      }
      if (input.style_type !== undefined) {
        editParams.styleType = input.style_type;
      }

      // Call Ideogram API
      const response = await client.edit(editParams);

      // Calculate cost estimate (edit operations use DEFAULT speed for legacy API)
      const cost = calculateEditCost({
        numImages: response.data.length,
        renderingSpeed: 'DEFAULT',
      });

      // Process images and optionally save locally
      const images: GeneratedImageOutput[] = [];

      // Determine if we should save locally
      const shouldSaveLocally = input.save_locally && storage.isEnabled();

      if (shouldSaveLocally) {
        // Download and save all images in parallel
        const urls = response.data.map((img) => img.url);
        const saveResult = await storage.downloadImages(urls, {
          prefix: 'edited',
        });

        // Map results back to images
        for (let i = 0; i < response.data.length; i++) {
          const apiImage = response.data[i];
          if (!apiImage) continue;

          const savedImage = saveResult.saved.find(
            (s) => s.originalUrl === apiImage.url
          );

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
          log.warn(
            { failedCount: saveResult.failureCount },
            'Some images failed to save locally'
          );
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
      const result: EditOutput = {
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
        'Inpainting completed successfully'
      );

      return result;
    } catch (error) {
      // Convert to IdeogramMCPError if needed
      const mcpError = error instanceof IdeogramMCPError ? error : wrapError(error);

      // Log failure
      const durationMs = Date.now() - startTime;
      logError(log, mcpError, 'Edit failed', {
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
let defaultHandler: ((input: EditInput) => Promise<EditToolResult>) | null = null;

/**
 * Gets the default handler instance, creating it if necessary.
 *
 * @returns The default handler function
 */
export function getDefaultHandler(): (input: EditInput) => Promise<EditToolResult> {
  if (!defaultHandler) {
    defaultHandler = createEditHandler();
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
 * Edits an image using the default configuration.
 *
 * This is a convenience function that uses the default handler.
 * For custom configuration, use `createEditHandler()` instead.
 *
 * @param input - The edit input parameters
 * @returns Promise resolving to the edit result
 *
 * @example
 * ```typescript
 * // Inpainting example
 * const result = await ideogramEdit({
 *   prompt: 'Replace the sky with a sunset',
 *   image: 'https://example.com/photo.jpg',
 *   mask: maskDataUrl,
 *   mode: 'inpaint',
 * });
 *
 * // Outpainting example
 * const result = await ideogramEdit({
 *   prompt: 'Expand the scene with more forest',
 *   image: originalImageBuffer,
 *   mode: 'outpaint',
 *   expand_directions: ['left', 'right'],
 *   expand_pixels: 150,
 * });
 *
 * if (result.success) {
 *   console.log(`Edited ${result.num_images} images (${result.mode})`);
 *   console.log(`Cost: ${result.total_cost.credits_used} credits`);
 *   for (const image of result.images) {
 *     console.log(`  - ${image.url}`);
 *   }
 * } else {
 *   console.error(`Error: ${result.user_message}`);
 * }
 * ```
 */
export async function ideogramEdit(
  input: EditInput
): Promise<EditToolResult> {
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
 * import { ideogramEditTool } from './tools/edit.js';
 *
 * const server = new McpServer({ name: 'ideogram', version: '1.0.0' });
 *
 * server.tool(
 *   ideogramEditTool.name,
 *   ideogramEditTool.description,
 *   ideogramEditTool.schema,
 *   ideogramEditTool.handler
 * );
 * ```
 */
export const ideogramEditTool = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  schema: TOOL_SCHEMA,
  handler: ideogramEdit,
} as const;

/**
 * Type for the tool schema shape (for MCP SDK compatibility)
 */
export type EditToolSchema = z.infer<typeof EditInputSchema>;
