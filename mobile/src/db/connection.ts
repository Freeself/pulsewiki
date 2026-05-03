import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from '@db/schema';
import * as relations from '@db/relations';

const fullSchema = { ...schema, ...relations };
const expoDb = openDatabaseSync('pulsewiki.db');
export const db = drizzle(expoDb, { schema: fullSchema });

// Default user ID for mobile (single-user app)
export const USER_ID = 1;

// Initialize schema - run SQL to create tables if they don't exist
export function initDb() {
  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS users (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, unionId text NOT NULL UNIQUE, name text, email text, avatar text, role text DEFAULT 'user' NOT NULL, createdAt integer NOT NULL, updatedAt integer NOT NULL, lastSignInAt integer NOT NULL);
    CREATE TABLE IF NOT EXISTS questions (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, userId integer NOT NULL, question text NOT NULL, answer text NOT NULL, source text DEFAULT 'ai' NOT NULL, sourceIds text, isConvertedToWiki text DEFAULT 'no' NOT NULL, createdAt integer NOT NULL, updatedAt integer NOT NULL);
    CREATE TABLE IF NOT EXISTS wikis (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, userId integer NOT NULL, title text NOT NULL, content text NOT NULL, summary text, category text, relatedQuestionId integer, embedding text, tags text, createdAt integer NOT NULL, updatedAt integer NOT NULL);
    CREATE TABLE IF NOT EXISTS wiki_edges (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, userId integer NOT NULL, sourceWikiId integer NOT NULL, targetWikiId integer NOT NULL, label text NOT NULL, strength text NOT NULL, createdAt integer NOT NULL, updatedAt integer NOT NULL);
    CREATE TABLE IF NOT EXISTS ai_configs (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, userId integer NOT NULL, name text NOT NULL, isActive integer DEFAULT 0 NOT NULL, aiBaseUrl text, aiApiKey text, aiModel text, aiEmbeddingBaseUrl text, aiEmbeddingApiKey text, aiEmbeddingModel text, embeddingApiFormat text DEFAULT 'dashscope' NOT NULL, embeddingThreshold text DEFAULT '0.5' NOT NULL, createdAt integer NOT NULL, updatedAt integer NOT NULL);
  `);

  // Ensure default user exists
  const existing = expoDb.getFirstSync('SELECT id FROM users WHERE id = ?', [USER_ID]) as any;
  if (!existing) {
    const now = Date.now();
    expoDb.runSync('INSERT INTO users (id, unionId, name, role, createdAt, updatedAt, lastSignInAt) VALUES (?, ?, ?, ?, ?, ?, ?)', [USER_ID, 'mobile-user', 'Mobile User', 'admin', now, now, now]);
  }
}
