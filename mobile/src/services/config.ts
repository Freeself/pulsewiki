import { db, USER_ID } from '../db/connection';
import { aiConfigs } from '@db/schema';
import { eq } from 'drizzle-orm';
import { invalidateConfigCache } from './lib/config-reader';

export async function listConfigs() {
  return db.select().from(aiConfigs).where(eq(aiConfigs.userId, USER_ID)).orderBy(aiConfigs.createdAt);
}

export async function createConfig(input: {
  name: string;
  aiBaseUrl?: string; aiApiKey?: string; aiModel?: string;
  aiEmbeddingBaseUrl?: string; aiEmbeddingApiKey?: string; aiEmbeddingModel?: string;
  embeddingApiFormat?: 'openai' | 'dashscope'; embeddingThreshold?: string;
}) {
  const [result] = await db.insert(aiConfigs).values({ userId: USER_ID, ...input }).returning();
  invalidateConfigCache();
  return { id: result.id };
}

export async function updateConfig(input: {
  id: number;
  name?: string;
  aiBaseUrl?: string | null; aiApiKey?: string | null; aiModel?: string | null;
  aiEmbeddingBaseUrl?: string | null; aiEmbeddingApiKey?: string | null; aiEmbeddingModel?: string | null;
  embeddingApiFormat?: 'openai' | 'dashscope'; embeddingThreshold?: string;
}) {
  const { id, ...updates } = input;
  await db.update(aiConfigs).set({ ...updates, updatedAt: new Date() }).where(eq(aiConfigs.id, id));
  invalidateConfigCache();
  return { success: true };
}

export async function deleteConfig(id: number) {
  await db.delete(aiConfigs).where(eq(aiConfigs.id, id));
  invalidateConfigCache();
  return { success: true };
}

export async function activateConfig(id: number) {
  await db.update(aiConfigs).set({ isActive: false, updatedAt: new Date() }).where(eq(aiConfigs.userId, USER_ID));
  await db.update(aiConfigs).set({ isActive: true, updatedAt: new Date() }).where(eq(aiConfigs.id, id));
  invalidateConfigCache();
  return { success: true };
}

export async function deactivateAllConfigs() {
  await db.update(aiConfigs).set({ isActive: false, updatedAt: new Date() }).where(eq(aiConfigs.userId, USER_ID));
  invalidateConfigCache();
  return { success: true };
}
