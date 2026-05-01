import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import Navbar from '@/components/Navbar'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNote, useUpdateNote, useDeleteNote } from '@/hooks/useUnifiedData'
import {
  ArrowLeft,
  Loader2,
  Edit3,
  Trash2,
  Save,
  X,
  StickyNote,
  Clock,
} from 'lucide-react'

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const noteId = Number(id)

  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  const { data: note, isLoading } = useNote(noteId)
  const updateMut = useUpdateNote()
  const deleteMut = useDeleteNote()

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  const startEdit = () => {
    if (note) {
      setEditTitle(note.title)
      setEditContent(note.content)
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) return
    await updateMut.mutate({ id: noteId, title: editTitle.trim(), content: editContent.trim() })
    setIsEditing(false)
    refresh()
  }

  const handleDelete = async () => {
    await deleteMut.mutate(noteId)
    navigate('/notes')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <div className="text-center">
            <StickyNote className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-400">笔记不存在</p>
            <button
              onClick={() => navigate('/notes')}
              className="mt-4 flex items-center gap-1.5 mx-auto px-4 py-2 rounded-xl bg-blue-500/20 text-blue-300 text-sm hover:bg-blue-500/30 transition-all"
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
            onClick={() => navigate('/notes')}
            className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-300 text-xs hover:bg-blue-500/25 transition-all"
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
                className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f0f] border border-white/5 text-sm text-white font-medium outline-none focus:border-blue-500/30 transition-all"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={16}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f0f] border border-white/5 text-sm text-white outline-none focus:border-blue-500/30 transition-all resize-none font-mono leading-relaxed"
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {updateMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  保存
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div key={refreshKey} className="glass-panel rounded-2xl p-6 sm:p-8">
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-4">{note.title}</h1>
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
            </div>
            <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-1 text-[10px] text-neutral-600">
              <Clock className="w-2.5 h-2.5" />
              最后更新：{new Date(note.updatedAt).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
