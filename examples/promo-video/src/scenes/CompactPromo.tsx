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

// ============================================================
// Premium design constants
// ============================================================
const BG_BASE = "#0c0c0f";
const ACCENT_PRIMARY = "#6366f1";
const ACCENT_SECONDARY = "#8b5cf6";
const ACCENT_PINK = "#ec4899";
const TEXT_PRIMARY = "#f0f0f0";
const TEXT_SECONDARY = "#888888";
const BORDER_SUBTLE = "rgba(255,255,255,0.06)";
const GLASS_BG = "rgba(255,255,255,0.03)";
const GLASS_BORDER = "rgba(255,255,255,0.08)";

// Snappy spring config for premium feel
const SNAPPY = { damping: 20, stiffness: 200 };
const SMOOTH = { damping: 200 };

// ============================================================
// Ambient glow overlay (adds depth to any scene)
// ============================================================
const AmbientGlow: React.FC<{
  color1?: string;
  color2?: string;
  opacity1?: number;
  opacity2?: number;
}> = ({
  color1 = ACCENT_PRIMARY,
  color2 = ACCENT_SECONDARY,
  opacity1 = 0.07,
  opacity2 = 0.05,
}) => (
  <>
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse 80% 60% at 15% 20%, ${color1}${Math.round(opacity1 * 255)
          .toString(16)
          .padStart(2, "0")} 0%, transparent 70%)`,
        pointerEvents: "none",
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse 70% 50% at 85% 80%, ${color2}${Math.round(opacity2 * 255)
          .toString(16)
          .padStart(2, "0")} 0%, transparent 70%)`,
        pointerEvents: "none",
      }}
    />
  </>
);

// ============================================================
// Subtle grid pattern overlay
// ============================================================
const GridPattern: React.FC<{ opacity?: number }> = ({ opacity = 0.03 }) => (
  <svg
    width="100%"
    height="100%"
    style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
  >
    <defs>
      <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
        <path
          d="M 60 0 L 0 0 0 60"
          fill="none"
          stroke="white"
          strokeWidth="0.5"
          opacity={opacity}
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
);

// ============================================================
// Rotating spinner (refined)
// ============================================================
const Spinner: React.FC<{ frame: number }> = ({ frame }) => {
  const rotation = (frame * 8) % 360;
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke={ACCENT_PRIMARY}
        strokeWidth="2"
        strokeDasharray="20 18"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ============================================================
// Blinking cursor (proper Remotion pattern)
// ============================================================
const Cursor: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(
    frame % 16,
    [0, 8, 16],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <span
      style={{
        opacity,
        color: TEXT_PRIMARY,
        marginLeft: 1,
        fontWeight: 300,
      }}
    >
      {"\u258C"}
    </span>
  );
};

// ============================================================
// Beat 1: Brand (0-2s)
// ============================================================
const BrandBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const nameProgress = spring({ frame, fps, config: SNAPPY });
  const taglineProgress = spring({
    frame: frame - 0.6 * fps,
    fps,
    config: SMOOTH,
  });

  // Accent line grows under the title
  const lineWidth = interpolate(
    spring({ frame: frame - 0.3 * fps, fps, config: SMOOTH }),
    [0, 1],
    [0, 400],
  );

  const fadeOut = interpolate(frame, [1.6 * fps, 2 * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glow pulse behind title
  const glowSize = interpolate(
    frame,
    [0, 2 * fps],
    [300, 500],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG_BASE,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        opacity: fadeOut,
      }}
    >
      <GridPattern opacity={0.02} />

      {/* Animated glow behind title */}
      <div
        style={{
          position: "absolute",
          width: glowSize,
          height: glowSize * 0.5,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${ACCENT_PRIMARY}18 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          opacity: nameProgress,
          transform: `translateY(${interpolate(nameProgress, [0, 1], [20, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: fontFamily.code,
            fontSize: 64,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            backgroundImage: `linear-gradient(135deg, ${TEXT_PRIMARY} 0%, ${ACCENT_PRIMARY} 50%, ${ACCENT_SECONDARY} 100%)`,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
          }}
        >
          ideogram-mcp-server
        </div>

        {/* Accent line under title */}
        <div
          style={{
            width: lineWidth,
            height: 2,
            margin: "12px auto 0",
            borderRadius: 1,
            background: `linear-gradient(90deg, transparent, ${ACCENT_PRIMARY}, ${ACCENT_SECONDARY}, transparent)`,
          }}
        />
      </div>

      <div
        style={{
          opacity: taglineProgress,
          transform: `translateY(${interpolate(taglineProgress, [0, 1], [10, 0])}px)`,
          fontFamily: fontFamily.ui,
          fontSize: 26,
          fontWeight: 400,
          letterSpacing: "0.02em",
          color: TEXT_SECONDARY,
          marginTop: 8,
        }}
      >
        AI image generation via MCP
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// Feature card definitions
// ============================================================
type FeatureCardDef = {
  prompt: string;
  toolCall: string;
};

const FEATURES: FeatureCardDef[] = [
  {
    prompt: "Create a sunset over a cyberpunk city",
    toolCall: "ideogram_generate",
  },
  {
    prompt: "Remove the car from this photo",
    toolCall: "ideogram_edit",
  },
  {
    prompt: "Generate 8 logo variations",
    toolCall: "ideogram_generate_async",
  },
];

// ============================================================
// Per-card result visuals (premium quality)
// ============================================================
const RESULT_START = 148;

// Generate: layered sunset cityscape with glow
const GenerateResult: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - RESULT_START);

  const progress = spring({ frame: f, fps, config: SNAPPY });

  return (
    <div
      style={{
        opacity: progress,
        transform: `scale(${interpolate(progress, [0, 1], [0.95, 1])})`,
        width: "100%",
        height: 340,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${ACCENT_PRIMARY}15`,
        border: `1px solid ${BORDER_SUBTLE}`,
      }}
    >
      {/* Sky gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, #0a0a2e 0%, #1a0a3e 20%, #4a1942 40%, #e55d00 65%, #ff8c42 80%, #ffb366 95%)",
        }}
      />
      {/* Sun glow */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: "50%",
          transform: "translateX(-50%)",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,180,80,0.6) 0%, rgba(255,100,30,0.3) 30%, transparent 70%)",
        }}
      />
      {/* Stars */}
      {[
        { x: 15, y: 10, s: 2 },
        { x: 35, y: 5, s: 1.5 },
        { x: 55, y: 15, s: 2 },
        { x: 75, y: 8, s: 1 },
        { x: 88, y: 18, s: 1.5 },
        { x: 25, y: 22, s: 1 },
        { x: 65, y: 25, s: 1.5 },
      ].map((star, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.s,
            height: star.s,
            borderRadius: "50%",
            backgroundColor: "#fff",
            opacity: interpolate(
              f,
              [4 + i * 2, 8 + i * 2],
              [0, 0.5 + Math.sin(i) * 0.3],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
          }}
        />
      ))}
      {/* Mountain layers */}
      <svg
        width="100%"
        height="160"
        viewBox="0 0 600 160"
        style={{ position: "absolute", bottom: 0 }}
        preserveAspectRatio="none"
      >
        {/* Far mountains */}
        <path
          d="M0 160 L0 80 Q50 30 100 70 Q150 20 200 55 Q250 10 300 50 Q350 25 400 60 Q450 15 500 45 Q550 30 600 55 L600 160 Z"
          fill="#1a0a2e"
          opacity={0.9}
        />
        {/* Near mountains */}
        <path
          d="M0 160 L0 110 Q80 60 160 95 Q240 55 320 85 Q400 50 480 80 Q540 60 600 75 L600 160 Z"
          fill="#0f0618"
        />
        {/* City silhouette */}
        <rect x="100" y="95" width="8" height="40" fill="#15082a" />
        <rect x="115" y="80" width="12" height="55" fill="#15082a" />
        <rect x="135" y="90" width="6" height="45" fill="#15082a" />
        <rect x="148" y="70" width="15" height="65" fill="#15082a" />
        <rect x="170" y="85" width="10" height="50" fill="#15082a" />
        <rect x="190" y="75" width="8" height="60" fill="#15082a" />
        <rect x="350" y="88" width="10" height="47" fill="#15082a" />
        <rect x="370" y="72" width="14" height="63" fill="#15082a" />
        <rect x="392" y="82" width="8" height="53" fill="#15082a" />
        <rect x="410" y="68" width="12" height="67" fill="#15082a" />
        <rect x="430" y="78" width="9" height="57" fill="#15082a" />
      </svg>
      {/* City window lights */}
      {[
        { x: 103, y: 105, d: 0 },
        { x: 119, y: 90, d: 2 },
        { x: 119, y: 100, d: 4 },
        { x: 151, y: 80, d: 1 },
        { x: 151, y: 95, d: 3 },
        { x: 155, y: 108, d: 5 },
        { x: 373, y: 82, d: 2 },
        { x: 373, y: 98, d: 4 },
        { x: 413, y: 78, d: 1 },
        { x: 413, y: 92, d: 3 },
        { x: 433, y: 88, d: 5 },
      ].map((light, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            bottom: 160 - light.y,
            left: `${(light.x / 600) * 100}%`,
            width: 3,
            height: 3,
            backgroundColor: "#ffcc66",
            opacity: interpolate(
              f,
              [10 + light.d * 2, 14 + light.d * 2],
              [0, 0.5 + Math.sin(i + f * 0.05) * 0.3],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
            boxShadow: "0 0 4px rgba(255,200,100,0.5)",
          }}
        />
      ))}
    </div>
  );
};

// Edit: landscape with car removal animation
const EditResult: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - RESULT_START);

  const imageProgress = spring({ frame: f, fps, config: SNAPPY });
  const maskPulse = Math.sin(f * 0.12) * 0.3 + 0.7;
  const fillProgress = interpolate(f, [12, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity: imageProgress,
        transform: `scale(${interpolate(imageProgress, [0, 1], [0.95, 1])})`,
        width: "100%",
        height: 340,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${ACCENT_PRIMARY}15`,
        border: `1px solid ${BORDER_SUBTLE}`,
      }}
    >
      {/* Sky */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, #4a90d9 0%, #67b8de 40%, #89cff0 70%, #c5e8f7 100%)",
        }}
      />
      {/* Clouds */}
      <div
        style={{
          position: "absolute",
          top: 30,
          left: 80,
          width: 120,
          height: 40,
          borderRadius: 20,
          background: "rgba(255,255,255,0.4)",
          filter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 50,
          right: 60,
          width: 90,
          height: 30,
          borderRadius: 15,
          background: "rgba(255,255,255,0.3)",
          filter: "blur(3px)",
        }}
      />
      {/* Hills */}
      <svg
        width="100%"
        height="180"
        viewBox="0 0 600 180"
        style={{ position: "absolute", bottom: 0 }}
        preserveAspectRatio="none"
      >
        <path
          d="M0 180 L0 80 Q100 30 200 70 Q300 20 400 60 Q500 30 600 50 L600 180 Z"
          fill="#4a8c3f"
        />
        <path
          d="M0 180 L0 120 Q150 80 300 110 Q450 80 600 100 L600 180 Z"
          fill="#3d7a2e"
        />
        <path
          d="M0 180 L0 150 Q200 125 400 145 Q500 130 600 140 L600 180 Z"
          fill="#2d5a20"
        />
      </svg>
      {/* Road */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          width: "100%",
          height: 40,
          background:
            "linear-gradient(180deg, #555 0%, #444 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 18,
          width: "100%",
          height: 3,
          background:
            "repeating-linear-gradient(90deg, #ddd 0px, #ddd 30px, transparent 30px, transparent 50px)",
          opacity: 0.6,
        }}
      />
      {/* Car (fading out) */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: 160,
          opacity: 1 - fillProgress,
        }}
      >
        {/* Car body */}
        <div
          style={{
            width: 100,
            height: 32,
            backgroundColor: "#c0392b",
            borderRadius: "4px 4px 2px 2px",
            position: "relative",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        />
        <div
          style={{
            width: 58,
            height: 22,
            backgroundColor: "#a83225",
            borderRadius: "4px 4px 0 0",
            position: "absolute",
            bottom: 30,
            left: 20,
          }}
        />
        {/* Wheels */}
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: "#222",
            position: "absolute",
            bottom: -6,
            left: 12,
          }}
        />
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: "#222",
            position: "absolute",
            bottom: -6,
            right: 12,
          }}
        />
      </div>
      {/* Mask region */}
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 140,
          width: 140,
          height: 80,
          border: `2px dashed rgba(255,255,255,${fillProgress < 0.8 ? maskPulse : 0})`,
          borderRadius: 8,
          background:
            fillProgress > 0.2
              ? `linear-gradient(180deg, rgba(61,122,46,${fillProgress * 0.95}), rgba(85,85,85,${fillProgress * 0.95}))`
              : "transparent",
          boxShadow:
            fillProgress > 0.5
              ? `0 0 20px rgba(99,102,241,${fillProgress * 0.3})`
              : "none",
        }}
      >
        {fillProgress > 0.7 && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontFamily: fontFamily.code,
              fontSize: 13,
              fontWeight: 600,
              color: `rgba(255,255,255,${(fillProgress - 0.7) * 3.3})`,
              whiteSpace: "nowrap",
              textShadow: "0 1px 4px rgba(0,0,0,0.5)",
            }}
          >
            {"\u2713"} removed
          </div>
        )}
      </div>
    </div>
  );
};

// Async: premium thumbnail grid
const AsyncResult: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - RESULT_START);

  const gridProgress = spring({ frame: f, fps, config: SNAPPY });

  const thumbGradients = [
    "linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ffd700 100%)",
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  ];

  return (
    <div
      style={{
        opacity: gridProgress,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        {thumbGradients.map((grad, i) => {
          const row = Math.floor(i / 4);
          const col = i % 4;
          const delay = row * 6 + col * 3;
          const thumbProgress = spring({
            frame: f - delay,
            fps,
            config: SNAPPY,
          });

          return (
            <div
              key={i}
              style={{
                width: "calc(25% - 8px)",
                aspectRatio: "1",
                borderRadius: 10,
                background: grad,
                opacity: thumbProgress,
                transform: `scale(${interpolate(thumbProgress, [0, 1], [0.85, 1])})`,
                boxShadow: `0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)`,
                border: `1px solid rgba(255,255,255,0.1)`,
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          fontFamily: fontFamily.code,
          fontSize: 15,
          fontWeight: 500,
          color: COLORS.success,
          textAlign: "center",
          marginTop: 4,
          opacity: interpolate(f, [28, 34], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          letterSpacing: "0.02em",
        }}
      >
        {"\u2713"} 8 variations ready
      </div>
    </div>
  );
};

const RESULT_VISUALS: React.FC[] = [
  GenerateResult,
  EditResult,
  AsyncResult,
];

// ============================================================
// Glass card container for AI Agent area
// ============================================================
const GlassCard: React.FC<{
  children: React.ReactNode;
  accent?: boolean;
}> = ({ children, accent }) => (
  <div
    style={{
      backgroundColor: accent
        ? "rgba(99,102,241,0.08)"
        : GLASS_BG,
      borderRadius: 14,
      padding: "16px 22px",
      border: `1px solid ${accent ? "rgba(99,102,241,0.15)" : GLASS_BORDER}`,
      boxShadow: `0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)`,
      minHeight: 80,
    }}
  >
    {children}
  </div>
);

// ============================================================
// Feature card with premium animations
// ============================================================
const FeatureCard: React.FC<{
  feature: FeatureCardDef;
  index: number;
}> = ({ feature, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ---- Phase 1: User prompt types in (frame 0-28) ----
  const promptChars = Math.floor(
    interpolate(frame, [0, 28], [0, feature.prompt.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const promptText = feature.prompt.substring(0, promptChars);
  const promptDone = frame >= 28;

  // Prompt bubble entrance
  const bubbleProgress = spring({ frame, fps, config: SNAPPY });

  // ---- Phase 2: AI thinking (frame 35-55) ----
  const aiEntrance = spring({
    frame: frame - 33,
    fps,
    config: SNAPPY,
  });
  const isThinking = frame >= 35 && frame < 55;
  const dotCount =
    frame >= 35 ? (Math.floor((frame - 35) / 10) % 3) + 1 : 0;

  // ---- Phase 3: Tool call types in (frame 55-90) ----
  const toolCallFullText = `Calling ${feature.toolCall}`;
  const toolChars = Math.floor(
    interpolate(frame, [55, 88], [0, toolCallFullText.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const toolText = toolCallFullText.substring(0, toolChars);
  const isCalling = frame >= 55 && frame < 90;

  // ---- Phase 4: Processing (frame 90-135) ----
  const isProcessing = frame >= 90 && frame < 135;
  const processingProgress = interpolate(frame, [90, 132], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ---- Phase 5: Success + Result (frame 135+) ----
  const isSuccess = frame >= 135;
  const successProgress = spring({
    frame: frame - 135,
    fps,
    config: SNAPPY,
  });
  const resultProgress = spring({
    frame: frame - RESULT_START,
    fps,
    config: SNAPPY,
  });

  const ResultVisual = RESULT_VISUALS[index];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG_BASE,
        padding: "40px 80px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <AmbientGlow />
      <GridPattern opacity={0.015} />

      {/* Tool name badge - top right */}
      <div
        style={{
          position: "absolute",
          top: 30,
          right: 40,
          fontFamily: fontFamily.code,
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: "0.02em",
          color: ACCENT_PRIMARY,
          backgroundColor: "rgba(99,102,241,0.08)",
          padding: "6px 16px",
          borderRadius: 20,
          border: "1px solid rgba(99,102,241,0.15)",
        }}
      >
        {feature.toolCall}
      </div>

      {/* Row layout */}
      <div
        style={{
          display: "flex",
          gap: 60,
          alignItems: "center",
          flex: 1,
        }}
      >
        {/* Left column */}
        <div
          style={{
            flex: "0 0 42%",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* User prompt with typing */}
          <div
            style={{
              opacity: bubbleProgress,
              transform: `translateY(${interpolate(bubbleProgress, [0, 1], [15, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: fontFamily.ui,
                fontSize: 12,
                fontWeight: 500,
                color: TEXT_SECONDARY,
                marginBottom: 8,
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
              }}
            >
              You
            </div>
            <div
              style={{
                background: `linear-gradient(135deg, ${ACCENT_PRIMARY} 0%, ${ACCENT_SECONDARY} 100%)`,
                borderRadius: 14,
                padding: "16px 22px",
                fontFamily: fontFamily.ui,
                fontSize: 21,
                fontWeight: 500,
                color: "#fff",
                lineHeight: 1.5,
                minHeight: 60,
                boxShadow: `0 8px 30px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.1)`,
              }}
            >
              {promptText}
              {!promptDone && <Cursor frame={frame} />}
            </div>
          </div>

          {/* AI Agent response */}
          {frame >= 33 && (
            <div
              style={{
                opacity: aiEntrance,
                transform: `translateY(${interpolate(aiEntrance, [0, 1], [15, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: fontFamily.ui,
                  fontSize: 12,
                  fontWeight: 500,
                  color: TEXT_SECONDARY,
                  marginBottom: 8,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                }}
              >
                AI Agent
              </div>
              <GlassCard accent>
                {/* Thinking */}
                {isThinking && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", gap: 5 }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            backgroundColor: ACCENT_PRIMARY,
                            opacity:
                              Math.sin((frame - 35 - i * 5) * 0.15) * 0.4 +
                              0.6,
                          }}
                        />
                      ))}
                    </div>
                    <span
                      style={{
                        fontFamily: fontFamily.code,
                        fontSize: 15,
                        color: TEXT_SECONDARY,
                        letterSpacing: "0.01em",
                      }}
                    >
                      Thinking{".".repeat(dotCount)}
                    </span>
                  </div>
                )}

                {/* Calling tool */}
                {isCalling && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: ACCENT_PRIMARY,
                        opacity: Math.sin(frame * 0.2) * 0.3 + 0.7,
                        boxShadow: `0 0 8px ${ACCENT_PRIMARY}60`,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: fontFamily.code,
                        fontSize: 16,
                        color: TEXT_PRIMARY,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {toolText}
                      {frame < 88 && <Cursor frame={frame} />}
                    </span>
                  </div>
                )}

                {/* Processing */}
                {isProcessing && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Spinner frame={frame} />
                      <span
                        style={{
                          fontFamily: fontFamily.code,
                          fontSize: 15,
                          color: TEXT_PRIMARY,
                        }}
                      >
                        Processing
                        {".".repeat(
                          (Math.floor((frame - 90) / 10) % 3) + 1,
                        )}
                      </span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: 3,
                        backgroundColor: "rgba(255,255,255,0.06)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${processingProgress}%`,
                          height: "100%",
                          borderRadius: 2,
                          background: `linear-gradient(90deg, ${ACCENT_PRIMARY}, ${ACCENT_SECONDARY})`,
                          boxShadow: `0 0 8px ${ACCENT_PRIMARY}40`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Success */}
                {isSuccess && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      opacity: successProgress,
                      transform: `translateX(${interpolate(successProgress, [0, 1], [-5, 0])}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: COLORS.success,
                        boxShadow: `0 0 8px ${COLORS.success}60`,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: fontFamily.code,
                        fontSize: 16,
                        fontWeight: 500,
                        color: COLORS.success,
                      }}
                    >
                      {"\u2713"} {feature.toolCall}
                    </span>
                  </div>
                )}
              </GlassCard>
            </div>
          )}
        </div>

        {/* Right column: result */}
        <div
          style={{
            flex: "0 0 52%",
            opacity: resultProgress,
            transform: `scale(${interpolate(resultProgress, [0, 1], [0.97, 1])})`,
          }}
        >
          {ResultVisual && <ResultVisual />}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// Carousel container
// ============================================================
const CARD_DURATION_FRAMES = 220;
const SWIPE_DURATION_FRAMES = 18;

const FeatureCarousel: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: BG_BASE, overflow: "hidden" }}>
      {FEATURES.map((feature, i) => {
        const cardStart = i * CARD_DURATION_FRAMES;
        const cardEnd = cardStart + CARD_DURATION_FRAMES;

        if (
          frame < cardStart - SWIPE_DURATION_FRAMES ||
          frame > cardEnd + SWIPE_DURATION_FRAMES
        ) {
          return null;
        }

        const enterX =
          i === 0
            ? 0
            : interpolate(
                frame,
                [cardStart, cardStart + SWIPE_DURATION_FRAMES],
                [1920, 0],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                },
              );

        const exitX =
          i === FEATURES.length - 1
            ? 0
            : interpolate(
                frame,
                [cardEnd - SWIPE_DURATION_FRAMES, cardEnd],
                [0, -1920],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                },
              );

        const translateX =
          frame < cardStart + SWIPE_DURATION_FRAMES ? enterX : exitX;

        const fadeIn =
          i === 0
            ? interpolate(frame, [0, 15], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 1;

        const fadeOut =
          i === FEATURES.length - 1
            ? interpolate(frame, [cardEnd - 24, cardEnd], [1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 1;

        return (
          <AbsoluteFill
            key={feature.toolCall}
            style={{
              transform: `translateX(${translateX}px)`,
              opacity: fadeIn * fadeOut,
            }}
          >
            <Sequence
              from={cardStart}
              durationInFrames={CARD_DURATION_FRAMES}
            >
              <FeatureCard feature={feature} index={i} />
            </Sequence>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

// ============================================================
// Beat 3: CTA (13-15s)
// ============================================================
const CTABeat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const codeProgress = spring({ frame, fps, config: SNAPPY });
  const urlProgress = spring({
    frame: frame - 0.4 * fps,
    fps,
    config: SMOOTH,
  });

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 0.5 * fps, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Scan line effect on code block
  const scanLineY = interpolate(
    frame % (2 * fps),
    [0, 2 * fps],
    [-10, 80],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG_BASE,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
      }}
    >
      <AmbientGlow opacity1={0.1} opacity2={0.07} />
      <GridPattern opacity={0.015} />

      <div
        style={{
          opacity: codeProgress,
          transform: `translateY(${interpolate(codeProgress, [0, 1], [20, 0])}px) scale(${interpolate(codeProgress, [0, 1], [0.97, 1])})`,
          position: "relative",
          borderRadius: 14,
          padding: "22px 44px",
          border: `1px solid rgba(99,102,241,0.2)`,
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(15,15,20,0.95) 50%, rgba(139,92,246,0.04) 100%)",
          boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(99,102,241,0.1)`,
          overflow: "hidden",
        }}
      >
        {/* Scan line */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: scanLineY,
            height: 1,
            background: `linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)`,
            pointerEvents: "none",
          }}
        />
        <span
          style={{
            fontFamily: fontFamily.code,
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: COLORS.teal,
            position: "relative",
          }}
        >
          npx @takeshijuan/ideogram-mcp-server
        </span>
      </div>

      <div
        style={{
          opacity: urlProgress,
          transform: `translateY(${interpolate(urlProgress, [0, 1], [10, 0])}px)`,
          fontFamily: fontFamily.code,
          fontSize: 18,
          fontWeight: 400,
          color: TEXT_SECONDARY,
          letterSpacing: "0.01em",
        }}
      >
        github.com/takeshijuan/ideogram-mcp-server
      </div>

      <AbsoluteFill
        style={{
          backgroundColor: BG_BASE,
          opacity: fadeOut,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

// ============================================================
// Main composition: Brand(2s) + Carousel(11s) + CTA(2s) = 15s
// ============================================================
export const CompactPromo: React.FC = () => {
  const { fps } = useVideoConfig();

  const carouselFrames = FEATURES.length * CARD_DURATION_FRAMES;

  return (
    <AbsoluteFill style={{ backgroundColor: BG_BASE }}>
      <Sequence durationInFrames={2 * fps}>
        <BrandBeat />
      </Sequence>

      <Sequence from={2 * fps} durationInFrames={carouselFrames}>
        <FeatureCarousel />
      </Sequence>

      <Sequence from={2 * fps + carouselFrames}>
        <CTABeat />
      </Sequence>
    </AbsoluteFill>
  );
};
