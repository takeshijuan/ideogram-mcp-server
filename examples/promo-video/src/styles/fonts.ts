// Font loading for the promo video
// JetBrains Mono for code, Inter for UI text

import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const jetBrainsResult = loadJetBrainsMono("normal", {
  weights: ["400", "700"],
  subsets: ["latin"],
});

const interResult = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const fontFamily = {
  code: jetBrainsResult.fontFamily,
  ui: interResult.fontFamily,
} as const;
