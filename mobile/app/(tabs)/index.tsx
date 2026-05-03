import { useState, useRef } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, TextInput, Pressable, ScrollView } from 'react-native';
import { Text, Card, ActivityIndicator, Chip, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStats, useAskQuestion, useConvertToWiki } from '../../src/hooks/useUnifiedData';
import { sourceConfig } from '../../src/lib/constants';
import Markdown from 'react-native-markdown-display';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

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
  const [copied, setCopied] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const statsQuery = useStats();
  const askMut = useAskQuestion();
  const convertMut = useConvertToWiki();

  const handleSend = async () => {
    const question = input.trim();
    if (!question) return;
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: question }]);
    try {
      const result = await askMut.mutateAsync(question);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant', content: result.answer,
        source: result.source, questionId: result.questionId,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant' as const,
        content: '请求失败，请检查 AI 配置和网络连接。',
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Text variant="titleLarge" style={{ color: '#fff', fontWeight: 'bold' }}>PulseWiki</Text>
        {stats && (
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
            <Chip textStyle={{ fontSize: 11, color: '#a78bfa' }} style={{ backgroundColor: 'rgba(167, 139, 250, 0.08)' }}>
              {stats.wikis} 篇知识
            </Chip>
            <Chip textStyle={{ fontSize: 11, color: '#06b6d4' }} style={{ backgroundColor: 'rgba(6, 182, 212, 0.08)' }}>
              {stats.questions} 条问答
            </Chip>
          </View>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 60 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <Text style={{ color: '#525252', fontSize: 14 }}>向 AI 提问，探索你的知识库</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12, alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <Card style={{ backgroundColor: item.role === 'user' ? 'rgba(167, 139, 250, 0.13)' : '#171717', borderRadius: 12 }}>
              <Card.Content>
                {item.role === 'assistant' ? (
                  <View>
                    {item.source && item.source !== 'converted' && (
                      <Chip textStyle={{ fontSize: 10, color: sourceConfig[item.source as keyof typeof sourceConfig]?.color || '#6b7280' }} style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', marginBottom: 6, alignSelf: 'flex-start' }}>
                        {sourceConfig[item.source as keyof typeof sourceConfig]?.label || item.source}
                      </Chip>
                    )}
                    <Markdown style={{ body: { color: '#e5e5e5', fontSize: 13 }, heading1: { color: '#fff' }, heading2: { color: '#fff' }, code_inline: { backgroundColor: 'rgba(255, 255, 255, 0.06)', color: '#a78bfa' }, code_block: { backgroundColor: '#0f0f0f', color: '#e5e5e5' }, bullet_list: { color: '#e5e5e5' }, ordered_list: { color: '#e5e5e5' } }}>
                      {item.content}
                    </Markdown>
                    {item.questionId && item.source !== 'converted' && (
                      <Pressable onPress={() => handleConvert(item.questionId!)} disabled={convertMut.isPending} style={{ marginTop: 8, alignSelf: 'flex-start', opacity: convertMut.isPending ? 0.5 : 1 }}>
                        {convertMut.isPending
                          ? <ActivityIndicator animating size={14} color="#8b5cf6" style={{ marginTop: 4 }} />
                          : <Chip icon="book-plus" textStyle={{ fontSize: 11, color: '#8b5cf6' }} style={{ backgroundColor: 'rgba(139, 92, 246, 0.08)' }}>存入知识库</Chip>}
                      </Pressable>
                    )}
                    {item.source === 'converted' && (
                      <Chip icon="check" textStyle={{ fontSize: 11, color: '#10b981' }} style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', marginTop: 8, alignSelf: 'flex-start' }}>已存入知识库</Chip>
                    )}
                  </View>
                ) : (
                  <Text style={{ color: '#e5e5e5', fontSize: 14 }}>{item.content}</Text>
                )}
              </Card.Content>
            </Card>
            <Pressable onPress={async () => { await Clipboard.setStringAsync(item.content); setCopied(true); }} style={{ marginTop: 4, alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', padding: 4, opacity: 0.6 }}>
              <MaterialCommunityIcons name="content-copy" size={16} color="#a3a3a3" />
            </Pressable>
          </View>
        )}
      />

      <View style={{ paddingHorizontal: 16, paddingBottom: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: '#0a0a0a' }}>
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
      </View>
      <Snackbar visible={copied} onDismiss={() => setCopied(false)} duration={1000} style={{ backgroundColor: '#333', marginBottom: 60 }}><Text style={{ color: '#fff' }}>已复制</Text></Snackbar>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
