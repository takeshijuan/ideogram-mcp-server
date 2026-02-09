/**
 * API Constants and Configuration
 *
 * This file contains all constant values for the Ideogram MCP Server including:
 * - API endpoint URLs
 * - Enum value arrays for validation
 * - Default values for optional parameters
 * - Validation constraints
 * - Cost estimation data
 */

import type {
  AspectRatio,
  RenderingSpeed,
  MagicPrompt,
  StyleType,
  Model,
  PredictionStatus,
} from '../types/api.types.js';

// =============================================================================
// API Configuration
// =============================================================================

/**
 * Ideogram API base URL
 */
export const API_BASE_URL = 'https://api.ideogram.ai' as const;

/**
 * API endpoints for different operations
 */
export const API_ENDPOINTS = {
  /** V3 Generate endpoint */
  GENERATE_V3: '/v1/ideogram-v3/generate',
  /** Legacy Edit endpoint (inpainting only) */
  EDIT_LEGACY: '/edit',
  /** Legacy V2 Generate endpoint */
  GENERATE_LEGACY: '/generate',
} as const;

/**
 * API header name for authentication
 */
export const API_KEY_HEADER = 'Api-Key' as const;

// =============================================================================
// Enum Value Arrays
// =============================================================================

/**
 * All 15 supported aspect ratios.
 * Note: Uses "x" separator, not ":" (e.g., "16x9" not "16:9")
 */
export const ASPECT_RATIOS: readonly AspectRatio[] = [
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
] as const;

/**
 * Rendering speed options for Ideogram V3.
 * Ordered from fastest (lowest quality) to slowest (highest quality).
 */
export const RENDERING_SPEEDS: readonly RenderingSpeed[] = [
  'FLASH',
  'TURBO',
  'DEFAULT',
  'QUALITY',
] as const;

/**
 * Magic prompt enhancement options.
 */
export const MAGIC_PROMPT_OPTIONS: readonly MagicPrompt[] = [
  'AUTO',
  'ON',
  'OFF',
] as const;

/**
 * Style type options for image generation.
 */
export const STYLE_TYPES: readonly StyleType[] = [
  'AUTO',
  'GENERAL',
  'REALISTIC',
  'DESIGN',
  'FICTION',
] as const;

/**
 * Ideogram model versions (for legacy V2 endpoints).
 */
export const MODELS: readonly Model[] = ['V_2', 'V_2_TURBO'] as const;

/**
 * Prediction status values for async operations (local implementation).
 */
export const PREDICTION_STATUSES: readonly PredictionStatus[] = [
  'queued',
  'processing',
  'completed',
  'failed',
  'cancelled',
] as const;


// =============================================================================
// Default Values
// =============================================================================

/**
 * Default values for optional generation parameters
 */
export const DEFAULTS = {
  /** Default aspect ratio */
  ASPECT_RATIO: '1x1' as AspectRatio,
  /** Default number of images to generate */
  NUM_IMAGES: 1,
  /** Default rendering speed */
  RENDERING_SPEED: 'DEFAULT' as RenderingSpeed,
  /** Default magic prompt setting */
  MAGIC_PROMPT: 'AUTO' as MagicPrompt,
  /** Default style type */
  STYLE_TYPE: 'AUTO' as StyleType,
  /** Default save locally option */
  SAVE_LOCALLY: true,
} as const;

// =============================================================================
// Validation Constraints
// =============================================================================

/**
 * Validation constraints for API parameters
 */
export const VALIDATION = {
  /** Prompt constraints */
  PROMPT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 10000,
  },
  /** Number of images constraints */
  NUM_IMAGES: {
    MIN: 1,
    MAX: 8,
  },
  /** Seed constraints */
  SEED: {
    MIN: 0,
    MAX: 2147483647,
  },
  /** Expand pixels constraints for outpainting */
  EXPAND_PIXELS: {
    MIN: 1,
    MAX: 1024,
  },
  /** Image file constraints */
  IMAGE: {
    /** Maximum file size in bytes (10MB) */
    MAX_SIZE_BYTES: 10 * 1024 * 1024,
    /** Supported image formats */
    SUPPORTED_FORMATS: ['image/png', 'image/jpeg', 'image/webp'] as const,
  },
} as const;

// =============================================================================
// Cost Estimation
// =============================================================================

/**
 * Credit costs per image by rendering speed.
 * Note: These are estimates based on known Ideogram pricing.
 * Actual costs may vary - Ideogram API does not return cost info.
 */
export const CREDITS_PER_IMAGE: Record<RenderingSpeed, number> = {
  FLASH: 0.04,
  TURBO: 0.08,
  DEFAULT: 0.1,
  QUALITY: 0.2,
} as const;

/**
 * Credits cost for edit operations per image.
 */
export const EDIT_CREDITS_PER_IMAGE: Record<RenderingSpeed, number> = {
  FLASH: 0.06,
  TURBO: 0.1,
  DEFAULT: 0.12,
  QUALITY: 0.24,
} as const;

/**
 * Estimated USD per credit.
 * Based on Ideogram's pricing tiers.
 */
export const USD_PER_CREDIT = 0.05 as const;

// =============================================================================
// HTTP Status Codes
// =============================================================================

/**
 * HTTP status codes for error handling
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Retryable HTTP status codes
 */
export const RETRYABLE_STATUS_CODES: readonly number[] = [
  HTTP_STATUS.TOO_MANY_REQUESTS,
  HTTP_STATUS.INTERNAL_SERVER_ERROR,
  HTTP_STATUS.SERVICE_UNAVAILABLE,
] as const;

// =============================================================================
// Retry Configuration
// =============================================================================

/**
 * Retry configuration for transient errors
 */
export const RETRY_CONFIG = {
  /** Maximum number of retry attempts */
  MAX_ATTEMPTS: 3,
  /** Initial delay in milliseconds */
  INITIAL_DELAY_MS: 1000,
  /** Maximum delay in milliseconds */
  MAX_DELAY_MS: 10000,
  /** Backoff multiplier for exponential backoff */
  BACKOFF_MULTIPLIER: 2,
} as const;

// =============================================================================
// Timeouts
// =============================================================================

/**
 * Timeout configuration in milliseconds
 */
export const TIMEOUTS = {
  /** Default API request timeout */
  DEFAULT_REQUEST_MS: 30000,
  /** Long-running request timeout (for quality rendering) */
  LONG_REQUEST_MS: 120000,
  /** Image download timeout */
  IMAGE_DOWNLOAD_MS: 60000,
} as const;

// =============================================================================
// Server Information
// =============================================================================

/**
 * MCP Server identification
 */
export const SERVER_INFO = {
  NAME: 'ideogram-mcp-server',
  VERSION: '1.0.0',
  DESCRIPTION: 'Production-grade Ideogram AI image generation MCP server',
} as const;

// =============================================================================
// Prediction Queue Configuration
// =============================================================================

/**
 * Configuration for the local prediction queue
 */
export const PREDICTION_QUEUE = {
  /** Maximum number of queued predictions */
  MAX_QUEUE_SIZE: 100,
  /** Prediction timeout in milliseconds */
  PREDICTION_TIMEOUT_MS: 300000,
  /** Time before prediction records are cleaned up (24 hours) */
  CLEANUP_AGE_MS: 24 * 60 * 60 * 1000,
} as const;

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Custom error codes for the MCP server
 */
export const ERROR_CODES = {
  // Authentication errors
  INVALID_API_KEY: 'INVALID_API_KEY',
  MISSING_API_KEY: 'MISSING_API_KEY',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PROMPT: 'INVALID_PROMPT',
  INVALID_ASPECT_RATIO: 'INVALID_ASPECT_RATIO',
  INVALID_IMAGE: 'INVALID_IMAGE',
  INVALID_MASK: 'INVALID_MASK',
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',

  // API errors
  API_ERROR: 'API_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',

  // Prediction errors
  PREDICTION_NOT_FOUND: 'PREDICTION_NOT_FOUND',
  PREDICTION_ALREADY_COMPLETED: 'PREDICTION_ALREADY_COMPLETED',
  PREDICTION_FAILED: 'PREDICTION_FAILED',

  // Storage errors
  STORAGE_ERROR: 'STORAGE_ERROR',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',

  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Type for error codes
 */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
