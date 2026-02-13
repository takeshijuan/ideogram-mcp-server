import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Problem } from "./scenes/Problem";
import { Solution } from "./scenes/Solution";
import { Demo } from "./scenes/Demo";
import { CTA } from "./scenes/CTA";

// Scene durations in seconds
const SCENE_DURATIONS = {
  problem: 20,
  solution: 20,
  demo: 50,
  cta: 30,
} as const;

// Transition duration in seconds
const TRANSITION_SECONDS = 0.5;

export const PromoVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  const transitionFrames = Math.round(TRANSITION_SECONDS * fps);

  return (
    <AbsoluteFill className="bg-[#1e1e1e]">
      <TransitionSeries>
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.problem * fps}
        >
          <Problem />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.solution * fps}
        >
          <Solution />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.demo * fps}
        >
          <Demo />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.cta * fps}
        >
          <CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
