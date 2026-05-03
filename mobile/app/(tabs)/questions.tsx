import { useState } from 'react';
import { View, FlatList, TextInput, Pressable, Alert } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuestionList, useDeleteQuestion, useConvertToWiki } from '../../src/hooks/useUnifiedData';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { sourceConfig } from '../../src/lib/constants';
import Markdown from 'react-native-markdown-display';

export default function QuestionsScreen() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: questions, isLoading } = useQuestionList(search || undefined);
  const deleteMut = useDeleteQuestion();
  const convertMut = useConvertToWiki();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <Text variant="titleLarge" style={{ color: '#fff', fontWeight: 'bold' }}>问答历史</Text>
        <Text style={{ color: '#525252', fontSize: 12, marginTop: 2 }}>你与 AI 的所有对话记录</Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#171717', borderRadius: 12, paddingHorizontal: 12 }}>
          <MaterialCommunityIcons name="magnify" size={18} color="#525252" />
          <TextInput value={search} onChangeText={setSearch} placeholder="搜索问答记录..." placeholderTextColor="#525252" style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: '#fff', fontSize: 14 }} />
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator animating color="#f59e0b" /></View>
      ) : (
        <FlatList data={questions} keyExtractor={item => String(item.id)} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 60 }}><Text style={{ color: '#525252' }}>暂无问答记录</Text></View>}
          renderItem={({ item }) => {
            const cfg = sourceConfig[item.source as keyof typeof sourceConfig] || sourceConfig.ai;
            const isExpanded = expandedId === item.id;
            return (
              <Pressable onPress={() => setExpandedId(isExpanded ? null : item.id)}>
                <Card style={{ backgroundColor: '#171717', marginBottom: 8, borderRadius: 12 }}>
                  <Card.Content>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Chip textStyle={{ fontSize: 10, color: cfg.color }} style={{ backgroundColor: cfg.bgColor }}>{cfg.label}</Chip>
                          {item.isConvertedToWiki === 'yes' && <Chip textStyle={{ fontSize: 10, color: '#10b981' }} style={{ backgroundColor: 'rgba(16, 185, 129, 0.06)' }}>已整理</Chip>}
                        </View>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>{item.question}</Text>
                        <Text style={{ color: '#525252', fontSize: 10, marginTop: 4 }}>{new Date(item.createdAt).toLocaleString()}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <Pressable onPress={async () => { await Clipboard.setStringAsync(item.question); setCopied(true); }}><MaterialCommunityIcons name="content-copy" size={18} color="#525252" /></Pressable>
                        <Pressable onPress={() => deleteMut.mutate(item.id)}><MaterialCommunityIcons name="delete-outline" size={18} color="#525252" /></Pressable>
                        <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#525252" />
                      </View>
                    </View>
                    {isExpanded && (
                      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)' }}>
                        <View style={{ maxHeight: 400 }}>
                          <Pressable onPress={async () => { await Clipboard.setStringAsync(item.answer); setCopied(true); }} style={{ position: 'absolute', top: -8, right: 0, zIndex: 1, padding: 4 }}>
                            <MaterialCommunityIcons name="content-copy" size={14} color="#525252" />
                          </Pressable>
                          <Markdown style={{ body: { color: '#e5e5e5', fontSize: 13 }, code_inline: { backgroundColor: 'rgba(255, 255, 255, 0.06)', color: '#a78bfa' }, code_block: { backgroundColor: '#0f0f0f', color: '#e5e5e5' } }}>{item.answer}</Markdown>
                        </View>
                        {item.isConvertedToWiki === 'no' && (
                          <Pressable onPress={() => convertMut.mutate(item.id)} disabled={convertMut.isPending} style={{ marginTop: 12, opacity: convertMut.isPending ? 0.5 : 1 }}>
                            {convertMut.isPending
                              ? <ActivityIndicator animating size={14} color="#8b5cf6" />
                              : <Chip icon="book-plus" textStyle={{ fontSize: 11, color: '#8b5cf6' }} style={{ backgroundColor: 'rgba(139, 92, 246, 0.08)', alignSelf: 'flex-start' }}>存入知识库</Chip>}
                          </Pressable>
                        )}
                      </View>
                    )}
                  </Card.Content>
                </Card>
              </Pressable>
            );
          }}
        />
      )}
      <Snackbar visible={copied} onDismiss={() => setCopied(false)} duration={1000} style={{ backgroundColor: '#333', marginBottom: 60 }}><Text style={{ color: '#fff' }}>已复制</Text></Snackbar>
    </SafeAreaView>
  );
}
