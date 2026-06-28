export type ResearchSource = {
  title: string;
  url: string;
  summary: string;
};

export type MarketResearch = {
  topic: string;
  audience: string;
  location: string;
  angle: string;
  insights: string[];
  sources: ResearchSource[];
};

export type PosterResult = {
  provider: "fal" | "unsplash" | "placeholder";
  prompt: string;
  imageUrl: string;
  visualStyle: string;
  format: string;
  sourceUrl?: string;
  photographerName?: string;
  photographerUrl?: string;
  attribution?: string;
};

export type VoiceoverResult = {
  status: "generated" | "unavailable";
  script: string;
  audioUrl: string;
  voiceId: string;
  language: string;
  error?: string;
};

export type PromoKit = {
  title: string;
  positioning: string;
  captions: string[];
  research: MarketResearch;
  poster: PosterResult;
  voiceover: VoiceoverResult;
};

export type PromoKitBenchmark = {
  promoKit: PromoKit;
  evaluation: unknown;
  langfuse: unknown;
};
