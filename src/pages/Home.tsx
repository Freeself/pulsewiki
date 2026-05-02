import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import Navbar from '@/components/Navbar'
import CanvasBackground from '@/components/CanvasBackground'
import { useStats, useAsk, useConvertToWiki } from '@/hooks/useUnifiedData'
import {
  Send,
  Brain,
  BookOpen,
  Share2,
  MessageSquare,
  Loader2,
  Sparkles,
  ArrowRight,
  Zap,
  Database,
} from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const [currentAnswer, setCurrentAnswer] = useState<{
    answer: string
    source: string
    questionId: number
    hasLocalKnowledge: boolean
  } | null>(null)
  const [showConvertOptions, setShowConvertOptions] = useState(false)
  const answerRef = useRef<HTMLDivElement>(null)

  const stats = useStats()
  const askMutation = useAsk()
  const convertToWikiMut = useConvertToWiki()

  const handleAsk = async () => {
    if (!question.trim() || askMutation.isPending) return
    setCurrentAnswer(null)
    setShowConvertOptions(false)

    const result = await askMutation.mutate({ question: question.trim() })
    if (result) {
      setCurrentAnswer(result)
      setShowConvertOptions(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  useEffect(() => {
    if (currentAnswer && answerRef.current) {
      answerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [currentAnswer])

  const sourceLabels: Record<string, { text: string; color: string; icon: typeof Brain }> = {
    ai: { text: 'AI 生成', color: 'text-blue-400', icon: Sparkles },
    wiki: { text: '来自 Wiki', color: 'text-purple-400', icon: BookOpen },
    hybrid: { text: '知识融合', color: 'text-amber-400', icon: Zap },
  }

  return (
    <div className="min-h-screen relative">
      <CanvasBackground />
      <Navbar />

      <div className="relative z-10 pt-24 pb-16 px-4 flex flex-col items-center min-h-screen">
        {/* Hero Section */}
        <div className="text-center mb-10 max-w-2xl">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Brain className="w-6 h-6 text-purple-400" />
            <span className="text-xs font-medium text-purple-400 tracking-widest uppercase">
              AI 知识引擎
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            你的<span className="text-gradient">智能知识库</span>
          </h1>
          <p className="text-neutral-400 text-sm leading-relaxed">
            提问任何问题，AI 会先在 Wiki 中搜索答案。如果没有找到，会自动为你生成回答，并可以一键整理到知识库。
          </p>
        </div>

        {/* AI Input Terminal */}
        <div className="w-full max-w-2xl mb-8">
          <div className="glow-border rounded-2xl p-1">
            <div className="bg-[#0f0f0f]/90 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="向 AI 提问任何事情..."
                    rows={2}
                    className="w-full bg-transparent text-sm text-white placeholder:text-neutral-600 resize-none outline-none leading-relaxed"
                  />
                </div>
                <button
                  onClick={handleAsk}
                  disabled={askMutation.isPending || !question.trim()}
                  className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {askMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Status indicators */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <Database className="w-3 h-3" />
                  <span>已索引 {stats?.wikis ?? 0} 个 Wiki</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {askMutation.isPending && (
          <div className="w-full max-w-2xl flex items-center gap-4 py-8 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
            <div>
              <p className="text-sm text-purple-300 font-medium">正在搜索你的知识库...</p>
              <p className="text-xs text-neutral-500 mt-0.5">AI 正在 Wiki 中查找相关答案</p>
            </div>
          </div>
        )}

        {/* Answer Display */}
        {currentAnswer && (
          <div ref={answerRef} className="w-full max-w-2xl mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-panel rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {(() => {
                    const s = sourceLabels[currentAnswer.source] ?? sourceLabels.ai
                    const Icon = s.icon
                    return (
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${s.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {s.text}
                      </span>
                    )
                  })()}
                  {currentAnswer.hasLocalKnowledge && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                      已找到相关知识
                    </span>
                  )}
                </div>
              </div>

              <div className="prose prose-invert prose-sm max-w-none">
                <div className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
                  {currentAnswer.answer}
                </div>
              </div>

              {showConvertOptions && (
                <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap gap-3">
                  <button
                    onClick={() => currentAnswer && convertToWikiMut.mutate(currentAnswer.questionId)}
                    disabled={convertToWikiMut.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/15 text-purple-300 text-xs font-medium hover:bg-purple-500/25 transition-all disabled:opacity-40"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {convertToWikiMut.isPending ? '处理中...' : '存入 Wiki'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/wiki')}
            className="group glass-panel rounded-xl p-4 text-left hover:border-purple-500/30 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-purple-400" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-purple-400 transition-all group-hover:translate-x-0.5" />
            </div>
            <p className="text-sm font-medium text-white">浏览 Wiki</p>
            <p className="text-xs text-neutral-500 mt-0.5">{stats?.wikis ?? 0} 个条目</p>
          </button>

          <button
            onClick={() => navigate('/network')}
            className="group glass-panel rounded-xl p-4 text-left hover:border-cyan-500/30 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                <Share2 className="w-4 h-4 text-cyan-400" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-cyan-400 transition-all group-hover:translate-x-0.5" />
            </div>
            <p className="text-sm font-medium text-white">知识网络</p>
            <p className="text-xs text-neutral-500 mt-0.5">可视化知识关联</p>
          </button>

          <button
            onClick={() => navigate('/questions')}
            className="group glass-panel rounded-xl p-4 text-left hover:border-amber-500/30 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-amber-400" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-amber-400 transition-all group-hover:translate-x-0.5" />
            </div>
            <p className="text-sm font-medium text-white">问答历史</p>
            <p className="text-xs text-neutral-500 mt-0.5">{stats?.questions ?? 0} 条记录</p>
          </button>
        </div>
      </div>
    </div>
  )
}
