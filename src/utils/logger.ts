/**
 * Structured Logging Configuration
 *
 * Provides a configured Pino logger instance with:
 * - Configurable log levels via environment variables
 * - Structured JSON output for production
 * - Pretty printing support for development
 * - Child logger factories for component-specific logging
 * - Request/response logging utilities
 * - Error serialization with stack traces
 */

import { pino, type Logger, type LoggerOptions, type Level } from 'pino';
import { config, type LogLevel } from '../config/config.js';
import { SERVER_INFO } from '../config/constants.js';

// =============================================================================
// Pino Log Level Mapping
// =============================================================================

/**
 * Map our log levels to Pino log levels.
 * Pino supports: 'fatal', 'error', 'warn', 'info', 'debug', 'trace'
 */
const LOG_LEVEL_MAP: Record<LogLevel, Level> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

// =============================================================================
// Logger Configuration
// =============================================================================

/**
 * Determines if we're running in a development environment.
 * Used to enable pretty printing when running locally.
 */
function isDevelopment(): boolean {
  const nodeEnv = process.env['NODE_ENV'];
  return nodeEnv === 'development' || nodeEnv === undefined;
}

/**
 * Determines if pretty printing should be enabled.
 * Pretty printing is enabled in development unless explicitly disabled.
 */
function shouldPrettyPrint(): boolean {
  const prettyPrint = process.env['LOG_PRETTY'];

  // If explicitly set, honor that setting
  if (prettyPrint === 'true' || prettyPrint === '1') {
    return true;
  }
  if (prettyPrint === 'false' || prettyPrint === '0') {
    return false;
  }

  // Default to pretty printing in development
  return isDevelopment();
}

/**
 * Creates the base logger configuration.
 */
function createLoggerOptions(): LoggerOptions {
  const level = LOG_LEVEL_MAP[config.logLevel];

  const baseOptions: LoggerOptions = {
    name: SERVER_INFO.NAME,
    level,
    // Base context included in all log entries
    base: {
      service: SERVER_INFO.NAME,
      version: SERVER_INFO.VERSION,
    },
    // Custom timestamp format
    timestamp: pino.stdTimeFunctions.isoTime,
    // Customize error serialization
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: serializeRequest,
      res: serializeResponse,
    },
    // Format options for structured output
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings['pid'],
        hostname: bindings['hostname'],
        service: bindings['service'],
        version: bindings['version'],
      }),
    },
  };

  // Add pretty printing transport for development
  if (shouldPrettyPrint()) {
    return {
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    };
  }

  return baseOptions;
}

// =============================================================================
// Custom Serializers
// =============================================================================

/**
 * Serializes HTTP request information for logging.
 * Omits sensitive headers like Authorization.
 */
function serializeRequest(req: Record<string, unknown>): Record<string, unknown> {
  if (!req || typeof req !== 'object') {
    return {};
  }

  const serialized: Record<string, unknown> = {};

  if ('method' in req) serialized['method'] = req['method'];
  if ('url' in req) serialized['url'] = req['url'];
  if ('endpoint' in req) serialized['endpoint'] = req['endpoint'];

  // Sanitize headers - remove sensitive information
  if ('headers' in req && typeof req['headers'] === 'object' && req['headers'] !== null) {
    const headers = req['headers'] as Record<string, unknown>;
    const sanitizedHeaders: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      // Skip sensitive headers
      if (
        lowerKey === 'authorization' ||
        lowerKey === 'api-key' ||
        lowerKey === 'x-api-key' ||
        lowerKey === 'cookie'
      ) {
        sanitizedHeaders[key] = '[REDACTED]';
      } else {
        sanitizedHeaders[key] = value;
      }
    }
    serialized['headers'] = sanitizedHeaders;
  }

  return serialized;
}

/**
 * Serializes HTTP response information for logging.
 */
function serializeResponse(res: Record<string, unknown>): Record<string, unknown> {
  if (!res || typeof res !== 'object') {
    return {};
  }

  const serialized: Record<string, unknown> = {};

  if ('status' in res) serialized['status'] = res['status'];
  if ('statusCode' in res) serialized['statusCode'] = res['statusCode'];
  if ('duration' in res) serialized['duration'] = res['duration'];

  return serialized;
}

// =============================================================================
// Logger Instance
// =============================================================================

/**
 * The main logger instance for the application.
 *
 * @example
 * ```typescript
 * import { logger } from './utils/logger.js';
 *
 * // Basic logging
 * logger.info('Server started');
 * logger.error({ err }, 'Request failed');
 *
 * // Structured logging with context
 * logger.info({ tool: 'ideogram_generate', prompt: 'a cat' }, 'Generating image');
 * ```
 */
export const logger: Logger = pino(createLoggerOptions());

// =============================================================================
// Child Logger Factories
// =============================================================================

/**
 * Component names used for child loggers.
 * Ensures consistent naming across the application.
 */
export type LoggerComponent =
  | 'entry'
  | 'server'
  | 'ideogram-client'
  | 'tool:generate'
  | 'tool:generate-async'
  | 'tool:edit'
  | 'tool:get-prediction'
  | 'tool:cancel-prediction'
  | 'cost-calculator'
  | 'storage'
  | 'prediction-store'
  | 'validation';

/**
 * Creates a child logger for a specific component.
 * Child loggers inherit the parent's configuration and add component context.
 *
 * @param component - The component name for context
 * @returns A child logger instance
 *
 * @example
 * ```typescript
 * const clientLogger = createChildLogger('ideogram-client');
 * clientLogger.info({ endpoint: '/generate' }, 'Making API request');
 * ```
 */
export function createChildLogger(component: LoggerComponent): Logger {
  return logger.child({ component });
}

/**
 * Creates a child logger with a request ID for tracing.
 * Useful for correlating logs across a single request lifecycle.
 *
 * @param requestId - A unique identifier for the request
 * @param component - Optional component name
 * @returns A child logger with request context
 *
 * @example
 * ```typescript
 * const reqLogger = createRequestLogger('req-123', 'tool:generate');
 * reqLogger.info('Starting generation');
 * reqLogger.info({ numImages: 4 }, 'Generating multiple images');
 * ```
 */
export function createRequestLogger(requestId: string, component?: LoggerComponent): Logger {
  const bindings: Record<string, unknown> = { requestId };
  if (component) {
    bindings['component'] = component;
  }
  return logger.child(bindings);
}

// =============================================================================
// Logging Utilities
// =============================================================================

/**
 * Log context for API requests.
 */
export interface ApiRequestLogContext {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  hasImage?: boolean;
  hasMask?: boolean;
}

/**
 * Log context for API responses.
 */
export interface ApiResponseLogContext {
  endpoint: string;
  statusCode: number;
  durationMs: number;
  imageCount?: number;
}

/**
 * Log context for tool invocations.
 */
export interface ToolInvocationLogContext {
  tool: string;
  params: Record<string, unknown>;
}

/**
 * Log context for tool results.
 */
export interface ToolResultLogContext {
  tool: string;
  success: boolean;
  durationMs: number;
  errorCode?: string;
}

/**
 * Logs an API request being made to Ideogram.
 *
 * @param log - The logger instance to use
 * @param context - Request context information
 */
export function logApiRequest(log: Logger, context: ApiRequestLogContext): void {
  log.debug(
    {
      req: {
        method: context.method,
        endpoint: context.endpoint,
      },
      hasImage: context.hasImage,
      hasMask: context.hasMask,
    },
    'Ideogram API request'
  );
}

/**
 * Logs an API response from Ideogram.
 *
 * @param log - The logger instance to use
 * @param context - Response context information
 */
export function logApiResponse(log: Logger, context: ApiResponseLogContext): void {
  const level = context.statusCode >= 400 ? 'warn' : 'debug';
  log[level](
    {
      res: {
        statusCode: context.statusCode,
        duration: context.durationMs,
      },
      endpoint: context.endpoint,
      imageCount: context.imageCount,
    },
    'Ideogram API response'
  );
}

/**
 * Logs an MCP tool invocation.
 *
 * @param log - The logger instance to use
 * @param context - Tool invocation context
 */
export function logToolInvocation(log: Logger, context: ToolInvocationLogContext): void {
  // Sanitize params to not log sensitive data or very large strings
  const sanitizedParams = sanitizeToolParams(context.params);
  log.info({ tool: context.tool, params: sanitizedParams }, 'Tool invoked');
}

/**
 * Logs an MCP tool result.
 *
 * @param log - The logger instance to use
 * @param context - Tool result context
 */
export function logToolResult(log: Logger, context: ToolResultLogContext): void {
  const level = context.success ? 'info' : 'warn';
  log[level](
    {
      tool: context.tool,
      success: context.success,
      durationMs: context.durationMs,
      errorCode: context.errorCode,
    },
    context.success ? 'Tool completed' : 'Tool failed'
  );
}

/**
 * Logs an error with full context.
 *
 * @param log - The logger instance to use
 * @param error - The error to log
 * @param message - A descriptive message
 * @param context - Additional context
 */
export function logError(
  log: Logger,
  error: unknown,
  message: string,
  context?: Record<string, unknown>
): void {
  // Handle different error types
  if (error instanceof Error) {
    log.error(
      {
        err: error,
        ...context,
      },
      message
    );
  } else {
    log.error(
      {
        error: String(error),
        ...context,
      },
      message
    );
  }
}

// =============================================================================
// Internal Utilities
// =============================================================================

/**
 * Sanitizes tool parameters for safe logging.
 * Truncates long strings and redacts potentially sensitive data.
 */
function sanitizeToolParams(params: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const maxStringLength = 200;

  for (const [key, value] of Object.entries(params)) {
    // Redact potentially sensitive keys
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('key') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('password')
    ) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Truncate long strings (like base64 images or long prompts for debug logs)
    if (typeof value === 'string' && value.length > maxStringLength) {
      sanitized[key] = `${value.substring(0, maxStringLength)}... (${value.length} chars)`;
      continue;
    }

    // Pass through other values
    sanitized[key] = value;
  }

  return sanitized;
}

// =============================================================================
// Exports for Testing
// =============================================================================

/**
 * Creates a silent logger for testing.
 * Useful when you don't want log output during tests.
 */
export function createSilentLogger(): Logger {
  return pino({ level: 'silent' });
}

/**
 * Creates a logger with a custom level for testing.
 */
export function createTestLogger(level: LogLevel = 'debug'): Logger {
  return pino({
    name: 'test',
    level: LOG_LEVEL_MAP[level],
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  });
}
