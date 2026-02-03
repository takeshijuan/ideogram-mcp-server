#!/usr/bin/env node
/**
 * Ideogram MCP Server Entry Point
 *
 * This is the main entry point for the Ideogram MCP (Model Context Protocol) server.
 * It initializes the server with a StdioServerTransport for communication with
 * MCP clients like Claude Desktop, Cursor, and other LLM applications.
 *
 * The server provides tools for:
 * - ideogram_generate: Generate images from text prompts
 * - ideogram_generate_async: Queue image generation for background processing
 * - ideogram_edit: Edit images using inpainting or outpainting
 * - ideogram_get_prediction: Poll for async job status and results
 * - ideogram_cancel_prediction: Cancel queued async jobs
 *
 * @example
 * ```bash
 * # Run directly
 * node dist/index.js
 *
 * # Run with inspector for debugging
 * npx @modelcontextprotocol/inspector node dist/index.js
 *
 * # Configure in Claude Desktop (claude_desktop_config.json)
 * {
 *   "mcpServers": {
 *     "ideogram": {
 *       "command": "node",
 *       "args": ["/path/to/ideogram-mcp-server/dist/index.js"],
 *       "env": {
 *         "IDEOGRAM_API_KEY": "your_api_key"
 *       }
 *     }
 *   }
 * }
 * ```
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { startServer, SERVER_INFO } from './server.js';
import { createChildLogger } from './utils/logger.js';
import { config, isConfigValid, getConfigErrors } from './config/config.js';

// =============================================================================
// Entry Point Logger
// =============================================================================

/**
 * Logger for the entry point module.
 */
const entryLogger = createChildLogger('entry');

// =============================================================================
// Configuration Validation
// =============================================================================

/**
 * Validates the configuration before starting the server.
 * Exits with error code 1 if configuration is invalid.
 */
function validateConfiguration(): void {
  if (!isConfigValid()) {
    const errors = getConfigErrors();
    entryLogger.error(
      { errors },
      'Invalid configuration. Please check your environment variables.'
    );
    process.stderr.write(
      `Configuration Error: ${errors.join(', ')}\n\n` +
        'Required environment variables:\n' +
        '  IDEOGRAM_API_KEY - Your Ideogram API key (get one at https://ideogram.ai)\n\n' +
        'Optional environment variables:\n' +
        '  LOG_LEVEL - Logging level (debug, info, warn, error). Default: info\n' +
        '  LOCAL_SAVE_DIR - Directory for saving images. Default: ./ideogram_images\n' +
        '  ENABLE_LOCAL_SAVE - Enable local image saving. Default: true\n' +
        '  MAX_CONCURRENT_REQUESTS - Rate limiting. Default: 3\n' +
        '  REQUEST_TIMEOUT_MS - API timeout in milliseconds. Default: 30000\n'
    );
    process.exit(1);
  }

  entryLogger.debug('Configuration validated successfully');
}

// =============================================================================
// Signal Handling
// =============================================================================

/**
 * Sets up signal handlers for graceful shutdown.
 *
 * @param shutdown - Function to call for graceful shutdown
 */
function setupSignalHandlers(shutdown: () => Promise<void>): void {
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    entryLogger.info('Received SIGINT, shutting down gracefully...');
    try {
      await shutdown();
      process.exit(0);
    } catch {
      entryLogger.error('Error during shutdown');
      process.exit(1);
    }
  });

  // Handle SIGTERM (Docker, Kubernetes, etc.)
  process.on('SIGTERM', async () => {
    entryLogger.info('Received SIGTERM, shutting down gracefully...');
    try {
      await shutdown();
      process.exit(0);
    } catch {
      entryLogger.error('Error during shutdown');
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    entryLogger.error({ err: error }, 'Uncaught exception');
    try {
      await shutdown();
    } finally {
      process.exit(1);
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason) => {
    entryLogger.error({ reason }, 'Unhandled promise rejection');
    try {
      await shutdown();
    } finally {
      process.exit(1);
    }
  });
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Main function that starts the Ideogram MCP server.
 *
 * This function:
 * 1. Validates configuration (including API key)
 * 2. Creates a StdioServerTransport for MCP communication
 * 3. Starts the server with the transport
 * 4. Sets up signal handlers for graceful shutdown
 */
async function main(): Promise<void> {
  entryLogger.info(
    { name: SERVER_INFO.NAME, version: SERVER_INFO.VERSION },
    'Starting Ideogram MCP Server'
  );

  // Validate configuration
  validateConfiguration();

  // Create stdio transport for MCP communication
  // This is the standard transport for Claude Desktop and similar clients
  const transport = new StdioServerTransport();

  entryLogger.debug('Created StdioServerTransport');

  try {
    // Start the server with the transport
    const { shutdown } = await startServer(transport);

    // Set up signal handlers for graceful shutdown
    setupSignalHandlers(shutdown);

    entryLogger.info(
      {
        name: SERVER_INFO.NAME,
        version: SERVER_INFO.VERSION,
        logLevel: config.logLevel,
        localSaveEnabled: config.enableLocalSave,
        localSaveDir: config.localSaveDir,
      },
      'Ideogram MCP Server started and ready to accept connections'
    );

    // The server runs until a signal is received
    // StdioServerTransport keeps the process alive by reading from stdin
  } catch (error) {
    entryLogger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

// =============================================================================
// Run
// =============================================================================

// Start the server
main().catch((error) => {
  // This should rarely happen since main() catches its own errors
  // But just in case, log and exit
  process.stderr.write(`Fatal error: ${error}\n`);
  process.exit(1);
});
