import { useState, useRef } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, TextInput, Pressable } from 'react-native';
import { Text, Card, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trpc } from '../../src/providers/trpc';
import { sourceConfig } from '../../src/lib/constants';
import Markdown from 'react-native-markdown-display';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  questionId?: number;
}

export default function HomeScreen() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();

  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: () => trpc.knowledge.getStats.query(),
  });

  const askMut = useMutation({
    mutationFn: (question: string) => trpc.ai.ask.mutate({ question }),
  });

  const convertMut = useMutation({
    mutationFn: (questionId: number) => trpc.ai.convertToWiki.mutate({ questionId }),
  });

  const handleSend = async () => {
    const question = input.trim();
    if (!question) return;
    setInput('');

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);

    try {
      const result = await askMut.mutateAsync(question) as any;
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer,
        source: result.source,
        questionId: result.questionId,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant' as const,
        content: '请求失败，请检查网络连接和服务器配置。',
      }]);
    }
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleConvert = async (questionId: number) => {
    await convertMut.mutateAsync(questionId);
    setMessages(prev => prev.map(m => m.questionId === questionId ? { ...m, source: 'converted' } : m));
  };

  const stats = statsQuery.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Text variant="titleLarge" style={{ color: '#fff', fontWeight: 'bold' }}>PulseWiki</Text>
        {stats && (
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
            <Chip textStyle={{ fontSize: 11, color: '#a78bfa' }} style={{ backgroundColor: '#a78bfa15' }}>
              {stats.wikis} 篇 Wiki
            </Chip>
            <Chip textStyle={{ fontSize: 11, color: '#06b6d4' }} style={{ backgroundColor: '#06b6d415' }}>
              {stats.questions} 条问答
            </Chip>
          </View>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <Text style={{ color: '#525252', fontSize: 14 }}>向 AI 提问，探索你的知识库</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12, alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <Card style={{ backgroundColor: item.role === 'user' ? '#a78bfa20' : '#171717', borderRadius: 12 }}>
              <Card.Content>
                {item.role === 'assistant' ? (
                  <View>
                    {item.source && item.source !== 'converted' && (
                      <Chip textStyle={{ fontSize: 10, color: sourceConfig[item.source as keyof typeof sourceConfig]?.color || '#6b7280' }} style={{ backgroundColor: '#ffffff08', marginBottom: 6, alignSelf: 'flex-start' }}>
                        {sourceConfig[item.source as keyof typeof sourceConfig]?.label || item.source}
                      </Chip>
                    )}
                    <View style={{ maxHeight: 400, overflow: 'hidden' }}>
                      <Markdown style={{ body: { color: '#e5e5e5', fontSize: 13 }, heading1: { color: '#fff' }, heading2: { color: '#fff' }, code_inline: { backgroundColor: '#ffffff10', color: '#a78bfa' }, code_block: { backgroundColor: '#0f0f0f', color: '#e5e5e5' }, bullet_list: { color: '#e5e5e5' }, ordered_list: { color: '#e5e5e5' } }}>
                        {item.content}
                      </Markdown>
                    </View>
                    {item.questionId && item.source !== 'converted' && (
                      <Pressable onPress={() => handleConvert(item.questionId!)} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                        <Chip icon="book-plus" textStyle={{ fontSize: 11, color: '#8b5cf6' }} style={{ backgroundColor: '#8b5cf615' }}>存入 Wiki</Chip>
                      </Pressable>
                    )}
                    {item.source === 'converted' && (
                      <Chip icon="check" textStyle={{ fontSize: 11, color: '#10b981' }} style={{ backgroundColor: '#10b98115', marginTop: 8, alignSelf: 'flex-start' }}>已存入</Chip>
                    )}
                  </View>
                ) : (
                  <Text style={{ color: '#e5e5e5', fontSize: 14 }}>{item.content}</Text>
                )}
              </Card.Content>
            </Card>
          </View>
        )}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ paddingHorizontal: 16, paddingBottom: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#ffffff10', backgroundColor: '#0a0a0a' }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput value={input} onChangeText={setInput} placeholder="输入你的问题..." placeholderTextColor="#525252" onSubmitEditing={handleSend} style={{ flex: 1, backgroundColor: '#171717', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 14 }} />
          {askMut.isPending ? (
            <ActivityIndicator animating size="small" color="#a78bfa" />
          ) : (
            <Pressable onPress={handleSend} disabled={!input.trim()} style={{ opacity: !input.trim() ? 0.3 : 1 }}>
              <MaterialCommunityIcons name="send" size={24} color="#a78bfa" />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
