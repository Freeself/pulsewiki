import { getActiveConfig, type ResolvedAIConfig } from "./config-reader";
import { getDb } from "../queries/connection";
import { wikis } from "@db/schema";
import { eq } from "drizzle-orm";

export async function generateEmbedding(
  text: string
): Promise<number[] | null> {
  const config = await getActiveConfig();
  const baseUrl = config.aiEmbeddingBaseUrl;
  if (!baseUrl) return null;

  const inputText = text.slice(0, 8000).trim();
  if (!inputText) return null;

  if (config.embeddingApiFormat === "openai") {
    return generateEmbeddingOpenAI(config, inputText);
  }
  return generateEmbeddingDashScope(config, inputText);
}

async function generateEmbeddingDashScope(
  config: ResolvedAIConfig,
  text: string
): Promise<number[] | null> {
  const url = `${config.aiEmbeddingBaseUrl}/services/embeddings/text-embedding/text-embedding`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.aiEmbeddingApiKey}`,
      },
      body: JSON.stringify({
        model: config.aiEmbeddingModel,
        input: { texts: [text] },
      }),
    });

    if (!resp.ok) {
      console.warn(`[Embedding] API failed (${resp.status}): ${await resp.text()}`);
      return null;
    }

    const data = (await resp.json()) as {
      output: { embeddings: Array<{ embedding: number[]; text_index: number }> };
    };
    const emb = data.output?.embeddings?.[0]?.embedding ?? null;
    console.log(`[Embedding] Generated (${emb?.length ?? 0} dims)`);
    return emb;
  } catch (error) {
    console.error("[Embedding] API error:", error);
    return null;
  }
}

async function generateEmbeddingOpenAI(
  config: ResolvedAIConfig,
  text: string
): Promise<number[] | null> {
  const url = `${config.aiEmbeddingBaseUrl}/embeddings`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.aiEmbeddingApiKey}`,
      },
      body: JSON.stringify({
        model: config.aiEmbeddingModel,
        input: text,
      }),
    });

    if (!resp.ok) {
      console.warn(`[Embedding] OpenAI API failed (${resp.status}): ${await resp.text()}`);
      return null;
    }

    const data = (await resp.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    const emb = data.data?.[0]?.embedding ?? null;
    console.log(`[Embedding] Generated (${emb?.length ?? 0} dims)`);
    return emb;
  } catch (error) {
    console.error("[Embedding] OpenAI API error:", error);
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function findSimilarWikis(
  userId: number,
  queryEmbedding: number[],
  threshold?: number,
  limit = 10
) {
  if (threshold === undefined) {
    const config = await getActiveConfig();
    threshold = config.embeddingThreshold;
  }

  const db = getDb();
  const allWikis = await db
    .select()
    .from(wikis)
    .where(eq(wikis.userId, userId));

  const results: Array<{ wiki: (typeof allWikis)[0]; score: number }> = [];

  for (const wiki of allWikis) {
    if (!wiki.embedding) continue;
    try {
      const emb = JSON.parse(wiki.embedding) as number[];
      const score = cosineSimilarity(queryEmbedding, emb);
      if (score >= threshold) {
        results.push({ wiki, score });
      }
    } catch {
      continue;
    }
  }

  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, limit);
  console.log(`[Embedding] Search: ${top.length}/${allWikis.length} results above ${threshold}`, top.map(r => `${r.wiki.title}: ${r.score.toFixed(3)}`).join(', '));
  return top;
}
