# Ideogram MCP Server

[![GitHub Stars](https://img.shields.io/github/stars/takeshijuan/ideogram-mcp-server?style=social)](https://github.com/takeshijuan/ideogram-mcp-server)
[![MCP Protocol](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/takeshijuan/ideogram-mcp-server?utm_source=oss&utm_medium=github&utm_campaign=takeshijuan%2Fideogram-mcp-server&labelColor=171717&color=FF570A&label=CodeRabbit+Reviews)](https://coderabbit.ai)

> **Warning**: This is an **unofficial**, community-driven project and is **not affiliated with, endorsed by, or sponsored by Ideogram AI**. For official Ideogram resources, please visit [ideogram.ai](https://ideogram.ai).
>
> **Note**: This project was **entirely implemented by an AI agent** (Claude) using the auto-claude autonomous development system. The codebase, tests, and documentation were all generated through AI-assisted development. Human oversight was provided for requirements and review.

A production-grade **Model Context Protocol (MCP) server** that provides seamless integration between LLM applications (Claude Desktop, Cursor, VS Code) and the [Ideogram AI](https://ideogram.ai) image generation API. Powered by Ideogram V3, it offers 10 tools for complete image generation, editing, and analysis workflows.

![demo](./assets/demo.gif)

## What's New in v3.0.0

- **5 New Tools** -- Describe, Upscale, Remix, Reframe, and Replace Background (10 tools total)
- **Character Reference Support** -- Maintain visual consistency of characters across generations (generate, edit, remix)
- **Ideogram V3 API** -- Edit tool migrated from legacy API to V3 with rendering speed control
- **Reframe replaces Outpainting** -- Intelligent outpainting is now a dedicated tool with resolution targeting

## Features

- **Image Generation** - Generate high-quality AI images from text prompts using Ideogram V3
- **Image Editing** - Mask-based inpainting to edit specific parts of images (V3 API)
- **Image Description** - Analyze images and generate detailed text descriptions
- **Image Upscaling** - Enhance image resolution with guided upscaling controls
- **Image Remixing** - Transform images with new prompts while preserving original characteristics
- **Image Reframing** - Extend images to new resolutions via intelligent outpainting
- **Background Replacement** - Automatically replace backgrounds while preserving foreground subjects
- **Character References** - Maintain character consistency across multiple generations
- **Async Support** - Queue generation requests for background processing
- **Cost Tracking** - Estimated credit and USD costs included in all responses
- **Local Storage** - Automatically save generated images locally (URLs expire)
- **Enterprise Error Handling** - User-friendly messages with retry guidance
- **Type Safety** - Full TypeScript strict mode with Zod validation

## Quick Start

### Prerequisites

- Node.js 18+
- An [Ideogram API key](https://ideogram.ai/manage-api)

### Installation

[![Install in Cursor](https://custom-icon-badges.demolab.com/badge/Install_in_Cursor-000000?style=for-the-badge&logo=cursor-ai-white)](https://cursor.com/en/install-mcp?name=ideogram&config=eyJ0eXBlIjoic3RkaW8iLCJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkB0YWtlc2hpanVhbi9pZGVvZ3JhbS1tY3Atc2VydmVyIl0sImVudiI6eyJJREVPR1JBTV9BUElfS0VZIjoiIn19)
[![Install in VS Code](https://custom-icon-badges.demolab.com/badge/Install_in_VS_Code-007ACC?style=for-the-badge&logo=vsc&logoColor=white)](https://vscode.dev/redirect/mcp/install?name=ideogram&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40takeshijuan/ideogram-mcp-server%22%5D%2C%22env%22%3A%7B%22IDEOGRAM_API_KEY%22%3A%22%22%7D%7D)

```bash
# Clone the repository
git clone https://github.com/takeshijuan/ideogram-mcp-server.git
cd ideogram-mcp-server

# Install dependencies
npm install

# Build
npm run build
```

### Configuration

Create a `.env` file (or set environment variables):

```bash
# Required
IDEOGRAM_API_KEY=your_ideogram_api_key_here

# Optional
LOG_LEVEL=info                    # debug, info, warn, error
LOCAL_SAVE_DIR=./ideogram_images  # Where to save images
ENABLE_LOCAL_SAVE=true            # Auto-download generated images
```

### Claude Desktop Setup

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ideogram": {
      "command": "node",
      "args": ["/path/to/ideogram-mcp-server/dist/index.js"],
      "env": {
        "IDEOGRAM_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Restart Claude Desktop to load the server.

## Available Tools (10)

### `ideogram_generate`

Generate images from text prompts.

```typescript
// Basic usage
{
  prompt: "A beautiful sunset over mountains"
}

// With all options
{
  prompt: "A cute cat wearing a wizard hat",
  aspect_ratio: "16x9",    // 15 ratios: 1x1, 16x9, 9x16, 4x3, 3x4, etc.
  num_images: 4,           // 1-8 images
  rendering_speed: "QUALITY", // FLASH, TURBO, DEFAULT, QUALITY
  magic_prompt: "ON",      // AUTO, ON, OFF - enhance prompts
  style_type: "REALISTIC", // AUTO, GENERAL, REALISTIC, DESIGN, FICTION
  character_reference_images: ["https://example.com/char.jpg"],
  save_locally: true       // Save to local disk
}
```

**Response includes:**
- Image URLs and local paths (if saved)
- Seeds for reproducibility
- Cost estimates (credits and USD)

### `ideogram_edit`

Edit specific parts of existing images using mask-based inpainting (V3 API).

```typescript
// Edit parts of an image using a mask
{
  prompt: "Add a red balloon in the sky",
  image: "https://example.com/photo.jpg",  // URL, file path, or base64 data URL
  mask: maskImageData,  // Black pixels=edit, White pixels=preserve
  rendering_speed: "DEFAULT",  // FLASH, TURBO, DEFAULT, QUALITY
  character_reference_images: ["https://example.com/char.jpg"],
  num_images: 1,
  magic_prompt: "AUTO",
  style_type: "AUTO"
}
```

**Mask Requirements:**
- Same dimensions as source image
- Black and white pixels only (black=areas to edit, white=areas to preserve)
- Black area must be at least 10% of total image
- Supported formats: PNG, JPEG, WebP

### `ideogram_describe`

Generate text descriptions from images.

```typescript
{
  image: "https://example.com/photo.jpg",  // URL, file path, or base64
  describe_model_version: "V_3"  // "V_2" or "V_3" (default)
}
// Returns: array of text descriptions
```

### `ideogram_upscale`

Upscale images to higher resolution.

```typescript
{
  image: "https://example.com/photo.jpg",
  prompt: "High detail landscape",  // Optional guided upscaling
  resemblance: 70,  // 0-100: similarity to original (default 50)
  detail: 80,       // 0-100: detail enhancement level (default 50)
  magic_prompt: "ON",
  num_images: 1,
  save_locally: true
}
```

### `ideogram_remix`

Remix images with a new text prompt.

```typescript
{
  image: "https://example.com/photo.jpg",
  prompt: "Transform into a watercolor painting",
  image_weight: 60,  // 0-100: influence of original image (default 50)
  aspect_ratio: "16x9",
  rendering_speed: "QUALITY",
  style_type: "FICTION",
  character_reference_images: ["https://example.com/char.jpg"],
  save_locally: true
}
```

### `ideogram_reframe`

Extend images to new resolutions via intelligent outpainting.

```typescript
{
  image: "https://example.com/square-photo.jpg",
  resolution: "1920x1080",  // Target resolution (required)
  rendering_speed: "DEFAULT",
  num_images: 1,
  save_locally: true
}
```

### `ideogram_replace_background`

Replace image backgrounds while preserving foreground subjects.

```typescript
{
  image: "https://example.com/portrait.jpg",
  prompt: "A tropical beach at sunset",  // Describe the new background
  magic_prompt: "ON",
  rendering_speed: "QUALITY",
  num_images: 4,
  save_locally: true
}
// No mask needed - AI auto-detects foreground
```

### `ideogram_generate_async`

Queue generation requests for background processing.

```typescript
{
  prompt: "A complex scene with many details",
  num_images: 8
}
// Returns immediately with prediction_id
// Poll with ideogram_get_prediction
```

### `ideogram_get_prediction`

Check status and retrieve results of async requests.

```typescript
{
  prediction_id: "pred_abc123..."
}
// Returns: status (queued/processing/completed/failed)
// When completed: includes images and cost
```

### `ideogram_cancel_prediction`

Cancel queued async requests (before processing starts).

```typescript
{
  prediction_id: "pred_abc123..."
}
// Only works for predictions in 'queued' status
```

## Cost Tracking

All generation responses include estimated cost information:

```json
{
  "total_cost": {
    "credits_used": 8,
    "estimated_usd": 0.08,
    "note": "Cost estimate based on known Ideogram pricing"
  }
}
```

> **Note:** Costs are **estimated locally** based on known pricing. The Ideogram API does not return actual cost information.

## Development

```bash
# Development with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Lint
npm run lint

# Format code
npm run format

# Test with MCP Inspector
npm run inspect
```

## Project Structure

```
ideogram-mcp-server/
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # MCP server setup
│   ├── config/           # Configuration
│   ├── services/         # Core services
│   │   ├── ideogram.client.ts    # API client
│   │   ├── cost.calculator.ts    # Cost estimation
│   │   ├── prediction.store.ts   # Async job queue
│   │   └── storage.service.ts    # Local file storage
│   ├── tools/            # MCP tools (10 tools)
│   │   ├── generate.ts
│   │   ├── generate-async.ts
│   │   ├── edit.ts
│   │   ├── describe.ts
│   │   ├── upscale.ts
│   │   ├── remix.ts
│   │   ├── reframe.ts
│   │   ├── replace-background.ts
│   │   ├── get-prediction.ts
│   │   └── cancel-prediction.ts
│   ├── types/            # TypeScript types
│   └── utils/            # Utilities
├── docs/                 # Additional documentation
├── dist/                 # Built output
└── package.json
```

## Security

- API keys are passed via environment variables, never stored in code
- All inputs validated with Zod schemas
- File operations restricted to configured directories
- No sensitive data logged

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development setup
- Coding standards
- Testing requirements
- Pull request process

**Quick start:**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=takeshijuan/ideogram-mcp-server&type=Date)](https://star-history.com/#takeshijuan/ideogram-mcp-server&Date)

## Resources

- [API Reference](docs/API.md) - Complete documentation for all 10 tools
- [Ideogram API Documentation](https://developer.ideogram.ai/api)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/en/docs/build-with-claude/mcp)

---

Built with love for the AI developer community
