import { useState } from 'react';
import { View, FlatList, TextInput, Pressable, Alert } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWikiList, useWikiTags, useDeleteWiki, useRegenerateEmbedding, useCreateWiki } from '../../../src/hooks/useUnifiedData';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
const KAScrollView = KeyboardAwareScrollView as any;
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Wiki } from '@db/schema';

const inputStyle = { backgroundColor: '#0f0f0f', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 14, marginBottom: 8 };

export default function WikiListScreen() {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSummary, setFormSummary] = useState('');

  const { data: wikis, isLoading } = useWikiList(search || undefined, selectedTag || undefined);
  const { data: tags } = useWikiTags();
  const deleteMut = useDeleteWiki();
  const embeddingMut = useRegenerateEmbedding();
  const createMut = useCreateWiki();

  const parseTags = (tagsStr?: string | null): string[] => {
    if (!tagsStr) return [];
    try { return JSON.parse(tagsStr); } catch { return []; }
  };

  const handleDelete = (wiki: Wiki) => {
    Alert.alert('确认删除', `确定要删除「${wiki.title}」吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteMut.mutate(wiki.id) },
    ]);
  };

  const handleCreate = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    await createMut.mutateAsync({
      title: formTitle.trim(),
      content: formContent.trim(),
      summary: formSummary.trim() || undefined,
      category: formCategory.trim() || undefined,
    });
    setFormTitle(''); setFormContent(''); setFormCategory(''); setFormSummary('');
    setShowCreate(false);
  };

  const startCreate = () => { setShowCreate(true); setFormTitle(''); setFormContent(''); setFormCategory(''); setFormSummary(''); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <Text variant="titleLarge" style={{ color: '#fff', fontWeight: 'bold' }}>Wiki</Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#171717', borderRadius: 12, paddingHorizontal: 12 }}>
          <MaterialCommunityIcons name="magnify" size={18} color="#525252" />
          <TextInput value={search} onChangeText={setSearch} placeholder="搜索 Wiki..." placeholderTextColor="#525252" style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: '#fff', fontSize: 14 }} />
        </View>
      </View>

      {(tags?.length ?? 0) > 0 && (
        <View style={{ height: 30 }}>
          <FlatList horizontal data={['全部', ...(tags ?? [])]} keyExtractor={item => item} showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center', gap: 6 }}
            renderItem={({ item }) => {
              const isAll = item === '全部';
              const isActive = isAll ? !selectedTag : selectedTag === item;
              return (
                <Pressable onPress={() => setSelectedTag(isAll ? null : item)} style={{ backgroundColor: isActive ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.03)', paddingHorizontal: 8, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                  <Text style={{ fontSize: 11, color: isActive ? '#06b6d4' : '#737373', lineHeight: 13 }}>{item}</Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      <KAScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }} extraScrollHeight={80} enableOnAndroid={true}>
        {/* Create form */}
        {showCreate && (
          <Card style={{ backgroundColor: '#171717', marginHorizontal: 16, marginBottom: 10, borderRadius: 12 }}>
            <Card.Content>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500', marginBottom: 12 }}>新建 Wiki</Text>
              <Text style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 4 }}>标题</Text>
              <TextInput value={formTitle} onChangeText={setFormTitle} placeholder="输入标题" placeholderTextColor="#525252" style={inputStyle} />
              <Text style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 4 }}>分类</Text>
              <TextInput value={formCategory} onChangeText={setFormCategory} placeholder="分类（可选）" placeholderTextColor="#525252" style={inputStyle} />
              <Text style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 4 }}>摘要</Text>
              <TextInput value={formSummary} onChangeText={setFormSummary} placeholder="摘要（可选）" placeholderTextColor="#525252" multiline numberOfLines={2} style={inputStyle} />
              <Text style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 4 }}>内容</Text>
              <TextInput value={formContent} onChangeText={setFormContent} placeholder="输入内容" placeholderTextColor="#525252" multiline numberOfLines={8} textAlignVertical="top" style={[inputStyle, { minHeight: 150 }]} />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <Pressable onPress={() => setShowCreate(false)} style={{ paddingHorizontal: 16, paddingVertical: 8 }}><Text style={{ color: '#525252' }}>取消</Text></Pressable>
                <Pressable onPress={handleCreate} disabled={createMut.isPending || !formTitle.trim() || !formContent.trim()} style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, opacity: createMut.isPending || !formTitle.trim() || !formContent.trim() ? 0.4 : 1 }}>
                  <Text style={{ color: '#fff', fontSize: 14 }}>{createMut.isPending ? '创建中...' : '创建'}</Text>
                </Pressable>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Wiki list */}
        {!showCreate && (isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}><ActivityIndicator animating color="#a78bfa" /></View>
        ) : (
          wikis?.map(item => {
            const itemTags = parseTags(item.tags);
            return (
              <Card key={item.id} style={{ backgroundColor: '#171717', marginHorizontal: 16, marginBottom: 10, borderRadius: 12 }}>
                <Card.Content>
                  <Pressable onPress={() => router.push(`/wiki/${item.id}`)}>
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 4 }}>{item.title}</Text>
                    {item.summary ? <Text style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 6 }} numberOfLines={2}>{item.summary}</Text> : null}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                      {item.category && <View style={{ backgroundColor: 'rgba(139, 92, 246, 0.08)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}><Text style={{ fontSize: 9, color: '#8b5cf6', lineHeight: 14 }}>{item.category}</Text></View>}
                      {itemTags.slice(0, 3).map((tag: string) => <View key={tag} style={{ backgroundColor: 'rgba(6, 182, 212, 0.06)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}><Text style={{ fontSize: 9, color: '#06b6d4', lineHeight: 14 }}>{tag}</Text></View>)}
                    </View>
                  </Pressable>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ color: '#525252', fontSize: 10 }}>{new Date(item.updatedAt).toLocaleDateString()}</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Pressable onPress={() => router.push(`/wiki/${item.id}`)}><MaterialCommunityIcons name="pencil-outline" size={18} color="#8b5cf6" /></Pressable>
                      <Pressable onPress={() => embeddingMut.mutate(item.id)} disabled={embeddingMut.isPending}>
                        {embeddingMut.isPending
                          ? <ActivityIndicator size={18} color="#06b6d4" />
                          : <MaterialCommunityIcons name="vector-line" size={18} color={item.embedding ? '#10b981' : '#f59e0b'} />}
                      </Pressable>
                      <Pressable onPress={() => handleDelete(item)}><MaterialCommunityIcons name="delete-outline" size={18} color="#ef4444" /></Pressable>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            );
          })
        ))}
      </KAScrollView>

      <FAB icon="plus" style={{ position: 'absolute', right: 16, bottom: 16, backgroundColor: '#a78bfa' }} color="#fff" onPress={startCreate} />
    </SafeAreaView>
  );
}
