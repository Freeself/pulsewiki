import { useState } from 'react'
import { useNavigate } from 'react-router'
import Navbar from '@/components/Navbar'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useQuestionList, useDeleteQuestion, useConvertToWiki, useAutoOrganize } from '@/hooks/useUnifiedData'
import {
  MessageSquare,
  Search,
  Loader2,
  Trash2,
  Clock,
  Sparkles,
  BookOpen,
  Zap,
  ArrowRight,
  Wand2,
  Brain,
} from 'lucide-react'

export default function Questions() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: questions, isLoading } = useQuestionList(search || undefined)
  const deleteMut = useDeleteQuestion()
  const convertWikiMut = useConvertToWiki()
  const autoOrgMut = useAutoOrganize()

  const handleDelete = async (id: number) => {
    await deleteMut.mutate(id)
  }

  const handleConvertWiki = async (id: number) => {
    await convertWikiMut.mutate(id)
  }

  const handleAutoOrganize = async () => {
    await autoOrgMut.mutate()
  }

  const sourceConfig: Record<string, { color: string; bg: string; icon: typeof Sparkles; label: string }> = {
    ai: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Sparkles, label: 'AI' },
    wiki: { color: 'text-purple-400', bg: 'bg-purple-500/10', icon: BookOpen, label: 'Wiki' },
    hybrid: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Zap, label: '融合' },
  }

  const unconvertedCount = questions?.filter(q => q.isConvertedToWiki === 'no').length ?? 0

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">问答历史</h1>
              <p className="text-xs text-neutral-500">你与 AI 的所有对话记录</p>
            </div>
          </div>
          {unconvertedCount > 0 && (
            <button
              onClick={handleAutoOrganize}
              disabled={autoOrgMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 text-sm hover:bg-purple-500/30 transition-all disabled:opacity-40"
            >
              {autoOrgMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              自动整理 {unconvertedCount} 条到 Wiki
            </button>
          )}
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索问答记录..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#171717] border border-white/5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-amber-500/30 transition-all"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          </div>
        ) : questions && questions.length > 0 ? (
          <div className="space-y-3">
            {questions.map((q) => {
              const cfg = sourceConfig[q.source] ?? sourceConfig.ai
              const Icon = cfg.icon
              const isExpanded = expandedId === q.id

              return (
                <div key={q.id} className="glass-panel rounded-xl overflow-hidden transition-all">
                  <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : q.id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                            <Icon className="w-2.5 h-2.5" />
                            {cfg.label}
                          </span>
                          {q.isConvertedToWiki === 'yes' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">已整理</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-white">{q.question}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-neutral-600">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(q.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(q.id) }}
                          className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <ArrowRight className={`w-3.5 h-3.5 text-neutral-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/5 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.answer}</ReactMarkdown>
                      </div>
                      {q.isConvertedToWiki === 'no' && (
                        <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                          <button
                            onClick={() => handleConvertWiki(q.id)}
                            disabled={convertWikiMut.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-300 text-xs hover:bg-purple-500/25 transition-all disabled:opacity-40"
                          >
                            <BookOpen className="w-3 h-3" />
                            存入 Wiki
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Brain className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500 text-sm">{search ? '没有找到匹配的问答' : '暂无问答记录'}</p>
            {!search && (
              <button onClick={() => navigate('/')} className="mt-4 text-sm text-amber-400 hover:text-amber-300 transition-all">
                去提问
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
