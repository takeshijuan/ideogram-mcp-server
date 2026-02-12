/**
 * MCP Server Setup
 *
 * This module handles the creation and configuration of the MCP (Model Context Protocol)
 * server for Ideogram AI integration. It provides:
 * - McpServer initialization with proper naming and versioning
 * - Tool registration for all 5 MVP tools
 * - Shared prediction store initialization for async tools
 * - Structured logging for server events
 *
 * @example
 * ```typescript
 * import { createServer, startServer } from './server.js';
 *
 * // Create server with default configuration
 * const server = createServer();
 *
 * // Or start server directly with transport
 * await startServer(transport);
 * ```
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SERVER_INFO } from './config/constants.js';
import {
  registerTools,
  initializeSharedStore,
  disposeSharedStore,
  getSharedStore,
  allTools,
  getToolByName,
  getToolNames,
  type RegisterToolsOptions,
} from './tools/index.js';
import { createChildLogger } from './utils/logger.js';

// =============================================================================
// Server Logger
// =============================================================================

/**
 * Server-specific logger for tracking server lifecycle events.
 */
const serverLogger = createChildLogger('server');

// =============================================================================
// Server Configuration
// =============================================================================

/**
 * Configuration options for creating the MCP server.
 */
export interface ServerOptions {
  /**
   * Server name for MCP identification.
   * Default: SERVER_INFO.NAME
   */
  name?: string;

  /**
   * Server version for MCP identification.
   * Default: SERVER_INFO.VERSION
   */
  version?: string;

  /**
   * Options for tool registration.
   */
  toolOptions?: RegisterToolsOptions;
}

// =============================================================================
// Server Creation
// =============================================================================

/**
 * Creates and configures a new MCP server instance.
 *
 * This function:
 * 1. Creates a new McpServer with the specified name and version
 * 2. Initializes the shared prediction store for async tools
 * 3. Registers all 5 MVP tools with the server
 *
 * @param options - Optional server configuration
 * @returns Configured McpServer instance ready for connection
 *
 * @example
 * ```typescript
 * // Create with default settings
 * const server = createServer();
 *
 * // Create with custom options
 * const server = createServer({
 *   name: 'my-ideogram-server',
 *   version: '2.0.0',
 *   toolOptions: {
 *     initializeStore: true,
 *     storeOptions: {
 *       maxQueueSize: 50,
 *     },
 *   },
 * });
 * ```
 */
export function createServer(options: ServerOptions = {}): McpServer {
  const { name = SERVER_INFO.NAME, version = SERVER_INFO.VERSION, toolOptions = {} } = options;

  serverLogger.info({ name, version }, 'Creating MCP server');

  // Create the McpServer instance
  const server = new McpServer({
    name,
    version,
  });

  // Initialize shared prediction store for async tools
  const { initializeStore = true, storeOptions } = toolOptions;
  if (initializeStore) {
    initializeSharedStore(storeOptions);
  }

  // Register all tools with the server using server.tool(name, description, schema, handler)
  // This is the MCP SDK pattern for tool registration
  serverLogger.debug('Registering tools with server.tool()');

  for (const tool of allTools) {
    // Register each tool using the 4-parameter pattern:
    // server.tool(name, description, schema, handler)
    server.tool(
      tool.name,
      tool.description,
      // Schema is passed as the Zod schema object
      tool.schema as unknown as Record<string, unknown>,
      // Handler wrapper to format response for MCP
      async (input: unknown) => {
        // Cast handler to accept unknown input since MCP SDK already validates against schema
        const handler = tool.handler as (input: unknown) => Promise<unknown>;
        const result = await handler(input);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );

    serverLogger.debug({ toolName: tool.name }, 'Registered tool');
  }

  serverLogger.info(
    {
      name,
      version,
      toolCount: allTools.length,
      tools: allTools.map((t) => t.name),
    },
    'MCP server created with tools registered'
  );

  return server;
}

// =============================================================================
// Server Lifecycle
// =============================================================================

/**
 * Result of starting the server.
 */
export interface ServerStartResult {
  /**
   * The MCP server instance.
   */
  server: McpServer;

  /**
   * Function to gracefully shut down the server.
   */
  shutdown: () => Promise<void>;
}

/**
 * Starts the MCP server with the given transport.
 *
 * This is a convenience function that:
 * 1. Creates the server
 * 2. Connects the transport
 * 3. Returns both the server and a shutdown function
 *
 * @param transport - The MCP transport to connect
 * @param options - Optional server configuration
 * @returns Server instance and shutdown function
 *
 * @example
 * ```typescript
 * import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
 * import { startServer } from './server.js';
 *
 * const transport = new StdioServerTransport();
 * const { server, shutdown } = await startServer(transport);
 *
 * // Later, to shut down gracefully:
 * await shutdown();
 * ```
 */
export async function startServer(
  transport: Parameters<McpServer['connect']>[0],
  options: ServerOptions = {}
): Promise<ServerStartResult> {
  const server = createServer(options);

  serverLogger.info('Connecting transport');

  try {
    await server.connect(transport);
    serverLogger.info('Server connected and ready');
  } catch (error) {
    serverLogger.error({ err: error }, 'Failed to connect transport');
    throw error;
  }

  // Create shutdown function
  const shutdown = async (): Promise<void> => {
    serverLogger.info('Shutting down server');

    try {
      // Dispose shared prediction store
      disposeSharedStore();

      // Close the server connection
      await server.close();

      serverLogger.info('Server shutdown complete');
    } catch (error) {
      serverLogger.error({ err: error }, 'Error during shutdown');
      throw error;
    }
  };

  return { server, shutdown };
}

// =============================================================================
// Server State
// =============================================================================

/**
 * Singleton server instance for use when a single server is needed.
 */
let defaultServer: McpServer | null = null;

/**
 * Gets or creates the default server instance.
 *
 * This is useful for applications that only need a single server instance.
 * The server is created lazily on first call.
 *
 * @param options - Optional server configuration (only used on first call)
 * @returns The default McpServer instance
 *
 * @example
 * ```typescript
 * // First call creates the server
 * const server = getDefaultServer();
 *
 * // Subsequent calls return the same instance
 * const sameServer = getDefaultServer();
 * console.log(server === sameServer); // true
 * ```
 */
export function getDefaultServer(options?: ServerOptions): McpServer {
  if (!defaultServer) {
    defaultServer = createServer(options);
  }
  return defaultServer;
}

/**
 * Resets the default server instance.
 *
 * This is useful for testing or when the server needs to be reconfigured.
 * If there's an existing server, it disposes the shared store first.
 */
export function resetDefaultServer(): void {
  if (defaultServer) {
    disposeSharedStore();
    defaultServer = null;
    serverLogger.debug('Default server reset');
  }
}

// =============================================================================
// Exports
// =============================================================================

/**
 * Re-export server info for convenience
 */
export { SERVER_INFO } from './config/constants.js';

/**
 * Re-export tool utilities for advanced usage
 */
export {
  registerTools,
  initializeSharedStore,
  disposeSharedStore,
  getSharedStore,
  allTools,
  getToolByName,
  getToolNames,
};
