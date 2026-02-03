/**
 * Configuration Loading and Validation
 *
 * This module handles loading configuration from environment variables
 * and validating them using Zod schemas. It provides a strongly-typed
 * configuration object for use throughout the application.
 */

import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import { TIMEOUTS, DEFAULTS } from './constants.js';

// Load environment variables from .env file
dotenvConfig();

// =============================================================================
// Log Level Configuration
// =============================================================================

/**
 * Supported log levels
 */
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

/**
 * Log level type
 */
export type LogLevel = (typeof LOG_LEVELS)[number];

// =============================================================================
// Configuration Schema
// =============================================================================

/**
 * Zod schema for environment variable validation.
 * Transforms and validates all configuration values.
 */
const ConfigSchema = z.object({
  /**
   * Ideogram API key (required)
   */
  ideogramApiKey: z
    .string({
      required_error:
        'IDEOGRAM_API_KEY is required. Get your API key from https://ideogram.ai/manage-api',
    })
    .min(1, {
      message:
        'IDEOGRAM_API_KEY cannot be empty. Get your API key from https://ideogram.ai/manage-api',
    }),

  /**
   * Logging level
   */
  logLevel: z.enum(LOG_LEVELS).default('info'),

  /**
   * Directory for local image storage
   */
  localSaveDir: z.string().default('./ideogram_images'),

  /**
   * Enable automatic local saving of images
   */
  enableLocalSave: z.boolean().default(true),

  /**
   * Maximum concurrent API requests
   */
  maxConcurrentRequests: z
    .number()
    .int()
    .min(1, { message: 'MAX_CONCURRENT_REQUESTS must be at least 1' })
    .max(10, {
      message: 'MAX_CONCURRENT_REQUESTS cannot exceed 10 to prevent rate limiting',
    })
    .default(3),

  /**
   * API request timeout in milliseconds
   */
  requestTimeoutMs: z
    .number()
    .int()
    .min(1000, { message: 'REQUEST_TIMEOUT_MS must be at least 1000ms' })
    .max(300000, { message: 'REQUEST_TIMEOUT_MS cannot exceed 300000ms (5 minutes)' })
    .default(TIMEOUTS.DEFAULT_REQUEST_MS),
});

/**
 * Validated configuration type
 */
export type Config = z.infer<typeof ConfigSchema>;

// =============================================================================
// Environment Variable Parsing
// =============================================================================

/**
 * Parse a boolean from an environment variable string.
 * Handles various truthy/falsy string representations.
 *
 * @param value - The string value to parse
 * @param defaultValue - The default value if parsing fails
 * @returns The parsed boolean value
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  const normalized = value.toLowerCase().trim();

  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

/**
 * Parse an integer from an environment variable string.
 *
 * @param value - The string value to parse
 * @param defaultValue - The default value if parsing fails
 * @returns The parsed integer or default
 */
function parseInteger(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return defaultValue;
  }

  return parsed;
}

// =============================================================================
// Configuration Loading
// =============================================================================

/**
 * Raw configuration object from environment variables
 */
const rawConfig = {
  ideogramApiKey: process.env['IDEOGRAM_API_KEY'],
  logLevel: process.env['LOG_LEVEL'],
  localSaveDir: process.env['LOCAL_SAVE_DIR'],
  enableLocalSave: parseBoolean(process.env['ENABLE_LOCAL_SAVE'], DEFAULTS.SAVE_LOCALLY),
  maxConcurrentRequests: parseInteger(process.env['MAX_CONCURRENT_REQUESTS'], 3),
  requestTimeoutMs: parseInteger(
    process.env['REQUEST_TIMEOUT_MS'],
    TIMEOUTS.DEFAULT_REQUEST_MS
  ),
};

/**
 * Validate configuration and return a typed config object.
 * Throws an error with detailed validation messages if validation fails.
 *
 * @returns Validated configuration object
 * @throws Error if validation fails
 */
function loadConfig(): Config {
  const result = ConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => {
        const path = issue.path.join('.');
        return `  - ${path}: ${issue.message}`;
      })
      .join('\n');

    throw new Error(
      `Configuration validation failed:\n${errorMessages}\n\n` +
        'Please check your environment variables or .env file.'
    );
  }

  return result.data;
}

// =============================================================================
// Configuration Export
// =============================================================================

/**
 * Validated application configuration.
 *
 * This is loaded and validated once at module load time.
 * Any configuration errors will be thrown immediately.
 *
 * @example
 * ```typescript
 * import { config } from './config/config.js';
 *
 * // Access configuration values
 * const apiKey = config.ideogramApiKey;
 * const logLevel = config.logLevel;
 * ```
 */
export const config: Config = loadConfig();

/**
 * Check if the configuration is valid without throwing.
 * Useful for testing or conditional initialization.
 *
 * @returns True if configuration is valid, false otherwise
 */
export function isConfigValid(): boolean {
  return ConfigSchema.safeParse(rawConfig).success;
}

/**
 * Get configuration validation errors without throwing.
 * Returns an empty array if configuration is valid.
 *
 * @returns Array of validation error messages
 */
export function getConfigErrors(): string[] {
  const result = ConfigSchema.safeParse(rawConfig);

  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  });
}

/**
 * Create a configuration object for testing or dependency injection.
 * Validates the provided values against the schema.
 *
 * @param overrides - Configuration values to use instead of environment variables
 * @returns Validated configuration object
 * @throws Error if validation fails
 */
export function createConfig(overrides: Partial<Config> & { ideogramApiKey: string }): Config {
  const result = ConfigSchema.safeParse({
    ...rawConfig,
    ...overrides,
  });

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid configuration: ${errorMessages}`);
  }

  return result.data;
}
