import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import Navbar from '@/components/Navbar'
import { useWikiList, useCreateWiki, useDeleteWiki, useBackfillEmbeddings, useWikiTags } from '@/hooks/useUnifiedData'
import {
  BookOpen,
  Search,
  Plus,
  Loader2,
  Trash2,
  X,
  Clock,
  Tag,
  FileText,
  Zap,
  Sparkles,
} from 'lucide-react'

export default function Wiki() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const { data: wikis, isLoading } = useWikiList(search || undefined, undefined, selectedTag || undefined)
  const allTags = useWikiTags()
  const createMut = useCreateWiki()
  const deleteMut = useDeleteWiki()
  const backfillMut = useBackfillEmbeddings()
  const [backfillResult, setBackfillResult] = useState<{ updated: number; total: number } | null>(null)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return
    await createMut.mutate({
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory.trim() || undefined,
    })
    setShowCreate(false)
    setNewTitle('')
    setNewContent('')
    setNewCategory('')
    refresh()
  }

  const handleDelete = async (id: number) => {
    await deleteMut.mutate(id)
    refresh()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Wiki 知识库</h1>
              <p className="text-xs text-neutral-500">管理你的知识条目</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setBackfillResult(null)
                const result = await backfillMut.mutate()
                setBackfillResult(result as { updated: number; total: number })
              }}
              disabled={backfillMut.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 text-amber-300 text-xs hover:bg-amber-500/25 transition-all disabled:opacity-40"
            >
              {backfillMut.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              向量化
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 text-sm hover:bg-purple-500/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              新建
            </button>
          </div>
        </div>

        {/* Backfill Result */}
        {backfillResult && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-400 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            向量化完成：已更新 {backfillResult.updated} / {backfillResult.total} 个条目
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索 Wiki..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#171717] border border-white/5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-purple-500/30 transition-all"
          />
        </div>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-all"
              >
                <X className="w-3 h-3" />
                {selectedTag}
              </button>
            )}
            {allTags
              .filter((t) => t !== selectedTag)
              .map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.03] text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.06] transition-all"
                >
                  {tag}
                </button>
              ))}
          </div>
        )}

        {/* Create Form */}
        {showCreate && (
          <div className="glass-panel rounded-2xl p-5 mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <h3 className="text-sm font-medium text-white mb-4">新建 Wiki 条目</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="标题"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f0f] border border-white/5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-purple-500/30 transition-all"
              />
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="分类（可选）"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f0f] border border-white/5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-purple-500/30 transition-all"
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="内容（支持 Markdown）"
                rows={6}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f0f] border border-white/5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-purple-500/30 transition-all resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-xl text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createMut.isPending || !newTitle.trim() || !newContent.trim()}
                  className="px-4 py-2 rounded-xl bg-purple-500 text-white text-sm hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '创建'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wiki List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : wikis && wikis.length > 0 ? (
          <div key={refreshKey} className="space-y-3">
            {wikis.map((wiki) => (
              <div
                key={wiki.id}
                className="group glass-panel rounded-xl p-4 hover:border-purple-500/20 transition-all cursor-pointer"
                onClick={() => navigate(`/wiki/${wiki.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-sm font-medium text-white truncate">{wiki.title}</h3>
                      {wiki.category && (
                        <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />
                          {wiki.category}
                        </span>
                      )}
                      {wiki.embedding ? (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 flex items-center gap-0.5" title="已向量化">
                          <Sparkles className="w-2.5 h-2.5" />
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-600 flex items-center gap-0.5" title="未向量化">
                          <Sparkles className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    {wiki.summary && (
                      <p className="text-xs text-neutral-500 line-clamp-2 mb-2">{wiki.summary}</p>
                    )}
                    {wiki.tags && (() => {
                      try {
                        const parsed = JSON.parse(wiki.tags) as string[]
                        return parsed.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {parsed.map((t) => (
                              <span
                                key={t}
                                onClick={(e) => { e.stopPropagation(); setSelectedTag(t) }}
                                className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 cursor-pointer hover:bg-cyan-500/20 transition-all"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null
                      } catch { return null }
                    })()}
                    <div className="flex items-center gap-3 text-[10px] text-neutral-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(wiki.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(wiki.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500 text-sm">
              {search ? '没有找到匹配的 Wiki' : '暂无 Wiki 条目'}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 text-sm text-purple-400 hover:text-purple-300 transition-all"
              >
                创建第一个 Wiki
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
