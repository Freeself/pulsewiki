import { aiRouter } from "./ai-router";
import { knowledgeRouter } from "./knowledge-router";
import { networkRouter } from "./network-router";
import { configRouter } from "./config-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  ai: aiRouter,
  knowledge: knowledgeRouter,
  network: networkRouter,
  config: configRouter,
});

export type AppRouter = typeof appRouter;
