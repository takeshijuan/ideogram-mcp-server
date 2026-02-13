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
import { ChatUI } from "../components/ChatUI";

// Local timeline (50s total at 60fps = 3000 frames):
// Setup: 0-5s, Step1: 5-15s, Step2: 15-25s, Step3: 25-35s, Features: 35-50s

// --- Setup: Terminal typing install command ---
const SetupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const command = "$ npx @takeshijuan/ideogram-mcp-server";
  const charsToShow = Math.min(
    command.length,
    Math.floor((frame - 0.5 * fps) / 1.5),
  );
  const typedCommand = frame < 0.5 * fps ? "" : command.slice(0, Math.max(0, charsToShow));
  const showCursor = frame % 30 < 20;
  const typingDone = charsToShow >= command.length;

  const successOpacity = interpolate(
    frame,
    [3.5 * fps, 4 * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: 900 }}>
        <div
          style={{
            backgroundColor: "#0d1117",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #30363d",
            fontFamily: fontFamily.code,
          }}
        >
          {/* Title bar */}
          <div
            style={{
              backgroundColor: "#161b22",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ff5f56" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ffbd2e" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#27c93f" }} />
            </div>
            <span style={{ color: COLORS.textDim, fontSize: 14, marginLeft: 8 }}>terminal</span>
          </div>

          {/* Content */}
          <div style={{ padding: "24px 28px" }}>
            <div style={{ color: COLORS.text, fontSize: 22, lineHeight: 1.8 }}>
              <span style={{ color: COLORS.teal }}>{typedCommand}</span>
              {!typingDone && showCursor && (
                <span style={{ color: COLORS.text }}>{"\u2588"}</span>
              )}
            </div>
            {typingDone && (
              <div style={{ opacity: successOpacity, marginTop: 16 }}>
                <span style={{ color: COLORS.success, fontSize: 22 }}>
                  {"\u2713"} Installed in 5 seconds
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --- Step 1: Natural language prompt in Chat UI ---
const Step1Prompt: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <div style={{ width: 1000 }}>
        <ChatUI
          messages={[
            {
              role: "user",
              content:
                "Create a realistic sunset photo over mountains, 16:9 aspect ratio, high quality",
              delayFrames: 0,
            },
          ]}
          typingSpeed={1}
        />
      </div>
    </AbsoluteFill>
  );
};

// --- Step 2: AI reasoning & tool call split screen ---
const THINKING_LINES = [
  "Analyzing request...",
  "\u2713 Image generation needed",
  "\u2713 Parameters: aspect_ratio=16:9,",
  "  rendering_speed=QUALITY",
  "\u2713 Calling ideogram_generate...",
];

const JSON_LINES = [
  '{',
  '  "tool": "ideogram_generate",',
  '  "params": {',
  '    "prompt": "realistic sunset...",',
  '    "aspect_ratio": "16:9",',
  '    "rendering_speed": "QUALITY"',
  '  }',
  '}',
];

const Step2Reasoning: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        display: "flex",
        padding: "60px 80px",
        gap: 40,
      }}
    >
      {/* Left: Claude's "thinking" */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: fontFamily.ui,
            fontSize: 20,
            fontWeight: 600,
            color: COLORS.textDim,
            marginBottom: 16,
          }}
        >
          Claude&apos;s Reasoning
        </div>
        <div
          style={{
            backgroundColor: "#1a1a2e",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #30365a",
          }}
        >
          {THINKING_LINES.map((line, i) => {
            const lineDelay = i * 12;
            const opacity = interpolate(frame, [lineDelay, lineDelay + 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const isCheck = line.startsWith("\u2713");

            return (
              <div
                key={`${i}-${line}`}
                style={{
                  opacity,
                  fontFamily: fontFamily.code,
                  fontSize: 20,
                  lineHeight: 2,
                  color: isCheck ? COLORS.success : COLORS.text,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Tool call JSON */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: fontFamily.ui,
            fontSize: 20,
            fontWeight: 600,
            color: COLORS.textDim,
            marginBottom: 16,
          }}
        >
          Tool Call
        </div>
        <div
          style={{
            backgroundColor: "#0d1117",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #30363d",
          }}
        >
          {JSON_LINES.map((line, i) => {
            const lineDelay = 2 * fps + i * 8;
            const opacity = interpolate(frame, [lineDelay, lineDelay + 8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            // Syntax color
            let color = COLORS.text;
            if (line.includes('"tool"') || line.includes('"params"') || line.includes('"prompt"') || line.includes('"aspect_ratio"') || line.includes('"rendering_speed"')) {
              color = COLORS.teal;
            } else if (line.includes('"ideogram_generate"') || line.includes('"realistic') || line.includes('"16:9"') || line.includes('"QUALITY"')) {
              color = COLORS.warning;
            }

            return (
              <div
                key={`${i}-${line}`}
                style={{
                  opacity,
                  fontFamily: fontFamily.code,
                  fontSize: 20,
                  lineHeight: 2,
                  color,
                  whiteSpace: "pre",
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --- Step 3: Result with generated image ---
const Step3Result: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Image placeholder fade in
  const imageProgress = spring({
    frame: frame - 1 * fps,
    fps,
    config: { damping: 200 },
  });

  const imageScale = interpolate(imageProgress, [0, 1], [0.95, 1]);

  // Metadata items
  const metaItems = [
    { icon: "\u2713", text: "Generated in 8s", color: COLORS.success },
    { icon: "\u2713", text: "Cost: ~$0.04", color: COLORS.success },
    { icon: "\u2713", text: "Saved locally", color: COLORS.success },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 60,
        padding: "60px 100px",
      }}
    >
      {/* Generated image placeholder */}
      <div
        style={{
          opacity: imageProgress,
          transform: `scale(${imageScale})`,
          width: 800,
          height: 450,
          borderRadius: 16,
          background: `linear-gradient(135deg, #ff6b35 0%, #f7931e 25%, #e55d00 50%, #8b2252 75%, #2c1654 100%)`,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Sunset-like gradient with mountain silhouette */}
        <svg width="800" height="180" viewBox="0 0 800 180">
          <path
            d="M0 180 L0 120 Q100 40 200 100 Q300 60 400 80 Q500 30 600 90 Q700 50 800 70 L800 180 Z"
            fill="#1a0a2e"
            opacity={0.8}
          />
          <path
            d="M0 180 L0 140 Q150 100 300 130 Q450 90 600 120 Q750 100 800 110 L800 180 Z"
            fill="#0f0618"
            opacity={0.9}
          />
        </svg>
      </div>

      {/* Metadata sidebar */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {metaItems.map((item, i) => {
          const itemDelay = 3 * fps + i * 0.5 * fps;
          const itemOpacity = interpolate(
            frame,
            [itemDelay, itemDelay + 0.3 * fps],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );

          return (
            <div
              key={item.text}
              style={{
                opacity: itemOpacity,
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: fontFamily.code,
                fontSize: 24,
                color: item.color,
              }}
            >
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          );
        })}

        {/* Thumbs up */}
        <div
          style={{
            opacity: interpolate(
              frame,
              [5 * fps, 5.5 * fps],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
            fontSize: 48,
            marginTop: 16,
            textAlign: "center",
          }}
        >
          {"\uD83D\uDC4D"}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --- Features showcase (3 panels) ---
const FEATURES = [
  {
    title: "Edit / Inpaint",
    description: "Mask-based image editing",
    icon: "\u{1F3A8}",
  },
  {
    title: "Async Processing",
    description: "Background job queue",
    icon: "\u26A1",
  },
  {
    title: "Cost Tracking",
    description: "Real-time credit monitoring",
    icon: "\uD83D\uDCCA",
  },
];

const FeaturesShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Caption
  const captionOpacity = interpolate(
    frame,
    [3 * fps, 4 * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 60,
      }}
    >
      {/* Feature cards */}
      <div style={{ display: "flex", gap: 40 }}>
        {FEATURES.map((feature, i) => {
          const cardDelay = i * 0.6 * fps;
          const cardProgress = spring({
            frame: frame - cardDelay,
            fps,
            config: { damping: 200 },
          });
          const cardScale = interpolate(cardProgress, [0, 1], [0.9, 1]);

          return (
            <div
              key={feature.title}
              style={{
                opacity: cardProgress,
                transform: `scale(${cardScale})`,
                backgroundColor: COLORS.bgLight,
                borderRadius: 16,
                padding: "40px 48px",
                width: 380,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
                border: "1px solid #3c3c3c",
              }}
            >
              <div style={{ fontSize: 56 }}>{feature.icon}</div>
              <div
                style={{
                  fontFamily: fontFamily.ui,
                  fontSize: 28,
                  fontWeight: 700,
                  color: COLORS.text,
                }}
              >
                {feature.title}
              </div>
              <div
                style={{
                  fontFamily: fontFamily.ui,
                  fontSize: 20,
                  color: COLORS.textDim,
                  textAlign: "center",
                }}
              >
                {feature.description}
              </div>

              {/* Progress bar for async */}
              {feature.title === "Async Processing" && (
                <div
                  style={{
                    width: "100%",
                    height: 6,
                    backgroundColor: "#3c3c3c",
                    borderRadius: 3,
                    marginTop: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${interpolate(frame - cardDelay, [1 * fps, 4 * fps], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
                      height: "100%",
                      backgroundColor: COLORS.teal,
                      borderRadius: 3,
                    }}
                  />
                </div>
              )}

              {/* Cost display */}
              {feature.title === "Cost Tracking" && (
                <div
                  style={{
                    fontFamily: fontFamily.code,
                    fontSize: 32,
                    fontWeight: 700,
                    color: COLORS.teal,
                    marginTop: 4,
                  }}
                >
                  $
                  {(
                    interpolate(frame - cardDelay, [1 * fps, 4 * fps], [0, 2.47], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    })
                  ).toFixed(2)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Caption */}
      <div
        style={{
          opacity: captionOpacity,
          fontFamily: fontFamily.ui,
          fontSize: 36,
          fontWeight: 600,
          color: COLORS.accent,
        }}
      >
        5 tools, unlimited possibilities
      </div>
    </AbsoluteFill>
  );
};

export const Demo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* Setup: 0-5s */}
      <Sequence durationInFrames={5 * fps} premountFor={fps}>
        <SetupScene />
      </Sequence>

      {/* Step 1: Natural language prompt: 5-15s */}
      <Sequence from={5 * fps} durationInFrames={10 * fps} premountFor={fps}>
        <Step1Prompt />
      </Sequence>

      {/* Step 2: AI reasoning & tool call: 15-25s */}
      <Sequence from={15 * fps} durationInFrames={10 * fps} premountFor={fps}>
        <Step2Reasoning />
      </Sequence>

      {/* Step 3: Result: 25-35s */}
      <Sequence from={25 * fps} durationInFrames={10 * fps} premountFor={fps}>
        <Step3Result />
      </Sequence>

      {/* Features showcase: 35-50s */}
      <Sequence from={35 * fps} premountFor={fps}>
        <FeaturesShowcase />
      </Sequence>
    </AbsoluteFill>
  );
};
