import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { fontFamily } from "../styles/fonts";
import { COLORS } from "../styles/theme";

// Local timeline (30s total at 60fps = 1800 frames):
// Get Started: 0-10s, Links: 10-20s, Ending: 20-30s

// --- Get Started: 3-step tutorial ---
const STEPS = [
  {
    number: "1",
    title: "Install",
    code: "npm install @takeshijuan/ideogram-mcp-server",
    language: "bash",
  },
  {
    number: "2",
    title: "Configure",
    code: `{
  "ideogram": {
    "command": "npx",
    "args": ["@takeshijuan/ideogram-mcp-server"]
  }
}`,
    language: "json",
  },
  {
    number: "3",
    title: "Start Creating",
    code: "Just chat with Claude \u2192",
    language: "text",
  },
];

const GetStarted: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header
  const headerOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
        padding: "60px 120px",
      }}
    >
      {/* Header */}
      <div
        style={{
          opacity: headerOpacity,
          fontFamily: fontFamily.ui,
          fontSize: 48,
          fontWeight: 700,
          color: COLORS.text,
        }}
      >
        Get Started in 3 Steps
      </div>

      {/* Steps */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 32,
          width: "100%",
          maxWidth: 900,
        }}
      >
        {STEPS.map((step, i) => {
          const stepDelay = 1 * fps + i * 2 * fps;
          const stepProgress = spring({
            frame: frame - stepDelay,
            fps,
            config: { damping: 200 },
          });
          const stepOpacity = interpolate(
            frame,
            [stepDelay, stepDelay + 0.5 * fps],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );

          return (
            <div
              key={step.number}
              style={{
                opacity: stepOpacity,
                transform: `translateX(${interpolate(stepProgress, [0, 1], [-20, 0])}px)`,
                display: "flex",
                alignItems: "flex-start",
                gap: 24,
              }}
            >
              {/* Step number */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  backgroundColor: COLORS.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: fontFamily.ui,
                  fontSize: 24,
                  fontWeight: 700,
                  color: COLORS.white,
                  flexShrink: 0,
                }}
              >
                {step.number}
              </div>

              <div style={{ flex: 1 }}>
                {/* Step title */}
                <div
                  style={{
                    fontFamily: fontFamily.ui,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.text,
                    marginBottom: 8,
                  }}
                >
                  {step.title}
                </div>

                {/* Code block */}
                <div
                  style={{
                    backgroundColor: "#0d1117",
                    borderRadius: 8,
                    padding: "12px 20px",
                    border: "1px solid #30363d",
                    fontFamily: fontFamily.code,
                    fontSize: step.language === "text" ? 22 : 18,
                    color:
                      step.language === "text" ? COLORS.accent : COLORS.teal,
                    whiteSpace: "pre",
                    lineHeight: 1.6,
                  }}
                >
                  {step.code}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// --- Links and badges ---
const BADGES = [
  { icon: "\u2B50", text: "GitHub Stars" },
  { icon: "\uD83D\uDCE6", text: "npm downloads" },
  { icon: "\u2705", text: "TypeScript" },
  { icon: "\uD83D\uDD12", text: "Production-ready" },
];

const LinksSection: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // GitHub URL
  const urlProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
      }}
    >
      {/* GitHub URL */}
      <div
        style={{
          opacity: urlProgress,
          transform: `scale(${interpolate(urlProgress, [0, 1], [0.95, 1])})`,
          fontFamily: fontFamily.code,
          fontSize: 36,
          fontWeight: 700,
          color: COLORS.accent,
          padding: "20px 40px",
          backgroundColor: COLORS.bgLight,
          borderRadius: 12,
          border: `2px solid ${COLORS.accent}40`,
        }}
      >
        github.com/takeshijuan/ideogram-mcp-server
      </div>

      {/* Badges */}
      <div style={{ display: "flex", gap: 32 }}>
        {BADGES.map((badge, i) => {
          const badgeDelay = 1.5 * fps + i * 0.4 * fps;
          const badgeProgress = spring({
            frame: frame - badgeDelay,
            fps,
            config: { damping: 200 },
          });

          return (
            <div
              key={badge.text}
              style={{
                opacity: badgeProgress,
                transform: `scale(${interpolate(badgeProgress, [0, 1], [0.8, 1])})`,
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: COLORS.bgLighter,
                borderRadius: 8,
                padding: "10px 20px",
                border: "1px solid #3c3c3c",
              }}
            >
              <span style={{ fontSize: 24 }}>{badge.icon}</span>
              <span
                style={{
                  fontFamily: fontFamily.ui,
                  fontSize: 20,
                  color: COLORS.text,
                }}
              >
                {badge.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* CTA buttons */}
      <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
        {[
          { icon: "\u2B50", text: "Star on GitHub" },
          { icon: "\uD83D\uDCD6", text: "Read the Docs" },
          { icon: "\uD83D\uDE80", text: "Get Started" },
        ].map((cta, i) => {
          const ctaDelay = 3 * fps + i * 0.3 * fps;
          const ctaOpacity = interpolate(
            frame,
            [ctaDelay, ctaDelay + 0.5 * fps],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );

          return (
            <div
              key={cta.text}
              style={{
                opacity: ctaOpacity,
                fontFamily: fontFamily.ui,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.text,
                padding: "12px 28px",
                borderRadius: 8,
                backgroundColor:
                  cta.text === "Get Started" ? COLORS.accent : "transparent",
                border: `2px solid ${cta.text === "Get Started" ? COLORS.accent : "#3c3c3c"}`,
              }}
            >
              {cta.icon} {cta.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// --- Ending with particle effects ---
const Particle: React.FC<{
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  frame: number;
}> = ({ x, y, size, speed, opacity: baseOpacity, frame }) => {
  const animY = y - frame * speed * 0.5;
  const animX = x + Math.sin(frame * 0.02 + y) * 20;
  const opacity = baseOpacity * interpolate(
    animY,
    [-100, 0, 1080],
    [0, 1, 0.3],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        position: "absolute",
        left: animX,
        top: animY,
        width: size,
        height: size,
        borderRadius: size > 4 ? 2 : "50%",
        backgroundColor: size > 4 ? COLORS.accent : COLORS.teal,
        opacity: Math.max(0, opacity),
      }}
    />
  );
};

// Deterministic particles
const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  x: ((i * 67 + 13) % 1920),
  y: ((i * 43 + 7) % 1080) + 200,
  size: (i % 3) * 2 + 2,
  speed: (i % 4) + 1,
  opacity: 0.3 + (i % 5) * 0.1,
}));

const Ending: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo
  const logoProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Tagline
  const taglineOpacity = interpolate(
    frame,
    [1.5 * fps, 2.5 * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Fade to black at the very end
  const fadeOut = interpolate(
    frame,
    [8 * fps, 10 * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <Particle key={i} {...p} frame={frame} />
      ))}

      {/* Center content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        {/* Project name */}
        <div
          style={{
            opacity: logoProgress,
            transform: `scale(${interpolate(logoProgress, [0, 1], [0.9, 1])})`,
            fontFamily: fontFamily.code,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.accent,
          }}
        >
          ideogram-mcp-server
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: taglineOpacity,
            fontFamily: fontFamily.ui,
            fontSize: 32,
            color: COLORS.textDim,
          }}
        >
          AI image generation, simplified.
        </div>
      </AbsoluteFill>

      {/* Fade to black overlay */}
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.black,
          opacity: fadeOut,
        }}
      />
    </AbsoluteFill>
  );
};

export const CTA: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* Get Started: 0-10s */}
      <Sequence durationInFrames={10 * fps} premountFor={fps}>
        <GetStarted />
      </Sequence>

      {/* Links and badges: 10-20s */}
      <Sequence from={10 * fps} durationInFrames={10 * fps} premountFor={fps}>
        <LinksSection />
      </Sequence>

      {/* Ending: 20-30s */}
      <Sequence from={20 * fps} premountFor={fps}>
        <Ending />
      </Sequence>
    </AbsoluteFill>
  );
};
