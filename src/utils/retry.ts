/**
 * Retry Logic with Exponential Backoff
 *
 * Provides robust retry functionality for transient errors including:
 * - Exponential backoff delay calculation with jitter
 * - Configurable retry options (max attempts, delays, backoff multiplier)
 * - Integration with retryable error detection
 * - Rate limit header handling (Retry-After)
 * - Structured logging of retry attempts
 */

import type { Logger } from 'pino';
import { RETRY_CONFIG, RETRYABLE_STATUS_CODES } from '../config/constants.js';
import {
  isIdeogramMCPError,
  isRetryableError,
  extractRetryAfter,
} from './error.handler.js';
import { createChildLogger } from './logger.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for retry behavior.
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts (not including the initial attempt).
   * @default RETRY_CONFIG.MAX_ATTEMPTS (3)
   */
  maxAttempts?: number;

  /**
   * Initial delay in milliseconds before the first retry.
   * @default RETRY_CONFIG.INITIAL_DELAY_MS (1000)
   */
  initialDelayMs?: number;

  /**
   * Maximum delay in milliseconds between retries.
   * @default RETRY_CONFIG.MAX_DELAY_MS (10000)
   */
  maxDelayMs?: number;

  /**
   * Multiplier applied to the delay for each subsequent retry.
   * @default RETRY_CONFIG.BACKOFF_MULTIPLIER (2)
   */
  backoffMultiplier?: number;

  /**
   * Whether to add random jitter to delays to prevent thundering herd.
   * @default true
   */
  jitter?: boolean;

  /**
   * Custom function to determine if an error is retryable.
   * If not provided, uses the default isRetryableError function.
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;

  /**
   * Logger instance for logging retry attempts.
   * If not provided, uses a child logger from the main logger.
   */
  logger?: Logger;

  /**
   * Optional callback invoked before each retry attempt.
   * Useful for logging or metrics.
   */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;

  /**
   * Operation name for logging purposes.
   * @default 'operation'
   */
  operationName?: string;
}

/**
 * Result of a retry operation, including metadata about attempts.
 */
export interface RetryResult<T> {
  /**
   * Whether the operation eventually succeeded.
   */
  success: boolean;

  /**
   * The result value if successful, undefined otherwise.
   */
  result?: T;

  /**
   * The final error if all attempts failed.
   */
  error?: unknown;

  /**
   * Total number of attempts made (including initial).
   */
  attempts: number;

  /**
   * Total time spent across all attempts in milliseconds.
   */
  totalTimeMs: number;
}

/**
 * Context passed to the operation function on each attempt.
 */
export interface RetryContext {
  /**
   * The current attempt number (1-indexed).
   */
  attempt: number;

  /**
   * Maximum attempts allowed.
   */
  maxAttempts: number;

  /**
   * Whether this is a retry (not the first attempt).
   */
  isRetry: boolean;
}

// =============================================================================
// Exponential Backoff Calculation
// =============================================================================

/**
 * Calculates the delay for an exponential backoff retry.
 *
 * The delay is calculated as: initialDelay * (multiplier ^ attempt)
 * A random jitter of ±25% can be added to prevent thundering herd.
 *
 * @param attempt - The current retry attempt number (0-indexed)
 * @param options - Configuration options for the calculation
 * @returns The delay in milliseconds
 *
 * @example
 * ```typescript
 * // First retry: ~1000ms, second: ~2000ms, third: ~4000ms
 * const delay1 = exponentialBackoff(0); // ~1000ms
 * const delay2 = exponentialBackoff(1); // ~2000ms
 * const delay3 = exponentialBackoff(2); // ~4000ms
 * ```
 */
export function exponentialBackoff(
  attempt: number,
  options: Pick<RetryOptions, 'initialDelayMs' | 'maxDelayMs' | 'backoffMultiplier' | 'jitter'> = {}
): number {
  const {
    initialDelayMs = RETRY_CONFIG.INITIAL_DELAY_MS,
    maxDelayMs = RETRY_CONFIG.MAX_DELAY_MS,
    backoffMultiplier = RETRY_CONFIG.BACKOFF_MULTIPLIER,
    jitter = true,
  } = options;

  // Calculate base delay with exponential growth
  const baseDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);

  // Apply jitter (±25% randomization) if enabled
  let delay = baseDelay;
  if (jitter) {
    const jitterFactor = 0.75 + Math.random() * 0.5; // 0.75 to 1.25
    delay = baseDelay * jitterFactor;
  }

  // Clamp to maximum delay
  return Math.min(Math.round(delay), maxDelayMs);
}

/**
 * Calculates the delay considering Retry-After header from rate limit responses.
 *
 * If a Retry-After header is present, it takes precedence over exponential backoff.
 *
 * @param attempt - The current retry attempt number (0-indexed)
 * @param headers - Optional response headers that may contain Retry-After
 * @param options - Configuration options for exponential backoff fallback
 * @returns The delay in milliseconds
 */
export function calculateRetryDelay(
  attempt: number,
  headers?: Record<string, string>,
  options: Pick<RetryOptions, 'initialDelayMs' | 'maxDelayMs' | 'backoffMultiplier' | 'jitter'> = {}
): number {
  // Check for Retry-After header first
  const retryAfterSeconds = extractRetryAfter(headers);
  if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) {
    const retryAfterMs = retryAfterSeconds * 1000;
    // Still respect maxDelay even for Retry-After
    const maxDelayMs = options.maxDelayMs ?? RETRY_CONFIG.MAX_DELAY_MS;
    return Math.min(retryAfterMs, maxDelayMs);
  }

  // Fall back to exponential backoff
  return exponentialBackoff(attempt, options);
}

// =============================================================================
// Retry Wrapper Function
// =============================================================================

/**
 * Executes an async operation with automatic retry on transient failures.
 *
 * Features:
 * - Exponential backoff between retries
 * - Automatic detection of retryable errors
 * - Rate limit header handling
 * - Structured logging of retry attempts
 * - Customizable retry behavior
 *
 * @param operation - The async function to execute
 * @param options - Configuration options for retry behavior
 * @returns Promise resolving to the operation result or throwing the final error
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await withRetry(async () => {
 *   return await fetchDataFromApi();
 * });
 *
 * // With custom options
 * const result = await withRetry(
 *   async (context) => {
 *     console.log(`Attempt ${context.attempt} of ${context.maxAttempts}`);
 *     return await fetchDataFromApi();
 *   },
 *   {
 *     maxAttempts: 5,
 *     initialDelayMs: 500,
 *     operationName: 'API fetch',
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: (context: RetryContext) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = RETRY_CONFIG.MAX_ATTEMPTS,
    initialDelayMs = RETRY_CONFIG.INITIAL_DELAY_MS,
    maxDelayMs = RETRY_CONFIG.MAX_DELAY_MS,
    backoffMultiplier = RETRY_CONFIG.BACKOFF_MULTIPLIER,
    jitter = true,
    shouldRetry = defaultShouldRetry,
    logger: customLogger,
    onRetry,
    operationName = 'operation',
  } = options;

  const log = customLogger ?? createChildLogger('ideogram-client');
  const totalAttempts = maxAttempts + 1; // Include initial attempt

  let lastError: unknown;
  let lastHeaders: Record<string, string> | undefined;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    const context: RetryContext = {
      attempt,
      maxAttempts: totalAttempts,
      isRetry: attempt > 1,
    };

    try {
      const result = await operation(context);

      // Log success after retries
      if (attempt > 1) {
        log.info(
          { operation: operationName, attempt, totalAttempts },
          'Operation succeeded after retry'
        );
      }

      return result;
    } catch (error) {
      lastError = error;

      // Extract headers from error if available (for rate limit handling)
      lastHeaders = extractHeadersFromError(error);

      // Check if we should retry
      const canRetry = attempt < totalAttempts && shouldRetry(error, attempt);

      if (!canRetry) {
        // No more retries - log and throw
        log.warn(
          {
            operation: operationName,
            attempt,
            totalAttempts,
            error: formatErrorForLog(error),
            willRetry: false,
          },
          `Operation failed after ${attempt} attempt(s)`
        );
        throw error;
      }

      // Calculate delay for next retry
      const delayMs = calculateRetryDelay(attempt - 1, lastHeaders, {
        initialDelayMs,
        maxDelayMs,
        backoffMultiplier,
        jitter,
      });

      // Log retry attempt
      log.debug(
        {
          operation: operationName,
          attempt,
          totalAttempts,
          error: formatErrorForLog(error),
          delayMs,
          willRetry: true,
        },
        `Retrying ${operationName} after ${delayMs}ms`
      );

      // Invoke optional callback
      if (onRetry) {
        onRetry(error, attempt, delayMs);
      }

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Executes an async operation with retry, returning detailed result information.
 *
 * Unlike `withRetry`, this function never throws and instead returns a result
 * object indicating success or failure with metadata about the attempts.
 *
 * @param operation - The async function to execute
 * @param options - Configuration options for retry behavior
 * @returns Promise resolving to a RetryResult with success status and metadata
 *
 * @example
 * ```typescript
 * const { success, result, error, attempts, totalTimeMs } = await withRetryResult(
 *   async () => fetchDataFromApi(),
 *   { operationName: 'API fetch' }
 * );
 *
 * if (success) {
 *   console.log(`Got result after ${attempts} attempts`);
 * } else {
 *   console.error(`Failed after ${attempts} attempts: ${error}`);
 * }
 * ```
 */
export async function withRetryResult<T>(
  operation: (context: RetryContext) => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let attempts = 0;

  // Wrap the operation to track attempts
  const trackedOperation = async (context: RetryContext): Promise<T> => {
    attempts = context.attempt;
    return operation(context);
  };

  try {
    const result = await withRetry(trackedOperation, options);
    return {
      success: true,
      result,
      attempts,
      totalTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error,
      attempts,
      totalTimeMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Default function to determine if an error should trigger a retry.
 *
 * An error is retryable if:
 * - It's an IdeogramMCPError marked as retryable
 * - It's a network error (no response)
 * - The HTTP status code is in the retryable list (429, 500, 503)
 */
function defaultShouldRetry(error: unknown, _attempt: number): boolean {
  // Use the centralized retryable error detection
  if (isRetryableError(error)) {
    return true;
  }

  // Check if it's an Axios-like error with retryable status
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    // No response usually means network error - retryable
    if ('response' in err && err['response'] === undefined) {
      // Check for specific network error codes
      const code = 'code' in err ? (err['code'] as string) : undefined;
      if (
        code === 'ECONNRESET' ||
        code === 'ECONNREFUSED' ||
        code === 'ETIMEDOUT' ||
        code === 'ENOTFOUND' ||
        code === 'EAI_AGAIN'
      ) {
        return true;
      }
    }

    // Check response status code
    if ('response' in err && typeof err['response'] === 'object' && err['response'] !== null) {
      const response = err['response'] as Record<string, unknown>;
      const status = response['status'];
      if (typeof status === 'number' && RETRYABLE_STATUS_CODES.includes(status)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extracts response headers from an error object if available.
 * Used to get Retry-After header from rate limit responses.
 */
function extractHeadersFromError(error: unknown): Record<string, string> | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const err = error as Record<string, unknown>;

  // Check for Axios-like error structure
  if ('response' in err && typeof err['response'] === 'object' && err['response'] !== null) {
    const response = err['response'] as Record<string, unknown>;
    if ('headers' in response && typeof response['headers'] === 'object') {
      return response['headers'] as Record<string, string>;
    }
  }

  // Check for IdeogramMCPError with details containing headers
  if (isIdeogramMCPError(error) && error.details) {
    if ('headers' in error.details && typeof error.details['headers'] === 'object') {
      return error.details['headers'] as Record<string, string>;
    }
  }

  return undefined;
}

/**
 * Formats an error for safe logging.
 */
function formatErrorForLog(error: unknown): Record<string, unknown> {
  if (isIdeogramMCPError(error)) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      retryable: error.retryable,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return { error: String(error) };
}

/**
 * Sleeps for the specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Creates a retry wrapper with pre-configured options.
 *
 * Useful when you want to reuse the same retry configuration across
 * multiple operations.
 *
 * @param defaultOptions - Default options to use for all retries
 * @returns A withRetry function with the default options pre-applied
 *
 * @example
 * ```typescript
 * const retryApiCall = createRetryWrapper({
 *   maxAttempts: 5,
 *   initialDelayMs: 500,
 * });
 *
 * const result = await retryApiCall(async () => fetchData());
 * ```
 */
export function createRetryWrapper(defaultOptions: RetryOptions) {
  return async function <T>(
    operation: (context: RetryContext) => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    return withRetry(operation, { ...defaultOptions, ...options });
  };
}

/**
 * Checks if an HTTP status code indicates a retryable error.
 *
 * @param statusCode - The HTTP status code to check
 * @returns true if the status code is retryable
 */
export function isRetryableStatusCode(statusCode: number): boolean {
  return RETRYABLE_STATUS_CODES.includes(statusCode);
}

/**
 * Calculates the total time that could be spent retrying with exponential backoff.
 *
 * Useful for setting timeouts or providing estimates to users.
 *
 * @param options - Retry configuration options
 * @returns The maximum total delay in milliseconds across all retries
 */
export function calculateMaxTotalDelay(options: RetryOptions = {}): number {
  const {
    maxAttempts = RETRY_CONFIG.MAX_ATTEMPTS,
    initialDelayMs = RETRY_CONFIG.INITIAL_DELAY_MS,
    maxDelayMs = RETRY_CONFIG.MAX_DELAY_MS,
    backoffMultiplier = RETRY_CONFIG.BACKOFF_MULTIPLIER,
  } = options;

  let totalDelay = 0;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt);
    totalDelay += Math.min(delay, maxDelayMs);
  }

  return totalDelay;
}
