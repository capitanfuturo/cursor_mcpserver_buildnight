---
name: promo-kit
description: Use the Promo Kit MCP server to create research-backed campaign assets.
---

Use this skill when the user asks to create, improve, or demo a promo kit for a product, event, workshop, venue, or launch.

The local MCP server should be running first:

```bash
npm run dev
```

Use `create_promo_kit` for complete kits. Use individual tools only when the user asks for one asset:

- `research_market`: Exa-backed research and sources
- `generate_poster`: fal.ai image generation
- `generate_voiceover`: ElevenLabs text-to-speech
- `create_promo_kit`: orchestrates research, poster, captions, script, and voiceover

Good demo prompt:

```text
Create a promo kit for a student AI build night in Rome.
Include a research-backed angle, poster visual, short ad script, and voiceover.
```

When presenting results, include the positioning, captions, source links, poster image URL, and voiceover audio URL.
