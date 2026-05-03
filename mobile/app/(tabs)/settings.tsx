import { useState } from 'react';
import { View, TextInput, Pressable, Alert } from 'react-native';
import { Text, Card, Chip, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
const KAScrollView = KeyboardAwareScrollView as any;
import { useConfigList, useCreateConfig, useUpdateConfig, useDeleteConfig, useActivateConfig, useDeactivateAllConfig } from '../../src/hooks/useUnifiedData';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AiConfig } from '@db/schema';

type ConfigForm = {
  name: string; aiBaseUrl: string; aiApiKey: string; aiModel: string;
  aiEmbeddingBaseUrl: string; aiEmbeddingApiKey: string; aiEmbeddingModel: string;
  embeddingApiFormat: 'openai' | 'dashscope'; embeddingThreshold: string;
};

const emptyForm: ConfigForm = {
  name: '', aiBaseUrl: '', aiApiKey: '', aiModel: '',
  aiEmbeddingBaseUrl: '', aiEmbeddingApiKey: '', aiEmbeddingModel: '',
  embeddingApiFormat: 'dashscope', embeddingThreshold: '0.5',
};

function toForm(c: AiConfig): ConfigForm {
  return {
    name: c.name, aiBaseUrl: c.aiBaseUrl ?? '', aiApiKey: c.aiApiKey ?? '', aiModel: c.aiModel ?? '',
    aiEmbeddingBaseUrl: c.aiEmbeddingBaseUrl ?? '', aiEmbeddingApiKey: c.aiEmbeddingApiKey ?? '',
    aiEmbeddingModel: c.aiEmbeddingModel ?? '',
    embeddingApiFormat: (c.embeddingApiFormat as 'openai' | 'dashscope') ?? 'dashscope',
    embeddingThreshold: c.embeddingThreshold ?? '0.5',
  };
}

const inputStyle = { backgroundColor: '#0f0f0f', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 13, marginBottom: 8 };

export default function SettingsScreen() {
  const configQuery = useConfigList();
  const configs = configQuery.data ?? [];
  const activeConfig = configs.find(c => c.isActive);

  const createMut = useCreateConfig();
  const updateMut = useUpdateConfig();
  const deleteMut = useDeleteConfig();
  const activateMut = useActivateConfig();
  const deactivateAllMut = useDeactivateAllConfig();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ConfigForm>(emptyForm);
  const isPending = createMut.isPending || updateMut.isPending;

  const startCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const startEdit = (c: AiConfig) => { setEditingId(c.id); setForm(toForm(c)); setShowForm(true); };

  const handleSave = async () => {
    if (editingId) {
      await updateMut.mutateAsync({ id: editingId, name: form.name, aiBaseUrl: form.aiBaseUrl || null, aiApiKey: form.aiApiKey || null, aiModel: form.aiModel || null, aiEmbeddingBaseUrl: form.aiEmbeddingBaseUrl || null, aiEmbeddingApiKey: form.aiEmbeddingApiKey || null, aiEmbeddingModel: form.aiEmbeddingModel || null, embeddingApiFormat: form.embeddingApiFormat, embeddingThreshold: form.embeddingThreshold });
    } else {
      await createMut.mutateAsync(form);
    }
    setShowForm(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <Text variant="titleLarge" style={{ color: '#fff', fontWeight: 'bold' }}>设置</Text>
      </View>

      <KAScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} extraScrollHeight={80} enableOnAndroid={true}>
        {/* Active config */}
        <Card style={{ backgroundColor: '#171717', marginTop: 12, marginBottom: 12, borderRadius: 12 }}>
          <Card.Content style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="power" size={16} color={activeConfig ? '#10b981' : '#525252'} />
              <Text style={{ color: '#a3a3a3', fontSize: 13 }}>当前：{activeConfig ? activeConfig.name : '未配置'}</Text>
            </View>
            {activeConfig && <Pressable onPress={() => deactivateAllMut.mutate()}><Text style={{ color: '#f59e0b', fontSize: 12 }}>停用</Text></Pressable>}
          </Card.Content>
        </Card>

        {/* Config list */}
        {configs.map(c => (
          <Card key={c.id} style={{ backgroundColor: '#171717', marginBottom: 8, borderRadius: 12 }}>
            <Card.Content>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>{c.name}</Text>
                    {c.isActive && <Chip textStyle={{ fontSize: 9, color: '#10b981' }} style={{ backgroundColor: 'rgba(16, 185, 129, 0.06)' }}>启用中</Chip>}
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {c.aiModel && <Text style={{ color: '#525252', fontSize: 11 }}>LLM: {c.aiModel}</Text>}
                    {c.aiEmbeddingModel && <Text style={{ color: '#525252', fontSize: 11 }}>Embed: {c.aiEmbeddingModel}</Text>}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {!c.isActive && <Pressable onPress={() => activateMut.mutate(c.id)}><MaterialCommunityIcons name="power" size={20} color="#525252" /></Pressable>}
                  <Pressable onPress={() => startEdit(c)}><MaterialCommunityIcons name="pencil-outline" size={20} color="#525252" /></Pressable>
                  <Pressable onPress={() => Alert.alert('确认删除', '确定删除此配置？', [{ text: '取消', style: 'cancel' }, { text: '删除', style: 'destructive', onPress: () => deleteMut.mutate(c.id) }])}><MaterialCommunityIcons name="delete-outline" size={20} color="#525252" /></Pressable>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}

        <Button mode="outlined" onPress={startCreate} icon="plus" style={{ marginTop: 8, borderColor: 'rgba(6, 182, 212, 0.19)' }} textColor="#06b6d4">添加配置</Button>

        {showForm && (
          <Card style={{ backgroundColor: '#171717', marginTop: 16, borderRadius: 12 }}>
            <Card.Content>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500', marginBottom: 12 }}>{editingId ? '编辑配置' : '新建配置'}</Text>
              <Text style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 4 }}>配置名称</Text>
              <TextInput value={form.name} onChangeText={v => setForm({ ...form, name: v })} placeholder="如：DeepSeek" placeholderTextColor="#525252" style={inputStyle} />
              <Text style={{ color: '#8b5cf6', fontSize: 12, fontWeight: '500', marginBottom: 8, marginTop: 8 }}>大模型配置</Text>
              <TextInput value={form.aiBaseUrl} onChangeText={v => setForm({ ...form, aiBaseUrl: v })} placeholder="API Base URL" placeholderTextColor="#525252" style={inputStyle} />
              <TextInput value={form.aiApiKey} onChangeText={v => setForm({ ...form, aiApiKey: v })} placeholder="API Key" placeholderTextColor="#525252" secureTextEntry style={inputStyle} />
              <TextInput value={form.aiModel} onChangeText={v => setForm({ ...form, aiModel: v })} placeholder="模型名称" placeholderTextColor="#525252" style={inputStyle} />
              <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '500', marginBottom: 8, marginTop: 8 }}>Embedding 配置</Text>
              <TextInput value={form.aiEmbeddingBaseUrl} onChangeText={v => setForm({ ...form, aiEmbeddingBaseUrl: v })} placeholder="Embedding API URL" placeholderTextColor="#525252" style={inputStyle} />
              <TextInput value={form.aiEmbeddingApiKey} onChangeText={v => setForm({ ...form, aiEmbeddingApiKey: v })} placeholder="API Key" placeholderTextColor="#525252" secureTextEntry style={inputStyle} />
              <TextInput value={form.aiEmbeddingModel} onChangeText={v => setForm({ ...form, aiEmbeddingModel: v })} placeholder="模型名称" placeholderTextColor="#525252" style={inputStyle} />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {(['dashscope', 'openai'] as const).map(fmt => (
                  <Pressable key={fmt} onPress={() => setForm({ ...form, embeddingApiFormat: fmt })} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name={form.embeddingApiFormat === fmt ? 'radiobox-marked' : 'radiobox-blank'} size={16} color={form.embeddingApiFormat === fmt ? '#06b6d4' : '#525252'} />
                    <Text style={{ color: form.embeddingApiFormat === fmt ? '#06b6d4' : '#525252', fontSize: 12 }}>{fmt === 'openai' ? 'OpenAI' : 'DashScope'}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={{ color: '#06b6d4', fontSize: 12, fontWeight: '500', marginTop: 12, marginBottom: 8 }}>向量搜索配置</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#525252', fontSize: 12 }}>搜索阈值</Text>
                <TextInput value={form.embeddingThreshold} onChangeText={v => setForm({ ...form, embeddingThreshold: v })} keyboardType="decimal-pad" style={[inputStyle, { width: 80 }]} />
                <Text style={{ color: '#525252', fontSize: 10 }}>0~1</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Pressable onPress={() => setShowForm(false)} style={{ paddingHorizontal: 16, paddingVertical: 8 }}><Text style={{ color: '#525252' }}>取消</Text></Pressable>
                <Pressable onPress={handleSave} disabled={isPending || !form.name.trim()} style={{ backgroundColor: 'rgba(6, 182, 212, 0.13)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, opacity: isPending || !form.name.trim() ? 0.4 : 1 }}>
                  <Text style={{ color: '#06b6d4', fontSize: 14 }}>{isPending ? '保存中...' : '保存'}</Text>
                </Pressable>
              </View>
            </Card.Content>
          </Card>
        )}
      </KAScrollView>
    </SafeAreaView>
  );
}
