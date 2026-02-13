import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Easing,
} from "remotion";
import { fontFamily } from "../styles/fonts";
import { COLORS } from "../styles/theme";

// Transition: 0-5s, MCP Intro: 5-15s, Architecture: 15-20s

const TransitionReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Light emerges from center
  const glowScale = interpolate(frame, [0.5 * fps, 2.5 * fps], [0, 3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  const glowOpacity = interpolate(frame, [0.5 * fps, 2 * fps, 4 * fps], [0, 0.6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const textOpacity = interpolate(frame, [1 * fps, 2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  const textY = interpolate(frame, [1 * fps, 2 * fps], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.black,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Glow effect */}
      <div
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.accent}80, transparent 70%)`,
          transform: `scale(${glowScale})`,
          opacity: glowOpacity,
        }}
      />

      {/* Text */}
      <div
        style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          fontFamily: fontFamily.ui,
          fontSize: 56,
          fontWeight: 600,
          color: COLORS.text,
          zIndex: 1,
        }}
      >
        There&apos;s a better way
      </div>
    </AbsoluteFill>
  );
};

const VALUE_ITEMS = [
  { icon: "\u{1F50C}", title: "Plug & Play", desc: "One line install" },
  { icon: "\u{1F916}", title: "AI-Driven", desc: "Natural language control" },
  {
    icon: "\u{1F6E1}\uFE0F",
    title: "Production-Ready",
    desc: "Type-safe, battle-tested",
  },
];

const MCPIntroduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance
  const logoProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const logoScale = interpolate(logoProgress, [0, 1], [0.8, 1]);
  const logoOpacity = logoProgress;

  // Tagline
  const taglineOpacity = interpolate(frame, [1.5 * fps, 2.5 * fps], [0, 1], {
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
        gap: 40,
      }}
    >
      {/* Logo / Project name */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          fontFamily: fontFamily.code,
          fontSize: 56,
          fontWeight: 700,
          color: COLORS.accent,
          textAlign: "center",
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
          textAlign: "center",
        }}
      >
        AI-powered image generation, zero boilerplate
      </div>

      {/* Three key values */}
      <div
        style={{
          display: "flex",
          gap: 60,
          marginTop: 40,
        }}
      >
        {VALUE_ITEMS.map((item, i) => {
          const itemDelay = 3 * fps + i * 0.8 * fps;
          const itemProgress = spring({
            frame: frame - itemDelay,
            fps,
            config: { damping: 200 },
          });
          const itemOpacity = interpolate(
            frame,
            [itemDelay, itemDelay + 0.5 * fps],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          const itemY = interpolate(itemProgress, [0, 1], [20, 0]);

          return (
            <div
              key={item.title}
              style={{
                opacity: itemOpacity,
                transform: `translateY(${itemY}px)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                width: 280,
              }}
            >
              <div style={{ fontSize: 48 }}>{item.icon}</div>
              <div
                style={{
                  fontFamily: fontFamily.ui,
                  fontSize: 28,
                  fontWeight: 700,
                  color: COLORS.text,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontFamily: fontFamily.ui,
                  fontSize: 20,
                  color: COLORS.textDim,
                  textAlign: "center",
                }}
              >
                {item.desc}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const ARCH_NODES = [
  { label: "Claude Desktop", sublabel: "(You)", x: 240 },
  { label: "MCP Server", sublabel: "(Handles complexity)", x: 760 },
  { label: "Ideogram API", sublabel: "(Images)", x: 1280 },
];

const ArchitectureDiagram: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Diagram */}
      <div
        style={{
          position: "relative",
          width: 1520,
          height: 200,
        }}
      >
        {ARCH_NODES.map((node, i) => {
          const nodeDelay = i * 0.5 * fps;
          const nodeProgress = spring({
            frame: frame - nodeDelay,
            fps,
            config: { damping: 200 },
          });

          return (
            <div
              key={node.label}
              style={{
                position: "absolute",
                left: node.x - 140,
                top: 40,
                width: 280,
                opacity: nodeProgress,
                transform: `scale(${interpolate(nodeProgress, [0, 1], [0.9, 1])})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  backgroundColor: i === 1 ? COLORS.accent : COLORS.bgLighter,
                  borderRadius: 12,
                  padding: "16px 28px",
                  border: `2px solid ${i === 1 ? COLORS.accent : "#3c3c3c"}`,
                }}
              >
                <div
                  style={{
                    fontFamily: fontFamily.ui,
                    fontSize: 24,
                    fontWeight: 700,
                    color: COLORS.white,
                    textAlign: "center",
                  }}
                >
                  {node.label}
                </div>
              </div>
              <div
                style={{
                  fontFamily: fontFamily.ui,
                  fontSize: 18,
                  color: COLORS.textDim,
                }}
              >
                {node.sublabel}
              </div>
            </div>
          );
        })}

        {/* Arrows between nodes */}
        {[0, 1].map((arrowIdx) => {
          const arrowDelay = (arrowIdx + 1) * 0.5 * fps + 0.3 * fps;
          const arrowProgress = interpolate(
            frame,
            [arrowDelay, arrowDelay + 0.5 * fps],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );

          const startNode = ARCH_NODES[arrowIdx];
          const endNode = ARCH_NODES[arrowIdx + 1];
          if (!startNode || !endNode) return null;
          const startX = startNode.x + 140;
          const endX = endNode.x - 140;
          const currentEndX = startX + (endX - startX) * arrowProgress;
          const y = 68;

          return (
            <svg
              key={arrowIdx}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            >
              {/* Forward arrow */}
              <line
                x1={startX}
                y1={y - 4}
                x2={currentEndX}
                y2={y - 4}
                stroke={COLORS.teal}
                strokeWidth={2}
                opacity={arrowProgress}
              />
              {arrowProgress > 0.9 && (
                <polygon
                  points={`${endX},${y - 4} ${endX - 10},${y - 10} ${endX - 10},${y + 2}`}
                  fill={COLORS.teal}
                  opacity={arrowProgress}
                />
              )}
              {/* Backward arrow */}
              <line
                x1={currentEndX}
                y1={y + 4}
                x2={startX}
                y2={y + 4}
                stroke={COLORS.accent}
                strokeWidth={2}
                opacity={arrowProgress}
              />
              {arrowProgress > 0.9 && (
                <polygon
                  points={`${startX},${y + 4} ${startX + 10},${y - 2} ${startX + 10},${y + 10}`}
                  fill={COLORS.accent}
                  opacity={arrowProgress}
                />
              )}
            </svg>
          );
        })}
      </div>

      {/* Caption */}
      <div
        style={{
          marginTop: 60,
          opacity: interpolate(frame, [2.5 * fps, 3.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          fontFamily: fontFamily.ui,
          fontSize: 32,
          color: COLORS.textDim,
        }}
      >
        Let AI handle the complexity
      </div>
    </AbsoluteFill>
  );
};

export const Solution: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* Transition reveal: 0-5s */}
      <Sequence durationInFrames={5 * fps} premountFor={fps}>
        <TransitionReveal />
      </Sequence>

      {/* MCP Introduction: 5-15s */}
      <Sequence from={5 * fps} durationInFrames={10 * fps} premountFor={fps}>
        <MCPIntroduction />
      </Sequence>

      {/* Architecture diagram: 15-20s */}
      <Sequence from={15 * fps} premountFor={fps}>
        <ArchitectureDiagram />
      </Sequence>
    </AbsoluteFill>
  );
};
