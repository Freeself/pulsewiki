import { db } from '../../db/connection';
import { aiConfigs } from '@db/schema';
import { eq } from 'drizzle-orm';

export type EmbeddingApiFormat = 'openai' | 'dashscope';

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

const envDefaults: ResolvedAIConfig = {
  aiBaseUrl: '',
  aiApiKey: '',
  aiModel: 'gpt-4o',
  aiEmbeddingBaseUrl: '',
  aiEmbeddingApiKey: '',
  aiEmbeddingModel: 'text-embedding-3-small',
  embeddingApiFormat: 'dashscope',
  embeddingThreshold: 0.5,
};

let cachedConfig: ResolvedAIConfig | null = null;
let cacheTimestamp = 0;

export function invalidateConfigCache() {
  cachedConfig = null;
  cacheTimestamp = 0;
}

export async function getActiveConfig(): Promise<ResolvedAIConfig> {
  if (cachedConfig && Date.now() - cacheTimestamp < 30000) return cachedConfig;

  try {
    const rows = await db.select().from(aiConfigs).where(eq(aiConfigs.isActive, true)).limit(1);
    const row = rows[0];
    if (!row) { cachedConfig = envDefaults; cacheTimestamp = Date.now(); return envDefaults; }

    const resolved: ResolvedAIConfig = {
      aiBaseUrl: row.aiBaseUrl || envDefaults.aiBaseUrl,
      aiApiKey: row.aiApiKey || envDefaults.aiApiKey,
      aiModel: row.aiModel || envDefaults.aiModel,
      aiEmbeddingBaseUrl: row.aiEmbeddingBaseUrl || row.aiBaseUrl || envDefaults.aiEmbeddingBaseUrl,
      aiEmbeddingApiKey: row.aiEmbeddingApiKey || row.aiApiKey || envDefaults.aiEmbeddingApiKey,
      aiEmbeddingModel: row.aiEmbeddingModel || envDefaults.aiEmbeddingModel,
      embeddingApiFormat: row.embeddingApiFormat as EmbeddingApiFormat,
      embeddingThreshold: row.embeddingThreshold ? parseFloat(row.embeddingThreshold) : envDefaults.embeddingThreshold,
    };
    cachedConfig = resolved;
    cacheTimestamp = Date.now();
    return resolved;
  } catch {
    cachedConfig = envDefaults;
    cacheTimestamp = Date.now();
    return envDefaults;
  }
}
