import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  databasePath: required("DATABASE_PATH"),
  defaultUserId: parseInt(process.env.DEFAULT_USER_ID || "1", 10),
  aiBaseUrl: required("AI_BASE_URL"),
  aiApiKey: required("AI_API_KEY"),
  aiModel: process.env.AI_MODEL || "gpt-4o",
};
