# Promo Kit MCP

Finished reference project for the MCP build night. This Manufact/mcp-use app creates a complete promo kit from a short campaign brief.

It combines:

- Exa for web research and source summaries
- Unsplash for campaign visuals by default
- optional fal.ai support for generated poster images
- ElevenLabs for voice ad generation
- Langfuse for trace and score observability
- an LLM-as-a-judge style evaluator for output quality
- MCP as the agent tool interface

## Setup

```bash
npm install
cp .env.example .env
```

Add your workshop credit keys to `.env`:

```bash
PORT=3000
MCP_URL=http://localhost:3000
IMAGE_PROVIDER=unsplash
EXA_API_KEY=...
UNSPLASH_ACCESS_KEY=...
FAL_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
JUDGE_PROVIDER=heuristic
OPENAI_API_KEY=
JUDGE_MODEL=gpt-4o-mini
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=https://cloud.langfuse.com
```

`ELEVENLABS_VOICE_ID` is optional. If omitted, the app uses a default ElevenLabs voice ID.
`FAL_KEY` is optional unless you set `IMAGE_PROVIDER=fal`.
Langfuse and OpenAI are optional. Without them, the benchmark still works with a local heuristic judge and returns `langfuse.sent: false`.

If you use direnv, put those exports in `.envrc.local` instead and run:

```bash
direnv allow
```

Start the local server:

```bash
npm run dev
```

Open the inspector:

```text
http://localhost:3000/inspector
```

Local MCP endpoint:

```text
http://localhost:3000/mcp
```

If mcp-use reports a different port because 3000 is busy, set `PORT` in `.envrc.local` and update `mcp.json` / `.mcp.json` to match for that machine.

## Cursor Demo

Use `mcp.json` to connect Cursor to the local server:

```json
{
  "mcpServers": {
    "promo-kit-mcp": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Then ask Cursor Agent:

```text
Use check_setup first. Then use run_demo_preset with cursor-build-night-padova.
Show the promo kit, the judge score, and whether Langfuse received the trace.
```

Or, for the shortest possible demo:

```text
Use run_demo_preset with cursor-build-night-padova.
Show the promo kit, the judge score, and whether Langfuse received the trace.
```

## Tools

- `check_setup()`
- `research_market(topic, audience, location, maxResults)`
- `generate_poster(brief, visualStyle, format)`
- `generate_voiceover(script, voiceId, language)`
- `create_promo_kit(topic, audience, location, tone)`
- `evaluate_promo_kit(topic, audience, location, promoKitJson)`
- `create_and_evaluate_promo_kit(topic, audience, location, tone)`
- `list_demo_presets()`
- `run_demo_preset(preset)`

## Expected Output

`create_promo_kit` returns:

- title and positioning
- three social captions
- Exa-backed research with source links
- Unsplash image URL with attribution, or fal.ai poster prompt and image URL when `IMAGE_PROVIDER=fal`
- ElevenLabs voiceover script, plus an audio data URL when the current key and voice have enough API access

`create_and_evaluate_promo_kit` returns:

- `promoKit`: the generated campaign kit
- `evaluation`: judge, overall score, rubric scores, strengths, and improvements
- `langfuse`: whether the trace and scores were sent to Langfuse

## Demo Prompts

```text
Create a promo kit for a student AI build night in Rome.
```

```text
Create and evaluate a promo kit for a Cursor build night in Padova for developers.
```

```text
Run the cursor-build-night-padova preset and explain the judge scores.
```

Preset IDs:

- `cursor-build-night-padova`
- `student-ai-build-night-rome`
- `matcha-cafe-university`
- `indie-game-tournament`

```text
Create a promo kit for a matcha cafe opening near a university.
```

```text
Create a promo kit for an indie game tournament this weekend.
```

## Troubleshooting

Missing API key:

```text
EXA_API_KEY is required for Exa. Copy .env.example to .env and add your workshop credit key.
```

Fix: add the missing key to `.env` and restart `npm run dev`.

fal.ai returns no image URL:

```text
fal.ai returned no image URL.
```

Fix: retry with a shorter prompt or check fal.ai credits.

Unsplash returns no image:

```text
Unsplash returned no image
```

Fix: use a simpler campaign brief or visual style.

ElevenLabs returns an auth or quota error:

```text
ElevenLabs TTS failed (401 or 429)
```

The server now keeps the promo kit usable when TTS is unavailable. The voiceover object returns `status: "unavailable"`, keeps the script, and includes the provider error for troubleshooting.

Fix: verify the API key, voice ID, account tier, and remaining credits.

Langfuse says `sent: false`:

```text
langfuse: { "enabled": false, "sent": false }
```

Fix: set `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_HOST`, then restart `npm run dev`.

OpenAI judge is not configured:

```text
judge: "heuristic"
```

This is expected for the workshop. Set `JUDGE_PROVIDER=openai` and `OPENAI_API_KEY` only if you want a live LLM judge instead of the deterministic rubric.

Check setup before a live demo:

```text
check_setup()
```

This reports which providers are configured without exposing key values. Exa and the selected image provider are required for the finished live demo. ElevenLabs, OpenAI judge, and Langfuse can be unavailable without breaking the main promo kit flow.

Build warning about large chunks:

```text
Some chunks are larger than 1024 kB
```

This comes from the mcp-apps widget bundle and does not block the local workshop demo.

## Optional Distribution Story

This repo includes local wrapper files for:

- Cursor: `.cursor-plugin/plugin.json` and `mcp.json`
- Claude Code: `.claude-plugin/plugin.json` and `.mcp.json`
- Codex: `.codex-plugin/plugin.json` and `.mcp.json`

The important idea for attendees: the MCP server is the product, and plugin or connector marketplaces are the distribution layer.

## Workshop Narrative

1. The agent calls MCP tools instead of only writing text.
2. Exa grounds the campaign in current web context.
3. Unsplash supplies a visual asset with attribution.
4. ElevenLabs attempts a voiceover; if account limits block audio, the workflow still keeps the script.
5. The judge scores the output with a rubric.
6. Langfuse stores the trace and numeric scores when keys are configured.

## Manufact Cloud

Deployment is optional for the local workshop:

```bash
npm run deploy
```

Do not commit real API keys, Manufact device codes, generated images, or generated audio files.
