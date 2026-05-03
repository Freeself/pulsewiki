import { useState, useMemo } from 'react'
import { trpc } from '@/providers/trpc'
import {
  getLocalWikis,
  getLocalQuestions,
  getLocalStats,
  getLocalEdges,
  getLocalRelatedWikis,
  addLocalWiki,
  updateLocalWiki,
  deleteLocalWiki,
  addLocalQuestion,
  deleteLocalQuestion,
  buildLocalNetwork,
  useLocalDataRefresh,
  seedDemoData,
  addLocalEdge,
  updateLocalEdge,
  deleteLocalEdge,
  deleteLocalEdgesForWiki,
  type LocalWiki,
  type LocalWikiEdge,
  type LocalQuestion,
} from './useLocalData'

// Auto-seed demo data on first visit
seedDemoData()

// Check if running in static mode (no backend)
function useBackendAvailable() {
  const ping = trpc.ping.useQuery(undefined, {
    retry: false,
    staleTime: Infinity,
  })
  if (ping.isError) return false
  if (ping.data) return true
  // Still loading - assume backend exists by default
  return ping.isLoading ? true : false
}

// ===== Wikis =====
export function useWikiList(search?: string, category?: string, tag?: string) {
  const backendOk = useBackendAvailable()
  const trpcQuery = trpc.knowledge.listWikis.useQuery(
    { search, category, tag },
    { enabled: backendOk, retry: false }
  )
  const { version } = useLocalDataRefresh()

  const localData = useMemo(() => {
    let wikis = getLocalWikis()
    if (search) {
      const s = search.toLowerCase()
      wikis = wikis.filter(w =>
        w.title.toLowerCase().includes(s) ||
        w.content.toLowerCase().includes(s)
      )
    }
    if (category) {
      wikis = wikis.filter(w => w.category === category)
    }
    if (tag) {
      wikis = wikis.filter(w => {
        if (!w.tags) return false
        try {
          const parsed = JSON.parse(w.tags) as string[]
          return parsed.includes(tag)
        } catch { return false }
      })
    }
    return wikis.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [search, category, tag, backendOk, version])

  if (backendOk && trpcQuery.data) return { data: trpcQuery.data as unknown as LocalWiki[], isLoading: trpcQuery.isLoading, source: 'backend' as const }
  return { data: localData, isLoading: false, source: 'local' as const }
}

export function useWikiTags() {
  const backendOk = useBackendAvailable()
  const trpcQuery = trpc.knowledge.getWikiTags.useQuery(undefined, { enabled: backendOk, retry: false })
  const { version } = useLocalDataRefresh()

  const localTags = useMemo(() => {
    const wikis = getLocalWikis()
    const tagSet = new Set<string>()
    for (const w of wikis) {
      if (!w.tags) continue
      try {
        const parsed = JSON.parse(w.tags) as string[]
        for (const t of parsed) tagSet.add(t)
      } catch { continue }
    }
    return Array.from(tagSet).sort()
  }, [backendOk, version])

  if (backendOk && trpcQuery.data) return trpcQuery.data as string[]
  return localTags
}

export function useWiki(id: number) {
  const backendOk = useBackendAvailable()
  const trpcQuery = trpc.knowledge.getWiki.useQuery({ id }, { enabled: backendOk && !!id, retry: false })
  const { version } = useLocalDataRefresh()

  const localData = useMemo(() => {
    return getLocalWikis().find(w => w.id === id) ?? null
  }, [id, backendOk, version])

  if (backendOk && trpcQuery.data) return { data: trpcQuery.data as unknown as LocalWiki, isLoading: trpcQuery.isLoading }
  return { data: localData, isLoading: false }
}

export function useCreateWiki() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.knowledge.createWiki.useMutation()
  const [pending, setPending] = useState(false)

  const mutate = async (input: { title: string; content: string; summary?: string; category?: string }) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync(input)
      } else {
        addLocalWiki({
          userId: 0,
          title: input.title,
          content: input.content,
          summary: input.summary ?? null,
          category: input.category ?? null,
          relatedQuestionId: null,
        })
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

export function useUpdateWiki() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.knowledge.updateWiki.useMutation()
  const [pending, setPending] = useState(false)
  const { refresh } = useLocalDataRefresh()
  const utils = trpc.useUtils()

  const mutate = async (input: { id: number; title?: string; content?: string; summary?: string; category?: string }) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync(input)
        await utils.knowledge.getWiki.invalidate({ id: input.id })
        await utils.knowledge.listWikis.invalidate()
      } else {
        updateLocalWiki(input.id, input)
        refresh()
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

export function useDeleteWiki() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.knowledge.deleteWiki.useMutation()
  const [pending, setPending] = useState(false)
  const { refresh } = useLocalDataRefresh()
  const utils = trpc.useUtils()

  const mutate = async (id: number) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync({ id })
        await utils.knowledge.listWikis.invalidate()
        await utils.network.getNetwork.invalidate()
      } else {
        deleteLocalWiki(id)
        deleteLocalEdgesForWiki(id)
        refresh()
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

// ===== Questions =====
export function useQuestionList(search?: string) {
  const backendOk = useBackendAvailable()
  const trpcQuery = trpc.knowledge.listQuestions.useQuery(
    { search },
    { enabled: backendOk, retry: false }
  )

  const localData = useMemo(() => {
    let questions = getLocalQuestions()
    if (search) {
      const s = search.toLowerCase()
      questions = questions.filter(q =>
        q.question.toLowerCase().includes(s) ||
        q.answer.toLowerCase().includes(s)
      )
    }
    return questions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [search, backendOk])

  if (backendOk && trpcQuery.data) return { data: trpcQuery.data as unknown as LocalQuestion[], isLoading: trpcQuery.isLoading }
  return { data: localData, isLoading: false }
}

export function useDeleteQuestion() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.knowledge.deleteQuestion.useMutation()
  const [pending, setPending] = useState(false)
  const { refresh } = useLocalDataRefresh()
  const utils = trpc.useUtils()

  const mutate = async (id: number) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync({ id })
        await utils.knowledge.listQuestions.invalidate()
        await utils.knowledge.getStats.invalidate()
      } else {
        deleteLocalQuestion(id)
        refresh()
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

// ===== Stats =====
export function useStats() {
  const backendOk = useBackendAvailable()
  const trpcQuery = trpc.knowledge.getStats.useQuery(undefined, { enabled: backendOk, retry: false })
  useLocalDataRefresh()

  if (backendOk && trpcQuery.data) return trpcQuery.data
  return getLocalStats()
}

// ===== Backfill Embeddings =====
export function useBackfillEmbeddings() {
  const trpcMut = trpc.knowledge.backfillEmbeddings.useMutation()
  return { mutate: trpcMut.mutateAsync, isPending: trpcMut.isPending, data: trpcMut.data }
}

export function useUpdateWikiTags() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.knowledge.updateWikiTags.useMutation()
  const [pending, setPending] = useState(false)
  const { refresh } = useLocalDataRefresh()
  const utils = trpc.useUtils()

  const mutate = async (id: number, tags: string[]) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync({ id, tags })
        await utils.knowledge.getWiki.invalidate({ id })
        await utils.knowledge.listWikis.invalidate()
      } else {
        const wikis = getLocalWikis()
        const idx = wikis.findIndex(w => w.id === id)
        if (idx >= 0) {
          wikis[idx] = { ...wikis[idx], tags: JSON.stringify(tags), updatedAt: new Date() }
          localStorage.setItem('pw_wikis', JSON.stringify(wikis))
        }
        refresh()
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

export function useRegenerateTags() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.knowledge.regenerateTags.useMutation()
  const utils = trpc.useUtils()

  const mutate = async (id: number): Promise<string[]> => {
    if (backendOk) {
      const result = await trpcMut.mutateAsync({ id })
      await utils.knowledge.getWiki.invalidate({ id })
      await utils.knowledge.listWikis.invalidate()
      return (result as { tags: string[] }).tags
    }
    return []
  }

  return { mutate, isPending: trpcMut.isPending }
}

// ===== Knowledge Network =====
export function useNetwork() {
  const backendOk = useBackendAvailable()
  const trpcQuery = trpc.network.getNetwork.useQuery(undefined, { enabled: backendOk, retry: false })
  const { version, refresh } = useLocalDataRefresh()

  const localData = useMemo(() => {
    const wikis = getLocalWikis()
    const edges = getLocalEdges()
    return { nodes: wikis as unknown as LocalWiki[], edges: edges as unknown as LocalWikiEdge[] }
  }, [version])

  if (backendOk && trpcQuery.data) return { data: trpcQuery.data as unknown as { nodes: LocalWiki[]; edges: LocalWikiEdge[] }, isLoading: trpcQuery.isLoading, refetch: trpcQuery.refetch }
  return { data: localData, isLoading: false, refetch: refresh }
}

export function useBuildNetwork() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.network.buildNetwork.useMutation()
  const [pending, setPending] = useState(false)
  const { refresh } = useLocalDataRefresh()

  const mutate = async () => {
    setPending(true)
    try {
      if (backendOk) {
        return await trpcMut.mutateAsync() as unknown as { nodeCount: number; edgeCount: number }
      } else {
        await new Promise(r => setTimeout(r, 600))
        const result = buildLocalNetwork()
        refresh()
        return result
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

export function useRelatedWikis(wikiId: number) {
  const backendOk = useBackendAvailable()
  const trpcQuery = trpc.network.getRelatedWikis.useQuery(
    { wikiId },
    { enabled: backendOk && !!wikiId, retry: false }
  )
  const { version } = useLocalDataRefresh()

  const localData = useMemo(() => {
    return getLocalRelatedWikis(wikiId)
  }, [wikiId, version])

  if (backendOk && trpcQuery.data) return { data: trpcQuery.data as unknown as Array<LocalWiki & { relation: { label: string; strength: number } }>, isLoading: trpcQuery.isLoading }
  return { data: localData, isLoading: false }
}

// ===== AI Ask =====
export function useAsk() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.ai.ask.useMutation()
  const [pending, setPending] = useState(false)

  const mutate = async (input: { question: string }): Promise<{
    answer: string
    source: string
    questionId: number
    hasLocalKnowledge: boolean
  }> => {
    setPending(true)
    try {
      if (backendOk) {
        const result = await trpcMut.mutateAsync(input)
        return result as unknown as { answer: string; source: string; questionId: number; hasLocalKnowledge: boolean }
      } else {
        // Local mode: simulate AI with local knowledge search
        await new Promise(r => setTimeout(r, 800))

        const wikis = getLocalWikis()
        const q = input.question.toLowerCase()

        // Search local knowledge
        const matchedWikis = wikis.filter(w =>
          w.title.toLowerCase().includes(q) || w.content.toLowerCase().includes(q)
        )

        const hasLocal = matchedWikis.length > 0
        let answer = ''
        let source: 'ai' | 'wiki' = 'ai'

        if (hasLocal) {
          source = 'wiki'
          answer = `根据你的知识库，我找到了以下内容：\n\n`
          answer += `**Wiki 条目：**\n`
          for (const w of matchedWikis.slice(0, 3)) {
            answer += `- 《${w.title}》: ${w.summary || w.content.slice(0, 100)}...\n`
          }
          answer += `\n`
          answer += `希望这些信息对你有帮助！如果需要更详细的回答，建议查看完整的 Wiki 条目。`
        } else {
          answer = `我暂时在你的知识库中没有找到关于「${input.question}」的内容。\n\n作为一个离线演示，我无法调用 AI 生成完整回答。你可以：\n\n1. 在 Wiki 中添加相关内容后再提问\n2. 使用全栈部署版本以获得完整的 AI 问答体验`
        }

        const newQ = addLocalQuestion({
          userId: 0,
          question: input.question,
          answer,
          source,
          sourceIds: null,
          isConvertedToWiki: 'no',
        })

        return { answer, source, questionId: newQ.id, hasLocalKnowledge: hasLocal }
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

// Convert to Wiki
export function useConvertToWiki() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.ai.convertToWiki.useMutation()
  const [pending, setPending] = useState(false)
  const { refresh } = useLocalDataRefresh()
  const utils = trpc.useUtils()

  const mutate = async (questionId: number) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync({ questionId })
        await utils.knowledge.listQuestions.invalidate()
        await utils.knowledge.listWikis.invalidate()
        await utils.knowledge.getStats.invalidate()
      } else {
        const questions = getLocalQuestions()
        const q = questions.find(q2 => q2.id === questionId)
        if (q) {
          addLocalWiki({
            userId: 0,
            title: q.question.length > 80 ? q.question.slice(0, 80) + '...' : q.question,
            content: q.answer,
            summary: q.answer.slice(0, 200),
            category: 'AI Generated',
            relatedQuestionId: q.id,
          })
          const idx = questions.findIndex(q2 => q2.id === questionId)
          if (idx >= 0) {
            questions[idx] = { ...questions[idx], isConvertedToWiki: 'yes' as const }
            localStorage.setItem('pw_questions', JSON.stringify(questions))
          }
        }
        refresh()
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

// Auto organize
export function useAutoOrganize() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.ai.autoOrganize.useMutation()
  const [pending, setPending] = useState(false)
  const { refresh } = useLocalDataRefresh()
  const utils = trpc.useUtils()

  const mutate = async () => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync()
        await utils.knowledge.listQuestions.invalidate()
        await utils.knowledge.listWikis.invalidate()
        await utils.knowledge.getStats.invalidate()
      } else {
        const questions = getLocalQuestions().filter(q => q.isConvertedToWiki === 'no' && q.source === 'ai')
        for (const q of questions.slice(0, 10)) {
          addLocalWiki({
            userId: 0,
            title: q.question.length > 80 ? q.question.slice(0, 80) + '...' : q.question,
            content: q.answer,
            summary: q.answer.slice(0, 200),
            category: 'AI Generated',
            relatedQuestionId: q.id,
          })
        }
        // Mark all as converted
        const all = getLocalQuestions()
        for (const q of all) {
          if (q.isConvertedToWiki === 'no') {
            q.isConvertedToWiki = 'yes' as const
          }
        }
        localStorage.setItem('pw_questions', JSON.stringify(all))
        refresh()
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

// ===== Edge CRUD =====
export function useWikiEdges(wikiId: number) {
  const backendOk = useBackendAvailable()
  const trpcQuery = trpc.network.getWikiEdges.useQuery(
    { wikiId },
    { enabled: backendOk && !!wikiId, retry: false }
  )
  const { version, refresh } = useLocalDataRefresh()

  const localData = useMemo(() => {
    const edges = getLocalEdges()
    const wikis = getLocalWikis()
    const wikiMap = new Map(wikis.map(w => [w.id, w.title]))
    return edges
      .filter(e => e.sourceWikiId === wikiId || e.targetWikiId === wikiId)
      .map(e => ({
        ...e,
        connectedWikiId: e.sourceWikiId === wikiId ? e.targetWikiId : e.sourceWikiId,
        connectedWikiTitle: wikiMap.get(e.sourceWikiId === wikiId ? e.targetWikiId : e.sourceWikiId) ?? '未知',
      }))
  }, [wikiId, version])

  if (backendOk && trpcQuery.data) return { data: trpcQuery.data as any[], isLoading: trpcQuery.isLoading, refetch: trpcQuery.refetch }
  return { data: localData, isLoading: false, refetch: refresh }
}

export function useCreateEdge() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.network.createEdge.useMutation()
  const [pending, setPending] = useState(false)
  const { refresh } = useLocalDataRefresh()

  const mutate = async (input: { sourceWikiId: number; targetWikiId: number; label: string; strength: number }) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync(input)
      } else {
        addLocalEdge({
          userId: 0,
          sourceWikiId: input.sourceWikiId,
          targetWikiId: input.targetWikiId,
          label: input.label,
          strength: String(input.strength),
        })
        refresh()
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

export function useUpdateEdge() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.network.updateEdge.useMutation()
  const [pending, setPending] = useState(false)
  const { refresh } = useLocalDataRefresh()

  const mutate = async (input: { id: number; label?: string; strength?: number }) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync(input)
      } else {
        updateLocalEdge(input.id, { label: input.label, strength: input.strength !== undefined ? String(input.strength) : undefined } as any)
        refresh()
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

export function useDeleteEdge() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.network.deleteEdge.useMutation()
  const [pending, setPending] = useState(false)
  const { refresh } = useLocalDataRefresh()

  const mutate = async (id: number) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync({ id })
      } else {
        deleteLocalEdge(id)
        refresh()
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

// ===== AI Config =====
export function useConfigList() {
  const backendOk = useBackendAvailable()
  const trpcQuery = trpc.config.list.useQuery(undefined, { enabled: backendOk, retry: false })
  if (backendOk && trpcQuery.data) return { data: trpcQuery.data as import('@db/schema').AiConfig[], isLoading: trpcQuery.isLoading }
  return { data: [] as import('@db/schema').AiConfig[], isLoading: false }
}

export function useCreateConfig() {
  const trpcMut = trpc.config.create.useMutation()
  const utils = trpc.useUtils()
  const mutate = async (input: Parameters<typeof trpcMut.mutateAsync>[0]) => {
    const result = await trpcMut.mutateAsync(input)
    await utils.config.list.invalidate()
    return result
  }
  return { mutate, isPending: trpcMut.isPending }
}

export function useUpdateConfig() {
  const trpcMut = trpc.config.update.useMutation()
  const utils = trpc.useUtils()
  const mutate = async (input: Parameters<typeof trpcMut.mutateAsync>[0]) => {
    const result = await trpcMut.mutateAsync(input)
    await utils.config.list.invalidate()
    return result
  }
  return { mutate, isPending: trpcMut.isPending }
}

export function useDeleteConfig() {
  const trpcMut = trpc.config.delete.useMutation()
  const utils = trpc.useUtils()
  const mutate = async (id: number) => {
    await trpcMut.mutateAsync({ id })
    await utils.config.list.invalidate()
  }
  return { mutate, isPending: trpcMut.isPending }
}

export function useActivateConfig() {
  const trpcMut = trpc.config.activate.useMutation()
  const utils = trpc.useUtils()
  const mutate = async (id: number) => {
    await trpcMut.mutateAsync({ id })
    await utils.config.list.invalidate()
  }
  return { mutate, isPending: trpcMut.isPending }
}

export function useDeactivateAllConfig() {
  const trpcMut = trpc.config.deactivateAll.useMutation()
  const utils = trpc.useUtils()
  const mutate = async () => {
    await trpcMut.mutateAsync()
    await utils.config.list.invalidate()
  }
  return { mutate, isPending: trpcMut.isPending }
}
