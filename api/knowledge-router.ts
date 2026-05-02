import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { questions, wikis, wikiEdges } from "@db/schema";
import { eq, and, desc, like, or } from "drizzle-orm";
import { generateEmbedding, findSimilarWikis } from "./lib/embedding";
import { generateTags } from "./lib/tagging";

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
    .input(
      z
        .object({ search: z.string().optional(), category: z.string().optional(), tag: z.string().optional() })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();

      // Helper to filter by tag
      const filterByTag = <T extends { tags?: string | null }>(items: T[]): T[] => {
        if (!input?.tag) return items;
        return items.filter((w) => {
          if (!w.tags) return false;
          try {
            const parsed = JSON.parse(w.tags) as string[];
            return parsed.includes(input.tag!);
          } catch {
            return false;
          }
        });
      };

      // Vector search when search term is provided
      if (input?.search) {
        const queryEmb = await generateEmbedding(input.search);
        if (queryEmb) {
          const similar = await findSimilarWikis(ctx.user.id, queryEmb, undefined, 20);
          let results = similar.map((r) => r.wiki);
          if (input.category) {
            results = results.filter((w) => w.category === input.category);
          }
          results = filterByTag(results);
          return results;
        }
        // Fallback to LIKE search
      }

      // Default: no search or LIKE fallback
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

      // Tag filtering via LIKE on JSON string
      if (input?.tag) {
        conditions.push(like(wikis.tags, `%${input.tag}%`));
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
        .where(and(eq(wikis.id, input.id), eq(wikis.userId, ctx.user.id)))
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

      // Generate embedding and tags in parallel
      const embText = `${input.title}\n${input.summary || ""}\n${input.content.slice(0, 2000)}`;
      const [embedding, tags] = await Promise.all([
        generateEmbedding(embText),
        generateTags(input.title, input.content, input.summary),
      ]);

      const [result] = await db
        .insert(wikis)
        .values({
          userId: ctx.user.id,
          title: input.title,
          content: input.content,
          summary: input.summary,
          category: input.category,
          embedding: embedding ? JSON.stringify(embedding) : null,
          tags: tags ? JSON.stringify(tags) : null,
        })
        .returning();
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

      // Regenerate embedding and tags if title or content changed
      if (updates.title || updates.content) {
        const wiki = await db
          .select()
          .from(wikis)
          .where(and(eq(wikis.id, id), eq(wikis.userId, ctx.user.id)))
          .limit(1);
        if (wiki[0]) {
          const title = updates.title ?? wiki[0].title;
          const content = updates.content ?? wiki[0].content;
          const summary = updates.summary ?? wiki[0].summary ?? "";
          const embText = `${title}\n${summary}\n${content.slice(0, 2000)}`;
          const [embedding, tags] = await Promise.all([
            generateEmbedding(embText),
            generateTags(title, content, summary),
          ]);
          if (embedding) {
            (updates as any).embedding = JSON.stringify(embedding);
          }
          if (tags) {
            (updates as any).tags = JSON.stringify(tags);
          }
        }
      }

      await db
        .update(wikis)
        .set(updates)
        .where(and(eq(wikis.id, id), eq(wikis.userId, ctx.user.id)));
      return { success: true };
    }),

  deleteWiki: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Delete associated edges first
      await db
        .delete(wikiEdges)
        .where(
          and(
            eq(wikiEdges.userId, ctx.user.id),
            or(
              eq(wikiEdges.sourceWikiId, input.id),
              eq(wikiEdges.targetWikiId, input.id)
            )
          )
        );
      await db
        .delete(wikis)
        .where(and(eq(wikis.id, input.id), eq(wikis.userId, ctx.user.id)));
      return { success: true };
    }),

  updateWikiTags: publicQuery
    .input(z.object({ id: z.number(), tags: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .update(wikis)
        .set({ tags: JSON.stringify(input.tags) })
        .where(and(eq(wikis.id, input.id), eq(wikis.userId, ctx.user.id)));
      return { success: true };
    }),

  regenerateTags: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(wikis)
        .where(and(eq(wikis.id, input.id), eq(wikis.userId, ctx.user.id)))
        .limit(1);
      const wiki = result[0];
      if (!wiki) throw new Error("Wiki not found");

      const tags = await generateTags(wiki.title, wiki.content, wiki.summary);
      if (tags) {
        await db
          .update(wikis)
          .set({ tags: JSON.stringify(tags) })
          .where(eq(wikis.id, wiki.id));
      }
      return { tags: tags ?? [] };
    }),

  backfillEmbeddings: publicQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const allWikis = await db
      .select()
      .from(wikis)
      .where(eq(wikis.userId, ctx.user.id));

    const missing = allWikis.filter((w) => !w.embedding || !w.tags);
    if (missing.length === 0) return { updated: 0, total: allWikis.length };

    let updated = 0;
    for (const wiki of missing) {
      const embText = `${wiki.title}\n${wiki.summary || ""}\n${wiki.content.slice(0, 2000)}`;
      const [embedding, tags] = await Promise.all([
        wiki.embedding ? null : generateEmbedding(embText),
        wiki.tags ? null : generateTags(wiki.title, wiki.content, wiki.summary),
      ]);
      const updates: Record<string, string | null> = {};
      if (embedding) updates.embedding = JSON.stringify(embedding);
      if (tags) updates.tags = JSON.stringify(tags);
      if (Object.keys(updates).length > 0) {
        await db.update(wikis).set(updates).where(eq(wikis.id, wiki.id));
        updated++;
      }
    }

    return { updated, total: allWikis.length };
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

  getWikiTags: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    const allWikis = await db
      .select({ tags: wikis.tags })
      .from(wikis)
      .where(eq(wikis.userId, ctx.user.id));

    const tagSet = new Set<string>();
    for (const w of allWikis) {
      if (!w.tags) continue;
      try {
        const parsed = JSON.parse(w.tags) as string[];
        for (const t of parsed) tagSet.add(t);
      } catch {
        continue;
      }
    }
    return Array.from(tagSet).sort();
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

      // Try vector search for wikis
      const queryEmb = await generateEmbedding(input.query);
      let wikiResults: any[] = [];

      if (queryEmb) {
        const similar = await findSimilarWikis(ctx.user.id, queryEmb, undefined, 5);
        wikiResults = similar.map((r) => r.wiki);
      } else {
        // Fallback to LIKE
        const searchTerm = `%${input.query}%`;
        wikiResults = await db
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
      }

      // Questions still use LIKE
      const searchTerm = `%${input.query}%`;
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
