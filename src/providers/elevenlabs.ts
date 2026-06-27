import { elevenLabsVoiceId, requireApiKey } from "../config";
import type { VoiceoverResult } from "../types";

const fallbackVoiceId = "TX3LPaxmHKxFdv7VOQHJ";

async function requestSpeech(input: {
  apiKey: string;
  voiceId: string;
  script: string;
}): Promise<Response> {
  return fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
      input.voiceId
    )}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": input.apiKey,
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
}

export async function generateVoiceover(input: {
  script: string;
  voiceId?: string;
  language: string;
}): Promise<VoiceoverResult> {
  const apiKey = requireApiKey("ElevenLabs");
  const voiceId = elevenLabsVoiceId(input.voiceId);
  let response = await requestSpeech({ apiKey, voiceId, script: input.script });

  if (!response.ok) {
    const firstError = await response.text();

    if (voiceId !== fallbackVoiceId) {
      response = await requestSpeech({
        apiKey,
        voiceId: fallbackVoiceId,
        script: input.script,
      });

      if (response.ok) {
        const audio = Buffer.from(await response.arrayBuffer()).toString(
          "base64"
        );

        return {
          status: "generated",
          script: input.script,
          audioUrl: `data:audio/mpeg;base64,${audio}`,
          voiceId: fallbackVoiceId,
          language: input.language,
        };
      }
    }

    const fallbackError = response.ok ? "" : await response.text();
    return {
      status: "unavailable",
      script: input.script,
      audioUrl: "",
      voiceId,
      language: input.language,
      error: `ElevenLabs TTS unavailable. Primary error: ${firstError}${
        fallbackError ? ` Fallback error: ${fallbackError}` : ""
      }`,
    };
  }

  const audio = Buffer.from(await response.arrayBuffer()).toString("base64");

  return {
    status: "generated",
    script: input.script,
    audioUrl: `data:audio/mpeg;base64,${audio}`,
    voiceId,
    language: input.language,
  };
}
