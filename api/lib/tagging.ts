import { getActiveConfig } from "./config-reader";

export async function generateTags(
  title: string,
  content: string,
  summary?: string | null
): Promise<string[] | null> {
  const config = await getActiveConfig();
  if (!config.aiBaseUrl) return null;

  const url = `${config.aiBaseUrl}/chat/completions`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.aiApiKey}`,
      },
      body: JSON.stringify({
        model: config.aiModel,
        messages: [
          {
            role: "system",
            content: `你是一个知识管理专家。根据以下 Wiki 内容生成 2-5 个标签（tags）。
规则：
- 标签应简洁、有概括性
- 优先使用中文标签
- 标签应反映内容的核心主题、技术领域或关键词
- 直接返回 JSON 数组格式的标签列表，例如 ["前端", "React", "组件"]
- 不要返回其他文字或 markdown 格式`,
          },
          {
            role: "user",
            content: `标题：${title}\n摘要：${summary || ""}\n内容：${content.slice(0, 1000)}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!resp.ok) return null;

    const data = (await resp.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const raw = data.choices[0]?.message?.content;
    if (!raw) return null;

    // Parse JSON array from response
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    const jsonStr = match ? match[0] : cleaned;
    const parsed = JSON.parse(jsonStr) as unknown;

    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((t): t is string => typeof t === "string" && t.length > 0 && t.length <= 20)
      .slice(0, 5);
  } catch {
    return null;
  }
}
