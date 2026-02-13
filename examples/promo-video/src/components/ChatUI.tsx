import React from "react";
import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { fontFamily } from "../styles/fonts";
import { COLORS } from "../styles/theme";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  delayFrames?: number;
};

type ChatUIProps = {
  messages: ChatMessage[];
  startDelay?: number;
  // Frames between each character for typing effect
  typingSpeed?: number;
};

const TypingText: React.FC<{
  text: string;
  startFrame: number;
  charFrames: number;
}> = ({ text, startFrame, charFrames }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  if (localFrame < 0) return null;

  const safeCharFrames = Math.max(1, charFrames);
  const charsToShow = Math.min(
    text.length,
    Math.floor(localFrame / safeCharFrames),
  );

  return <span>{text.slice(0, charsToShow)}</span>;
};

export const ChatUI: React.FC<ChatUIProps> = ({
  messages,
  startDelay = 0,
  typingSpeed = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate cumulative start frames for each message
  let cumulativeFrame = 0;
  const messageTimings = messages.map((msg) => {
    const start = cumulativeFrame + (msg.delayFrames ?? 0);
    cumulativeFrame = start + msg.content.length * typingSpeed + 15;
    return { ...msg, startFrame: start };
  });

  return (
    <div
      style={{
        backgroundColor: "#1a1a2e",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid #30365a",
        width: "100%",
        fontFamily: fontFamily.ui,
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#16213e",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: COLORS.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: COLORS.white,
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          C
        </div>
        <span style={{ color: COLORS.text, fontSize: 18, fontWeight: 600 }}>
          Claude Desktop
        </span>
      </div>

      {/* Messages */}
      <div
        style={{
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {messageTimings.map((msg, i) => {
          const localFrame = frame - startDelay;
          const enterProgress = spring({
            frame: localFrame - msg.startFrame,
            fps,
            config: { damping: 200 },
          });

          if (localFrame < msg.startFrame) return null;

          const isUser = msg.role === "user";

          return (
            <div
              key={`${i}-${msg.role}`}
              style={{
                opacity: enterProgress,
                transform: `translateY(${(1 - enterProgress) * 10}px)`,
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  backgroundColor: isUser ? COLORS.accent : "#252547",
                  borderRadius: 12,
                  padding: "12px 18px",
                  maxWidth: "75%",
                  color: COLORS.text,
                  fontSize: 18,
                  lineHeight: 1.5,
                }}
              >
                <TypingText
                  text={msg.content}
                  startFrame={startDelay + msg.startFrame}
                  charFrames={typingSpeed}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
