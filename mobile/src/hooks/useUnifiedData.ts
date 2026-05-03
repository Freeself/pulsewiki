import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as knowledge from '../services/knowledge';
import * as ai from '../services/ai';
import * as network from '../services/network';
import * as config from '../services/config';
import type { Wiki, Question, WikiEdge, AiConfig } from '@db/schema';

// Re-export types for pages
export type { Wiki, Question, WikiEdge, AiConfig };

// ===== Wiki List =====
export function useWikiList(search?: string, tag?: string) {
  return useQuery({
    queryKey: ['wikis', search, tag],
    queryFn: () => knowledge.listWikis({ search, tag }),
  });
}

// ===== Single Wiki =====
export function useWiki(id: number) {
  return useQuery({
    queryKey: ['wiki', id],
    queryFn: () => knowledge.getWiki(id),
    enabled: !!id,
  });
}

// ===== Wiki Tags =====
export function useWikiTags() {
  return useQuery({
    queryKey: ['wikiTags'],
    queryFn: () => knowledge.getWikiTags(),
  });
}

// ===== Create Wiki =====
export function useCreateWiki() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; content: string; summary?: string; category?: string }) => knowledge.createWiki(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wikis'] });
      queryClient.invalidateQueries({ queryKey: ['wikiTags'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// ===== Update Wiki =====
export function useUpdateWiki() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; title?: string; content?: string; summary?: string; category?: string }) => knowledge.updateWiki(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wikis'] });
      queryClient.invalidateQueries({ queryKey: ['wiki', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['wikiTags'] });
    },
  });
}

// ===== Delete Wiki =====
export function useDeleteWiki() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => knowledge.deleteWiki(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wikis'] });
      queryClient.invalidateQueries({ queryKey: ['wiki'] });
      queryClient.invalidateQueries({ queryKey: ['wikiTags'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['network'] });
    },
  });
}

// ===== Update Wiki Tags =====
export function useUpdateWikiTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tags }: { id: number; tags: string[] }) => knowledge.updateWikiTags(id, tags),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wikis'] });
      queryClient.invalidateQueries({ queryKey: ['wiki', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['wikiTags'] });
    },
  });
}

// ===== Regenerate Tags =====
export function useRegenerateTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => knowledge.regenerateTags(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['wikis'] });
      queryClient.invalidateQueries({ queryKey: ['wiki', id] });
      queryClient.invalidateQueries({ queryKey: ['wikiTags'] });
    },
  });
}

// ===== Regenerate Embedding =====
export function useRegenerateEmbedding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => knowledge.regenerateEmbedding(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['wiki', id] });
    },
  });
}

// ===== Backfill Embeddings =====
export function useBackfillEmbeddings() {
  return useMutation({
    mutationFn: () => knowledge.backfillEmbeddings(),
  });
}

// ===== Questions =====
export function useQuestionList(search?: string) {
  return useQuery({
    queryKey: ['questions', search],
    queryFn: () => knowledge.listQuestions(search),
  });
}

// ===== Delete Question =====
export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => knowledge.deleteQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// ===== Stats =====
export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => knowledge.getStats(),
  });
}

// ===== AI Q&A =====
export function useAskQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (question: string) => ai.askQuestion(question),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// ===== Convert to Wiki =====
export function useConvertToWiki() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: number) => ai.convertToWiki(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['wikis'] });
      queryClient.invalidateQueries({ queryKey: ['wikiTags'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// ===== Auto Organize =====
export function useAutoOrganize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ai.autoOrganize(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['wikis'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// ===== Wiki Edges =====
export function useWikiEdges(wikiId: number) {
  return useQuery({
    queryKey: ['wikiEdges', wikiId],
    queryFn: () => network.getWikiEdges(wikiId),
    enabled: !!wikiId,
  });
}

export function useCreateEdge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { sourceWikiId: number; targetWikiId: number; label: string; strength: number }) => network.createEdge(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wikiEdges'] });
      queryClient.invalidateQueries({ queryKey: ['network'] });
    },
  });
}

export function useUpdateEdge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; label?: string; strength?: number }) => network.updateEdge(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wikiEdges'] });
      queryClient.invalidateQueries({ queryKey: ['network'] });
    },
  });
}

export function useDeleteEdge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => network.deleteEdge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wikiEdges'] });
      queryClient.invalidateQueries({ queryKey: ['network'] });
    },
  });
}

// ===== Network =====
export function useNetwork() {
  return useQuery({
    queryKey: ['network'],
    queryFn: () => network.getNetwork(),
  });
}

export function useBuildNetwork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => network.buildNetwork(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network'] });
    },
  });
}

// ===== Config =====
export function useConfigList() {
  return useQuery({
    queryKey: ['configs'],
    queryFn: () => config.listConfigs(),
  });
}

export function useCreateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof config.createConfig>[0]) => config.createConfig(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] });
    },
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof config.updateConfig>[0]) => config.updateConfig(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] });
    },
  });
}

export function useDeleteConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => config.deleteConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] });
    },
  });
}

export function useActivateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => config.activateConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] });
    },
  });
}

export function useDeactivateAllConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => config.deactivateAllConfigs(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] });
    },
  });
}
