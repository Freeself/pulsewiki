import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { questions, wikis } from "@db/schema";
import { eq, and, desc, like, or } from "drizzle-orm";

export const knowledgeRouter = createRouter({
  // ===== Questions =====
  listQuestions: publicQuery
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(questions.userId, ctx.user.id)];
      
      if (input?.search) {
        conditions.push(
          or(
            like(questions.question, `%${input.search}%`),
            like(questions.answer, `%${input.search}%`)
          )!
        );
      }

      return db
        .select()
        .from(questions)
        .where(and(...conditions))
        .orderBy(desc(questions.createdAt));
    }),

  getQuestion: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.id, input.id),
            eq(questions.userId, ctx.user.id)
          )
        )
        .limit(1);
      return result[0] ?? null;
    }),

  deleteQuestion: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(questions)
        .where(
          and(
            eq(questions.id, input.id),
            eq(questions.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  // ===== Wikis =====
  listWikis: publicQuery
    .input(z.object({ search: z.string().optional(), category: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(wikis.userId, ctx.user.id)];

      if (input?.search) {
        conditions.push(
          or(
            like(wikis.title, `%${input.search}%`),
            like(wikis.content, `%${input.search}%`),
            like(wikis.summary, `%${input.search}%`)
          )!
        );
      }

      if (input?.category) {
        conditions.push(eq(wikis.category, input.category));
      }

      return db
        .select()
        .from(wikis)
        .where(and(...conditions))
        .orderBy(desc(wikis.updatedAt));
    }),

  getWiki: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(wikis)
        .where(
          and(
            eq(wikis.id, input.id),
            eq(wikis.userId, ctx.user.id)
          )
        )
        .limit(1);
      return result[0] ?? null;
    }),

  createWiki: publicQuery
    .input(
      z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        summary: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [result] = await db.insert(wikis).values({
        userId: ctx.user.id,
        title: input.title,
        content: input.content,
        summary: input.summary,
        category: input.category,
      }).returning();
      return { id: result.id };
    }),

  updateWiki: publicQuery
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().min(1).optional(),
        summary: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      await db
        .update(wikis)
        .set(updates)
        .where(
          and(
            eq(wikis.id, id),
            eq(wikis.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  deleteWiki: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(wikis)
        .where(
          and(
            eq(wikis.id, input.id),
            eq(wikis.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  getWikiCategories: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db
      .select({ category: wikis.category })
      .from(wikis)
      .where(eq(wikis.userId, ctx.user.id))
      .groupBy(wikis.category);
    return result.map((r) => r.category).filter(Boolean) as string[];
  }),

  // ===== Stats =====
  getStats: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    
    const qCount = await db
      .select()
      .from(questions)
      .where(eq(questions.userId, ctx.user.id));
    
    const wCount = await db
      .select()
      .from(wikis)
      .where(eq(wikis.userId, ctx.user.id));
    
    return {
      questions: qCount.length,
      wikis: wCount.length,
    };
  }),

  // ===== Search All =====
  searchAll: publicQuery
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const searchTerm = `%${input.query}%`;

      const wikiResults = await db
        .select()
        .from(wikis)
        .where(
          and(
            eq(wikis.userId, ctx.user.id),
            or(
              like(wikis.title, searchTerm),
              like(wikis.content, searchTerm)
            )
          )
        )
        .limit(5);

      const questionResults = await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.userId, ctx.user.id),
            or(
              like(questions.question, searchTerm),
              like(questions.answer, searchTerm)
            )
          )
        )
        .limit(5);

      return {
        wikis: wikiResults,
        questions: questionResults,
      };
    }),
});
