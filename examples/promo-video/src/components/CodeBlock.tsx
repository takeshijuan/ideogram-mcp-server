import React from "react";
import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { fontFamily } from "../styles/fonts";
import { COLORS } from "../styles/theme";

type CodeLine = {
  text: string;
  color?: string;
  indent?: number;
};

type CodeBlockProps = {
  lines: CodeLine[];
  title?: string;
  // Frames per line to appear
  staggerFrames?: number;
  // Delay before animation starts
  startDelay?: number;
  // Whether to show line numbers
  showLineNumbers?: boolean;
};

export const CodeBlock: React.FC<CodeBlockProps> = ({
  lines,
  title = "editor",
  staggerFrames = 8,
  startDelay = 0,
  showLineNumbers = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - startDelay;

  return (
    <div
      style={{
        backgroundColor: "#1e1e1e",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #3c3c3c",
        fontFamily: fontFamily.code,
        width: "100%",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          backgroundColor: "#2d2d2d",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#ff5f56",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#ffbd2e",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#27c93f",
            }}
          />
        </div>
        <span
          style={{ color: COLORS.textDim, fontSize: 14, marginLeft: 8 }}
        >
          {title}
        </span>
      </div>

      {/* Code content */}
      <div style={{ padding: "16px 20px" }}>
        {lines.map((line, i) => {
          const lineDelay = i * staggerFrames;
          const opacity = interpolate(
            localFrame,
            [lineDelay, lineDelay + 10],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            },
          );
          const translateY = interpolate(
            localFrame,
            [lineDelay, lineDelay + 10],
            [8, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            },
          );

          return (
            <div
              key={`${i}-${line.text}`}
              style={{
                opacity,
                transform: `translateY(${translateY}px)`,
                display: "flex",
                alignItems: "baseline",
                height: 32,
                fontSize: 18,
                lineHeight: "32px",
              }}
            >
              {showLineNumbers && (
                <span
                  style={{
                    color: COLORS.textDim,
                    width: 40,
                    textAlign: "right",
                    marginRight: 16,
                    userSelect: "none",
                    fontSize: 14,
                  }}
                >
                  {i + 1}
                </span>
              )}
              <span
                style={{
                  color: line.color ?? COLORS.text,
                  marginLeft: (line.indent ?? 0) * 24,
                  whiteSpace: "pre",
                }}
              >
                {line.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
