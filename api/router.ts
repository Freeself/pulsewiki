import { aiRouter } from "./ai-router";
import { knowledgeRouter } from "./knowledge-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  ai: aiRouter,
  knowledge: knowledgeRouter,
});

export type AppRouter = typeof appRouter;
