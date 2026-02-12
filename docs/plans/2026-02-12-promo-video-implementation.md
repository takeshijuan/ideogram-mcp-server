# Promo Video Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a 1-2 minute Remotion promotional video showcasing ideogram-mcp-server's value for developers

**Architecture:** React-based video using Remotion 4.x with TypeScript strict mode. Four scene components (Problem, Solution, Demo, CTA) composed into a single video timeline. Tailwind CSS for styling, developer-first minimal tech aesthetic.

**Tech Stack:** Remotion 4.x, React 18, TypeScript 5.x, Tailwind CSS, JetBrains Mono & Inter fonts

---

## Phase 1: Project Initialization

### Task 1: Initialize Remotion Project

**Files:**
- Create: `examples/promo-video/package.json`
- Create: `examples/promo-video/remotion.config.ts`
- Create: `examples/promo-video/tsconfig.json`
- Create: `examples/promo-video/.gitignore`

**Step 1: Create directory and initialize npm**

```bash
cd .worktrees/promo-video
mkdir -p examples/promo-video
cd examples/promo-video
npm init -y
```

**Step 2: Install Remotion and dependencies**

```bash
npm install remotion@^4.0.0 react@^18.0.0 react-dom@^18.0.0
npm install -D @remotion/cli@^4.0.0 typescript@^5.0.0 @types/react@^18.0.0 @types/react-dom@^18.0.0
npm install -D tailwindcss@^3.0.0 postcss@^8.0.0 autoprefixer@^10.0.0
```

**Step 3: Create package.json scripts**

Edit `package.json`:

```json
{
  "name": "ideogram-promo-video",
  "version": "1.0.0",
  "scripts": {
    "start": "remotion studio",
    "build": "remotion render Video out/promo.mp4",
    "upgrade": "remotion upgrade"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "remotion": "^4.0.0"
  },
  "devDependencies": {
    "@remotion/cli": "^4.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Step 4: Create TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "jsx": "react-jsx",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src"]
}
```

**Step 5: Create Remotion config**

Create `remotion.config.ts`:

```typescript
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
```

**Step 6: Create .gitignore**

Create `.gitignore`:

```
node_modules/
out/
dist/
.DS_Store
```

**Step 7: Verify setup**

Run: `npm run start`
Expected: Remotion Studio opens in browser (will show error - no compositions yet, this is OK)

**Step 8: Commit**

```bash
git add examples/promo-video/package.json examples/promo-video/package-lock.json examples/promo-video/tsconfig.json examples/promo-video/remotion.config.ts examples/promo-video/.gitignore
git commit -m "feat(promo): initialize Remotion project structure"
```

---

### Task 2: Configure Tailwind CSS

**Files:**
- Create: `examples/promo-video/tailwind.config.js`
- Create: `examples/promo-video/postcss.config.js`
- Create: `examples/promo-video/src/styles/global.css`

**Step 1: Initialize Tailwind**

```bash
cd examples/promo-video
npx tailwindcss init -p
```

**Step 2: Configure Tailwind with color palette**

Edit `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#1e1e1e',
          text: '#D4D4D4',
        },
        accent: {
          blue: '#007ACC',
          teal: '#4EC9B0',
          red: '#F48771',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

**Step 3: Create global CSS**

Create `src/styles/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-dark-bg text-dark-text font-sans;
  }
}
```

**Step 4: Verify Tailwind works**

Run: `npm run start`
Expected: No errors, Remotion Studio still accessible

**Step 5: Commit**

```bash
git add examples/promo-video/tailwind.config.js examples/promo-video/postcss.config.js examples/promo-video/src/styles/global.css
git commit -m "feat(promo): configure Tailwind CSS with theme colors"
```

---

### Task 3: Add Fonts

**Files:**
- Create: `examples/promo-video/public/fonts/` (directory)
- Create: `examples/promo-video/src/styles/fonts.css`
- Modify: `examples/promo-video/src/styles/global.css`

**Step 1: Download fonts**

Download from Google Fonts:
- JetBrains Mono: https://fonts.google.com/specimen/JetBrains+Mono
- Inter: https://fonts.google.com/specimen/Inter

Save to `public/fonts/`:
- `JetBrainsMono-Regular.woff2`
- `Inter-Regular.woff2`
- `Inter-Bold.woff2`

**Step 2: Create font-face declarations**

Create `src/styles/fonts.css`:

```css
@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/JetBrainsMono-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

**Step 3: Import fonts in global CSS**

Modify `src/styles/global.css`:

```css
@import './fonts.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-dark-bg text-dark-text font-sans;
  }
}
```

**Step 4: Verify fonts load**

Run: `npm run start`
Expected: Fonts load without errors in browser console

**Step 5: Commit**

```bash
git add examples/promo-video/public/fonts/ examples/promo-video/src/styles/fonts.css examples/promo-video/src/styles/global.css
git commit -m "feat(promo): add JetBrains Mono and Inter fonts"
```

---

## Phase 2: Foundation & Shared Components

### Task 4: Create Type Definitions

**Files:**
- Create: `examples/promo-video/src/types/index.ts`

**Step 1: Define shared types**

Create `src/types/index.ts`:

```typescript
export interface SceneProps {
  durationInFrames: number;
}

export interface AnimationConfig {
  delay?: number;
  duration?: number;
  easing?: 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
}

export interface CodeBlock {
  language: string;
  code: string;
}

export interface TerminalLine {
  type: 'command' | 'output' | 'error';
  text: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add examples/promo-video/src/types/index.ts
git commit -m "feat(promo): add shared type definitions"
```

---

### Task 5: Create Shared Utilities

**Files:**
- Create: `examples/promo-video/src/utils/animation.ts`
- Create: `examples/promo-video/src/utils/timing.ts`

**Step 1: Create animation utilities**

Create `src/utils/animation.ts`:

```typescript
import { interpolate, spring, SpringConfig } from 'remotion';

export const fadeIn = (frame: number, startFrame: number, duration: number): number => {
  return interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
};

export const fadeOut = (frame: number, startFrame: number, duration: number): number => {
  return interpolate(
    frame,
    [startFrame, startFrame + duration],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
};

export const slideInFromLeft = (frame: number, startFrame: number, duration: number): number => {
  return interpolate(
    frame,
    [startFrame, startFrame + duration],
    [-100, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
};

export const springConfig: SpringConfig = {
  damping: 100,
  mass: 0.5,
  stiffness: 200,
};

export const getSpringValue = (frame: number, delay: number = 0): number => {
  return spring({
    frame: frame - delay,
    fps: 60,
    config: springConfig,
  });
};
```

**Step 2: Create timing utilities**

Create `src/utils/timing.ts`:

```typescript
export const FPS = 60;

export const secondsToFrames = (seconds: number): number => {
  return Math.round(seconds * FPS);
};

export const framesToSeconds = (frames: number): number => {
  return frames / FPS;
};

export interface TimeRange {
  start: number; // in frames
  end: number;   // in frames
}

export const createTimeRange = (startSeconds: number, endSeconds: number): TimeRange => {
  return {
    start: secondsToFrames(startSeconds),
    end: secondsToFrames(endSeconds),
  };
};

export const isInRange = (frame: number, range: TimeRange): boolean => {
  return frame >= range.start && frame < range.end;
};
```

**Step 3: Verify utilities compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add examples/promo-video/src/utils/animation.ts examples/promo-video/src/utils/timing.ts
git commit -m "feat(promo): add animation and timing utilities"
```

---

### Task 6: Create CodeBlock Component

**Files:**
- Create: `examples/promo-video/src/components/CodeBlock.tsx`

**Step 1: Implement CodeBlock component**

Create `src/components/CodeBlock.tsx`:

```typescript
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { fadeIn } from '../utils/animation';

interface CodeBlockProps {
  code: string;
  language?: string;
  startFrame: number;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'typescript',
  startFrame,
  className = '',
}) => {
  const frame = useCurrentFrame();
  const opacity = fadeIn(frame, startFrame, 20);

  return (
    <div
      className={`bg-dark-bg border border-dark-text/20 rounded p-4 font-mono text-sm ${className}`}
      style={{ opacity }}
    >
      <pre className="text-dark-text whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
    </div>
  );
};
```

**Step 2: Create temporary test composition**

Create `src/Root.tsx`:

```typescript
import React from 'react';
import { Composition } from 'remotion';
import { CodeBlock } from './components/CodeBlock';

const TestCodeBlock: React.FC = () => {
  return (
    <div className="bg-dark-bg w-full h-full flex items-center justify-center p-8">
      <CodeBlock
        code="const hello = 'world';"
        startFrame={0}
      />
    </div>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TestCodeBlock"
        component={TestCodeBlock}
        durationInFrames={120}
        fps={60}
        width={1920}
        height={1080}
      />
    </>
  );
};
```

**Step 3: Preview in Remotion Studio**

Run: `npm run start`
Navigate to: http://localhost:3000
Expected: See CodeBlock component fading in

**Step 4: Commit**

```bash
git add examples/promo-video/src/components/CodeBlock.tsx examples/promo-video/src/Root.tsx
git commit -m "feat(promo): add CodeBlock component"
```

---

### Task 7: Create Terminal Component

**Files:**
- Create: `examples/promo-video/src/components/Terminal.tsx`

**Step 1: Implement Terminal component**

Create `src/components/Terminal.tsx`:

```typescript
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { fadeIn } from '../utils/animation';
import type { TerminalLine } from '../types';

interface TerminalProps {
  lines: TerminalLine[];
  startFrame: number;
  staggerDelay?: number;
  className?: string;
}

export const Terminal: React.FC<TerminalProps> = ({
  lines,
  startFrame,
  staggerDelay = 10,
  className = '',
}) => {
  const frame = useCurrentFrame();

  return (
    <div className={`bg-dark-bg border border-dark-text/20 rounded p-4 font-mono text-sm ${className}`}>
      {lines.map((line, index) => {
        const opacity = fadeIn(frame, startFrame + (index * staggerDelay), 15);
        const colorClass = line.type === 'error' ? 'text-accent-red' : 'text-dark-text';

        return (
          <div
            key={index}
            className={`${colorClass} mb-1`}
            style={{ opacity }}
          >
            {line.type === 'command' && <span className="text-accent-teal">$ </span>}
            {line.text}
          </div>
        );
      })}
    </div>
  );
};
```

**Step 2: Update test composition**

Modify `src/Root.tsx`:

```typescript
import React from 'react';
import { Composition } from 'remotion';
import { CodeBlock } from './components/CodeBlock';
import { Terminal } from './components/Terminal';
import type { TerminalLine } from './types';

const TestComponents: React.FC = () => {
  const terminalLines: TerminalLine[] = [
    { type: 'command', text: 'npm install' },
    { type: 'output', text: 'Installing packages...' },
    { type: 'error', text: '401 Unauthorized' },
  ];

  return (
    <div className="bg-dark-bg w-full h-full flex items-center justify-center p-8 gap-8">
      <CodeBlock
        code="const hello = 'world';"
        startFrame={0}
        className="flex-1"
      />
      <Terminal
        lines={terminalLines}
        startFrame={30}
        className="flex-1"
      />
    </div>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TestComponents"
        component={TestComponents}
        durationInFrames={120}
        fps={60}
        width={1920}
        height={1080}
      />
    </>
  );
};
```

**Step 3: Preview in Remotion Studio**

Run: `npm run start`
Expected: See CodeBlock and Terminal components with staggered animations

**Step 4: Commit**

```bash
git add examples/promo-video/src/components/Terminal.tsx examples/promo-video/src/Root.tsx
git commit -m "feat(promo): add Terminal component"
```

---

## Phase 3: Scene 1 - Problem (0-20s)

### Task 8: Create Problem Scene Structure

**Files:**
- Create: `examples/promo-video/src/scenes/Problem.tsx`

**Step 1: Create Problem scene skeleton**

Create `src/scenes/Problem.tsx`:

```typescript
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { fadeIn, fadeOut } from '../utils/animation';
import { secondsToFrames } from '../utils/timing';
import type { SceneProps } from '../types';

export const Problem: React.FC<SceneProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  // Title card: 0-5s (0-300 frames)
  const titleStart = 0;
  const titleEnd = secondsToFrames(5);

  // Complexity visualization: 5-20s (300-1200 frames)
  const complexityStart = titleEnd;
  const complexityEnd = durationInFrames;

  const titleOpacity = frame < titleEnd
    ? fadeIn(frame, titleStart, 30)
    : fadeOut(frame, titleEnd - 30, 30);

  return (
    <AbsoluteFill className="bg-dark-bg">
      {/* Title Card (0-5s) */}
      {frame < titleEnd && (
        <div
          className="flex items-center justify-center h-full"
          style={{ opacity: titleOpacity }}
        >
          <h1 className="text-6xl font-bold text-dark-text text-center max-w-4xl">
            Integrating AI image generation into your app?
          </h1>
        </div>
      )}

      {/* Complexity Visualization (5-20s) */}
      {frame >= complexityStart && (
        <div className="flex items-center justify-center h-full p-16">
          <div className="text-4xl text-dark-text/50">
            Complexity visualization (TODO)
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
```

**Step 2: Add to Root composition**

Modify `src/Root.tsx`:

```typescript
import React from 'react';
import { Composition } from 'remotion';
import { Problem } from './scenes/Problem';
import { secondsToFrames } from './utils/timing';

export const RemotionRoot: React.FC = () => {
  const problemDuration = secondsToFrames(20);

  return (
    <>
      <Composition
        id="Problem"
        component={Problem}
        durationInFrames={problemDuration}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{ durationInFrames: problemDuration }}
      />
    </>
  );
};
```

**Step 3: Preview Problem scene**

Run: `npm run start`
Expected: See title card fading in, then placeholder for complexity

**Step 4: Commit**

```bash
git add examples/promo-video/src/scenes/Problem.tsx examples/promo-video/src/Root.tsx
git commit -m "feat(promo): add Problem scene skeleton with title card"
```

---

### Task 9: Implement Complexity Visualization

**Files:**
- Modify: `examples/promo-video/src/scenes/Problem.tsx`

**Step 1: Add 3-column layout with content**

Modify `src/scenes/Problem.tsx` (replace complexity section):

```typescript
{/* Complexity Visualization (5-20s) */}
{frame >= complexityStart && (
  <div className="grid grid-cols-3 gap-8 h-full p-16">
    {/* Left: Code Editor */}
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-accent-blue mb-4">
        app.ts
      </h2>
      <CodeBlock
        code={`// API key management
const apiKey = process.env.API_KEY;

// Parameter validation
if (!validateParams(input)) {
  throw new Error('Invalid params');
}

// Error handling
try {
  await generateImage(prompt);
} catch (error) {
  handleAPIError(error);
}

// Rate limiting
await rateLimiter.check();

// File storage
await saveToLocal(imageUrl);

// Cost tracking
trackCost(response);`}
        startFrame={complexityStart}
      />
    </div>

    {/* Center: Terminal */}
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-accent-teal mb-4">
        terminal
      </h2>
      <Terminal
        lines={[
          { type: 'error', text: '401 Unauthorized' },
          { type: 'error', text: 'Invalid API key' },
          { type: 'error', text: '' },
          { type: 'error', text: '429 Rate Limit Exceeded' },
          { type: 'error', text: 'Too many requests' },
          { type: 'error', text: '' },
          { type: 'error', text: '500 Internal Server Error' },
          { type: 'error', text: 'Service unavailable' },
        ]}
        startFrame={complexityStart + 20}
        staggerDelay={8}
      />
    </div>

    {/* Right: TODO List */}
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-dark-text mb-4">
        TODO
      </h2>
      {[
        'Handle API errors',
        'Implement retry logic',
        'Store images locally',
        'Track costs',
        'Add rate limiting',
        'Manage API keys',
        'Validate inputs',
        'Handle timeouts',
      ].map((item, index) => {
        const itemOpacity = fadeIn(frame, complexityStart + 40 + (index * 6), 15);
        return (
          <div
            key={index}
            className="flex items-center gap-3 text-lg text-dark-text"
            style={{ opacity: itemOpacity }}
          >
            <span className="text-accent-red">☐</span>
            <span>{item}</span>
          </div>
        );
      })}
    </div>
  </div>
)}

{/* Bottom Message */}
{frame >= complexityStart + 180 && (
  <div
    className="absolute bottom-16 left-0 right-0 text-center"
    style={{ opacity: fadeIn(frame, complexityStart + 180, 30) }}
  >
    <p className="text-3xl text-dark-text/70 italic">
      Too much boilerplate, too many edge cases
    </p>
  </div>
)}
```

**Step 2: Import CodeBlock and Terminal**

Add imports at top of `Problem.tsx`:

```typescript
import { CodeBlock } from '../components/CodeBlock';
import { Terminal } from '../components/Terminal';
```

**Step 3: Preview scene**

Run: `npm run start`
Expected: See 3-column layout with code, terminal errors, and TODO list

**Step 4: Commit**

```bash
git add examples/promo-video/src/scenes/Problem.tsx
git commit -m "feat(promo): implement Problem scene complexity visualization"
```

---

## Phase 4: Scene 2 - Solution (20-40s)

### Task 10: Create Solution Scene

**Files:**
- Create: `examples/promo-video/src/scenes/Solution.tsx`

**Step 1: Implement Solution scene**

Create `src/scenes/Solution.tsx`:

```typescript
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { fadeIn, slideInFromLeft } from '../utils/animation';
import { secondsToFrames } from '../utils/timing';
import type { SceneProps } from '../types';

export const Solution: React.FC<SceneProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  // Transition: 0-5s
  const transitionStart = 0;
  const transitionEnd = secondsToFrames(5);

  // MCP Introduction: 5-15s
  const introStart = transitionEnd;
  const introEnd = secondsToFrames(15);

  // Architecture diagram: 15-20s
  const archStart = secondsToFrames(15);

  const transitionOpacity = frame < transitionEnd
    ? fadeIn(frame, transitionStart + 60, 30)
    : 0;

  return (
    <AbsoluteFill className="bg-dark-bg">
      {/* Transition (0-5s) */}
      {frame < transitionEnd && (
        <div
          className="flex items-center justify-center h-full"
          style={{ opacity: transitionOpacity }}
        >
          <h2 className="text-5xl font-bold text-accent-blue">
            There's a better way
          </h2>
        </div>
      )}

      {/* MCP Introduction (5-15s) */}
      {frame >= introStart && frame < archStart && (
        <div className="flex flex-col items-center justify-center h-full gap-12">
          {/* Logo */}
          <div
            className="text-center"
            style={{ opacity: fadeIn(frame, introStart, 30) }}
          >
            <h1 className="text-7xl font-bold text-dark-text font-mono">
              ideogram-mcp-server
            </h1>
            <p className="text-3xl text-dark-text/70 mt-4">
              AI-powered image generation, zero boilerplate
            </p>
          </div>

          {/* Three Key Values */}
          <div className="flex gap-16 mt-8">
            {[
              { icon: '🔌', title: 'Plug & Play', subtitle: 'One line install' },
              { icon: '🤖', title: 'AI-Driven', subtitle: 'Natural language control' },
              { icon: '🛡️', title: 'Production-Ready', subtitle: 'Type-safe, battle-tested' },
            ].map((item, index) => {
              const itemOpacity = fadeIn(frame, introStart + 60 + (index * 20), 30);
              return (
                <div
                  key={index}
                  className="flex flex-col items-center text-center"
                  style={{ opacity: itemOpacity }}
                >
                  <div className="text-6xl mb-4">{item.icon}</div>
                  <h3 className="text-2xl font-bold text-dark-text">{item.title}</h3>
                  <p className="text-lg text-dark-text/70">{item.subtitle}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Architecture Diagram (15-20s) */}
      {frame >= archStart && (
        <div
          className="flex items-center justify-center h-full"
          style={{ opacity: fadeIn(frame, archStart, 30) }}
        >
          <div className="flex items-center gap-12 text-2xl">
            <div className="text-center">
              <div className="text-5xl mb-2">👤</div>
              <div className="text-dark-text">Claude Desktop</div>
              <div className="text-dark-text/50 text-lg">(You)</div>
            </div>

            <div className="text-accent-blue text-6xl">←→</div>

            <div className="text-center">
              <div className="text-5xl mb-2">⚙️</div>
              <div className="text-dark-text">MCP Server</div>
              <div className="text-dark-text/50 text-lg">(Handles complexity)</div>
            </div>

            <div className="text-accent-teal text-6xl">←→</div>

            <div className="text-center">
              <div className="text-5xl mb-2">🎨</div>
              <div className="text-dark-text">Ideogram API</div>
              <div className="text-dark-text/50 text-lg">(Images)</div>
            </div>
          </div>
        </div>
      )}

      {/* Caption */}
      {frame >= archStart + 30 && (
        <div
          className="absolute bottom-16 left-0 right-0 text-center"
          style={{ opacity: fadeIn(frame, archStart + 30, 30) }}
        >
          <p className="text-3xl text-accent-blue italic">
            Let AI handle the complexity
          </p>
        </div>
      )}
    </AbsoluteFill>
  );
};
```

**Step 2: Add to Root composition**

Modify `src/Root.tsx`:

```typescript
import { Solution } from './scenes/Solution';

// In RemotionRoot component, add:
const solutionDuration = secondsToFrames(20);

<Composition
  id="Solution"
  component={Solution}
  durationInFrames={solutionDuration}
  fps={60}
  width={1920}
  height={1080}
  defaultProps={{ durationInFrames: solutionDuration }}
/>
```

**Step 3: Preview Solution scene**

Run: `npm run start`
Expected: See transition, logo with values, then architecture diagram

**Step 4: Commit**

```bash
git add examples/promo-video/src/scenes/Solution.tsx examples/promo-video/src/Root.tsx
git commit -m "feat(promo): implement Solution scene"
```

---

## Phase 5: Scene 3 - Demo (40-90s)

### Task 11: Create Chat UI Component

**Files:**
- Create: `examples/promo-video/src/components/ChatUI.tsx`

**Step 1: Implement ChatUI component**

Create `src/components/ChatUI.tsx`:

```typescript
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { fadeIn } from '../utils/animation';
import type { ChatMessage } from '../types';

interface ChatUIProps {
  messages: ChatMessage[];
  startFrame: number;
  staggerDelay?: number;
  className?: string;
}

export const ChatUI: React.FC<ChatUIProps> = ({
  messages,
  startFrame,
  staggerDelay = 30,
  className = '',
}) => {
  const frame = useCurrentFrame();

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {messages.map((message, index) => {
        const opacity = fadeIn(frame, startFrame + (index * staggerDelay), 20);
        const isUser = message.role === 'user';

        return (
          <div
            key={index}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            style={{ opacity }}
          >
            <div
              className={`max-w-2xl rounded-lg p-4 ${
                isUser
                  ? 'bg-accent-blue/20 border border-accent-blue'
                  : 'bg-dark-text/10 border border-dark-text/20'
              }`}
            >
              <div className="text-sm text-dark-text/70 mb-1 uppercase">
                {isUser ? 'You' : 'Claude'}
              </div>
              <div className="text-lg text-dark-text whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

**Step 2: Test ChatUI**

Modify `src/Root.tsx` to add test:

```typescript
import { ChatUI } from './components/ChatUI';

const TestChat: React.FC = () => {
  const messages: ChatMessage[] = [
    { role: 'user', content: 'Create a sunset photo' },
    { role: 'assistant', content: 'I\'ll generate that for you...' },
  ];

  return (
    <div className="bg-dark-bg w-full h-full flex items-center justify-center p-16">
      <ChatUI messages={messages} startFrame={0} />
    </div>
  );
};

// Add composition
<Composition
  id="TestChat"
  component={TestChat}
  durationInFrames={120}
  fps={60}
  width={1920}
  height={1080}
/>
```

**Step 3: Preview ChatUI**

Run: `npm run start`
Expected: See chat messages appear with stagger

**Step 4: Commit**

```bash
git add examples/promo-video/src/components/ChatUI.tsx examples/promo-video/src/Root.tsx
git commit -m "feat(promo): add ChatUI component"
```

---

### Task 12: Create Demo Scene

**Files:**
- Create: `examples/promo-video/src/scenes/Demo.tsx`

**Step 1: Implement Demo scene skeleton**

Create `src/scenes/Demo.tsx`:

```typescript
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { fadeIn } from '../utils/animation';
import { secondsToFrames } from '../utils/timing';
import { Terminal } from '../components/Terminal';
import { ChatUI } from '../components/ChatUI';
import { CodeBlock } from '../components/CodeBlock';
import type { SceneProps, ChatMessage, TerminalLine } from '../types';

export const Demo: React.FC<SceneProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  // Setup: 0-5s
  const setupStart = 0;
  const setupEnd = secondsToFrames(5);

  // Main demo: 5-35s
  const demoStart = setupEnd;
  const promptStart = demoStart;
  const aiThinkingStart = secondsToFrames(15);
  const resultStart = secondsToFrames(25);

  // Additional features: 35-50s
  const featuresStart = secondsToFrames(35);

  // Setup section
  const setupLines: TerminalLine[] = [
    { type: 'command', text: 'npx @takeshijuan/ideogram-mcp-server' },
    { type: 'output', text: 'Installing...' },
    { type: 'output', text: '✓ Installed in 5 seconds' },
  ];

  // Prompt section
  const promptMessages: ChatMessage[] = [
    {
      role: 'user',
      content: 'Create a realistic sunset photo over mountains,\n16:9 aspect ratio, high quality',
    },
  ];

  return (
    <AbsoluteFill className="bg-dark-bg">
      {/* Setup (0-5s) */}
      {frame < setupEnd && (
        <div className="flex items-center justify-center h-full p-16">
          <Terminal
            lines={setupLines}
            startFrame={setupStart}
            staggerDelay={40}
            className="w-1/2"
          />
        </div>
      )}

      {/* Step 1: Prompt (5-15s) */}
      {frame >= promptStart && frame < aiThinkingStart && (
        <div className="flex items-center justify-center h-full p-16">
          <ChatUI
            messages={promptMessages}
            startFrame={promptStart}
            className="w-3/4"
          />
        </div>
      )}

      {/* Step 2: AI Thinking & Tool Call (15-25s) */}
      {frame >= aiThinkingStart && frame < resultStart && (
        <div className="grid grid-cols-2 gap-8 h-full p-16">
          {/* Left: AI Thinking */}
          <div className="flex flex-col gap-4">
            <h3 className="text-2xl font-bold text-accent-blue mb-4">
              Claude's Reasoning
            </h3>
            <div style={{ opacity: fadeIn(frame, aiThinkingStart, 20) }}>
              <div className="space-y-2 text-lg text-dark-text">
                <div className="flex items-center gap-2">
                  <span className="text-accent-teal">✓</span>
                  <span>Analyzing request...</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-accent-teal">✓</span>
                  <span>Image generation needed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-accent-teal">✓</span>
                  <span>Parameters: aspect_ratio=16:9, rendering_speed=QUALITY</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-accent-teal">✓</span>
                  <span>Calling ideogram_generate...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Tool Call JSON */}
          <div className="flex flex-col gap-4">
            <h3 className="text-2xl font-bold text-accent-teal mb-4">
              Tool Call
            </h3>
            <CodeBlock
              code={`{
  "tool": "ideogram_generate",
  "params": {
    "prompt": "realistic sunset over mountains",
    "aspect_ratio": "16:9",
    "rendering_speed": "QUALITY",
    "num_images": 1,
    "magic_prompt": "ON"
  }
}`}
              language="json"
              startFrame={aiThinkingStart + 40}
            />
          </div>
        </div>
      )}

      {/* Step 3: Result (25-35s) */}
      {frame >= resultStart && frame < featuresStart && (
        <div className="flex items-center justify-center h-full p-16 gap-8">
          {/* Placeholder for image */}
          <div
            className="w-1/2 h-3/4 bg-gradient-to-br from-orange-500 to-purple-600 rounded-lg flex items-center justify-center"
            style={{ opacity: fadeIn(frame, resultStart, 30) }}
          >
            <div className="text-white text-2xl">Generated Image</div>
          </div>

          {/* Metadata */}
          <div
            className="w-1/4 space-y-4"
            style={{ opacity: fadeIn(frame, resultStart + 40, 30) }}
          >
            <div className="flex items-center gap-2 text-xl text-dark-text">
              <span className="text-accent-teal">✓</span>
              <span>Generated in 8s</span>
            </div>
            <div className="flex items-center gap-2 text-xl text-dark-text">
              <span className="text-accent-teal">✓</span>
              <span>Cost: ~$0.04</span>
            </div>
            <div className="flex items-center gap-2 text-xl text-dark-text">
              <span className="text-accent-teal">✓</span>
              <span>Saved locally</span>
            </div>
            <div
              className="text-6xl text-center mt-8"
              style={{ opacity: fadeIn(frame, resultStart + 80, 20) }}
            >
              👍
            </div>
          </div>
        </div>
      )}

      {/* Additional Features (35-50s) */}
      {frame >= featuresStart && (
        <div>
          <div
            className="text-center py-8"
            style={{ opacity: fadeIn(frame, featuresStart, 20) }}
          >
            <h2 className="text-4xl font-bold text-dark-text">
              5 tools, unlimited possibilities
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-8 px-16 pb-16">
            {/* Edit/Inpaint */}
            <div
              className="text-center"
              style={{ opacity: fadeIn(frame, featuresStart + 30, 20) }}
            >
              <div className="text-5xl mb-4">✏️</div>
              <h3 className="text-2xl font-bold text-dark-text mb-2">Edit/Inpaint</h3>
              <p className="text-dark-text/70">Mask-based image editing</p>
            </div>

            {/* Async */}
            <div
              className="text-center"
              style={{ opacity: fadeIn(frame, featuresStart + 50, 20) }}
            >
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold text-dark-text mb-2">Async</h3>
              <p className="text-dark-text/70">Background processing</p>
            </div>

            {/* Cost Tracking */}
            <div
              className="text-center"
              style={{ opacity: fadeIn(frame, featuresStart + 70, 20) }}
            >
              <div className="text-5xl mb-4">💰</div>
              <h3 className="text-2xl font-bold text-dark-text mb-2">Cost Tracking</h3>
              <p className="text-dark-text/70">Estimated costs per request</p>
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
```

**Step 2: Add to Root composition**

Modify `src/Root.tsx`:

```typescript
import { Demo } from './scenes/Demo';

const demoDuration = secondsToFrames(50);

<Composition
  id="Demo"
  component={Demo}
  durationInFrames={demoDuration}
  fps={60}
  width={1920}
  height={1080}
  defaultProps={{ durationInFrames: demoDuration }}
/>
```

**Step 3: Preview Demo scene**

Run: `npm run start`
Expected: See setup, prompt, AI reasoning, result, and features

**Step 4: Commit**

```bash
git add examples/promo-video/src/scenes/Demo.tsx examples/promo-video/src/Root.tsx
git commit -m "feat(promo): implement Demo scene with all steps"
```

---

## Phase 6: Scene 4 - CTA (90-120s)

### Task 13: Create CTA Scene

**Files:**
- Create: `examples/promo-video/src/scenes/CTA.tsx`

**Step 1: Implement CTA scene**

Create `src/scenes/CTA.tsx`:

```typescript
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { fadeIn } from '../utils/animation';
import { secondsToFrames } from '../utils/timing';
import { CodeBlock } from '../components/CodeBlock';
import type { SceneProps } from '../types';

export const CTA: React.FC<SceneProps> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  // Get Started: 0-10s
  const getStartedStart = 0;
  const getStartedEnd = secondsToFrames(10);

  // Links & Badges: 10-20s
  const linksStart = secondsToFrames(10);
  const linksEnd = secondsToFrames(20);

  // Ending: 20-30s
  const endingStart = secondsToFrames(20);

  return (
    <AbsoluteFill className="bg-dark-bg">
      {/* Get Started (0-10s) */}
      {frame < getStartedEnd && (
        <div className="flex flex-col items-center justify-center h-full gap-8 p-16">
          <h2
            className="text-5xl font-bold text-dark-text mb-8"
            style={{ opacity: fadeIn(frame, getStartedStart, 20) }}
          >
            Get Started
          </h2>

          {/* Step 1: Install */}
          <div
            className="w-3/4"
            style={{ opacity: fadeIn(frame, getStartedStart + 40, 20) }}
          >
            <div className="text-2xl text-accent-blue mb-2">Step 1: Install</div>
            <CodeBlock
              code="npm install @takeshijuan/ideogram-mcp-server"
              language="bash"
              startFrame={getStartedStart + 50}
            />
          </div>

          {/* Step 2: Configure */}
          <div
            className="w-3/4"
            style={{ opacity: fadeIn(frame, getStartedStart + 90, 20) }}
          >
            <div className="text-2xl text-accent-teal mb-2">Step 2: Configure</div>
            <CodeBlock
              code={`// claude_desktop_config.json
{
  "ideogram": {
    "command": "npx",
    "args": ["@takeshijuan/ideogram-mcp-server"]
  }
}`}
              language="json"
              startFrame={getStartedStart + 100}
            />
          </div>

          {/* Step 3: Start Creating */}
          <div
            className="text-center"
            style={{ opacity: fadeIn(frame, getStartedStart + 140, 20) }}
          >
            <div className="text-2xl text-dark-text mb-2">Step 3: Start Creating</div>
            <div className="text-4xl text-accent-blue mt-4">
              Just chat with Claude →
            </div>
          </div>
        </div>
      )}

      {/* Links & Badges (10-20s) */}
      {frame >= linksStart && frame < linksEnd && (
        <div className="flex flex-col items-center justify-center h-full gap-12">
          <div
            className="text-center"
            style={{ opacity: fadeIn(frame, linksStart, 20) }}
          >
            <div className="text-5xl font-mono text-accent-blue mb-8">
              github.com/takeshijuan/ideogram-mcp-server
            </div>

            <div className="flex gap-8 justify-center mt-8">
              {['⭐ GitHub Stars', '📦 npm downloads', '✅ TypeScript', '🔒 Production-ready'].map((badge, index) => (
                <div
                  key={index}
                  className="bg-dark-text/10 border border-dark-text/20 rounded-full px-6 py-3 text-xl text-dark-text"
                  style={{ opacity: fadeIn(frame, linksStart + 40 + (index * 15), 15) }}
                >
                  {badge}
                </div>
              ))}
            </div>
          </div>

          <div
            className="flex gap-8"
            style={{ opacity: fadeIn(frame, linksStart + 120, 20) }}
          >
            {['⭐ Star on GitHub', '📖 Read the Docs', '🚀 Get Started'].map((cta, index) => (
              <div
                key={index}
                className="bg-accent-blue/20 border-2 border-accent-blue rounded-lg px-8 py-4 text-2xl font-bold text-accent-blue cursor-pointer hover:bg-accent-blue/30 transition-colors"
              >
                {cta}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ending (20-30s) */}
      {frame >= endingStart && (
        <div
          className="flex flex-col items-center justify-center h-full"
          style={{ opacity: fadeIn(frame, endingStart, 30) }}
        >
          <h1 className="text-8xl font-bold font-mono text-dark-text mb-6">
            ideogram-mcp-server
          </h1>
          <p className="text-4xl text-dark-text/70 italic">
            AI image generation, simplified.
          </p>
        </div>
      )}
    </AbsoluteFill>
  );
};
```

**Step 2: Add to Root composition**

Modify `src/Root.tsx`:

```typescript
import { CTA } from './scenes/CTA';

const ctaDuration = secondsToFrames(30);

<Composition
  id="CTA"
  component={CTA}
  durationInFrames={ctaDuration}
  fps={60}
  width={1920}
  height={1080}
  defaultProps={{ durationInFrames: ctaDuration }}
/>
```

**Step 3: Preview CTA scene**

Run: `npm run start`
Expected: See get started steps, links/badges, and ending

**Step 4: Commit**

```bash
git add examples/promo-video/src/scenes/CTA.tsx examples/promo-video/src/Root.tsx
git commit -m "feat(promo): implement CTA scene"
```

---

## Phase 7: Main Composition & Integration

### Task 14: Create Main Video Composition

**Files:**
- Create: `examples/promo-video/src/Video.tsx`
- Modify: `examples/promo-video/src/Root.tsx`

**Step 1: Create Video composition**

Create `src/Video.tsx`:

```typescript
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { Problem } from './scenes/Problem';
import { Solution } from './scenes/Solution';
import { Demo } from './scenes/Demo';
import { CTA } from './scenes/CTA';
import { secondsToFrames } from './utils/timing';
import './styles/global.css';

export const Video: React.FC = () => {
  const problemDuration = secondsToFrames(20);
  const solutionDuration = secondsToFrames(20);
  const demoDuration = secondsToFrames(50);
  const ctaDuration = secondsToFrames(30);

  return (
    <AbsoluteFill>
      <Sequence durationInFrames={problemDuration}>
        <Problem durationInFrames={problemDuration} />
      </Sequence>

      <Sequence from={problemDuration} durationInFrames={solutionDuration}>
        <Solution durationInFrames={solutionDuration} />
      </Sequence>

      <Sequence from={problemDuration + solutionDuration} durationInFrames={demoDuration}>
        <Demo durationInFrames={demoDuration} />
      </Sequence>

      <Sequence from={problemDuration + solutionDuration + demoDuration} durationInFrames={ctaDuration}>
        <CTA durationInFrames={ctaDuration} />
      </Sequence>
    </AbsoluteFill>
  );
};
```

**Step 2: Update Root to include main Video composition**

Modify `src/Root.tsx`:

```typescript
import React from 'react';
import { Composition } from 'remotion';
import { Video } from './Video';
import { Problem } from './scenes/Problem';
import { Solution } from './scenes/Solution';
import { Demo } from './scenes/Demo';
import { CTA } from './scenes/CTA';
import { secondsToFrames } from './utils/timing';

export const RemotionRoot: React.FC = () => {
  const problemDuration = secondsToFrames(20);
  const solutionDuration = secondsToFrames(20);
  const demoDuration = secondsToFrames(50);
  const ctaDuration = secondsToFrames(30);
  const totalDuration = problemDuration + solutionDuration + demoDuration + ctaDuration;

  return (
    <>
      {/* Main Video Composition */}
      <Composition
        id="Video"
        component={Video}
        durationInFrames={totalDuration}
        fps={60}
        width={1920}
        height={1080}
      />

      {/* Individual Scenes for Development */}
      <Composition
        id="Problem"
        component={Problem}
        durationInFrames={problemDuration}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{ durationInFrames: problemDuration }}
      />

      <Composition
        id="Solution"
        component={Solution}
        durationInFrames={solutionDuration}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{ durationInFrames: solutionDuration }}
      />

      <Composition
        id="Demo"
        component={Demo}
        durationInFrames={demoDuration}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{ durationInFrames: demoDuration }}
      />

      <Composition
        id="CTA"
        component={CTA}
        durationInFrames={ctaDuration}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{ durationInFrames: ctaDuration }}
      />
    </>
  );
};
```

**Step 3: Preview full video**

Run: `npm run start`
Select "Video" composition
Expected: See all 4 scenes playing in sequence (2 minutes total)

**Step 4: Commit**

```bash
git add examples/promo-video/src/Video.tsx examples/promo-video/src/Root.tsx
git commit -m "feat(promo): create main Video composition integrating all scenes"
```

---

## Phase 8: Polish & Documentation

### Task 15: Create README

**Files:**
- Create: `examples/promo-video/README.md`

**Step 1: Write README**

Create `examples/promo-video/README.md`:

```markdown
# Ideogram MCP Server - Promo Video

Remotion-based promotional video for the ideogram-mcp-server project.

## Prerequisites

- Node.js 18+
- npm

## Development

### Install Dependencies

\`\`\`bash
npm install
\`\`\`

### Start Remotion Studio

\`\`\`bash
npm start
\`\`\`

Opens http://localhost:3000 with interactive preview.

### Available Compositions

- **Video** - Full 2-minute promo (all scenes)
- **Problem** - Scene 1 only (0-20s)
- **Solution** - Scene 2 only (20-40s)
- **Demo** - Scene 3 only (40-90s)
- **CTA** - Scene 4 only (90-120s)

## Rendering

### Render Full Video

\`\`\`bash
npm run build
\`\`\`

Output: `out/promo.mp4`

### Render Specific Scene

\`\`\`bash
npx remotion render Problem out/problem.mp4
\`\`\`

### Render Options

\`\`\`bash
npx remotion render Video out/promo.mp4 --codec h264 --quality 90
\`\`\`

## Project Structure

\`\`\`
src/
├── Video.tsx              # Main composition (all scenes)
├── Root.tsx               # Remotion entry point
├── scenes/                # Individual scenes
│   ├── Problem.tsx        # Scene 1: Problem (0-20s)
│   ├── Solution.tsx       # Scene 2: Solution (20-40s)
│   ├── Demo.tsx           # Scene 3: Demo (40-90s)
│   └── CTA.tsx            # Scene 4: CTA (90-120s)
├── components/            # Reusable components
│   ├── CodeBlock.tsx
│   ├── Terminal.tsx
│   └── ChatUI.tsx
├── utils/                 # Utilities
│   ├── animation.ts
│   └── timing.ts
├── types/                 # TypeScript types
│   └── index.ts
└── styles/                # Global styles
    ├── global.css
    └── fonts.css
\`\`\`

## Design

See `docs/plans/2026-02-12-promo-video-design.md` for full design specification.

**Visual Style**: Developer-first minimal tech
**Duration**: 2 minutes (120 seconds, 7200 frames at 60fps)
**Resolution**: 1920x1080
**Frame Rate**: 60fps

## Fonts

- **JetBrains Mono**: Code/technical elements
- **Inter**: UI text

Fonts are loaded from `public/fonts/`.

## Color Palette

- Background: `#1e1e1e`
- Text: `#D4D4D4`
- Accent Blue: `#007ACC`
- Accent Teal: `#4EC9B0`
- Accent Red: `#F48771`

## License

MIT
\`\`\`

**Step 2: Commit README**

\`\`\`bash
git add examples/promo-video/README.md
git commit -m "docs(promo): add README with setup and rendering instructions"
\`\`\`

---

### Task 16: Test Final Render

**Step 1: Render the video**

\`\`\`bash
cd examples/promo-video
npm run build
\`\`\`

Expected: Video renders to `out/promo.mp4` without errors

**Step 2: Review rendered video**

Open `out/promo.mp4` in a video player
Expected:
- 2 minutes duration
- All 4 scenes present
- Smooth animations
- Text readable
- Colors match design

**Step 3: Commit final changes**

\`\`\`bash
git add -A
git commit -m "feat(promo): complete promo video implementation"
\`\`\`

---

## Next Steps After Implementation

1. **Upload video to hosting**
   - GitHub Releases
   - YouTube (unlisted)
   - Or video CDN

2. **Embed in README**
   - Add to main `README.md`
   - Use HTML video tag or link to hosted version

3. **Optional: GitHub Actions**
   - Auto-render on changes to `examples/promo-video/`
   - Upload to releases

4. **Share**
   - Post on social media
   - Submit to relevant communities

---

**Total Duration**: ~3-5 days (depending on polish/assets)
**Total Tasks**: 16
**Total Commits**: 16 (one per task)
