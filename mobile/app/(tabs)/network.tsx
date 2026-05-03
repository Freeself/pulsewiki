import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Dimensions, Pressable, Text as RNText, PanResponder } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNetwork, useBuildNetwork } from '../../src/hooks/useUnifiedData';
import { Svg, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { relationColors, categoryColors } from '../../src/lib/constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface SimNode {
  id: string;
  type: 'wiki' | 'tag';
  wikiId?: number;
  title: string;
  category: string | null;
  x: number;
  y: number;
}

const tagColor = '#06b6d4';
const tagEdgeColor = '#06b6d4';

function parseTags(tagsStr?: string | null): string[] {
  if (!tagsStr) return [];
  try { return JSON.parse(tagsStr) as string[]; } catch { return []; }
}

const categoryPalette = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#fb923c', '#e879f9', '#22d3ee'];
const categoryColorMap = new Map<string, string>();
let colorIdx = 0;
function getCategoryColor(cat: string | null): string {
  if (!cat) return '#a78bfa';
  if (!categoryColorMap.has(cat)) {
    categoryColorMap.set(cat, categoryPalette[colorIdx % categoryPalette.length]);
    colorIdx++;
  }
  return categoryColorMap.get(cat)!;
}

export default function NetworkScreen() {
  const { data: networkData, isLoading } = useNetwork();
  const buildMut = useBuildNetwork();

  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panRef = useRef({ x: 0, y: 0, startX: 0, startY: 0, scale: 1 });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const { width } = Dimensions.get('window');
  const height = 500;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      panRef.current.startX = panRef.current.x;
      panRef.current.startY = panRef.current.y;
    },
    onPanResponderMove: (_, gs) => {
      panRef.current.x = panRef.current.startX + gs.dx;
      panRef.current.y = panRef.current.startY + gs.dy;
      setTransform({ x: panRef.current.x, y: panRef.current.y, scale: panRef.current.scale });
    },
    onPanResponderRelease: () => {},
  }), []);

  const handlePinch = (v: number) => {
    const next = Math.max(0.3, Math.min(3, panRef.current.scale * (1 + v * 0.01)));
    panRef.current.scale = next;
    setTransform({ x: panRef.current.x, y: panRef.current.y, scale: next });
  };

  const rawNodes = networkData?.nodes ?? [];
  const rawEdges = networkData?.edges ?? [];

  // Build tag map from wikis
  const wikiTagMap = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const w of rawNodes) map.set(w.id, parseTags(w.tags));
    return map;
  }, [rawNodes]);

  useEffect(() => {
    if (rawNodes.length === 0) { setNodes([]); return; }

    // Wiki nodes
    const simNodes: SimNode[] = rawNodes.map((n: any) => ({
      id: `wiki-${n.id}`, type: 'wiki' as const, wikiId: n.id,
      title: n.title, category: n.category,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
    }));

    // Tag nodes
    const allTags = new Set<string>();
    for (const tags of wikiTagMap.values()) tags.forEach(t => allTags.add(t));
    for (const tag of allTags) {
      simNodes.push({
        id: `tag-${tag}`, type: 'tag', title: tag, category: null,
        x: width / 2 + (Math.random() - 0.5) * 300,
        y: height / 2 + (Math.random() - 0.5) * 300,
      });
    }

    // Build links
    const simLinks: any[] = [];

    // Wiki relation edges
    const nodeIds = new Set(rawNodes.map((n: any) => n.id));
    rawEdges
      .filter((e: any) => nodeIds.has(e.sourceWikiId) && nodeIds.has(e.targetWikiId))
      .forEach((e: any) => simLinks.push({ source: `wiki-${e.sourceWikiId}`, target: `wiki-${e.targetWikiId}`, type: 'relation' }));

    // Tag edges
    for (const [wikiId, tags] of wikiTagMap) {
      for (const tag of tags) {
        simLinks.push({ source: `wiki-${wikiId}`, target: `tag-${tag}`, type: 'tag' });
      }
    }

    const simulation = forceSimulation<SimNode, any>(simNodes)
      .force('link', forceLink<SimNode, any>(simLinks).id((d: any) => d.id).distance(60))
      .force('charge', forceManyBody().strength(-80))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<SimNode>().radius(20))
      .alphaDecay(0.02)
      .stop();
    simulation.tick(120);
    setNodes([...simNodes]);
    return () => { simulation.stop(); };
  }, [rawNodes.length, rawEdges.length, wikiTagMap.size, width]);

  const links = useMemo(() => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const result: Array<{ source: SimNode; target: SimNode; type: string; label?: string }> = [];
    // Relation edges
    rawEdges.forEach((e: any) => {
      const s = nodeMap.get(`wiki-${e.sourceWikiId}`);
      const t = nodeMap.get(`wiki-${e.targetWikiId}`);
      if (s && t) result.push({ source: s, target: t, type: 'relation', label: e.label });
    });
    // Tag edges
    for (const [wikiId, tags] of wikiTagMap) {
      for (const tag of tags) {
        const s = nodeMap.get(`wiki-${wikiId}`);
        const t = nodeMap.get(`tag-${tag}`);
        if (s && t) result.push({ source: s, target: t, type: 'tag' });
      }
    }
    return result;
  }, [nodes, rawEdges, wikiTagMap]);

  const wikiCount = rawNodes.length;
  const tagCount = wikiTagMap.size ? new Set([...wikiTagMap.values()].flat()).size : 0;

  const selectedNode = nodes.find(n => n.id === selectedId);
  const selectedWikiId = selectedNode?.type === 'wiki' ? selectedNode.wikiId : null;
  const selectedEdges = selectedWikiId
    ? rawEdges.filter((e: any) => e.sourceWikiId === selectedWikiId || e.targetWikiId === selectedWikiId)
    : [];

  if (isLoading) return (<SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator animating color="#a78bfa" /></SafeAreaView>);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <RNText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>知识网络</RNText>
          <RNText style={{ color: '#525252', fontSize: 12 }}>{wikiCount} 知识 · {tagCount} 标签 · {rawEdges.length} 关系</RNText>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 8, overflow: 'hidden' }}>
            <Pressable onPress={() => handlePinch(5)} style={{ paddingHorizontal: 8, paddingVertical: 6 }}><MaterialCommunityIcons name="plus" size={16} color="#a3a3a3" /></Pressable>
            <Pressable onPress={() => handlePinch(-5)} style={{ paddingHorizontal: 8, paddingVertical: 6 }}><MaterialCommunityIcons name="minus" size={16} color="#a3a3a3" /></Pressable>
            <Pressable onPress={() => { panRef.current.x = 0; panRef.current.y = 0; panRef.current.scale = 1; setTransform({ x: 0, y: 0, scale: 1 }); }} style={{ paddingHorizontal: 8, paddingVertical: 6 }}><MaterialCommunityIcons name="fit-to-screen" size={16} color="#a3a3a3" /></Pressable>
          </View>
          <Pressable onPress={() => buildMut.mutate()} disabled={buildMut.isPending} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(139, 92, 246, 0.13)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, opacity: buildMut.isPending ? 0.4 : 1 }}>
            {buildMut.isPending ? <ActivityIndicator animating size="small" color="#8b5cf6" /> : <MaterialCommunityIcons name="refresh" size={16} color="#8b5cf6" />}
            <RNText style={{ color: '#8b5cf6', fontSize: 13 }}>重建</RNText>
          </Pressable>
        </View>
      </View>

      {nodes.length > 0 ? (
        <View {...panResponder.panHandlers}>
          <Svg width={width} height={height} style={{ backgroundColor: '#0a0a0a' }}>
          <G transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            {/* Edges */}
            {links.map((l, i) => (
              <Line key={i} x1={l.source.x} y1={l.source.y} x2={l.target.x} y2={l.target.y}
                stroke={l.type === 'tag' ? tagEdgeColor : (relationColors[l.label || ''] || '#333')}
                strokeWidth={l.type === 'tag' ? 1 : 1.5}
                opacity={l.type === 'tag' ? 0.5 : 0.5}
                strokeDasharray={l.type === 'tag' ? '3,3' : undefined}
              />
            ))}
              {/* Nodes */}
              {nodes.map(n => {
                const isSel = n.id === selectedId;
                if (n.type === 'tag') {
                  return (
                    <G key={n.id}>
                      <Circle cx={n.x} cy={n.y} r={isSel ? 10 : 7} fill="#06b6d4" opacity={isSel ? 0.9 : 0.5}
                        onPress={() => setSelectedId(isSel ? null : n.id)} />
                      <SvgText x={n.x} y={(n.y ?? 0) + 18} textAnchor="middle" fill={tagColor} fontSize={8}
                        onPress={() => setSelectedId(isSel ? null : n.id)}>
                        {n.title.length > 4 ? n.title.slice(0, 4) + '..' : n.title}
                      </SvgText>
                    </G>
                  );
                }
                const color = getCategoryColor(n.category);
                return (
                  <G key={n.id}>
                    <Circle cx={n.x} cy={n.y} r={isSel ? 14 : 10} fill={color} opacity={isSel ? 1 : 0.7}
                      onPress={() => setSelectedId(isSel ? null : n.id)} />
                    <SvgText x={n.x} y={(n.y ?? 0) + 22} textAnchor="middle" fill="#a3a3a3" fontSize={9}>
                      {n.title.length > 6 ? n.title.slice(0, 6) + '...' : n.title}
                    </SvgText>
                  </G>
                );
              })}
            </G>
          </Svg>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <RNText style={{ color: '#525252', marginBottom: 12 }}>暂无知识网络数据</RNText>
          <Pressable onPress={() => buildMut.mutate()} style={{ backgroundColor: 'rgba(139, 92, 246, 0.13)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
            <RNText style={{ color: '#8b5cf6' }}>构建网络</RNText>
          </Pressable>
        </View>
      )}

      {/* Selected node info */}
      {selectedNode && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: '#171717' }}>
          {selectedNode.type === 'wiki' ? (
            (() => {
              const wikiData = rawNodes.find((w: any) => w.id === selectedWikiId);
              const wikiTags = wikiData ? parseTags(wikiData.tags) : [];
              return (
                <>
                  <Pressable onPress={() => selectedWikiId && router.push(`/wiki/${selectedWikiId}`)}>
                    <RNText style={{ color: '#fff', fontSize: 14, fontWeight: '500', marginBottom: 4 }}>{selectedNode.title}</RNText>
                  </Pressable>
                  {wikiData?.summary && (
                    <RNText style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 6 }} numberOfLines={2}>{wikiData.summary}</RNText>
                  )}
                  {wikiTags.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                      {wikiTags.map(tag => <View key={tag} style={{ backgroundColor: 'rgba(6, 182, 212, 0.06)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><RNText style={{ fontSize: 10, color: '#06b6d4' }}>{tag}</RNText></View>)}
                    </View>
                  )}
                  {selectedEdges.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {selectedEdges.map((e: any, i: number) => {
                        const otherId = e.sourceWikiId === selectedWikiId ? e.targetWikiId : e.sourceWikiId;
                        const other = rawNodes.find((n: any) => n.id === otherId);
                        return <View key={i} style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><RNText style={{ fontSize: 10, color: relationColors[e.label] || '#6b7280' }}>{e.label}: {other?.title?.slice(0, 8) || '...'}</RNText></View>;
                      })}
                    </View>
                  )}
                </>
              );
            })()
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="tag" size={14} color={tagColor} />
                <RNText style={{ color: tagColor, fontSize: 14, fontWeight: '500' }}>{selectedNode.title}</RNText>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {rawNodes.filter((w: any) => (wikiTagMap.get(w.id) ?? []).includes(selectedNode.title)).map((w: any) => (
                  <Pressable key={w.id} onPress={() => router.push(`/wiki/${w.id}`)}>
                    <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><RNText style={{ fontSize: 10, color: '#a3a3a3' }}>{w.title.length > 10 ? w.title.slice(0, 10) + '..' : w.title}</RNText></View>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
