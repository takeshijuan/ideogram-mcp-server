# Ideogram MCP Server - 5-Minute Quickstart

Get AI image generation in Claude Desktop in under 5 minutes!

## Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Ideogram API Key** - [Get one here](https://ideogram.ai/manage-api)
- **Claude Desktop** - [Download here](https://claude.ai/download)

## Step 1: Clone & Build (1 minute)

```bash
# Clone the repository
git clone https://github.com/yourusername/ideogram-mcp-server.git
cd ideogram-mcp-server

# Install dependencies and build
npm install && npm run build
```

## Step 2: Configure Claude Desktop (2 minutes)

Open your Claude Desktop configuration file:

| Platform | Location |
|----------|----------|
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Linux** | `~/.config/claude/claude_desktop_config.json` |

Add the Ideogram server configuration:

```json
{
  "mcpServers": {
    "ideogram": {
      "command": "node",
      "args": ["/FULL/PATH/TO/ideogram-mcp-server/dist/index.js"],
      "env": {
        "IDEOGRAM_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

**Important:** Replace `/FULL/PATH/TO/` with the actual path to your cloned repository.

### Quick Path Finder

```bash
# Run this in the ideogram-mcp-server directory to get your full path:
echo "$(pwd)/dist/index.js"
```

## Step 3: Restart & Test (1 minute)

1. **Quit Claude Desktop completely** (not just close the window)
2. **Reopen Claude Desktop**
3. **Test with a prompt:**

```
Generate an image of a peaceful mountain lake at sunset
```

You should see Claude use the `ideogram_generate` tool and return an AI-generated image!

## Quick Examples

### Basic Image Generation

Ask Claude:
> "Create an image of a cute robot reading a book in a cozy library"

### Specific Style

> "Generate a realistic photo of a golden retriever puppy in a field of flowers"

### Multiple Images

> "Generate 4 variations of a minimalist logo design for a coffee shop"

### Image Editing

> "Take this image [paste URL] and add a rainbow in the sky"

## Available Tools

| Tool | What It Does |
|------|-------------|
| `ideogram_generate` | Generate images from text prompts |
| `ideogram_edit` | Edit images with inpainting/outpainting |
| `ideogram_generate_async` | Queue generation for background processing |
| `ideogram_get_prediction` | Check async request status |
| `ideogram_cancel_prediction` | Cancel queued requests |

## Optional: Save Images Locally

By default, generated images are saved to `./ideogram_images`. Customize this by adding:

```json
{
  "mcpServers": {
    "ideogram": {
      "command": "node",
      "args": ["/path/to/ideogram-mcp-server/dist/index.js"],
      "env": {
        "IDEOGRAM_API_KEY": "your_api_key_here",
        "LOCAL_SAVE_DIR": "/your/preferred/directory",
        "ENABLE_LOCAL_SAVE": "true"
      }
    }
  }
}
```

## Troubleshooting

### "Server not responding"

- Verify Node.js 18+ is installed: `node --version`
- Check the path in your config is correct
- Ensure the build completed: `npm run build`

### "Invalid API key"

- Double-check your API key at [ideogram.ai/manage-api](https://ideogram.ai/manage-api)
- Ensure no extra spaces in the key
- Check the key is in the `env` section of your config

### "Tools not appearing in Claude"

- Make sure you fully quit and reopened Claude Desktop
- Check Claude Desktop logs for errors:
  - **macOS**: `~/Library/Logs/Claude/mcp*.log`
  - **Windows**: `%APPDATA%\Claude\logs\mcp*.log`

### Still stuck?

1. Run the MCP Inspector for debugging:
   ```bash
   npm run inspect
   ```
2. Check the [full documentation](../README.md)
3. [Open an issue](https://github.com/yourusername/ideogram-mcp-server/issues)

## Next Steps

- Read the [full README](../README.md) for all options
- See the [API Reference](./API.md) for detailed tool documentation
- Explore [aspect ratios](./API.md#aspect-ratios): `1x1`, `16x9`, `9x16`, `4x3`, and more
- Try [different styles](./API.md#style-types): `REALISTIC`, `DESIGN`, `FICTION`

---

**You're ready to go!** Start generating amazing AI images with Claude.
