import { sendEvaluationToLangfuse } from "../src/providers/langfuse";
import type { PromoKitEvaluation } from "../src/evaluation";
import type { PromoKit } from "../src/types";

type FetchCall = {
  url: string;
  init: RequestInit;
  body: any;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const originalFetch = globalThis.fetch;
const originalEnv = {
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  host: process.env.LANGFUSE_HOST,
};

const calls: FetchCall[] = [];

globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  const target = String(url);
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  calls.push({ url: target, init: init ?? {}, body });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}) as typeof fetch;

process.env.LANGFUSE_PUBLIC_KEY = "mock-public-key";
process.env.LANGFUSE_SECRET_KEY = "mock-secret-key";
process.env.LANGFUSE_HOST = "https://langfuse.example.com/";

const promoKit: PromoKit = {
  title: "cursor build night Promo Kit",
  positioning: "Local, practical campaign for developers.",
  captions: [
    "Cursor build night lands in Padova.",
    "An energetic and practical campaign for developers.",
    "Bring a friend and build something useful.",
  ],
  research: {
    topic: "cursor build night",
    audience: "developers",
    location: "Padova, Italy",
    angle: "A practical local build night for developers.",
    insights: ["Local context matters."],
    sources: [
      {
        title: "Example source",
        url: "https://example.com/source",
        summary: "Example summary.",
      },
    ],
  },
  poster: {
    provider: "unsplash",
    prompt: "developer workshop",
    imageUrl: "https://images.example.com/workshop.jpg",
    visualStyle: "bold editorial",
    format: "square social post",
    attribution: "Photo by Example on Unsplash",
  },
  voiceover: {
    status: "unavailable",
    script: "This week in Padova, cursor build night is built for developers.",
    audioUrl: "",
    voiceId: "test-voice",
    language: "en",
  },
};

const evaluation: PromoKitEvaluation = {
  judge: "heuristic",
  overallScore: 0.88,
  verdict: "excellent",
  scores: [
    {
      name: "brief_fit",
      value: 1,
      comment: "Matches topic, audience, and location.",
    },
    {
      name: "grounding",
      value: 0.8,
      comment: "Has inspectable source links.",
    },
  ],
  strengths: ["Clear local angle."],
  improvements: ["Try another CTA."],
};

try {
  const result = await sendEvaluationToLangfuse({
    promoKit,
    evaluation,
    topic: "cursor build night",
    audience: "developers",
    location: "Padova, Italy",
  });

  assert(result.enabled, "Langfuse should be enabled with fake keys");
  assert(result.sent, "Langfuse result should be sent");
  assert(!result.dryRun, "Langfuse result should not be a dry run");
  assert(result.host === "https://langfuse.example.com", "Host should be normalized");
  assert(result.traceName === "promo-kit-workshop", "Trace name mismatch");
  assert(result.scoreCount === 3, "Expected overall score plus two rubric scores");
  assert(calls.length === 4, `Expected 4 fetch calls, received ${calls.length}`);

  const [traceCall, overallCall, briefFitCall, groundingCall] = calls;
  assert(traceCall.url.endsWith("/api/public/ingestion"), "Trace endpoint mismatch");
  assert(overallCall.url.endsWith("/api/public/scores"), "Overall score endpoint mismatch");
  assert(briefFitCall.url.endsWith("/api/public/scores"), "Brief-fit score endpoint mismatch");
  assert(groundingCall.url.endsWith("/api/public/scores"), "Grounding score endpoint mismatch");

  assert(
    traceCall.body.batch?.[0]?.type === "trace-create",
    "Expected trace-create ingestion event"
  );
  assert(
    traceCall.body.batch?.[0]?.body?.metadata?.judge === "heuristic",
    "Trace metadata should include judge"
  );
  assert(
    overallCall.body.name === "promo-kit-overall" &&
      overallCall.body.dataType === "NUMERIC",
    "Overall score body mismatch"
  );
  assert(briefFitCall.body.name === "brief_fit", "Brief-fit score name mismatch");
  assert(groundingCall.body.name === "grounding", "Grounding score name mismatch");

  console.log(
    JSON.stringify(
      {
        ok: true,
        calls: calls.length,
        traceEndpoint: traceCall.url,
        scoreNames: result.scoreNames,
        scoreCount: result.scoreCount,
      },
      null,
      2
    )
  );
} finally {
  globalThis.fetch = originalFetch;
  process.env.LANGFUSE_PUBLIC_KEY = originalEnv.publicKey;
  process.env.LANGFUSE_SECRET_KEY = originalEnv.secretKey;
  process.env.LANGFUSE_HOST = originalEnv.host;
}
