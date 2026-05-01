# PulseWiki

AI 驱动的个人知识库。提问任何问题，系统会先在你的 Wiki 和笔记中搜索答案，找不到则调用大模型生成回答，并支持一键整理到知识库。

## 功能特性

- **AI 问答** — 提问后先搜索本地 Wiki 和笔记，再由大模型补充回答
- **Wiki 知识库** — 创建、编辑、搜索知识条目，支持分类
- **笔记** — 快速记录想法，支持 Markdown
- **自动整理** — 一键批量将问答记录转化为 Wiki 条目
- **离线模式** — 无后端时使用 localStorage，支持演示和离线使用

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, TypeScript, Vite, TailwindCSS, Radix UI |
| 接口 | Hono, tRPC（端到端类型安全） |
| 数据库 | SQLite (better-sqlite3), Drizzle ORM |
| AI | OpenAI 兼容接口（支持 OpenAI、通义千问、DeepSeek 等） |
| 运行时 | Node.js 20+ |

## 快速开始

### 环境要求

- Node.js 20+
- npm

### 1. 安装依赖

```bash
cd app
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
# 数据库
DATABASE_PATH=./data.db

# AI 配置 — 支持 any OpenAI 兼容接口
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-your-api-key
AI_MODEL=gpt-4o

# 默认用户 ID（单用户模式，无需登录）
DEFAULT_USER_ID=1
```

**支持的 AI 服务商：**

| 服务商 | AI_BASE_URL | AI_MODEL 示例 |
|--------|-------------|--------------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| 阿里云通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen3.6-plus` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Moonshot (月之暗面) | `https://api.moonshot.cn/v1` | `moonshot-v1-128k` |
| SiliconFlow (硅基流动) | `https://api.siliconflow.cn/v1` | `Qwen/Qwen2.5-7B-Instruct` |

### 3. 创建数据库表

```bash
npm run db:push
```

或者手动创建：

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

### 4. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:5173

## NPM 命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（热更新） |
| `npm run build` | 生产构建（前端 + 后端） |
| `npm run start` | 启动生产服务器（端口 3000） |
| `npm run check` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码检查 |
| `npm run format` | Prettier 格式化 |
| `npm run test` | 运行测试 |
| `npm run db:push` | 推送 schema 到数据库 |
| `npm run db:generate` | 生成迁移文件 |
| `npm run db:migrate` | 执行迁移 |

## Docker 部署

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

## 项目结构

```
app/
├── api/                  # 后端（Hono + tRPC）
│   ├── boot.ts           # 服务入口
│   ├── context.ts        # tRPC 上下文（默认用户）
│   ├── middleware.ts     # tRPC 中间件
│   ├── router.ts         # 根路由
│   ├── knowledge-router.ts  # Wiki/笔记/问答 CRUD
│   ├── ai-router.ts      # AI 问答接口
│   └── queries/          # 数据库查询
├── db/
│   ├── schema.ts         # Drizzle ORM 表定义
│   └── relations.ts      # 表关联关系
├── src/                  # 前端（React）
│   ├── pages/            # 页面组件
│   ├── components/       # UI 组件
│   ├── hooks/            # 数据 hooks（双模式）
│   └── providers/        # tRPC provider
├── .env.example          # 环境变量模板
├── Dockerfile            # Docker 构建
└── drizzle.config.ts     # 数据库配置
```

## AI 问答工作原理

1. 用户提交问题
2. 系统在本地 Wiki 和笔记中搜索匹配内容
3. 如果找到匹配，将其作为上下文附加到 AI 提示词中
4. AI 结合本地知识库和自身知识生成回答
5. 问答记录自动保存，可一键转化为 Wiki 条目或笔记

## 许可证

MIT
