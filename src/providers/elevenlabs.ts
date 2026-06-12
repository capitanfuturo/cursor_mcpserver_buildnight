import { elevenLabsVoiceId, requireApiKey } from "../config";
import type { VoiceoverResult } from "../types";

export async function generateVoiceover(input: {
  script: string;
  voiceId?: string;
  language: string;
}): Promise<VoiceoverResult> {
  const apiKey = requireApiKey("ElevenLabs");
  const voiceId = elevenLabsVoiceId(input.voiceId);
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
      voiceId
    )}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: input.script,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `ElevenLabs TTS failed (${response.status}): ${await response.text()}`
    );
  }

  const audio = Buffer.from(await response.arrayBuffer()).toString("base64");

  return {
    script: input.script,
    audioUrl: `data:audio/mpeg;base64,${audio}`,
    voiceId,
    language: input.language,
  };
}
