# Promo Kit MCP Demo Runbook

Use this runbook for the live showcase before attendees start from the starter repo.

## 1. Start

Prerequisite: Node.js 22 or newer.

```bash
npm install
direnv allow
npm run dev
```

The app also loads `.env` automatically on Node 22+, so direnv is convenient but not required.

In another terminal:

```bash
npm run smoke
npm run test:langfuse
```

Open:

```text
http://localhost:3022/inspector?autoConnect=http%3A%2F%2Flocalhost%3A3022%2Fmcp
```

If you use another port, open the Inspector URL printed by `npm run dev`.

Optional visual client:

```bash
MCP_SERVER_URL=http://localhost:3022 npm run web
```

Open:

```text
http://localhost:5174
```

This web UI is a small local client that calls the MCP server tools. Use it to
show the difference between the MCP inspector, which is a developer console, and
an application that consumes the MCP server.

## 2. Presenter Flow

1. Call `get_workshop_flow`.
2. Call `check_setup`.
3. Call `list_demo_presets`.
4. Call `run_demo_preset` with `cursor-build-night-padova`.
5. Call `create_and_evaluate_promo_kit` with a custom brief.

For the visual UI demo:

1. Open `http://localhost:5174`.
2. Click `Generate Kit` with the Cursor Build Night preset.
3. Show the Exa-backed research sources, Unsplash image preview, ElevenLabs
   audio player, quality score, and Langfuse status.
4. Change the brief and generate a custom kit.

Suggested custom brief:

```text
topic: matcha cafe opening
audience: university students
location: Padova, Italy
tone: warm and social
```

## 3. Speaking Notes

- MCP turns the agent into a tool user, not only a text generator.
- Exa grounds the campaign in current web context.
- Unsplash supplies a usable visual when fal.ai is unavailable.
- ElevenLabs attempts voice generation; if account limits block audio, the server keeps the script and marks voiceover as unavailable.
- The judge turns subjective output quality into visible rubric scores.
- Langfuse stores the trace and scores when keys are configured; otherwise `dryRun: true` shows the trace and score names that would be sent.

## 4. Known Live-Demo State

With the current local keys:

- Exa works.
- Unsplash works.
- ElevenLabs may return `status: "unavailable"` because of voice tier or quota limits.
- Langfuse returns `enabled: false` and `dryRun: true` until `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are configured.

This is acceptable for the workshop because the main generation and benchmarking path still completes.

## 5. Preflight Pass Criteria

`npm run smoke` should print JSON with:

- `ok: true`
- `tools: 10`
- `demoReady: true`
- a numeric judge `score`
- `langfuse.dryRun` or `langfuse.sent`

`npm run test:langfuse` should print JSON with `ok: true`, `calls: 4`, one trace ingestion endpoint, and three score names.
