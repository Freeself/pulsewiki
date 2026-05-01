// LocalStorage-based data store for static deployment (no backend)
import { useState, useCallback } from 'react'

export interface LocalWiki {
  id: number
  userId: number
  title: string
  content: string
  summary: string | null
  category: string | null
  relatedQuestionId: number | null
  createdAt: Date
  updatedAt: Date
}

export interface LocalNote {
  id: number
  userId: number
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface LocalQuestion {
  id: number
  userId: number
  question: string
  answer: string
  source: 'ai' | 'wiki' | 'note' | 'hybrid'
  sourceIds: string | null
  isConvertedToWiki: 'yes' | 'no'
  createdAt: Date
  updatedAt: Date
}

function getItem<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaultVal
    return JSON.parse(raw, (_k, v) => {
      // Revive Date strings
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
        return new Date(v)
      }
      return v
    }) as T
  } catch {
    return defaultVal
  }
}

function setItem<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val))
}

let wikiIdCounter = getItem('pw_wiki_counter', 0)
let noteIdCounter = getItem('pw_note_counter', 0)
let qIdCounter = getItem('pw_q_counter', 0)

// Wikis
export function getLocalWikis(): LocalWiki[] {
  return getItem<LocalWiki[]>('pw_wikis', [])
}

export function addLocalWiki(data: Omit<LocalWiki, 'id' | 'createdAt' | 'updatedAt'>): LocalWiki {
  const wikis = getLocalWikis()
  wikiIdCounter++
  setItem('pw_wiki_counter', wikiIdCounter)
  const newWiki: LocalWiki = {
    ...data,
    id: wikiIdCounter,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  wikis.unshift(newWiki)
  setItem('pw_wikis', wikis)
  return newWiki
}

export function updateLocalWiki(id: number, updates: Partial<LocalWiki>): LocalWiki | null {
  const wikis = getLocalWikis()
  const idx = wikis.findIndex(w => w.id === id)
  if (idx === -1) return null
  wikis[idx] = { ...wikis[idx], ...updates, updatedAt: new Date() }
  setItem('pw_wikis', wikis)
  return wikis[idx]
}

export function deleteLocalWiki(id: number) {
  const wikis = getLocalWikis().filter(w => w.id !== id)
  setItem('pw_wikis', wikis)
}

// Notes
export function getLocalNotes(): LocalNote[] {
  return getItem<LocalNote[]>('pw_notes', [])
}

export function addLocalNote(data: Omit<LocalNote, 'id' | 'createdAt' | 'updatedAt'>): LocalNote {
  const notes = getLocalNotes()
  noteIdCounter++
  setItem('pw_note_counter', noteIdCounter)
  const newNote: LocalNote = {
    ...data,
    id: noteIdCounter,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  notes.unshift(newNote)
  setItem('pw_notes', notes)
  return newNote
}

export function updateLocalNote(id: number, updates: Partial<LocalNote>): LocalNote | null {
  const notes = getLocalNotes()
  const idx = notes.findIndex(n => n.id === id)
  if (idx === -1) return null
  notes[idx] = { ...notes[idx], ...updates, updatedAt: new Date() }
  setItem('pw_notes', notes)
  return notes[idx]
}

export function deleteLocalNote(id: number) {
  const notes = getLocalNotes().filter(n => n.id !== id)
  setItem('pw_notes', notes)
}

// Questions
export function getLocalQuestions(): LocalQuestion[] {
  return getItem<LocalQuestion[]>('pw_questions', [])
}

export function addLocalQuestion(data: Omit<LocalQuestion, 'id' | 'createdAt' | 'updatedAt'>): LocalQuestion {
  const questions = getLocalQuestions()
  qIdCounter++
  setItem('pw_q_counter', qIdCounter)
  const newQ: LocalQuestion = {
    ...data,
    id: qIdCounter,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  questions.unshift(newQ)
  setItem('pw_questions', questions)
  return newQ
}

export function deleteLocalQuestion(id: number) {
  const questions = getLocalQuestions().filter(q => q.id !== id)
  setItem('pw_questions', questions)
}

// Stats
export function getLocalStats() {
  return {
    questions: getLocalQuestions().length,
    wikis: getLocalWikis().length,
    notes: getLocalNotes().length,
  }
}

// Hook for reactive local data
export function useLocalDataRefresh() {
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion(v => v + 1), [])
  return { version, refresh }
}

// Seed demo data
export function seedDemoData() {
  if (getLocalWikis().length === 0 && getLocalNotes().length === 0) {
    addLocalWiki({
      userId: 0,
      title: 'React 基础概念',
      content: '# React 基础概念\n\n## 组件\nReact 应用由独立的、可复用的代码片段组成，称为组件。\n\n## JSX\nJSX 是 JavaScript 的语法扩展，可以在 JavaScript 中编写类似 HTML 的结构。\n\n## Hooks\n- useState: 管理组件状态\n- useEffect: 处理副作用\n- useContext: 跨组件共享数据\n\n## 虚拟DOM\nReact 使用虚拟DOM来优化页面渲染性能，通过对比差异最小化实际DOM操作。',
      summary: 'React 是一个用于构建用户界面的 JavaScript 库，核心概念包括组件、JSX、Hooks 和虚拟DOM。',
      category: '前端开发',
      relatedQuestionId: null,
    })

    addLocalWiki({
      userId: 0,
      title: '什么是 tRPC',
      content: '# tRPC 简介\n\ntRPC 是一个用于构建端到端类型安全 API 的框架。\n\n## 核心优势\n- **类型安全**: 从后端到前端全程类型推断\n- **无代码生成**: 不需要生成中间代码\n- **轻量级**: 基于标准 HTTP\n\n## 基本概念\n```typescript\n// 定义路由\const appRouter = router({\n  greeting: publicQuery\n    .input(z.object({ name: z.string() }))\n    .query(({ input }) => `Hello ${input.name}`),\n})\n```',
      summary: 'tRPC 是端到端类型安全的 API 框架，无需代码生成即可实现前后端类型共享。',
      category: '后端技术',
      relatedQuestionId: null,
    })

    addLocalNote({
      userId: 0,
      title: '项目会议记录 - 5月1日',
      content: '# 会议记录\n\n## 参会人员\n- 产品经理\n- 技术负责人\n- UI设计师\n\n## 讨论要点\n1. Q2 季度目标确定\n2. 技术架构升级方案\n3. 用户体验优化计划\n\n## 待办事项\n- [ ] 完成技术方案文档\n- [ ] UI 设计稿评审\n- [ ] 开发排期确认',
    })

    addLocalNote({
      userId: 0,
      title: '学习清单',
      content: '# 2026 学习计划\n\n## 技术\n- [ ] Rust 入门\n- [ ] WebAssembly 实践\n- [ ] 分布式系统设计\n\n## 阅读\n- 《设计数据密集型应用》\n- 《代码整洁之道》',
    })

    addLocalQuestion({
      userId: 0,
      question: 'React 和 Vue 有什么区别？',
      answer: 'React 和 Vue 都是流行的前端框架，但有以下主要区别：\n\n**React**:\n- 由 Meta 开发维护\n- 使用 JSX 语法\n- 函数式编程风格\n- 生态系统更大\n\n**Vue**:\n- 由 Evan You 创建\n- 模板语法更接近 HTML\n- 渐进式框架\n- 上手更简单',
      source: 'ai',
      sourceIds: null,
      isConvertedToWiki: 'no',
    })
  }
}
