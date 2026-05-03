import { useState, useEffect, useMemo } from 'react';
import { View, Dimensions, Pressable, Text as RNText } from 'react-native';
import { ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '../../src/providers/trpc';
import { Svg, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { relationColors, categoryColors } from '../../src/lib/constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface SimNode { id: number; title: string; category: string | null; x: number; y: number; }

export default function NetworkScreen() {
  const queryClient = useQueryClient();
  const networkQuery = useQuery({ queryKey: ['network'], queryFn: () => trpc.network.getNetwork.query() });
  const buildMut = useMutation({ mutationFn: () => trpc.network.buildNetwork.mutate(), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['network'] }) });

  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { width } = Dimensions.get('window');
  const height = 500;

  const rawNodes = (networkQuery.data?.nodes ?? []) as any[];
  const rawEdges = (networkQuery.data?.edges ?? []) as any[];

  useEffect(() => {
    if (rawNodes.length === 0) { setNodes([]); return; }
    const simNodes: SimNode[] = rawNodes.map(n => ({ id: n.id, title: n.title, category: n.category, x: width / 2 + (Math.random() - 0.5) * 200, y: height / 2 + (Math.random() - 0.5) * 200 }));
    const simLinks = rawEdges.map((e: any) => ({ source: e.sourceWikiId, target: e.targetWikiId, label: e.label, strength: Number(e.strength) }));
    const simulation = forceSimulation<SimNode, any>(simNodes).force('link', forceLink<SimNode, any>(simLinks).id((d: any) => d.id).distance(80)).force('charge', forceManyBody().strength(-120)).force('center', forceCenter(width / 2, height / 2)).force('collide', forceCollide<SimNode>().radius(25)).alphaDecay(0.02).stop();
    simulation.tick(120);
    setNodes([...simNodes]);
    return () => { simulation.stop(); };
  }, [rawNodes.length, rawEdges.length, width]);

  const links = useMemo(() => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    return rawEdges.map((e: any) => ({ source: nodeMap.get(e.sourceWikiId), target: nodeMap.get(e.targetWikiId), label: e.label })).filter(l => l.source && l.target);
  }, [nodes, rawEdges]);

  const selectedNode = nodes.find(n => n.id === selectedId);
  const selectedEdges = rawEdges.filter((e: any) => e.sourceWikiId === selectedId || e.targetWikiId === selectedId);
  const getCategoryColor = (cat: string | null) => categoryColors[cat || '默认'] || categoryColors['默认'];

  if (networkQuery.isLoading) return (<SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator animating color="#a78bfa" /></SafeAreaView>);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <RNText style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>知识网络</RNText>
          <RNText style={{ color: '#525252', fontSize: 12 }}>{rawNodes.length} 节点 · {rawEdges.length} 关系</RNText>
        </View>
        <Pressable onPress={() => buildMut.mutate()} disabled={buildMut.isPending} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8b5cf620', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, opacity: buildMut.isPending ? 0.4 : 1 }}>
          {buildMut.isPending ? <ActivityIndicator animating size="small" color="#8b5cf6" /> : <MaterialCommunityIcons name="refresh" size={16} color="#8b5cf6" />}
          <RNText style={{ color: '#8b5cf6', fontSize: 13 }}>重建</RNText>
        </Pressable>
      </View>

      {nodes.length > 0 ? (
        <Svg width={width} height={height} style={{ backgroundColor: '#0a0a0a' }}>
          <G>
            {links.map((l, i) => <Line key={i} x1={l.source!.x} y1={l.source!.y} x2={l.target!.x} y2={l.target!.y} stroke={relationColors[l.label] || '#333'} strokeWidth={1.5} opacity={0.5} />)}
            {nodes.map(n => {
              const color = getCategoryColor(n.category);
              const isSel = n.id === selectedId;
              return (
                <G key={n.id}>
                  <Circle cx={n.x} cy={n.y} r={isSel ? 14 : 10} fill={color} opacity={isSel ? 1 : 0.7} onPress={() => setSelectedId(isSel ? null : n.id)} />
                  <SvgText x={n.x} y={n.y + 22} textAnchor="middle" fill="#a3a3a3" fontSize={9}>{n.title.length > 6 ? n.title.slice(0, 6) + '...' : n.title}</SvgText>
                </G>
              );
            })}
          </G>
        </Svg>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <RNText style={{ color: '#525252', marginBottom: 12 }}>暂无知识网络数据</RNText>
          <Pressable onPress={() => buildMut.mutate()} style={{ backgroundColor: '#8b5cf620', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
            <RNText style={{ color: '#8b5cf6' }}>构建网络</RNText>
          </Pressable>
        </View>
      )}

      {selectedNode && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#ffffff10', backgroundColor: '#171717' }}>
          <Pressable onPress={() => router.push(`/wiki/${selectedNode.id}`)}>
            <RNText style={{ color: '#fff', fontSize: 14, fontWeight: '500', marginBottom: 4 }}>{selectedNode.title}</RNText>
          </Pressable>
          {selectedEdges.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {selectedEdges.map((e: any, i: number) => {
                const otherId = e.sourceWikiId === selectedId ? e.targetWikiId : e.sourceWikiId;
                const other = rawNodes.find((n: any) => n.id === otherId);
                return <Chip key={i} textStyle={{ fontSize: 10, color: relationColors[e.label] || '#6b7280' }} style={{ backgroundColor: '#ffffff08' }}>{e.label}: {other?.title?.slice(0, 8) || '...'}</Chip>;
              })}
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
