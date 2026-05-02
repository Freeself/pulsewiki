import { relations } from "drizzle-orm";
import { users, questions, wikis, wikiEdges } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  questions: many(questions),
  wikis: many(wikis),
  wikiEdges: many(wikiEdges),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  user: one(users, {
    fields: [questions.userId],
    references: [users.id],
  }),
}));

export const wikisRelations = relations(wikis, ({ one, many }) => ({
  user: one(users, {
    fields: [wikis.userId],
    references: [users.id],
  }),
  outgoingEdges: many(wikiEdges, { relationName: "sourceWiki" }),
  incomingEdges: many(wikiEdges, { relationName: "targetWiki" }),
}));

export const wikiEdgesRelations = relations(wikiEdges, ({ one }) => ({
  user: one(users, {
    fields: [wikiEdges.userId],
    references: [users.id],
  }),
  sourceWiki: one(wikis, {
    fields: [wikiEdges.sourceWikiId],
    references: [wikis.id],
    relationName: "sourceWiki",
  }),
  targetWiki: one(wikis, {
    fields: [wikiEdges.targetWikiId],
    references: [wikis.id],
    relationName: "targetWiki",
  }),
}));
