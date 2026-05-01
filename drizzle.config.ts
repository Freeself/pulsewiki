import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const dbPath = process.env.DATABASE_PATH;
if (!dbPath) {
  throw new Error("DATABASE_PATH is required to run drizzle commands");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
});
