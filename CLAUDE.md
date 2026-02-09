# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **production-grade MCP (Model Context Protocol) server** for Ideogram AI integration. It enables LLM applications (Claude Desktop, Cursor, VS Code) to generate and edit images using the Ideogram API.

**Key architectural decisions:**
- TypeScript strict mode with Zod validation for all inputs
- Async/await patterns with in-memory prediction store for background jobs
- Structured logging via Pino
- Local file storage for generated images (URLs expire after 24h)
- Enterprise error handling with user-friendly messages and retry guidance

## Build and Development

```bash
# Development with hot reload
npm run dev

# Build (uses esbuild, outputs to dist/)
npm run build

# Type checking
npm run typecheck

# Tests
npm test                    # Run in watch mode
npm run test:run            # Single run
npm run test:coverage       # With coverage report

# Specific test file
npm test -- --run src/__tests__/unit/tools.test.ts

# Lint and format
npm run lint
npm run lint:fix
npm run format
npm run format:check

# Test server with MCP Inspector (must build first)
npm run inspect

# Clean build artifacts
npm run clean
```

## Architecture

### Entry Point Flow
1. `src/index.ts` - Validates config, creates StdioServerTransport, calls startServer()
2. `src/server.ts` - Creates McpServer, initializes prediction store, registers tools
3. Tools execute via handlers in `src/tools/`

### Core Services (src/services/)
- **ideogram.client.ts** - Axios-based API client with rate limiting, retry logic, error transformation
- **prediction.store.ts** - In-memory async job queue with TTL, status tracking (queued → processing → completed/failed)
- **storage.service.ts** - Local file operations (download images, base64 conversion, path resolution)
- **cost.calculator.ts** - Estimates credit/USD costs based on known pricing (API doesn't return actual costs)

### Tools (src/tools/)
All 5 MVP tools are registered with the MCP server:
- **generate.ts** - Sync image generation
- **generate-async.ts** - Queue generation for background processing
- **edit.ts** - Inpainting (mask-based image editing only)
- **get-prediction.ts** - Poll async job status
- **cancel-prediction.ts** - Cancel queued jobs

Each tool has:
- Zod schema for input validation
- Handler that returns structured response
- Error handling that converts API errors to user-friendly messages

### Configuration (src/config/)
- All settings loaded from environment variables via `config.ts`
- Required: `IDEOGRAM_API_KEY`
- Optional: `LOG_LEVEL`, `LOCAL_SAVE_DIR`, `ENABLE_LOCAL_SAVE`, `MAX_CONCURRENT_REQUESTS`, `REQUEST_TIMEOUT_MS`

## TypeScript Strictness

**Critical: The project uses TypeScript strict mode with maximum strictness.**

All code MUST:
- Have explicit return types on exported functions
- Never use `any` (use `unknown` with type guards if needed)
- Handle all `null`/`undefined` cases (strictNullChecks)
- Avoid index access without checks (noUncheckedIndexedAccess)

Run `npm run typecheck` before committing. Build will fail if strict checks fail.

## Testing

- **Framework**: Vitest
- **Location**: `src/__tests__/unit/` and `src/__tests__/integration/`
- **Coverage targets**: 90% statements, 85% branches, 75% functions
- Mock external API calls in tests
- Use Arrange-Act-Assert pattern

## Error Handling Pattern

```typescript
// Always use IdeogramMCPError for custom errors
throw new IdeogramMCPError(
  'USER_FRIENDLY_MESSAGE',
  'ERROR_CODE',
  true,  // isRetryable
  originalError
);
```

Error categories:
- Configuration errors → exit process
- API errors → transform to user-friendly with retry guidance
- Validation errors → clear message about what's wrong

## Logging

- Use `createChildLogger('module-name')` from `utils/logger.ts`
- Never log sensitive data (API keys, full image data)
- Levels: debug (verbose), info (key events), warn (recoverable issues), error (failures)

## Tool Registration

Tools are registered in `src/tools/index.ts` using this pattern:

```typescript
export const allTools = [
  { name: 'tool_name', description: '...', schema: zodSchema, handler: async (input) => {...} }
];
```

The server (`src/server.ts`) iterates over `allTools` and calls `server.tool(name, description, schema, handler)` for each.

## Testing in Claude Desktop

1. Build: `npm run build`
2. Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "ideogram": {
      "command": "node",
      "args": ["/absolute/path/to/ideogram-mcp-server/dist/index.js"],
      "env": {
        "IDEOGRAM_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

3. Restart Claude Desktop
4. Verify the server appears in the MCP tools menu

Use `npm run verify:claude-desktop` to validate the configuration.

## Common Issues

**TypeScript errors in strict mode:**
- Run `npm run typecheck` to see all errors
- Common fixes: Add explicit return types, check for undefined, use type guards

**Server not appearing in Claude Desktop:**
- Check the config file path and JSON syntax
- Ensure `dist/index.js` exists (run `npm run build`)
- Restart Claude Desktop completely
- Check Claude Desktop logs: `~/Library/Logs/Claude/` (macOS)

**API errors:**
- Verify `IDEOGRAM_API_KEY` is valid
- Check Ideogram API status: https://status.ideogram.ai
- Review rate limits (default: 3 concurrent requests)

## Code Style

- ESLint + Prettier enforced
- Prefer explicit over implicit
- Avoid premature abstraction (don't create helpers for one-time use)
- Keep functions focused and small
- Comment only when logic isn't self-evident
