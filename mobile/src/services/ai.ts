import { db, USER_ID } from '../db/connection';
import { questions, wikis } from '@db/schema';
import { eq, and, like, or, desc } from 'drizzle-orm';
import { getActiveConfig } from './lib/config-reader';
import { generateEmbedding, findSimilarWikis } from './lib/embedding';
import { generateTags } from './lib/tagging';

async function callAI(messages: Array<{ role: string; content: string }>) {
  const config = await getActiveConfig();
  if (!config.aiBaseUrl || !config.aiApiKey) return null;

  try {
    const resp = await fetch(`${config.aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.aiApiKey}` },
      body: JSON.stringify({ model: config.aiModel, messages, temperature: 0.7 }),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? null;
  } catch { return null; }
}

async function searchLocalKnowledge(query: string) {
  const queryEmb = await generateEmbedding(query);
  if (queryEmb) {
    const similar = await findSimilarWikis(USER_ID, queryEmb, undefined, 3);
    if (similar.length > 0) return { wikis: similar.map(r => r.wiki) };
  }
  const wikiResults = await db.select().from(wikis).where(and(eq(wikis.userId, USER_ID), or(like(wikis.title, `%${query}%`), like(wikis.content, `%${query}%`), like(wikis.summary, `%${query}%`)))).limit(3);
  return { wikis: wikiResults };
}

export async function askQuestion(question: string) {
  const localResults = await searchLocalKnowledge(question);
  const hasWikiResults = localResults.wikis.length > 0;

  let context = '';
  let source: 'ai' | 'wiki' = 'ai';
  const sourceIds: number[] = [];

  if (hasWikiResults) {
    context = 'Based on your existing knowledge base:\n\n=== Wiki Entries ===\n';
    for (const wiki of localResults.wikis) {
      context += `Title: ${wiki.title}\nSummary: ${wiki.summary || wiki.content.slice(0, 500)}\n\n`;
      sourceIds.push(wiki.id);
    }
    source = 'wiki';
  }

  const messages: Array<{ role: string; content: string }> = [
    {
      role: 'system',
      content: `You are PulseWiki, an intelligent knowledge assistant. Your role is to:
1. Answer questions based on the user's existing knowledge (wiki entries) when available
2. Provide clear, accurate, and helpful responses
3. When referencing wiki content, mention the source title
4. If the user's knowledge doesn't fully answer the question, supplement with general knowledge
5. Always respond in the same language as the user's question
${context ? "\nThe following is the user's existing knowledge base that may be relevant:\n" + context : ""}`,
    },
    { role: 'user', content: question },
  ];

  const aiAnswer = await callAI(messages);
  const answer = aiAnswer || "抱歉，暂时无法生成回答，请稍后再试。";

  const [result] = await db.insert(questions).values({
    userId: USER_ID, question, answer, source,
    sourceIds: sourceIds.length > 0 ? JSON.stringify(sourceIds) : null,
  }).returning();

  return { questionId: result.id, answer, source, hasLocalKnowledge: hasWikiResults, wikiCount: localResults.wikis.length };
}

export async function convertToWiki(questionId: number) {
  const qResult = await db.select().from(questions).where(and(eq(questions.id, questionId), eq(questions.userId, USER_ID))).limit(1);
  const question = qResult[0];
  if (!question) throw new Error('Question not found');

  const title = question.question.length > 80 ? question.question.slice(0, 80) + '...' : question.question;

  const summary = await callAI([
    { role: 'system', content: 'You are a knowledge organizer. Create a brief 2-3 sentence summary of the following Q&A pair. The summary should capture the key insight.' },
    { role: 'user', content: `Q: ${question.question}\nA: ${question.answer.slice(0, 1000)}` },
  ]) || question.answer.slice(0, 200);

  const embText = `${title}\n${summary}\n${question.answer.slice(0, 2000)}`;
  const [embedding, tags] = await Promise.all([
    generateEmbedding(embText),
    generateTags(title, question.answer, summary),
  ]);

  const [newWiki] = await db.insert(wikis).values({
    userId: USER_ID, title, content: question.answer, summary, category: 'AI Generated',
    relatedQuestionId: question.id, embedding: embedding ? JSON.stringify(embedding) : null,
    tags: tags ? JSON.stringify(tags) : null,
  }).returning();

  await db.update(questions).set({ isConvertedToWiki: 'yes', updatedAt: new Date() }).where(eq(questions.id, question.id));

  return { wikiId: newWiki.id, title, summary };
}

export async function autoOrganize() {
  const unconverted = await db.select().from(questions).where(
    and(eq(questions.userId, USER_ID), eq(questions.isConvertedToWiki, 'no'), eq(questions.source, 'ai'))
  ).orderBy(desc(questions.createdAt)).limit(10);

  const results = [];
  for (const q of unconverted) {
    const title = q.question.length > 80 ? q.question.slice(0, 80) + '...' : q.question;
    const summary = await callAI([
      { role: 'system', content: 'Create a brief 2-3 sentence summary of this Q&A:' },
      { role: 'user', content: `Q: ${q.question}\nA: ${q.answer.slice(0, 1000)}` },
    ]) || q.answer.slice(0, 200);

    const embText = `${title}\n${summary}\n${q.answer.slice(0, 2000)}`;
    const [embedding, tags] = await Promise.all([
      generateEmbedding(embText),
      generateTags(title, q.answer, summary),
    ]);

    const [wiki] = await db.insert(wikis).values({
      userId: USER_ID, title, content: q.answer, summary, category: 'AI Generated',
      relatedQuestionId: q.id, embedding: embedding ? JSON.stringify(embedding) : null,
      tags: tags ? JSON.stringify(tags) : null,
    }).returning();

    await db.update(questions).set({ isConvertedToWiki: 'yes', updatedAt: new Date() }).where(eq(questions.id, q.id));
    results.push({ wikiId: wiki.id, title });
  }
  return { converted: results.length, wikis: results };
}
