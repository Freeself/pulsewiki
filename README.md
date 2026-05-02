# PulseWiki

AI-powered personal knowledge base. Ask questions and the system first searches your Wikis for answers, then falls back to an LLM for generated responses. One click to organize Q&As into knowledge entries.

## Features

- **AI Q&A** — Ask anything. Searches your local Wikis first, then falls back to LLM for answers
- **Wiki Knowledge Base** — Create, edit, and search wiki entries with categories and tags
- **Vector Semantic Search** — Embedding-based semantic search that understands "frontend framework" and "React" are related
- **Tag System** — AI auto-generates tags, supports tag filtering and clustering
- **Knowledge Network** — Force-directed graph visualization of wiki relationships, with tag node clustering
- **Wiki Relations** — Manually create, edit, and delete relationships between Wikis
- **Auto-organize** — Batch convert Q&A records into wiki entries with one click
- **Static mode** — Works without a backend, using localStorage for demo/offline use

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS, Radix UI, AntV G6 |
| API | Hono, tRPC (end-to-end type safety) |
| Database | SQLite (better-sqlite3), Drizzle ORM |
| AI | OpenAI-compatible API (OpenAI, Qwen, DeepSeek, etc.) |
| Embedding | OpenAI-compatible `/embeddings` API |
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

# AI chat config — any OpenAI-compatible API
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-your-api-key
AI_MODEL=gpt-4o

# Embedding config (for vector search, can be separate)
AI_EMBEDDING_BASE_URL=https://api.openai.com/v1
AI_EMBEDDING_API_KEY=sk-your-api-key
AI_EMBEDDING_MODEL=text-embedding-3-small

# Default user ID (single-user mode, no auth required)
DEFAULT_USER_ID=1

# Semantic search threshold (0~1, default 0.5)
EMBEDDING_THRESHOLD=0.5
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
  CREATE TABLE IF NOT EXISTS wikis (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, summary TEXT, category TEXT, relatedQuestionId INTEGER, embedding TEXT, tags TEXT, createdAt INTEGER NOT NULL DEFAULT (unixepoch()), updatedAt INTEGER NOT NULL DEFAULT (unixepoch()));
  CREATE TABLE IF NOT EXISTS wiki_edges (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, sourceWikiId INTEGER NOT NULL, targetWikiId INTEGER NOT NULL, label TEXT NOT NULL, strength TEXT NOT NULL, createdAt INTEGER NOT NULL DEFAULT (unixepoch()), updatedAt INTEGER NOT NULL DEFAULT (unixepoch()));
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
  -e AI_EMBEDDING_API_KEY=sk-your-key \
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
│   ├── knowledge-router.ts  # Wiki/Q&A CRUD, vector search
│   ├── network-router.ts    # Wiki relationship network CRUD
│   ├── ai-router.ts      # AI Q&A endpoints
│   └── lib/              # Utilities
│       ├── embedding.ts  # Embedding generation & vector search
│       ├── tagging.ts    # AI tag generation
│       └── env.ts        # Environment config
├── db/
│   ├── schema.ts         # Drizzle ORM schema
│   └── relations.ts      # Table relations
├── src/                  # Frontend (React)
│   ├── pages/            # Page components
│   ├── components/       # UI components
│   ├── hooks/            # Data hooks (dual-mode: backend/localStorage)
│   └── providers/        # tRPC provider
├── .env.example          # Environment template
├── Dockerfile            # Docker build
└── drizzle.config.ts     # Database config
```

## How AI Q&A Works

1. User submits a question
2. The query text is converted to an embedding vector
3. Cosine similarity search is performed against all Wiki embeddings
4. If matches found, they're included as context in the AI prompt
5. AI generates an answer using both local knowledge and its own knowledge
6. Q&A is saved and can be converted to a wiki entry with one click

## How Vector Semantic Search Works

1. When creating/updating a Wiki, the Embedding API converts title+summary+content to a vector
2. The vector is stored as a JSON string in `wikis.embedding`
3. When searching, the query text is also converted to a vector
4. Cosine similarity is computed against all Wiki embeddings
5. Results are sorted by similarity score (default threshold 0.5)
6. Falls back to SQL LIKE search if the Embedding API is unavailable

## How Knowledge Network Works

1. Users manually create relationships between Wikis (related, depends, references, contrasts, contains)
2. The system can also auto-infer: Wikis sharing 2+ tags get an automatic "related" edge
3. All Wiki nodes and relationship edges are visualized with AntV G6 force-directed graph
4. Tags are also displayed as nodes for tag clustering
5. Supports node search, hover highlighting, and side detail panel

## License

MIT
