import React from "react";
import {
  interpolate,
  useCurrentFrame,
  Easing,
} from "remotion";
import { fontFamily } from "../styles/fonts";
import { COLORS } from "../styles/theme";

type TerminalLine = {
  text: string;
  type?: "command" | "output" | "error" | "success";
  prefix?: string;
};

type TerminalProps = {
  lines: TerminalLine[];
  title?: string;
  staggerFrames?: number;
  startDelay?: number;
};

const LINE_COLORS: Record<string, string> = {
  command: COLORS.text,
  output: COLORS.textDim,
  error: COLORS.error,
  success: COLORS.success,
};

export const Terminal: React.FC<TerminalProps> = ({
  lines,
  title = "terminal",
  staggerFrames = 12,
  startDelay = 0,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startDelay;

  return (
    <div
      style={{
        backgroundColor: "#0d1117",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #30363d",
        fontFamily: fontFamily.code,
        width: "100%",
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

      {/* Terminal content */}
      <div style={{ padding: "16px 20px" }}>
        {lines.map((line, i) => {
          const lineDelay = i * staggerFrames;
          const opacity = interpolate(
            localFrame,
            [lineDelay, lineDelay + 8],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.quad),
            },
          );

          const lineColor = LINE_COLORS[line.type ?? "output"] ?? COLORS.text;
          const prefix =
            line.prefix ?? (line.type === "command" ? "$ " : "  ");

          return (
            <div
              key={`${i}-${line.text}`}
              style={{
                opacity,
                height: 28,
                fontSize: 16,
                lineHeight: "28px",
                display: "flex",
              }}
            >
              <span style={{ color: COLORS.teal, whiteSpace: "pre" }}>
                {prefix}
              </span>
              <span style={{ color: lineColor, whiteSpace: "pre" }}>
                {line.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
