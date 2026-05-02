import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { questions, wikis } from "@db/schema";
import { eq, and, like, or, desc } from "drizzle-orm";
import { getActiveConfig } from "./lib/config-reader";
import { generateEmbedding, findSimilarWikis } from "./lib/embedding";

// Search local knowledge (wikis) for relevant content using vector search
async function searchLocalKnowledge(userId: number, query: string) {
  const db = getDb();

  // Try vector search first
  const queryEmb = await generateEmbedding(query);
  if (queryEmb) {
    const similar = await findSimilarWikis(userId, queryEmb, undefined, 3);
    if (similar.length > 0) {
      return { wikis: similar.map((r) => r.wiki) };
    }
  }

  // Fallback to LIKE search
  const wikiResults = await db
    .select()
    .from(wikis)
    .where(
      and(
        eq(wikis.userId, userId),
        or(
          like(wikis.title, `%${query}%`),
          like(wikis.content, `%${query}%`),
          like(wikis.summary, `%${query}%`)
        )
      )
    )
    .limit(3);

  return { wikis: wikiResults };
}

async function callAI(messages: Array<{ role: string; content: string }>) {
  const config = await getActiveConfig();
  const url = `${config.aiBaseUrl}/chat/completions`;
  console.log(`[AI] Calling ${url} model=${config.aiModel}`);
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
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.warn(`[AI] API call failed (${resp.status}): ${text}`);
      return null;
    }

    const data = await resp.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices[0]?.message?.content ?? null;
    console.log(`[AI] Response received (${content?.length ?? 0} chars)`);
    return content;
  } catch (error) {
    console.error("[AI] API call error:", error);
    return null;
  }
}

export const aiRouter = createRouter({
  // Smart Q&A - search local knowledge first, then AI
  ask: publicQuery
    .input(z.object({ question: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { question } = input;

      // Step 1: Search local knowledge
      const localResults = await searchLocalKnowledge(userId, question);
      const hasWikiResults = localResults.wikis.length > 0;

      // Step 2: Build context from local knowledge
      let context = "";
      let source: "ai" | "wiki" = "ai";
      const sourceIds: number[] = [];

      if (hasWikiResults) {
        context = "Based on your existing knowledge base:\n\n";

        context += "=== Wiki Entries ===\n";
        for (const wiki of localResults.wikis) {
          context += `Title: ${wiki.title}\nSummary: ${wiki.summary || wiki.content.slice(0, 500)}\n\n`;
          sourceIds.push(wiki.id);
        }

        source = "wiki";
      }

      // Step 3: Call AI API with context
      const messages: Array<{ role: string; content: string }> = [
        {
          role: "system",
          content: `You are PulseWiki, an intelligent knowledge assistant. Your role is to:
1. Answer questions based on the user's existing knowledge (wiki entries) when available
2. Provide clear, accurate, and helpful responses
3. When referencing wiki content, mention the source title
4. If the user's knowledge doesn't fully answer the question, supplement with general knowledge
5. Always respond in the same language as the user's question
${context ? "\nThe following is the user's existing knowledge base that may be relevant:\n" + context : ""}`,
        },
        {
          role: "user",
          content: question,
        },
      ];

      const aiAnswer = await callAI(messages);
      const answer = aiAnswer || "I'm sorry, I couldn't generate a response at this time. Please try again.";

      // Step 4: Save to questions table
      const [result] = await getDb().insert(questions).values({
        userId,
        question,
        answer,
        source,
        sourceIds: sourceIds.length > 0 ? JSON.stringify(sourceIds) : null,
      }).returning();

      return {
        questionId: result.id,
        answer,
        source,
        hasLocalKnowledge: hasWikiResults,
        wikiCount: localResults.wikis.length,
      };
    }),

  // Convert a Q&A to a wiki entry
  convertToWiki: publicQuery
    .input(z.object({ questionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      
      // Get the question
      const qResult = await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.id, input.questionId),
            eq(questions.userId, ctx.user.id)
          )
        )
        .limit(1);

      const question = qResult[0];
      if (!question) {
        throw new Error("Question not found");
      }

      // Generate a title from the question
      const title = question.question.length > 80 
        ? question.question.slice(0, 80) + "..." 
        : question.question;

      // Generate summary via AI
      const summaryMessages = [
        {
          role: "system",
          content: "You are a knowledge organizer. Create a brief 2-3 sentence summary of the following Q&A pair. The summary should capture the key insight.",
        },
        {
          role: "user",
          content: `Q: ${question.question}\nA: ${question.answer.slice(0, 1000)}`,
        },
      ];

      const summary = await callAI(summaryMessages) || question.answer.slice(0, 200);

      // Generate embedding
      const embText = `${title}\n${summary}\n${question.answer.slice(0, 2000)}`;
      const embedding = await generateEmbedding(embText);

      // Create wiki entry
      const [newWiki] = await db.insert(wikis).values({
        userId: ctx.user.id,
        title,
        content: question.answer,
        summary,
        category: "AI Generated",
        relatedQuestionId: question.id,
        embedding: embedding ? JSON.stringify(embedding) : null,
      }).returning();

      // Mark question as converted
      await db
        .update(questions)
        .set({ isConvertedToWiki: "yes" })
        .where(eq(questions.id, question.id));

      return { wikiId: newWiki.id, title, summary };
    }),

  // Auto-organize: batch convert multiple Q&As to wikis
  autoOrganize: publicQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    
    // Find all unconverted questions
    const unconverted = await db
      .select()
      .from(questions)
      .where(
        and(
          eq(questions.userId, ctx.user.id),
          eq(questions.isConvertedToWiki, "no"),
          eq(questions.source, "ai")
        )
      )
      .orderBy(desc(questions.createdAt))
      .limit(10);

    const results = [];
    for (const q of unconverted) {
      const title = q.question.length > 80 ? q.question.slice(0, 80) + "..." : q.question;
      const summaryMessages = [
        {
          role: "system",
          content: "Create a brief 2-3 sentence summary of this Q&A:",
        },
        {
          role: "user",
          content: `Q: ${q.question}\nA: ${q.answer.slice(0, 1000)}`,
        },
      ];
      const summary = await callAI(summaryMessages) || q.answer.slice(0, 200);

      // Generate embedding
      const embText = `${title}\n${summary}\n${q.answer.slice(0, 2000)}`;
      const embedding = await generateEmbedding(embText);

      const [wiki] = await db.insert(wikis).values({
        userId: ctx.user.id,
        title,
        content: q.answer,
        summary,
        category: "AI Generated",
        relatedQuestionId: q.id,
        embedding: embedding ? JSON.stringify(embedding) : null,
      }).returning();

      await db
        .update(questions)
        .set({ isConvertedToWiki: "yes" })
        .where(eq(questions.id, q.id));

      results.push({ wikiId: wiki.id, title });
    }

    return { converted: results.length, wikis: results };
  }),
});
