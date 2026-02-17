# ideogram-mcp-server Promo Video

A promotional video built with [Remotion](https://www.remotion.dev/) showcasing the ideogram-mcp-server.

## Quick Start

```bash
cd examples/promo-video
npm install
npm run studio
```

This opens Remotion Studio at `http://localhost:3000` where you can preview and scrub through the video.

## Render

```bash
npm run render
```

Outputs `out/promo-video.mp4` (1920x1080, 60fps, ~120s).

## Scene Structure

| Scene    | Time      | Description                                  |
| -------- | --------- | -------------------------------------------- |
| Problem  | 0-20s     | Developer pain points with AI image APIs     |
| Solution | 20-40s    | MCP server as the clean solution             |
| Demo     | 40-90s    | Live usage walkthrough (install, prompt, result) |
| CTA      | 90-120s   | Get started guide, links, and closing        |

## Tech Stack

- **Remotion 4.x** - React-based video framework
- **TypeScript** - Strict mode
- **TailwindCSS v4** - Styling
- **Google Fonts** - JetBrains Mono (code), Inter (UI)

## Customization

- Colors and typography: `src/styles/theme.ts` and `src/styles/fonts.ts`
- Scene timing: `src/Video.tsx` (`SCENE_DURATIONS`)
- Individual scenes: `src/scenes/*.tsx`
- Reusable components: `src/components/*.tsx`
