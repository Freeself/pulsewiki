import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import Navbar from '@/components/Navbar'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useWiki, useUpdateWiki, useDeleteWiki, useRelatedWikis } from '@/hooks/useUnifiedData'
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

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editCategory, setEditCategory] = useState('')

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
