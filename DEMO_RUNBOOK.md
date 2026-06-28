# Promo Kit MCP Demo Runbook

Use this runbook for the live showcase before attendees start from the starter repo.

## 1. Start

```bash
npm install
direnv allow
npm run dev
```

Open:

```text
http://localhost:3022/inspector?autoConnect=http%3A%2F%2Flocalhost%3A3022%2Fmcp
```

If you use another port, open the Inspector URL printed by `npm run dev`.

## 2. Presenter Flow

1. Call `get_workshop_flow`.
2. Call `check_setup`.
3. Call `list_demo_presets`.
4. Call `run_demo_preset` with `cursor-build-night-padova`.
5. Call `create_and_evaluate_promo_kit` with a custom brief.

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
- Langfuse stores the trace and scores when keys are configured; otherwise the local benchmark still works.

## 4. Known Live-Demo State

With the current local keys:

- Exa works.
- Unsplash works.
- ElevenLabs may return `status: "unavailable"` because of voice tier or quota limits.
- Langfuse returns `enabled: false` until `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are configured.

This is acceptable for the workshop because the main generation and benchmarking path still completes.
