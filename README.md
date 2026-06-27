# Promo Kit MCP

Finished reference project for the MCP build night. This Manufact/mcp-use app creates a complete promo kit from a short campaign brief.

It combines:

- Exa for web research and source summaries
- Unsplash for campaign visuals by default
- optional fal.ai support for generated poster images
- ElevenLabs for voice ad generation
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
```

`ELEVENLABS_VOICE_ID` is optional. If omitted, the app uses a default ElevenLabs voice ID.
`FAL_KEY` is optional unless you set `IMAGE_PROVIDER=fal`.

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
Create a promo kit for a student AI build night in Rome.
Include a research-backed angle, poster visual, short ad script, and voiceover.
```

## Tools

- `research_market(topic, audience, location, maxResults)`
- `generate_poster(brief, visualStyle, format)`
- `generate_voiceover(script, voiceId, language)`
- `create_promo_kit(topic, audience, location, tone)`

## Expected Output

`create_promo_kit` returns:

- title and positioning
- three social captions
- Exa-backed research with source links
- Unsplash image URL with attribution, or fal.ai poster prompt and image URL when `IMAGE_PROVIDER=fal`
- ElevenLabs voiceover script and audio data URL

## Demo Prompts

```text
Create a promo kit for a student AI build night in Rome.
```

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

Fix: verify the API key, voice ID, and account credits.

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

## Manufact Cloud

Deployment is optional for the local workshop:

```bash
npm run deploy
```

Do not commit real API keys, Manufact device codes, generated images, or generated audio files.
