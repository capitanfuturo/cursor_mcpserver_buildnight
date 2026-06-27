import { imageProvider } from "../config";
import type { PosterResult } from "../types";
import { generatePoster as generateFalPoster } from "./fal";
import { sourcePosterImage } from "./unsplash";

export async function createCampaignVisual(input: {
  brief: string;
  visualStyle: string;
  format: string;
}): Promise<PosterResult> {
  if (imageProvider() === "fal") {
    return generateFalPoster(input);
  }

  return sourcePosterImage(input);
}
