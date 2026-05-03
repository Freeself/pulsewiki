import { getActiveConfig } from './config-reader';

export async function generateTags(title: string, content: string, summary?: string | null): Promise<string[] | null> {
  const config = await getActiveConfig();
  if (!config.aiBaseUrl || !config.aiApiKey) return null;

  const url = `${config.aiBaseUrl}/chat/completions`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.aiApiKey}` },
      body: JSON.stringify({
        model: config.aiModel,
        messages: [
          { role: 'system', content: `你是一个知识管理专家。根据以下 Wiki 内容生成 2-5 个标签（tags）。\n规则：\n- 标签应简洁、有概括性\n- 优先使用中文标签\n- 标签应反映内容的核心主题、技术领域或关键词\n- 直接返回 JSON 数组格式的标签列表，例如 ["前端", "React", "组件"]\n- 不要返回其他文字或 markdown 格式` },
          { role: 'user', content: `标题：${title}\n摘要：${summary || ''}\n内容：${content.slice(0, 1000)}` },
        ],
        temperature: 0.3,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    const raw = data.choices[0]?.message?.content;
    if (!raw) return null;
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : cleaned) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((t): t is string => typeof t === 'string' && t.length > 0 && t.length <= 20).slice(0, 5);
  } catch { return null; }
}
