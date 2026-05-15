// Model evaluator types - evaluation tasks, results, history

export type EvaluationTaskType = 
  | 'structured-summary'
  | 'tag-generation'
  | 'translation'
  | 'knowledge-graph';

export interface ModelOutput {
  modelId: string;
  providerId: string;
  text: string;
  qualityScore?: number; // 1-5, AI self-rated
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  costUSD?: number;
  latencyMs?: number;
  timestamp: number;
}

export interface EvaluationResult {
  id: string;
  articleId: string;
  articleTitle: string;
  taskType: EvaluationTaskType;
  outputs: ModelOutput[];
  recommendedModelId: string;
  totalCostUSD: number;
  totalTokens: number;
  createdAt: number;
}

export interface EvaluationConfig {
  models: Array<{
    modelId: string;
    providerId: string;
  }>;
  taskType: EvaluationTaskType;
  articleContent: string;
}

export const TASK_LABELS: Record<EvaluationTaskType, string> = {
  'structured-summary': 'Structured Summary',
  'tag-generation': 'Tag Generation',
  'translation': 'Translation',
  'knowledge-graph': 'Knowledge Extraction',
};

export const DEFAULT_EVAL_MODELS = [
  { modelId: 'gpt-4o', providerId: 'openai' },
  { modelId: 'claude-3-5-sonnet-20241022', providerId: 'anthropic' },
  { modelId: 'gemini-2.5-pro-preview-06-05', providerId: 'google' },
];
