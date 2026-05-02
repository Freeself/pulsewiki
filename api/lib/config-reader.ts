import { env } from "./env";
import { getDb } from "../queries/connection";
import { aiConfigs } from "@db/schema";
import { eq } from "drizzle-orm";

export type EmbeddingApiFormat = "openai" | "dashscope";

export interface ResolvedAIConfig {
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiEmbeddingBaseUrl: string;
  aiEmbeddingApiKey: string;
  aiEmbeddingModel: string;
  embeddingApiFormat: EmbeddingApiFormat;
  embeddingThreshold: number;
}

let cachedConfig: ResolvedAIConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

function envDefaults(): ResolvedAIConfig {
  return {
    aiBaseUrl: env.aiBaseUrl,
    aiApiKey: env.aiApiKey,
    aiModel: env.aiModel,
    aiEmbeddingBaseUrl: env.aiEmbeddingBaseUrl,
    aiEmbeddingApiKey: env.aiEmbeddingApiKey,
    aiEmbeddingModel: env.aiEmbeddingModel,
    embeddingApiFormat: "dashscope",
    embeddingThreshold: env.embeddingThreshold,
  };
}

export function invalidateConfigCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
}

export async function getActiveConfig(): Promise<ResolvedAIConfig> {
  if (cachedConfig && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(aiConfigs)
      .where(eq(aiConfigs.isActive, true))
      .limit(1);

    const row = rows[0];
    if (!row) {
      const fallback = envDefaults();
      cachedConfig = fallback;
      cacheTimestamp = Date.now();
      return fallback;
    }

    const resolved: ResolvedAIConfig = {
      aiBaseUrl: row.aiBaseUrl || env.aiBaseUrl,
      aiApiKey: row.aiApiKey || env.aiApiKey,
      aiModel: row.aiModel || env.aiModel,
      aiEmbeddingBaseUrl: row.aiEmbeddingBaseUrl || env.aiEmbeddingBaseUrl,
      aiEmbeddingApiKey: row.aiEmbeddingApiKey || env.aiEmbeddingApiKey,
      aiEmbeddingModel: row.aiEmbeddingModel || env.aiEmbeddingModel,
      embeddingApiFormat: row.embeddingApiFormat as EmbeddingApiFormat,
      embeddingThreshold: row.embeddingThreshold
        ? parseFloat(row.embeddingThreshold)
        : env.embeddingThreshold,
    };

    cachedConfig = resolved;
    cacheTimestamp = Date.now();
    return resolved;
  } catch {
    const fallback = envDefaults();
    cachedConfig = fallback;
    cacheTimestamp = Date.now();
    return fallback;
  }
}
