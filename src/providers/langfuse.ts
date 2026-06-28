import { randomUUID } from "node:crypto";
import type { PromoKitEvaluation } from "../evaluation";
import type { PromoKit } from "../types";

export type LangfuseResult = {
  enabled: boolean;
  sent: boolean;
  traceId?: string;
  host?: string;
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
  const host = process.env.LANGFUSE_HOST || "https://cloud.langfuse.com";

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

export async function sendEvaluationToLangfuse(input: {
  promoKit: PromoKit;
  evaluation: PromoKitEvaluation;
  topic: string;
  audience: string;
  location: string;
}): Promise<LangfuseResult> {
  const config = langfuseConfig();

  if (!config) {
    return { enabled: false, sent: false };
  }

  const traceId = randomUUID();
  const auth = authHeader(config);
  const host = config.host.replace(/\/$/, "");

  try {
    await postJson({
      url: `${host}/api/public/ingestion`,
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
      url: `${host}/api/public/scores`,
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
        url: `${host}/api/public/scores`,
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

    return { enabled: true, sent: true, traceId, host };
  } catch (error) {
    return {
      enabled: true,
      sent: false,
      traceId,
      host,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
