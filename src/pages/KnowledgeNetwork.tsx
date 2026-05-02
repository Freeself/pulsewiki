import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { Graph } from '@antv/g6'
import Navbar from '@/components/Navbar'
import { useNetwork, useBuildNetwork } from '@/hooks/useUnifiedData'
import {
  Share2, Loader2, Network, GitBranch, Sparkles, Tag, Eye, EyeOff,
  Search, Maximize2, X, ArrowRight,
} from 'lucide-react'

// ===== Constants =====
const relationColors: Record<string, string> = {
  '相关': '#a78bfa', '依赖': '#60a5fa', '引用': '#34d399', '对比': '#fbbf24', '包含': '#f472b6',
}
const tagColor = '#06b6d4'
const tagEdgeColor = '#06b6d4'
const categoryPalette = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#fb923c', '#e879f9', '#22d3ee']
const categoryColorMap = new Map<string, string>()
let colorIdx = 0
function getCategoryColor(cat: string | null | undefined): string {
  if (!cat) return '#a78bfa'
  if (!categoryColorMap.has(cat)) {
    categoryColorMap.set(cat, categoryPalette[colorIdx % categoryPalette.length])
    colorIdx++
  }
  return categoryColorMap.get(cat)!
}

function parseTags(tagsStr?: string | null): string[] {
  if (!tagsStr) return []
  try { return JSON.parse(tagsStr) as string[] } catch { return [] }
}

// ===== Side Panel =====
interface SidePanelData {
  id: number
  title: string
  category: string | null
  tags: string[]
  summary: string | null
  content: string | null
}

function SidePanel({ data, onClose, onNavigate }: {
  data: SidePanelData
  onClose: () => void
  onNavigate: (id: number) => void
}) {
  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-[#111113] border-l border-white/5 z-20 flex flex-col animate-in slide-in-from-right duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white truncate flex-1 mr-2">{data.title}</h3>
        <button onClick={onClose} className="p-1 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {data.category && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
            {data.category}
          </span>
        )}
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.tags.map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">{t}</span>
            ))}
          </div>
        )}
        {data.summary && (
          <p className="text-xs text-neutral-400 leading-relaxed">{data.summary}</p>
        )}
        {data.content && (
          <div className="text-xs text-neutral-500 leading-relaxed line-clamp-12 whitespace-pre-wrap">{data.content}</div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-white/5">
        <button
          onClick={() => onNavigate(data.id)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/20 text-purple-300 text-xs hover:bg-purple-500/30 transition-all"
        >
          <ArrowRight className="w-3 h-3" />
          查看完整内容
        </button>
      </div>
    </div>
  )
}

// ===== Main Component =====
export default function KnowledgeNetwork() {
  const { data: networkData, isLoading, refetch } = useNetwork()
  const buildMut = useBuildNetwork()
  const [built, setBuilt] = useState(false)
  const [showTags, setShowTags] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidePanel, setSidePanel] = useState<SidePanelData | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const highlightedTagRef = useRef<string | null>(null)
  const navigate = useNavigate()

  const handleBuild = async () => {
    await buildMut.mutate()
    setBuilt(true)
    refetch()
  }

  const wikis = networkData?.nodes ?? []
  const edges = networkData?.edges ?? []

  // Extract tags and compute tag reference counts
  const allTags = new Set<string>()
  const wikiTagMap = new Map<number, string[]>()
  const tagRefCount = new Map<string, number>()
  for (const w of wikis) {
    const tags = parseTags(w.tags)
    wikiTagMap.set(w.id, tags)
    for (const t of tags) {
      allTags.add(t)
      tagRefCount.set(t, (tagRefCount.get(t) ?? 0) + 1)
    }
  }
  const tagCount = allTags.size

  // Stats
  const hasEdges = edges.length > 0
  const relationEdgeCount = edges.length

  // Search handler — updates data flags, styles are driven by initial functions
  const handleSearch = useCallback((g: Graph, query: string) => {
    const q = query.trim().toLowerCase()
    let firstMatch: string | null = null
    const allNodeIds = g.getNodeData().map((n: any) => n.id)
    for (const nid of allNodeIds) {
      const nd = g.getNodeData(nid)
      const d = nd.data as any
      const title = (d?.title ?? '').toLowerCase()
      const match = q ? title.includes(q) : false
      if (match && !firstMatch) firstMatch = nid as string
      g.updateNodeData([{ id: nid, data: { ...d, _searchMatched: match } }])
    }
    g.draw()
    if (firstMatch) g.focusElement(firstMatch)
  }, [])

  useEffect(() => {
    if (!containerRef.current || !networkData) return

    if (graphRef.current) {
      graphRef.current.destroy()
      graphRef.current = null
    }

    // Compute connection counts
    const connMap = new Map<number, number>()
    for (const e of edges) {
      connMap.set(e.sourceWikiId, (connMap.get(e.sourceWikiId) ?? 0) + 1)
      connMap.set(e.targetWikiId, (connMap.get(e.targetWikiId) ?? 0) + 1)
    }

    // Build wiki nodes
    const graphNodes: any[] = wikis.map((w) => {
      const conns = connMap.get(w.id) ?? 0
      const wtags = wikiTagMap.get(w.id) ?? []
      return {
        id: `wiki-${w.id}`,
        data: {
          type: 'wiki', title: w.title, category: w.category,
          tags: wtags, conns, wikiId: w.id,
          summary: w.summary, content: w.content,
        },
      }
    })

    // Build wiki-wiki relation edges
    const graphEdges: any[] = edges.map((e) => ({
      id: `rel-${e.id}`,
      source: `wiki-${e.sourceWikiId}`,
      target: `wiki-${e.targetWikiId}`,
      data: { type: 'relation', label: e.label, strength: Number(e.strength) },
    }))

    // Build tag nodes and tag edges
    if (showTags) {
      for (const tag of allTags) {
        graphNodes.push({
          id: `tag-${tag}`,
          data: { type: 'tag', title: tag, refCount: tagRefCount.get(tag) ?? 0 },
        })
      }
      for (const w of wikis) {
        for (const tag of wikiTagMap.get(w.id) ?? []) {
          graphEdges.push({
            id: `tag-edge-${w.id}-${tag}`,
            source: `wiki-${w.id}`,
            target: `tag-${tag}`,
            data: { type: 'tag-link' },
          })
        }
      }

      // Auto-infer relations from shared tags (2+ shared tags = related)
      const wikiIds = wikis.map(w => w.id)
      const existingRelSet = new Set(edges.map(e => `${e.sourceWikiId}-${e.targetWikiId}`))
      for (let i = 0; i < wikiIds.length; i++) {
        for (let j = i + 1; j < wikiIds.length; j++) {
          const a = wikiIds[i], b = wikiIds[j]
          const tagsA = wikiTagMap.get(a) ?? []
          const tagsB = wikiTagMap.get(b) ?? []
          const shared = tagsA.filter(t => tagsB.includes(t))
          if (shared.length >= 2 && !existingRelSet.has(`${a}-${b}`) && !existingRelSet.has(`${b}-${a}`)) {
            graphEdges.push({
              id: `infer-${a}-${b}`,
              source: `wiki-${a}`,
              target: `wiki-${b}`,
              data: { type: 'inferred', label: '相关', strength: Math.min(shared.length * 0.2, 0.8) },
            })
          }
        }
      }
    }

    if (graphNodes.length === 0) return

    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      data: { nodes: graphNodes, edges: graphEdges },
      layout: {
        type: 'force',
        preventOverlap: true,
        nodeStrength: showTags ? 500 : 1000,
        edgeStrength: 0.1,
        linkDistance: 180,
        gravity: 10,
        coulombDisScale: 0.005,
        damping: 0.9,
        maxSpeed: 200,
        factor: 1,
        interval: 0.02,
      },
      node: {
        style: {
          size: (d: any) => {
            if (d.data?.type === 'tag') {
              const refs = d.data?.refCount ?? 1
              return Math.max(24, Math.min(48, 20 + refs * 6))
            }
            const conns = d.data?.conns ?? 0
            return Math.max(44, Math.min(72, 44 + conns * 8))
          },
          fill: (d: any) => {
            if (d.data?.type === 'tag') return '#0e2a33'
            return '#1a1a2e'
          },
          stroke: (d: any) => {
            if (d.data?._searchMatched) return '#fbbf24'
            if (d.data?.type === 'tag') return tagColor
            return getCategoryColor(d.data?.category)
          },
          lineWidth: (d: any) => {
            if (d.data?._searchMatched) return 3
            if (d.data?._hlTag && d.data?.type === 'tag' && d.data?.title === d.data?._hlTag) return 3
            if (d.data?._hlTag && d.data?.type === 'wiki') {
              const wikiId = d.data?.wikiId
              if ((wikiTagMap.get(wikiId) ?? []).includes(d.data?._hlTag)) return 2.5
            }
            if (d.data?._hoverSelf) return 2.5
            return d.data?.type === 'tag' ? 1 : 1.5
          },
          opacity: (d: any) => {
            if (d.data?._searchMatched) return 1
            if (d.data?._hlTag) {
              if (d.data?.type === 'tag') return d.data?.title === d.data?._hlTag ? 1 : 0.15
              const wikiId = d.data?.wikiId
              return (wikiTagMap.get(wikiId) ?? []).includes(d.data?._hlTag) ? 1 : 0.15
            }
            if (d.data?._hoverDimmed) return 0.12
            return 1
          },
          radius: (d: any) => d.data?.type === 'tag' ? 14 : 8,
          labelText: (d: any) => {
            const title = d.data?.title ?? ''
            const max = d.data?.type === 'tag' ? 6 : 8
            return title.length > max ? title.slice(0, max) + '…' : title
          },
          labelFill: (d: any) => d.data?.type === 'tag' ? tagColor : '#e0e0e0',
          labelFontSize: 10,
          labelFontWeight: 500,
          labelPlacement: 'center',
          ports: [],
        },
      },
      edge: {
        style: {
          stroke: (d: any) => {
            if (d.data?.type === 'tag-link') return tagEdgeColor
            if (d.data?.type === 'inferred') return '#fbbf24'
            return relationColors[d.data?.label] ?? '#a78bfa'
          },
          lineWidth: (d: any) => {
            if (d.data?.type === 'tag-link') return 1
            if (d.data?.type === 'inferred') return 1 + (d.data?.strength ?? 0.4) * 1.5
            return 1 + (d.data?.strength ?? 0.5) * 2
          },
          opacity: (d: any) => {
            if (d.data?._hoverConnected) return 0.8
            if (d.data?._hoverDimmed) return 0.04
            if (d.data?._hlTag) {
              if (d.data?.type === 'tag-link') return d.data?._hlTagConnected ? 0.8 : 0.05
              return 0.08
            }
            return d.data?.type === 'tag-link' ? 0.2 : 0.5
          },
          lineDash: (d: any) => d.data?.type === 'tag-link' ? [4, 4] : d.data?.type === 'inferred' ? [6, 3] : undefined,
          endArrow: (d: any) => d.data?.type !== 'tag-link',
          labelText: (d: any) => {
            if (d.data?.type === 'tag-link') return ''
            return d.data?.label ?? ''
          },
          labelFill: (d: any) => {
            if (d.data?.type === 'tag-link') return tagColor
            if (d.data?.type === 'inferred') return '#fbbf24'
            return relationColors[d.data?.label] ?? '#a78bfa'
          },
          labelFontSize: 9,
          labelBackground: true,
          labelBackgroundFill: '#171717',
          labelBackgroundOpacity: 0.9,
          labelBackgroundRadius: 4,
          labelPadding: [2, 6],
        },
      },
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
    })

    graph.render()

    // Right-click context menu via native DOM
    const ctxMenu = document.createElement('div')
    ctxMenu.style.cssText = 'position:fixed;display:none;background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:4px 0;z-index:10000;min-width:120px;box-shadow:0 4px 12px rgba(0,0,0,0.5);font-size:12px;color:#e0e0e0'
    document.body.appendChild(ctxMenu)

    const showCtxMenu = (x: number, y: number, items: { label: string; action: () => void }[]) => {
      ctxMenu.innerHTML = ''
      for (const item of items) {
        const el = document.createElement('div')
        el.style.cssText = 'padding:6px 14px;cursor:pointer;transition:background 0.1s'
        el.textContent = item.label
        el.onmouseenter = () => { el.style.background = 'rgba(255,255,255,0.05)' }
        el.onmouseleave = () => { el.style.background = 'transparent' }
        el.onclick = () => { item.action(); ctxMenu.style.display = 'none' }
        ctxMenu.appendChild(el)
      }
      ctxMenu.style.left = `${x}px`
      ctxMenu.style.top = `${y}px`
      ctxMenu.style.display = 'block'
    }

    const hideCtxMenu = () => { ctxMenu.style.display = 'none' }

    // Use canvas element's native contextmenu event
    const canvasEl = containerRef.current
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      // Find which node is under the cursor using graph API
      const nodeItems = graph.getNodeData()
      // Simple: show context menu at cursor, items depend on what was last clicked
      // We'll use the existing click state
      const x = e.clientX
      const y = e.clientY
      // Default canvas context menu
      showCtxMenu(x, y, [
        { label: '适应画面', action: () => graph.fitView(undefined, { duration: 300 }) },
      ])
    }
    canvasEl?.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('click', hideCtxMenu)

    // DOM tooltip
    const tooltip = document.createElement('div')
    tooltip.style.cssText = 'position:fixed;padding:6px 10px;background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);border-radius:8px;font-size:12px;color:#fff;pointer-events:none;z-index:9999;display:none;max-width:260px;box-shadow:0 4px 12px rgba(0,0,0,0.5)'
    document.body.appendChild(tooltip)

    graph.on('node:pointerover', (evt: any) => {
      const nodeId = evt.target?.id ?? evt.node?.id
      if (!nodeId) return
      const nd = graph.getNodeData(nodeId)
      const d = nd?.data as any
      if (!d) return
      if (d.type === 'tag') {
        tooltip.innerHTML = `<span style="color:#06b6d4;font-weight:600">${d.title}</span><br><span style="font-size:10px;color:#666">${d.refCount ?? 0} 个引用</span>`
      } else {
        const cat = d.category ? `<br><span style="color:${getCategoryColor(d.category)};font-size:10px">${d.category}</span>` : ''
        const conns = d.conns ? `<span style="color:#666;font-size:10px"> · ${d.conns} 个关联</span>` : ''
        tooltip.innerHTML = `<span style="font-weight:600">${d.title}</span>${cat}${conns}`
      }
      tooltip.style.display = 'block'
    })
    graph.on('node:pointermove', (evt: any) => {
      tooltip.style.left = `${(evt.clientX ?? 0) + 12}px`
      tooltip.style.top = `${(evt.clientY ?? 0) - 8}px`
    })
    graph.on('node:pointerout', () => { tooltip.style.display = 'none' })

    // Hover highlight: highlight connected nodes/edges
    graph.on('node:pointerover', (evt: any) => {
      const nodeId = evt.target?.id ?? evt.node?.id
      if (!nodeId || highlightedTagRef.current) return
      if (typeof nodeId === 'string' && nodeId.startsWith('wiki-')) {
        highlightWikiConnections(graph, nodeId)
      }
    })
    graph.on('node:pointerout', () => {
      if (!highlightedTagRef.current) applyHighlight(graph, null, wikiTagMap)
    })

    // Highlight helper — updates data flags, styles are driven by initial functions
    const applyHighlight = (g: Graph, tag: string | null, wtm: Map<number, string[]>) => {
      highlightedTagRef.current = tag
      const tid = tag ? `tag-${tag}` : null
      const allNodeIds = g.getNodeData().map((n: any) => n.id)
      for (const nid of allNodeIds) {
        const nd = g.getNodeData(nid)
        const d = nd.data as any
        g.updateNodeData([{ id: nid, data: { ...d, _hlTag: tag, _hoverDimmed: false, _hoverSelf: false } }])
      }
      const allEdgeIds = g.getEdgeData().map((e: any) => e.id)
      for (const eid of allEdgeIds) {
        const ed = g.getEdgeData(eid)
        const d = ed.data as any
        const tagConnected = tid ? (String(ed.target) === tid || String(ed.source) === tid) : false
        g.updateEdgeData([{ id: eid, data: { ...d, _hlTag: tag, _hlTagConnected: tagConnected, _hoverDimmed: false, _hoverConnected: false } }])
      }
      g.draw()
    }

    // Highlight wiki connections — updates data flags
    function highlightWikiConnections(g: Graph, nodeId: string) {
      const connectedNodes = new Set<string>([nodeId])
      const allEdgeIds = g.getEdgeData().map((e: any) => e.id)
      for (const eid of allEdgeIds) {
        const ed = g.getEdgeData(eid)
        const src = String(ed.source)
        const tgt = String(ed.target)
        if (src === nodeId || tgt === nodeId) {
          connectedNodes.add(src)
          connectedNodes.add(tgt)
        }
      }
      const allNodeIds = g.getNodeData().map((n: any) => n.id)
      for (const nid of allNodeIds) {
        const nd = g.getNodeData(nid)
        const d = nd.data as any
        const connected = connectedNodes.has(nid as string)
        g.updateNodeData([{ id: nid, data: { ...d, _hoverSelf: nid === nodeId, _hoverDimmed: !connected } }])
      }
      for (const eid of allEdgeIds) {
        const ed = g.getEdgeData(eid)
        const d = ed.data as any
        const src = String(ed.source)
        const tgt = String(ed.target)
        const connected = src === nodeId || tgt === nodeId
        g.updateEdgeData([{ id: eid, data: { ...d, _hoverConnected: connected, _hoverDimmed: !connected } }])
      }
      g.draw()
    }

    // Click handlers
    graph.on('node:click', (evt: any) => {
      const nodeId = evt.target?.id ?? evt.node?.id
      if (!nodeId) return
      if (typeof nodeId === 'string' && nodeId.startsWith('tag-')) {
        const tag = nodeId.replace('tag-', '')
        if (highlightedTagRef.current === tag) {
          applyHighlight(graph, null, wikiTagMap)
        } else {
          applyHighlight(graph, tag, wikiTagMap)
        }
      } else if (typeof nodeId === 'string' && nodeId.startsWith('wiki-')) {
        const wikiId = Number(nodeId.replace('wiki-', ''))
        const w = wikis.find(wk => wk.id === wikiId)
        if (w) {
          setSidePanel({ id: w.id, title: w.title, category: w.category, tags: parseTags(w.tags), summary: w.summary, content: w.content })
        }
      }
    })

    graph.on('canvas:click', () => {
      if (highlightedTagRef.current) {
        applyHighlight(graph, null, wikiTagMap)
      }
      setSidePanel(null)
    })

    graphRef.current = graph

    // Apply current search
    if (searchQuery) handleSearch(graph, searchQuery)

    return () => {
      tooltip.remove()
      ctxMenu.remove()
      canvasEl?.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('click', hideCtxMenu)
      graph.destroy()
      graphRef.current = null
    }
  }, [networkData, showTags, navigate])

  // Search effect
  useEffect(() => {
    if (!graphRef.current) return
    handleSearch(graphRef.current, searchQuery)
  }, [searchQuery, handleSearch])

  const hasContent = wikis.length > 0

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">知识网络</h1>
              <p className="text-xs text-neutral-500">可视化探索 Wiki 条目之间的关联</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tagCount > 0 && (
              <button
                onClick={() => setShowTags(!showTags)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all ${
                  showTags ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30' : 'bg-white/5 text-neutral-500 hover:text-neutral-300 hover:bg-white/10'
                }`}
              >
                {showTags ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                标签节点
              </button>
            )}
            <button
              onClick={() => graphRef.current?.fitView(undefined, { duration: 300 })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-neutral-400 text-xs hover:text-white hover:bg-white/10 transition-all"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              适应画面
            </button>
            <button
              onClick={handleBuild}
              disabled={buildMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 text-sm hover:bg-cyan-500/30 transition-all disabled:opacity-40"
            >
              {buildMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {built ? '重新构建' : '构建网络'}
            </button>
          </div>
        </div>

        {/* Search */}
        {hasContent && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索节点..."
              className="w-full sm:w-72 pl-10 pr-4 py-2 rounded-xl bg-[#171717] border border-white/5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-cyan-500/30 transition-all"
            />
          </div>
        )}

        {/* Stats */}
        {hasContent && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400">
              <Network className="w-3 h-3" />{wikis.length} 个 Wiki
            </span>
            {showTags && tagCount > 0 && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400">
                <Tag className="w-3 h-3" />{tagCount} 个标签
              </span>
            )}
            {relationEdgeCount > 0 && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400">
                <GitBranch className="w-3 h-3" />{relationEdgeCount} 条 AI 关联
              </span>
            )}
          </div>
        )}

        {/* Legend */}
        {hasContent && (
          <div className="flex flex-wrap items-center gap-4 mb-4 text-[10px] text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#1a1a2e] border border-[#a78bfa]" />
              Wiki
            </span>
            {showTags && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0e2a33] border border-[#06b6d4]" />
                标签
              </span>
            )}
            {hasEdges && Object.entries(relationColors).map(([label, color]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 rounded" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
            {showTags && (
              <span className="flex items-center gap-1.5">
                <span style={{ borderTop: `1px dashed ${tagColor}`, width: 16, height: 0 }} />
                标签连接
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span style={{ borderTop: '1px dashed #fbbf24', width: 16, height: 0 }} />
              自动推断
            </span>
          </div>
        )}

        {/* Graph */}
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : hasContent ? (
          <div className="relative">
            <div
              ref={containerRef}
              className="glass-panel rounded-2xl overflow-hidden"
              style={{ height: 560 }}
            />
            {sidePanel && (
              <SidePanel
                data={sidePanel}
                onClose={() => setSidePanel(null)}
                onNavigate={(id) => navigate(`/wiki/${id}`)}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-24">
            <Network className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500 text-sm mb-1">
              {wikis.length ? '暂未发现知识关联，点击"构建网络"让 AI 分析条目间的关系' : '请先在 Wiki 中添加一些条目'}
            </p>
            {wikis.length > 0 && wikis.length < 2 && (
              <p className="text-neutral-600 text-xs mt-2">至少需要 2 个 Wiki 条目才能构建知识网络</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
