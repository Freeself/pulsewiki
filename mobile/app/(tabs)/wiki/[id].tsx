import { useState } from 'react';
import { View, Pressable, TextInput, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
const KAScrollView = KeyboardAwareScrollView as any;
import { Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useWiki, useUpdateWiki, useUpdateWikiTags, useRegenerateTags, useWikiList, useWikiEdges, useCreateEdge, useDeleteEdge } from '../../../src/hooks/useUnifiedData';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';

export default function WikiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wikiId = Number(id);
  const { data: wiki, isLoading } = useWiki(wikiId);

  const updateWikiMut = useUpdateWiki();
  const updateTagsMut = useUpdateWikiTags();
  const regenerateTagsMut = useRegenerateTags();
  const { data: allWikis } = useWikiList();
  const { data: wikiEdges } = useWikiEdges(wikiId);
  const createEdgeMut = useCreateEdge();
  const deleteEdgeMut = useDeleteEdge();

  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [editingTags, setEditingTags] = useState<string[]>([]);

  const [showAddRelation, setShowAddRelation] = useState(false);
  const [relTargetId, setRelTargetId] = useState<number | null>(null);
  const [relLabel, setRelLabel] = useState('相关');

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editContent, setEditContent] = useState('');

  const startEdit = () => {
    if (!wiki) return;
    setEditTitle(wiki.title);
    setEditCategory(wiki.category ?? '');
    setEditSummary(wiki.summary ?? '');
    setEditContent(wiki.content);
    setIsEditing(true);
  };
  const saveEdit = async () => {
    await updateWikiMut.mutateAsync({ id: wikiId, title: editTitle.trim(), category: editCategory.trim() || undefined, summary: editSummary.trim() || undefined, content: editContent.trim() });
    setIsEditing(false);
  };

  const relationLabels = ['相关', '依赖', '引用', '对比', '包含'];
  const parseTags = (tagsStr?: string | null): string[] => {
    if (!tagsStr) return [];
    try { return JSON.parse(tagsStr); } catch { return []; }
  };

  const currentTags = parseTags(wiki?.tags);
  const wikiMap = new Map((allWikis ?? []).map(w => [w.id, w]));

  const startTagEdit = () => { setEditingTags([...currentTags]); setIsEditingTags(true); setTagInput(''); };
  const addTag = () => { const tag = tagInput.trim(); if (tag && !editingTags.includes(tag) && tag.length <= 20) { setEditingTags([...editingTags, tag]); setTagInput(''); } };
  const removeTag = (tag: string) => { setEditingTags(editingTags.filter(t => t !== tag)); };
  const saveTags = async () => { await updateTagsMut.mutateAsync({ id: wikiId, tags: editingTags }); setIsEditingTags(false); };

  const handleCreateRelation = async () => {
    if (!relTargetId || relTargetId === wikiId) return;
    await createEdgeMut.mutateAsync({ sourceWikiId: wikiId, targetWikiId: relTargetId, label: relLabel, strength: 0.5 });
    setShowAddRelation(false);
    setRelTargetId(null);
    setRelLabel('相关');
  };

  const handleDeleteRelation = (edgeId: number) => {
    Alert.alert('删除关联', '确定删除此关联关系？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteEdgeMut.mutate(edgeId) },
    ]);
  };

  if (isLoading) {
    return (<SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator animating color="#a78bfa" /></SafeAreaView>);
  }

  if (!wiki) {
    return (<SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#525252' }}>未找到该 Wiki</Text></SafeAreaView>);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
        <Pressable onPress={() => router.push('/wiki')}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#a78bfa" />
        </Pressable>
        <Text variant="titleMedium" style={{ color: '#fff', fontWeight: 'bold', marginLeft: 12, flex: 1 }} numberOfLines={1}>{isEditing ? '编辑 Wiki' : wiki.title}</Text>
        {!isEditing && (
          <Pressable onPress={startEdit} style={{ marginLeft: 8 }}>
            <MaterialCommunityIcons name="pencil-outline" size={20} color="#8b5cf6" />
          </Pressable>
        )}
      </View>

      <KAScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} extraScrollHeight={80} enableOnAndroid={true}>
        {isEditing ? (
          <>
            <Text style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 4 }}>标题</Text>
            <TextInput value={editTitle} onChangeText={setEditTitle} placeholder="标题" placeholderTextColor="#525252" style={{ backgroundColor: '#0f0f0f', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 14, marginBottom: 8 }} />
            <Text style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 4 }}>分类</Text>
            <TextInput value={editCategory} onChangeText={setEditCategory} placeholder="分类（可选）" placeholderTextColor="#525252" style={{ backgroundColor: '#0f0f0f', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 14, marginBottom: 8 }} />
            <Text style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 4 }}>摘要</Text>
            <TextInput value={editSummary} onChangeText={setEditSummary} placeholder="摘要（可选）" placeholderTextColor="#525252" multiline numberOfLines={2} style={{ backgroundColor: '#0f0f0f', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 14, marginBottom: 8 }} />
            <Text style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 4 }}>内容</Text>
            <TextInput value={editContent} onChangeText={setEditContent} placeholder="内容" placeholderTextColor="#525252" multiline textAlignVertical="top" style={{ backgroundColor: '#0f0f0f', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 14, minHeight: 300 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <Pressable onPress={() => setIsEditing(false)} style={{ paddingHorizontal: 16, paddingVertical: 8 }}><Text style={{ color: '#525252' }}>取消</Text></Pressable>
              <Pressable onPress={saveEdit} disabled={updateWikiMut.isPending || !editTitle.trim() || !editContent.trim()} style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, opacity: updateWikiMut.isPending || !editTitle.trim() || !editContent.trim() ? 0.4 : 1 }}>
                <Text style={{ color: '#fff', fontSize: 14 }}>{updateWikiMut.isPending ? '保存中...' : '保存'}</Text>
              </Pressable>
            </View>
          </>
        ) : (
        <>
        {wiki.category && <Chip icon="tag" textStyle={{ fontSize: 11, color: '#8b5cf6' }} style={{ backgroundColor: 'rgba(139, 92, 246, 0.08)', alignSelf: 'flex-start', marginBottom: 12 }}>{wiki.category}</Chip>}

        {/* Tags */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          {isEditingTags ? (
            <>
              {editingTags.map(tag => (
                <Chip key={tag} onClose={() => removeTag(tag)} closeIcon="close" textStyle={{ fontSize: 11, color: '#06b6d4' }} style={{ backgroundColor: 'rgba(6, 182, 212, 0.06)' }}>{tag}</Chip>
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <TextInput value={tagInput} onChangeText={setTagInput} onSubmitEditing={addTag} placeholder="输入标签" placeholderTextColor="#525252" maxLength={20} style={{ backgroundColor: '#0f0f0f', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, color: '#fff', fontSize: 12, width: 80 }} />
                <Pressable onPress={addTag}><MaterialCommunityIcons name="plus" size={18} color="#06b6d4" /></Pressable>
              </View>
              <Pressable onPress={saveTags} disabled={updateTagsMut.isPending} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(6, 182, 212, 0.13)', borderRadius: 6 }}>
                <Text style={{ color: '#06b6d4', fontSize: 12 }}>{updateTagsMut.isPending ? '...' : '保存'}</Text>
              </Pressable>
              <Pressable onPress={() => setIsEditingTags(false)}><MaterialCommunityIcons name="close" size={18} color="#525252" /></Pressable>
            </>
          ) : (
            <>
              {currentTags.map(tag => <Chip key={tag} textStyle={{ fontSize: 11, color: '#06b6d4' }} style={{ backgroundColor: 'rgba(6, 182, 212, 0.06)' }}>{tag}</Chip>)}
              {currentTags.length === 0 && <Text style={{ color: '#525252', fontSize: 11 }}>暂无标签</Text>}
              <Pressable onPress={startTagEdit}><MaterialCommunityIcons name="pencil-outline" size={16} color="#525252" /></Pressable>
              <Pressable onPress={() => regenerateTagsMut.mutate(wikiId)} disabled={regenerateTagsMut.isPending}>
                {regenerateTagsMut.isPending
                  ? <ActivityIndicator size={14} color="#f59e0b" />
                  : <MaterialCommunityIcons name="auto-fix" size={16} color="#525252" />}
              </Pressable>
            </>
          )}
        </View>

        {wiki.summary && (
          <Card style={{ backgroundColor: '#171717', marginBottom: 16, borderRadius: 12 }}>
            <Card.Content><Text style={{ color: '#a3a3a3', fontSize: 13, fontStyle: 'italic' }}>{wiki.summary}</Text></Card.Content>
          </Card>
        )}

        <Markdown style={{ body: { color: '#e5e5e5', fontSize: 14 }, heading1: { color: '#fff', fontSize: 20 }, heading2: { color: '#fff', fontSize: 17 }, heading3: { color: '#fff', fontSize: 15 }, code_inline: { backgroundColor: 'rgba(255, 255, 255, 0.06)', color: '#a78bfa' }, code_block: { backgroundColor: '#0f0f0f', color: '#e5e5e5', borderRadius: 8 }, bullet_list: { color: '#e5e5e5' }, ordered_list: { color: '#e5e5e5' }, blockquote: { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderLeftColor: '#a78bfa' } }}>{wiki.content}</Markdown>

        <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)' }}>
          <Text style={{ color: '#525252', fontSize: 11 }}>更新于 {new Date(wiki.updatedAt).toLocaleString()}</Text>
        </View>

        {/* Relations */}
        <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: '#a3a3a3', fontSize: 13, fontWeight: '500' }}>关联知识条目</Text>
            <Pressable onPress={() => setShowAddRelation(!showAddRelation)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(139, 92, 246, 0.13)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <MaterialCommunityIcons name="plus" size={14} color="#8b5cf6" />
              <Text style={{ color: '#8b5cf6', fontSize: 11 }}>添加关联</Text>
            </Pressable>
          </View>

          {showAddRelation && (
            <Card style={{ backgroundColor: '#171717', marginBottom: 8, borderRadius: 8 }}>
              <Card.Content>
                <Text style={{ color: '#a3a3a3', fontSize: 11, marginBottom: 4 }}>目标 Wiki</Text>
                <View style={{ backgroundColor: '#0f0f0f', borderRadius: 6, paddingHorizontal: 8, marginBottom: 8 }}>
                  <TextInput value={relTargetId ? String(relTargetId) : ''} onChangeText={() => {}} placeholder="选择目标 Wiki..." placeholderTextColor="#525252" style={{ color: '#fff', fontSize: 13, paddingVertical: 6 }} editable={false} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {(allWikis ?? []).filter(w => w.id !== wikiId).map(w => (
                    <Pressable key={w.id} onPress={() => setRelTargetId(w.id)} style={{ backgroundColor: relTargetId === w.id ? 'rgba(139, 92, 246, 0.13)' : 'rgba(255, 255, 255, 0.03)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ color: relTargetId === w.id ? '#8b5cf6' : '#a3a3a3', fontSize: 11 }} numberOfLines={1}>{w.title}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={{ color: '#a3a3a3', fontSize: 11, marginBottom: 4 }}>关系类型</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
                  {relationLabels.map(l => (
                    <Pressable key={l} onPress={() => setRelLabel(l)} style={{ backgroundColor: relLabel === l ? 'rgba(6, 182, 212, 0.13)' : 'rgba(255, 255, 255, 0.03)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ color: relLabel === l ? '#06b6d4' : '#a3a3a3', fontSize: 11 }}>{l}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                  <Pressable onPress={() => setShowAddRelation(false)}><Text style={{ color: '#525252', fontSize: 12 }}>取消</Text></Pressable>
                  <Pressable onPress={handleCreateRelation} disabled={!relTargetId || createEdgeMut.isPending} style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, opacity: !relTargetId ? 0.4 : 1 }}>
                    <Text style={{ color: '#fff', fontSize: 12 }}>{createEdgeMut.isPending ? '...' : '创建'}</Text>
                  </Pressable>
                </View>
              </Card.Content>
            </Card>
          )}

          {wikiEdges && wikiEdges.length > 0 ? (
            wikiEdges.map((edge: any) => {
              const connected = wikiMap.get(edge.connectedWikiId);
              return (
                <View key={edge.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#171717', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 4, gap: 8 }}>
                  <Pressable onPress={() => router.push(`/wiki/${edge.connectedWikiId}`)} style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 13 }} numberOfLines={1}>{edge.connectedWikiTitle}</Text>
                    <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
                      <Text style={{ color: '#06b6d4', fontSize: 10 }}>{edge.label}</Text>
                      {connected?.category && <Text style={{ color: '#8b5cf6', fontSize: 10 }}>{connected.category}</Text>}
                    </View>
                  </Pressable>
                  <Pressable onPress={() => handleDeleteRelation(edge.id)}><MaterialCommunityIcons name="delete-outline" size={18} color="#525252" /></Pressable>
                </View>
              );
            })
          ) : (
            !showAddRelation && <Text style={{ color: '#525252', fontSize: 12 }}>暂无关联</Text>
          )}
        </View>
        </>
        )}
      </KAScrollView>
    </SafeAreaView>
  );
}
