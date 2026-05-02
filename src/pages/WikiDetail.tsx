import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import Navbar from '@/components/Navbar'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useWiki, useUpdateWiki, useDeleteWiki, useRelatedWikis, useUpdateWikiTags, useRegenerateTags } from '@/hooks/useUnifiedData'
import {
  ArrowLeft,
  Loader2,
  Edit3,
  Trash2,
  Save,
  X,
  BookOpen,
  Tag,
  Clock,
  Link2,
  Plus,
  Sparkles,
} from 'lucide-react'

export default function WikiDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const wikiId = Number(id)

  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  const { data: wiki, isLoading } = useWiki(wikiId)
  const { data: relatedWikis } = useRelatedWikis(wikiId)
  const updateMut = useUpdateWiki()
  const deleteMut = useDeleteWiki()
  const updateTagsMut = useUpdateWikiTags()
  const regenerateTagsMut = useRegenerateTags()

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editCategory, setEditCategory] = useState('')

  // Tag editing state
  const [isEditingTags, setIsEditingTags] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [editingTags, setEditingTags] = useState<string[]>([])

  const parseTags = (tagsStr?: string | null): string[] => {
    if (!tagsStr) return []
    try { return JSON.parse(tagsStr) as string[] } catch { return [] }
  }

  const currentTags = parseTags(wiki?.tags)

  const startTagEdit = () => {
    setEditingTags([...currentTags])
    setIsEditingTags(true)
    setTagInput('')
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !editingTags.includes(tag) && tag.length <= 20) {
      setEditingTags([...editingTags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setEditingTags(editingTags.filter(t => t !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const saveTags = async () => {
    await updateTagsMut.mutate(wikiId, editingTags)
    setIsEditingTags(false)
    refresh()
  }

  const handleRegenerateTags = async () => {
    const tags = await regenerateTagsMut.mutate(wikiId)
    if (tags.length > 0) {
      await updateTagsMut.mutate(wikiId, tags)
      refresh()
    }
  }

  const startEdit = () => {
    if (wiki) {
      setEditTitle(wiki.title)
      setEditContent(wiki.content)
      setEditCategory(wiki.category || '')
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) return
    await updateMut.mutate({
      id: wikiId,
      title: editTitle.trim(),
      content: editContent.trim(),
      category: editCategory.trim() || undefined,
    })
    setIsEditing(false)
    refresh()
  }

  const handleDelete = async () => {
    await deleteMut.mutate(wikiId)
    navigate('/wiki')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (!wiki) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <div className="text-center">
            <BookOpen className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-400">Wiki 条目不存在</p>
            <button
              onClick={() => navigate('/wiki')}
              className="mt-4 flex items-center gap-1.5 mx-auto px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 text-sm hover:bg-purple-500/30 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              返回列表
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/wiki')}
            className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-300 text-xs hover:bg-purple-500/25 transition-all"
              >
                <Edit3 className="w-3 h-3" />
                编辑
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs hover:bg-red-500/25 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                删除
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="glass-panel rounded-2xl p-5">
            <div className="space-y-3">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f0f] border border-white/5 text-sm text-white font-medium outline-none focus:border-purple-500/30 transition-all"
              />
              <input
                type="text"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                placeholder="分类"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f0f] border border-white/5 text-sm text-white outline-none focus:border-purple-500/30 transition-all"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={16}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f0f] border border-white/5 text-sm text-white outline-none focus:border-purple-500/30 transition-all resize-none font-mono leading-relaxed"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMut.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 text-white text-sm hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {updateMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  保存
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div key={refreshKey} className="glass-panel rounded-2xl p-6 sm:p-8">
            {wiki.category && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 flex items-center gap-1 inline-flex mb-4">
                <Tag className="w-3 h-3" />
                {wiki.category}
              </span>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-3">{wiki.title}</h1>

            {/* Tags Section */}
            <div className="mb-6">
              {isEditingTags ? (
                <div className="flex flex-wrap items-center gap-2">
                  {editingTags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300"
                    >
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="输入标签"
                      maxLength={20}
                      className="w-24 px-2 py-0.5 rounded-lg bg-[#0f0f0f] border border-white/10 text-[11px] text-white outline-none focus:border-cyan-500/30 transition-all"
                    />
                    <button
                      onClick={addTag}
                      disabled={!tagInput.trim()}
                      className="p-0.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-30 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      onClick={saveTags}
                      disabled={updateTagsMut.isPending}
                      className="p-1 rounded-lg bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-40 transition-all"
                    >
                      {updateTagsMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => setIsEditingTags(false)}
                      className="p-1 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {currentTags.length > 0 ? (
                    currentTags.map((tag) => (
                      <span
                        key={tag}
                        onClick={() => navigate(`/wiki?tag=${encodeURIComponent(tag)}`)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 cursor-pointer hover:bg-cyan-500/20 transition-all"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-neutral-600">暂无标签</span>
                  )}
                  <button
                    onClick={startTagEdit}
                    className="p-1 rounded-lg text-neutral-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                    title="编辑标签"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleRegenerateTags}
                    disabled={regenerateTagsMut.isPending}
                    className="p-1 rounded-lg text-neutral-600 hover:text-amber-400 hover:bg-amber-500/10 disabled:opacity-40 transition-all"
                    title="AI 自动生成标签"
                  >
                    {regenerateTagsMut.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {wiki.summary && (
              <p className="text-sm text-neutral-400 italic mb-6 pb-4 border-b border-white/5">
                {wiki.summary}
              </p>
            )}
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {wiki.content}
              </ReactMarkdown>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-1 text-[10px] text-neutral-600">
              <Clock className="w-2.5 h-2.5" />
              最后更新：{new Date(wiki.updatedAt).toLocaleString()}
            </div>

            {relatedWikis && relatedWikis.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/5">
                <h3 className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  相关知识条目
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {relatedWikis.map((related) => (
                    <button
                      key={related.id}
                      onClick={() => {
                        navigate(`/wiki/${related.id}`)
                        refresh()
                      }}
                      className="text-left p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-500/30 transition-all"
                    >
                      <p className="text-xs font-medium text-white truncate">{related.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {related.category && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                            {related.category}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                          {related.relation.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
