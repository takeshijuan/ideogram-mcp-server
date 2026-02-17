# Compact Promo Video Design - 10s GitHub README Hero (v2)

**Date**: 2026-02-13
**Status**: Approved (v2 - carousel with all 5 tools)
**Goal**: 10s looping GIF showcasing all 5 MCP tools for GitHub README hero

## Overview

A 10-second looping GIF that showcases all 5 tools of ideogram-mcp-server through a carousel of feature cards. Renders at 1920x1080 60fps, converts to 640x360 15fps GIF for README embedding.

## Specs

- Duration: 10 seconds (600 frames at 60fps)
- Resolution: 1920x1080 (render), 640x360 (GIF output)
- FPS: 60 (render), 15 (GIF output)
- Format: GIF (looping)
- Usage: `![demo](./assets/demo.gif)` in README

## Structure: Brand → 5-Card Carousel → CTA

| Beat | Time | Frames | Content | Transition |
|------|------|--------|---------|------------|
| Brand | 0-2s | 0-120 | Project name + tagline | Fade in from black (spring) |
| Card 1 | 2-3.2s | 120-192 | Generate | Cross-fade from Brand (0.4s) |
| Card 2 | 3.2-4.4s | 192-264 | Edit | Swipe left (0.3s) |
| Card 3 | 4.4-5.6s | 264-336 | Async Generate | Swipe left (0.3s) |
| Card 4 | 5.6-6.8s | 336-408 | Get Prediction | Swipe left (0.3s) |
| Card 5 | 6.8-8s | 408-480 | Cancel Prediction | Swipe left (0.3s) |
| CTA | 8-10s | 480-600 | install + GitHub URL | Cross-fade from Card5 (0.4s) |

## Beat Details

### Brand (0-2s / frames 0-120)

- Black background fade-in
- `ideogram-mcp-server` in JetBrains Mono (code font), centered
- Subtitle: `AI image generation via MCP` fades in slightly delayed
- Spring animation for natural entrance
- Fade-out starts at 1.8s (frame 108)

### Card Carousel (2-8s / frames 120-480)

#### Common Card Layout

- Background: `COLORS.bg` (#1e1e1e)
- Left 40%: Icon (48px) + tool name (32px, white) + description (20px, gray)
- Right 60%: Tool-specific visual/animation

#### Card-to-Card Transition

- Simultaneous `translateX` slide: current card `0 → -1920px`, next card `1920px → 0`
- Easing: `Easing.inOut(Easing.cubic)`
- Duration: 18 frames (0.3s)
- Both cards move simultaneously (not sequential)

#### Card 1: Generate (`ideogram_generate`)

- Icon: paint palette
- Description: `"Text to image in seconds"`
- Visual: Prompt text `"a sunset over mountains"` → sunset gradient image scales in (spring). Reuse existing sunset SVG gradient.

#### Card 2: Edit (`ideogram_edit`)

- Icon: pencil
- Description: `"Mask-based inpainting"`
- Visual: Image with dashed white rectangle (mask region) pulsing → mask area transitions to new color

#### Card 3: Async Generate (`ideogram_generate_async`)

- Icon: lightning bolt
- Description: `"Background job queue"`
- Visual: Progress bar animates 0% → 100% + three queue icons light up sequentially

#### Card 4: Get Prediction (`ideogram_get_prediction`)

- Icon: chart
- Description: `"Poll job status"`
- Visual: Status badge animates `queued` → `processing` → `completed`

#### Card 5: Cancel Prediction (`ideogram_cancel_prediction`)

- Icon: prohibited sign
- Description: `"Cancel queued jobs"`
- Visual: Queue item gets stamped with X mark animation

### CTA (8-10s / frames 480-600)

- Cross-fade in from Card 5 (0.4s)
- Code block style: `npx @takeshijuan/ideogram-mcp-server`
- Below: `github.com/takeshijuan/ideogram-mcp-server`
- Last 0.5s (frames 570-600): fade to black for loop connection

## File Changes

### Modify

- `src/scenes/CompactPromo.tsx` - Replace 4-beat design with Brand + 5-card carousel + CTA

### Keep (no changes)

- `src/Root.tsx` - Already 10s / 600 frames
- `src/Video.tsx` - Already points to CompactPromo
- `src/styles/theme.ts` - Color palette
- `src/styles/fonts.ts` - Font settings

### Delete

- `src/components/ChatUI.tsx` - No longer needed (carousel replaces chat UI)

## Implementation Notes

- Each FeatureCard component receives: icon, title, description, and a render prop for the visual
- Carousel logic: single parent component tracks `activeIndex` based on frame, applies translateX transforms
- All animations must use `useCurrentFrame()` + `interpolate()` (no CSS transitions)
