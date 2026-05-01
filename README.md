# PulseWiki

AI-powered personal knowledge base. Ask questions, get answers from your existing wikis and notes, or let AI generate new ones. One click to organize Q&As into knowledge entries.

## Features

- **AI Q&A** — Ask anything. Searches your wikis and notes first, then falls back to LLM for answers
- **Wiki Knowledge Base** — Create, edit, and search wiki entries with categories
- **Notes** — Quick notes with Markdown support
- **Auto-organize** — Batch convert Q&A records into wiki entries with one click
- **Static mode** — Works without a backend, using localStorage for demo/offline use

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS, Radix UI |
| API | Hono, tRPC (end-to-end type safety) |
| Database | SQLite (better-sqlite3), Drizzle ORM |
| AI | OpenAI-compatible API (OpenAI, Qwen, DeepSeek, etc.) |
| Runtime | Node.js 20+ |

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### 1. Install dependencies

```bash
cd app
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database
DATABASE_PATH=./data.db

# AI — any OpenAI-compatible API
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-your-api-key
AI_MODEL=gpt-4o

# Default user ID (single-user mode, no auth required)
DEFAULT_USER_ID=1
```

**Supported AI providers:**

| Provider | AI_BASE_URL | AI_MODEL example |
|----------|-------------|-----------------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| Aliyun Qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen3.6-plus` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-128k` |
| SiliconFlow | `https://api.siliconflow.cn/v1` | `Qwen/Qwen2.5-7B-Instruct` |

### 3. Create database tables

```bash
npm run db:push
```

Or create manually:

```bash
node -e "
import Database from 'better-sqlite3';
const db = new Database('./data.db');
db.exec(\`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, unionId TEXT NOT NULL UNIQUE, name TEXT, email TEXT, avatar TEXT, role TEXT NOT NULL DEFAULT 'user', createdAt INTEGER NOT NULL DEFAULT (unixepoch()), updatedAt INTEGER NOT NULL DEFAULT (unixepoch()), lastSignInAt INTEGER NOT NULL DEFAULT (unixepoch()));
  INSERT OR IGNORE INTO users (id, unionId, name, role) VALUES (1, 'default', 'Admin', 'admin');
  CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'ai', sourceIds TEXT, isConvertedToWiki TEXT NOT NULL DEFAULT 'no', createdAt INTEGER NOT NULL DEFAULT (unixepoch()), updatedAt INTEGER NOT NULL DEFAULT (unixepoch()));
  CREATE TABLE IF NOT EXISTS wikis (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, summary TEXT, category TEXT, relatedQuestionId INTEGER, createdAt INTEGER NOT NULL DEFAULT (unixepoch()), updatedAt INTEGER NOT NULL DEFAULT (unixepoch()));
  CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, createdAt INTEGER NOT NULL DEFAULT (unixepoch()), updatedAt INTEGER NOT NULL DEFAULT (unixepoch()));
\`);
console.log('Done');
db.close();
"
```

### 4. Start dev server

```bash
npm run dev
```

Open http://localhost:3000

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Build for production (frontend + backend) |
| `npm run start` | Start production server (port 3000) |
| `npm run check` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run format` | Prettier formatting |
| `npm run test` | Run tests |
| `npm run db:push` | Push schema to database |
| `npm run db:generate` | Generate migration files |
| `npm run db:migrate` | Run migrations |

## Docker Deployment

```bash
docker build -t pulsewiki .
docker run -d \
  -p 3000:3000 \
  -v ./data.db:/app/data.db \
  -e AI_BASE_URL=https://api.openai.com/v1 \
  -e AI_API_KEY=sk-your-key \
  -e AI_MODEL=gpt-4o \
  pulsewiki
```

## Project Structure

```
app/
├── api/                  # Backend (Hono + tRPC)
│   ├── boot.ts           # Server entry point
│   ├── context.ts        # tRPC context (default user)
│   ├── middleware.ts     # tRPC middleware
│   ├── router.ts         # Root router
│   ├── knowledge-router.ts  # Wiki/Note/Question CRUD
│   ├── ai-router.ts      # AI Q&A endpoints
│   └── queries/          # Database queries
├── db/
│   ├── schema.ts         # Drizzle ORM schema
│   └── relations.ts      # Table relations
├── src/                  # Frontend (React)
│   ├── pages/            # Page components
│   ├── components/       # UI components
│   ├── hooks/            # Data hooks (dual-mode)
│   └── providers/        # tRPC provider
├── .env.example          # Environment template
├── Dockerfile            # Docker build
└── drizzle.config.ts     # Database config
```

## How AI Q&A Works

1. User submits a question
2. System searches local wikis and notes for matches
3. If matches found, they're included as context in the AI prompt
4. AI generates an answer using both local knowledge and its own knowledge
5. Q&A is saved and can be converted to a wiki entry or note with one click

## License

MIT
