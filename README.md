# Ideogram MCP Server

[![MCP Protocol](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **⚠️ Disclaimer**: This is an **unofficial**, community-driven project and is **not affiliated with, endorsed by, or sponsored by Ideogram AI**. For official Ideogram resources, please visit [ideogram.ai](https://ideogram.ai).

> **🤖 AI-Generated Project**: This project was **entirely implemented by an AI agent** (Claude) using the auto-claude autonomous development system. The codebase, tests, and documentation were all generated through AI-assisted development. Human oversight was provided for requirements and review.

A production-grade **Model Context Protocol (MCP) server** that provides seamless integration between LLM applications (Claude Desktop, Cursor, VS Code) and the [Ideogram AI](https://ideogram.ai) image generation API.

## ✨ Features

- **🎨 Image Generation** - Generate high-quality AI images from text prompts using Ideogram V3
- **✏️ Image Inpainting** - Edit specific parts of images using mask-based inpainting
- **⚡ Async Support** - Queue generation requests for background processing
- **💰 Cost Tracking** - Estimated credit and USD costs included in all responses
- **📁 Local Storage** - Automatically save generated images locally (URLs expire)
- **🔄 Enterprise Error Handling** - User-friendly messages with retry guidance
- **🛡️ Type Safety** - Full TypeScript strict mode with Zod validation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- An [Ideogram API key](https://ideogram.ai/manage-api)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ideogram-mcp-server.git
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

## 🛠️ Available Tools

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
  save_locally: true       // Save to local disk
}
```

**Response includes:**
- Image URLs and local paths (if saved)
- Seeds for reproducibility
- Cost estimates (credits and USD)

### `ideogram_inpaint`

Edit specific parts of existing images using inpainting with masks.

```typescript
// Edit parts of an image using a mask
{
  prompt: "Add a red balloon in the sky",
  image: "https://example.com/photo.jpg",  // URL, file path, or base64 data URL
  mask: maskImageData,  // Black pixels=edit, White pixels=preserve
  model: "V_2",  // or "V_2_TURBO" for faster processing
  num_images: 1,  // Generate 1-8 variations
  magic_prompt: "AUTO",  // AUTO, ON, or OFF
  style_type: "AUTO"  // AUTO, GENERAL, REALISTIC, DESIGN, FICTION, RENDER_3D, ANIME
}
```

**Mask Requirements:**
- Same dimensions as source image
- Black and white pixels only (black=areas to edit, white=areas to preserve)
- Black area must be at least 10% of total image
- Supported formats: PNG, JPEG, WebP

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

## 📊 Cost Tracking

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

## 🔧 Development

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

## 📁 Project Structure

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
│   ├── tools/            # MCP tools
│   │   ├── generate.ts
│   │   ├── generate-async.ts
│   │   ├── edit.ts
│   │   ├── get-prediction.ts
│   │   └── cancel-prediction.ts
│   ├── types/            # TypeScript types
│   └── utils/            # Utilities
├── docs/                 # Additional documentation
├── dist/                 # Built output
└── package.json
```

## 🔐 Security

- API keys are passed via environment variables, never stored in code
- All inputs validated with Zod schemas
- File operations restricted to configured directories
- No sensitive data logged

## 🤝 Contributing

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

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 📚 Resources

- [Ideogram API Documentation](https://developer.ideogram.ai/api)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/en/docs/build-with-claude/mcp)

---

Built with ❤️ for the AI developer community
