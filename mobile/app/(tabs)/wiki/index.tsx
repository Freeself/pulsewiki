import { useState } from 'react';
import { View, FlatList, TextInput, Pressable } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '../../../src/providers/trpc';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function WikiListScreen() {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const wikisQuery = useQuery({
    queryKey: ['wikis', search, selectedTag],
    queryFn: () => trpc.knowledge.listWikis.query({ search: search || undefined, tag: selectedTag || undefined }),
  });

  const tagsQuery = useQuery({
    queryKey: ['wikiTags'],
    queryFn: () => trpc.knowledge.getWikiTags.query(),
  });

  const tags = (tagsQuery.data as string[] | undefined) ?? [];
  const wikis = (wikisQuery.data as any[] | undefined) ?? [];

  const parseTags = (tagsStr?: string | null): string[] => {
    if (!tagsStr) return [];
    try { return JSON.parse(tagsStr); } catch { return []; }
  };

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

      {tags.length > 0 && (
        <FlatList horizontal data={['全部', ...tags]} keyExtractor={item => item} showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
          renderItem={({ item }) => {
            const isAll = item === '全部';
            const isActive = isAll ? !selectedTag : selectedTag === item;
            return <Chip onPress={() => setSelectedTag(isAll ? null : item)} textStyle={{ fontSize: 11, color: isActive ? '#06b6d4' : '#737373' }} style={{ backgroundColor: isActive ? '#06b6d415' : '#ffffff08', marginRight: 6 }}>{item}</Chip>;
          }}
        />
      )}

      {wikisQuery.isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator animating color="#a78bfa" /></View>
      ) : (
        <FlatList data={wikis} keyExtractor={item => String(item.id)} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 60 }}><Text style={{ color: '#525252' }}>暂无 Wiki</Text></View>}
          renderItem={({ item }) => {
            const itemTags = parseTags(item.tags);
            return (
              <Pressable onPress={() => router.push(`/wiki/${item.id}`)}>
                <Card style={{ backgroundColor: '#171717', marginBottom: 10, borderRadius: 12 }}>
                  <Card.Content>
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 4 }}>{item.title}</Text>
                    {item.summary ? <Text style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 6 }} numberOfLines={2}>{item.summary}</Text> : null}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {item.category && <Chip textStyle={{ fontSize: 10, color: '#8b5cf6' }} style={{ backgroundColor: '#8b5cf615' }}>{item.category}</Chip>}
                      {itemTags.slice(0, 3).map((tag: string) => <Chip key={tag} textStyle={{ fontSize: 10, color: '#06b6d4' }} style={{ backgroundColor: '#06b6d410' }}>{tag}</Chip>)}
                    </View>
                    <Text style={{ color: '#525252', fontSize: 10, marginTop: 6 }}>{new Date(item.updatedAt).toLocaleDateString()}</Text>
                  </Card.Content>
                </Card>
              </Pressable>
            );
          }}
        />
      )}

      <FAB icon="plus" style={{ position: 'absolute', right: 16, bottom: 16, backgroundColor: '#a78bfa' }} color="#fff" onPress={() => {}} />
    </SafeAreaView>
  );
}
