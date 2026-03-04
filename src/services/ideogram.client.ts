/**
 * Ideogram API Client
 *
 * Provides a type-safe wrapper around the Ideogram API with:
 * - Multipart/form-data request handling (required by all endpoints)
 * - Api-Key header authentication
 * - Automatic retry with exponential backoff
 * - Comprehensive error handling
 * - Structured logging
 * - Configurable timeouts
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios';
import FormData from 'form-data';
import type { Logger } from 'pino';
import { Readable } from 'stream';

import {
  API_BASE_URL,
  API_ENDPOINTS,
  API_KEY_HEADER,
  TIMEOUTS,
  DEFAULTS,
} from '../config/constants.js';
import { config } from '../config/config.js';
import type {
  GenerateRequest,
  GenerateResponse,
  EditResponse,
  DescribeResponse,
  RenderingSpeed,
  AspectRatio,
  ApiErrorResponse,
  StyleType,
} from '../types/api.types.js';
import {
  fromAxiosError,
  createMissingApiKeyError,
  createInvalidImageError,
  createImageTooLargeError,
  createNetworkError,
  wrapError,
} from '../utils/error.handler.js';
import { withRetry, type RetryOptions } from '../utils/retry.js';
import {
  createChildLogger,
  logApiRequest,
  logApiResponse,
  type ApiRequestLogContext,
  type ApiResponseLogContext,
} from '../utils/logger.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for the IdeogramClient.
 */
export interface IdeogramClientOptions {
  /**
   * Ideogram API key. If not provided, uses IDEOGRAM_API_KEY from environment.
   */
  apiKey?: string;

  /**
   * Base URL for the Ideogram API.
   * @default 'https://api.ideogram.ai'
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  timeoutMs?: number;

  /**
   * Extended timeout for quality rendering (in milliseconds).
   * Used when rendering_speed is 'QUALITY'.
   * @default 120000
   */
  longTimeoutMs?: number;

  /**
   * Custom retry options for API requests.
   */
  retryOptions?: RetryOptions;

  /**
   * Custom logger instance.
   */
  logger?: Logger;
}

/**
 * Parameters for image generation.
 */
export interface GenerateParams {
  /**
   * Text prompt describing the desired image (1-10000 characters).
   */
  prompt: string;

  /**
   * Negative prompt to guide what not to include.
   */
  negativePrompt?: string;

  /**
   * Aspect ratio for the generated image.
   * @default '1x1'
   */
  aspectRatio?: string;

  /**
   * Number of images to generate (1-8).
   * @default 1
   */
  numImages?: number;

  /**
   * Random seed for reproducible generation (0-2147483647).
   */
  seed?: number;

  /**
   * Rendering speed/quality tradeoff.
   * @default 'DEFAULT'
   */
  renderingSpeed?: RenderingSpeed;

  /**
   * Magic prompt enhancement option.
   * @default 'AUTO'
   */
  magicPrompt?: 'AUTO' | 'ON' | 'OFF';

  /**
   * Style type for the image.
   * Note: V3 API only supports subset of styles (no RENDER_3D or ANIME)
   * @default 'AUTO'
   */
  styleType?: StyleType;

  /**
   * Character reference images for maintaining character consistency.
   * Can be URLs, base64 data URLs, or Buffers.
   */
  characterReferenceImages?: (string | Buffer)[];
}

/**
 * Parameters for image editing (V3 inpainting).
 */
export interface EditParams {
  /**
   * Text prompt describing the desired edit (1-10000 characters).
   */
  prompt: string;

  /**
   * The source image to edit.
   * Can be a URL, base64 data URL, file path, or Buffer.
   */
  image: string | Buffer;

  /**
   * The mask image for inpainting (black=edit, white=preserve).
   * Can be a URL, base64 data URL, file path, or Buffer.
   * REQUIRED for all edit operations.
   */
  mask: string | Buffer;

  /**
   * Number of images to generate (1-8).
   * @default 1
   */
  numImages?: number;

  /**
   * Random seed for reproducible generation (0-2147483647).
   */
  seed?: number;

  /**
   * Rendering speed/quality tradeoff.
   * @default 'DEFAULT'
   */
  renderingSpeed?: RenderingSpeed;

  /**
   * Magic prompt enhancement option.
   * @default 'AUTO'
   */
  magicPrompt?: 'AUTO' | 'ON' | 'OFF';

  /**
   * Style type for the image (V3 subset).
   * @default 'AUTO'
   */
  styleType?: 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'FICTION';

  /**
   * Character reference images for maintaining character consistency.
   * Can be URLs, base64 data URLs, or Buffers.
   */
  characterReferenceImages?: (string | Buffer)[];
}

/**
 * Parameters for image description.
 */
export interface DescribeParams {
  /**
   * The image to describe.
   * Can be a URL, base64 data URL, or Buffer.
   */
  image: string | Buffer;

  /**
   * Model version for description.
   * @default 'V_3'
   */
  describeModelVersion?: 'V_2' | 'V_3';
}

/**
 * Parameters for image upscaling.
 */
export interface UpscaleParams {
  /**
   * The image to upscale.
   * Can be a URL, base64 data URL, or Buffer.
   */
  image: string | Buffer;

  /**
   * Optional guidance text for upscaling.
   */
  prompt?: string;

  /**
   * Similarity to original (0-100).
   * @default 50
   */
  resemblance?: number;

  /**
   * Detail enhancement level (0-100).
   * @default 50
   */
  detail?: number;

  /**
   * Magic prompt enhancement option.
   */
  magicPrompt?: 'AUTO' | 'ON' | 'OFF';

  /**
   * Number of images to generate (1-8).
   * @default 1
   */
  numImages?: number;

  /**
   * Random seed for reproducible generation.
   */
  seed?: number;
}

/**
 * Parameters for image remixing.
 */
export interface RemixParams {
  /** The source image to remix */
  image: string | Buffer;
  /** Text prompt describing the desired remix */
  prompt: string;
  /** How much influence the original image has (0-100) */
  imageWeight?: number;
  /** Negative prompt */
  negativePrompt?: string;
  /** Aspect ratio */
  aspectRatio?: string;
  /** Number of images (1-8) */
  numImages?: number;
  /** Random seed */
  seed?: number;
  /** Rendering speed */
  renderingSpeed?: RenderingSpeed;
  /** Magic prompt option */
  magicPrompt?: 'AUTO' | 'ON' | 'OFF';
  /** Style type (V3 subset) */
  styleType?: StyleType;
  /** Character reference images for maintaining character consistency */
  characterReferenceImages?: (string | Buffer)[];
}

/**
 * Parameters for image reframing.
 */
export interface ReframeParams {
  /** The source image to reframe */
  image: string | Buffer;
  /** Target resolution (e.g. "1024x768") */
  resolution: string;
  /** Number of images (1-8) */
  numImages?: number;
  /** Random seed */
  seed?: number;
  /** Rendering speed */
  renderingSpeed?: RenderingSpeed;
}

/**
 * Parameters for background replacement.
 */
export interface ReplaceBackgroundParams {
  /** The source image */
  image: string | Buffer;
  /** Description of desired new background */
  prompt: string;
  /** Magic prompt option */
  magicPrompt?: 'AUTO' | 'ON' | 'OFF';
  /** Number of images (1-8) */
  numImages?: number;
  /** Random seed */
  seed?: number;
  /** Rendering speed */
  renderingSpeed?: RenderingSpeed;
}

/**
 * Image input that has been prepared for form upload.
 */
interface PreparedImage {
  /**
   * Buffer or stream containing the image data.
   */
  data: Buffer | Readable;

  /**
   * MIME type of the image.
   */
  contentType: string;

  /**
   * Filename for the form field.
   */
  filename: string;
}

// =============================================================================
// IdeogramClient Class
// =============================================================================

/**
 * Client for interacting with the Ideogram API.
 *
 * All Ideogram API endpoints use multipart/form-data format with:
 * - 'image_request' field containing JSON-stringified request parameters
 * - 'image' field for edit endpoints (image to edit)
 * - 'mask' field for inpainting (mask image)
 *
 * @example
 * ```typescript
 * const client = new IdeogramClient();
 *
 * // Generate images
 * const result = await client.generate({
 *   prompt: 'A beautiful sunset over the ocean',
 *   aspectRatio: '16x9',
 *   numImages: 4,
 * });
 *
 * // Edit an image
 * const edited = await client.edit({
 *   prompt: 'Add a sailboat',
 *   image: 'https://example.com/sunset.jpg',
 *   mask: maskBuffer,
 *   mode: 'inpaint',
 * });
 * ```
 */
export class IdeogramClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly longTimeoutMs: number;
  private readonly retryOptions: RetryOptions;
  private readonly log: Logger;
  private readonly httpClient: AxiosInstance;

  /**
   * Creates a new IdeogramClient instance.
   *
   * @param options - Client configuration options
   * @throws {IdeogramMCPError} If no API key is provided or found in environment
   */
  constructor(options: IdeogramClientOptions = {}) {
    // Get API key from options or config
    const apiKey = options.apiKey ?? config.ideogramApiKey;
    if (!apiKey) {
      throw createMissingApiKeyError();
    }

    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl ?? API_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? config.requestTimeoutMs ?? TIMEOUTS.DEFAULT_REQUEST_MS;
    this.longTimeoutMs = options.longTimeoutMs ?? TIMEOUTS.LONG_REQUEST_MS;
    this.retryOptions = options.retryOptions ?? {};
    this.log = options.logger ?? createChildLogger('ideogram-client');

    // Create Axios instance with base configuration
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeoutMs,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    this.log.debug(
      { baseUrl: this.baseUrl, timeoutMs: this.timeoutMs },
      'IdeogramClient initialized'
    );
  }

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Generates images from a text prompt using Ideogram V3.
   *
   * @param params - Generation parameters
   * @returns Promise resolving to the generation response with image URLs
   * @throws {IdeogramMCPError} On validation errors, API errors, or network failures
   *
   * @example
   * ```typescript
   * const result = await client.generate({
   *   prompt: 'A cute cat wearing a wizard hat',
   *   aspectRatio: '1x1',
   *   numImages: 2,
   *   renderingSpeed: 'QUALITY',
   * });
   *
   * console.log(result.data[0].url); // Temporary URL to generated image
   * ```
   */
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    const endpoint = API_ENDPOINTS.GENERATE_V3;
    const startTime = Date.now();

    // Determine if we need FormData (when character reference images are provided)
    const hasCharacterRefs =
      params.characterReferenceImages !== undefined && params.characterReferenceImages.length > 0;

    let requestBody: FormData | GenerateRequest;

    if (hasCharacterRefs) {
      // Build FormData for multipart request with character reference images
      const formData = new FormData();
      formData.append('prompt', params.prompt);
      formData.append('num_images', String(params.numImages ?? DEFAULTS.NUM_IMAGES));
      formData.append('rendering_speed', params.renderingSpeed ?? DEFAULTS.RENDERING_SPEED);
      formData.append('magic_prompt', params.magicPrompt ?? DEFAULTS.MAGIC_PROMPT);
      formData.append('style_type', params.styleType ?? DEFAULTS.STYLE_TYPE);

      const normalizedAspectRatio = this.normalizeAspectRatio(params.aspectRatio);
      if (normalizedAspectRatio !== undefined) {
        formData.append('aspect_ratio', normalizedAspectRatio);
      }
      if (params.negativePrompt !== undefined) {
        formData.append('negative_prompt', params.negativePrompt);
      }
      if (params.seed !== undefined) {
        formData.append('seed', String(params.seed));
      }

      // Append character reference images (guarded by hasCharacterRefs above)
      if (params.characterReferenceImages !== undefined) {
        for (const charRef of params.characterReferenceImages) {
          const prepared = await this.prepareImage(charRef, 'character_reference_images');
          formData.append('character_reference_images', prepared.data, {
            contentType: prepared.contentType,
            filename: prepared.filename,
          });
        }
      }

      requestBody = formData;
    } else {
      // Build JSON request body (no character reference images)
      const imageRequest: GenerateRequest = {
        prompt: params.prompt,
        num_images: params.numImages ?? DEFAULTS.NUM_IMAGES,
        rendering_speed: params.renderingSpeed ?? DEFAULTS.RENDERING_SPEED,
        magic_prompt: params.magicPrompt ?? DEFAULTS.MAGIC_PROMPT,
        style_type: params.styleType ?? DEFAULTS.STYLE_TYPE,
      };

      // Add optional fields only if defined (exactOptionalPropertyTypes compliance)
      const normalizedAspectRatio = this.normalizeAspectRatio(params.aspectRatio);
      if (normalizedAspectRatio !== undefined) {
        imageRequest.aspect_ratio = normalizedAspectRatio;
      }
      if (params.negativePrompt !== undefined) {
        imageRequest.negative_prompt = params.negativePrompt;
      }
      if (params.seed !== undefined) {
        imageRequest.seed = params.seed;
      }

      requestBody = imageRequest;
    }

    // Log request
    const requestContext: ApiRequestLogContext = {
      endpoint,
      method: 'POST',
      hasImage: hasCharacterRefs,
      hasMask: false,
    };
    logApiRequest(this.log, requestContext);

    // Determine timeout based on rendering speed
    const timeout = this.getTimeoutForRenderingSpeed(params.renderingSpeed);

    // Execute with retry
    const response = await this.executeWithRetry<GenerateResponse>(
      endpoint,
      requestBody,
      timeout,
      'generate'
    );

    // Log response
    const responseContext: ApiResponseLogContext = {
      endpoint,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      imageCount: response.data.length,
    };
    logApiResponse(this.log, responseContext);

    return response;
  }

  /**
   * Edits an existing image using inpainting.
   *
   * Inpainting uses a mask to define which areas to edit:
   * - Black pixels in mask = areas to modify
   * - White pixels in mask = areas to preserve
   *
   * @param params - Edit parameters including image, mask, and prompt
   * @returns Promise resolving to the edit response with image URLs
   * @throws {IdeogramMCPError} On validation errors, API errors, or network failures
   *
   * @example
   * ```typescript
   * const result = await client.edit({
   *   prompt: 'Add a red balloon in the sky',
   *   image: 'https://example.com/photo.jpg',
   *   mask: maskBuffer, // Black=edit, white=preserve
   *   model: 'V_2',
   *   magicPrompt: 'AUTO',
   * });
   *
   * console.log(result.data[0].url); // Edited image URL
   * ```
   */
  async edit(params: EditParams): Promise<EditResponse> {
    const endpoint = API_ENDPOINTS.EDIT_V3;
    const startTime = Date.now();

    // Prepare image for upload
    const preparedImage = await this.prepareImage(params.image, 'image');

    // Prepare mask (always required for V3 edit)
    const preparedMask = await this.prepareImage(params.mask, 'mask');

    // Create multipart form data with V3 flat fields
    const formData = new FormData();
    formData.append('image', preparedImage.data, {
      contentType: preparedImage.contentType,
      filename: preparedImage.filename,
    });
    formData.append('mask', preparedMask.data, {
      contentType: preparedMask.contentType,
      filename: preparedMask.filename,
    });
    formData.append('prompt', params.prompt);
    formData.append('num_images', String(params.numImages ?? DEFAULTS.NUM_IMAGES));
    formData.append('rendering_speed', params.renderingSpeed ?? DEFAULTS.RENDERING_SPEED);
    formData.append('magic_prompt', params.magicPrompt ?? DEFAULTS.MAGIC_PROMPT);

    // Add optional fields only if defined
    if (params.seed !== undefined) {
      formData.append('seed', String(params.seed));
    }
    if (params.styleType !== undefined) {
      formData.append('style_type', params.styleType);
    }

    // Append character reference images if provided
    if (params.characterReferenceImages !== undefined && params.characterReferenceImages.length > 0) {
      for (const charRef of params.characterReferenceImages) {
        const prepared = await this.prepareImage(charRef, 'character_reference_images');
        formData.append('character_reference_images', prepared.data, {
          contentType: prepared.contentType,
          filename: prepared.filename,
        });
      }
    }

    // Log request
    const requestContext: ApiRequestLogContext = {
      endpoint,
      method: 'POST',
      hasImage: true,
      hasMask: true,
    };
    logApiRequest(this.log, requestContext);

    // Use rendering speed-based timeout
    const timeout = this.getTimeoutForRenderingSpeed(params.renderingSpeed);

    // Execute with retry
    const response = await this.executeWithRetry<EditResponse>(endpoint, formData, timeout, 'edit');

    // Log response
    const responseContext: ApiResponseLogContext = {
      endpoint,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      imageCount: response.data.length,
    };
    logApiResponse(this.log, responseContext);

    return response;
  }

  /**
   * Describes an image, generating text descriptions.
   *
   * @param params - Describe parameters including the image
   * @returns Promise resolving to text descriptions
   * @throws {IdeogramMCPError} On validation errors, API errors, or network failures
   *
   * @example
   * ```typescript
   * const result = await client.describe({
   *   image: 'https://example.com/photo.jpg',
   *   describeModelVersion: 'V_3',
   * });
   *
   * console.log(result.descriptions[0].text); // "A sunset over the ocean..."
   * ```
   */
  async describe(params: DescribeParams): Promise<DescribeResponse> {
    const endpoint = API_ENDPOINTS.DESCRIBE;
    const startTime = Date.now();

    // Prepare image for upload
    const preparedImage = await this.prepareImage(params.image, 'image_file');

    // Create multipart form data
    const formData = new FormData();
    formData.append('image_file', preparedImage.data, {
      contentType: preparedImage.contentType,
      filename: preparedImage.filename,
    });

    if (params.describeModelVersion !== undefined) {
      formData.append('describe_model_version', params.describeModelVersion);
    }

    // Log request
    const requestContext: ApiRequestLogContext = {
      endpoint,
      method: 'POST',
      hasImage: true,
      hasMask: false,
    };
    logApiRequest(this.log, requestContext);

    // Execute with retry
    const response = await this.executeWithRetry<DescribeResponse>(
      endpoint,
      formData,
      this.timeoutMs,
      'describe'
    );

    // Log response
    const responseContext: ApiResponseLogContext = {
      endpoint,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      imageCount: 0,
    };
    logApiResponse(this.log, responseContext);

    return response;
  }

  /**
   * Upscales an image with optional prompt guidance.
   *
   * @param params - Upscale parameters
   * @returns Promise resolving to the upscaled image response
   * @throws {IdeogramMCPError} On validation errors, API errors, or network failures
   *
   * @example
   * ```typescript
   * const result = await client.upscale({
   *   image: 'https://example.com/photo.jpg',
   *   prompt: 'High detail landscape',
   *   resemblance: 70,
   *   detail: 80,
   * });
   *
   * console.log(result.data[0].url); // Upscaled image URL
   * ```
   */
  async upscale(params: UpscaleParams): Promise<GenerateResponse> {
    const endpoint = API_ENDPOINTS.UPSCALE;
    const startTime = Date.now();

    // Prepare image for upload
    const preparedImage = await this.prepareImage(params.image, 'image_file');

    // Build image_request JSON (legacy endpoint uses JSON wrapper)
    const imageRequest: Record<string, unknown> = {};
    if (params.prompt !== undefined) {
      imageRequest['prompt'] = params.prompt;
    }
    imageRequest['resemblance'] = params.resemblance ?? 50;
    imageRequest['detail'] = params.detail ?? 50;
    if (params.magicPrompt !== undefined) {
      imageRequest['magic_prompt_option'] = params.magicPrompt;
    }
    imageRequest['num_images'] = params.numImages ?? DEFAULTS.NUM_IMAGES;
    if (params.seed !== undefined) {
      imageRequest['seed'] = params.seed;
    }

    // Create multipart form data
    const formData = new FormData();
    formData.append('image_request', JSON.stringify(imageRequest), {
      contentType: 'application/json',
    });
    formData.append('image_file', preparedImage.data, {
      contentType: preparedImage.contentType,
      filename: preparedImage.filename,
    });

    // Log request
    const requestContext: ApiRequestLogContext = {
      endpoint,
      method: 'POST',
      hasImage: true,
      hasMask: false,
    };
    logApiRequest(this.log, requestContext);

    // Execute with retry
    const response = await this.executeWithRetry<GenerateResponse>(
      endpoint,
      formData,
      TIMEOUTS.LONG_REQUEST_MS,
      'upscale'
    );

    // Log response
    const responseContext: ApiResponseLogContext = {
      endpoint,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      imageCount: response.data.length,
    };
    logApiResponse(this.log, responseContext);

    return response;
  }

  /**
   * Remixes an existing image based on a new prompt.
   *
   * @param params - Remix parameters including image and prompt
   * @returns Promise resolving to the remixed image response
   * @throws {IdeogramMCPError} On validation errors, API errors, or network failures
   *
   * @example
   * ```typescript
   * const result = await client.remix({
   *   image: 'https://example.com/photo.jpg',
   *   prompt: 'Transform into a watercolor painting',
   *   imageWeight: 60,
   * });
   *
   * console.log(result.data[0].url); // Remixed image URL
   * ```
   */
  async remix(params: RemixParams): Promise<GenerateResponse> {
    const endpoint = API_ENDPOINTS.REMIX_V3;
    const startTime = Date.now();

    // Prepare image for upload
    const preparedImage = await this.prepareImage(params.image, 'image');

    // Create multipart form data (V3 uses flat fields)
    const formData = new FormData();
    formData.append('image', preparedImage.data, {
      contentType: preparedImage.contentType,
      filename: preparedImage.filename,
    });
    formData.append('prompt', params.prompt);
    formData.append('image_weight', String(params.imageWeight ?? 50));
    formData.append('num_images', String(params.numImages ?? DEFAULTS.NUM_IMAGES));
    formData.append('rendering_speed', params.renderingSpeed ?? DEFAULTS.RENDERING_SPEED);
    formData.append('magic_prompt', params.magicPrompt ?? DEFAULTS.MAGIC_PROMPT);

    if (params.negativePrompt !== undefined) {
      formData.append('negative_prompt', params.negativePrompt);
    }
    const normalizedAspectRatio = this.normalizeAspectRatio(params.aspectRatio);
    if (normalizedAspectRatio !== undefined) {
      formData.append('aspect_ratio', normalizedAspectRatio);
    }
    if (params.seed !== undefined) {
      formData.append('seed', String(params.seed));
    }
    if (params.styleType !== undefined) {
      formData.append('style_type', params.styleType);
    }

    // Append character reference images if provided
    if (params.characterReferenceImages !== undefined && params.characterReferenceImages.length > 0) {
      for (const charRef of params.characterReferenceImages) {
        const prepared = await this.prepareImage(charRef, 'character_reference_images');
        formData.append('character_reference_images', prepared.data, {
          contentType: prepared.contentType,
          filename: prepared.filename,
        });
      }
    }

    const requestContext: ApiRequestLogContext = {
      endpoint,
      method: 'POST',
      hasImage: true,
      hasMask: false,
    };
    logApiRequest(this.log, requestContext);

    const timeout = this.getTimeoutForRenderingSpeed(params.renderingSpeed);
    const response = await this.executeWithRetry<GenerateResponse>(
      endpoint,
      formData,
      timeout,
      'remix'
    );

    const responseContext: ApiResponseLogContext = {
      endpoint,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      imageCount: response.data.length,
    };
    logApiResponse(this.log, responseContext);

    return response;
  }

  /**
   * Reframes an image to a new resolution via intelligent outpainting.
   *
   * @param params - Reframe parameters including image and target resolution
   * @returns Promise resolving to the reframed image response
   * @throws {IdeogramMCPError} On validation errors, API errors, or network failures
   *
   * @example
   * ```typescript
   * const result = await client.reframe({
   *   image: 'https://example.com/photo.jpg',
   *   resolution: 'RESOLUTION_1024_768',
   * });
   *
   * console.log(result.data[0].url); // Reframed image URL
   * ```
   */
  async reframe(params: ReframeParams): Promise<GenerateResponse> {
    const endpoint = API_ENDPOINTS.REFRAME_V3;
    const startTime = Date.now();

    const preparedImage = await this.prepareImage(params.image, 'image');

    const formData = new FormData();
    formData.append('image', preparedImage.data, {
      contentType: preparedImage.contentType,
      filename: preparedImage.filename,
    });
    formData.append('resolution', params.resolution);
    formData.append('num_images', String(params.numImages ?? DEFAULTS.NUM_IMAGES));
    formData.append('rendering_speed', params.renderingSpeed ?? DEFAULTS.RENDERING_SPEED);

    if (params.seed !== undefined) {
      formData.append('seed', String(params.seed));
    }

    const requestContext: ApiRequestLogContext = {
      endpoint,
      method: 'POST',
      hasImage: true,
      hasMask: false,
    };
    logApiRequest(this.log, requestContext);

    const timeout = this.getTimeoutForRenderingSpeed(params.renderingSpeed);
    const response = await this.executeWithRetry<GenerateResponse>(
      endpoint,
      formData,
      timeout,
      'reframe'
    );

    const responseContext: ApiResponseLogContext = {
      endpoint,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      imageCount: response.data.length,
    };
    logApiResponse(this.log, responseContext);

    return response;
  }

  /**
   * Replaces the background of an image while preserving the foreground subject.
   *
   * @param params - Replace background parameters including image and prompt
   * @returns Promise resolving to the modified image response
   * @throws {IdeogramMCPError} On validation errors, API errors, or network failures
   *
   * @example
   * ```typescript
   * const result = await client.replaceBackground({
   *   image: 'https://example.com/portrait.jpg',
   *   prompt: 'A tropical beach at sunset',
   * });
   *
   * console.log(result.data[0].url); // Image with replaced background
   * ```
   */
  async replaceBackground(params: ReplaceBackgroundParams): Promise<GenerateResponse> {
    const endpoint = API_ENDPOINTS.REPLACE_BACKGROUND_V3;
    const startTime = Date.now();

    const preparedImage = await this.prepareImage(params.image, 'image');

    const formData = new FormData();
    formData.append('image', preparedImage.data, {
      contentType: preparedImage.contentType,
      filename: preparedImage.filename,
    });
    formData.append('prompt', params.prompt);
    formData.append('magic_prompt', params.magicPrompt ?? DEFAULTS.MAGIC_PROMPT);
    formData.append('num_images', String(params.numImages ?? DEFAULTS.NUM_IMAGES));
    formData.append('rendering_speed', params.renderingSpeed ?? DEFAULTS.RENDERING_SPEED);

    if (params.seed !== undefined) {
      formData.append('seed', String(params.seed));
    }

    const requestContext: ApiRequestLogContext = {
      endpoint,
      method: 'POST',
      hasImage: true,
      hasMask: false,
    };
    logApiRequest(this.log, requestContext);

    const timeout = this.getTimeoutForRenderingSpeed(params.renderingSpeed);
    const response = await this.executeWithRetry<GenerateResponse>(
      endpoint,
      formData,
      timeout,
      'replaceBackground'
    );

    const responseContext: ApiResponseLogContext = {
      endpoint,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      imageCount: response.data.length,
    };
    logApiResponse(this.log, responseContext);

    return response;
  }

  /**
   * Gets the current API key (masked for security).
   */
  getMaskedApiKey(): string {
    if (this.apiKey.length <= 8) {
      return '****';
    }
    return `${this.apiKey.slice(0, 4)}...${this.apiKey.slice(-4)}`;
  }

  /**
   * Tests the API connection by checking if the API key is valid.
   * Makes a minimal request to verify authentication.
   *
   * @returns Promise resolving to true if the connection is valid
   * @throws {IdeogramMCPError} If the API key is invalid or there's a network error
   */
  async testConnection(): Promise<boolean> {
    try {
      // Make a minimal generate request to test authentication
      // Using the smallest/fastest settings to minimize API usage
      await this.generate({
        prompt: 'test',
        numImages: 1,
        renderingSpeed: 'FLASH',
      });
      return true;
    } catch (error) {
      // Re-throw authentication errors
      throw wrapError(error);
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Executes an API request with automatic retry on transient failures.
   * Supports both JSON payloads (for generate) and FormData (for edit with images).
   */
  private async executeWithRetry<T>(
    endpoint: string,
    data: FormData | GenerateRequest | Record<string, unknown>,
    timeout: number,
    operationName: string
  ): Promise<T> {
    return withRetry(
      async () => {
        try {
          // Prepare headers based on data type
          const headers: Record<string, string> = {
            [API_KEY_HEADER]: this.apiKey,
          };

          // For FormData, include its headers (multipart/form-data with boundary)
          // For JSON objects, set Content-Type to application/json
          if (data instanceof FormData) {
            Object.assign(headers, data.getHeaders());
          } else {
            headers['Content-Type'] = 'application/json';
          }

          const response = await this.httpClient.post<T>(endpoint, data, {
            headers,
            timeout,
          });
          return response.data;
        } catch (error) {
          // Convert Axios error to IdeogramMCPError
          if (axios.isAxiosError(error)) {
            throw fromAxiosError(this.createAxiosErrorInfo(error));
          }
          throw wrapError(error);
        }
      },
      {
        ...this.retryOptions,
        operationName,
        logger: this.log,
      }
    );
  }

  /**
   * Converts an Axios error to the format expected by fromAxiosError.
   */
  private createAxiosErrorInfo(error: AxiosError): {
    response?: {
      status: number;
      data?: ApiErrorResponse | string;
    };
    code?: string;
    message: string;
  } {
    // Build result object handling exactOptionalPropertyTypes
    const result: {
      response?: {
        status: number;
        data?: ApiErrorResponse | string;
      };
      code?: string;
      message: string;
    } = {
      message: error.message,
    };

    // Only set code if defined
    if (error.code !== undefined) {
      result.code = error.code;
    }

    // Handle response if present
    if (error.response) {
      const responseData = error.response.data as ApiErrorResponse | string | undefined;

      result.response = {
        status: error.response.status,
      };

      // Only set data if defined
      if (responseData !== undefined) {
        result.response.data = responseData;
      }
    }

    return result;
  }

  /**
   * Prepares an image input for form upload.
   * Handles URLs, base64 data URLs, and Buffers.
   */
  private async prepareImage(input: string | Buffer, fieldName: string): Promise<PreparedImage> {
    // Handle Buffer input
    if (Buffer.isBuffer(input)) {
      return this.prepareBufferImage(input, fieldName);
    }

    // Handle base64 data URL
    if (input.startsWith('data:')) {
      return this.prepareBase64Image(input, fieldName);
    }

    // Handle URL (http/https)
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return this.prepareUrlImage(input, fieldName);
    }

    // Assume it's a file path - try to read it
    // Note: In production, you'd want to validate the path first
    throw createInvalidImageError(
      `Unsupported image input format for ${fieldName}. ` +
        'Provide a URL, base64 data URL, or Buffer.'
    );
  }

  /**
   * Prepares a Buffer image for upload.
   */
  private prepareBufferImage(buffer: Buffer, fieldName: string): PreparedImage {
    // Detect image type from magic bytes
    const contentType = this.detectImageType(buffer);
    const extension = this.getExtensionForContentType(contentType);

    // Validate size
    this.validateImageSize(buffer.length);

    return {
      data: buffer,
      contentType,
      filename: `${fieldName}.${extension}`,
    };
  }

  /**
   * Prepares a base64 data URL image for upload.
   */
  private prepareBase64Image(dataUrl: string, fieldName: string): PreparedImage {
    // Parse data URL format: data:[<mediatype>][;base64],<data>
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw createInvalidImageError(`Invalid base64 data URL format for ${fieldName}`);
    }

    const contentType = matches[1] ?? 'image/png';
    const base64Data = matches[2] ?? '';
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate size
    this.validateImageSize(buffer.length);

    const extension = this.getExtensionForContentType(contentType);

    return {
      data: buffer,
      contentType,
      filename: `${fieldName}.${extension}`,
    };
  }

  /**
   * Prepares a URL image for upload by downloading it.
   */
  private async prepareUrlImage(url: string, fieldName: string): Promise<PreparedImage> {
    try {
      const response = await axios.get<Buffer>(url, {
        responseType: 'arraybuffer',
        timeout: TIMEOUTS.IMAGE_DOWNLOAD_MS,
      });

      const buffer = Buffer.from(response.data);

      // Validate size
      this.validateImageSize(buffer.length);

      // Get content type from response or detect from buffer
      let contentType = response.headers['content-type']?.toString().split(';')[0];
      if (!contentType?.startsWith('image/')) {
        contentType = this.detectImageType(buffer);
      }

      const extension = this.getExtensionForContentType(contentType);

      return {
        data: buffer,
        contentType,
        filename: `${fieldName}.${extension}`,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw createNetworkError(`Failed to download image from URL: ${error.message}`, error);
      }
      throw wrapError(error);
    }
  }

  /**
   * Validates that the image size is within limits.
   */
  private validateImageSize(sizeBytes: number): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (sizeBytes > maxSize) {
      throw createImageTooLargeError(sizeBytes, maxSize);
    }
  }

  /**
   * Detects the image type from the first few bytes (magic numbers).
   */
  private detectImageType(buffer: Buffer): string {
    if (buffer.length < 4) {
      return 'image/png'; // Default
    }

    // Check magic bytes
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'image/png';
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // WebP: 52 49 46 46 ... 57 45 42 50
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer.length >= 12 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'image/webp';
    }

    // Default to PNG if unknown
    return 'image/png';
  }

  /**
   * Gets the file extension for a content type.
   */
  private getExtensionForContentType(contentType: string): string {
    const extensions: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
    };
    return extensions[contentType] ?? 'png';
  }

  /**
   * Normalizes aspect ratio input to the API format.
   * Converts "16:9" format to "16x9" format if needed.
   */
  private normalizeAspectRatio(ratio?: string): AspectRatio | undefined {
    if (!ratio) {
      return undefined;
    }
    // Replace colon with 'x' for API compatibility
    // Cast to AspectRatio - validation is done elsewhere
    return ratio.replace(':', 'x') as AspectRatio;
  }

  /**
   * Gets the appropriate timeout based on rendering speed.
   * Quality rendering may take longer.
   */
  private getTimeoutForRenderingSpeed(speed?: RenderingSpeed): number {
    if (speed === 'QUALITY') {
      return this.longTimeoutMs;
    }
    return this.timeoutMs;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates a new IdeogramClient with default configuration.
 *
 * @param options - Optional client configuration
 * @returns A new IdeogramClient instance
 *
 * @example
 * ```typescript
 * // Using environment variable for API key
 * const client = createIdeogramClient();
 *
 * // With custom options
 * const client = createIdeogramClient({
 *   apiKey: 'your-api-key',
 *   timeoutMs: 60000,
 * });
 * ```
 */
export function createIdeogramClient(options?: IdeogramClientOptions): IdeogramClient {
  return new IdeogramClient(options);
}

/**
 * Creates a client with a specific API key.
 * Convenience function for when you have the API key directly.
 *
 * @param apiKey - The Ideogram API key
 * @returns A new IdeogramClient instance
 */
export function createClientWithApiKey(apiKey: string): IdeogramClient {
  return new IdeogramClient({ apiKey });
}
