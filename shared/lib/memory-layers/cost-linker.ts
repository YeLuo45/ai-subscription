/**
 * Cost Linker - Bridge between cost-tracker and memory-layers
 * 
 * Listens for high-cost records and automatically creates L0 memory entries
 */

import type { CostRecord } from '../ai/cost-tracker/types';
import { promoteFromCost, store } from './layer-manager';
import { isHighCostRecord, scoreFromCostRecord } from './attention';
import type { MemoryConfig } from './types';

/**
 * CostLinker configuration
 */
export interface CostLinkerConfig {
  highCostThreshold?: number;  // Default: 0.05 USD
  autoPromote?: boolean;       // Auto-promote L0 to L1 after expiration
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<CostLinkerConfig> = {
  highCostThreshold: 0.05,
  autoPromote: true,
};

let config = DEFAULT_CONFIG;
let initialized = false;

/**
 * Initialize the cost linker with configuration
 */
export function initCostLinker(cfg?: CostLinkerConfig): void {
  config = { ...DEFAULT_CONFIG, ...cfg };
  initialized = true;
}

/**
 * Check if the cost linker is initialized
 */
export function isInitialized(): boolean {
  return initialized;
}

/**
 * Process a cost record - creates L0 entry if high cost
 * Returns the entry ID if created, undefined otherwise
 */
export async function processCostRecord(record: CostRecord): Promise<string | undefined> {
  if (!initialized) {
    initCostLinker();
  }

  if (isHighCostRecord(record, config.highCostThreshold)) {
    const entryId = await promoteFromCost(record);
    return entryId;
  }

  return undefined;
}

/**
 * Store a regular (non-high-cost) interaction as L0
 * Use this for capturing important interactions regardless of cost
 */
export async function storeInteraction(
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<string> {
  return store({
    layer: 'L0',
    content,
    source: 'cost-tracker',
    score: 30, // Default score for interactions
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hour expiration
    accessCount: 0,
    metadata,
  });
}

/**
 * Create an L0 entry from cost record data
 */
export async function createEntryFromCost(
  record: CostRecord,
  customContent?: string
): Promise<string> {
  const content = customContent || `Cost operation: ${record.taskType} - ${record.costUSD.toFixed(4)} USD`;
  const score = scoreFromCostRecord(record);

  return store({
    layer: 'L0',
    content,
    source: 'cost-tracker',
    score,
    createdAt: record.timestamp,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    accessCount: 1,
    lastAccessedAt: record.timestamp,
    metadata: {
      costUSD: record.costUSD,
      taskType: record.taskType,
      modelId: record.modelId,
      provider: record.provider,
      originalRecordId: record.id,
    },
  });
}

/**
 * Batch process multiple cost records
 * Returns array of entry IDs for high-cost records
 */
export async function processCostRecords(records: CostRecord[]): Promise<string[]> {
  const results: string[] = [];

  for (const record of records) {
    const entryId = await processCostRecord(record);
    if (entryId) {
      results.push(entryId);
    }
  }

  return results;
}

/**
 * Get the configured high cost threshold
 */
export function getHighCostThreshold(): number {
  return config.highCostThreshold;
}

/**
 * Check if a cost record would be considered high cost
 */
export function checkIsHighCost(record: CostRecord): boolean {
  return isHighCostRecord(record, config.highCostThreshold);
}

/**
 * CostLinker singleton for convenience
 */
export const costLinker = {
  init: initCostLinker,
  isInitialized,
  processCostRecord,
  storeInteraction,
  createEntryFromCost,
  processCostRecords,
  getHighCostThreshold,
  checkIsHighCost,
};

export default costLinker;