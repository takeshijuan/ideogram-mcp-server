/**
 * MCP Tool Type Definitions
 *
 * Defines Zod schemas and TypeScript types for all MCP tool inputs and outputs.
 * These schemas are used for input validation in the MCP server tools.
 *
 * Tools:
 * - ideogram_generate: Synchronous image generation
 * - ideogram_generate_async: Asynchronous image generation (local queue)
 * - ideogram_edit: Image editing (inpaint/outpaint)
 * - ideogram_get_prediction: Poll for async job status
 * - ideogram_cancel_prediction: Cancel queued jobs
 */

import { z } from 'zod';

// =============================================================================
// Shared Schema Components
// =============================================================================

/**
 * All 15 supported aspect ratios.
 * Note: Uses "x" separator, not ":" (e.g., "16x9" not "16:9")
 */
export const AspectRatioSchema = z.enum([
  '1x1',
  '16x9',
  '9x16',
  '4x3',
  '3x4',
  '3x2',
  '2x3',
  '4x5',
  '5x4',
  '1x2',
  '2x1',
  '1x3',
  '3x1',
  '10x16',
  '16x10',
]);

/**
 * Rendering speed options for Ideogram V3.
 * FLASH: Fastest, lower quality
 * TURBO: Fast with good quality
 * DEFAULT: Balanced speed and quality
 * QUALITY: Slowest, highest quality
 */
export const RenderingSpeedSchema = z.enum([
  'FLASH',
  'TURBO',
  'DEFAULT',
  'QUALITY',
]);

/**
 * Magic prompt enhancement options.
 * AUTO: Let the API decide based on prompt length/complexity
 * ON: Always enhance the prompt
 * OFF: Use prompt as-is
 */
export const MagicPromptSchema = z.enum(['AUTO', 'ON', 'OFF']);

/**
 * Style type for image generation and editing.
 */
export const StyleTypeSchema = z.enum([
  'AUTO',
  'GENERAL',
  'REALISTIC',
  'DESIGN',
  'FICTION',
  'RENDER_3D',
  'ANIME',
]);

/**
 * Model versions for legacy endpoints.
 */
export const ModelSchema = z.enum(['V_2', 'V_2_TURBO']);

/**
 * Prediction status for async operations.
 */
export const PredictionStatusSchema = z.enum([
  'queued',
  'processing',
  'completed',
  'failed',
  'cancelled',
]);

// =============================================================================
// Tool Input Schemas
// =============================================================================

/**
 * Input schema for ideogram_generate tool.
 * Generates images from text prompts using Ideogram API v3.
 */
export const GenerateInputSchema = z.object({
  /** Text prompt describing the desired image (1-10000 characters) */
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .max(10000, 'Prompt must be 10000 characters or less'),

  /** Negative prompt to guide what not to include */
  negative_prompt: z
    .string()
    .max(10000, 'Negative prompt must be 10000 characters or less')
    .optional(),

  /** Aspect ratio for the generated image */
  aspect_ratio: AspectRatioSchema.optional().default('1x1'),

  /** Number of images to generate (1-8) */
  num_images: z
    .number()
    .int('Number of images must be an integer')
    .min(1, 'Must generate at least 1 image')
    .max(8, 'Cannot generate more than 8 images')
    .optional()
    .default(1),

  /** Random seed for reproducible generation (0-2147483647) */
  seed: z
    .number()
    .int('Seed must be an integer')
    .min(0, 'Seed must be non-negative')
    .max(2147483647, 'Seed must be at most 2147483647')
    .optional(),

  /** Rendering speed/quality tradeoff */
  rendering_speed: RenderingSpeedSchema.optional().default('DEFAULT'),

  /** Magic prompt enhancement option */
  magic_prompt: MagicPromptSchema.optional().default('AUTO'),

  /** Style type for the image */
  style_type: StyleTypeSchema.optional().default('AUTO'),

  /** Whether to save generated images locally */
  save_locally: z.boolean().optional().default(true),
});

/**
 * Input schema for ideogram_generate_async tool.
 * Same parameters as generate, but returns immediately with a prediction_id.
 */
export const GenerateAsyncInputSchema = GenerateInputSchema.extend({
  /** Optional webhook URL for completion notification (reserved for future use) */
  webhook_url: z.string().url('Invalid webhook URL').optional(),
});

/**
 * Input schema for ideogram_edit tool.
 * Supports inpainting (mask-based editing) and outpainting (image expansion).
 */
export const EditInputSchema = z.object({
  /** Text prompt describing the desired changes */
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .max(10000, 'Prompt must be 10000 characters or less'),

  /** Source image: URL, file path, or base64 data URL */
  image: z.string().min(1, 'Image is required'),

  /**
   * Mask image for inpainting: black=edit, white=preserve
   * REQUIRED for inpainting
   */
  mask: z.string().min(1, 'Mask is required'),

  /** Model to use for editing (V_2 or V_2_TURBO) */
  model: ModelSchema.optional().default('V_2'),

  /** Number of images to generate (1-8) */
  num_images: z
    .number()
    .int('Number of images must be an integer')
    .min(1, 'Must generate at least 1 image')
    .max(8, 'Cannot generate more than 8 images')
    .optional()
    .default(1),

  /** Random seed for reproducible generation (0-2147483647) */
  seed: z
    .number()
    .int('Seed must be an integer')
    .min(0, 'Seed must be non-negative')
    .max(2147483647, 'Seed must be at most 2147483647')
    .optional(),

  /** Magic prompt enhancement option */
  magic_prompt: MagicPromptSchema.optional().default('AUTO'),

  /** Style type for the image */
  style_type: StyleTypeSchema.optional().default('AUTO'),

  /** Whether to save generated images locally */
  save_locally: z.boolean().optional().default(true),
});

/**
 * Input schema for ideogram_get_prediction tool.
 * Polls for local job queue status and retrieves results.
 */
export const GetPredictionInputSchema = z.object({
  /** Unique prediction ID returned from ideogram_generate_async */
  prediction_id: z.string().min(1, 'Prediction ID is required'),
});

/**
 * Input schema for ideogram_cancel_prediction tool.
 * Cancels locally queued jobs before they're sent to Ideogram API.
 */
export const CancelPredictionInputSchema = z.object({
  /** Unique prediction ID to cancel */
  prediction_id: z.string().min(1, 'Prediction ID is required'),
});

// =============================================================================
// Tool Input Types (inferred from schemas)
// =============================================================================

export type GenerateInput = z.infer<typeof GenerateInputSchema>;
export type GenerateAsyncInput = z.infer<typeof GenerateAsyncInputSchema>;
export type EditInput = z.infer<typeof EditInputSchema>;
export type GetPredictionInput = z.infer<typeof GetPredictionInputSchema>;
export type CancelPredictionInput = z.infer<typeof CancelPredictionInputSchema>;

// =============================================================================
// Tool Output Types
// =============================================================================

/**
 * Cost estimate included in all generation responses
 */
export interface CostEstimateOutput {
  /** Estimated credits used for this request */
  credits_used: number;
  /** Estimated USD cost based on known pricing */
  estimated_usd: number;
  /** Pricing tier used for estimation */
  pricing_tier: 'FLASH' | 'TURBO' | 'DEFAULT' | 'QUALITY';
  /** Number of images in the request */
  num_images: number;
}

/**
 * Individual generated image in tool output
 */
export interface GeneratedImageOutput {
  /** URL to the generated image (temporary Ideogram URL) */
  url: string;
  /** Local file path if saved locally */
  local_path?: string;
  /** Seed used for this specific image */
  seed: number;
  /** Whether safety filters were triggered */
  is_image_safe: boolean;
  /** Prompt used (may differ from input if magic_prompt was applied) */
  prompt?: string;
  /** Resolution of the generated image */
  resolution?: string;
}

/**
 * Output from ideogram_generate tool
 */
export interface GenerateOutput {
  /** Success indicator */
  success: true;
  /** Request creation timestamp */
  created: string;
  /** Array of generated images */
  images: GeneratedImageOutput[];
  /** Cost estimation for this request */
  total_cost: CostEstimateOutput;
  /** Number of images generated */
  num_images: number;
}

/**
 * Output from ideogram_generate_async tool
 */
export interface GenerateAsyncOutput {
  /** Success indicator */
  success: true;
  /** Unique prediction ID for polling */
  prediction_id: string;
  /** Current status of the prediction */
  status: 'queued';
  /** Estimated time to completion (seconds) */
  eta_seconds: number;
  /** Message for the user */
  message: string;
}

/**
 * Output from ideogram_edit tool
 */
export interface EditOutput {
  /** Success indicator */
  success: true;
  /** Request creation timestamp */
  created: string;
  /** Array of edited images */
  images: GeneratedImageOutput[];
  /** Cost estimation for this request */
  total_cost: CostEstimateOutput;
  /** Number of images generated */
  num_images: number;
}

/**
 * Output from ideogram_get_prediction tool when still processing
 */
export interface GetPredictionProcessingOutput {
  /** Success indicator */
  success: true;
  /** Unique prediction ID */
  prediction_id: string;
  /** Current status */
  status: 'queued' | 'processing';
  /** Estimated time remaining (seconds) */
  eta_seconds?: number;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Message for the user */
  message: string;
}

/**
 * Output from ideogram_get_prediction tool when completed
 */
export interface GetPredictionCompletedOutput {
  /** Success indicator */
  success: true;
  /** Unique prediction ID */
  prediction_id: string;
  /** Current status */
  status: 'completed';
  /** Request creation timestamp */
  created: string;
  /** Array of generated images */
  images: GeneratedImageOutput[];
  /** Cost estimation for this request */
  total_cost: CostEstimateOutput;
  /** Number of images generated */
  num_images: number;
}

/**
 * Output from ideogram_get_prediction tool when failed
 */
export interface GetPredictionFailedOutput {
  /** Success indicator */
  success: false;
  /** Unique prediction ID */
  prediction_id: string;
  /** Current status */
  status: 'failed' | 'cancelled';
  /** Error information */
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
  /** Message for the user */
  message: string;
}

/**
 * Combined output type for ideogram_get_prediction tool
 */
export type GetPredictionOutput =
  | GetPredictionProcessingOutput
  | GetPredictionCompletedOutput
  | GetPredictionFailedOutput;

/**
 * Output from ideogram_cancel_prediction tool when cancelled successfully
 */
export interface CancelPredictionSuccessOutput {
  /** Success indicator */
  success: true;
  /** Unique prediction ID */
  prediction_id: string;
  /** Status after cancellation */
  status: 'cancelled';
  /** Message for the user */
  message: string;
}

/**
 * Output from ideogram_cancel_prediction tool when cancellation failed
 */
export interface CancelPredictionFailedOutput {
  /** Success indicator */
  success: false;
  /** Unique prediction ID */
  prediction_id: string;
  /** Current status (already completed or processing) */
  status: 'completed' | 'processing' | 'failed';
  /** Reason cancellation failed */
  reason: string;
  /** Message for the user */
  message: string;
}

/**
 * Combined output type for ideogram_cancel_prediction tool
 */
export type CancelPredictionOutput =
  | CancelPredictionSuccessOutput
  | CancelPredictionFailedOutput;

// =============================================================================
// Tool Error Output
// =============================================================================

/**
 * Standard error output for all tools
 */
export interface ToolErrorOutput {
  /** Success indicator */
  success: false;
  /** Error code for programmatic handling */
  error_code: string;
  /** Technical error message */
  error: string;
  /** User-friendly error message */
  user_message: string;
  /** Whether the operation can be retried */
  retryable: boolean;
  /** Additional error details */
  details?: Record<string, unknown>;
}

// =============================================================================
// Tool Schema Exports for MCP Registration
// =============================================================================

/**
 * Schema shapes for MCP tool registration.
 * These are the raw Zod schema shapes converted to JSON Schema format.
 */
export const ToolSchemas = {
  generate: GenerateInputSchema,
  generateAsync: GenerateAsyncInputSchema,
  edit: EditInputSchema,
  getPrediction: GetPredictionInputSchema,
  cancelPrediction: CancelPredictionInputSchema,
} as const;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if an output is an error
 */
export const isToolError = (
  output: { success: boolean }
): output is ToolErrorOutput => {
  return output.success === false && 'error_code' in output;
};

/**
 * Type guard to check if prediction is completed
 */
export const isPredictionCompleted = (
  output: GetPredictionOutput
): output is GetPredictionCompletedOutput => {
  return output.success === true && output.status === 'completed';
};

/**
 * Type guard to check if prediction is still processing
 */
export const isPredictionProcessing = (
  output: GetPredictionOutput
): output is GetPredictionProcessingOutput => {
  return (
    output.success === true &&
    (output.status === 'queued' || output.status === 'processing')
  );
};

/**
 * Type guard to check if prediction failed
 */
export const isPredictionFailed = (
  output: GetPredictionOutput
): output is GetPredictionFailedOutput => {
  return output.success === false;
};

/**
 * Type guard to check if cancellation was successful
 */
export const isCancellationSuccessful = (
  output: CancelPredictionOutput
): output is CancelPredictionSuccessOutput => {
  return output.success === true;
};
