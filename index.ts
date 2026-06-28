import { MCPServer, object } from "mcp-use/server";
import { z } from "zod";
import {
  evaluateWithHeuristics,
  evaluateWithOpenAI,
} from "./src/evaluation";
import { generateVoiceover as createVoiceover } from "./src/providers/elevenlabs";
import { researchMarket as searchMarket } from "./src/providers/exa";
import { createCampaignVisual } from "./src/providers/images";
import { sendEvaluationToLangfuse } from "./src/providers/langfuse";
import type { PromoKit } from "./src/types";

const server = new MCPServer({
  name: "promo-kit-mcp-finished",
  title: "Promo Kit MCP",
  version: "1.0.0",
  description:
    "Generate and benchmark research-backed promo kits with Exa, Unsplash or fal.ai, ElevenLabs, and Langfuse.",
  instructions:
    "Use create_and_evaluate_promo_kit for the best workshop demo. Use create_promo_kit for generation only, evaluate_promo_kit for judging an existing kit, and individual tools for research-only, poster-only, or voiceover-only requests.",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://manufact.com",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

const sourceSchema = z.object({
  title: z.string(),
  url: z.string(),
  summary: z.string(),
});

const researchSchema = z.object({
  topic: z.string(),
  audience: z.string(),
  location: z.string(),
  angle: z.string(),
  insights: z.array(z.string()),
  sources: z.array(sourceSchema),
});

const posterSchema = z.object({
  provider: z.enum(["fal", "unsplash", "placeholder"]),
  prompt: z.string(),
  imageUrl: z.string(),
  visualStyle: z.string(),
  format: z.string(),
  sourceUrl: z.string().optional(),
  photographerName: z.string().optional(),
  photographerUrl: z.string().optional(),
  attribution: z.string().optional(),
});

const voiceoverSchema = z.object({
  status: z.enum(["generated", "unavailable"]),
  script: z.string(),
  audioUrl: z.string(),
  voiceId: z.string(),
  language: z.string(),
  error: z.string().optional(),
});

const promoKitSchema = z.object({
  title: z.string(),
  positioning: z.string(),
  captions: z.array(z.string()),
  research: researchSchema,
  poster: posterSchema,
  voiceover: voiceoverSchema,
});

const evaluationScoreSchema = z.object({
  name: z.string(),
  value: z.number(),
  comment: z.string(),
});

const evaluationSchema = z.object({
  judge: z.enum(["heuristic", "openai"]),
  overallScore: z.number(),
  verdict: z.enum(["excellent", "good", "needs_work"]),
  scores: z.array(evaluationScoreSchema),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
});

const langfuseSchema = z.object({
  enabled: z.boolean(),
  sent: z.boolean(),
  traceId: z.string().optional(),
  host: z.string().optional(),
  error: z.string().optional(),
});

const benchmarkSchema = z.object({
  promoKit: promoKitSchema,
  evaluation: evaluationSchema,
  langfuse: langfuseSchema,
});

const presetIdSchema = z.enum([
  "cursor-build-night-padova",
  "student-ai-build-night-rome",
  "matcha-cafe-university",
  "indie-game-tournament",
]);

const presets = {
  "cursor-build-night-padova": {
    label: "Cursor Build Night Padova",
    topic: "cursor build night",
    audience: "developers",
    location: "Padova, Italy",
    tone: "energetic and practical",
  },
  "student-ai-build-night-rome": {
    label: "Student AI Build Night Rome",
    topic: "student AI build night",
    audience: "students and beginner builders",
    location: "Rome, Italy",
    tone: "friendly and practical",
  },
  "matcha-cafe-university": {
    label: "Matcha Cafe University Launch",
    topic: "matcha cafe opening",
    audience: "university students",
    location: "Milan, Italy",
    tone: "warm and social",
  },
  "indie-game-tournament": {
    label: "Indie Game Tournament",
    topic: "indie game tournament",
    audience: "local gamers and developers",
    location: "Padova, Italy",
    tone: "playful and energetic",
  },
} satisfies Record<
  z.infer<typeof presetIdSchema>,
  {
    label: string;
    topic: string;
    audience: string;
    location: string;
    tone: string;
  }
>;

function voiceScript(input: {
  topic: string;
  audience: string;
  location: string;
  tone: string;
}): string {
  const tone = input.tone.replace(/\band practical\b/i, "").trim() || input.tone;

  return [
    `This week in ${input.location}, ${input.topic} is built for ${input.audience}.`,
    `Expect something ${tone}, practical, and easy to share.`,
    "Bring one friend, show up curious, and leave with something worth talking about.",
  ].join(" ");
}

async function buildPromoKit(input: {
  topic: string;
  audience: string;
  location: string;
  tone: string;
}): Promise<PromoKit> {
  const research = await searchMarket({
    topic: input.topic,
    audience: input.audience,
    location: input.location,
    maxResults: 3,
  });

  const positioning = `${research.angle}. Tone: ${input.tone}.`;
  const poster = await createCampaignVisual({
    brief: `${input.topic} for ${input.audience} in ${input.location}. ${research.angle}.`,
    visualStyle:
      "bold editorial poster, local city energy, confident typography space, premium but approachable",
    format: "square social post",
  });

  const script = voiceScript(input);
  const voiceover = await createVoiceover({
    script,
    language: "en",
  });

  return {
    title: `${input.topic} Promo Kit`,
    positioning,
    captions: [
      `${input.topic} lands in ${input.location}. Bring a friend and make the night count.`,
      `A ${input.tone} plan for ${input.audience}: ${input.topic}.`,
      `Save this: ${input.topic} is your next ${input.location} move.`,
    ],
    research,
    poster,
    voiceover,
  };
}

async function judgePromoKit(input: {
  promoKit: PromoKit;
  topic: string;
  audience: string;
  location: string;
}) {
  const provider = process.env.JUDGE_PROVIDER?.toLowerCase();
  const apiKey = process.env.OPENAI_API_KEY;

  if (provider === "openai" && apiKey) {
    try {
      return await evaluateWithOpenAI({
        ...input,
        apiKey,
        model: process.env.JUDGE_MODEL || "gpt-4o-mini",
      });
    } catch {
      return evaluateWithHeuristics(input);
    }
  }

  return evaluateWithHeuristics(input);
}

server.tool(
  {
    name: "list_demo_presets",
    description:
      "List ready-to-run workshop scenarios for non-technical users testing the MCP server.",
    schema: z.object({}),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    outputSchema: z.object({
      presets: z.array(
        z.object({
          id: presetIdSchema,
          label: z.string(),
          topic: z.string(),
          audience: z.string(),
          location: z.string(),
          tone: z.string(),
        })
      ),
    }),
  },
  async () => {
    return object({
      presets: Object.entries(presets).map(([id, preset]) => ({
        id,
        ...preset,
      })),
    });
  }
);

server.tool(
  {
    name: "run_demo_preset",
    description:
      "Run a complete generate-and-evaluate demo from a dropdown preset.",
    schema: z.object({
      preset: presetIdSchema.describe("Ready-to-run workshop scenario"),
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    outputSchema: benchmarkSchema,
  },
  async ({ preset }) => {
    const selected = presets[preset];
    const promoKit = await buildPromoKit(selected);
    const evaluation = await judgePromoKit({
      promoKit,
      topic: selected.topic,
      audience: selected.audience,
      location: selected.location,
    });
    const langfuse = await sendEvaluationToLangfuse({
      promoKit,
      evaluation,
      topic: selected.topic,
      audience: selected.audience,
      location: selected.location,
    });

    return object({ promoKit, evaluation, langfuse });
  }
);

server.tool(
  {
    name: "research_market",
    description:
      "Use Exa to research a campaign topic, target audience, and location.",
    schema: z.object({
      topic: z.string().describe("Campaign topic, event, or product"),
      audience: z.string().describe("Target audience"),
      location: z.string().describe("Target city or region"),
      maxResults: z.number().min(1).max(8).default(3),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
    outputSchema: researchSchema,
  },
  async ({ topic, audience, location, maxResults }) => {
    return object(
      await searchMarket({
        topic,
        audience,
        location,
        maxResults,
      })
    );
  }
);

server.tool(
  {
    name: "generate_poster",
    description:
      "Create a campaign visual. Defaults to Unsplash stock imagery; set IMAGE_PROVIDER=fal to use fal.ai generation.",
    schema: z.object({
      brief: z.string().describe("Creative brief for the poster"),
      visualStyle: z
        .string()
        .default("bold editorial poster, energetic, local, high contrast"),
      format: z.string().default("square social post"),
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    outputSchema: posterSchema,
  },
  async ({ brief, visualStyle, format }) => {
    return object(await createCampaignVisual({ brief, visualStyle, format }));
  }
);

server.tool(
  {
    name: "generate_voiceover",
    description: "Use ElevenLabs to generate a short spoken voice ad.",
    schema: z.object({
      script: z.string().describe("Short spoken ad script"),
      voiceId: z
        .string()
        .optional()
        .describe("Optional ElevenLabs voice ID; falls back to ELEVENLABS_VOICE_ID"),
      language: z.string().default("en"),
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    outputSchema: voiceoverSchema,
  },
  async ({ script, voiceId, language }) => {
    return object(await createVoiceover({ script, voiceId, language }));
  }
);

server.tool(
  {
    name: "create_promo_kit",
    description:
      "Create a complete promo kit with Exa research, Unsplash or fal.ai campaign visuals, and ElevenLabs voiceover.",
    schema: z.object({
      topic: z.string().describe("Campaign topic, event, or product"),
      audience: z.string().describe("Target audience"),
      location: z.string().describe("Target city or region"),
      tone: z.string().default("energetic and practical"),
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    outputSchema: promoKitSchema,
  },
  async ({ topic, audience, location, tone }) => {
    return object(await buildPromoKit({ topic, audience, location, tone }));
  }
);

server.tool(
  {
    name: "evaluate_promo_kit",
    description:
      "Judge an existing promo kit with an LLM-as-a-judge style rubric and optionally send scores to Langfuse.",
    schema: z.object({
      topic: z.string().describe("Original campaign topic"),
      audience: z.string().describe("Original target audience"),
      location: z.string().describe("Original target city or region"),
      promoKitJson: z
        .string()
        .describe("JSON string returned by create_promo_kit"),
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    outputSchema: z.object({
      evaluation: evaluationSchema,
      langfuse: langfuseSchema,
    }),
  },
  async ({ topic, audience, location, promoKitJson }) => {
    const promoKit = JSON.parse(promoKitJson) as PromoKit;
    const evaluation = await judgePromoKit({
      promoKit,
      topic,
      audience,
      location,
    });
    const langfuse = await sendEvaluationToLangfuse({
      promoKit,
      evaluation,
      topic,
      audience,
      location,
    });

    return object({ evaluation, langfuse });
  }
);

server.tool(
  {
    name: "create_and_evaluate_promo_kit",
    description:
      "Create a complete promo kit, run an LLM-as-a-judge style benchmark, and optionally send the trace and scores to Langfuse.",
    schema: z.object({
      topic: z.string().describe("Campaign topic, event, or product"),
      audience: z.string().describe("Target audience"),
      location: z.string().describe("Target city or region"),
      tone: z.string().default("energetic and practical"),
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    outputSchema: benchmarkSchema,
  },
  async ({ topic, audience, location, tone }) => {
    const promoKit = await buildPromoKit({ topic, audience, location, tone });
    const evaluation = await judgePromoKit({
      promoKit,
      topic,
      audience,
      location,
    });
    const langfuse = await sendEvaluationToLangfuse({
      promoKit,
      evaluation,
      topic,
      audience,
      location,
    });

    return object({ promoKit, evaluation, langfuse });
  }
);

server.listen().then(() => {
  console.log("Promo Kit MCP running");
});
