/**
 * Unit Tests for Error Handler Utilities
 *
 * This file contains comprehensive unit tests for:
 * - src/utils/error.handler.ts - Error handling utilities
 *
 * Tests cover:
 * - IdeogramMCPError class
 * - Error factory functions
 * - Error conversion utilities
 * - Type guards
 * - Utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  IdeogramMCPError,
  createInvalidApiKeyError,
  createMissingApiKeyError,
  createRateLimitError,
  createInsufficientCreditsError,
  createValidationError,
  createInvalidPromptError,
  createInvalidAspectRatioError,
  createInvalidImageError,
  createInvalidMaskError,
  createImageTooLargeError,
  createNetworkError,
  createTimeoutError,
  createPredictionNotFoundError,
  createPredictionAlreadyCompletedError,
  createPredictionFailedError,
  createStorageError,
  createDownloadFailedError,
  createInternalError,
  createApiError,
  fromApiErrorResponse,
  fromAxiosError,
  wrapError,
  isIdeogramMCPError,
  isRetryableError,
  isRetryableStatusCode,
  hasErrorCode,
  extractRetryAfter,
} from '../../utils/error.handler.js';
import { ERROR_CODES, HTTP_STATUS } from '../../config/constants.js';

// =============================================================================
// IdeogramMCPError Class Tests
// =============================================================================

describe('IdeogramMCPError', () => {
  describe('constructor', () => {
    it('should create an error with all required properties', () => {
      const error = new IdeogramMCPError(
        'TEST_ERROR',
        'Technical message',
        'User message',
        400,
        false
      );

      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Technical message');
      expect(error.userMessage).toBe('User message');
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(false);
      expect(error.details).toBeUndefined();
    });

    it('should create an error with optional details', () => {
      const details = { field: 'prompt', value: 'test' };
      const error = new IdeogramMCPError(
        'TEST_ERROR',
        'Technical message',
        'User message',
        400,
        false,
        details
      );

      expect(error.details).toEqual(details);
    });

    it('should set name to IdeogramMCPError', () => {
      const error = new IdeogramMCPError('TEST_ERROR', 'message', 'user message', 400, false);

      expect(error.name).toBe('IdeogramMCPError');
    });

    it('should be instance of Error', () => {
      const error = new IdeogramMCPError('TEST_ERROR', 'message', 'user message', 400, false);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(IdeogramMCPError);
    });

    it('should have a stack trace', () => {
      const error = new IdeogramMCPError('TEST_ERROR', 'message', 'user message', 400, false);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('IdeogramMCPError');
    });
  });

  describe('toToolError', () => {
    it('should convert to ToolErrorOutput format', () => {
      const error = new IdeogramMCPError(
        'TEST_ERROR',
        'Technical message',
        'User message',
        400,
        true
      );

      const toolError = error.toToolError();

      expect(toolError).toEqual({
        success: false,
        error_code: 'TEST_ERROR',
        error: 'Technical message',
        user_message: 'User message',
        retryable: true,
      });
    });

    it('should include details when present', () => {
      const error = new IdeogramMCPError(
        'TEST_ERROR',
        'Technical message',
        'User message',
        400,
        false,
        { field: 'test' }
      );

      const toolError = error.toToolError();

      expect(toolError.details).toEqual({ field: 'test' });
    });

    it('should not include details when undefined', () => {
      const error = new IdeogramMCPError(
        'TEST_ERROR',
        'Technical message',
        'User message',
        400,
        false
      );

      const toolError = error.toToolError();

      expect('details' in toolError).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize all properties', () => {
      const error = new IdeogramMCPError(
        'TEST_ERROR',
        'Technical message',
        'User message',
        500,
        true,
        { extra: 'data' }
      );

      const json = error.toJSON();

      expect(json.name).toBe('IdeogramMCPError');
      expect(json.code).toBe('TEST_ERROR');
      expect(json.message).toBe('Technical message');
      expect(json.userMessage).toBe('User message');
      expect(json.statusCode).toBe(500);
      expect(json.retryable).toBe(true);
      expect(json.details).toEqual({ extra: 'data' });
      expect(json.stack).toBeDefined();
    });
  });
});

// =============================================================================
// Error Factory Functions Tests
// =============================================================================

describe('Error Factory Functions', () => {
  describe('createInvalidApiKeyError', () => {
    it('should create error with correct properties', () => {
      const error = createInvalidApiKeyError();

      expect(error.code).toBe(ERROR_CODES.INVALID_API_KEY);
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(error.retryable).toBe(false);
      expect(error.userMessage).toContain('API key');
    });

    it('should include details when provided', () => {
      const error = createInvalidApiKeyError({ reason: 'expired' });

      expect(error.details).toEqual({ reason: 'expired' });
    });
  });

  describe('createMissingApiKeyError', () => {
    it('should create error with correct properties', () => {
      const error = createMissingApiKeyError();

      expect(error.code).toBe(ERROR_CODES.MISSING_API_KEY);
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(error.retryable).toBe(false);
      expect(error.userMessage).toContain('IDEOGRAM_API_KEY');
    });
  });

  describe('createRateLimitError', () => {
    it('should create error without retry seconds', () => {
      const error = createRateLimitError();

      expect(error.code).toBe(ERROR_CODES.RATE_LIMITED);
      expect(error.statusCode).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
      expect(error.retryable).toBe(true);
      expect(error.userMessage).toContain('wait');
    });

    it('should include retry seconds in message when provided', () => {
      const error = createRateLimitError(30);

      expect(error.message).toContain('30');
      expect(error.userMessage).toContain('30 seconds');
      expect(error.details).toEqual({ retry_after_seconds: 30 });
    });
  });

  describe('createInsufficientCreditsError', () => {
    it('should create error without credit details', () => {
      const error = createInsufficientCreditsError();

      expect(error.code).toBe(ERROR_CODES.INSUFFICIENT_CREDITS);
      expect(error.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
      expect(error.retryable).toBe(false);
    });

    it('should include credit details when provided', () => {
      const error = createInsufficientCreditsError(10, 5);

      expect(error.details).toEqual({
        required_credits: 10,
        available_credits: 5,
      });
    });
  });

  describe('createValidationError', () => {
    it('should create error with field and reason', () => {
      const error = createValidationError('prompt', 'is too short');

      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('prompt');
      expect(error.message).toContain('is too short');
      expect(error.details).toEqual({ field: 'prompt' });
    });

    it('should merge additional details', () => {
      const error = createValidationError('num_images', 'too high', { max: 8 });

      expect(error.details).toEqual({ field: 'num_images', max: 8 });
    });
  });

  describe('createInvalidPromptError', () => {
    it('should create error with reason', () => {
      const error = createInvalidPromptError('cannot be empty');

      expect(error.code).toBe(ERROR_CODES.INVALID_PROMPT);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.message).toContain('cannot be empty');
      expect(error.details).toEqual({ field: 'prompt' });
    });
  });

  describe('createInvalidAspectRatioError', () => {
    it('should create error with provided ratio', () => {
      const error = createInvalidAspectRatioError('17:9');

      expect(error.code).toBe(ERROR_CODES.INVALID_ASPECT_RATIO);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.message).toContain('17:9');
      expect(error.userMessage).toContain('17:9');
      expect(error.userMessage).toContain('1x1');
      expect(error.details).toEqual({ field: 'aspect_ratio', provided: '17:9' });
    });
  });

  describe('createInvalidImageError', () => {
    it('should create error with reason', () => {
      const error = createInvalidImageError('unsupported format');

      expect(error.code).toBe(ERROR_CODES.INVALID_IMAGE);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.message).toContain('unsupported format');
      expect(error.details).toEqual({ field: 'image' });
    });
  });

  describe('createInvalidMaskError', () => {
    it('should create error with reason', () => {
      const error = createInvalidMaskError('must be black and white');

      expect(error.code).toBe(ERROR_CODES.INVALID_MASK);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.message).toContain('must be black and white');
      expect(error.details).toEqual({ field: 'mask' });
    });
  });

  describe('createImageTooLargeError', () => {
    it('should create error with size info', () => {
      const error = createImageTooLargeError(15 * 1024 * 1024, 10 * 1024 * 1024);

      expect(error.code).toBe(ERROR_CODES.IMAGE_TOO_LARGE);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.message).toContain('15.00MB');
      expect(error.message).toContain('10MB');
      expect(error.details).toEqual({
        size_bytes: 15 * 1024 * 1024,
        max_size_bytes: 10 * 1024 * 1024,
      });
    });
  });

  describe('createNetworkError', () => {
    it('should create error with reason', () => {
      const error = createNetworkError('connection refused');

      expect(error.code).toBe(ERROR_CODES.NETWORK_ERROR);
      expect(error.statusCode).toBe(0);
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('connection refused');
    });

    it('should include original error when provided', () => {
      const originalError = new Error('ECONNREFUSED');
      const error = createNetworkError('connection refused', originalError);

      expect(error.details).toEqual({ original_error: 'ECONNREFUSED' });
    });
  });

  describe('createTimeoutError', () => {
    it('should create error with timeout value', () => {
      const error = createTimeoutError(30000);

      expect(error.code).toBe(ERROR_CODES.TIMEOUT);
      expect(error.statusCode).toBe(0);
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('30000ms');
      expect(error.details).toEqual({ timeout_ms: 30000 });
    });
  });

  describe('createPredictionNotFoundError', () => {
    it('should create error with prediction ID', () => {
      const error = createPredictionNotFoundError('pred_123');

      expect(error.code).toBe(ERROR_CODES.PREDICTION_NOT_FOUND);
      expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('pred_123');
      expect(error.details).toEqual({ prediction_id: 'pred_123' });
    });
  });

  describe('createPredictionAlreadyCompletedError', () => {
    it('should create error with prediction ID', () => {
      const error = createPredictionAlreadyCompletedError('pred_456');

      expect(error.code).toBe(ERROR_CODES.PREDICTION_ALREADY_COMPLETED);
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('pred_456');
      expect(error.details).toEqual({ prediction_id: 'pred_456' });
    });
  });

  describe('createPredictionFailedError', () => {
    it('should create error with prediction ID and reason', () => {
      const error = createPredictionFailedError('pred_789', 'API timeout');

      expect(error.code).toBe(ERROR_CODES.PREDICTION_FAILED);
      expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('API timeout');
      expect(error.details).toEqual({ prediction_id: 'pred_789' });
    });
  });

  describe('createStorageError', () => {
    it('should create error with operation and reason', () => {
      const error = createStorageError('save', 'disk full');

      expect(error.code).toBe(ERROR_CODES.STORAGE_ERROR);
      expect(error.statusCode).toBe(0);
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('save');
      expect(error.message).toContain('disk full');
      expect(error.details).toEqual({ operation: 'save' });
    });
  });

  describe('createDownloadFailedError', () => {
    it('should create error with URL and reason', () => {
      const error = createDownloadFailedError('https://example.com/image.png', '404');

      expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
      expect(error.statusCode).toBe(0);
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('https://example.com/image.png');
      expect(error.message).toContain('404');
      expect(error.details).toEqual({ url: 'https://example.com/image.png' });
    });
  });

  describe('createInternalError', () => {
    it('should create error with reason', () => {
      const error = createInternalError('unexpected null value');

      expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('unexpected null value');
    });

    it('should include details when provided', () => {
      const error = createInternalError('error', { context: 'processing' });

      expect(error.details).toEqual({ context: 'processing' });
    });
  });

  describe('createApiError', () => {
    it('should create error for retryable status codes', () => {
      const error = createApiError(503, 'Service unavailable');

      expect(error.code).toBe(ERROR_CODES.API_ERROR);
      expect(error.statusCode).toBe(503);
      expect(error.retryable).toBe(true);
    });

    it('should create error for non-retryable status codes', () => {
      const error = createApiError(400, 'Bad request');

      expect(error.code).toBe(ERROR_CODES.API_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(false);
    });

    it('should include details when provided', () => {
      const error = createApiError(500, 'Internal error', { requestId: '123' });

      expect(error.details).toEqual({ requestId: '123' });
    });
  });
});

// =============================================================================
// Error Conversion Utilities Tests
// =============================================================================

describe('Error Conversion Utilities', () => {
  describe('fromApiErrorResponse', () => {
    it('should convert 401 to invalid API key error', () => {
      const error = fromApiErrorResponse(401, { message: 'Unauthorized' });

      expect(error.code).toBe(ERROR_CODES.INVALID_API_KEY);
      expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    it('should convert 429 to rate limit error', () => {
      const error = fromApiErrorResponse(429, { message: 'Too many requests' });

      expect(error.code).toBe(ERROR_CODES.RATE_LIMITED);
      expect(error.statusCode).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
    });

    it('should convert 403 with credit message to insufficient credits error', () => {
      const error = fromApiErrorResponse(403, { message: 'Insufficient credits' });

      expect(error.code).toBe(ERROR_CODES.INSUFFICIENT_CREDITS);
    });

    it('should convert 403 with balance message to insufficient credits error', () => {
      const error = fromApiErrorResponse(403, { message: 'Low balance' });

      expect(error.code).toBe(ERROR_CODES.INSUFFICIENT_CREDITS);
    });

    it('should convert other status codes to generic API error', () => {
      const error = fromApiErrorResponse(500, { message: 'Server error' });

      expect(error.code).toBe(ERROR_CODES.API_ERROR);
      expect(error.statusCode).toBe(500);
    });

    it('should preserve error details', () => {
      const error = fromApiErrorResponse(401, {
        message: 'Unauthorized',
        details: { reason: 'expired' },
      });

      expect(error.details).toEqual({ reason: 'expired' });
    });
  });

  describe('fromAxiosError', () => {
    it('should convert timeout error', () => {
      const axiosError = {
        message: 'timeout of 30000ms exceeded',
        code: 'ECONNABORTED',
      };

      const error = fromAxiosError(axiosError);

      expect(error.code).toBe(ERROR_CODES.TIMEOUT);
    });

    it('should convert ETIMEDOUT error', () => {
      const axiosError = {
        message: 'connect ETIMEDOUT',
        code: 'ETIMEDOUT',
      };

      const error = fromAxiosError(axiosError);

      expect(error.code).toBe(ERROR_CODES.TIMEOUT);
    });

    it('should convert network error without response', () => {
      const axiosError = {
        message: 'Network Error',
      };

      const error = fromAxiosError(axiosError);

      expect(error.code).toBe(ERROR_CODES.NETWORK_ERROR);
    });

    it('should convert response with structured error data', () => {
      const axiosError = {
        message: 'Request failed',
        response: {
          status: 401,
          data: { message: 'Invalid API key' },
        },
      };

      const error = fromAxiosError(axiosError);

      expect(error.code).toBe(ERROR_CODES.INVALID_API_KEY);
    });

    it('should convert response with string error data', () => {
      const axiosError = {
        message: 'Request failed',
        response: {
          status: 500,
          data: 'Internal Server Error',
        },
      };

      const error = fromAxiosError(axiosError);

      expect(error.code).toBe(ERROR_CODES.API_ERROR);
      expect(error.statusCode).toBe(500);
    });

    it('should fallback to generic error for unknown response format', () => {
      const axiosError = {
        message: 'Unknown error',
        response: {
          status: 418,
          data: null,
        },
      };

      const error = fromAxiosError(axiosError);

      expect(error.code).toBe(ERROR_CODES.API_ERROR);
      expect(error.statusCode).toBe(418);
    });
  });

  describe('wrapError', () => {
    it('should return IdeogramMCPError as-is', () => {
      const original = new IdeogramMCPError('TEST', 'message', 'user message', 400, false);

      const wrapped = wrapError(original);

      expect(wrapped).toBe(original);
    });

    it('should wrap standard Error', () => {
      const original = new Error('Something went wrong');

      const wrapped = wrapError(original);

      expect(wrapped.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(wrapped.message).toContain('Something went wrong');
      expect(wrapped.details).toEqual({ original_error: 'Error' });
    });

    it('should wrap string error', () => {
      const wrapped = wrapError('String error message');

      expect(wrapped.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(wrapped.message).toContain('String error message');
    });

    it('should wrap unknown error types', () => {
      const wrapped = wrapError({ unexpected: 'object' });

      expect(wrapped.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(wrapped.message).toContain('unknown error');
    });

    it('should wrap null', () => {
      const wrapped = wrapError(null);

      expect(wrapped.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    });

    it('should wrap undefined', () => {
      const wrapped = wrapError(undefined);

      expect(wrapped.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    });
  });
});

// =============================================================================
// Type Guards Tests
// =============================================================================

describe('Type Guards', () => {
  describe('isIdeogramMCPError', () => {
    it('should return true for IdeogramMCPError', () => {
      const error = new IdeogramMCPError('TEST', 'msg', 'user msg', 400, false);

      expect(isIdeogramMCPError(error)).toBe(true);
    });

    it('should return false for standard Error', () => {
      const error = new Error('Standard error');

      expect(isIdeogramMCPError(error)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isIdeogramMCPError({ code: 'TEST' })).toBe(false);
      expect(isIdeogramMCPError(null)).toBe(false);
      expect(isIdeogramMCPError(undefined)).toBe(false);
      expect(isIdeogramMCPError('string')).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for retryable IdeogramMCPError', () => {
      const error = new IdeogramMCPError('TEST', 'msg', 'user msg', 503, true);

      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable IdeogramMCPError', () => {
      const error = new IdeogramMCPError('TEST', 'msg', 'user msg', 400, false);

      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for standard Error', () => {
      const error = new Error('Standard error');

      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError('error')).toBe(false);
    });
  });

  describe('isRetryableStatusCode', () => {
    it('should return true for 429', () => {
      expect(isRetryableStatusCode(429)).toBe(true);
    });

    it('should return true for 500', () => {
      expect(isRetryableStatusCode(500)).toBe(true);
    });

    it('should return true for 503', () => {
      expect(isRetryableStatusCode(503)).toBe(true);
    });

    it('should return false for 400', () => {
      expect(isRetryableStatusCode(400)).toBe(false);
    });

    it('should return false for 401', () => {
      expect(isRetryableStatusCode(401)).toBe(false);
    });

    it('should return false for 404', () => {
      expect(isRetryableStatusCode(404)).toBe(false);
    });
  });

  describe('hasErrorCode', () => {
    it('should return true when error has matching code', () => {
      const error = new IdeogramMCPError(ERROR_CODES.RATE_LIMITED, 'msg', 'user msg', 429, true);

      expect(hasErrorCode(error, ERROR_CODES.RATE_LIMITED)).toBe(true);
    });

    it('should return false when error has different code', () => {
      const error = new IdeogramMCPError(ERROR_CODES.RATE_LIMITED, 'msg', 'user msg', 429, true);

      expect(hasErrorCode(error, ERROR_CODES.INVALID_API_KEY)).toBe(false);
    });

    it('should return false for non-IdeogramMCPError', () => {
      const error = new Error('Standard error');

      expect(hasErrorCode(error, ERROR_CODES.INTERNAL_ERROR)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(hasErrorCode(null, ERROR_CODES.INTERNAL_ERROR)).toBe(false);
      expect(hasErrorCode('string', ERROR_CODES.INTERNAL_ERROR)).toBe(false);
    });
  });
});

// =============================================================================
// Utility Functions Tests
// =============================================================================

describe('Utility Functions', () => {
  describe('extractRetryAfter', () => {
    it('should return undefined for undefined headers', () => {
      expect(extractRetryAfter(undefined)).toBeUndefined();
    });

    it('should return undefined when retry-after header is missing', () => {
      expect(extractRetryAfter({})).toBeUndefined();
    });

    it('should parse integer seconds (lowercase header)', () => {
      expect(extractRetryAfter({ 'retry-after': '30' })).toBe(30);
    });

    it('should parse integer seconds (mixed case header)', () => {
      expect(extractRetryAfter({ 'Retry-After': '60' })).toBe(60);
    });

    it('should parse HTTP date format', () => {
      const futureDate = new Date(Date.now() + 120000); // 2 minutes from now
      const headers = { 'retry-after': futureDate.toUTCString() };

      const result = extractRetryAfter(headers);

      // Should be approximately 120 seconds (allow some variance)
      expect(result).toBeDefined();
      expect(result).toBeGreaterThanOrEqual(115);
      expect(result).toBeLessThanOrEqual(125);
    });

    it('should return 0 for past HTTP date', () => {
      const pastDate = new Date(Date.now() - 60000); // 1 minute ago
      const headers = { 'retry-after': pastDate.toUTCString() };

      expect(extractRetryAfter(headers)).toBe(0);
    });

    it('should return undefined for invalid value', () => {
      expect(extractRetryAfter({ 'retry-after': 'invalid' })).toBeUndefined();
    });
  });
});
