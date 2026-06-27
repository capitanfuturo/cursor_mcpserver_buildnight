import { MCPServer, object } from "mcp-use/server";
import { z } from "zod";
import { generateVoiceover as createVoiceover } from "./src/providers/elevenlabs";
import { researchMarket as searchMarket } from "./src/providers/exa";
import { createCampaignVisual } from "./src/providers/images";

const server = new MCPServer({
  name: "promo-kit-mcp-finished",
  title: "Promo Kit MCP",
  version: "1.0.0",
  description:
    "Generate research-backed promo kits with Exa, Unsplash or fal.ai, and ElevenLabs.",
  instructions:
    "Use create_promo_kit for complete campaign kits. Use the individual tools for research-only, poster-only, or voiceover-only requests.",
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
  script: z.string(),
  audioUrl: z.string(),
  voiceId: z.string(),
  language: z.string(),
});

const promoKitSchema = z.object({
  title: z.string(),
  positioning: z.string(),
  captions: z.array(z.string()),
  research: researchSchema,
  poster: posterSchema,
  voiceover: voiceoverSchema,
});

function voiceScript(input: {
  topic: string;
  audience: string;
  location: string;
  tone: string;
}): string {
  return [
    `This week in ${input.location}, ${input.topic} is built for ${input.audience}.`,
    `Expect something ${input.tone}, practical, and easy to share.`,
    "Bring one friend, show up curious, and leave with something worth talking about.",
  ].join(" ");
}

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
    const research = await searchMarket({
      topic,
      audience,
      location,
      maxResults: 3,
    });

    const positioning = `${research.angle}. Tone: ${tone}.`;
    const poster = await createCampaignVisual({
      brief: `${topic} for ${audience} in ${location}. ${research.angle}.`,
      visualStyle:
        "bold editorial poster, local city energy, confident typography space, premium but approachable",
      format: "square social post",
    });

    const script = voiceScript({ topic, audience, location, tone });
    const voiceover = await createVoiceover({
      script,
      language: "en",
    });

    return object({
      title: `${topic} Promo Kit`,
      positioning,
      captions: [
        `${topic} lands in ${location}. Bring a friend and make the night count.`,
        `A ${tone} plan for ${audience}: ${topic}.`,
        `Save this: ${topic} is your next ${location} move.`,
      ],
      research,
      poster,
      voiceover,
    });
  }
);

server.listen().then(() => {
  console.log("Promo Kit MCP running");
});
