import { useState } from 'react'
import Navbar from '@/components/Navbar'
import { useConfigList, useCreateConfig, useUpdateConfig, useDeleteConfig, useActivateConfig, useDeactivateAllConfig } from '@/hooks/useUnifiedData'
import type { AiConfig } from '@db/schema'
import {
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Edit3,
  Power,
  Loader2,
  X,
  Save,
  Check,
  Link2,
  Sparkles,
  Search,
} from 'lucide-react'

type ConfigForm = {
  name: string
  aiBaseUrl: string
  aiApiKey: string
  aiModel: string
  aiEmbeddingBaseUrl: string
  aiEmbeddingApiKey: string
  aiEmbeddingModel: string
  embeddingApiFormat: 'openai' | 'dashscope'
  embeddingThreshold: string
}

const emptyForm: ConfigForm = {
  name: '',
  aiBaseUrl: '',
  aiApiKey: '',
  aiModel: '',
  aiEmbeddingBaseUrl: '',
  aiEmbeddingApiKey: '',
  aiEmbeddingModel: '',
  embeddingApiFormat: 'dashscope',
  embeddingThreshold: '0.5',
}

function toForm(c: AiConfig): ConfigForm {
  return {
    name: c.name,
    aiBaseUrl: c.aiBaseUrl ?? '',
    aiApiKey: c.aiApiKey ?? '',
    aiModel: c.aiModel ?? '',
    aiEmbeddingBaseUrl: c.aiEmbeddingBaseUrl ?? '',
    aiEmbeddingApiKey: c.aiEmbeddingApiKey ?? '',
    aiEmbeddingModel: c.aiEmbeddingModel ?? '',
    embeddingApiFormat: (c.embeddingApiFormat as 'openai' | 'dashscope') ?? 'dashscope',
    embeddingThreshold: c.embeddingThreshold ?? '0.5',
  }
}

export default function Settings() {
  const { data: configs, isLoading } = useConfigList()
  const createMut = useCreateConfig()
  const updateMut = useUpdateConfig()
  const deleteMut = useDeleteConfig()
  const activateMut = useActivateConfig()
  const deactivateAllMut = useDeactivateAllConfig()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ConfigForm>(emptyForm)

  const activeConfig = configs?.find(c => c.isActive)

  const startCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const startEdit = (c: AiConfig) => {
    setEditingId(c.id)
    setForm(toForm(c))
    setShowForm(true)
  }

  const handleSave = async () => {
    if (editingId) {
      await updateMut.mutate({
        id: editingId,
        name: form.name,
        aiBaseUrl: form.aiBaseUrl || null,
        aiApiKey: form.aiApiKey || null,
        aiModel: form.aiModel || null,
        aiEmbeddingBaseUrl: form.aiEmbeddingBaseUrl || null,
        aiEmbeddingApiKey: form.aiEmbeddingApiKey || null,
        aiEmbeddingModel: form.aiEmbeddingModel || null,
        embeddingApiFormat: form.embeddingApiFormat,
        embeddingThreshold: form.embeddingThreshold,
      })
    } else {
      await createMut.mutate(form)
    }
    setShowForm(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此配置？')) return
    await deleteMut.mutate(id)
  }

  const handleActivate = async (id: number) => {
    await activateMut.mutate(id)
  }

  const handleDeactivateAll = async () => {
    await deactivateAllMut.mutate()
  }

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI 配置管理</h1>
              <p className="text-xs text-neutral-500">管理大模型、Embedding 和向量搜索配置</p>
            </div>
          </div>
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 text-sm hover:bg-cyan-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            添加配置
          </button>
        </div>

        {/* Active config indicator */}
        <div className="glass-panel rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Power className={`w-4 h-4 ${activeConfig ? 'text-green-400' : 'text-neutral-600'}`} />
              <span className="text-sm text-neutral-300">
                当前启用：
                {activeConfig ? (
                  <span className="text-green-400 font-medium">{activeConfig.name}</span>
                ) : (
                  <span className="text-neutral-500">使用环境变量</span>
                )}
              </span>
            </div>
            {activeConfig && (
              <button
                onClick={handleDeactivateAll}
                disabled={deactivateAllMut.isPending}
                className="text-xs text-neutral-500 hover:text-amber-400 transition-all disabled:opacity-40"
              >
                停用
              </button>
            )}
          </div>
        </div>

        {/* Edit form */}
        {showForm && (
          <div className="glass-panel rounded-xl p-5 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">{editingId ? '编辑配置' : '新建配置'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">配置名称</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="如：DeepSeek、OpenAI、本地模型"
                  className="w-full px-3 py-2 rounded-lg bg-[#0f0f0f] border border-white/10 text-sm text-white outline-none focus:border-cyan-500/30 transition-all"
                />
              </div>

              {/* LLM Section */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span className="text-xs text-purple-400 font-medium">大模型配置</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    value={form.aiBaseUrl}
                    onChange={e => setForm({ ...form, aiBaseUrl: e.target.value })}
                    placeholder="API Base URL"
                    className="px-3 py-2 rounded-lg bg-[#0f0f0f] border border-white/10 text-sm text-white outline-none focus:border-cyan-500/30 transition-all"
                  />
                  <input
                    value={form.aiApiKey}
                    onChange={e => setForm({ ...form, aiApiKey: e.target.value })}
                    placeholder="API Key"
                    type="password"
                    className="px-3 py-2 rounded-lg bg-[#0f0f0f] border border-white/10 text-sm text-white outline-none focus:border-cyan-500/30 transition-all"
                  />
                  <input
                    value={form.aiModel}
                    onChange={e => setForm({ ...form, aiModel: e.target.value })}
                    placeholder="模型名称 (如 gpt-4o)"
                    className="px-3 py-2 rounded-lg bg-[#0f0f0f] border border-white/10 text-sm text-white outline-none focus:border-cyan-500/30 transition-all"
                  />
                </div>
                <p className="text-[10px] text-neutral-600 mt-1">留空则使用环境变量中的值</p>
              </div>

              {/* Embedding Section */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Search className="w-3 h-3 text-amber-400" />
                  <span className="text-xs text-amber-400 font-medium">Embedding 配置</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                  <input
                    value={form.aiEmbeddingBaseUrl}
                    onChange={e => setForm({ ...form, aiEmbeddingBaseUrl: e.target.value })}
                    placeholder="Embedding API Base URL"
                    className="px-3 py-2 rounded-lg bg-[#0f0f0f] border border-white/10 text-sm text-white outline-none focus:border-cyan-500/30 transition-all"
                  />
                  <input
                    value={form.aiEmbeddingApiKey}
                    onChange={e => setForm({ ...form, aiEmbeddingApiKey: e.target.value })}
                    placeholder="Embedding API Key"
                    type="password"
                    className="px-3 py-2 rounded-lg bg-[#0f0f0f] border border-white/10 text-sm text-white outline-none focus:border-cyan-500/30 transition-all"
                  />
                  <input
                    value={form.aiEmbeddingModel}
                    onChange={e => setForm({ ...form, aiEmbeddingModel: e.target.value })}
                    placeholder="模型名称 (如 text-embedding-3-small)"
                    className="px-3 py-2 rounded-lg bg-[#0f0f0f] border border-white/10 text-sm text-white outline-none focus:border-cyan-500/30 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">API 格式：</span>
                  <select
                    value={form.embeddingApiFormat}
                    onChange={e => setForm({ ...form, embeddingApiFormat: e.target.value as 'openai' | 'dashscope' })}
                    className="px-2 py-1 rounded-lg bg-[#0f0f0f] border border-white/10 text-xs text-white outline-none"
                  >
                    <option value="dashscope">DashScope</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>
              </div>

              {/* Vector Search Section */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Link2 className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs text-cyan-400 font-medium">向量搜索配置</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">搜索阈值：</span>
                  <input
                    value={form.embeddingThreshold}
                    onChange={e => setForm({ ...form, embeddingThreshold: e.target.value })}
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    className="w-20 px-2 py-1 rounded-lg bg-[#0f0f0f] border border-white/10 text-xs text-white outline-none"
                  />
                  <span className="text-[10px] text-neutral-600">0~1，值越高匹配越严格</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-white/5">
              <button
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={isPending || !form.name.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-sm hover:bg-cyan-500/30 disabled:opacity-40 transition-all"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                保存
              </button>
            </div>
          </div>
        )}

        {/* Config list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : configs && configs.length > 0 ? (
          <div className="space-y-3">
            {configs.map(c => (
              <div key={c.id} className="glass-panel rounded-xl p-4 transition-all">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{c.name}</span>
                      {c.isActive && (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                          <Check className="w-2.5 h-2.5" />
                          启用中
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
                      {c.aiModel && (
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          {c.aiModel}
                        </span>
                      )}
                      {c.aiEmbeddingModel && (
                        <span className="flex items-center gap-1">
                          <Search className="w-2.5 h-2.5" />
                          {c.aiEmbeddingModel}
                        </span>
                      )}
                      {c.embeddingThreshold && (
                        <span className="flex items-center gap-1">
                          <Link2 className="w-2.5 h-2.5" />
                          搜索阈值 {c.embeddingThreshold}
                        </span>
                      )}
                      {c.embeddingApiFormat && (
                        <span className="flex items-center gap-1">
                          {c.embeddingApiFormat === 'openai' ? 'OpenAI' : 'DashScope'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!c.isActive && (
                      <button
                        onClick={() => handleActivate(c.id)}
                        disabled={activateMut.isPending}
                        className="p-1.5 rounded-lg text-neutral-600 hover:text-green-400 hover:bg-green-500/10 transition-all disabled:opacity-40"
                        title="启用"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(c)}
                      className="p-1.5 rounded-lg text-neutral-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                      title="编辑"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deleteMut.isPending}
                      className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <SettingsIcon className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500 text-sm">暂无配置，当前使用环境变量</p>
          </div>
        )}
      </div>
    </div>
  )
}
