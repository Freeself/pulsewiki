import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { aiConfigs } from "@db/schema";
import { eq } from "drizzle-orm";
import { invalidateConfigCache } from "./lib/config-reader";

export const configRouter = createRouter({
  list: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(aiConfigs)
      .where(eq(aiConfigs.userId, ctx.user.id))
      .orderBy(aiConfigs.createdAt);
  }),

  create: publicQuery
    .input(z.object({
      name: z.string().min(1).max(100),
      aiBaseUrl: z.string().optional(),
      aiApiKey: z.string().optional(),
      aiModel: z.string().optional(),
      aiEmbeddingBaseUrl: z.string().optional(),
      aiEmbeddingApiKey: z.string().optional(),
      aiEmbeddingModel: z.string().optional(),
      embeddingApiFormat: z.enum(["openai", "dashscope"]).default("dashscope"),
      embeddingThreshold: z.string().default("0.5"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [result] = await db
        .insert(aiConfigs)
        .values({ userId: ctx.user.id, ...input })
        .returning();
      invalidateConfigCache();
      return { id: result.id };
    }),

  update: publicQuery
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      aiBaseUrl: z.string().nullable().optional(),
      aiApiKey: z.string().nullable().optional(),
      aiModel: z.string().nullable().optional(),
      aiEmbeddingBaseUrl: z.string().nullable().optional(),
      aiEmbeddingApiKey: z.string().nullable().optional(),
      aiEmbeddingModel: z.string().nullable().optional(),
      embeddingApiFormat: z.enum(["openai", "dashscope"]).optional(),
      embeddingThreshold: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      await db
        .update(aiConfigs)
        .set(updates)
        .where(eq(aiConfigs.id, id));
      invalidateConfigCache();
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(aiConfigs)
        .where(eq(aiConfigs.id, input.id));
      invalidateConfigCache();
      return { success: true };
    }),

  activate: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .update(aiConfigs)
        .set({ isActive: false })
        .where(eq(aiConfigs.userId, ctx.user.id));
      await db
        .update(aiConfigs)
        .set({ isActive: true })
        .where(eq(aiConfigs.id, input.id));
      invalidateConfigCache();
      return { success: true };
    }),

  deactivateAll: publicQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db
      .update(aiConfigs)
      .set({ isActive: false })
      .where(eq(aiConfigs.userId, ctx.user.id));
    invalidateConfigCache();
    return { success: true };
  }),
});
