import { requireApiKey } from "../config";
import type { PosterResult } from "../types";

type UnsplashPhoto = {
  alt_description?: string;
  description?: string;
  urls?: {
    regular?: string;
    full?: string;
  };
  user?: {
    name?: string;
    links?: {
      html?: string;
    };
  };
  links?: {
    html?: string;
    download_location?: string;
  };
};

type UnsplashSearchResponse = {
  results?: UnsplashPhoto[];
};

function formatQuery(input: {
  brief: string;
  visualStyle: string;
  format: string;
}): string {
  return [input.brief, input.visualStyle, input.format, "event campaign"]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function trackDownload(photo: UnsplashPhoto, apiKey: string): Promise<void> {
  const location = photo.links?.download_location;

  if (!location) {
    return;
  }

  try {
    await fetch(`${location}${location.includes("?") ? "&" : "?"}client_id=${apiKey}`);
  } catch {
    // Tracking should not break the workshop demo if Unsplash's download
    // endpoint is temporarily unavailable.
  }
}

export async function sourcePosterImage(input: {
  brief: string;
  visualStyle: string;
  format: string;
}): Promise<PosterResult> {
  const apiKey = requireApiKey("Unsplash");
  const query = formatQuery(input);
  const params = new URLSearchParams({
    query,
    per_page: "1",
    orientation: input.format.toLowerCase().includes("square")
      ? "squarish"
      : "landscape",
  });

  const response = await fetch(
    `https://api.unsplash.com/search/photos?${params.toString()}`,
    {
      headers: {
        Authorization: `Client-ID ${apiKey}`,
        "Accept-Version": "v1",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Unsplash search failed (${response.status}): ${await response.text()}`
    );
  }

  const payload = (await response.json()) as UnsplashSearchResponse;
  const photo = payload.results?.[0];
  const imageUrl = photo?.urls?.regular || photo?.urls?.full;

  if (!photo || !imageUrl) {
    throw new Error(`Unsplash returned no image for "${query}".`);
  }

  await trackDownload(photo, apiKey);

  const photographerName = photo.user?.name || "Unknown photographer";
  const photographerUrl = photo.user?.links?.html;

  return {
    provider: "unsplash",
    prompt: query,
    imageUrl,
    visualStyle: input.visualStyle,
    format: input.format,
    sourceUrl: photo.links?.html,
    photographerName,
    photographerUrl,
    attribution: `Photo by ${photographerName} on Unsplash`,
  };
}
