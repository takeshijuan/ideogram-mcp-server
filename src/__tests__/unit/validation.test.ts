/**
 * Unit Tests for Validation Utilities
 *
 * This file contains comprehensive unit tests for:
 * - src/utils/validation.ts - Input validation helpers
 *
 * Tests cover:
 * - Safe Zod schema validation
 * - Image input validation
 * - Aspect ratio validation
 * - Enum validation helpers
 * - Prompt validation
 * - Numeric validation (num_images, seed, expand_pixels)
 * - Prediction ID validation
 * - Type guards
 * - Utility functions
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  safeValidate,
  validateOrThrow,
  formatZodErrors,
  formatValidationErrorMessage,
  detectImageInputType,
  isValidUrl,
  isBase64DataUrl,
  isFilePath,
  extractMimeType,
  isValidImageMimeType,
  estimateBase64Size,
  validateImageSize,
  validateAspectRatio,
  isValidAspectRatio,
  isValidRenderingSpeed,
  isValidMagicPrompt,
  isValidStyleType,
  isValidEditMode,
  isValidOutpaintDirection,
  validatePrompt,
  validateNumImages,
  validateSeed,
  validateExpandPixels,
  validatePredictionId,
  isValidationSuccess,
  isValidationFailure,
  combineValidationResults,
  assertDefined,
  sanitizeString,
  type ValidationResult,
} from '../../utils/validation.js';
import { VALIDATION } from '../../config/constants.js';

// =============================================================================
// Safe Zod Validation Tests
// =============================================================================

describe('Safe Zod Validation', () => {
  const TestSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
    email: z.string().email().optional(),
  });

  describe('safeValidate', () => {
    it('should return success with valid data', () => {
      const result = safeValidate(TestSchema, { name: 'John', age: 25 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John');
        expect(result.data.age).toBe(25);
      }
    });

    it('should return success with optional fields', () => {
      const result = safeValidate(TestSchema, {
        name: 'John',
        age: 25,
        email: 'john@example.com',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('john@example.com');
      }
    });

    it('should return failure with invalid data', () => {
      const result = safeValidate(TestSchema, { name: '', age: -5 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should return failure with missing required fields', () => {
      const result = safeValidate(TestSchema, { name: 'John' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.field === 'age')).toBe(true);
      }
    });

    it('should return failure with wrong types', () => {
      const result = safeValidate(TestSchema, { name: 123, age: 'twenty' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBe(2);
      }
    });
  });

  describe('validateOrThrow', () => {
    it('should return validated data for valid input', () => {
      const data = validateOrThrow(TestSchema, { name: 'John', age: 25 });

      expect(data.name).toBe('John');
      expect(data.age).toBe(25);
    });

    it('should throw ZodError for invalid input', () => {
      expect(() => validateOrThrow(TestSchema, { name: '', age: -5 })).toThrow();
    });
  });

  describe('formatZodErrors', () => {
    it('should format Zod errors into ValidationError array', () => {
      const result = TestSchema.safeParse({ name: '', age: 'invalid' });

      if (!result.success) {
        const errors = formatZodErrors(result.error);

        expect(Array.isArray(errors)).toBe(true);
        expect(errors.length).toBeGreaterThan(0);
        errors.forEach((err) => {
          expect(err).toHaveProperty('field');
          expect(err).toHaveProperty('message');
          expect(err).toHaveProperty('code');
        });
      }
    });

    it('should use "input" for root-level errors', () => {
      const StringSchema = z.string();
      const result = StringSchema.safeParse(123);

      if (!result.success) {
        const errors = formatZodErrors(result.error);

        expect(errors[0]?.field).toBe('input');
      }
    });
  });

  describe('formatValidationErrorMessage', () => {
    it('should return default message for empty array', () => {
      const message = formatValidationErrorMessage([]);

      expect(message).toBe('Validation failed');
    });

    it('should format single error', () => {
      const message = formatValidationErrorMessage([
        { field: 'name', message: 'is required', code: 'required' },
      ]);

      expect(message).toBe('name: is required');
    });

    it('should format multiple errors', () => {
      const message = formatValidationErrorMessage([
        { field: 'name', message: 'is required', code: 'required' },
        { field: 'age', message: 'must be positive', code: 'too_small' },
      ]);

      expect(message).toContain('Multiple validation errors');
      expect(message).toContain('name: is required');
      expect(message).toContain('age: must be positive');
    });
  });
});

// =============================================================================
// Image Input Validation Tests
// =============================================================================

describe('Image Input Validation', () => {
  describe('detectImageInputType', () => {
    it('should detect http URL', () => {
      expect(detectImageInputType('http://example.com/image.png')).toBe('url');
    });

    it('should detect https URL', () => {
      expect(detectImageInputType('https://example.com/image.png')).toBe('url');
    });

    it('should detect base64 data URL (png)', () => {
      expect(detectImageInputType('data:image/png;base64,iVBORw0KGgo=')).toBe('base64');
    });

    it('should detect base64 data URL (jpeg)', () => {
      expect(detectImageInputType('data:image/jpeg;base64,/9j/4AAQ=')).toBe('base64');
    });

    it('should detect base64 data URL (webp)', () => {
      expect(detectImageInputType('data:image/webp;base64,UklGRh4=')).toBe('base64');
    });

    it('should detect Unix absolute path', () => {
      expect(detectImageInputType('/home/user/image.png')).toBe('file_path');
    });

    it('should detect Unix relative path (.)', () => {
      expect(detectImageInputType('./images/test.png')).toBe('file_path');
    });

    it('should detect Unix relative path (..)', () => {
      expect(detectImageInputType('../images/test.png')).toBe('file_path');
    });

    it('should detect Windows absolute path', () => {
      expect(detectImageInputType('C:\\Users\\image.png')).toBe('file_path');
    });

    it('should detect home directory path', () => {
      expect(detectImageInputType('~/images/test.png')).toBe('file_path');
    });

    it('should return unknown for unrecognized input', () => {
      expect(detectImageInputType('just-a-string')).toBe('unknown');
      expect(detectImageInputType('ftp://example.com/image.png')).toBe('unknown');
    });
  });

  describe('isValidUrl', () => {
    it('should return true for http URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('http://example.com/path')).toBe(true);
    });

    it('should return true for https URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://api.ideogram.ai/image.png')).toBe(true);
    });

    it('should return false for non-http protocols', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('file:///path/to/file')).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('isBase64DataUrl', () => {
    it('should return true for valid PNG data URL', () => {
      expect(isBase64DataUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    });

    it('should return true for valid JPEG data URL', () => {
      expect(isBase64DataUrl('data:image/jpeg;base64,/9j/4AAQ=')).toBe(true);
    });

    it('should return true for valid JPG data URL', () => {
      expect(isBase64DataUrl('data:image/jpg;base64,/9j/4AAQ=')).toBe(true);
    });

    it('should return true for valid WebP data URL', () => {
      expect(isBase64DataUrl('data:image/webp;base64,UklGRh4=')).toBe(true);
    });

    it('should return false for non-image data URLs', () => {
      expect(isBase64DataUrl('data:text/plain;base64,SGVsbG8=')).toBe(false);
      expect(isBase64DataUrl('data:application/json;base64,e30=')).toBe(false);
    });

    it('should return false for non-data URLs', () => {
      expect(isBase64DataUrl('https://example.com/image.png')).toBe(false);
      expect(isBase64DataUrl('/path/to/image.png')).toBe(false);
    });
  });

  describe('isFilePath', () => {
    it('should return true for Unix absolute paths', () => {
      expect(isFilePath('/home/user/file.txt')).toBe(true);
      expect(isFilePath('/var/log/app.log')).toBe(true);
    });

    it('should return true for Unix relative paths', () => {
      expect(isFilePath('./file.txt')).toBe(true);
      expect(isFilePath('../file.txt')).toBe(true);
    });

    it('should return true for Windows paths', () => {
      expect(isFilePath('C:\\')).toBe(true);
      expect(isFilePath('D:\\Users\\file.txt')).toBe(true);
    });

    it('should return true for home directory paths', () => {
      expect(isFilePath('~')).toBe(true);
      expect(isFilePath('~/Documents')).toBe(true);
    });

    it('should return false for non-paths', () => {
      expect(isFilePath('just-a-string')).toBe(false);
      expect(isFilePath('https://example.com')).toBe(false);
    });
  });

  describe('extractMimeType', () => {
    it('should extract PNG MIME type', () => {
      expect(extractMimeType('data:image/png;base64,iVBORw0KGgo=')).toBe('image/png');
    });

    it('should extract JPEG MIME type', () => {
      expect(extractMimeType('data:image/jpeg;base64,/9j/4AAQ=')).toBe('image/jpeg');
    });

    it('should extract WebP MIME type', () => {
      expect(extractMimeType('data:image/webp;base64,UklGRh4=')).toBe('image/webp');
    });

    it('should return null for non-data URLs', () => {
      expect(extractMimeType('https://example.com/image.png')).toBeNull();
      expect(extractMimeType('/path/to/image.png')).toBeNull();
    });
  });

  describe('isValidImageMimeType', () => {
    it('should return true for supported MIME types', () => {
      expect(isValidImageMimeType('image/png')).toBe(true);
      expect(isValidImageMimeType('image/jpeg')).toBe(true);
      expect(isValidImageMimeType('image/webp')).toBe(true);
    });

    it('should return false for unsupported MIME types', () => {
      expect(isValidImageMimeType('image/gif')).toBe(false);
      expect(isValidImageMimeType('image/bmp')).toBe(false);
      expect(isValidImageMimeType('text/plain')).toBe(false);
    });
  });

  describe('estimateBase64Size', () => {
    it('should estimate size without data URL prefix', () => {
      // 4 base64 characters = 3 bytes
      const size = estimateBase64Size('AAAA');
      expect(size).toBe(3);
    });

    it('should handle data URL prefix', () => {
      const size = estimateBase64Size('data:image/png;base64,AAAA');
      expect(size).toBe(3);
    });

    it('should handle padding correctly', () => {
      // 'AA==' is 2 padding chars, represents 1 byte
      const size = estimateBase64Size('AA==');
      expect(size).toBe(1);

      // 'AAA=' is 1 padding char, represents 2 bytes
      const size2 = estimateBase64Size('AAA=');
      expect(size2).toBe(2);
    });
  });

  describe('validateImageSize', () => {
    it('should return success for valid size', () => {
      const result = validateImageSize(1024 * 1024); // 1MB

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1024 * 1024);
      }
    });

    it('should return failure for zero size', () => {
      const result = validateImageSize(0);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('invalid_image_size');
      }
    });

    it('should return failure for negative size', () => {
      const result = validateImageSize(-100);

      expect(result.success).toBe(false);
    });

    it('should return failure for size exceeding maximum', () => {
      const result = validateImageSize(VALIDATION.IMAGE.MAX_SIZE_BYTES + 1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('image_too_large');
        expect(result.errors[0]?.message).toContain('MB');
      }
    });
  });
});

// =============================================================================
// Aspect Ratio Validation Tests
// =============================================================================

describe('Aspect Ratio Validation', () => {
  describe('validateAspectRatio', () => {
    it('should accept valid aspect ratios with x separator', () => {
      const validRatios = [
        '1x1', '16x9', '9x16', '4x3', '3x4', '3x2', '2x3',
        '4x5', '5x4', '1x2', '2x1', '1x3', '3x1', '10x16', '16x10',
      ];

      validRatios.forEach((ratio) => {
        const result = validateAspectRatio(ratio);
        expect(result.success).toBe(true);
      });
    });

    it('should normalize colon separator to x', () => {
      const result = validateAspectRatio('16:9');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('16x9');
      }
    });

    it('should reject invalid aspect ratios', () => {
      const invalidRatios = ['17x9', '1x0', 'invalid', '16', ''];

      invalidRatios.forEach((ratio) => {
        const result = validateAspectRatio(ratio);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors[0]?.code).toBe('invalid_aspect_ratio');
        }
      });
    });
  });

  describe('isValidAspectRatio', () => {
    it('should return true for valid ratios', () => {
      expect(isValidAspectRatio('1x1')).toBe(true);
      expect(isValidAspectRatio('16x9')).toBe(true);
    });

    it('should return false for invalid ratios', () => {
      expect(isValidAspectRatio('17x9')).toBe(false);
      expect(isValidAspectRatio('16:9')).toBe(false);
    });
  });
});

// =============================================================================
// Enum Validation Helpers Tests
// =============================================================================

describe('Enum Validation Helpers', () => {
  describe('isValidRenderingSpeed', () => {
    it('should return true for valid speeds', () => {
      expect(isValidRenderingSpeed('FLASH')).toBe(true);
      expect(isValidRenderingSpeed('TURBO')).toBe(true);
      expect(isValidRenderingSpeed('DEFAULT')).toBe(true);
      expect(isValidRenderingSpeed('QUALITY')).toBe(true);
    });

    it('should return false for invalid speeds', () => {
      expect(isValidRenderingSpeed('flash')).toBe(false);
      expect(isValidRenderingSpeed('FAST')).toBe(false);
      expect(isValidRenderingSpeed('')).toBe(false);
    });
  });

  describe('isValidMagicPrompt', () => {
    it('should return true for valid options', () => {
      expect(isValidMagicPrompt('AUTO')).toBe(true);
      expect(isValidMagicPrompt('ON')).toBe(true);
      expect(isValidMagicPrompt('OFF')).toBe(true);
    });

    it('should return false for invalid options', () => {
      expect(isValidMagicPrompt('auto')).toBe(false);
      expect(isValidMagicPrompt('YES')).toBe(false);
    });
  });

  describe('isValidStyleType', () => {
    it('should return true for valid styles', () => {
      expect(isValidStyleType('AUTO')).toBe(true);
      expect(isValidStyleType('GENERAL')).toBe(true);
      expect(isValidStyleType('REALISTIC')).toBe(true);
      expect(isValidStyleType('DESIGN')).toBe(true);
      expect(isValidStyleType('FICTION')).toBe(true);
    });

    it('should return false for invalid styles', () => {
      expect(isValidStyleType('auto')).toBe(false);
      expect(isValidStyleType('ARTISTIC')).toBe(false);
    });
  });

  describe('isValidEditMode', () => {
    it('should return true for valid modes', () => {
      expect(isValidEditMode('inpaint')).toBe(true);
      expect(isValidEditMode('outpaint')).toBe(true);
    });

    it('should return false for invalid modes', () => {
      expect(isValidEditMode('INPAINT')).toBe(false);
      expect(isValidEditMode('edit')).toBe(false);
    });
  });

  describe('isValidOutpaintDirection', () => {
    it('should return true for valid directions', () => {
      expect(isValidOutpaintDirection('left')).toBe(true);
      expect(isValidOutpaintDirection('right')).toBe(true);
      expect(isValidOutpaintDirection('up')).toBe(true);
      expect(isValidOutpaintDirection('down')).toBe(true);
    });

    it('should return false for invalid directions', () => {
      expect(isValidOutpaintDirection('LEFT')).toBe(false);
      expect(isValidOutpaintDirection('center')).toBe(false);
    });
  });
});

// =============================================================================
// Prompt Validation Tests
// =============================================================================

describe('Prompt Validation', () => {
  describe('validatePrompt', () => {
    it('should accept valid prompt', () => {
      const result = validatePrompt('A beautiful sunset over the ocean');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('A beautiful sunset over the ocean');
      }
    });

    it('should trim whitespace', () => {
      const result = validatePrompt('  trimmed prompt  ');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('trimmed prompt');
      }
    });

    it('should reject empty prompt', () => {
      const result = validatePrompt('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('prompt_required');
      }
    });

    it('should reject whitespace-only prompt', () => {
      const result = validatePrompt('   ');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('prompt_required');
      }
    });

    it('should reject prompt exceeding max length', () => {
      const longPrompt = 'a'.repeat(VALIDATION.PROMPT.MAX_LENGTH + 1);
      const result = validatePrompt(longPrompt);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('prompt_too_long');
      }
    });

    it('should accept prompt at max length', () => {
      const maxPrompt = 'a'.repeat(VALIDATION.PROMPT.MAX_LENGTH);
      const result = validatePrompt(maxPrompt);

      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// Numeric Validation Tests
// =============================================================================

describe('Numeric Validation', () => {
  describe('validateNumImages', () => {
    it('should accept valid number of images', () => {
      for (let i = VALIDATION.NUM_IMAGES.MIN; i <= VALIDATION.NUM_IMAGES.MAX; i++) {
        const result = validateNumImages(i);
        expect(result.success).toBe(true);
      }
    });

    it('should reject non-integer values', () => {
      const result = validateNumImages(1.5);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('invalid_integer');
      }
    });

    it('should reject values below minimum', () => {
      const result = validateNumImages(VALIDATION.NUM_IMAGES.MIN - 1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('num_images_too_low');
      }
    });

    it('should reject values above maximum', () => {
      const result = validateNumImages(VALIDATION.NUM_IMAGES.MAX + 1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('num_images_too_high');
      }
    });
  });

  describe('validateSeed', () => {
    it('should accept valid seed values', () => {
      expect(validateSeed(0).success).toBe(true);
      expect(validateSeed(12345).success).toBe(true);
      expect(validateSeed(VALIDATION.SEED.MAX).success).toBe(true);
    });

    it('should reject non-integer values', () => {
      const result = validateSeed(123.45);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('invalid_integer');
      }
    });

    it('should reject negative values', () => {
      const result = validateSeed(-1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('seed_too_low');
      }
    });

    it('should reject values above maximum', () => {
      const result = validateSeed(VALIDATION.SEED.MAX + 1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('seed_too_high');
      }
    });
  });

  describe('validateExpandPixels', () => {
    it('should accept valid pixel values', () => {
      expect(validateExpandPixels(1).success).toBe(true);
      expect(validateExpandPixels(100).success).toBe(true);
      expect(validateExpandPixels(VALIDATION.EXPAND_PIXELS.MAX).success).toBe(true);
    });

    it('should reject non-integer values', () => {
      const result = validateExpandPixels(100.5);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('invalid_integer');
      }
    });

    it('should reject values below minimum', () => {
      const result = validateExpandPixels(0);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('expand_pixels_too_low');
      }
    });

    it('should reject values above maximum', () => {
      const result = validateExpandPixels(VALIDATION.EXPAND_PIXELS.MAX + 1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('expand_pixels_too_high');
      }
    });
  });
});

// =============================================================================
// Prediction ID Validation Tests
// =============================================================================

describe('Prediction ID Validation', () => {
  describe('validatePredictionId', () => {
    it('should accept valid prediction IDs', () => {
      expect(validatePredictionId('pred_123').success).toBe(true);
      expect(validatePredictionId('abc-def-123').success).toBe(true);
      expect(validatePredictionId('UUID_like_id').success).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = validatePredictionId('  pred_123  ');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('pred_123');
      }
    });

    it('should reject empty prediction ID', () => {
      const result = validatePredictionId('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('prediction_id_required');
      }
    });

    it('should reject whitespace-only prediction ID', () => {
      const result = validatePredictionId('   ');

      expect(result.success).toBe(false);
    });

    it('should reject prediction IDs with special characters', () => {
      const result = validatePredictionId('pred@123!');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('invalid_prediction_id');
      }
    });
  });
});

// =============================================================================
// Type Guards Tests
// =============================================================================

describe('Type Guards', () => {
  describe('isValidationSuccess', () => {
    it('should return true for success result', () => {
      const result: ValidationResult<string> = { success: true, data: 'test' };

      expect(isValidationSuccess(result)).toBe(true);
    });

    it('should return false for failure result', () => {
      const result: ValidationResult<string> = {
        success: false,
        errors: [{ field: 'test', message: 'error', code: 'test' }],
      };

      expect(isValidationSuccess(result)).toBe(false);
    });
  });

  describe('isValidationFailure', () => {
    it('should return true for failure result', () => {
      const result: ValidationResult<string> = {
        success: false,
        errors: [{ field: 'test', message: 'error', code: 'test' }],
      };

      expect(isValidationFailure(result)).toBe(true);
    });

    it('should return false for success result', () => {
      const result: ValidationResult<string> = { success: true, data: 'test' };

      expect(isValidationFailure(result)).toBe(false);
    });
  });
});

// =============================================================================
// Utility Functions Tests
// =============================================================================

describe('Utility Functions', () => {
  describe('combineValidationResults', () => {
    it('should combine all successful results', () => {
      const results = [
        { key: 'name', result: { success: true as const, data: 'John' } },
        { key: 'age', result: { success: true as const, data: 25 } },
      ];

      const combined = combineValidationResults<{ name: string; age: number }>(results);

      expect(combined.success).toBe(true);
      if (combined.success) {
        expect(combined.data.name).toBe('John');
        expect(combined.data.age).toBe(25);
      }
    });

    it('should return all errors when any validation fails', () => {
      const results = [
        { key: 'name', result: { success: true as const, data: 'John' } },
        {
          key: 'age',
          result: {
            success: false as const,
            errors: [{ field: 'age', message: 'invalid', code: 'invalid' }],
          },
        },
      ];

      const combined = combineValidationResults(results);

      expect(combined.success).toBe(false);
      if (!combined.success) {
        expect(combined.errors.length).toBe(1);
      }
    });

    it('should aggregate errors from multiple failures', () => {
      const results = [
        {
          key: 'name',
          result: {
            success: false as const,
            errors: [{ field: 'name', message: 'required', code: 'required' }],
          },
        },
        {
          key: 'age',
          result: {
            success: false as const,
            errors: [{ field: 'age', message: 'invalid', code: 'invalid' }],
          },
        },
      ];

      const combined = combineValidationResults(results);

      expect(combined.success).toBe(false);
      if (!combined.success) {
        expect(combined.errors.length).toBe(2);
      }
    });
  });

  describe('assertDefined', () => {
    it('should return value when defined', () => {
      expect(assertDefined('value', 'error')).toBe('value');
      expect(assertDefined(0, 'error')).toBe(0);
      expect(assertDefined(false, 'error')).toBe(false);
      expect(assertDefined('', 'error')).toBe('');
    });

    it('should throw for null', () => {
      expect(() => assertDefined(null, 'value is null')).toThrow('value is null');
    });

    it('should throw for undefined', () => {
      expect(() => assertDefined(undefined, 'value is undefined')).toThrow(
        'value is undefined'
      );
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove control characters', () => {
      expect(sanitizeString('hello\x00world')).toBe('helloworld');
      expect(sanitizeString('\x01test\x1F')).toBe('test');
    });

    it('should preserve newlines and tabs', () => {
      expect(sanitizeString('hello\nworld')).toBe('hello\nworld');
      expect(sanitizeString('hello\tworld')).toBe('hello\tworld');
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle string with only control characters', () => {
      expect(sanitizeString('\x00\x01\x02')).toBe('');
    });
  });
});
