/**
 * Input Validation Utilities
 *
 * Provides helper functions for validating inputs to the Ideogram MCP Server including:
 * - Safe Zod schema validation with result types
 * - Image input validation (URL, base64, file path)
 * - Image size and format validation
 * - User-friendly error message formatting
 */

import type { ZodSchema, ZodError, ZodIssue } from 'zod';
import {
  ASPECT_RATIOS,
  VALIDATION,
  RENDERING_SPEEDS,
  MAGIC_PROMPT_OPTIONS,
  STYLE_TYPES,
} from '../config/constants.js';
import type { AspectRatio, RenderingSpeed, MagicPrompt, StyleType } from '../types/api.types.js';

// =============================================================================
// Result Types for Safe Validation
// =============================================================================

/**
 * Result type for successful validation
 */
export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

/**
 * Result type for failed validation
 */
export interface ValidationFailure {
  success: false;
  errors: ValidationError[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Combined validation result type
 */
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// =============================================================================
// Safe Zod Validation
// =============================================================================

/**
 * Safely validates input against a Zod schema, returning a result type
 * instead of throwing an error.
 *
 * @param schema - Zod schema to validate against
 * @param input - Input data to validate
 * @returns ValidationResult with either the validated data or error details
 *
 * @example
 * const result = safeValidate(GenerateInputSchema, userInput);
 * if (result.success) {
 *   console.log(result.data.prompt);
 * } else {
 *   console.error(result.errors);
 * }
 */
export function safeValidate<T>(schema: ZodSchema<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: formatZodErrors(result.error),
  };
}

/**
 * Validates input against a Zod schema and throws an error if validation fails.
 * Use this when you want traditional throw-based error handling.
 *
 * @param schema - Zod schema to validate against
 * @param input - Input data to validate
 * @returns Validated and typed data
 * @throws ZodError if validation fails
 */
export function validateOrThrow<T>(schema: ZodSchema<T>, input: unknown): T {
  return schema.parse(input);
}

/**
 * Formats Zod errors into a user-friendly array of ValidationError objects.
 */
export function formatZodErrors(error: ZodError): ValidationError[] {
  return error.issues.map((issue) => formatZodIssue(issue));
}

/**
 * Formats a single Zod issue into a ValidationError.
 */
function formatZodIssue(issue: ZodIssue): ValidationError {
  const field = issue.path.length > 0 ? issue.path.join('.') : 'input';

  return {
    field,
    message: issue.message,
    code: issue.code,
  };
}

/**
 * Creates a formatted error message string from validation errors.
 */
export function formatValidationErrorMessage(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'Validation failed';
  }

  if (errors.length === 1) {
    const err = errors[0];
    if (err) {
      return `${err.field}: ${err.message}`;
    }
    return 'Validation failed';
  }

  const messages = errors.map((err) => `${err.field}: ${err.message}`);
  return `Multiple validation errors: ${messages.join('; ')}`;
}

// =============================================================================
// Image Input Validation
// =============================================================================

/**
 * Image input type enumeration
 */
export type ImageInputType = 'url' | 'base64' | 'file_path' | 'unknown';

/**
 * Determines the type of image input provided.
 *
 * @param input - The image input string to analyze
 * @returns The detected input type
 *
 * @example
 * detectImageInputType('https://example.com/image.png') // 'url'
 * detectImageInputType('data:image/png;base64,iVBOR...') // 'base64'
 * detectImageInputType('/path/to/image.png') // 'file_path'
 */
export function detectImageInputType(input: string): ImageInputType {
  // Check for URL
  if (isValidUrl(input)) {
    return 'url';
  }

  // Check for base64 data URL
  if (isBase64DataUrl(input)) {
    return 'base64';
  }

  // Check for file path (starts with / or ./ or C:\ etc.)
  if (isFilePath(input)) {
    return 'file_path';
  }

  return 'unknown';
}

/**
 * Validates that a string is a valid URL.
 */
export function isValidUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates that a string is a base64 data URL.
 */
export function isBase64DataUrl(input: string): boolean {
  return /^data:image\/(png|jpeg|jpg|webp);base64,/.test(input);
}

/**
 * Checks if a string looks like a file path.
 */
export function isFilePath(input: string): boolean {
  // Unix absolute path
  if (input.startsWith('/')) {
    return true;
  }

  // Unix relative path
  if (input.startsWith('./') || input.startsWith('../')) {
    return true;
  }

  // Windows absolute path (e.g., C:\)
  if (/^[a-zA-Z]:\\/.test(input)) {
    return true;
  }

  // Home directory expansion
  if (input.startsWith('~')) {
    return true;
  }

  return false;
}

/**
 * Extracts the MIME type from a base64 data URL.
 *
 * @param dataUrl - Base64 data URL
 * @returns MIME type or null if not a valid data URL
 */
export function extractMimeType(dataUrl: string): string | null {
  const match = /^data:(image\/[a-z]+);base64,/.exec(dataUrl);
  return match?.[1] ?? null;
}

/**
 * Validates the MIME type of an image.
 *
 * @param mimeType - MIME type to validate
 * @returns true if the MIME type is supported
 */
export function isValidImageMimeType(mimeType: string): boolean {
  const supported = VALIDATION.IMAGE.SUPPORTED_FORMATS as readonly string[];
  return supported.includes(mimeType);
}

/**
 * Estimates the file size of a base64 encoded image in bytes.
 *
 * @param base64Data - Base64 data (without the data URL prefix)
 * @returns Estimated file size in bytes
 */
export function estimateBase64Size(base64Data: string): number {
  // Remove data URL prefix if present
  const base64Only = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

  // Calculate the size: Base64 encodes 3 bytes in 4 characters
  // Account for padding
  const padding = (base64Only.match(/=+$/) ?? [''])[0].length;
  return Math.floor((base64Only.length * 3) / 4) - padding;
}

/**
 * Validates image size against the maximum allowed.
 *
 * @param sizeBytes - Size of the image in bytes
 * @returns Validation result
 */
export function validateImageSize(sizeBytes: number): ValidationResult<number> {
  if (sizeBytes <= 0) {
    return {
      success: false,
      errors: [
        {
          field: 'image',
          message: 'Image size must be greater than 0 bytes',
          code: 'invalid_image_size',
        },
      ],
    };
  }

  if (sizeBytes > VALIDATION.IMAGE.MAX_SIZE_BYTES) {
    const maxSizeMB = VALIDATION.IMAGE.MAX_SIZE_BYTES / (1024 * 1024);
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    return {
      success: false,
      errors: [
        {
          field: 'image',
          message: `Image size (${sizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
          code: 'image_too_large',
        },
      ],
    };
  }

  return {
    success: true,
    data: sizeBytes,
  };
}

// =============================================================================
// Aspect Ratio Validation
// =============================================================================

/**
 * Validates and normalizes an aspect ratio string.
 *
 * @param input - Aspect ratio string to validate (supports "x" or ":" separator)
 * @returns ValidationResult with normalized aspect ratio
 */
export function validateAspectRatio(input: string): ValidationResult<AspectRatio> {
  // Normalize: convert ":" separator to "x" separator
  const normalized = input.replace(':', 'x');

  if (isValidAspectRatio(normalized)) {
    return {
      success: true,
      data: normalized,
    };
  }

  return {
    success: false,
    errors: [
      {
        field: 'aspect_ratio',
        message: `Invalid aspect ratio "${input}". Supported ratios: ${ASPECT_RATIOS.join(', ')}`,
        code: 'invalid_aspect_ratio',
      },
    ],
  };
}

/**
 * Checks if a string is a valid aspect ratio.
 */
export function isValidAspectRatio(value: string): value is AspectRatio {
  return (ASPECT_RATIOS as readonly string[]).includes(value);
}

// =============================================================================
// Enum Validation Helpers
// =============================================================================

/**
 * Checks if a string is a valid rendering speed.
 */
export function isValidRenderingSpeed(value: string): value is RenderingSpeed {
  return (RENDERING_SPEEDS as readonly string[]).includes(value);
}

/**
 * Checks if a string is a valid magic prompt option.
 */
export function isValidMagicPrompt(value: string): value is MagicPrompt {
  return (MAGIC_PROMPT_OPTIONS as readonly string[]).includes(value);
}

/**
 * Checks if a string is a valid style type.
 */
export function isValidStyleType(value: string): value is StyleType {
  return (STYLE_TYPES as readonly string[]).includes(value);
}

// =============================================================================
// Prompt Validation
// =============================================================================

/**
 * Validates a prompt string.
 *
 * @param prompt - The prompt to validate
 * @returns ValidationResult with the validated prompt
 */
export function validatePrompt(prompt: string): ValidationResult<string> {
  const trimmed = prompt.trim();

  if (trimmed.length < VALIDATION.PROMPT.MIN_LENGTH) {
    return {
      success: false,
      errors: [
        {
          field: 'prompt',
          message: 'Prompt is required and cannot be empty',
          code: 'prompt_required',
        },
      ],
    };
  }

  if (trimmed.length > VALIDATION.PROMPT.MAX_LENGTH) {
    return {
      success: false,
      errors: [
        {
          field: 'prompt',
          message: `Prompt must be ${VALIDATION.PROMPT.MAX_LENGTH} characters or less (current: ${trimmed.length})`,
          code: 'prompt_too_long',
        },
      ],
    };
  }

  return {
    success: true,
    data: trimmed,
  };
}

// =============================================================================
// Numeric Validation
// =============================================================================

/**
 * Validates the number of images.
 *
 * @param numImages - Number of images to generate
 * @returns ValidationResult with the validated number
 */
export function validateNumImages(numImages: number): ValidationResult<number> {
  if (!Number.isInteger(numImages)) {
    return {
      success: false,
      errors: [
        {
          field: 'num_images',
          message: 'Number of images must be an integer',
          code: 'invalid_integer',
        },
      ],
    };
  }

  if (numImages < VALIDATION.NUM_IMAGES.MIN) {
    return {
      success: false,
      errors: [
        {
          field: 'num_images',
          message: `Must generate at least ${VALIDATION.NUM_IMAGES.MIN} image`,
          code: 'num_images_too_low',
        },
      ],
    };
  }

  if (numImages > VALIDATION.NUM_IMAGES.MAX) {
    return {
      success: false,
      errors: [
        {
          field: 'num_images',
          message: `Cannot generate more than ${VALIDATION.NUM_IMAGES.MAX} images`,
          code: 'num_images_too_high',
        },
      ],
    };
  }

  return {
    success: true,
    data: numImages,
  };
}

/**
 * Validates a seed value.
 *
 * @param seed - Seed value to validate
 * @returns ValidationResult with the validated seed
 */
export function validateSeed(seed: number): ValidationResult<number> {
  if (!Number.isInteger(seed)) {
    return {
      success: false,
      errors: [
        {
          field: 'seed',
          message: 'Seed must be an integer',
          code: 'invalid_integer',
        },
      ],
    };
  }

  if (seed < VALIDATION.SEED.MIN) {
    return {
      success: false,
      errors: [
        {
          field: 'seed',
          message: `Seed must be at least ${VALIDATION.SEED.MIN}`,
          code: 'seed_too_low',
        },
      ],
    };
  }

  if (seed > VALIDATION.SEED.MAX) {
    return {
      success: false,
      errors: [
        {
          field: 'seed',
          message: `Seed must be at most ${VALIDATION.SEED.MAX}`,
          code: 'seed_too_high',
        },
      ],
    };
  }

  return {
    success: true,
    data: seed,
  };
}

/**
 * Validates expand pixels for outpainting.
 *
 * @param pixels - Number of pixels to expand
 * @returns ValidationResult with the validated value
 */
export function validateExpandPixels(pixels: number): ValidationResult<number> {
  if (!Number.isInteger(pixels)) {
    return {
      success: false,
      errors: [
        {
          field: 'expand_pixels',
          message: 'Expand pixels must be an integer',
          code: 'invalid_integer',
        },
      ],
    };
  }

  if (pixels < VALIDATION.EXPAND_PIXELS.MIN) {
    return {
      success: false,
      errors: [
        {
          field: 'expand_pixels',
          message: `Expand pixels must be at least ${VALIDATION.EXPAND_PIXELS.MIN}`,
          code: 'expand_pixels_too_low',
        },
      ],
    };
  }

  if (pixels > VALIDATION.EXPAND_PIXELS.MAX) {
    return {
      success: false,
      errors: [
        {
          field: 'expand_pixels',
          message: `Expand pixels must be at most ${VALIDATION.EXPAND_PIXELS.MAX}`,
          code: 'expand_pixels_too_high',
        },
      ],
    };
  }

  return {
    success: true,
    data: pixels,
  };
}

// =============================================================================
// Prediction ID Validation
// =============================================================================

/**
 * Validates a prediction ID format.
 *
 * @param predictionId - The prediction ID to validate
 * @returns ValidationResult with the validated prediction ID
 */
export function validatePredictionId(predictionId: string): ValidationResult<string> {
  const trimmed = predictionId.trim();

  if (trimmed.length === 0) {
    return {
      success: false,
      errors: [
        {
          field: 'prediction_id',
          message: 'Prediction ID is required',
          code: 'prediction_id_required',
        },
      ],
    };
  }

  // Prediction IDs should be UUID-like or at least alphanumeric with dashes
  if (!/^[\w-]+$/.test(trimmed)) {
    return {
      success: false,
      errors: [
        {
          field: 'prediction_id',
          message: 'Invalid prediction ID format',
          code: 'invalid_prediction_id',
        },
      ],
    };
  }

  return {
    success: true,
    data: trimmed,
  };
}

// =============================================================================
// Type Guards for Validation Results
// =============================================================================

/**
 * Type guard to check if a validation result is successful.
 */
export function isValidationSuccess<T>(
  result: ValidationResult<T>
): result is ValidationSuccess<T> {
  return result.success === true;
}

/**
 * Type guard to check if a validation result is a failure.
 */
export function isValidationFailure<T>(result: ValidationResult<T>): result is ValidationFailure {
  return result.success === false;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Combines multiple validation results into a single result.
 * If all validations pass, returns success with all validated data.
 * If any validation fails, returns failure with all errors combined.
 *
 * @param results - Array of validation results to combine
 * @returns Combined validation result
 */
export function combineValidationResults<T extends Record<string, unknown>>(
  results: Array<{ key: string; result: ValidationResult<unknown> }>
): ValidationResult<T> {
  const errors: ValidationError[] = [];
  const data: Record<string, unknown> = {};

  for (const { key, result } of results) {
    if (isValidationSuccess(result)) {
      data[key] = result.data;
    } else if (isValidationFailure(result)) {
      errors.push(...result.errors);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: data as T,
  };
}

/**
 * Asserts that a value is not null or undefined.
 * Throws if the value is nullish.
 *
 * @param value - Value to check
 * @param message - Error message if value is nullish
 * @returns The value if not nullish
 */
export function assertDefined<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

/**
 * Sanitizes a string by trimming and removing control characters.
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  // Remove control characters except newlines and tabs
  // eslint-disable-next-line no-control-regex
  return input.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}
