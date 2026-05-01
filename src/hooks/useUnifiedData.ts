import { useState, useMemo } from 'react'
import { trpc } from '@/providers/trpc'
import {
  getLocalWikis,
  getLocalNotes,
  getLocalQuestions,
  getLocalStats,
  addLocalWiki,
  updateLocalWiki,
  deleteLocalWiki,
  addLocalNote,
  updateLocalNote,
  deleteLocalNote,
  addLocalQuestion,
  deleteLocalQuestion,
  seedDemoData,
  type LocalWiki,
  type LocalNote,
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
export function useWikiList(search?: string, category?: string) {
  const backendOk = useBackendAvailable()
  const trpcQuery = trpc.knowledge.listWikis.useQuery(
    { search, category },
    { enabled: backendOk, retry: false }
  )

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
    return wikis.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [search, category, backendOk])

  if (backendOk && trpcQuery.data) return { data: trpcQuery.data as unknown as LocalWiki[], isLoading: trpcQuery.isLoading, source: 'backend' as const }
  return { data: localData, isLoading: false, source: 'local' as const }
}

export function useWiki(id: number) {
  const backendOk = useBackendAvailable()
  const trpcQuery = trpc.knowledge.getWiki.useQuery({ id }, { enabled: backendOk && !!id, retry: false })

  const localData = useMemo(() => {
    return getLocalWikis().find(w => w.id === id) ?? null
  }, [id, backendOk])

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

  const mutate = async (input: { id: number; title?: string; content?: string; summary?: string; category?: string }) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync(input)
      } else {
        updateLocalWiki(input.id, input)
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

  const mutate = async (id: number) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync({ id })
      } else {
        deleteLocalWiki(id)
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

// ===== Notes =====
export function useNoteList(search?: string) {
  const backendOk = useBackendAvailable()
  const trpcQuery = trpc.knowledge.listNotes.useQuery(
    { search },
    { enabled: backendOk, retry: false }
  )

  const localData = useMemo(() => {
    let notes = getLocalNotes()
    if (search) {
      const s = search.toLowerCase()
      notes = notes.filter(n =>
        n.title.toLowerCase().includes(s) ||
        n.content.toLowerCase().includes(s)
      )
    }
    return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [search, backendOk])

  if (backendOk && trpcQuery.data) return { data: trpcQuery.data as unknown as LocalNote[], isLoading: trpcQuery.isLoading, source: 'backend' as const }
  return { data: localData, isLoading: false, source: 'local' as const }
}

export function useNote(id: number) {
  const backendOk = useBackendAvailable()
  const trpcQuery = trpc.knowledge.getNote.useQuery({ id }, { enabled: backendOk && !!id, retry: false })

  const localData = useMemo(() => {
    return getLocalNotes().find(n => n.id === id) ?? null
  }, [id, backendOk])

  if (backendOk && trpcQuery.data) return { data: trpcQuery.data as unknown as LocalNote, isLoading: trpcQuery.isLoading }
  return { data: localData, isLoading: false }
}

export function useCreateNote() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.knowledge.createNote.useMutation()
  const [pending, setPending] = useState(false)

  const mutate = async (input: { title: string; content: string }) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync(input)
      } else {
        addLocalNote({ userId: 0, title: input.title, content: input.content })
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

export function useUpdateNote() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.knowledge.updateNote.useMutation()
  const [pending, setPending] = useState(false)

  const mutate = async (input: { id: number; title?: string; content?: string }) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync(input)
      } else {
        updateLocalNote(input.id, input)
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

export function useDeleteNote() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.knowledge.deleteNote.useMutation()
  const [pending, setPending] = useState(false)

  const mutate = async (id: number) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync({ id })
      } else {
        deleteLocalNote(id)
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

  const mutate = async (id: number) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync({ id })
      } else {
        deleteLocalQuestion(id)
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

  if (backendOk && trpcQuery.data) return trpcQuery.data
  return getLocalStats()
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
        const notes = getLocalNotes()
        const q = input.question.toLowerCase()

        // Search local knowledge
        const matchedWikis = wikis.filter(w =>
          w.title.toLowerCase().includes(q) || w.content.toLowerCase().includes(q)
        )
        const matchedNotes = notes.filter(n =>
          n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
        )

        const hasLocal = matchedWikis.length > 0 || matchedNotes.length > 0
        let answer = ''
        let source: 'ai' | 'wiki' | 'note' | 'hybrid' = 'ai'

        if (hasLocal) {
          source = matchedWikis.length > 0 && matchedNotes.length > 0 ? 'hybrid' :
                   matchedWikis.length > 0 ? 'wiki' : 'note'
          answer = `根据你的知识库，我找到了以下内容：\n\n`
          if (matchedWikis.length > 0) {
            answer += `**Wiki 条目：**\n`
            for (const w of matchedWikis.slice(0, 3)) {
              answer += `- 《${w.title}》: ${w.summary || w.content.slice(0, 100)}...\n`
            }
            answer += `\n`
          }
          if (matchedNotes.length > 0) {
            answer += `**相关笔记：**\n`
            for (const n of matchedNotes.slice(0, 3)) {
              answer += `- ${n.title}: ${n.content.slice(0, 100)}...\n`
            }
            answer += `\n`
          }
          answer += `希望这些信息对你有帮助！如果需要更详细的回答，建议查看完整的 Wiki 条目。`
        } else {
          answer = `我暂时在你的知识库中没有找到关于「${input.question}」的内容。\n\n作为一个离线演示，我无法调用 AI 生成完整回答。你可以：\n\n1. 在 Wiki 或笔记中添加相关内容后再提问\n2. 使用全栈部署版本以获得完整的 AI 问答体验`
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

  const mutate = async (questionId: number) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync({ questionId })
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
          // Mark as converted
          const idx = questions.findIndex(q2 => q2.id === questionId)
          if (idx >= 0) {
            questions[idx] = { ...questions[idx], isConvertedToWiki: 'yes' as const }
            localStorage.setItem('pw_questions', JSON.stringify(questions))
          }
        }
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}

// Convert to Note
export function useConvertToNote() {
  const backendOk = useBackendAvailable()
  const trpcMut = trpc.ai.convertToNote.useMutation()
  const [pending, setPending] = useState(false)

  const mutate = async (questionId: number) => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync({ questionId })
      } else {
        const questions = getLocalQuestions()
        const q = questions.find(q2 => q2.id === questionId)
        if (q) {
          addLocalNote({
            userId: 0,
            title: q.question.length > 80 ? q.question.slice(0, 80) + '...' : q.question,
            content: q.answer,
          })
        }
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

  const mutate = async () => {
    setPending(true)
    try {
      if (backendOk) {
        await trpcMut.mutateAsync()
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
      }
    } finally {
      setPending(false)
    }
  }

  return { mutate, isPending: pending || trpcMut.isPending }
}
