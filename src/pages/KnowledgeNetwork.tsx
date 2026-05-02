import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Graph } from '@antv/g6'
import Navbar from '@/components/Navbar'
import { useNetwork, useBuildNetwork } from '@/hooks/useUnifiedData'
import { Share2, Loader2, Network, GitBranch, Sparkles } from 'lucide-react'

const labelColors: Record<string, string> = {
  '相关': '#a78bfa',
  '依赖': '#60a5fa',
  '引用': '#34d399',
  '对比': '#fbbf24',
  '包含': '#f472b6',
}

export default function KnowledgeNetwork() {
  const { data: networkData, isLoading, refetch } = useNetwork()
  const buildMut = useBuildNetwork()
  const [built, setBuilt] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const navigate = useNavigate()

  const handleBuild = async () => {
    await buildMut.mutate()
    setBuilt(true)
    refetch()
  }

  const hasEdges = (networkData?.edges?.length ?? 0) > 0
  const nodeCount = networkData?.nodes?.length ?? 0
  const edgeCount = networkData?.edges?.length ?? 0
  const avgConnections = nodeCount ? ((edgeCount * 2) / nodeCount).toFixed(1) : '0'

  useEffect(() => {
    if (!containerRef.current || !networkData) return

    // Destroy previous graph
    if (graphRef.current) {
      graphRef.current.destroy()
      graphRef.current = null
    }

    // Compute connection counts
    const connMap = new Map<number, number>()
    for (const e of networkData.edges ?? []) {
      connMap.set(e.sourceWikiId, (connMap.get(e.sourceWikiId) ?? 0) + 1)
      connMap.set(e.targetWikiId, (connMap.get(e.targetWikiId) ?? 0) + 1)
    }

    const nodes = (networkData.nodes ?? []).map((w) => ({
      id: String(w.id),
      data: {
        title: w.title,
        category: w.category,
        connections: connMap.get(w.id) ?? 0,
      },
    }))

    const edges = (networkData.edges ?? []).map((e) => ({
      id: `e-${e.id}`,
      source: String(e.sourceWikiId),
      target: String(e.targetWikiId),
      data: {
        label: e.label,
        strength: Number(e.strength),
      },
    }))

    if (nodes.length === 0) return

    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      data: { nodes, edges },
      layout: {
        type: 'force',
        preventOverlap: true,
        nodeStrength: 1000,
        edgeStrength: 50,
        linkDistance: 200,
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
            const title = d.data?.title ?? ''
            return Math.max(40, Math.min(80, title.length * 5 + 30))
          },
          fill: '#1a1a2e',
          stroke: '#a78bfa',
          lineWidth: 1.5,
          radius: 8,
          labelText: (d: any) => d.data?.title ?? '',
          labelFill: '#ffffff',
          labelFontSize: 11,
          labelFontWeight: 500,
          labelPlacement: 'center',
          labelWordWrap: true,
          labelMaxWidth: 100,
          ports: [],
        },
      },
      edge: {
        style: {
          stroke: (d: any) => labelColors[d.data?.label] ?? '#a78bfa',
          lineWidth: (d: any) => 1 + (d.data?.strength ?? 0.5) * 2,
          opacity: 0.5,
          endArrow: true,
          labelText: (d: any) => d.data?.label ?? '',
          labelFill: (d: any) => labelColors[d.data?.label] ?? '#a78bfa',
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

    // Navigate to wiki detail on node click
    graph.on('node:click', (evt: any) => {
      const nodeId = evt.target?.id ?? evt.node?.id
      if (nodeId) navigate(`/wiki/${nodeId}`)
    })

    graphRef.current = graph

    return () => {
      graph.destroy()
      graphRef.current = null
    }
  }, [networkData, navigate])

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
          <button
            onClick={handleBuild}
            disabled={buildMut.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 text-sm hover:bg-cyan-500/30 transition-all disabled:opacity-40"
          >
            {buildMut.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {built ? '重新构建' : '构建网络'}
          </button>
        </div>

        {/* Stats */}
        {hasEdges && (
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400">
              <Network className="w-3 h-3" />
              {nodeCount} 个节点
            </span>
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400">
              <GitBranch className="w-3 h-3" />
              {edgeCount} 条关联
            </span>
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400">
              平均 {avgConnections} 个连接
            </span>
          </div>
        )}

        {/* Graph */}
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : hasEdges ? (
          <div
            ref={containerRef}
            className="glass-panel rounded-2xl overflow-hidden"
            style={{ height: 520 }}
          />
        ) : (
          <div className="text-center py-24">
            <Network className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500 text-sm mb-1">
              {nodeCount
                ? '暂未发现知识关联，点击"构建网络"让 AI 分析条目间的关系'
                : '请先在 Wiki 中添加一些条目'}
            </p>
            {nodeCount > 0 && nodeCount < 2 && (
              <p className="text-neutral-600 text-xs mt-2">至少需要 2 个 Wiki 条目才能构建知识网络</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
