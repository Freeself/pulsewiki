import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { wikis, wikiEdges } from "@db/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { getActiveConfig } from "./lib/config-reader";

async function callAI(messages: Array<{ role: string; content: string }>) {
  const config = await getActiveConfig();
  const url = `${config.aiBaseUrl}/chat/completions`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.aiApiKey}`,
      },
      body: JSON.stringify({
        model: config.aiModel,
        messages,
        temperature: 0.3,
      }),
    });

    if (!resp.ok) return null;

    const data = (await resp.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export const networkRouter = createRouter({
  buildNetwork: publicQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    const allWikis = await db
      .select()
      .from(wikis)
      .where(eq(wikis.userId, userId));

    if (allWikis.length < 2) {
      return { nodeCount: allWikis.length, edgeCount: 0, edges: [] };
    }

    const wikiList = allWikis
      .map(
        (w, i) =>
          `[${i + 1}] ID:${w.id} 标题:${w.title} 摘要:${w.summary || w.content.slice(0, 200)}`
      )
      .join("\n");

    const aiResult = await callAI([
      {
        role: "system",
        content: `你是一个知识网络分析专家。分析以下 Wiki 条目之间的语义关系，返回 JSON 数组。
每个关系的格式：{"sourceId": number, "targetId": number, "label": "相关|依赖|引用|对比|包含", "strength": 0.0-1.0}

规则：
- 只分析有明确语义关联的条目对
- strength 反映关联强度：0.3=弱关联, 0.7=中等, 0.9+强关联
- label 必须是上述五种之一
- 直接返回 JSON 数组，不要 markdown 代码块或其他文字`,
      },
      {
        role: "user",
        content: wikiList,
      },
    ]);

    if (!aiResult) {
      return { nodeCount: allWikis.length, edgeCount: 0, edges: [] };
    }

    // Parse AI response
    let parsed: Array<{
      sourceId: number;
      targetId: number;
      label: string;
      strength: number;
    }> = [];
    try {
      const cleaned = aiResult
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      // Extract JSON array if wrapped in extra text
      const match = cleaned.match(/\[[\s\S]*\]/);
      const jsonStr = match ? match[0] : cleaned;
      parsed = JSON.parse(jsonStr);
    } catch {
      console.warn("[Network] Failed to parse AI response:", aiResult);
      return { nodeCount: allWikis.length, edgeCount: 0, edges: [] };
    }

    const validIds = new Set(allWikis.map((w) => w.id));
    const validLabels = new Set(["相关", "依赖", "引用", "对比", "包含"]);
    const validEdges = parsed
      .map((e) => ({
        ...e,
        strength: typeof e.strength === "string" ? parseFloat(e.strength) : e.strength,
      }))
      .filter(
        (e) =>
          validIds.has(e.sourceId) &&
          validIds.has(e.targetId) &&
          e.sourceId !== e.targetId &&
          validLabels.has(e.label) &&
          typeof e.strength === "number" &&
          !isNaN(e.strength) &&
          e.strength >= 0 &&
          e.strength <= 1
      );

    // Delete old edges and insert new ones
    await db.delete(wikiEdges).where(eq(wikiEdges.userId, userId));

    if (validEdges.length > 0) {
      await db.insert(wikiEdges).values(
        validEdges.map((e) => ({
          userId,
          sourceWikiId: e.sourceId,
          targetWikiId: e.targetId,
          label: e.label,
          strength: String(e.strength),
        }))
      );
    }

    const edges = await db
      .select()
      .from(wikiEdges)
      .where(eq(wikiEdges.userId, userId));

    return {
      nodeCount: allWikis.length,
      edgeCount: edges.length,
      edges,
    };
  }),

  getNetwork: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    const edges = await db
      .select()
      .from(wikiEdges)
      .where(eq(wikiEdges.userId, userId));

    const allWikis = await db
      .select()
      .from(wikis)
      .where(eq(wikis.userId, userId));

    return { nodes: allWikis, edges };
  }),

  getRelatedWikis: publicQuery
    .input(z.object({ wikiId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      const edges = await db
        .select()
        .from(wikiEdges)
        .where(
          and(
            eq(wikiEdges.userId, userId),
            or(
              eq(wikiEdges.sourceWikiId, input.wikiId),
              eq(wikiEdges.targetWikiId, input.wikiId)
            )
          )
        )
        .orderBy(desc(wikiEdges.strength));

      const relatedIds = new Set<number>();
      for (const e of edges) {
        if (e.sourceWikiId !== input.wikiId) relatedIds.add(e.sourceWikiId);
        if (e.targetWikiId !== input.wikiId) relatedIds.add(e.targetWikiId);
      }

      if (relatedIds.size === 0) return [];

      const related = await db
        .select()
        .from(wikis)
        .where(
          and(
            eq(wikis.userId, userId),
            sql`${wikis.id} IN (${Array.from(relatedIds).join(",")})`
          )
        );

      // Attach edge info
      const edgeMap = new Map<number, { label: string; strength: number }>();
      for (const e of edges) {
        const otherId =
          e.sourceWikiId === input.wikiId ? e.targetWikiId : e.sourceWikiId;
        edgeMap.set(otherId, {
          label: e.label,
          strength: Number(e.strength),
        });
      }

      return related.map((w) => ({
        ...w,
        relation: edgeMap.get(w.id) ?? { label: "相关", strength: 0.5 },
      }));
    }),

  // ===== Edge CRUD =====
  createEdge: publicQuery
    .input(
      z.object({
        sourceWikiId: z.number(),
        targetWikiId: z.number(),
        label: z.string().min(1).max(20),
        strength: z.number().min(0).max(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Prevent duplicate edges
      const existing = await db
        .select()
        .from(wikiEdges)
        .where(
          and(
            eq(wikiEdges.userId, ctx.user.id),
            or(
              and(
                eq(wikiEdges.sourceWikiId, input.sourceWikiId),
                eq(wikiEdges.targetWikiId, input.targetWikiId)
              ),
              and(
                eq(wikiEdges.sourceWikiId, input.targetWikiId),
                eq(wikiEdges.targetWikiId, input.sourceWikiId)
              )
            )
          )
        )
        .limit(1);
      if (existing.length > 0) throw new Error("关系已存在");

      const [result] = await db
        .insert(wikiEdges)
        .values({
          userId: ctx.user.id,
          sourceWikiId: input.sourceWikiId,
          targetWikiId: input.targetWikiId,
          label: input.label,
          strength: String(input.strength),
        })
        .returning();
      return { id: result.id };
    }),

  updateEdge: publicQuery
    .input(
      z.object({
        id: z.number(),
        label: z.string().min(1).max(20).optional(),
        strength: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      const setObj: Record<string, any> = {};
      if (updates.label !== undefined) setObj.label = updates.label;
      if (updates.strength !== undefined) setObj.strength = String(updates.strength);
      if (Object.keys(setObj).length === 0) return { success: true };

      await db
        .update(wikiEdges)
        .set(setObj)
        .where(and(eq(wikiEdges.id, id), eq(wikiEdges.userId, ctx.user.id)));
      return { success: true };
    }),

  deleteEdge: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(wikiEdges)
        .where(
          and(eq(wikiEdges.id, input.id), eq(wikiEdges.userId, ctx.user.id))
        );
      return { success: true };
    }),

  // Get edges for a specific wiki
  getWikiEdges: publicQuery
    .input(z.object({ wikiId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const edges = await db
        .select()
        .from(wikiEdges)
        .where(
          and(
            eq(wikiEdges.userId, ctx.user.id),
            or(
              eq(wikiEdges.sourceWikiId, input.wikiId),
              eq(wikiEdges.targetWikiId, input.wikiId)
            )
          )
        );

      // Get connected wiki titles
      const connectedIds = new Set<number>();
      for (const e of edges) {
        if (e.sourceWikiId !== input.wikiId) connectedIds.add(e.sourceWikiId);
        if (e.targetWikiId !== input.wikiId) connectedIds.add(e.targetWikiId);
      }

      let wikiMap = new Map<number, string>();
      if (connectedIds.size > 0) {
        const allWikis = await db
          .select({ id: wikis.id, title: wikis.title })
          .from(wikis)
          .where(eq(wikis.userId, ctx.user.id));
        for (const w of allWikis) wikiMap.set(w.id, w.title);
      }

      return edges.map((e) => ({
        ...e,
        connectedWikiId:
          e.sourceWikiId === input.wikiId ? e.targetWikiId : e.sourceWikiId,
        connectedWikiTitle:
          wikiMap.get(
            e.sourceWikiId === input.wikiId ? e.targetWikiId : e.sourceWikiId
          ) ?? "未知",
      }));
    }),
});
