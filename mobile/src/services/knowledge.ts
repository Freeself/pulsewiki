import { db, USER_ID } from '../db/connection';
import { questions, wikis, wikiEdges } from '@db/schema';
import { eq, and, desc, like, or } from 'drizzle-orm';
import { generateEmbedding, findSimilarWikis } from './lib/embedding';
import { generateTags } from './lib/tagging';
import type { Wiki, Question } from '@db/schema';

// ===== Questions =====

export async function listQuestions(search?: string) {
  const conditions = [eq(questions.userId, USER_ID)];
  if (search) {
    conditions.push(or(like(questions.question, `%${search}%`), like(questions.answer, `%${search}%`))!);
  }
  return db.select().from(questions).where(and(...conditions)).orderBy(desc(questions.createdAt));
}

export async function deleteQuestion(id: number) {
  await db.delete(questions).where(and(eq(questions.id, id), eq(questions.userId, USER_ID)));
  return { success: true };
}

// ===== Wikis =====

export async function listWikis(options?: { search?: string; category?: string; tag?: string }) {
  const input = options ?? {};

  // Vector search when search term is provided
  if (input.search) {
    const queryEmb = await generateEmbedding(input.search);
    if (queryEmb) {
      const similar = await findSimilarWikis(USER_ID, queryEmb, undefined, 20);
      let results = similar.map(r => r.wiki);
      if (input.category) results = results.filter(w => w.category === input.category);
      if (input.tag) results = filterByTag(results, input.tag);
      return results;
    }
  }

  // Default or LIKE fallback
  const conditions = [eq(wikis.userId, USER_ID)];
  if (input.search) {
    conditions.push(or(like(wikis.title, `%${input.search}%`), like(wikis.content, `%${input.search}%`), like(wikis.summary, `%${input.search}%`))!);
  }
  if (input.category) conditions.push(eq(wikis.category, input.category));
  if (input.tag) conditions.push(like(wikis.tags, `%${input.tag}%`));

  return db.select().from(wikis).where(and(...conditions)).orderBy(desc(wikis.updatedAt));
}

export async function getWiki(id: number) {
  const result = await db.select().from(wikis).where(and(eq(wikis.id, id), eq(wikis.userId, USER_ID))).limit(1);
  return result[0] ?? null;
}

export async function createWiki(input: { title: string; content: string; summary?: string; category?: string }) {
  const embText = `${input.title}\n${input.summary || ''}\n${input.content.slice(0, 2000)}`;
  const [embedding, tags] = await Promise.all([
    generateEmbedding(embText),
    generateTags(input.title, input.content, input.summary),
  ]);

  const [result] = await db.insert(wikis).values({
    userId: USER_ID,
    title: input.title,
    content: input.content,
    summary: input.summary,
    category: input.category,
    embedding: embedding ? JSON.stringify(embedding) : null,
    tags: tags ? JSON.stringify(tags) : null,
  }).returning();
  return { id: result.id };
}

export async function updateWiki(input: { id: number; title?: string; content?: string; summary?: string; category?: string }) {
  const { id, ...updates } = input;

  if (updates.title || updates.content) {
    const wiki = await getWiki(id);
    if (wiki) {
      const title = updates.title ?? wiki.title;
      const content = updates.content ?? wiki.content;
      const summary = updates.summary ?? wiki.summary ?? '';
      const embText = `${title}\n${summary}\n${content.slice(0, 2000)}`;
      const [embedding, tags] = await Promise.all([
        generateEmbedding(embText),
        generateTags(title, content, summary),
      ]);
      if (embedding) (updates as any).embedding = JSON.stringify(embedding);
      if (tags) (updates as any).tags = JSON.stringify(tags);
    }
  }

  await db.update(wikis).set({ ...updates, updatedAt: new Date() }).where(and(eq(wikis.id, id), eq(wikis.userId, USER_ID)));
  return { success: true };
}

export async function regenerateEmbedding(id: number) {
  const wiki = await getWiki(id);
  if (!wiki) throw new Error('Wiki not found');

  const embText = `${wiki.title}\n${wiki.summary || ''}\n${wiki.content.slice(0, 2000)}`;
  const embedding = await generateEmbedding(embText);
  if (embedding) {
    await db.update(wikis).set({ embedding: JSON.stringify(embedding), updatedAt: new Date() }).where(eq(wikis.id, wiki.id));
  }
  return { embedding: embedding ? true : false };
}

export async function deleteWiki(id: number) {
  await db.delete(wikiEdges).where(and(eq(wikiEdges.userId, USER_ID), or(eq(wikiEdges.sourceWikiId, id), eq(wikiEdges.targetWikiId, id))));
  await db.delete(wikis).where(and(eq(wikis.id, id), eq(wikis.userId, USER_ID)));
  return { success: true };
}

export async function updateWikiTags(id: number, tags: string[]) {
  await db.update(wikis).set({ tags: JSON.stringify(tags), updatedAt: new Date() }).where(and(eq(wikis.id, id), eq(wikis.userId, USER_ID)));
  return { success: true };
}

export async function regenerateTags(id: number) {
  const wiki = await getWiki(id);
  if (!wiki) throw new Error('Wiki not found');

  const tags = await generateTags(wiki.title, wiki.content, wiki.summary);
  if (tags) {
    await db.update(wikis).set({ tags: JSON.stringify(tags), updatedAt: new Date() }).where(eq(wikis.id, wiki.id));
  }
  return { tags: tags ?? [] };
}

export async function backfillEmbeddings() {
  const allWikis = await db.select().from(wikis).where(eq(wikis.userId, USER_ID));
  const missing = allWikis.filter(w => !w.embedding || !w.tags);
  if (missing.length === 0) return { updated: 0, total: allWikis.length };

  let updated = 0;
  for (const wiki of missing) {
    const embText = `${wiki.title}\n${wiki.summary || ''}\n${wiki.content.slice(0, 2000)}`;
    const [embedding, tags] = await Promise.all([
      wiki.embedding ? null : generateEmbedding(embText),
      wiki.tags ? null : generateTags(wiki.title, wiki.content, wiki.summary),
    ]);
    const updates: Record<string, string | null> = {};
    if (embedding) updates.embedding = JSON.stringify(embedding);
    if (tags) updates.tags = JSON.stringify(tags);
    if (Object.keys(updates).length > 0) {
      await db.update(wikis).set({ ...updates, updatedAt: new Date() }).where(eq(wikis.id, wiki.id));
      updated++;
    }
  }
  return { updated, total: allWikis.length };
}

export async function getWikiTags() {
  const allWikis = await db.select({ tags: wikis.tags }).from(wikis).where(eq(wikis.userId, USER_ID));
  const tagSet = new Set<string>();
  for (const w of allWikis) {
    if (!w.tags) continue;
    try { (JSON.parse(w.tags) as string[]).forEach(t => tagSet.add(t)); } catch {}
  }
  return Array.from(tagSet).sort();
}

export async function getWikiCategories() {
  const result = await db.select({ category: wikis.category }).from(wikis).where(eq(wikis.userId, USER_ID)).groupBy(wikis.category);
  return result.map(r => r.category).filter(Boolean) as string[];
}

// ===== Stats =====

export async function getStats() {
  const qRows = await db.select().from(questions).where(eq(questions.userId, USER_ID));
  const wRows = await db.select().from(wikis).where(eq(wikis.userId, USER_ID));
  return { questions: qRows.length, wikis: wRows.length };
}

// ===== Search All =====

export async function searchAll(query: string) {
  const queryEmb = await generateEmbedding(query);
  let wikiResults: Wiki[] = [];

  if (queryEmb) {
    const similar = await findSimilarWikis(USER_ID, queryEmb, undefined, 5);
    wikiResults = similar.map(r => r.wiki);
  } else {
    const term = `%${query}%`;
    wikiResults = await db.select().from(wikis).where(and(eq(wikis.userId, USER_ID), or(like(wikis.title, term), like(wikis.content, term)))).limit(5);
  }

  const term = `%${query}%`;
  const questionResults = await db.select().from(questions).where(and(eq(questions.userId, USER_ID), or(like(questions.question, term), like(questions.answer, term)))).limit(5);

  return { wikis: wikiResults, questions: questionResults };
}

// Helpers

function filterByTag<T extends { tags?: string | null }>(items: T[], tag: string): T[] {
  return items.filter(w => {
    if (!w.tags) return false;
    try { return (JSON.parse(w.tags) as string[]).includes(tag); } catch { return false; }
  });
}
