/**
 * Error Handling Utilities
 *
 * Provides enterprise-grade error handling for the Ideogram MCP Server including:
 * - IdeogramMCPError class with user-friendly messages
 * - Error factory functions for common error types
 * - API error conversion utilities
 * - Error type guards
 */

import {
  ERROR_CODES,
  HTTP_STATUS,
  RETRYABLE_STATUS_CODES,
  type ErrorCode,
} from '../config/constants.js';
import type { ToolErrorOutput } from '../types/tool.types.js';
import type { ApiErrorResponse } from '../types/api.types.js';

// =============================================================================
// IdeogramMCPError Class
// =============================================================================

/**
 * Custom error class for the Ideogram MCP Server.
 *
 * Includes both technical error information for debugging and user-friendly
 * messages suitable for display to end users.
 *
 * @example
 * throw new IdeogramMCPError(
 *   'RATE_LIMITED',
 *   'API rate limit exceeded: 429',
 *   'Too many requests. Please wait a moment and try again.',
 *   429,
 *   true
 * );
 */
export class IdeogramMCPError extends Error {
  /**
   * The error name for stack traces
   */
  public override readonly name = 'IdeogramMCPError';

  /**
   * Creates a new IdeogramMCPError instance.
   *
   * @param code - Error code for programmatic handling
   * @param message - Technical error message for debugging
   * @param userMessage - User-friendly message suitable for display
   * @param statusCode - HTTP status code (or 0 for non-HTTP errors)
   * @param retryable - Whether the operation can be safely retried
   * @param details - Additional error context for debugging
   */
  constructor(
    public readonly code: ErrorCode | string,
    message: string,
    public readonly userMessage: string,
    public readonly statusCode: number,
    public readonly retryable: boolean,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);

    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, IdeogramMCPError.prototype);

    // Capture stack trace (V8 engines only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IdeogramMCPError);
    }
  }

  /**
   * Converts the error to a ToolErrorOutput format for MCP tool responses.
   */
  toToolError(): ToolErrorOutput {
    const base = {
      success: false as const,
      error_code: this.code,
      error: this.message,
      user_message: this.userMessage,
      retryable: this.retryable,
    };

    // Only include details if defined (for exactOptionalPropertyTypes)
    if (this.details !== undefined) {
      return { ...base, details: this.details };
    }
    return base;
  }

  /**
   * Creates a JSON-serializable representation of the error.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      statusCode: this.statusCode,
      retryable: this.retryable,
      details: this.details,
      stack: this.stack,
    };
  }
}

// =============================================================================
// Error Factory Functions
// =============================================================================

/**
 * Creates an error for invalid or missing API key.
 */
export function createInvalidApiKeyError(details?: Record<string, unknown>): IdeogramMCPError {
  return new IdeogramMCPError(
    ERROR_CODES.INVALID_API_KEY,
    'Invalid or missing Ideogram API key',
    'Your API key is invalid or has been revoked. Please check your IDEOGRAM_API_KEY environment variable and ensure it is a valid API key from https://ideogram.ai/manage-api',
    HTTP_STATUS.UNAUTHORIZED,
    false,
    details
  );
}

/**
 * Creates an error for missing API key configuration.
 */
export function createMissingApiKeyError(): IdeogramMCPError {
  return new IdeogramMCPError(
    ERROR_CODES.MISSING_API_KEY,
    'Ideogram API key not configured',
    'No API key found. Please set the IDEOGRAM_API_KEY environment variable with your API key from https://ideogram.ai/manage-api',
    HTTP_STATUS.UNAUTHORIZED,
    false
  );
}

/**
 * Creates an error for rate limiting.
 *
 * @param retryAfterSeconds - Seconds until rate limit resets (if known)
 */
export function createRateLimitError(retryAfterSeconds?: number): IdeogramMCPError {
  const retryMessage = retryAfterSeconds
    ? ` Please wait ${retryAfterSeconds} seconds before retrying.`
    : ' Please wait a moment and try again.';

  return new IdeogramMCPError(
    ERROR_CODES.RATE_LIMITED,
    `Rate limit exceeded${retryAfterSeconds ? ` (retry after ${retryAfterSeconds}s)` : ''}`,
    `Too many requests.${retryMessage}`,
    HTTP_STATUS.TOO_MANY_REQUESTS,
    true,
    retryAfterSeconds ? { retry_after_seconds: retryAfterSeconds } : undefined
  );
}

/**
 * Creates an error for insufficient credits.
 */
export function createInsufficientCreditsError(
  requiredCredits?: number,
  availableCredits?: number
): IdeogramMCPError {
  const details: Record<string, unknown> = {};
  if (requiredCredits !== undefined) {
    details['required_credits'] = requiredCredits;
  }
  if (availableCredits !== undefined) {
    details['available_credits'] = availableCredits;
  }

  return new IdeogramMCPError(
    ERROR_CODES.INSUFFICIENT_CREDITS,
    'Insufficient credits to complete the request',
    'You do not have enough credits to complete this request. Please purchase more credits at https://ideogram.ai',
    HTTP_STATUS.FORBIDDEN,
    false,
    Object.keys(details).length > 0 ? details : undefined
  );
}

/**
 * Creates an error for validation failures.
 *
 * @param field - The field that failed validation
 * @param reason - Reason for the validation failure
 */
export function createValidationError(
  field: string,
  reason: string,
  details?: Record<string, unknown>
): IdeogramMCPError {
  return new IdeogramMCPError(
    ERROR_CODES.VALIDATION_ERROR,
    `Validation failed for '${field}': ${reason}`,
    `Invalid input: ${reason}`,
    HTTP_STATUS.BAD_REQUEST,
    false,
    { field, ...details }
  );
}

/**
 * Creates an error for invalid prompt.
 */
export function createInvalidPromptError(reason: string): IdeogramMCPError {
  return new IdeogramMCPError(
    ERROR_CODES.INVALID_PROMPT,
    `Invalid prompt: ${reason}`,
    `Please check your prompt: ${reason}`,
    HTTP_STATUS.BAD_REQUEST,
    false,
    { field: 'prompt' }
  );
}

/**
 * Creates an error for invalid aspect ratio.
 */
export function createInvalidAspectRatioError(provided: string): IdeogramMCPError {
  return new IdeogramMCPError(
    ERROR_CODES.INVALID_ASPECT_RATIO,
    `Invalid aspect ratio: ${provided}`,
    `The aspect ratio "${provided}" is not supported. Please use one of: 1x1, 16x9, 9x16, 4x3, 3x4, 3x2, 2x3, 4x5, 5x4, 1x2, 2x1, 1x3, 3x1, 10x16, 16x10`,
    HTTP_STATUS.BAD_REQUEST,
    false,
    { field: 'aspect_ratio', provided }
  );
}

/**
 * Creates an error for invalid image input.
 */
export function createInvalidImageError(reason: string): IdeogramMCPError {
  return new IdeogramMCPError(
    ERROR_CODES.INVALID_IMAGE,
    `Invalid image: ${reason}`,
    `There was a problem with the provided image: ${reason}`,
    HTTP_STATUS.BAD_REQUEST,
    false,
    { field: 'image' }
  );
}

/**
 * Creates an error for invalid mask input.
 */
export function createInvalidMaskError(reason: string): IdeogramMCPError {
  return new IdeogramMCPError(
    ERROR_CODES.INVALID_MASK,
    `Invalid mask: ${reason}`,
    `There was a problem with the provided mask image: ${reason}`,
    HTTP_STATUS.BAD_REQUEST,
    false,
    { field: 'mask' }
  );
}

/**
 * Creates an error for image file size exceeding limit.
 */
export function createImageTooLargeError(
  sizeBytes: number,
  maxSizeBytes: number
): IdeogramMCPError {
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
  const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);

  return new IdeogramMCPError(
    ERROR_CODES.IMAGE_TOO_LARGE,
    `Image size ${sizeMB}MB exceeds maximum ${maxSizeMB}MB`,
    `The image is too large (${sizeMB}MB). Maximum allowed size is ${maxSizeMB}MB.`,
    HTTP_STATUS.BAD_REQUEST,
    false,
    { size_bytes: sizeBytes, max_size_bytes: maxSizeBytes }
  );
}

/**
 * Creates an error for network failures.
 */
export function createNetworkError(reason: string, originalError?: Error): IdeogramMCPError {
  return new IdeogramMCPError(
    ERROR_CODES.NETWORK_ERROR,
    `Network error: ${reason}`,
    'A network error occurred. Please check your internet connection and try again.',
    0,
    true,
    originalError ? { original_error: originalError.message } : undefined
  );
}

/**
 * Creates an error for request timeout.
 */
export function createTimeoutError(timeoutMs: number): IdeogramMCPError {
  return new IdeogramMCPError(
    ERROR_CODES.TIMEOUT,
    `Request timed out after ${timeoutMs}ms`,
    'The request took too long to complete. Please try again.',
    0,
    true,
    { timeout_ms: timeoutMs }
  );
}

/**
 * Creates an error for prediction not found.
 */
export function createPredictionNotFoundError(predictionId: string): IdeogramMCPError {
  return new IdeogramMCPError(
    ERROR_CODES.PREDICTION_NOT_FOUND,
    `Prediction not found: ${predictionId}`,
    'The requested prediction was not found. It may have expired or never existed.',
    HTTP_STATUS.NOT_FOUND,
    false,
    { prediction_id: predictionId }
  );
}

/**
 * Creates an error when trying to cancel an already completed prediction.
 */
export function createPredictionAlreadyCompletedError(predictionId: string): IdeogramMCPError {
  return new IdeogramMCPError(
    ERROR_CODES.PREDICTION_ALREADY_COMPLETED,
    `Prediction already completed: ${predictionId}`,
    'This prediction has already completed and cannot be cancelled.',
    HTTP_STATUS.BAD_REQUEST,
    false,
    { prediction_id: predictionId }
  );
}

/**
 * Creates an error for prediction failure.
 */
export function createPredictionFailedError(
  predictionId: string,
  reason: string
): IdeogramMCPError {
  return new IdeogramMCPError(
    ERROR_CODES.PREDICTION_FAILED,
    `Prediction failed: ${reason}`,
    `Image generation failed: ${reason}`,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    true,
    { prediction_id: predictionId }
  );
}

/**
 * Creates an error for storage operations.
 */
export function createStorageError(operation: string, reason: string): IdeogramMCPError {
  return new IdeogramMCPError(
    ERROR_CODES.STORAGE_ERROR,
    `Storage error during ${operation}: ${reason}`,
    `Failed to save image: ${reason}`,
    0,
    true,
    { operation }
  );
}

/**
 * Creates an error for failed image downloads.
 */
export function createDownloadFailedError(url: string, reason: string): IdeogramMCPError {
  return new IdeogramMCPError(
    ERROR_CODES.DOWNLOAD_FAILED,
    `Failed to download image from ${url}: ${reason}`,
    'Failed to download the generated image. The URL may have expired.',
    0,
    true,
    { url }
  );
}

/**
 * Creates an internal server error.
 */
export function createInternalError(
  reason: string,
  details?: Record<string, unknown>
): IdeogramMCPError {
  return new IdeogramMCPError(
    ERROR_CODES.INTERNAL_ERROR,
    `Internal error: ${reason}`,
    'An unexpected error occurred. Please try again.',
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    true,
    details
  );
}

/**
 * Creates a generic API error from HTTP response details.
 */
export function createApiError(
  statusCode: number,
  message: string,
  details?: Record<string, unknown>
): IdeogramMCPError {
  const retryable = RETRYABLE_STATUS_CODES.includes(statusCode);

  return new IdeogramMCPError(
    ERROR_CODES.API_ERROR,
    `API error (${statusCode}): ${message}`,
    getApiErrorUserMessage(statusCode, message),
    statusCode,
    retryable,
    details
  );
}

// =============================================================================
// Error Conversion Utilities
// =============================================================================

/**
 * Converts an Ideogram API error response to an IdeogramMCPError.
 */
export function fromApiErrorResponse(
  statusCode: number,
  response: ApiErrorResponse
): IdeogramMCPError {
  // Handle specific error codes from the API
  if (statusCode === HTTP_STATUS.UNAUTHORIZED) {
    return createInvalidApiKeyError(response.details);
  }

  if (statusCode === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return createRateLimitError();
  }

  if (statusCode === HTTP_STATUS.FORBIDDEN) {
    // Could be insufficient credits or other access issues
    if (
      response.message.toLowerCase().includes('credit') ||
      response.message.toLowerCase().includes('balance')
    ) {
      return createInsufficientCreditsError();
    }
  }

  // Generic API error for other cases
  return createApiError(statusCode, response.message, response.details);
}

/**
 * Converts an Axios-like error to an IdeogramMCPError.
 */
export function fromAxiosError(error: {
  response?: {
    status: number;
    data?: ApiErrorResponse | string;
  };
  code?: string;
  message: string;
}): IdeogramMCPError {
  // No response - network error
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return createTimeoutError(30000); // Default timeout
    }
    return createNetworkError(error.message);
  }

  const { status, data } = error.response;

  // If we have structured error data
  if (data && typeof data === 'object' && 'message' in data) {
    return fromApiErrorResponse(status, data);
  }

  // Fallback to generic API error
  const message = typeof data === 'string' ? data : error.message;
  return createApiError(status, message);
}

/**
 * Wraps any unknown error into an IdeogramMCPError.
 */
export function wrapError(error: unknown): IdeogramMCPError {
  // Already an IdeogramMCPError
  if (error instanceof IdeogramMCPError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    return createInternalError(error.message, { original_error: error.name });
  }

  // String error
  if (typeof error === 'string') {
    return createInternalError(error);
  }

  // Unknown error type
  return createInternalError('An unknown error occurred');
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if an error is an IdeogramMCPError.
 */
export function isIdeogramMCPError(error: unknown): error is IdeogramMCPError {
  return error instanceof IdeogramMCPError;
}

/**
 * Type guard to check if an error is retryable.
 */
export function isRetryableError(error: unknown): boolean {
  if (isIdeogramMCPError(error)) {
    return error.retryable;
  }
  return false;
}

/**
 * Checks if an HTTP status code indicates a retryable error.
 */
export function isRetryableStatusCode(statusCode: number): boolean {
  return RETRYABLE_STATUS_CODES.includes(statusCode);
}

/**
 * Checks if an error code matches a specific error type.
 */
export function hasErrorCode(error: unknown, code: ErrorCode | string): boolean {
  if (isIdeogramMCPError(error)) {
    return error.code === code;
  }
  return false;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Gets a user-friendly error message based on HTTP status code.
 */
function getApiErrorUserMessage(statusCode: number, apiMessage: string): string {
  switch (statusCode) {
    case HTTP_STATUS.BAD_REQUEST:
      return `Invalid request: ${apiMessage}`;
    case HTTP_STATUS.UNAUTHORIZED:
      return 'Authentication failed. Please check your API key.';
    case HTTP_STATUS.FORBIDDEN:
      return 'Access denied. You may not have permission for this operation.';
    case HTTP_STATUS.NOT_FOUND:
      return 'The requested resource was not found.';
    case HTTP_STATUS.TOO_MANY_REQUESTS:
      return 'Too many requests. Please wait before trying again.';
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      return 'The Ideogram API encountered an error. Please try again.';
    case HTTP_STATUS.SERVICE_UNAVAILABLE:
      return 'The Ideogram API is temporarily unavailable. Please try again later.';
    default:
      return `An error occurred: ${apiMessage}`;
  }
}

/**
 * Extracts retry-after seconds from error headers or response.
 */
export function extractRetryAfter(headers?: Record<string, string>): number | undefined {
  if (!headers) return undefined;

  const retryAfter = headers['retry-after'] || headers['Retry-After'];
  if (!retryAfter) return undefined;

  // Try parsing as seconds
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) return seconds;

  // Try parsing as HTTP date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    const nowMs = Date.now();
    const retryMs = date.getTime();
    return Math.max(0, Math.ceil((retryMs - nowMs) / 1000));
  }

  return undefined;
}
