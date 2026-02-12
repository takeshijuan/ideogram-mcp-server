/**
 * Unit Tests for Config and Constants
 *
 * This file contains comprehensive unit tests for:
 * - src/config/constants.ts - API constants, enums, validation constraints
 * - src/config/config.ts - Configuration loading, validation, and utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// =============================================================================
// Constants Tests
// =============================================================================

describe('Constants', () => {
  describe('API Configuration', () => {
    it('should export correct API_BASE_URL', async () => {
      const { API_BASE_URL } = await import('../../config/constants.js');
      expect(API_BASE_URL).toBe('https://api.ideogram.ai');
    });

    it('should export correct API_ENDPOINTS', async () => {
      const { API_ENDPOINTS } = await import('../../config/constants.js');
      expect(API_ENDPOINTS.GENERATE_V3).toBe('/v1/ideogram-v3/generate');
      expect(API_ENDPOINTS.EDIT_V3).toBe('/v1/ideogram-v3/edit');
      expect(API_ENDPOINTS.GENERATE_LEGACY).toBe('/generate');
    });

    it('should export correct API_KEY_HEADER', async () => {
      const { API_KEY_HEADER } = await import('../../config/constants.js');
      expect(API_KEY_HEADER).toBe('Api-Key');
    });
  });

  describe('Enum Value Arrays', () => {
    it('should export all 15 supported aspect ratios with x separator', async () => {
      const { ASPECT_RATIOS } = await import('../../config/constants.js');
      expect(ASPECT_RATIOS).toHaveLength(15);
      expect(ASPECT_RATIOS).toContain('1x1');
      expect(ASPECT_RATIOS).toContain('16x9');
      expect(ASPECT_RATIOS).toContain('9x16');
      expect(ASPECT_RATIOS).toContain('4x3');
      expect(ASPECT_RATIOS).toContain('3x4');
      expect(ASPECT_RATIOS).toContain('3x2');
      expect(ASPECT_RATIOS).toContain('2x3');
      expect(ASPECT_RATIOS).toContain('4x5');
      expect(ASPECT_RATIOS).toContain('5x4');
      expect(ASPECT_RATIOS).toContain('1x2');
      expect(ASPECT_RATIOS).toContain('2x1');
      expect(ASPECT_RATIOS).toContain('1x3');
      expect(ASPECT_RATIOS).toContain('3x1');
      expect(ASPECT_RATIOS).toContain('10x16');
      expect(ASPECT_RATIOS).toContain('16x10');
      // Should use "x" separator, not ":"
      ASPECT_RATIOS.forEach((ratio) => {
        expect(ratio).not.toContain(':');
        expect(ratio).toContain('x');
      });
    });

    it('should export rendering speeds in order from fastest to slowest', async () => {
      const { RENDERING_SPEEDS } = await import('../../config/constants.js');
      expect(RENDERING_SPEEDS).toEqual(['FLASH', 'TURBO', 'DEFAULT', 'QUALITY']);
    });

    it('should export magic prompt options', async () => {
      const { MAGIC_PROMPT_OPTIONS } = await import('../../config/constants.js');
      expect(MAGIC_PROMPT_OPTIONS).toEqual(['AUTO', 'ON', 'OFF']);
    });

    it('should export style types', async () => {
      const { STYLE_TYPES } = await import('../../config/constants.js');
      expect(STYLE_TYPES).toEqual(['AUTO', 'GENERAL', 'REALISTIC', 'DESIGN', 'FICTION']);
    });

    it('should export model versions', async () => {
      const { MODELS } = await import('../../config/constants.js');
      expect(MODELS).toEqual(['V_2', 'V_2_TURBO']);
    });

    it('should export prediction statuses', async () => {
      const { PREDICTION_STATUSES } = await import('../../config/constants.js');
      expect(PREDICTION_STATUSES).toEqual([
        'queued',
        'processing',
        'completed',
        'failed',
        'cancelled',
      ]);
    });

    it('should export edit modes', async () => {
      const { EDIT_MODES } = await import('../../config/constants.js');
      expect(EDIT_MODES).toEqual(['inpaint', 'outpaint']);
    });

    it('should export outpaint directions', async () => {
      const { OUTPAINT_DIRECTIONS } = await import('../../config/constants.js');
      expect(OUTPAINT_DIRECTIONS).toEqual(['left', 'right', 'up', 'down']);
    });
  });

  describe('Default Values', () => {
    it('should export correct default values', async () => {
      const { DEFAULTS } = await import('../../config/constants.js');
      expect(DEFAULTS.ASPECT_RATIO).toBe('1x1');
      expect(DEFAULTS.NUM_IMAGES).toBe(1);
      expect(DEFAULTS.RENDERING_SPEED).toBe('DEFAULT');
      expect(DEFAULTS.MAGIC_PROMPT).toBe('AUTO');
      expect(DEFAULTS.STYLE_TYPE).toBe('AUTO');
      expect(DEFAULTS.SAVE_LOCALLY).toBe(true);
      expect(DEFAULTS.EDIT_MODE).toBe('inpaint');
      expect(DEFAULTS.EXPAND_PIXELS).toBe(100);
    });
  });

  describe('Validation Constraints', () => {
    it('should export prompt validation constraints', async () => {
      const { VALIDATION } = await import('../../config/constants.js');
      expect(VALIDATION.PROMPT.MIN_LENGTH).toBe(1);
      expect(VALIDATION.PROMPT.MAX_LENGTH).toBe(10000);
    });

    it('should export num_images validation constraints', async () => {
      const { VALIDATION } = await import('../../config/constants.js');
      expect(VALIDATION.NUM_IMAGES.MIN).toBe(1);
      expect(VALIDATION.NUM_IMAGES.MAX).toBe(8);
    });

    it('should export seed validation constraints', async () => {
      const { VALIDATION } = await import('../../config/constants.js');
      expect(VALIDATION.SEED.MIN).toBe(0);
      expect(VALIDATION.SEED.MAX).toBe(2147483647);
    });

    it('should export expand_pixels validation constraints', async () => {
      const { VALIDATION } = await import('../../config/constants.js');
      expect(VALIDATION.EXPAND_PIXELS.MIN).toBe(1);
      expect(VALIDATION.EXPAND_PIXELS.MAX).toBe(1024);
    });

    it('should export image file validation constraints', async () => {
      const { VALIDATION } = await import('../../config/constants.js');
      expect(VALIDATION.IMAGE.MAX_SIZE_BYTES).toBe(10 * 1024 * 1024); // 10MB
      expect(VALIDATION.IMAGE.SUPPORTED_FORMATS).toContain('image/png');
      expect(VALIDATION.IMAGE.SUPPORTED_FORMATS).toContain('image/jpeg');
      expect(VALIDATION.IMAGE.SUPPORTED_FORMATS).toContain('image/webp');
    });
  });

  describe('Cost Estimation', () => {
    it('should export credits per image by rendering speed', async () => {
      const { CREDITS_PER_IMAGE } = await import('../../config/constants.js');
      expect(CREDITS_PER_IMAGE.FLASH).toBe(0.04);
      expect(CREDITS_PER_IMAGE.TURBO).toBe(0.08);
      expect(CREDITS_PER_IMAGE.DEFAULT).toBe(0.1);
      expect(CREDITS_PER_IMAGE.QUALITY).toBe(0.2);
    });

    it('should have increasing credits for higher quality', async () => {
      const { CREDITS_PER_IMAGE } = await import('../../config/constants.js');
      expect(CREDITS_PER_IMAGE.FLASH).toBeLessThan(CREDITS_PER_IMAGE.TURBO);
      expect(CREDITS_PER_IMAGE.TURBO).toBeLessThan(CREDITS_PER_IMAGE.DEFAULT);
      expect(CREDITS_PER_IMAGE.DEFAULT).toBeLessThan(CREDITS_PER_IMAGE.QUALITY);
    });

    it('should export edit credits per image by rendering speed', async () => {
      const { EDIT_CREDITS_PER_IMAGE } = await import('../../config/constants.js');
      expect(EDIT_CREDITS_PER_IMAGE.FLASH).toBe(0.06);
      expect(EDIT_CREDITS_PER_IMAGE.TURBO).toBe(0.1);
      expect(EDIT_CREDITS_PER_IMAGE.DEFAULT).toBe(0.12);
      expect(EDIT_CREDITS_PER_IMAGE.QUALITY).toBe(0.24);
    });

    it('should have edit credits higher than generate credits', async () => {
      const { CREDITS_PER_IMAGE, EDIT_CREDITS_PER_IMAGE } =
        await import('../../config/constants.js');
      expect(EDIT_CREDITS_PER_IMAGE.FLASH).toBeGreaterThan(CREDITS_PER_IMAGE.FLASH);
      expect(EDIT_CREDITS_PER_IMAGE.TURBO).toBeGreaterThan(CREDITS_PER_IMAGE.TURBO);
      expect(EDIT_CREDITS_PER_IMAGE.DEFAULT).toBeGreaterThan(CREDITS_PER_IMAGE.DEFAULT);
      expect(EDIT_CREDITS_PER_IMAGE.QUALITY).toBeGreaterThan(CREDITS_PER_IMAGE.QUALITY);
    });

    it('should export USD per credit', async () => {
      const { USD_PER_CREDIT } = await import('../../config/constants.js');
      expect(USD_PER_CREDIT).toBe(0.05);
    });
  });

  describe('HTTP Status Codes', () => {
    it('should export HTTP status codes', async () => {
      const { HTTP_STATUS } = await import('../../config/constants.js');
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
      expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
    });

    it('should export retryable status codes', async () => {
      const { RETRYABLE_STATUS_CODES, HTTP_STATUS } = await import('../../config/constants.js');
      expect(RETRYABLE_STATUS_CODES).toContain(HTTP_STATUS.TOO_MANY_REQUESTS);
      expect(RETRYABLE_STATUS_CODES).toContain(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(RETRYABLE_STATUS_CODES).toContain(HTTP_STATUS.SERVICE_UNAVAILABLE);
      expect(RETRYABLE_STATUS_CODES).not.toContain(HTTP_STATUS.BAD_REQUEST);
      expect(RETRYABLE_STATUS_CODES).not.toContain(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  describe('Retry Configuration', () => {
    it('should export retry configuration', async () => {
      const { RETRY_CONFIG } = await import('../../config/constants.js');
      expect(RETRY_CONFIG.MAX_ATTEMPTS).toBe(3);
      expect(RETRY_CONFIG.INITIAL_DELAY_MS).toBe(1000);
      expect(RETRY_CONFIG.MAX_DELAY_MS).toBe(10000);
      expect(RETRY_CONFIG.BACKOFF_MULTIPLIER).toBe(2);
    });

    it('should have sensible retry configuration', async () => {
      const { RETRY_CONFIG } = await import('../../config/constants.js');
      expect(RETRY_CONFIG.MAX_ATTEMPTS).toBeGreaterThan(0);
      expect(RETRY_CONFIG.INITIAL_DELAY_MS).toBeGreaterThan(0);
      expect(RETRY_CONFIG.MAX_DELAY_MS).toBeGreaterThan(RETRY_CONFIG.INITIAL_DELAY_MS);
      expect(RETRY_CONFIG.BACKOFF_MULTIPLIER).toBeGreaterThan(1);
    });
  });

  describe('Timeouts', () => {
    it('should export timeout configuration', async () => {
      const { TIMEOUTS } = await import('../../config/constants.js');
      expect(TIMEOUTS.DEFAULT_REQUEST_MS).toBe(30000);
      expect(TIMEOUTS.LONG_REQUEST_MS).toBe(120000);
      expect(TIMEOUTS.IMAGE_DOWNLOAD_MS).toBe(60000);
    });

    it('should have increasing timeout values', async () => {
      const { TIMEOUTS } = await import('../../config/constants.js');
      expect(TIMEOUTS.DEFAULT_REQUEST_MS).toBeLessThan(TIMEOUTS.LONG_REQUEST_MS);
    });
  });

  describe('Server Information', () => {
    it('should export server info', async () => {
      const { SERVER_INFO } = await import('../../config/constants.js');
      expect(SERVER_INFO.NAME).toBe('ideogram-mcp-server');
      expect(SERVER_INFO.VERSION).toBe('1.0.0');
      expect(SERVER_INFO.DESCRIPTION).toBeTruthy();
    });
  });

  describe('Prediction Queue Configuration', () => {
    it('should export prediction queue configuration', async () => {
      const { PREDICTION_QUEUE } = await import('../../config/constants.js');
      expect(PREDICTION_QUEUE.MAX_QUEUE_SIZE).toBe(100);
      expect(PREDICTION_QUEUE.PREDICTION_TIMEOUT_MS).toBe(300000);
      expect(PREDICTION_QUEUE.CLEANUP_AGE_MS).toBe(24 * 60 * 60 * 1000); // 24 hours
    });
  });

  describe('Error Codes', () => {
    it('should export authentication error codes', async () => {
      const { ERROR_CODES } = await import('../../config/constants.js');
      expect(ERROR_CODES.INVALID_API_KEY).toBe('INVALID_API_KEY');
      expect(ERROR_CODES.MISSING_API_KEY).toBe('MISSING_API_KEY');
    });

    it('should export validation error codes', async () => {
      const { ERROR_CODES } = await import('../../config/constants.js');
      expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ERROR_CODES.INVALID_PROMPT).toBe('INVALID_PROMPT');
      expect(ERROR_CODES.INVALID_ASPECT_RATIO).toBe('INVALID_ASPECT_RATIO');
      expect(ERROR_CODES.INVALID_IMAGE).toBe('INVALID_IMAGE');
      expect(ERROR_CODES.INVALID_MASK).toBe('INVALID_MASK');
      expect(ERROR_CODES.IMAGE_TOO_LARGE).toBe('IMAGE_TOO_LARGE');
    });

    it('should export API error codes', async () => {
      const { ERROR_CODES } = await import('../../config/constants.js');
      expect(ERROR_CODES.API_ERROR).toBe('API_ERROR');
      expect(ERROR_CODES.RATE_LIMITED).toBe('RATE_LIMITED');
      expect(ERROR_CODES.INSUFFICIENT_CREDITS).toBe('INSUFFICIENT_CREDITS');
    });

    it('should export network error codes', async () => {
      const { ERROR_CODES } = await import('../../config/constants.js');
      expect(ERROR_CODES.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ERROR_CODES.TIMEOUT).toBe('TIMEOUT');
    });

    it('should export prediction error codes', async () => {
      const { ERROR_CODES } = await import('../../config/constants.js');
      expect(ERROR_CODES.PREDICTION_NOT_FOUND).toBe('PREDICTION_NOT_FOUND');
      expect(ERROR_CODES.PREDICTION_ALREADY_COMPLETED).toBe('PREDICTION_ALREADY_COMPLETED');
      expect(ERROR_CODES.PREDICTION_FAILED).toBe('PREDICTION_FAILED');
    });

    it('should export storage error codes', async () => {
      const { ERROR_CODES } = await import('../../config/constants.js');
      expect(ERROR_CODES.STORAGE_ERROR).toBe('STORAGE_ERROR');
      expect(ERROR_CODES.DOWNLOAD_FAILED).toBe('DOWNLOAD_FAILED');
    });

    it('should export general error codes', async () => {
      const { ERROR_CODES } = await import('../../config/constants.js');
      expect(ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ERROR_CODES.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    });
  });
});

// =============================================================================
// Config Tests
// =============================================================================

describe('Config', () => {
  // Save original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to allow re-import with new env
    vi.resetModules();
    // Clone the environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.resetModules();
  });

  describe('LOG_LEVELS', () => {
    it('should export log levels', async () => {
      const { LOG_LEVELS } = await import('../../config/config.js');
      expect(LOG_LEVELS).toEqual(['debug', 'info', 'warn', 'error']);
    });
  });

  describe('createConfig', () => {
    it('should create config with required API key', async () => {
      const { createConfig } = await import('../../config/config.js');
      const config = createConfig({ ideogramApiKey: 'test-key-12345' });
      expect(config.ideogramApiKey).toBe('test-key-12345');
    });

    it('should apply default values when not specified', async () => {
      // Reset env vars to ensure defaults are used (not test setup values)
      delete process.env['LOG_LEVEL'];
      delete process.env['LOCAL_SAVE_DIR'];
      delete process.env['ENABLE_LOCAL_SAVE'];
      delete process.env['MAX_CONCURRENT_REQUESTS'];
      delete process.env['REQUEST_TIMEOUT_MS'];
      vi.resetModules();

      const { createConfig } = await import('../../config/config.js');
      const config = createConfig({ ideogramApiKey: 'test-key-12345' });
      expect(config.logLevel).toBe('info');
      expect(config.localSaveDir).toBe('./ideogram_images');
      expect(config.enableLocalSave).toBe(true);
      expect(config.maxConcurrentRequests).toBe(3);
    });

    it('should allow overriding defaults', async () => {
      const { createConfig } = await import('../../config/config.js');
      const config = createConfig({
        ideogramApiKey: 'test-key-12345',
        logLevel: 'debug',
        localSaveDir: '/custom/path',
        enableLocalSave: false,
        maxConcurrentRequests: 5,
        requestTimeoutMs: 60000,
      });
      expect(config.logLevel).toBe('debug');
      expect(config.localSaveDir).toBe('/custom/path');
      expect(config.enableLocalSave).toBe(false);
      expect(config.maxConcurrentRequests).toBe(5);
      expect(config.requestTimeoutMs).toBe(60000);
    });

    it('should throw error for empty API key', async () => {
      const { createConfig } = await import('../../config/config.js');
      expect(() => createConfig({ ideogramApiKey: '' })).toThrow();
    });

    it('should throw error for invalid log level', async () => {
      const { createConfig } = await import('../../config/config.js');
      expect(() =>
        createConfig({
          ideogramApiKey: 'test-key',
          logLevel: 'invalid' as 'info',
        })
      ).toThrow();
    });

    it('should throw error for maxConcurrentRequests below minimum', async () => {
      const { createConfig } = await import('../../config/config.js');
      expect(() =>
        createConfig({
          ideogramApiKey: 'test-key',
          maxConcurrentRequests: 0,
        })
      ).toThrow();
    });

    it('should throw error for maxConcurrentRequests above maximum', async () => {
      const { createConfig } = await import('../../config/config.js');
      expect(() =>
        createConfig({
          ideogramApiKey: 'test-key',
          maxConcurrentRequests: 11,
        })
      ).toThrow();
    });

    it('should throw error for requestTimeoutMs below minimum', async () => {
      const { createConfig } = await import('../../config/config.js');
      expect(() =>
        createConfig({
          ideogramApiKey: 'test-key',
          requestTimeoutMs: 500,
        })
      ).toThrow();
    });

    it('should throw error for requestTimeoutMs above maximum', async () => {
      const { createConfig } = await import('../../config/config.js');
      expect(() =>
        createConfig({
          ideogramApiKey: 'test-key',
          requestTimeoutMs: 400000,
        })
      ).toThrow();
    });
  });

  describe('isConfigValid', () => {
    it('should return true when config is valid', async () => {
      process.env['IDEOGRAM_API_KEY'] = 'valid-api-key';
      const { isConfigValid } = await import('../../config/config.js');
      expect(isConfigValid()).toBe(true);
    });
  });

  describe('getConfigErrors', () => {
    it('should return empty array for valid config', async () => {
      process.env['IDEOGRAM_API_KEY'] = 'valid-api-key';
      const { getConfigErrors } = await import('../../config/config.js');
      expect(getConfigErrors()).toEqual([]);
    });
  });

  describe('Config object', () => {
    it('should export a valid config object when API key is set', async () => {
      process.env['IDEOGRAM_API_KEY'] = 'test-api-key';
      const { config } = await import('../../config/config.js');
      expect(config).toBeDefined();
      expect(config.ideogramApiKey).toBe('test-api-key');
    });

    it('should respect environment variable for log level', async () => {
      process.env['IDEOGRAM_API_KEY'] = 'test-api-key';
      process.env['LOG_LEVEL'] = 'debug';
      const { config } = await import('../../config/config.js');
      expect(config.logLevel).toBe('debug');
    });

    it('should respect environment variable for local save dir', async () => {
      process.env['IDEOGRAM_API_KEY'] = 'test-api-key';
      process.env['LOCAL_SAVE_DIR'] = '/custom/images';
      const { config } = await import('../../config/config.js');
      expect(config.localSaveDir).toBe('/custom/images');
    });

    it('should parse ENABLE_LOCAL_SAVE as boolean', async () => {
      process.env['IDEOGRAM_API_KEY'] = 'test-api-key';
      process.env['ENABLE_LOCAL_SAVE'] = 'false';
      const { config } = await import('../../config/config.js');
      expect(config.enableLocalSave).toBe(false);
    });

    it('should parse MAX_CONCURRENT_REQUESTS as integer', async () => {
      process.env['IDEOGRAM_API_KEY'] = 'test-api-key';
      process.env['MAX_CONCURRENT_REQUESTS'] = '5';
      const { config } = await import('../../config/config.js');
      expect(config.maxConcurrentRequests).toBe(5);
    });

    it('should parse REQUEST_TIMEOUT_MS as integer', async () => {
      process.env['IDEOGRAM_API_KEY'] = 'test-api-key';
      process.env['REQUEST_TIMEOUT_MS'] = '60000';
      const { config } = await import('../../config/config.js');
      expect(config.requestTimeoutMs).toBe(60000);
    });
  });

  describe('Environment Variable Parsing', () => {
    it('should handle truthy boolean values: true, 1, yes, on', async () => {
      const truthyValues = ['true', '1', 'yes', 'on', 'TRUE', 'Yes', 'ON'];

      for (const value of truthyValues) {
        vi.resetModules();
        process.env = { ...originalEnv };
        process.env['IDEOGRAM_API_KEY'] = 'test-api-key';
        process.env['ENABLE_LOCAL_SAVE'] = value;
        const { config } = await import('../../config/config.js');
        expect(config.enableLocalSave).toBe(true);
      }
    });

    it('should handle falsy boolean values: false, 0, no, off', async () => {
      const falsyValues = ['false', '0', 'no', 'off', 'FALSE', 'No', 'OFF'];

      for (const value of falsyValues) {
        vi.resetModules();
        process.env = { ...originalEnv };
        process.env['IDEOGRAM_API_KEY'] = 'test-api-key';
        process.env['ENABLE_LOCAL_SAVE'] = value;
        const { config } = await import('../../config/config.js');
        expect(config.enableLocalSave).toBe(false);
      }
    });

    it('should use default for invalid boolean values', async () => {
      process.env['IDEOGRAM_API_KEY'] = 'test-api-key';
      process.env['ENABLE_LOCAL_SAVE'] = 'invalid';
      const { config } = await import('../../config/config.js');
      // Default is true (SAVE_LOCALLY)
      expect(config.enableLocalSave).toBe(true);
    });

    it('should use default for invalid integer values', async () => {
      process.env['IDEOGRAM_API_KEY'] = 'test-api-key';
      process.env['MAX_CONCURRENT_REQUESTS'] = 'not-a-number';
      const { config } = await import('../../config/config.js');
      // Default is 3
      expect(config.maxConcurrentRequests).toBe(3);
    });

    it('should use default for empty values', async () => {
      process.env['IDEOGRAM_API_KEY'] = 'test-api-key';
      process.env['MAX_CONCURRENT_REQUESTS'] = '';
      const { config } = await import('../../config/config.js');
      expect(config.maxConcurrentRequests).toBe(3);
    });
  });
});
