export type ProviderName = "Exa" | "fal.ai" | "ElevenLabs";

const envNames = {
  Exa: "EXA_API_KEY",
  "fal.ai": "FAL_KEY",
  ElevenLabs: "ELEVENLABS_API_KEY",
} satisfies Record<ProviderName, string>;

export function requireApiKey(provider: ProviderName): string {
  const envName = envNames[provider];
  const value = process.env[envName];

  if (!value) {
    throw new Error(
      `${envName} is required for ${provider}. Copy .env.example to .env and add your workshop credit key.`
    );
  }

  return value;
}

export function elevenLabsVoiceId(override?: string): string {
  return (
    override ||
    process.env.ELEVENLABS_VOICE_ID ||
    "21m00Tcm4TlvDq8ikWAM"
  );
}
