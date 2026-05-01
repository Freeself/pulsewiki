import { relations } from "drizzle-orm";
import { users, questions, wikis, notes } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  questions: many(questions),
  wikis: many(wikis),
  notes: many(notes),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  user: one(users, {
    fields: [questions.userId],
    references: [users.id],
  }),
}));

export const wikisRelations = relations(wikis, ({ one }) => ({
  user: one(users, {
    fields: [wikis.userId],
    references: [users.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
}));
