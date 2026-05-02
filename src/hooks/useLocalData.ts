// LocalStorage-based data store for static deployment (no backend)
import { useState, useEffect } from 'react'

export interface LocalWiki {
  id: number
  userId: number
  title: string
  content: string
  summary: string | null
  category: string | null
  relatedQuestionId: number | null
  embedding?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface LocalQuestion {
  id: number
  userId: number
  question: string
  answer: string
  source: 'ai' | 'wiki'
  sourceIds: string | null
  isConvertedToWiki: 'yes' | 'no'
  createdAt: Date
  updatedAt: Date
}

export interface LocalWikiEdge {
  id: number
  userId: number
  sourceWikiId: number
  targetWikiId: number
  label: string
  strength: string
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
let qIdCounter = getItem('pw_q_counter', 0)
let edgeIdCounter = getItem('pw_edge_counter', 0)

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

// Wiki Edges
export function getLocalEdges(): LocalWikiEdge[] {
  return getItem<LocalWikiEdge[]>('pw_edges', [])
}

export function setLocalEdges(edges: LocalWikiEdge[]) {
  setItem('pw_edges', edges)
}

export function addLocalEdges(data: Array<Omit<LocalWikiEdge, 'id' | 'createdAt' | 'updatedAt'>>): LocalWikiEdge[] {
  const edges = getLocalEdges()
  const newEdges: LocalWikiEdge[] = data.map(d => {
    edgeIdCounter++
    setItem('pw_edge_counter', edgeIdCounter)
    return { ...d, id: edgeIdCounter, createdAt: new Date(), updatedAt: new Date() }
  })
  edges.push(...newEdges)
  setItem('pw_edges', edges)
  return newEdges
}

export function deleteLocalEdgesForWiki(wikiId: number) {
  const edges = getLocalEdges().filter(e => e.sourceWikiId !== wikiId && e.targetWikiId !== wikiId)
  setItem('pw_edges', edges)
}

export function getLocalRelatedWikis(wikiId: number): Array<LocalWiki & { relation: { label: string; strength: number } }> {
  const edges = getLocalEdges().filter(e => e.sourceWikiId === wikiId || e.targetWikiId === wikiId)
  const wikis = getLocalWikis()
  const relatedIds = new Set<number>()
  for (const e of edges) {
    if (e.sourceWikiId !== wikiId) relatedIds.add(e.sourceWikiId)
    if (e.targetWikiId !== wikiId) relatedIds.add(e.targetWikiId)
  }
  return wikis
    .filter(w => relatedIds.has(w.id))
    .map(w => {
      const edge = edges.find(e => e.sourceWikiId === w.id || e.targetWikiId === w.id)!
      return { ...w, relation: { label: edge.label, strength: Number(edge.strength) } }
    })
}

export function buildLocalNetwork() {
  const wikis = getLocalWikis()
  // Clear old edges
  setItem('pw_edges', [])

  if (wikis.length < 2) return { nodeCount: wikis.length, edgeCount: 0 }

  // Keyword-overlap heuristic for local mode
  const stopWords = new Set(['的', '了', '是', '在', '和', '与', '及', '等', '中', '为', '对', '有', '一个', '可以', '使用', '通过', '进行', '实现', '以及', '包括', '称为', '由', 'the', 'a', 'an', 'is', 'are', 'and', 'or', 'to', 'of', 'in', 'for', 'with'])
  const getKeywords = (text: string): Set<string> => {
    const clean = text.toLowerCase().replace(/[^\w一-鿿]+/g, ' ').trim()
    const tokens = new Set<string>()
    // Extract words (Latin/numbers)
    for (const w of clean.split(/\s+/)) {
      if (w.length > 1 && !stopWords.has(w)) tokens.add(w)
    }
    // Extract Chinese bigrams — replace Latin words with spaces first
    // so Chinese characters on both sides don't get joined incorrectly
    const cjk = clean.replace(/[a-z0-9_]+/g, ' ').replace(/\s+/g, '')
    for (let i = 0; i < cjk.length - 1; i++) {
      const bigram = cjk.slice(i, i + 2)
      if (!stopWords.has(bigram)) tokens.add(bigram)
    }
    return tokens
  }

  const wikiKeywords = wikis.map(w => ({
    wiki: w,
    keywords: getKeywords(`${w.title} ${w.summary || ''} ${w.content.slice(0, 500)}`),
  }))

  const newEdges: Array<Omit<LocalWikiEdge, 'id' | 'createdAt' | 'updatedAt'>> = []
  const labels = ['相关', '依赖', '引用', '对比', '包含']

  for (let i = 0; i < wikiKeywords.length; i++) {
    for (let j = i + 1; j < wikiKeywords.length; j++) {
      const a = wikiKeywords[i]
      const b = wikiKeywords[j]
      const overlap = [...a.keywords].filter(k => b.keywords.has(k)).length
      const minSize = Math.min(a.keywords.size, b.keywords.size)
      if (minSize === 0) continue
      const similarity = overlap / minSize
      if (similarity >= 0.08) {
        newEdges.push({
          userId: 0,
          sourceWikiId: a.wiki.id,
          targetWikiId: b.wiki.id,
          label: labels[Math.min(Math.floor(similarity * 4), 4)],
          strength: String(Math.min(similarity * 3, 1).toFixed(2)),
        })
      }
    }
  }

  addLocalEdges(newEdges)
  return { nodeCount: wikis.length, edgeCount: newEdges.length }
}

// Stats
export function getLocalStats() {
  return {
    questions: getLocalQuestions().length,
    wikis: getLocalWikis().length,
  }
}

// Shared reactive local data refresh
let _localDataVersion = 0
const _localDataListeners = new Set<() => void>()

function notifyLocalDataChange() {
  _localDataVersion++
  _localDataListeners.forEach(fn => fn())
}

export function useLocalDataRefresh() {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const listener = () => forceUpdate(v => v + 1)
    _localDataListeners.add(listener)
    return () => { _localDataListeners.delete(listener) }
  }, [])

  return { version: _localDataVersion, refresh: notifyLocalDataChange }
}

// Seed demo data
export function seedDemoData() {
  if (getLocalWikis().length === 0) {
    addLocalWiki({
      userId: 0,
      title: 'React 基础概念',
      content: '# React 基础概念\n\nReact 是一个用于构建用户界面的 JavaScript 库。\n\n## 组件\nReact 应用由独立的、可复用的代码片段组成，称为组件。\n\n## JSX\nJSX 是 JavaScript 的语法扩展，可以在 JavaScript 中编写类似 HTML 的结构。\n\n## Hooks\n- useState: 管理组件状态\n- useEffect: 处理副作用\n- useContext: 跨组件共享数据\n\n## 虚拟DOM\nReact 使用虚拟DOM来优化页面渲染性能，通过对比差异最小化实际DOM操作。',
      summary: 'React 是一个用于构建用户界面的 JavaScript 库，核心概念包括组件、JSX、Hooks 和虚拟DOM。',
      category: '前端开发',
      relatedQuestionId: null,
    })

    addLocalWiki({
      userId: 0,
      title: '什么是 tRPC',
      content: '# tRPC 简介\n\ntRPC 是一个用于构建端到端类型安全 API 的框架。\n\n## 核心优势\n- 类型安全: 从后端到前端全程类型推断\n- 无代码生成: 不需要生成中间代码\n- 轻量级: 基于标准 HTTP 协议\n\n## 前后端协作\n使用 tRPC 可以让前端直接调用后端函数，无需手动定义 API 接口。结合 TypeScript 和 Zod 进行输入验证，实现前后端类型共享。',
      summary: 'tRPC 是端到端类型安全的 API 框架，让前端直接调用后端函数，无需手动定义接口。',
      category: '后端技术',
      relatedQuestionId: null,
    })

    addLocalWiki({
      userId: 0,
      title: 'TypeScript 入门指南',
      content: '# TypeScript 入门指南\n\nTypeScript 是 JavaScript 的超集，添加了静态类型系统。\n\n## 核心特性\n- 类型注解和类型推断\n- 接口和类型别名\n- 泛型编程\n- 枚举类型\n\n## 与 JavaScript 的关系\nTypeScript 编译后生成标准 JavaScript 代码，可以在任何支持 JavaScript 的环境中运行。React 项目推荐使用 TypeScript。',
      summary: 'TypeScript 是 JavaScript 的超集，提供静态类型检查，与 React 配合使用能提升开发体验。',
      category: '前端开发',
      relatedQuestionId: null,
    })

    addLocalWiki({
      userId: 0,
      title: '前后端分离架构',
      content: '# 前后端分离架构\n\n前后端分离是现代 Web 开发的主流架构模式。\n\n## 核心思想\n- 前端独立部署，通过 API 与后端通信\n- 后端使用 Node.js 提供 RESTful 或 GraphQL API\n- 前端使用 React 等框架构建 SPA\n\n## 优势\n- 前后端独立开发和部署\n- 更好的代码复用\n- 更灵活的技术选型\n\n## 常见技术栈\n前端：React + TypeScript，后端：Node.js + tRPC 或 Express',
      summary: '前后端分离架构让前端和后端独立开发部署，前端用 React 构建 SPA，后端通过 API 提供数据。',
      category: '架构设计',
      relatedQuestionId: null,
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
