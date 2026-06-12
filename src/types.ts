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
  prompt: string;
  imageUrl: string;
  visualStyle: string;
  format: string;
};

export type VoiceoverResult = {
  script: string;
  audioUrl: string;
  voiceId: string;
  language: string;
};

export type PromoKit = {
  title: string;
  positioning: string;
  captions: string[];
  research: MarketResearch;
  poster: PosterResult;
  voiceover: VoiceoverResult;
};
