export const relationLabels = ['相关', '依赖', '引用', '对比', '包含'] as const;

export const relationColors: Record<string, string> = {
  '相关': '#8b5cf6',
  '依赖': '#3b82f6',
  '引用': '#10b981',
  '对比': '#f59e0b',
  '包含': '#ef4444',
};

export const categoryColors: Record<string, string> = {
  '技术': '#8b5cf6',
  'AI Generated': '#3b82f6',
  '项目': '#10b981',
  '学习': '#f59e0b',
  '默认': '#6b7280',
};

export const sourceConfig = {
  ai: { color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.08)', label: 'AI' },
  wiki: { color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.08)', label: '知识库' },
  hybrid: { color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.08)', label: '融合' },
};
