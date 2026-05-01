import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import Navbar from '@/components/Navbar'
import { useNoteList, useCreateNote, useDeleteNote } from '@/hooks/useUnifiedData'
import {
  StickyNote,
  Search,
  Plus,
  Loader2,
  Trash2,
  Clock,
  FileText,
} from 'lucide-react'

export default function Notes() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])
  const { data: notes, isLoading } = useNoteList(search || undefined)
  const createMut = useCreateNote()
  const deleteMut = useDeleteNote()

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return
    await createMut.mutate({ title: newTitle.trim(), content: newContent.trim() })
    setShowCreate(false)
    setNewTitle('')
    setNewContent('')
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <StickyNote className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">我的笔记</h1>
              <p className="text-xs text-neutral-500">记录你的想法和灵感</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/20 text-blue-300 text-sm hover:bg-blue-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            新建
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索笔记..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#171717] border border-white/5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-blue-500/30 transition-all"
          />
        </div>

        {showCreate && (
          <div className="glass-panel rounded-2xl p-5 mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <h3 className="text-sm font-medium text-white mb-4">新建笔记</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="标题"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f0f] border border-white/5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-blue-500/30 transition-all"
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="内容（支持 Markdown）"
                rows={8}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f0f] border border-white/5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-blue-500/30 transition-all resize-none"
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
                  className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '创建'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : notes && notes.length > 0 ? (
          <div key={refreshKey} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group glass-panel rounded-xl p-4 hover:border-blue-500/20 transition-all cursor-pointer"
                onClick={() => navigate(`/notes/${note.id}`)}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-sm font-medium text-white truncate flex-1">{note.title}</h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-neutral-500 line-clamp-3 mb-3">{note.content.slice(0, 200)}</p>
                <div className="flex items-center gap-1 text-[10px] text-neutral-600">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(note.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500 text-sm">{search ? '没有找到匹配的笔记' : '暂无笔记'}</p>
            {!search && (
              <button onClick={() => setShowCreate(true)} className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-all">
                创建第一个笔记
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
