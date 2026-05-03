import { getActiveConfig, type ResolvedAIConfig } from './config-reader';
import { db } from '../../db/connection';
import { wikis } from '@db/schema';
import { eq } from 'drizzle-orm';

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const config = await getActiveConfig();
  if (!config.aiEmbeddingBaseUrl || !config.aiEmbeddingApiKey) return null;

  const inputText = text.slice(0, 8000).trim();
  if (!inputText) return null;

  if (config.embeddingApiFormat === 'openai') {
    return generateOpenAI(config, inputText);
  }
  return generateDashScope(config, inputText);
}

async function generateDashScope(config: ResolvedAIConfig, text: string): Promise<number[] | null> {
  try {
    const resp = await fetch(`${config.aiEmbeddingBaseUrl}/services/embeddings/text-embedding/text-embedding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.aiEmbeddingApiKey}` },
      body: JSON.stringify({ model: config.aiEmbeddingModel, input: { texts: [text] } }),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { output: { embeddings: Array<{ embedding: number[] }> } };
    return data.output?.embeddings?.[0]?.embedding ?? null;
  } catch { return null; }
}

async function generateOpenAI(config: ResolvedAIConfig, text: string): Promise<number[] | null> {
  try {
    const resp = await fetch(`${config.aiEmbeddingBaseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.aiEmbeddingApiKey}` },
      body: JSON.stringify({ model: config.aiEmbeddingModel, input: text }),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { data: Array<{ embedding: number[] }> };
    return data.data?.[0]?.embedding ?? null;
  } catch { return null; }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i]; }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function findSimilarWikis(userId: number, queryEmbedding: number[], threshold?: number, limit = 10) {
  if (threshold === undefined) {
    const config = await getActiveConfig();
    threshold = config.embeddingThreshold;
  }
  const allWikis = await db.select().from(wikis).where(eq(wikis.userId, userId));
  const results: Array<{ wiki: typeof allWikis[0]; score: number }> = [];
  for (const wiki of allWikis) {
    if (!wiki.embedding) continue;
    try {
      const emb = JSON.parse(wiki.embedding) as number[];
      const score = cosineSimilarity(queryEmbedding, emb);
      if (score >= threshold) results.push({ wiki, score });
    } catch { continue; }
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
