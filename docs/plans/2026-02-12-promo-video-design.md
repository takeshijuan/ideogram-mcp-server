# Promo Video Design - Remotion Implementation

**Date**: 2026-02-12
**Status**: Approved
**Goal**: Create a 1-2 minute professional promotional video for ideogram-mcp-server to increase user acquisition

## Overview

A Remotion-based promotional video using Problem → Solution storytelling to demonstrate the value of ideogram-mcp-server for developers. The video will be embedded in README.md and shared across social platforms.

## Project Structure

```
ideogram-mcp-server/
├── examples/
│   └── promo-video/          # New directory
│       ├── package.json
│       ├── remotion.config.ts
│       ├── src/
│       │   ├── Root.tsx       # Entry point
│       │   ├── Video.tsx      # Main composition
│       │   └── scenes/        # Scene components
│       │       ├── Problem.tsx    (0-20s)
│       │       ├── Solution.tsx   (20-40s)
│       │       ├── Demo.tsx       (40-90s)
│       │       └── CTA.tsx        (90-120s)
│       ├── public/
│       │   └── assets/        # Fonts, icons, sample images
│       └── README.md          # Local execution guide
├── README.md                  # Embed rendered video
└── .github/workflows/
    └── render-video.yml       # Auto-render (optional)
```

## Technical Stack

- **Remotion 4.x**: React-based video framework
- **TypeScript**: Strict mode (consistent with main project)
- **Tailwind CSS**: Styling
- **Framer Motion**: Supplementary animations (if needed)
- **Output**: 60fps, 1920x1080, MP4

## Visual Style

**Developer-First Minimal Tech**

- **Color Palette**:
  - Background: `#1e1e1e` (Dark)
  - Accent: `#007ACC` (VSCode Blue), `#4EC9B0` (Teal)
  - Text: `#D4D4D4` (Light Gray)
  - Error: `#F48771` (Red accent)

- **Typography**:
  - Code: JetBrains Mono
  - UI: Inter
  - Monospace for technical elements

- **Style References**: Vercel, Railway, Supabase promo videos

## Scene Breakdown

### Scene 1: Problem (0-20s)

**Purpose**: Establish empathy with developer pain points

**Structure**:

- **0-5s**: Title card
  - Text: "Integrating AI image generation into your app?"
  - Fade in, typography animation

- **5-20s**: Complexity visualization - 3-column layout:

  1. **Left**: Code editor (VSCode dark theme)
     - Code blocks scrolling:
       ```typescript
       // API key management
       // Parameter validation
       // Error handling
       // Rate limiting
       // File storage
       // Cost tracking
       ```
     - Code accumulates rapidly

  2. **Center**: Terminal
     - Error messages streaming:
       - `401 Unauthorized`
       - `429 Rate Limit`
       - `500 Server Error`
     - Red error text stacks up

  3. **Right**: TODO checklist
     - Unchecked items multiply:
       - ☐ Handle API errors
       - ☐ Implement retry logic
       - ☐ Store images locally
       - ☐ Track costs

**Animation**: Elements fade in with 0.3s stagger, screen fills up (overwhelming effect), subtle shake at end

**Message**: "Too much boilerplate, too many edge cases"

---

### Scene 2: Solution (20-40s)

**Purpose**: Present MCP server as simple, clean solution

**Structure**:

- **20-25s**: Transition
  - Problem scene fades to black
  - Light emerges from center
  - Text: "There's a better way"

- **25-35s**: MCP Introduction
  - **Center**: Logo assembly
    ```
    ideogram-mcp-server
    ```
  - Tagline: "AI-powered image generation, zero boilerplate"

  - **Three key values** (appear sequentially with icons):
    1. 🔌 "Plug & Play" - One line install
    2. 🤖 "AI-Driven" - Natural language control
    3. 🛡️ "Production-Ready" - Type-safe, battle-tested

- **35-40s**: Architecture diagram
  ```
  Claude Desktop  ←→  MCP Server  ←→  Ideogram API
      (You)         (Handles           (Images)
                   complexity)
  ```
  - Animated arrows (data flow)
  - Caption: "Let AI handle the complexity"

**Animation**: Clean, smooth (contrast to Problem chaos), fade/slide/scale combinations

---

### Scene 3: Demo (40-90s)

**Purpose**: Show real usage - AI calling tools from natural language

**Structure**:

- **40-45s**: Setup
  - Terminal screen
  - Command types out:
    ```bash
    $ npx @takeshijuan/ideogram-mcp-server
    ```
  - "Installed in 5 seconds" ✓

- **45-75s**: Main demo (3 steps)

  **Step 1: Natural language prompt (45-55s)**
  - Claude Desktop-style chat UI
  - User input appears:
    ```
    "Create a realistic sunset photo over mountains,
     16:9 aspect ratio, high quality"
    ```
  - Message send animation

  **Step 2: AI reasoning & tool call (55-65s)**
  - Split screen:

    **Left**: Claude's "thinking"
    ```
    Analyzing request...
    ✓ Image generation needed
    ✓ Parameters: aspect_ratio=16:9,
      rendering_speed=QUALITY
    ✓ Calling ideogram_generate...
    ```

    **Right**: Tool call JSON (syntax highlighted)
    ```json
    {
      "tool": "ideogram_generate",
      "params": {
        "prompt": "realistic sunset...",
        "aspect_ratio": "16:9",
        "rendering_speed": "QUALITY"
      }
    }
    ```
  - JSON highlights and scrolls

  **Step 3: Result (65-75s)**
  - Generated image fades in (actual Ideogram sample)
  - Metadata sidebar:
    ```
    ✓ Generated in 8s
    ✓ Cost: ~$0.04
    ✓ Saved locally
    ```
  - Thumbs up icon animation

- **75-90s**: Additional features showcase
  - Screen splits into 3 sections (simultaneous display):
    1. **Edit/Inpaint**: Mask → edit visual
    2. **Async**: Background processing progress bar
    3. **Cost Tracking**: Cost graph
  - Caption: "5 tools, unlimited possibilities"

**Animation**: Typing effect (real-time feel), progress bars, loading indicators, image fade/scale

---

### Scene 4: CTA (90-120s)

**Purpose**: Drive action with clear next steps

**Structure**:

- **90-100s**: Get Started section
  - Center: 3-step tutorial

    **Step 1: Install**
    ```bash
    npm install @takeshijuan/ideogram-mcp-server
    ```

    **Step 2: Configure**
    ```json
    // claude_desktop_config.json
    {
      "ideogram": {
        "command": "npx",
        "args": ["@takeshijuan/ideogram-mcp-server"]
      }
    }
    ```

    **Step 3: Start Creating**
    ```
    Just chat with Claude →
    ```

  - Each step fades in sequentially (2-3s each)

- **100-110s**: Links and badges
  - Large display:
    ```
    github.com/takeshijuan/ideogram-mcp-server
    ```
  - Badges below:
    - ⭐ GitHub Stars
    - 📦 npm downloads
    - ✅ TypeScript
    - 🔒 Production-ready

- **110-120s**: Ending
  - Center: Project name + logo
    ```
    ideogram-mcp-server
    AI image generation, simplified.
    ```
  - Background: Particle effects (code/images floating)
  - Fade to black

**CTA Elements** (static display):
- "⭐ Star on GitHub"
- "📖 Read the Docs"
- "🚀 Get Started"

**Animation**: Simple, clear (easy to read), slow fade (no rush), zoom out at end (sense of completion)

---

## Implementation Phases

### Phase 1: Project Setup (Day 1)
- Initialize Remotion project in `examples/promo-video/`
- Set up TypeScript, Tailwind, dependencies
- Configure Remotion settings (60fps, 1920x1080)
- Add fonts (JetBrains Mono, Inter)

### Phase 2: Scene Implementation (Day 2-3)
- Implement each scene component:
  - `Problem.tsx`
  - `Solution.tsx`
  - `Demo.tsx`
  - `CTA.tsx`
- Create reusable components (CodeBlock, Terminal, ChatUI)
- Add animations and transitions

### Phase 3: Assets & Polish (Day 4)
- Create/source sample Ideogram images
- Add sound effects (optional: typing, beeps)
- Fine-tune timing and animations
- Test render locally

### Phase 4: Deployment (Day 5)
- Render final video (MP4)
- Upload to GitHub releases or video hosting
- Embed in README.md
- Optional: Set up GitHub Actions auto-render

## Success Metrics

- **Primary**: Video embedded in README increases GitHub stars/week
- **Secondary**: npm downloads increase after README update
- **Qualitative**: Positive feedback on social media shares

## Open Questions

- [ ] Use actual Ideogram API for demo images, or mock samples?
- [ ] Include background music? (could distract)
- [ ] Auto-render on CI/CD, or manual render only?

## Next Steps

1. Create git worktree for isolated development
2. Initialize Remotion project in `examples/promo-video/`
3. Implement Scene 1 (Problem) as MVP
4. Iterate based on preview feedback
