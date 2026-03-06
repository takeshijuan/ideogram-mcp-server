/**
 * Unit Tests for MCP Tools
 *
 * This file contains comprehensive unit tests for all 10 MCP tools:
 * - ideogram_generate - Generate images from text prompts
 * - ideogram_edit - Edit images using inpainting/outpainting
 * - ideogram_generate_async - Queue async generation
 * - ideogram_get_prediction - Get prediction status
 * - ideogram_cancel_prediction - Cancel queued predictions
 * - ideogram_describe - Generate text descriptions from images
 * - ideogram_upscale - Upscale images to higher resolution
 * - ideogram_remix - Remix images with new prompts
 * - ideogram_reframe - Extend images to new resolutions
 * - ideogram_replace_background - Replace image backgrounds
 *
 * Tests cover:
 * - Successful operations with various parameters
 * - Error handling and error propagation
 * - Cost calculation integration
 * - Local storage integration
 * - Prediction store interactions
 * - Factory functions and default handlers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Logger } from 'pino';

// =============================================================================
// Mocks Setup
// =============================================================================

// Mock config first - before any imports that depend on it
vi.mock('../../config/config.js', () => ({
  config: {
    ideogramApiKey: 'test-api-key-for-testing',
    logLevel: 'error',
    localSaveDir: '/tmp/ideogram-test-images',
    enableLocalSave: true,
    maxConcurrentRequests: 3,
    requestTimeoutMs: 10000,
  },
}));

// Mock logger
vi.mock('../../utils/logger.js', () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => mockLogger),
  };
  return {
    createChildLogger: vi.fn(() => mockLogger),
    logToolInvocation: vi.fn(),
    logToolResult: vi.fn(),
    logError: vi.fn(),
  };
});

// Mock Ideogram client
vi.mock('../../services/ideogram.client.js', () => ({
  IdeogramClient: vi.fn().mockImplementation(() => ({
    generate: vi.fn(),
    edit: vi.fn(),
    describe: vi.fn(),
    upscale: vi.fn(),
    remix: vi.fn(),
    reframe: vi.fn(),
    replaceBackground: vi.fn(),
    testConnection: vi.fn(),
    getMaskedApiKey: vi.fn(),
  })),
  createIdeogramClient: vi.fn(() => ({
    generate: vi.fn(),
    edit: vi.fn(),
    describe: vi.fn(),
    upscale: vi.fn(),
    remix: vi.fn(),
    reframe: vi.fn(),
    replaceBackground: vi.fn(),
    testConnection: vi.fn(),
    getMaskedApiKey: vi.fn(),
  })),
}));

// Mock storage service
vi.mock('../../services/storage.service.js', () => ({
  StorageService: vi.fn().mockImplementation(() => ({
    downloadImage: vi.fn(),
    downloadImages: vi.fn(),
    isEnabled: vi.fn(() => true),
    getStorageDir: vi.fn(() => '/tmp/test'),
  })),
  createStorageService: vi.fn(() => ({
    downloadImage: vi.fn(),
    downloadImages: vi.fn(),
    isEnabled: vi.fn(() => true),
    getStorageDir: vi.fn(() => '/tmp/test'),
  })),
}));

// Mock cost calculator
vi.mock('../../services/cost.calculator.js', () => ({
  calculateCost: vi.fn(() => ({
    creditsUsed: 1,
    estimatedUsd: 0.02,
    pricingTier: 'DEFAULT',
    numImages: 1,
  })),
  calculateEditCost: vi.fn(() => ({
    creditsUsed: 2,
    estimatedUsd: 0.04,
    pricingTier: 'DEFAULT',
    numImages: 1,
  })),
  calculateUpscaleCost: vi.fn(() => ({
    credits_used: 2,
    estimated_usd: 0.04,
    pricing_tier: 'DEFAULT',
    num_images: 1,
  })),
  calculateRemixCost: vi.fn(() => ({
    credits_used: 1,
    estimated_usd: 0.02,
    pricing_tier: 'DEFAULT',
    num_images: 1,
  })),
  calculateReframeCost: vi.fn(() => ({
    credits_used: 2,
    estimated_usd: 0.04,
    pricing_tier: 'DEFAULT',
    num_images: 1,
  })),
  calculateReplaceBgCost: vi.fn(() => ({
    credits_used: 1,
    estimated_usd: 0.02,
    pricing_tier: 'DEFAULT',
    num_images: 1,
  })),
  toCostEstimateOutput: vi.fn((cost) => ({
    credits_used: cost.creditsUsed ?? cost.credits_used ?? 1,
    estimated_usd: cost.estimatedUsd ?? cost.estimated_usd ?? 0.02,
    pricing_tier: cost.pricingTier ?? cost.pricing_tier ?? 'DEFAULT',
    num_images: cost.numImages ?? cost.num_images ?? 1,
  })),
}));

// Mock prediction store
vi.mock('../../services/prediction.store.js', () => ({
  PredictionStore: vi.fn().mockImplementation(() => ({
    create: vi.fn(),
    get: vi.fn(),
    getOrThrow: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
    getByStatus: vi.fn(),
    getStats: vi.fn(),
    dispose: vi.fn(),
  })),
  createPredictionStore: vi.fn(() => ({
    create: vi.fn(),
    get: vi.fn(),
    getOrThrow: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
    getByStatus: vi.fn(),
    getStats: vi.fn(),
    dispose: vi.fn(),
  })),
  formatPredictionStatus: vi.fn((status) => {
    const labels: Record<string, string> = {
      queued: 'Queued',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  }),
}));

// Mock error handler
vi.mock('../../utils/error.handler.js', () => ({
  IdeogramMCPError: class IdeogramMCPError extends Error {
    code: string;
    userMessage: string;
    statusCode: number;
    retryable: boolean;
    details?: Record<string, unknown>;

    constructor(
      code: string,
      message: string,
      userMessage: string,
      statusCode: number,
      retryable: boolean,
      details?: Record<string, unknown>
    ) {
      super(message);
      this.name = 'IdeogramMCPError';
      this.code = code;
      this.userMessage = userMessage;
      this.statusCode = statusCode;
      this.retryable = retryable;
      this.details = details;
    }

    toToolError() {
      return {
        success: false,
        error_code: this.code,
        error: this.message,
        user_message: this.userMessage,
        retryable: this.retryable,
        details: this.details,
      };
    }
  },
  wrapError: vi.fn((error) => {
    const err = new Error(error instanceof Error ? error.message : String(error));
    (err as unknown as Record<string, unknown>).code = 'INTERNAL_ERROR';
    (err as unknown as Record<string, unknown>).userMessage = 'An unexpected error occurred';
    (err as unknown as Record<string, unknown>).statusCode = 500;
    (err as unknown as Record<string, unknown>).retryable = false;
    (err as unknown as Record<string, () => unknown>).toToolError = () => ({
      success: false,
      error_code: 'INTERNAL_ERROR',
      error: err.message,
      user_message: 'An unexpected error occurred',
      retryable: false,
    });
    return err;
  }),
  createPredictionNotFoundError: vi.fn((id) => {
    const error = new Error(`Prediction not found: ${id}`);
    (error as unknown as Record<string, unknown>).code = 'PREDICTION_NOT_FOUND';
    (error as unknown as Record<string, unknown>).userMessage =
      `No prediction found with ID: ${id}`;
    (error as unknown as Record<string, unknown>).statusCode = 404;
    (error as unknown as Record<string, unknown>).retryable = false;
    (error as unknown as Record<string, () => unknown>).toToolError = () => ({
      success: false,
      error_code: 'PREDICTION_NOT_FOUND',
      error: error.message,
      user_message: `No prediction found with ID: ${id}`,
      retryable: false,
    });
    return error;
  }),
}));

// Now import the tools after mocks are set up
import {
  createGenerateHandler,
  ideogramGenerate,
  resetDefaultHandler as resetGenerateHandler,
  TOOL_NAME as GENERATE_TOOL_NAME,
  TOOL_DESCRIPTION as GENERATE_TOOL_DESCRIPTION,
  TOOL_SCHEMA as GENERATE_TOOL_SCHEMA,
  ideogramGenerateTool,
} from '../../tools/generate.js';

import {
  createEditHandler,
  ideogramEdit,
  resetDefaultHandler as resetEditHandler,
  TOOL_NAME as EDIT_TOOL_NAME,
  TOOL_DESCRIPTION as EDIT_TOOL_DESCRIPTION,
  TOOL_SCHEMA as EDIT_TOOL_SCHEMA,
  ideogramEditTool,
} from '../../tools/edit.js';

import {
  createGenerateAsyncHandler,
  ideogramGenerateAsync,
  resetDefaultHandler as resetGenerateAsyncHandler,
  TOOL_NAME as GENERATE_ASYNC_TOOL_NAME,
  TOOL_DESCRIPTION as GENERATE_ASYNC_TOOL_DESCRIPTION,
  TOOL_SCHEMA as GENERATE_ASYNC_TOOL_SCHEMA,
  ideogramGenerateAsyncTool,
} from '../../tools/generate-async.js';

import {
  createGetPredictionHandler,
  ideogramGetPrediction,
  resetDefaultHandler as resetGetPredictionHandler,
  TOOL_NAME as GET_PREDICTION_TOOL_NAME,
  TOOL_DESCRIPTION as GET_PREDICTION_TOOL_DESCRIPTION,
  TOOL_SCHEMA as GET_PREDICTION_TOOL_SCHEMA,
  ideogramGetPredictionTool,
} from '../../tools/get-prediction.js';

import {
  createCancelPredictionHandler,
  ideogramCancelPrediction,
  resetDefaultHandler as resetCancelPredictionHandler,
  TOOL_NAME as CANCEL_PREDICTION_TOOL_NAME,
  TOOL_DESCRIPTION as CANCEL_PREDICTION_TOOL_DESCRIPTION,
  TOOL_SCHEMA as CANCEL_PREDICTION_TOOL_SCHEMA,
  ideogramCancelPredictionTool,
} from '../../tools/cancel-prediction.js';

import {
  createDescribeHandler,
  ideogramDescribe,
  resetDefaultHandler as resetDescribeHandler,
  TOOL_NAME as DESCRIBE_TOOL_NAME,
  TOOL_DESCRIPTION as DESCRIBE_TOOL_DESCRIPTION,
  TOOL_SCHEMA as DESCRIBE_TOOL_SCHEMA,
  ideogramDescribeTool,
} from '../../tools/describe.js';

import {
  createUpscaleHandler,
  ideogramUpscale,
  resetDefaultHandler as resetUpscaleHandler,
  TOOL_NAME as UPSCALE_TOOL_NAME,
  TOOL_DESCRIPTION as UPSCALE_TOOL_DESCRIPTION,
  TOOL_SCHEMA as UPSCALE_TOOL_SCHEMA,
  ideogramUpscaleTool,
} from '../../tools/upscale.js';

import {
  createRemixHandler,
  ideogramRemix,
  resetDefaultHandler as resetRemixHandler,
  TOOL_NAME as REMIX_TOOL_NAME,
  TOOL_DESCRIPTION as REMIX_TOOL_DESCRIPTION,
  TOOL_SCHEMA as REMIX_TOOL_SCHEMA,
  ideogramRemixTool,
} from '../../tools/remix.js';

import {
  createReframeHandler,
  ideogramReframe,
  resetDefaultHandler as resetReframeHandler,
  TOOL_NAME as REFRAME_TOOL_NAME,
  TOOL_DESCRIPTION as REFRAME_TOOL_DESCRIPTION,
  TOOL_SCHEMA as REFRAME_TOOL_SCHEMA,
  ideogramReframeTool,
} from '../../tools/reframe.js';

import {
  createReplaceBackgroundHandler,
  ideogramReplaceBackground,
  resetDefaultHandler as resetReplaceBackgroundHandler,
  TOOL_NAME as REPLACE_BACKGROUND_TOOL_NAME,
  TOOL_DESCRIPTION as REPLACE_BACKGROUND_TOOL_DESCRIPTION,
  TOOL_SCHEMA as REPLACE_BACKGROUND_TOOL_SCHEMA,
  ideogramReplaceBackgroundTool,
} from '../../tools/replace-background.js';

import { createIdeogramClient } from '../../services/ideogram.client.js';
import { createStorageService } from '../../services/storage.service.js';
import { createPredictionStore } from '../../services/prediction.store.js';

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Creates a mock logger for testing
 */
function createMockLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => createMockLogger()),
  } as unknown as Logger;
}

/**
 * Creates a mock generate response
 */
function createMockGenerateResponse(imageCount = 1) {
  const images = Array.from({ length: imageCount }, (_, i) => ({
    url: `https://ideogram.ai/api/images/test-image-${i}.png`,
    prompt: 'test prompt',
    resolution: '1024x1024',
    is_image_safe: true,
    seed: 12345 + i,
  }));

  return {
    created: new Date().toISOString(),
    data: images,
  };
}

/**
 * Creates a mock edit response
 */
function createMockEditResponse(imageCount = 1) {
  const images = Array.from({ length: imageCount }, (_, i) => ({
    url: `https://ideogram.ai/api/images/edited-image-${i}.png`,
    prompt: 'edit prompt',
    resolution: '1024x1024',
    is_image_safe: true,
    seed: 54321 + i,
  }));

  return {
    created: new Date().toISOString(),
    data: images,
  };
}

/**
 * Creates a mock describe response
 */
function createMockDescribeResponse(descriptionCount = 1) {
  const descriptions = Array.from({ length: descriptionCount }, (_, i) => ({
    text: `Description ${i}: A detailed image analysis`,
  }));

  return { descriptions };
}

/**
 * Creates a mock prediction object
 */
function createMockPrediction(
  overrides: Partial<{
    id: string;
    status: string;
    progress: number;
    eta_seconds: number;
    result: ReturnType<typeof createMockGenerateResponse>;
    error: { code: string; message: string; retryable: boolean };
    request: Record<string, unknown>;
    type: string;
    created_at: string;
  }> = {}
) {
  return {
    id: overrides.id ?? 'pred_test123456789',
    status: overrides.status ?? 'queued',
    progress: overrides.progress ?? 0,
    eta_seconds: overrides.eta_seconds ?? 30,
    result: overrides.result,
    error: overrides.error,
    request: overrides.request ?? { prompt: 'test prompt' },
    type: overrides.type ?? 'generate',
    created_at: overrides.created_at ?? new Date().toISOString(),
  };
}

/**
 * Creates a mock storage service with configurable behavior
 */
function createMockStorageWithBehavior(enabled = true) {
  return {
    downloadImage: vi.fn().mockResolvedValue({
      filePath: '/tmp/test/generated_1.png',
      filename: 'generated_1.png',
      originalUrl: 'https://ideogram.ai/api/images/test-image.png',
      sizeBytes: 1024,
      mimeType: 'image/png',
    }),
    downloadImages: vi.fn().mockResolvedValue({
      saved: [
        {
          filePath: '/tmp/test/generated_1.png',
          filename: 'generated_1.png',
          originalUrl: 'https://ideogram.ai/api/images/test-image-0.png',
          sizeBytes: 1024,
          mimeType: 'image/png',
        },
      ],
      failed: [],
      total: 1,
      successCount: 1,
      failureCount: 0,
    }),
    isEnabled: vi.fn(() => enabled),
    getStorageDir: vi.fn(() => '/tmp/test'),
  };
}

// =============================================================================
// ideogram_generate Tool Tests
// =============================================================================

describe('ideogram_generate Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGenerateHandler();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Constants', () => {
    it('should export correct tool name', () => {
      expect(GENERATE_TOOL_NAME).toBe('ideogram_generate');
    });

    it('should export non-empty tool description', () => {
      expect(GENERATE_TOOL_DESCRIPTION).toBeDefined();
      expect(GENERATE_TOOL_DESCRIPTION.length).toBeGreaterThan(50);
    });

    it('should export valid tool schema', () => {
      expect(GENERATE_TOOL_SCHEMA).toBeDefined();
    });

    it('should export complete tool definition', () => {
      expect(ideogramGenerateTool.name).toBe(GENERATE_TOOL_NAME);
      expect(ideogramGenerateTool.description).toBe(GENERATE_TOOL_DESCRIPTION);
      expect(ideogramGenerateTool.schema).toBe(GENERATE_TOOL_SCHEMA);
      expect(ideogramGenerateTool.handler).toBe(ideogramGenerate);
    });
  });

  describe('createGenerateHandler', () => {
    it('should create handler with default options', () => {
      const handler = createGenerateHandler();
      expect(handler).toBeInstanceOf(Function);
    });

    it('should create handler with custom client', () => {
      const mockClient = {
        generate: vi.fn().mockResolvedValue(createMockGenerateResponse()),
        edit: vi.fn(),
      };
      const handler = createGenerateHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
      });
      expect(handler).toBeInstanceOf(Function);
    });

    it('should create handler with custom logger', () => {
      const mockLogger = createMockLogger();
      const handler = createGenerateHandler({ logger: mockLogger });
      expect(handler).toBeInstanceOf(Function);
    });
  });

  describe('Generate Handler Execution', () => {
    it('should successfully generate images with minimal input', async () => {
      const mockClient = {
        generate: vi.fn().mockResolvedValue(createMockGenerateResponse(1)),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createGenerateHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({ prompt: 'A beautiful sunset' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.images).toHaveLength(1);
        expect(result.num_images).toBe(1);
        expect(result.total_cost).toBeDefined();
        expect(result.created).toBeDefined();
      }
      expect(mockClient.generate).toHaveBeenCalled();
    });

    it('should pass all optional parameters to client', async () => {
      const mockClient = {
        generate: vi.fn().mockResolvedValue(createMockGenerateResponse(4)),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createGenerateHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      await handler({
        prompt: 'A cat',
        negative_prompt: 'blur',
        aspect_ratio: '16x9',
        num_images: 4,
        seed: 12345,
        rendering_speed: 'QUALITY',
        magic_prompt: 'ON',
        style_type: 'REALISTIC',
        save_locally: false,
      });

      expect(mockClient.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'A cat',
          negativePrompt: 'blur',
          aspectRatio: '16x9',
          numImages: 4,
          seed: 12345,
          renderingSpeed: 'QUALITY',
          magicPrompt: 'ON',
          styleType: 'REALISTIC',
        })
      );
    });

    it('should save images locally when enabled', async () => {
      const mockResponse = createMockGenerateResponse(2);
      const mockClient = {
        generate: vi.fn().mockResolvedValue(mockResponse),
      };
      const mockStorage = createMockStorageWithBehavior(true);
      mockStorage.downloadImages.mockResolvedValue({
        saved: [
          {
            filePath: '/tmp/test/generated_1.png',
            filename: 'generated_1.png',
            originalUrl: mockResponse.data[0]?.url,
            sizeBytes: 1024,
            mimeType: 'image/png',
          },
          {
            filePath: '/tmp/test/generated_2.png',
            filename: 'generated_2.png',
            originalUrl: mockResponse.data[1]?.url,
            sizeBytes: 1024,
            mimeType: 'image/png',
          },
        ],
        failed: [],
        total: 2,
        successCount: 2,
        failureCount: 0,
      });

      const handler = createGenerateHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        prompt: 'A sunset',
        num_images: 2,
        save_locally: true,
      });

      expect(result.success).toBe(true);
      expect(mockStorage.downloadImages).toHaveBeenCalled();
      if (result.success) {
        expect(result.images[0]?.local_path).toBeDefined();
      }
    });

    it('should handle client errors gracefully', async () => {
      const mockClient = {
        generate: vi.fn().mockRejectedValue(new Error('API Error')),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createGenerateHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({ prompt: 'A sunset' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error_code).toBeDefined();
        expect(result.user_message).toBeDefined();
      }
    });

    it('should handle partial storage failures', async () => {
      const mockResponse = createMockGenerateResponse(2);
      const mockClient = {
        generate: vi.fn().mockResolvedValue(mockResponse),
      };
      const mockStorage = createMockStorageWithBehavior(true);
      mockStorage.downloadImages.mockResolvedValue({
        saved: [
          {
            filePath: '/tmp/test/generated_1.png',
            filename: 'generated_1.png',
            originalUrl: mockResponse.data[0]?.url,
            sizeBytes: 1024,
            mimeType: 'image/png',
          },
        ],
        failed: [{ url: mockResponse.data[1]?.url, error: 'Download failed' }],
        total: 2,
        successCount: 1,
        failureCount: 1,
      });

      const handler = createGenerateHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        prompt: 'A sunset',
        num_images: 2,
        save_locally: true,
      });

      // Should still succeed even if some images failed to save
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// ideogram_edit Tool Tests
// =============================================================================

describe('ideogram_edit Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetEditHandler();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Constants', () => {
    it('should export correct tool name', () => {
      expect(EDIT_TOOL_NAME).toBe('ideogram_edit');
    });

    it('should export non-empty tool description', () => {
      expect(EDIT_TOOL_DESCRIPTION).toBeDefined();
      expect(EDIT_TOOL_DESCRIPTION.length).toBeGreaterThan(50);
    });

    it('should export valid tool schema', () => {
      expect(EDIT_TOOL_SCHEMA).toBeDefined();
    });

    it('should export complete tool definition', () => {
      expect(ideogramEditTool.name).toBe(EDIT_TOOL_NAME);
      expect(ideogramEditTool.description).toBe(EDIT_TOOL_DESCRIPTION);
      expect(ideogramEditTool.schema).toBe(EDIT_TOOL_SCHEMA);
      expect(ideogramEditTool.handler).toBe(ideogramEdit);
    });
  });

  describe('createEditHandler', () => {
    it('should create handler with default options', () => {
      const handler = createEditHandler();
      expect(handler).toBeInstanceOf(Function);
    });

    it('should create handler with custom client', () => {
      const mockClient = {
        edit: vi.fn().mockResolvedValue(createMockEditResponse()),
      };
      const handler = createEditHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
      });
      expect(handler).toBeInstanceOf(Function);
    });
  });

  describe('Edit Handler Execution', () => {
    it('should successfully edit images with mask', async () => {
      const mockClient = {
        edit: vi.fn().mockResolvedValue(createMockEditResponse(1)),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createEditHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        prompt: 'Add a balloon',
        image: 'https://example.com/image.png',
        mask: 'https://example.com/mask.png',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.images).toHaveLength(1);
        expect(result.total_cost).toBeDefined();
      }
      expect(mockClient.edit).toHaveBeenCalledWith(
        expect.objectContaining({
          mask: 'https://example.com/mask.png',
        })
      );
    });

    it('should pass rendering_speed to client', async () => {
      const mockClient = {
        edit: vi.fn().mockResolvedValue(createMockEditResponse(1)),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createEditHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        prompt: 'Edit the scene',
        image: 'https://example.com/image.png',
        mask: 'https://example.com/mask.png',
        rendering_speed: 'QUALITY',
      });

      expect(result.success).toBe(true);
      expect(mockClient.edit).toHaveBeenCalledWith(
        expect.objectContaining({
          renderingSpeed: 'QUALITY',
        })
      );
    });

    it('should pass all optional parameters to client', async () => {
      const mockClient = {
        edit: vi.fn().mockResolvedValue(createMockEditResponse(2)),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createEditHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      await handler({
        prompt: 'Edit this',
        image: 'https://example.com/image.png',
        mask: 'https://example.com/mask.png',
        num_images: 2,
        seed: 54321,
        rendering_speed: 'TURBO',
        magic_prompt: 'OFF',
        style_type: 'DESIGN',
        save_locally: false,
      });

      expect(mockClient.edit).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Edit this',
          numImages: 2,
          seed: 54321,
          renderingSpeed: 'TURBO',
          magicPrompt: 'OFF',
          styleType: 'DESIGN',
        })
      );
    });

    it('should handle client errors gracefully', async () => {
      const mockClient = {
        edit: vi.fn().mockRejectedValue(new Error('Edit API Error')),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createEditHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        prompt: 'Edit this',
        image: 'https://example.com/image.png',
        mask: 'https://example.com/mask.png',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error_code).toBeDefined();
      }
    });

    it('should use default rendering_speed when not specified', async () => {
      const mockClient = {
        edit: vi.fn().mockResolvedValue(createMockEditResponse(1)),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createEditHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        prompt: 'Edit this',
        image: 'https://example.com/image.png',
        mask: 'https://example.com/mask.png',
      });

      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// ideogram_generate_async Tool Tests
// =============================================================================

describe('ideogram_generate_async Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGenerateAsyncHandler();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Constants', () => {
    it('should export correct tool name', () => {
      expect(GENERATE_ASYNC_TOOL_NAME).toBe('ideogram_generate_async');
    });

    it('should export non-empty tool description', () => {
      expect(GENERATE_ASYNC_TOOL_DESCRIPTION).toBeDefined();
      expect(GENERATE_ASYNC_TOOL_DESCRIPTION.length).toBeGreaterThan(50);
    });

    it('should export valid tool schema', () => {
      expect(GENERATE_ASYNC_TOOL_SCHEMA).toBeDefined();
    });

    it('should export complete tool definition', () => {
      expect(ideogramGenerateAsyncTool.name).toBe(GENERATE_ASYNC_TOOL_NAME);
      expect(ideogramGenerateAsyncTool.description).toBe(GENERATE_ASYNC_TOOL_DESCRIPTION);
      expect(ideogramGenerateAsyncTool.schema).toBe(GENERATE_ASYNC_TOOL_SCHEMA);
      expect(ideogramGenerateAsyncTool.handler).toBe(ideogramGenerateAsync);
    });
  });

  describe('createGenerateAsyncHandler', () => {
    it('should create handler with default options', () => {
      const handler = createGenerateAsyncHandler();
      expect(handler).toBeInstanceOf(Function);
    });

    it('should create handler with custom store', () => {
      const mockStore = {
        create: vi.fn(),
        dispose: vi.fn(),
      };
      const handler = createGenerateAsyncHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
      });
      expect(handler).toBeInstanceOf(Function);
    });
  });

  describe('Generate Async Handler Execution', () => {
    it('should successfully queue a generation request', async () => {
      const mockPrediction = createMockPrediction();
      const mockStore = {
        create: vi.fn().mockReturnValue(mockPrediction),
        dispose: vi.fn(),
      };

      const handler = createGenerateAsyncHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
        logger: createMockLogger(),
      });

      const result = await handler({ prompt: 'A beautiful sunset' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.prediction_id).toBe(mockPrediction.id);
        expect(result.status).toBe('queued');
        expect(result.eta_seconds).toBeDefined();
        expect(result.message).toContain('queued successfully');
      }
      expect(mockStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({ prompt: 'A beautiful sunset' }),
          type: 'generate',
        })
      );
    });

    it('should pass all optional parameters to store', async () => {
      const mockPrediction = createMockPrediction();
      const mockStore = {
        create: vi.fn().mockReturnValue(mockPrediction),
        dispose: vi.fn(),
      };

      const handler = createGenerateAsyncHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
        logger: createMockLogger(),
      });

      await handler({
        prompt: 'A cat',
        negative_prompt: 'blur',
        aspect_ratio: '16x9',
        num_images: 4,
        seed: 12345,
        rendering_speed: 'QUALITY',
        magic_prompt: 'ON',
        style_type: 'REALISTIC',
        webhook_url: 'https://example.com/webhook',
      });

      expect(mockStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            prompt: 'A cat',
            negative_prompt: 'blur',
            aspect_ratio: '16x9',
            num_images: 4,
            seed: 12345,
            rendering_speed: 'QUALITY',
            magic_prompt: 'ON',
            style_type: 'REALISTIC',
          }),
          webhookUrl: 'https://example.com/webhook',
        })
      );
    });

    it('should handle store errors gracefully', async () => {
      const mockStore = {
        create: vi.fn().mockImplementation(() => {
          throw new Error('Queue is full');
        }),
        dispose: vi.fn(),
      };

      const handler = createGenerateAsyncHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
        logger: createMockLogger(),
      });

      const result = await handler({ prompt: 'A sunset' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error_code).toBeDefined();
      }
    });
  });
});

// =============================================================================
// ideogram_get_prediction Tool Tests
// =============================================================================

describe('ideogram_get_prediction Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGetPredictionHandler();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Constants', () => {
    it('should export correct tool name', () => {
      expect(GET_PREDICTION_TOOL_NAME).toBe('ideogram_get_prediction');
    });

    it('should export non-empty tool description', () => {
      expect(GET_PREDICTION_TOOL_DESCRIPTION).toBeDefined();
      expect(GET_PREDICTION_TOOL_DESCRIPTION.length).toBeGreaterThan(50);
    });

    it('should export valid tool schema', () => {
      expect(GET_PREDICTION_TOOL_SCHEMA).toBeDefined();
    });

    it('should export complete tool definition', () => {
      expect(ideogramGetPredictionTool.name).toBe(GET_PREDICTION_TOOL_NAME);
      expect(ideogramGetPredictionTool.description).toBe(GET_PREDICTION_TOOL_DESCRIPTION);
      expect(ideogramGetPredictionTool.schema).toBe(GET_PREDICTION_TOOL_SCHEMA);
      expect(ideogramGetPredictionTool.handler).toBe(ideogramGetPrediction);
    });
  });

  describe('createGetPredictionHandler', () => {
    it('should create handler with default options', () => {
      const handler = createGetPredictionHandler();
      expect(handler).toBeInstanceOf(Function);
    });

    it('should create handler with custom store', () => {
      const mockStore = {
        getOrThrow: vi.fn(),
        dispose: vi.fn(),
      };
      const handler = createGetPredictionHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
      });
      expect(handler).toBeInstanceOf(Function);
    });
  });

  describe('Get Prediction Handler Execution', () => {
    it('should return queued status for queued prediction', async () => {
      const mockPrediction = createMockPrediction({ status: 'queued', progress: 0 });
      const mockStore = {
        getOrThrow: vi.fn().mockReturnValue(mockPrediction),
        dispose: vi.fn(),
      };

      const handler = createGetPredictionHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
        logger: createMockLogger(),
      });

      const result = await handler({ prediction_id: mockPrediction.id });

      expect(result.success).toBe(true);
      if (result.success && 'status' in result) {
        expect(result.status).toBe('queued');
        expect(result.prediction_id).toBe(mockPrediction.id);
      }
    });

    it('should return processing status with progress', async () => {
      const mockPrediction = createMockPrediction({
        status: 'processing',
        progress: 50,
        eta_seconds: 15,
      });
      const mockStore = {
        getOrThrow: vi.fn().mockReturnValue(mockPrediction),
        dispose: vi.fn(),
      };

      const handler = createGetPredictionHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
        logger: createMockLogger(),
      });

      const result = await handler({ prediction_id: mockPrediction.id });

      expect(result.success).toBe(true);
      if (result.success && 'progress' in result) {
        expect(result.status).toBe('processing');
        expect(result.progress).toBe(50);
        expect(result.eta_seconds).toBe(15);
      }
    });

    it('should return completed status with images and cost', async () => {
      const mockResponse = createMockGenerateResponse(2);
      const mockPrediction = createMockPrediction({
        status: 'completed',
        progress: 100,
        result: mockResponse,
      });
      const mockStore = {
        getOrThrow: vi.fn().mockReturnValue(mockPrediction),
        dispose: vi.fn(),
      };

      const handler = createGetPredictionHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
        logger: createMockLogger(),
      });

      const result = await handler({ prediction_id: mockPrediction.id });

      expect(result.success).toBe(true);
      if (result.success && 'images' in result) {
        expect(result.status).toBe('completed');
        expect(result.images).toHaveLength(2);
        expect(result.total_cost).toBeDefined();
        expect(result.num_images).toBe(2);
      }
    });

    it('should return failed status with error information', async () => {
      const mockPrediction = createMockPrediction({
        status: 'failed',
        error: {
          code: 'API_ERROR',
          message: 'API call failed',
          retryable: true,
        },
      });
      const mockStore = {
        getOrThrow: vi.fn().mockReturnValue(mockPrediction),
        dispose: vi.fn(),
      };

      const handler = createGetPredictionHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
        logger: createMockLogger(),
      });

      const result = await handler({ prediction_id: mockPrediction.id });

      expect(result.success).toBe(false);
      if (!result.success && 'error' in result) {
        expect(result.status).toBe('failed');
        expect(result.error.code).toBe('API_ERROR');
        expect(result.error.retryable).toBe(true);
      }
    });

    it('should return cancelled status', async () => {
      const mockPrediction = createMockPrediction({ status: 'cancelled' });
      const mockStore = {
        getOrThrow: vi.fn().mockReturnValue(mockPrediction),
        dispose: vi.fn(),
      };

      const handler = createGetPredictionHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
        logger: createMockLogger(),
      });

      const result = await handler({ prediction_id: mockPrediction.id });

      expect(result.success).toBe(false);
      if (!result.success && 'status' in result) {
        expect(result.status).toBe('cancelled');
      }
    });

    it('should handle prediction not found error', async () => {
      const mockStore = {
        getOrThrow: vi.fn().mockImplementation(() => {
          // Throw a generic error - the handler should wrap it
          throw new Error('Prediction not found: pred_notfound');
        }),
        dispose: vi.fn(),
      };

      const handler = createGetPredictionHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
        logger: createMockLogger(),
      });

      const result = await handler({ prediction_id: 'pred_notfound' });

      expect(result.success).toBe(false);
      if (!result.success) {
        // The error is wrapped by wrapError which returns INTERNAL_ERROR
        expect(result.error_code).toBeDefined();
        expect(result.user_message).toBeDefined();
      }
    });
  });
});

// =============================================================================
// ideogram_cancel_prediction Tool Tests
// =============================================================================

describe('ideogram_cancel_prediction Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCancelPredictionHandler();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Constants', () => {
    it('should export correct tool name', () => {
      expect(CANCEL_PREDICTION_TOOL_NAME).toBe('ideogram_cancel_prediction');
    });

    it('should export non-empty tool description', () => {
      expect(CANCEL_PREDICTION_TOOL_DESCRIPTION).toBeDefined();
      expect(CANCEL_PREDICTION_TOOL_DESCRIPTION.length).toBeGreaterThan(50);
    });

    it('should export valid tool schema', () => {
      expect(CANCEL_PREDICTION_TOOL_SCHEMA).toBeDefined();
    });

    it('should export complete tool definition', () => {
      expect(ideogramCancelPredictionTool.name).toBe(CANCEL_PREDICTION_TOOL_NAME);
      expect(ideogramCancelPredictionTool.description).toBe(CANCEL_PREDICTION_TOOL_DESCRIPTION);
      expect(ideogramCancelPredictionTool.schema).toBe(CANCEL_PREDICTION_TOOL_SCHEMA);
      expect(ideogramCancelPredictionTool.handler).toBe(ideogramCancelPrediction);
    });
  });

  describe('createCancelPredictionHandler', () => {
    it('should create handler with default options', () => {
      const handler = createCancelPredictionHandler();
      expect(handler).toBeInstanceOf(Function);
    });

    it('should create handler with custom store', () => {
      const mockStore = {
        cancel: vi.fn(),
        dispose: vi.fn(),
      };
      const handler = createCancelPredictionHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
      });
      expect(handler).toBeInstanceOf(Function);
    });
  });

  describe('Cancel Prediction Handler Execution', () => {
    it('should successfully cancel a queued prediction', async () => {
      const mockStore = {
        cancel: vi.fn().mockReturnValue({
          success: true,
          status: 'cancelled',
          message: 'Prediction successfully cancelled',
        }),
        dispose: vi.fn(),
      };

      const handler = createCancelPredictionHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
        logger: createMockLogger(),
      });

      const result = await handler({ prediction_id: 'pred_test123' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.status).toBe('cancelled');
        expect(result.message).toContain('cancelled');
      }
      expect(mockStore.cancel).toHaveBeenCalledWith('pred_test123');
    });

    it('should return failure when prediction is already processing', async () => {
      const mockStore = {
        cancel: vi.fn().mockReturnValue({
          success: false,
          status: 'processing',
          message: 'Prediction is already being processed',
        }),
        dispose: vi.fn(),
      };

      const handler = createCancelPredictionHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
        logger: createMockLogger(),
      });

      const result = await handler({ prediction_id: 'pred_test123' });

      expect(result.success).toBe(false);
      if (!result.success && 'reason' in result) {
        expect(result.status).toBe('processing');
        expect(result.reason).toBeDefined();
      }
    });

    it('should return failure when prediction is already completed', async () => {
      const mockStore = {
        cancel: vi.fn().mockReturnValue({
          success: false,
          status: 'completed',
          message: 'Prediction has already completed',
        }),
        dispose: vi.fn(),
      };

      const handler = createCancelPredictionHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
        logger: createMockLogger(),
      });

      const result = await handler({ prediction_id: 'pred_test123' });

      expect(result.success).toBe(false);
      if (!result.success && 'reason' in result) {
        expect(result.status).toBe('completed');
      }
    });

    it('should return failure when prediction already failed', async () => {
      const mockStore = {
        cancel: vi.fn().mockReturnValue({
          success: false,
          status: 'failed',
          message: 'Prediction has already failed',
        }),
        dispose: vi.fn(),
      };

      const handler = createCancelPredictionHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
        logger: createMockLogger(),
      });

      const result = await handler({ prediction_id: 'pred_test123' });

      expect(result.success).toBe(false);
      if (!result.success && 'reason' in result) {
        expect(result.status).toBe('failed');
      }
    });

    it('should handle store errors gracefully', async () => {
      const mockStore = {
        cancel: vi.fn().mockImplementation(() => {
          // Throw a generic error - the handler should wrap it
          throw new Error('Prediction not found: pred_notfound');
        }),
        dispose: vi.fn(),
      };

      const handler = createCancelPredictionHandler({
        store: mockStore as unknown as ReturnType<typeof createPredictionStore>,
        logger: createMockLogger(),
      });

      const result = await handler({ prediction_id: 'pred_notfound' });

      expect(result.success).toBe(false);
      if (!result.success) {
        // The error is wrapped by wrapError which returns INTERNAL_ERROR
        expect(result.error_code).toBeDefined();
        expect(result.user_message).toBeDefined();
      }
    });
  });
});

// =============================================================================
// Schema Validation Tests
// =============================================================================

describe('Tool Input Schema Validation', () => {
  describe('Generate Input Schema', () => {
    it('should validate minimal valid input', () => {
      const result = GENERATE_TOOL_SCHEMA.safeParse({ prompt: 'A sunset' });
      expect(result.success).toBe(true);
    });

    it('should reject empty prompt', () => {
      const result = GENERATE_TOOL_SCHEMA.safeParse({ prompt: '' });
      expect(result.success).toBe(false);
    });

    it('should validate all aspect ratios', () => {
      const aspectRatios = [
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
      for (const ratio of aspectRatios) {
        const result = GENERATE_TOOL_SCHEMA.safeParse({
          prompt: 'test',
          aspect_ratio: ratio,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid aspect ratio', () => {
      const result = GENERATE_TOOL_SCHEMA.safeParse({
        prompt: 'test',
        aspect_ratio: '16:9', // Should be 16x9
      });
      expect(result.success).toBe(false);
    });

    it('should validate num_images range', () => {
      // Valid range
      for (let n = 1; n <= 8; n++) {
        const result = GENERATE_TOOL_SCHEMA.safeParse({ prompt: 'test', num_images: n });
        expect(result.success).toBe(true);
      }

      // Invalid: 0 images
      const result0 = GENERATE_TOOL_SCHEMA.safeParse({ prompt: 'test', num_images: 0 });
      expect(result0.success).toBe(false);

      // Invalid: 9 images
      const result9 = GENERATE_TOOL_SCHEMA.safeParse({ prompt: 'test', num_images: 9 });
      expect(result9.success).toBe(false);
    });

    it('should validate rendering_speed options', () => {
      const speeds = ['FLASH', 'TURBO', 'DEFAULT', 'QUALITY'];
      for (const speed of speeds) {
        const result = GENERATE_TOOL_SCHEMA.safeParse({
          prompt: 'test',
          rendering_speed: speed,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Edit Input Schema', () => {
    it('should validate minimal edit input', () => {
      const result = EDIT_TOOL_SCHEMA.safeParse({
        prompt: 'Edit this',
        image: 'https://example.com/image.png',
        mask: 'https://example.com/mask.png',
      });
      expect(result.success).toBe(true);
    });

    it('should validate edit input with rendering_speed', () => {
      const result = EDIT_TOOL_SCHEMA.safeParse({
        prompt: 'Edit this',
        image: 'https://example.com/image.png',
        mask: 'https://example.com/mask.png',
        rendering_speed: 'QUALITY',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty image', () => {
      const result = EDIT_TOOL_SCHEMA.safeParse({
        prompt: 'Edit this',
        image: '',
        mask: 'https://example.com/mask.png',
      });
      expect(result.success).toBe(false);
    });

    it('should validate character_reference_images', () => {
      const result = EDIT_TOOL_SCHEMA.safeParse({
        prompt: 'Edit this',
        image: 'https://example.com/image.png',
        mask: 'https://example.com/mask.png',
        character_reference_images: ['https://example.com/ref1.png'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Get Prediction Input Schema', () => {
    it('should validate valid prediction_id', () => {
      const result = GET_PREDICTION_TOOL_SCHEMA.safeParse({
        prediction_id: 'pred_test123456789',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty prediction_id', () => {
      const result = GET_PREDICTION_TOOL_SCHEMA.safeParse({
        prediction_id: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Cancel Prediction Input Schema', () => {
    it('should validate valid prediction_id', () => {
      const result = CANCEL_PREDICTION_TOOL_SCHEMA.safeParse({
        prediction_id: 'pred_test123456789',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty prediction_id', () => {
      const result = CANCEL_PREDICTION_TOOL_SCHEMA.safeParse({
        prediction_id: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Generate Async Input Schema', () => {
    it('should validate minimal input', () => {
      const result = GENERATE_ASYNC_TOOL_SCHEMA.safeParse({
        prompt: 'A sunset',
      });
      expect(result.success).toBe(true);
    });

    it('should validate webhook_url', () => {
      const result = GENERATE_ASYNC_TOOL_SCHEMA.safeParse({
        prompt: 'A sunset',
        webhook_url: 'https://example.com/webhook',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid webhook_url', () => {
      const result = GENERATE_ASYNC_TOOL_SCHEMA.safeParse({
        prompt: 'A sunset',
        webhook_url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Edge Cases and Integration Tests
// =============================================================================

// =============================================================================
// ideogram_describe Tool Tests
// =============================================================================

describe('ideogram_describe Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDescribeHandler();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Constants', () => {
    it('should export correct tool name', () => {
      expect(DESCRIBE_TOOL_NAME).toBe('ideogram_describe');
    });

    it('should export non-empty tool description', () => {
      expect(DESCRIBE_TOOL_DESCRIPTION).toBeDefined();
      expect(DESCRIBE_TOOL_DESCRIPTION.length).toBeGreaterThan(50);
    });

    it('should export valid tool schema', () => {
      expect(DESCRIBE_TOOL_SCHEMA).toBeDefined();
    });

    it('should export complete tool definition', () => {
      expect(ideogramDescribeTool.name).toBe(DESCRIBE_TOOL_NAME);
      expect(ideogramDescribeTool.description).toBe(DESCRIBE_TOOL_DESCRIPTION);
      expect(ideogramDescribeTool.schema).toBe(DESCRIBE_TOOL_SCHEMA);
      expect(ideogramDescribeTool.handler).toBe(ideogramDescribe);
    });
  });

  describe('createDescribeHandler', () => {
    it('should create handler with default options', () => {
      const handler = createDescribeHandler();
      expect(handler).toBeInstanceOf(Function);
    });

    it('should create handler with custom client', () => {
      const mockClient = {
        describe: vi.fn().mockResolvedValue(createMockDescribeResponse()),
      };
      const handler = createDescribeHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
      });
      expect(handler).toBeInstanceOf(Function);
    });

    it('should create handler with custom logger', () => {
      const mockLogger = createMockLogger();
      const handler = createDescribeHandler({ logger: mockLogger });
      expect(handler).toBeInstanceOf(Function);
    });
  });

  describe('Describe Handler Execution', () => {
    it('should successfully describe image with default options', async () => {
      const mockClient = {
        describe: vi.fn().mockResolvedValue(createMockDescribeResponse(2)),
      };

      const handler = createDescribeHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        logger: createMockLogger(),
      });

      const result = await handler({
        image: 'https://example.com/photo.jpg',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.descriptions).toHaveLength(2);
        expect(result.descriptions[0]?.text).toContain('Description');
      }
      expect(mockClient.describe).toHaveBeenCalledWith(
        expect.objectContaining({
          image: 'https://example.com/photo.jpg',
        })
      );
    });

    it('should pass describe_model_version to client', async () => {
      const mockClient = {
        describe: vi.fn().mockResolvedValue(createMockDescribeResponse(1)),
      };

      const handler = createDescribeHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        logger: createMockLogger(),
      });

      await handler({
        image: 'https://example.com/photo.jpg',
        describe_model_version: 'V_2',
      });

      expect(mockClient.describe).toHaveBeenCalledWith(
        expect.objectContaining({
          image: 'https://example.com/photo.jpg',
          describeModelVersion: 'V_2',
        })
      );
    });

    it('should handle client errors gracefully', async () => {
      const mockClient = {
        describe: vi.fn().mockRejectedValue(new Error('Describe API Error')),
      };

      const handler = createDescribeHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        logger: createMockLogger(),
      });

      const result = await handler({
        image: 'https://example.com/photo.jpg',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error_code).toBeDefined();
        expect(result.user_message).toBeDefined();
      }
    });
  });
});

// =============================================================================
// ideogram_upscale Tool Tests
// =============================================================================

describe('ideogram_upscale Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetUpscaleHandler();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Constants', () => {
    it('should export correct tool name', () => {
      expect(UPSCALE_TOOL_NAME).toBe('ideogram_upscale');
    });

    it('should export non-empty tool description', () => {
      expect(UPSCALE_TOOL_DESCRIPTION).toBeDefined();
      expect(UPSCALE_TOOL_DESCRIPTION.length).toBeGreaterThan(50);
    });

    it('should export valid tool schema', () => {
      expect(UPSCALE_TOOL_SCHEMA).toBeDefined();
    });

    it('should export complete tool definition', () => {
      expect(ideogramUpscaleTool.name).toBe(UPSCALE_TOOL_NAME);
      expect(ideogramUpscaleTool.description).toBe(UPSCALE_TOOL_DESCRIPTION);
      expect(ideogramUpscaleTool.schema).toBe(UPSCALE_TOOL_SCHEMA);
      expect(ideogramUpscaleTool.handler).toBe(ideogramUpscale);
    });
  });

  describe('Upscale Handler Execution', () => {
    it('should successfully upscale image with minimal input', async () => {
      const mockClient = {
        upscale: vi.fn().mockResolvedValue(createMockGenerateResponse(1)),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createUpscaleHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        image: 'https://example.com/photo.jpg',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.images).toHaveLength(1);
        expect(result.num_images).toBe(1);
        expect(result.total_cost).toBeDefined();
      }
      expect(mockClient.upscale).toHaveBeenCalledWith(
        expect.objectContaining({
          image: 'https://example.com/photo.jpg',
        })
      );
    });

    it('should pass all optional parameters to client', async () => {
      const mockClient = {
        upscale: vi.fn().mockResolvedValue(createMockGenerateResponse(2)),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createUpscaleHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      await handler({
        image: 'https://example.com/photo.jpg',
        prompt: 'High detail landscape',
        resemblance: 70,
        detail: 80,
        magic_prompt: 'ON',
        num_images: 2,
        seed: 12345,
        save_locally: false,
      });

      expect(mockClient.upscale).toHaveBeenCalledWith(
        expect.objectContaining({
          image: 'https://example.com/photo.jpg',
          prompt: 'High detail landscape',
          resemblance: 70,
          detail: 80,
          magicPrompt: 'ON',
          numImages: 2,
          seed: 12345,
        })
      );
    });

    it('should save images locally when enabled', async () => {
      const mockResponse = createMockGenerateResponse(1);
      const mockClient = {
        upscale: vi.fn().mockResolvedValue(mockResponse),
      };
      const mockStorage = createMockStorageWithBehavior(true);

      const handler = createUpscaleHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        image: 'https://example.com/photo.jpg',
        save_locally: true,
      });

      expect(result.success).toBe(true);
      expect(mockStorage.downloadImages).toHaveBeenCalled();
    });

    it('should handle client errors gracefully', async () => {
      const mockClient = {
        upscale: vi.fn().mockRejectedValue(new Error('Upscale API Error')),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createUpscaleHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        image: 'https://example.com/photo.jpg',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error_code).toBeDefined();
        expect(result.user_message).toBeDefined();
      }
    });
  });
});

// =============================================================================
// ideogram_remix Tool Tests
// =============================================================================

describe('ideogram_remix Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRemixHandler();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Constants', () => {
    it('should export correct tool name', () => {
      expect(REMIX_TOOL_NAME).toBe('ideogram_remix');
    });

    it('should export non-empty tool description', () => {
      expect(REMIX_TOOL_DESCRIPTION).toBeDefined();
      expect(REMIX_TOOL_DESCRIPTION.length).toBeGreaterThan(50);
    });

    it('should export valid tool schema', () => {
      expect(REMIX_TOOL_SCHEMA).toBeDefined();
    });

    it('should export complete tool definition', () => {
      expect(ideogramRemixTool.name).toBe(REMIX_TOOL_NAME);
      expect(ideogramRemixTool.description).toBe(REMIX_TOOL_DESCRIPTION);
      expect(ideogramRemixTool.schema).toBe(REMIX_TOOL_SCHEMA);
      expect(ideogramRemixTool.handler).toBe(ideogramRemix);
    });
  });

  describe('Remix Handler Execution', () => {
    it('should successfully remix image with minimal input', async () => {
      const mockClient = {
        remix: vi.fn().mockResolvedValue(createMockGenerateResponse(1)),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createRemixHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        image: 'https://example.com/photo.jpg',
        prompt: 'Transform into watercolor',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.images).toHaveLength(1);
        expect(result.num_images).toBe(1);
        expect(result.total_cost).toBeDefined();
      }
      expect(mockClient.remix).toHaveBeenCalledWith(
        expect.objectContaining({
          image: 'https://example.com/photo.jpg',
          prompt: 'Transform into watercolor',
        })
      );
    });

    it('should pass all optional parameters to client', async () => {
      const mockClient = {
        remix: vi.fn().mockResolvedValue(createMockGenerateResponse(4)),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createRemixHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      await handler({
        image: 'https://example.com/photo.jpg',
        prompt: 'Cyberpunk style',
        image_weight: 60,
        negative_prompt: 'blur',
        aspect_ratio: '16x9',
        num_images: 4,
        seed: 42,
        rendering_speed: 'QUALITY',
        magic_prompt: 'ON',
        style_type: 'FICTION',
        save_locally: false,
      });

      expect(mockClient.remix).toHaveBeenCalledWith(
        expect.objectContaining({
          image: 'https://example.com/photo.jpg',
          prompt: 'Cyberpunk style',
          imageWeight: 60,
          negativePrompt: 'blur',
          aspectRatio: '16x9',
          numImages: 4,
          seed: 42,
          renderingSpeed: 'QUALITY',
          magicPrompt: 'ON',
          styleType: 'FICTION',
        })
      );
    });

    it('should save images locally when enabled', async () => {
      const mockResponse = createMockGenerateResponse(1);
      const mockClient = {
        remix: vi.fn().mockResolvedValue(mockResponse),
      };
      const mockStorage = createMockStorageWithBehavior(true);

      const handler = createRemixHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        image: 'https://example.com/photo.jpg',
        prompt: 'Remix this',
        save_locally: true,
      });

      expect(result.success).toBe(true);
      expect(mockStorage.downloadImages).toHaveBeenCalled();
    });

    it('should handle client errors gracefully', async () => {
      const mockClient = {
        remix: vi.fn().mockRejectedValue(new Error('Remix API Error')),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createRemixHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        image: 'https://example.com/photo.jpg',
        prompt: 'Remix this',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error_code).toBeDefined();
        expect(result.user_message).toBeDefined();
      }
    });
  });
});

// =============================================================================
// ideogram_reframe Tool Tests
// =============================================================================

describe('ideogram_reframe Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetReframeHandler();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Constants', () => {
    it('should export correct tool name', () => {
      expect(REFRAME_TOOL_NAME).toBe('ideogram_reframe');
    });

    it('should export non-empty tool description', () => {
      expect(REFRAME_TOOL_DESCRIPTION).toBeDefined();
      expect(REFRAME_TOOL_DESCRIPTION.length).toBeGreaterThan(50);
    });

    it('should export valid tool schema', () => {
      expect(REFRAME_TOOL_SCHEMA).toBeDefined();
    });

    it('should export complete tool definition', () => {
      expect(ideogramReframeTool.name).toBe(REFRAME_TOOL_NAME);
      expect(ideogramReframeTool.description).toBe(REFRAME_TOOL_DESCRIPTION);
      expect(ideogramReframeTool.schema).toBe(REFRAME_TOOL_SCHEMA);
      expect(ideogramReframeTool.handler).toBe(ideogramReframe);
    });
  });

  describe('Reframe Handler Execution', () => {
    it('should successfully reframe image with minimal input', async () => {
      const mockClient = {
        reframe: vi.fn().mockResolvedValue(createMockGenerateResponse(1)),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createReframeHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        image: 'https://example.com/photo.jpg',
        resolution: 'RESOLUTION_1024_768',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.images).toHaveLength(1);
        expect(result.num_images).toBe(1);
        expect(result.total_cost).toBeDefined();
      }
      expect(mockClient.reframe).toHaveBeenCalledWith(
        expect.objectContaining({
          image: 'https://example.com/photo.jpg',
          resolution: 'RESOLUTION_1024_768',
        })
      );
    });

    it('should pass all optional parameters to client', async () => {
      const mockClient = {
        reframe: vi.fn().mockResolvedValue(createMockGenerateResponse(3)),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createReframeHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      await handler({
        image: 'https://example.com/photo.jpg',
        resolution: 'RESOLUTION_1920_1080',
        num_images: 3,
        seed: 99999,
        rendering_speed: 'QUALITY',
        save_locally: false,
      });

      expect(mockClient.reframe).toHaveBeenCalledWith(
        expect.objectContaining({
          image: 'https://example.com/photo.jpg',
          resolution: 'RESOLUTION_1920_1080',
          numImages: 3,
          seed: 99999,
          renderingSpeed: 'QUALITY',
        })
      );
    });

    it('should save images locally when enabled', async () => {
      const mockResponse = createMockGenerateResponse(1);
      const mockClient = {
        reframe: vi.fn().mockResolvedValue(mockResponse),
      };
      const mockStorage = createMockStorageWithBehavior(true);

      const handler = createReframeHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        image: 'https://example.com/photo.jpg',
        resolution: 'RESOLUTION_1024_768',
        save_locally: true,
      });

      expect(result.success).toBe(true);
      expect(mockStorage.downloadImages).toHaveBeenCalled();
    });

    it('should handle client errors gracefully', async () => {
      const mockClient = {
        reframe: vi.fn().mockRejectedValue(new Error('Reframe API Error')),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createReframeHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        image: 'https://example.com/photo.jpg',
        resolution: 'RESOLUTION_1024_768',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error_code).toBeDefined();
        expect(result.user_message).toBeDefined();
      }
    });
  });
});

// =============================================================================
// ideogram_replace_background Tool Tests
// =============================================================================

describe('ideogram_replace_background Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetReplaceBackgroundHandler();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Constants', () => {
    it('should export correct tool name', () => {
      expect(REPLACE_BACKGROUND_TOOL_NAME).toBe('ideogram_replace_background');
    });

    it('should export non-empty tool description', () => {
      expect(REPLACE_BACKGROUND_TOOL_DESCRIPTION).toBeDefined();
      expect(REPLACE_BACKGROUND_TOOL_DESCRIPTION.length).toBeGreaterThan(50);
    });

    it('should export valid tool schema', () => {
      expect(REPLACE_BACKGROUND_TOOL_SCHEMA).toBeDefined();
    });

    it('should export complete tool definition', () => {
      expect(ideogramReplaceBackgroundTool.name).toBe(REPLACE_BACKGROUND_TOOL_NAME);
      expect(ideogramReplaceBackgroundTool.description).toBe(REPLACE_BACKGROUND_TOOL_DESCRIPTION);
      expect(ideogramReplaceBackgroundTool.schema).toBe(REPLACE_BACKGROUND_TOOL_SCHEMA);
      expect(ideogramReplaceBackgroundTool.handler).toBe(ideogramReplaceBackground);
    });
  });

  describe('Replace Background Handler Execution', () => {
    it('should successfully replace background with minimal input', async () => {
      const mockClient = {
        replaceBackground: vi.fn().mockResolvedValue(createMockGenerateResponse(1)),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createReplaceBackgroundHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        image: 'https://example.com/portrait.jpg',
        prompt: 'A tropical beach at sunset',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.images).toHaveLength(1);
        expect(result.num_images).toBe(1);
        expect(result.total_cost).toBeDefined();
      }
      expect(mockClient.replaceBackground).toHaveBeenCalledWith(
        expect.objectContaining({
          image: 'https://example.com/portrait.jpg',
          prompt: 'A tropical beach at sunset',
        })
      );
    });

    it('should pass all optional parameters to client', async () => {
      const mockClient = {
        replaceBackground: vi.fn().mockResolvedValue(createMockGenerateResponse(4)),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createReplaceBackgroundHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      await handler({
        image: 'https://example.com/portrait.jpg',
        prompt: 'Futuristic city',
        magic_prompt: 'ON',
        num_images: 4,
        seed: 77777,
        rendering_speed: 'QUALITY',
        save_locally: false,
      });

      expect(mockClient.replaceBackground).toHaveBeenCalledWith(
        expect.objectContaining({
          image: 'https://example.com/portrait.jpg',
          prompt: 'Futuristic city',
          magicPrompt: 'ON',
          numImages: 4,
          seed: 77777,
          renderingSpeed: 'QUALITY',
        })
      );
    });

    it('should save images locally when enabled', async () => {
      const mockResponse = createMockGenerateResponse(1);
      const mockClient = {
        replaceBackground: vi.fn().mockResolvedValue(mockResponse),
      };
      const mockStorage = createMockStorageWithBehavior(true);

      const handler = createReplaceBackgroundHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        image: 'https://example.com/portrait.jpg',
        prompt: 'Beach background',
        save_locally: true,
      });

      expect(result.success).toBe(true);
      expect(mockStorage.downloadImages).toHaveBeenCalled();
    });

    it('should handle client errors gracefully', async () => {
      const mockClient = {
        replaceBackground: vi.fn().mockRejectedValue(new Error('Replace BG API Error')),
      };
      const mockStorage = createMockStorageWithBehavior(false);

      const handler = createReplaceBackgroundHandler({
        client: mockClient as unknown as ReturnType<typeof createIdeogramClient>,
        storage: mockStorage as unknown as ReturnType<typeof createStorageService>,
        logger: createMockLogger(),
      });

      const result = await handler({
        image: 'https://example.com/portrait.jpg',
        prompt: 'Beach background',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error_code).toBeDefined();
        expect(result.user_message).toBeDefined();
      }
    });
  });
});

// =============================================================================
// Schema Validation Tests
// =============================================================================

describe('Tool Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGenerateHandler();
    resetEditHandler();
    resetGenerateAsyncHandler();
    resetGetPredictionHandler();
    resetCancelPredictionHandler();
    resetDescribeHandler();
    resetUpscaleHandler();
    resetRemixHandler();
    resetReframeHandler();
    resetReplaceBackgroundHandler();
  });

  describe('Long prompts', () => {
    it('should accept prompts up to 10000 characters', () => {
      const longPrompt = 'A'.repeat(10000);
      const result = GENERATE_TOOL_SCHEMA.safeParse({ prompt: longPrompt });
      expect(result.success).toBe(true);
    });

    it('should reject prompts over 10000 characters', () => {
      const tooLongPrompt = 'A'.repeat(10001);
      const result = GENERATE_TOOL_SCHEMA.safeParse({ prompt: tooLongPrompt });
      expect(result.success).toBe(false);
    });
  });

  describe('Seed values', () => {
    it('should accept minimum seed (0)', () => {
      const result = GENERATE_TOOL_SCHEMA.safeParse({
        prompt: 'test',
        seed: 0,
      });
      expect(result.success).toBe(true);
    });

    it('should accept maximum seed (2147483647)', () => {
      const result = GENERATE_TOOL_SCHEMA.safeParse({
        prompt: 'test',
        seed: 2147483647,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative seed', () => {
      const result = GENERATE_TOOL_SCHEMA.safeParse({
        prompt: 'test',
        seed: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject seed over max value', () => {
      const result = GENERATE_TOOL_SCHEMA.safeParse({
        prompt: 'test',
        seed: 2147483648,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Edit rendering_speed', () => {
    it('should accept FLASH rendering_speed', () => {
      const result = EDIT_TOOL_SCHEMA.safeParse({
        prompt: 'Edit this',
        image: 'https://example.com/image.png',
        mask: 'https://example.com/mask.png',
        rendering_speed: 'FLASH',
      });
      expect(result.success).toBe(true);
    });

    it('should accept QUALITY rendering_speed', () => {
      const result = EDIT_TOOL_SCHEMA.safeParse({
        prompt: 'Edit this',
        image: 'https://example.com/image.png',
        mask: 'https://example.com/mask.png',
        rendering_speed: 'QUALITY',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid rendering_speed', () => {
      const result = EDIT_TOOL_SCHEMA.safeParse({
        prompt: 'Edit this',
        image: 'https://example.com/image.png',
        mask: 'https://example.com/mask.png',
        rendering_speed: 'INVALID',
      });
      expect(result.success).toBe(false);
    });
  });
});
