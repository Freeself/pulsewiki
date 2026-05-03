import { View, ScrollView, Pressable } from 'react-native';
import { Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '../../../src/providers/trpc';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';

export default function WikiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wikiId = Number(id);

  const wikiQuery = useQuery({
    queryKey: ['wiki', wikiId],
    queryFn: () => trpc.knowledge.getWiki.query({ id: wikiId }),
  });

  if (wikiQuery.isLoading) {
    return (<SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator animating color="#a78bfa" /></SafeAreaView>);
  }

  const wiki = wikiQuery.data as any;
  if (!wiki) {
    return (<SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#525252' }}>未找到该 Wiki</Text></SafeAreaView>);
  }

  let tags: string[] = [];
  try { tags = JSON.parse(wiki.tags || '[]'); } catch {}

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
        <Pressable onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#a78bfa" />
        </Pressable>
        <Text variant="titleMedium" style={{ color: '#fff', fontWeight: 'bold', marginLeft: 12, flex: 1 }} numberOfLines={1}>{wiki.title}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        {wiki.category && <Chip icon="tag" textStyle={{ fontSize: 11, color: '#8b5cf6' }} style={{ backgroundColor: '#8b5cf615', alignSelf: 'flex-start', marginBottom: 12 }}>{wiki.category}</Chip>}

        {tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {tags.map(tag => <Chip key={tag} textStyle={{ fontSize: 11, color: '#06b6d4' }} style={{ backgroundColor: '#06b6d410' }}>{tag}</Chip>)}
          </View>
        )}

        {wiki.summary && (
          <Card style={{ backgroundColor: '#171717', marginBottom: 16, borderRadius: 12 }}>
            <Card.Content><Text style={{ color: '#a3a3a3', fontSize: 13, fontStyle: 'italic' }}>{wiki.summary}</Text></Card.Content>
          </Card>
        )}

        <Markdown style={{ body: { color: '#e5e5e5', fontSize: 14 }, heading1: { color: '#fff', fontSize: 20 }, heading2: { color: '#fff', fontSize: 17 }, heading3: { color: '#fff', fontSize: 15 }, code_inline: { backgroundColor: '#ffffff10', color: '#a78bfa' }, code_block: { backgroundColor: '#0f0f0f', color: '#e5e5e5', borderRadius: 8 }, bullet_list: { color: '#e5e5e5' }, ordered_list: { color: '#e5e5e5' }, blockquote: { backgroundColor: '#ffffff08', borderLeftColor: '#a78bfa' } }}>{wiki.content}</Markdown>

        <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#ffffff10' }}>
          <Text style={{ color: '#525252', fontSize: 11 }}>更新于 {new Date(wiki.updatedAt).toLocaleString()}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
