// Model evaluator - parallel multi-model comparison
import { routeAndCall } from '../../../../shared/lib/ai/llm-router';
import type { ModelOutput, EvaluationConfig } from './types';
import { scoreOutput } from './scorer';

function buildMessages(content: string, taskType: string): Array<{role: string; content: string}> {
  switch (taskType) {
    case 'structured-summary':
      return [
        { role: 'system', content: 'You are a professional summarizer. Generate a structured summary with title, key_points (3-5), and sentiment.' },
        { role: 'user', content: `Summarize this article:\n\n${content.slice(0, 4000)}` },
      ];
    case 'tag-generation':
      return [
        { role: 'system', content: 'You are a tag recommendation system. Generate 3-5 relevant tags for the given content.' },
        { role: 'user', content: `Generate tags for:\n\n${content.slice(0, 4000)}` },
      ];
    case 'translation':
      return [
        { role: 'system', content: 'You are a professional translator. Translate the following text to English.' },
        { role: 'user', content: `Translate:\n\n${content.slice(0, 4000)}` },
      ];
    case 'knowledge-graph':
      return [
        { role: 'system', content: 'Extract entities and relationships from the text. Format: "Entity1 -> Relation -> Entity2"' },
        { role: 'user', content: `Extract entities and relations from:\n\n${content.slice(0, 4000)}` },
      ];
    default:
      return [
        { role: 'user', content: content.slice(0, 4000) },
      ];
  }
}

async function callModel(
  modelId: string,
  providerId: string,
  taskType: string,
  content: string,
  startTime: number
): Promise<ModelOutput> {
  const messages = buildMessages(content, taskType);
  
  try {
    const result = await routeAndCall({
      taskType,
      messages,
      modelId,
      providerId,
      maxTokens: 2000,
      temperature: 0.7,
    });

    const latencyMs = Date.now() - startTime;
    const usage = result.usage;
    const totalTokens = usage?.totalTokens || 0;
    const inputTokens = usage?.promptTokens || 0;
    const outputTokens = usage?.completionTokens || 0;
    
    // Calculate cost
    const costUSD = calculateCost(modelId, inputTokens, outputTokens);

    // Get AI self-score
    const qualityScore = await scoreOutput(taskType, result.text);

    return {
      modelId,
      providerId,
      text: result.text,
      qualityScore,
      usage,
      costUSD,
      latencyMs,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      modelId,
      providerId,
      text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: Date.now(),
    };
  }
}

function calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const PRICES: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
    'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
    'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
    'gemini-2.5-pro-preview-06-05': { input: 0.0025, output: 0.01 },
  };
  const price = PRICES[modelId] || { input: 0.001, output: 0.005 };
  return (inputTokens / 1000) * price.input + (outputTokens / 1000) * price.output;
}

export async function runEvaluation(
  config: EvaluationConfig
): Promise<ModelOutput[]> {
  const { models, taskType, articleContent } = config;
  const startTime = Date.now();

  // Parallel calls to all models
  const promises = models.map(m => 
    callModel(m.modelId, m.providerId, taskType, articleContent, startTime)
  );

  const results = await Promise.all(promises);
  return results;
}

export function recommendBestModel(outputs: ModelOutput[]): string {
  // Filter out errors
  const validOutputs = outputs.filter(o => !o.text.startsWith('Error:'));
  if (validOutputs.length === 0) return outputs[0]?.modelId || 'unknown';

  // Score-based recommendation with cost consideration
  // Weight: 70% quality, 30% cost efficiency
  const scored = validOutputs.map(o => {
    const quality = o.qualityScore || 3;
    const cost = o.costUSD || 0.01;
    // Normalize: higher quality = better, lower cost = better
    // Score = quality * 0.7 + (1 / cost_normalized) * 0.3
    const costScore = Math.max(0, 1 - Math.log10(cost + 0.001) / 4); // 0-1, lower cost = higher
    return {
      modelId: o.modelId,
      finalScore: quality * 0.7 + costScore * 0.3,
    };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);
  return scored[0].modelId;
}
