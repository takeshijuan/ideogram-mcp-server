import React from "react";
import "./index.css";
import { Composition } from "remotion";
import { PromoVideo } from "./Video";

// 60fps, 120 seconds = 7200 frames
const FPS = 60;
const DURATION_IN_SECONDS = 120;
const WIDTH = 1920;
const HEIGHT = 1080;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PromoVideo"
      component={PromoVideo}
      durationInFrames={FPS * DURATION_IN_SECONDS}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
