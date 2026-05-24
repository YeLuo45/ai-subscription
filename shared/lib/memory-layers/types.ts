/**
 * L0-L4 Layered Memory System Types
 * 
 * L0: Immediate memory - current session raw interactions
 * L1: Episodic memory - session summaries from DreamMemory
 * L2: Semantic memory - user preferences, topic interests
 * L3: Skill memory - learned tools, skills, workflow patterns
 * L4: Metacognitive memory - self-evaluation, optimization suggestions
 */

export type MemoryLayer = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

export type MemorySource = 'dream' | 'cost-tracker' | 'user-action' | 'agent-reflection' | 'cost-high';

export interface MemoryEntry {
  id: string;
  layer: MemoryLayer;
  content: string;
  source: MemorySource;
  score: number;          // Attention score 0-100
  createdAt: number;      // Creation timestamp
  expiresAt?: number;     // L0/L1 have expiration, others undefined=permanent
  accessCount: number;    // Number of times accessed
  lastAccessedAt?: number; // Last access timestamp
  metadata: Record<string, unknown>;
}

export interface MemoryConfig {
  dbName?: string;
  storeName?: string;
  version?: number;
  highCostThreshold?: number;  // Default: 0.05 USD
  l0ExpirationMs?: number;     // Default: 24h
  l1ExpirationMs?: number;      // Default: 7 days
}

export interface LayerStats {
  layer: MemoryLayer;
  count: number;
  oldestEntry?: number;
  newestEntry?: number;
}

export interface PromoteOptions {
  fromLayer: MemoryLayer;
  toLayer: MemoryLayer;
  entryId: string;
}

export interface QueryOptions {
  layer?: MemoryLayer;
  limit?: number;
  includeExpired?: boolean;
  minScore?: number;
}