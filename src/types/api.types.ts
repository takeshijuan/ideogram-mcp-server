/**
 * Ideogram API Type Definitions
 *
 * These types define the request and response structures for the Ideogram API.
 * All endpoints use multipart/form-data with an 'image_request' JSON field.
 *
 * API Documentation: https://api.ideogram.ai/docs
 */

// =============================================================================
// Enums and Literal Types
// =============================================================================

/**
 * All 15 supported aspect ratios.
 * Note: Uses "x" separator, not ":" (e.g., "16x9" not "16:9")
 */
export type AspectRatio =
  | '1x1'
  | '16x9'
  | '9x16'
  | '4x3'
  | '3x4'
  | '3x2'
  | '2x3'
  | '4x5'
  | '5x4'
  | '1x2'
  | '2x1'
  | '1x3'
  | '3x1'
  | '10x16'
  | '16x10';

/**
 * Rendering speed options for Ideogram V3.
 * Faster speeds may reduce quality but decrease generation time.
 */
export type RenderingSpeed = 'FLASH' | 'TURBO' | 'DEFAULT' | 'QUALITY';

/**
 * Magic prompt enhancement options.
 * AUTO: Let the API decide based on prompt length/complexity
 * ON: Always enhance the prompt
 * OFF: Use prompt as-is
 */
export type MagicPrompt = 'AUTO' | 'ON' | 'OFF';

/**
 * Style type for image generation and editing.
 * AUTO: Let the API choose the best style
 * GENERAL: No specific style applied
 * REALISTIC: Photorealistic style
 * DESIGN: Graphic design style
 * FICTION: Fantasy/fiction style
 * RENDER_3D: 3D rendered style (edit API only)
 * ANIME: Anime/manga style (edit API only)
 */
export type StyleType = 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'FICTION' | 'RENDER_3D' | 'ANIME';

/**
 * Ideogram model versions (for legacy V2 endpoints)
 */
export type Model = 'V_2' | 'V_2_TURBO';

/**
 * Resolution options for specific models
 */
export type Resolution =
  | 'RESOLUTION_512_1536'
  | 'RESOLUTION_576_1408'
  | 'RESOLUTION_576_1472'
  | 'RESOLUTION_576_1536'
  | 'RESOLUTION_640_1024'
  | 'RESOLUTION_640_1344'
  | 'RESOLUTION_640_1408'
  | 'RESOLUTION_640_1472'
  | 'RESOLUTION_640_1536'
  | 'RESOLUTION_704_1152'
  | 'RESOLUTION_704_1216'
  | 'RESOLUTION_704_1280'
  | 'RESOLUTION_704_1344'
  | 'RESOLUTION_704_1408'
  | 'RESOLUTION_704_1472'
  | 'RESOLUTION_720_1280'
  | 'RESOLUTION_736_1312'
  | 'RESOLUTION_768_1024'
  | 'RESOLUTION_768_1088'
  | 'RESOLUTION_768_1152'
  | 'RESOLUTION_768_1216'
  | 'RESOLUTION_768_1232'
  | 'RESOLUTION_768_1280'
  | 'RESOLUTION_768_1344'
  | 'RESOLUTION_832_960'
  | 'RESOLUTION_832_1024'
  | 'RESOLUTION_832_1088'
  | 'RESOLUTION_832_1152'
  | 'RESOLUTION_832_1216'
  | 'RESOLUTION_832_1248'
  | 'RESOLUTION_864_1152'
  | 'RESOLUTION_896_960'
  | 'RESOLUTION_896_1024'
  | 'RESOLUTION_896_1088'
  | 'RESOLUTION_896_1120'
  | 'RESOLUTION_896_1152'
  | 'RESOLUTION_960_832'
  | 'RESOLUTION_960_896'
  | 'RESOLUTION_960_1024'
  | 'RESOLUTION_960_1088'
  | 'RESOLUTION_1024_576'
  | 'RESOLUTION_1024_640'
  | 'RESOLUTION_1024_768'
  | 'RESOLUTION_1024_832'
  | 'RESOLUTION_1024_896'
  | 'RESOLUTION_1024_960'
  | 'RESOLUTION_1024_1024';

/**
 * Prediction status for async operations (local implementation)
 */
export type PredictionStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';


// =============================================================================
// Request Types
// =============================================================================

/**
 * Base image request parameters shared across endpoints
 */
export interface BaseImageRequest {
  /** Text prompt describing the desired image (1-10000 characters) */
  prompt: string;
  /** Negative prompt to guide what not to include */
  negative_prompt?: string;
  /** Random seed for reproducible generation (0-2147483647) */
  seed?: number;
  /** Magic prompt enhancement option */
  magic_prompt?: MagicPrompt;
  /** Style type for the image */
  style_type?: StyleType;
}

/**
 * Generate request for V3 endpoint (/v1/ideogram-v3/generate)
 */
export interface GenerateRequest extends BaseImageRequest {
  /** Aspect ratio for the generated image */
  aspect_ratio?: AspectRatio;
  /** Number of images to generate (1-8) */
  num_images?: number;
  /** Rendering speed/quality tradeoff */
  rendering_speed?: RenderingSpeed;
}

/**
 * Generate request for legacy V2 endpoint (/generate)
 */
export interface LegacyGenerateRequest extends BaseImageRequest {
  /** Model version to use */
  model?: Model;
  /** Resolution preset */
  resolution?: Resolution;
  /** Aspect ratio for the generated image */
  aspect_ratio?: AspectRatio;
  /** Number of images to generate (1-8) */
  num_images?: number;
}


// =============================================================================
// Response Types
// =============================================================================

/**
 * Individual generated image data
 */
export interface GeneratedImage {
  /** Temporary URL to the generated image (expires after a period) */
  url: string;
  /** Seed used for this specific image (useful for reproducibility) */
  seed: number;
  /** Whether safety filters were triggered */
  is_image_safe: boolean;
  /** Prompt used for generation (may differ from input if magic_prompt was applied) */
  prompt?: string;
  /** Resolution of the generated image (width x height) */
  resolution?: string;
}

/**
 * Response from generate endpoint
 */
export interface GenerateResponse {
  /** Request creation timestamp */
  created: string;
  /** Array of generated images */
  data: GeneratedImage[];
}

/**
 * Response from edit endpoint
 */
export interface EditResponse {
  /** Request creation timestamp */
  created: string;
  /** Array of edited images */
  data: GeneratedImage[];
}

// =============================================================================
// Error Response Types
// =============================================================================

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  /** Error code from API */
  code?: string;
  /** Error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Rate limit information from response headers
 */
export interface RateLimitInfo {
  /** Maximum requests allowed in the time window */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Timestamp when the rate limit resets (Unix epoch seconds) */
  reset: number;
}

// =============================================================================
// Prediction Types (for local async implementation)
// =============================================================================

/**
 * Prediction record for local async queue
 */
export interface Prediction {
  /** Unique prediction ID */
  id: string;
  /** Current status of the prediction */
  status: PredictionStatus;
  /** Original request parameters */
  request: GenerateRequest;
  /** Type of request (generate or edit) */
  type: 'generate' | 'edit';
  /** Timestamp when the prediction was created */
  created_at: string;
  /** Timestamp when the prediction started processing */
  started_at?: string;
  /** Timestamp when the prediction completed */
  completed_at?: string;
  /** Result data if completed successfully */
  result?: GenerateResponse | EditResponse;
  /** Error information if failed */
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  /** Estimated time remaining (seconds) */
  eta_seconds?: number;
  /** Progress percentage (0-100) */
  progress?: number;
}

// =============================================================================
// Cost Tracking Types (local estimation)
// =============================================================================

/**
 * Cost estimation for a generation request
 * Note: Ideogram API does not return cost info, this is local estimation
 */
export interface CostEstimate {
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
 * Combined response with cost tracking
 */
export interface GenerateResponseWithCost extends GenerateResponse {
  /** Cost estimation for this request */
  total_cost: CostEstimate;
}

/**
 * Combined edit response with cost tracking
 */
export interface EditResponseWithCost extends EditResponse {
  /** Cost estimation for this request */
  total_cost: CostEstimate;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Type guard for checking if a value is a valid AspectRatio
 */
export const isValidAspectRatio = (value: string): value is AspectRatio => {
  const validRatios: AspectRatio[] = [
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
  ];
  return validRatios.includes(value as AspectRatio);
};

/**
 * Type guard for checking if a value is a valid RenderingSpeed
 */
export const isValidRenderingSpeed = (
  value: string
): value is RenderingSpeed => {
  const validSpeeds: RenderingSpeed[] = ['FLASH', 'TURBO', 'DEFAULT', 'QUALITY'];
  return validSpeeds.includes(value as RenderingSpeed);
};

/**
 * Type guard for checking if a value is a valid StyleType
 */
export const isValidStyleType = (value: string): value is StyleType => {
  const validStyles: StyleType[] = [
    'AUTO',
    'GENERAL',
    'REALISTIC',
    'DESIGN',
    'FICTION',
    'RENDER_3D',
    'ANIME',
  ];
  return validStyles.includes(value as StyleType);
};

/**
 * Type guard for checking if a value is a valid MagicPrompt option
 */
export const isValidMagicPrompt = (value: string): value is MagicPrompt => {
  const validOptions: MagicPrompt[] = ['AUTO', 'ON', 'OFF'];
  return validOptions.includes(value as MagicPrompt);
};
