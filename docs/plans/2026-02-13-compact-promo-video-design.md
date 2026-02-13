# Compact Promo Video Design - 10s GitHub README Hero

**Date**: 2026-02-13
**Status**: Approved
**Goal**: Redesign the promo video from 120s to 10s for use as a GitHub README hero GIF

## Overview

A 10-second looping GIF that shows the core value proposition: "type natural language, get AI-generated images." Renders at 1920x1080 60fps, converts to 640x360 15fps GIF for README embedding.

## Specs

- Duration: 10 seconds (600 frames at 60fps)
- Resolution: 1920x1080 (render), 640x360 (GIF output)
- FPS: 60 (render), 15 (GIF output)
- Format: GIF (looping)
- Usage: `![demo](./assets/demo.gif)` in README

## Structure: 4 Beats

| Beat | Time | Frames | Content | Purpose |
|------|------|--------|---------|---------|
| 1. Brand | 0-2s | 0-120 | Project name + tagline | What is this |
| 2. Prompt | 2-5s | 120-300 | Chat UI with typing | How it works |
| 3. Result | 5-8s | 300-480 | Generated image + metadata | What you get |
| 4. CTA | 8-10s | 480-600 | npm install + GitHub URL | Next action |

## Beat Details

### Beat 1: Brand (0-2s)

- Black background fade-in
- `ideogram-mcp-server` in JetBrains Mono (code font), centered
- Subtitle: `AI image generation via MCP` fades in slightly delayed
- Spring animation for natural entrance

### Beat 2: Prompt (2-5s)

- Fade transition to Claude-style Chat UI
- User bubble with typing effect: `"A sunset over mountains, photorealistic, 16:9"`
- After typing completes, assistant side shows `Generating...` loader

### Beat 3: Result (5-8s)

- Loading disappears, gradient image (sunset) scales in with spring
- Small metadata at bottom-right: `✓ 8s · $0.04`
- Reuse sunset SVG gradient from existing Step3Result

### Beat 4: CTA (8-10s)

- Fade transition to code block style
- `npx @takeshijuan/ideogram-mcp-server`
- Below: `github.com/takeshijuan/ideogram-mcp-server`
- Last 0.5s: fade to black (loop connection)

## File Changes

### Modify

- `src/Root.tsx` - 120s → 10s (600 frames)
- `src/Video.tsx` - Rewrite TransitionSeries for 4 beats

### Create

- `src/scenes/CompactPromo.tsx` - All 4 beats in one file

### Delete

- `src/scenes/Problem.tsx`
- `src/scenes/Solution.tsx`
- `src/scenes/Demo.tsx`
- `src/scenes/CTA.tsx`
- `src/components/CodeBlock.tsx`
- `src/components/Terminal.tsx`
- `src/components/Checklist.tsx`

### Keep (reuse)

- `src/styles/theme.ts`
- `src/styles/fonts.ts`
- `src/components/ChatUI.tsx`

## Transitions

- Use `fade()` from `@remotion/transitions` between beats
- Transition duration: 0.3s (18 frames) - shorter than before for pacing
- End-to-start: fade to black at end, fade from black at start (loop-friendly)
