import { db, USER_ID } from '../db/connection';
import { wikis, wikiEdges } from '@db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { getActiveConfig } from './lib/config-reader';

async function callAI(messages: Array<{ role: string; content: string }>) {
  const config = await getActiveConfig();
  if (!config.aiBaseUrl || !config.aiApiKey) return null;

  try {
    const resp = await fetch(`${config.aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.aiApiKey}` },
      body: JSON.stringify({ model: config.aiModel, messages, temperature: 0.3 }),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? null;
  } catch { return null; }
}

export async function buildNetwork() {
  const allWikis = await db.select().from(wikis).where(eq(wikis.userId, USER_ID));
  if (allWikis.length < 2) return { nodeCount: allWikis.length, edgeCount: 0, edges: [] };

  const wikiList = allWikis.map((w, i) => `[${i + 1}] ID:${w.id} 标题:${w.title} 摘要:${w.summary || w.content.slice(0, 200)}`).join('\n');

  const aiResult = await callAI([
    {
      role: 'system',
      content: `你是一个知识网络分析专家。分析以下 Wiki 条目之间的语义关系，返回 JSON 数组。
每个关系的格式：{"sourceId": number, "targetId": number, "label": "相关|依赖|引用|对比|包含", "strength": 0.0-1.0}

规则：
- 只分析有明确语义关联的条目对
- strength 反映关联强度：0.3=弱关联, 0.7=中等, 0.9+强关联
- label 必须是上述五种之一
- 直接返回 JSON 数组，不要 markdown 代码块或其他文字`,
    },
    { role: 'user', content: wikiList },
  ]);

  if (!aiResult) return { nodeCount: allWikis.length, edgeCount: 0, edges: [] };

  let parsed: Array<{ sourceId: number; targetId: number; label: string; strength: number | string }> = [];
  try {
    const cleaned = aiResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    parsed = JSON.parse(match ? match[0] : cleaned);
  } catch { return { nodeCount: allWikis.length, edgeCount: 0, edges: [] }; }

  const validIds = new Set(allWikis.map(w => w.id));
  const validLabels = new Set(['相关', '依赖', '引用', '对比', '包含']);
  const validEdges = parsed.map(e => ({ ...e, strength: typeof e.strength === 'string' ? parseFloat(e.strength) : e.strength }))
    .filter(e => validIds.has(e.sourceId) && validIds.has(e.targetId) && e.sourceId !== e.targetId && validLabels.has(e.label) && typeof e.strength === 'number' && !isNaN(e.strength) && e.strength >= 0 && e.strength <= 1);

  await db.delete(wikiEdges).where(eq(wikiEdges.userId, USER_ID));
  if (validEdges.length > 0) {
    await db.insert(wikiEdges).values(validEdges.map(e => ({
      userId: USER_ID, sourceWikiId: e.sourceId, targetWikiId: e.targetId, label: e.label, strength: String(e.strength),
    })));
  }

  const edges = await db.select().from(wikiEdges).where(eq(wikiEdges.userId, USER_ID));
  return { nodeCount: allWikis.length, edgeCount: edges.length, edges };
}

export async function getNetwork() {
  const edges = await db.select().from(wikiEdges).where(eq(wikiEdges.userId, USER_ID));
  const allWikis = await db.select().from(wikis).where(eq(wikis.userId, USER_ID));
  return { nodes: allWikis, edges };
}

export async function createEdge(input: { sourceWikiId: number; targetWikiId: number; label: string; strength: number }) {
  const existing = await db.select().from(wikiEdges).where(
    and(eq(wikiEdges.userId, USER_ID), or(
      and(eq(wikiEdges.sourceWikiId, input.sourceWikiId), eq(wikiEdges.targetWikiId, input.targetWikiId)),
      and(eq(wikiEdges.sourceWikiId, input.targetWikiId), eq(wikiEdges.targetWikiId, input.sourceWikiId)),
    ))
  ).limit(1);
  if (existing.length > 0) throw new Error('关系已存在');

  const [result] = await db.insert(wikiEdges).values({
    userId: USER_ID, sourceWikiId: input.sourceWikiId, targetWikiId: input.targetWikiId,
    label: input.label, strength: String(input.strength),
  }).returning();
  return { id: result.id };
}

export async function updateEdge(input: { id: number; label?: string; strength?: number }) {
  const { id, ...updates } = input;
  const setObj: Record<string, any> = {};
  if (updates.label !== undefined) setObj.label = updates.label;
  if (updates.strength !== undefined) setObj.strength = String(updates.strength);
  if (Object.keys(setObj).length === 0) return { success: true };
  await db.update(wikiEdges).set({ ...setObj, updatedAt: new Date() }).where(and(eq(wikiEdges.id, id), eq(wikiEdges.userId, USER_ID)));
  return { success: true };
}

export async function deleteEdge(id: number) {
  await db.delete(wikiEdges).where(and(eq(wikiEdges.id, id), eq(wikiEdges.userId, USER_ID)));
  return { success: true };
}

export async function getWikiEdges(wikiId: number) {
  const edges = await db.select().from(wikiEdges).where(
    and(eq(wikiEdges.userId, USER_ID), or(eq(wikiEdges.sourceWikiId, wikiId), eq(wikiEdges.targetWikiId, wikiId)))
  ).orderBy(desc(wikiEdges.strength));

  const connectedIds = new Set<number>();
  for (const e of edges) {
    if (e.sourceWikiId !== wikiId) connectedIds.add(e.sourceWikiId);
    if (e.targetWikiId !== wikiId) connectedIds.add(e.targetWikiId);
  }

  let wikiMap = new Map<number, string>();
  if (connectedIds.size > 0) {
    const allWikis = await db.select({ id: wikis.id, title: wikis.title }).from(wikis).where(eq(wikis.userId, USER_ID));
    for (const w of allWikis) wikiMap.set(w.id, w.title);
  }

  return edges.map(e => ({
    ...e,
    connectedWikiId: e.sourceWikiId === wikiId ? e.targetWikiId : e.sourceWikiId,
    connectedWikiTitle: wikiMap.get(e.sourceWikiId === wikiId ? e.targetWikiId : e.sourceWikiId) ?? '未知',
  }));
}
