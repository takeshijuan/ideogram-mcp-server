/**
 * Vitest Test Setup
 *
 * This file runs before all tests and provides:
 * - Global test utilities
 * - Environment variable mocking
 * - Custom matchers
 * - Global hooks
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// =============================================================================
// Environment Configuration
// =============================================================================

/**
 * Set up test environment variables.
 * These values are used by default in tests unless explicitly overridden.
 */
beforeAll(() => {
  // Set test API key for tests that need it
  process.env['IDEOGRAM_API_KEY'] = 'test-api-key-for-testing';
  process.env['LOG_LEVEL'] = 'error'; // Minimize logging during tests
  process.env['ENABLE_LOCAL_SAVE'] = 'false'; // Disable file operations by default
  process.env['LOCAL_SAVE_DIR'] = '/tmp/ideogram-test-images';
  process.env['MAX_CONCURRENT_REQUESTS'] = '3';
  process.env['REQUEST_TIMEOUT_MS'] = '10000';
});

// =============================================================================
// Mock Cleanup
// =============================================================================

/**
 * Clean up after each test to ensure test isolation.
 */
afterEach(() => {
  // Clear all mocks
  vi.clearAllMocks();

  // Restore all mocked timers if any were used
  vi.useRealTimers();
});

/**
 * Final cleanup after all tests complete.
 */
afterAll(() => {
  // Restore all mocks
  vi.restoreAllMocks();
});

// =============================================================================
// Global Test Utilities
// =============================================================================

/**
 * Creates a mock API response for successful image generation.
 */
export function createMockGenerateResponse(overrides?: Record<string, unknown>) {
  return {
    created: new Date().toISOString(),
    data: [
      {
        url: 'https://ideogram.ai/api/images/test-image-123.png',
        prompt: 'test prompt',
        resolution: '1024x1024',
        is_image_safe: true,
        seed: 12345,
      },
    ],
    ...overrides,
  };
}

/**
 * Creates a mock API error response.
 */
export function createMockErrorResponse(
  message: string,
  statusCode: number,
  details?: Record<string, unknown>
) {
  return {
    message,
    statusCode,
    details,
  };
}

/**
 * Creates a mock prediction for async testing.
 */
export function createMockPrediction(
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' = 'queued',
  overrides?: Record<string, unknown>
) {
  const base = {
    id: `pred_${Date.now()}`,
    status,
    created_at: new Date().toISOString(),
    progress: status === 'completed' ? 100 : status === 'processing' ? 50 : 0,
  };

  if (status === 'completed') {
    return {
      ...base,
      output: createMockGenerateResponse(),
      completed_at: new Date().toISOString(),
      ...overrides,
    };
  }

  if (status === 'failed') {
    return {
      ...base,
      error: 'Test error message',
      ...overrides,
    };
  }

  return { ...base, ...overrides };
}

/**
 * Waits for a specified amount of time.
 * Useful for testing async operations.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a mock Axios response object.
 */
export function createMockAxiosResponse<T>(data: T, status = 200) {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config: {} as Record<string, unknown>,
  };
}

/**
 * Creates a mock Axios error object.
 */
export function createMockAxiosError(
  message: string,
  status?: number,
  data?: unknown,
  code?: string
) {
  const error = new Error(message) as Error & {
    response?: { status: number; data: unknown };
    code?: string;
  };
  error.name = 'AxiosError';

  if (status !== undefined) {
    error.response = { status, data };
  }

  if (code) {
    error.code = code;
  }

  return error;
}

// =============================================================================
// Type Declarations for Global Test Utilities
// =============================================================================

declare global {
  // Make vitest globals available
  // eslint-disable-next-line no-var
  var __TEST_UTILS__: {
    createMockGenerateResponse: typeof createMockGenerateResponse;
    createMockErrorResponse: typeof createMockErrorResponse;
    createMockPrediction: typeof createMockPrediction;
    createMockAxiosResponse: typeof createMockAxiosResponse;
    createMockAxiosError: typeof createMockAxiosError;
    delay: typeof delay;
  };
}

// Expose utilities globally for convenience
globalThis.__TEST_UTILS__ = {
  createMockGenerateResponse,
  createMockErrorResponse,
  createMockPrediction,
  createMockAxiosResponse,
  createMockAxiosError,
  delay,
};
