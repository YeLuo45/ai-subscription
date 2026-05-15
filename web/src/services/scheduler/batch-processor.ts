// Batch processor - handles bulk article processing when backlog exceeds threshold
import type { BatchConfig } from './types';

export function shouldUseBatchMode(
  backlogCount: number,
  config: BatchConfig
): boolean {
  return config.enabled && backlogCount > config.threshold;
}

export interface BatchItem {
  id: string;
  title: string;
  summary?: string;
  processedAt?: number;
}

export async function processBatch(
  items: BatchItem[],
  config: BatchConfig,
  processor: (item: BatchItem) => Promise<string> // Returns brief summary
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const batchSize = Math.min(config.maxBatchSize, items.length);

  // Process in smaller sub-batches to avoid overwhelming the API
  for (let i = 0; i < batchSize; i += 5) {
    const batch = items.slice(i, i + 5);
    const batchPromises = batch.map(item =>
      processor(item).then(summary => ({ id: item.id, summary }))
    );

    const batchResults = await Promise.allSettled(batchPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.set(result.value.id, result.value.summary);
      }
    }
  }

  return results;
}

export function generateBriefSummary(fullSummary: string, sentenceCount: number = 3): string {
  // Extract first N sentences from a full summary
  const sentences = fullSummary.split(/[.!?]+/).filter(s => s.trim().length > 0);
  return sentences.slice(0, sentenceCount).join('. ').trim() + '.';
}

export function getBatchSummaryStats(
  originalCount: number,
  processedCount: number,
  config: BatchConfig
): { mode: 'full' | 'batch'; reason: string } {
  if (processedCount < originalCount) {
    return {
      mode: 'batch',
      reason: `Batch mode: ${originalCount - processedCount} articles skipped due to large backlog`,
    };
  }
  return {
    mode: 'full',
    reason: 'Full processing mode',
  };
}
