import React from "react";
import {
  interpolate,
  useCurrentFrame,
  Easing,
} from "remotion";
import { fontFamily } from "../styles/fonts";
import { COLORS } from "../styles/theme";

type ChecklistItem = {
  text: string;
  checked?: boolean;
};

type ChecklistProps = {
  title: string;
  items: ChecklistItem[];
  staggerFrames?: number;
  startDelay?: number;
};

export const Checklist: React.FC<ChecklistProps> = ({
  title,
  items,
  staggerFrames = 10,
  startDelay = 0,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startDelay;

  return (
    <div
      style={{
        backgroundColor: "#252526",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #3c3c3c",
        fontFamily: fontFamily.ui,
        width: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#2d2d2d",
          padding: "10px 16px",
          borderBottom: "1px solid #3c3c3c",
        }}
      >
        <span
          style={{ color: COLORS.text, fontSize: 16, fontWeight: 600 }}
        >
          {title}
        </span>
      </div>

      {/* Items */}
      <div style={{ padding: "12px 16px" }}>
        {items.map((item, i) => {
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

          return (
            <div
              key={`${i}-${item.text}`}
              style={{
                opacity,
                display: "flex",
                alignItems: "center",
                gap: 10,
                height: 32,
                fontSize: 16,
                lineHeight: "32px",
              }}
            >
              <span style={{ color: item.checked ? COLORS.success : COLORS.textDim }}>
                {item.checked ? "\u2611" : "\u2610"}
              </span>
              <span style={{ color: COLORS.text }}>{item.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
