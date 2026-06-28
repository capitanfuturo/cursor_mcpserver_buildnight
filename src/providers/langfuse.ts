import { randomUUID } from "node:crypto";
import type { PromoKitEvaluation } from "../evaluation";
import type { PromoKit } from "../types";

export type LangfuseResult = {
  enabled: boolean;
  sent: boolean;
  dryRun: boolean;
  traceId?: string;
  host?: string;
  traceName?: string;
  scoreNames?: string[];
  scoreCount?: number;
  note?: string;
  error?: string;
};

function langfuseConfig():
  | {
      publicKey: string;
      secretKey: string;
      host: string;
    }
  | undefined {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const host =
    process.env.LANGFUSE_BASE_URL ||
    process.env.LANGFUSE_HOST ||
    "https://cloud.langfuse.com";

  if (!publicKey || !secretKey) {
    return undefined;
  }

  return { publicKey, secretKey, host };
}

function authHeader(config: { publicKey: string; secretKey: string }): string {
  return `Basic ${Buffer.from(`${config.publicKey}:${config.secretKey}`).toString(
    "base64"
  )}`;
}

async function postJson(input: {
  url: string;
  auth: string;
  body: unknown;
}): Promise<void> {
  const response = await fetch(input.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: input.auth,
    },
    body: JSON.stringify(input.body),
  });

  if (!response.ok) {
    throw new Error(`${response.status}: ${await response.text()}`);
  }
}

function scoreNames(evaluation: PromoKitEvaluation): string[] {
  return [
    "promo-kit-overall",
    ...evaluation.scores.map((score) => score.name),
  ];
}

function baseResult(input: {
  evaluation: PromoKitEvaluation;
  traceId: string;
  host: string;
  dryRun: boolean;
}): Pick<
  LangfuseResult,
  "dryRun" | "traceId" | "host" | "traceName" | "scoreNames" | "scoreCount"
> {
  const names = scoreNames(input.evaluation);

  return {
    dryRun: input.dryRun,
    traceId: input.traceId,
    host: input.host,
    traceName: "promo-kit-workshop",
    scoreNames: names,
    scoreCount: names.length,
  };
}

export async function sendEvaluationToLangfuse(input: {
  promoKit: PromoKit;
  evaluation: PromoKitEvaluation;
  topic: string;
  audience: string;
  location: string;
}): Promise<LangfuseResult> {
  const traceId = randomUUID();
  const fallbackHost =
    process.env.LANGFUSE_BASE_URL ||
    process.env.LANGFUSE_HOST ||
    "https://cloud.langfuse.com";
  const host = fallbackHost.replace(/\/$/, "");
  const dryRun = baseResult({
    evaluation: input.evaluation,
    traceId,
    host,
    dryRun: true,
  });
  const config = langfuseConfig();

  if (!config) {
    return {
      enabled: false,
      sent: false,
      ...dryRun,
      note:
        "Langfuse keys are not configured. This is a dry-run preview of the trace and score names that would be sent.",
    };
  }

  const auth = authHeader(config);
  const liveRun = baseResult({
    evaluation: input.evaluation,
    traceId,
    host: config.host.replace(/\/$/, ""),
    dryRun: false,
  });

  try {
    await postJson({
      url: `${liveRun.host}/api/public/ingestion`,
      auth,
      body: {
        batch: [
          {
            id: randomUUID(),
            type: "trace-create",
            timestamp: new Date().toISOString(),
            body: {
              id: traceId,
              name: "promo-kit-workshop",
              input: {
                topic: input.topic,
                audience: input.audience,
                location: input.location,
              },
              output: input.promoKit,
              metadata: {
                workshop: "cursor-build-night",
                judge: input.evaluation.judge,
                visualProvider: input.promoKit.poster.provider,
                voiceStatus: input.promoKit.voiceover.status,
              },
            },
          },
        ],
      },
    });

    await postJson({
      url: `${liveRun.host}/api/public/scores`,
      auth,
      body: {
        traceId,
        name: "promo-kit-overall",
        value: input.evaluation.overallScore,
        comment: `${input.evaluation.verdict} via ${input.evaluation.judge} judge`,
        dataType: "NUMERIC",
      },
    });

    for (const score of input.evaluation.scores) {
      await postJson({
        url: `${liveRun.host}/api/public/scores`,
        auth,
        body: {
          traceId,
          name: score.name,
          value: score.value,
          comment: score.comment,
          dataType: "NUMERIC",
        },
      });
    }

    return {
      enabled: true,
      sent: true,
      ...liveRun,
      note: "Langfuse trace and numeric scores were sent.",
    };
  } catch (error) {
    return {
      enabled: true,
      sent: false,
      ...liveRun,
      error: error instanceof Error ? error.message : String(error),
      note:
        "Langfuse keys were configured, but sending failed. The score names still show what the benchmark attempted to report.",
    };
  }
}
