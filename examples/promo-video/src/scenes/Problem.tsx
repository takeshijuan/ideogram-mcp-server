import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { CodeBlock } from "../components/CodeBlock";
import { Terminal } from "../components/Terminal";
import { Checklist } from "../components/Checklist";
import { fontFamily } from "../styles/fonts";
import { COLORS } from "../styles/theme";

// Title card: 0-5s, Complexity: 5-20s
// At 60fps: title = 0-300f, complexity = 300-1200f

const CODE_LINES = [
  { text: "// API key management", color: COLORS.success },
  { text: "const apiKey = process.env.IDEOGRAM_KEY;", color: COLORS.text },
  { text: "if (!apiKey) throw new Error('Missing key');", color: COLORS.text },
  { text: "", color: COLORS.text },
  { text: "// Parameter validation", color: COLORS.success },
  { text: "function validateParams(params) {", color: COLORS.warning },
  { text: "  if (!params.prompt) throw Error();", color: COLORS.text },
  { text: "  if (params.width > 2048) ...", color: COLORS.text },
  { text: "}", color: COLORS.warning },
  { text: "", color: COLORS.text },
  { text: "// Error handling", color: COLORS.success },
  { text: "try { await fetch(url, opts); }", color: COLORS.text },
  { text: "catch(e) { handleRetry(e); }", color: COLORS.error },
  { text: "", color: COLORS.text },
  { text: "// Rate limiting", color: COLORS.success },
  { text: "await rateLimiter.acquire();", color: COLORS.text },
  { text: "// File storage", color: COLORS.success },
  { text: "await fs.writeFile(path, buffer);", color: COLORS.text },
  { text: "// Cost tracking", color: COLORS.success },
  { text: "credits -= estimateCost(params);", color: COLORS.text },
];

const TERMINAL_LINES = [
  { text: "node server.js", type: "command" as const },
  { text: "Connecting to Ideogram API...", type: "output" as const },
  { text: "Error: 401 Unauthorized", type: "error" as const },
  { text: "Retrying with new token...", type: "output" as const },
  { text: "Error: 429 Rate Limit Exceeded", type: "error" as const },
  { text: "Backing off for 30s...", type: "output" as const },
  { text: "Error: 500 Internal Server Error", type: "error" as const },
  { text: "Error: ENOSPC: no space left", type: "error" as const },
  { text: "Error: timeout after 30000ms", type: "error" as const },
  { text: "Process exited with code 1", type: "error" as const },
];

const CHECKLIST_ITEMS = [
  { text: "Handle API errors", checked: false },
  { text: "Implement retry logic", checked: false },
  { text: "Store images locally", checked: false },
  { text: "Track API costs", checked: false },
  { text: "Validate all inputs", checked: false },
  { text: "Rate limit requests", checked: false },
  { text: "Handle timeouts", checked: false },
  { text: "Support async jobs", checked: false },
];

const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 1 * fps], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  const titleY = interpolate(frame, [0, 1 * fps], [30, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.bg,
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontFamily: fontFamily.ui,
          fontSize: 64,
          fontWeight: 700,
          color: COLORS.text,
          textAlign: "center",
          maxWidth: 1200,
          lineHeight: 1.3,
        }}
      >
        Integrating AI image generation
        <br />
        into your app?
      </div>
    </AbsoluteFill>
  );
};

const ComplexityView: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Shake effect in the last 2 seconds
  const shakeStart = durationInFrames - 2 * fps;
  const shakeIntensity = interpolate(
    frame,
    [shakeStart, shakeStart + 0.5 * fps, durationInFrames],
    [0, 4, 2],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const shakeX =
    shakeIntensity > 0
      ? Math.sin(frame * 1.5) * shakeIntensity
      : 0;
  const shakeY =
    shakeIntensity > 0
      ? Math.cos(frame * 2.1) * shakeIntensity * 0.5
      : 0;

  // Bottom message
  const messageOpacity = interpolate(
    frame,
    [durationInFrames - 3 * fps, durationInFrames - 2 * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Red overlay that intensifies
  const overlayOpacity = interpolate(
    frame,
    [5 * fps, durationInFrames],
    [0, 0.08],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <div
        style={{
          transform: `translate(${shakeX}px, ${shakeY}px)`,
          display: "flex",
          gap: 24,
          padding: "40px 48px",
          height: "100%",
        }}
      >
        {/* Left: Code editor */}
        <div style={{ flex: 1 }}>
          <CodeBlock
            lines={CODE_LINES}
            title="app.ts"
            staggerFrames={6}
            startDelay={0}
          />
        </div>

        {/* Center: Terminal */}
        <div style={{ flex: 1 }}>
          <Terminal
            lines={TERMINAL_LINES}
            title="terminal"
            staggerFrames={10}
            startDelay={Math.round(1 * fps)}
          />
        </div>

        {/* Right: Checklist */}
        <div style={{ flex: 1 }}>
          <Checklist
            title="TODO"
            items={CHECKLIST_ITEMS}
            staggerFrames={8}
            startDelay={Math.round(2 * fps)}
          />
        </div>
      </div>

      {/* Red overlay for chaos effect */}
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.error,
          opacity: overlayOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Bottom message */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: messageOpacity,
          fontFamily: fontFamily.ui,
          fontSize: 36,
          fontWeight: 600,
          color: COLORS.error,
        }}
      >
        Too much boilerplate, too many edge cases
      </div>
    </AbsoluteFill>
  );
};

export const Problem: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* Title card: 0-5s */}
      <Sequence durationInFrames={5 * fps} premountFor={fps}>
        <TitleCard />
      </Sequence>

      {/* Complexity visualization: 5-20s */}
      <Sequence from={5 * fps} premountFor={fps}>
        <ComplexityView />
      </Sequence>
    </AbsoluteFill>
  );
};
