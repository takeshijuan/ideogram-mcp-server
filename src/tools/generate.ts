/**
 * ideogram_generate Tool
 *
 * Generates images from text prompts using the Ideogram API v3.
 *
 * Features:
 * - Supports all 15 aspect ratios (using "x" format like "16x9")
 * - Configurable rendering speed (FLASH, TURBO, DEFAULT, QUALITY)
 * - Magic prompt enhancement options
 * - Style type selection
 * - Optional local image saving
 * - Cost tracking in all responses
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await ideogramGenerate({
 *   prompt: 'A beautiful sunset over mountains',
 * });
 *
 * // With all options
 * const result = await ideogramGenerate({
 *   prompt: 'A cute cat wearing a wizard hat',
 *   aspect_ratio: '16x9',
 *   num_images: 4,
 *   rendering_speed: 'QUALITY',
 *   magic_prompt: 'ON',
 *   style_type: 'REALISTIC',
 *   save_locally: true,
 * });
 * ```
 */

import type { Logger } from 'pino';
import type { z } from 'zod';

import {
  GenerateInputSchema,
  type GenerateInput,
  type GenerateOutput,
  type ToolErrorOutput,
  type GeneratedImageOutput,
} from '../types/tool.types.js';
import type { RenderingSpeed } from '../types/api.types.js';
import {
  IdeogramClient,
  createIdeogramClient,
  type IdeogramClientOptions,
} from '../services/ideogram.client.js';
import { calculateCost, toCostEstimateOutput } from '../services/cost.calculator.js';
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
export const TOOL_NAME = 'ideogram_generate';

/**
 * Tool description for MCP registration
 */
export const TOOL_DESCRIPTION = `Generate images from text prompts using Ideogram AI v3.

Creates high-quality AI-generated images based on text descriptions. Supports various aspect ratios, rendering quality levels, and style options.

Features:
- 15 aspect ratio options (1x1, 16x9, 9x16, 4x3, 3x4, 3x2, 2x3, 4x5, 5x4, 1x2, 2x1, 1x3, 3x1, 10x16, 16x10)
- Rendering speed options: FLASH (fastest), TURBO (fast), DEFAULT (balanced), QUALITY (best quality)
- Magic prompt enhancement to automatically improve prompts
- Style types: AUTO, GENERAL, REALISTIC, DESIGN, FICTION
- Generate 1-8 images per request
- Optional local saving of generated images
- Cost tracking for usage monitoring

Returns image URLs, seeds for reproducibility, and cost estimates.`;

/**
 * Tool input schema for MCP registration
 */
export const TOOL_SCHEMA = GenerateInputSchema;

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for the generate tool handler
 */
export interface GenerateToolOptions {
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
 * Result type from the generate tool
 */
export type GenerateToolResult = GenerateOutput | ToolErrorOutput;

// =============================================================================
// Tool Handler Factory
// =============================================================================

/**
 * Creates a handler function for the ideogram_generate tool.
 *
 * @param options - Configuration options for the handler
 * @returns The tool handler function
 *
 * @example
 * ```typescript
 * // Create handler with default options
 * const handler = createGenerateHandler();
 *
 * // Create handler with custom client
 * const handler = createGenerateHandler({
 *   client: new IdeogramClient({ apiKey: 'my-key' }),
 * });
 * ```
 */
export function createGenerateHandler(
  options: GenerateToolOptions = {}
): (input: GenerateInput) => Promise<GenerateToolResult> {
  // Initialize dependencies
  const log = options.logger ?? createChildLogger('tool:generate');
  const client = options.client ?? createIdeogramClient(options.clientOptions);
  const storage = options.storage ?? createStorageService(options.storageOptions);

  /**
   * Tool handler implementation
   */
  return async function ideogramGenerateHandler(input: GenerateInput): Promise<GenerateToolResult> {
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
      },
    });

    try {
      // Build generate params, only including defined optional fields
      // (required for exactOptionalPropertyTypes compliance)
      const generateParams: Parameters<typeof client.generate>[0] = {
        prompt: input.prompt,
      };

      if (input.negative_prompt !== undefined) {
        generateParams.negativePrompt = input.negative_prompt;
      }
      if (input.aspect_ratio !== undefined) {
        generateParams.aspectRatio = input.aspect_ratio;
      }
      if (input.num_images !== undefined) {
        generateParams.numImages = input.num_images;
      }
      if (input.seed !== undefined) {
        generateParams.seed = input.seed;
      }
      if (input.rendering_speed !== undefined) {
        generateParams.renderingSpeed = input.rendering_speed as RenderingSpeed;
      }
      if (input.magic_prompt !== undefined) {
        generateParams.magicPrompt = input.magic_prompt;
      }
      if (input.style_type !== undefined) {
        generateParams.styleType = input.style_type;
      }

      // Call Ideogram API
      const response = await client.generate(generateParams);

      // Calculate cost estimate
      const cost = calculateCost({
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
          prefix: 'generated',
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
      const result: GenerateOutput = {
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
        'Generation completed successfully'
      );

      return result;
    } catch (error) {
      // Convert to IdeogramMCPError if needed
      const mcpError = error instanceof IdeogramMCPError ? error : wrapError(error);

      // Log failure
      const durationMs = Date.now() - startTime;
      logError(log, mcpError, 'Generation failed', {
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
let defaultHandler: ((input: GenerateInput) => Promise<GenerateToolResult>) | null = null;

/**
 * Gets the default handler instance, creating it if necessary.
 *
 * @returns The default handler function
 */
export function getDefaultHandler(): (input: GenerateInput) => Promise<GenerateToolResult> {
  if (!defaultHandler) {
    defaultHandler = createGenerateHandler();
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
 * Generates images from a text prompt using the default configuration.
 *
 * This is a convenience function that uses the default handler.
 * For custom configuration, use `createGenerateHandler()` instead.
 *
 * @param input - The generation input parameters
 * @returns Promise resolving to the generation result
 *
 * @example
 * ```typescript
 * const result = await ideogramGenerate({
 *   prompt: 'A serene Japanese garden with cherry blossoms',
 *   aspect_ratio: '16x9',
 *   num_images: 2,
 * });
 *
 * if (result.success) {
 *   console.log(`Generated ${result.num_images} images`);
 *   console.log(`Cost: ${result.total_cost.credits_used} credits`);
 *   for (const image of result.images) {
 *     console.log(`  - ${image.url}`);
 *   }
 * } else {
 *   console.error(`Error: ${result.user_message}`);
 * }
 * ```
 */
export async function ideogramGenerate(input: GenerateInput): Promise<GenerateToolResult> {
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
 * import { ideogramGenerateTool } from './tools/generate.js';
 *
 * const server = new McpServer({ name: 'ideogram', version: '1.0.0' });
 *
 * server.tool(
 *   ideogramGenerateTool.name,
 *   ideogramGenerateTool.description,
 *   ideogramGenerateTool.schema,
 *   ideogramGenerateTool.handler
 * );
 * ```
 */
export const ideogramGenerateTool = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  schema: TOOL_SCHEMA,
  handler: ideogramGenerate,
} as const;

/**
 * Type for the tool schema shape (for MCP SDK compatibility)
 */
export type GenerateToolSchema = z.infer<typeof GenerateInputSchema>;
