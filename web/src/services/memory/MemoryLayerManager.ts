/**
 * MemoryLayerManager — L0-L4 layered memory with crystallization hooks
 *
 * Inspired by: generic-agent-design Self-Evolution Memory
 * Source: /home/hermes/projects/generic-agent-design/docs-site/memory.md
 *
 * 5-layer memory hierarchy (generic-agent pattern):
 *   - L0: Sensory buffer (raw events, FIFO, last N)
 *   - L1: Short-term (recent items, time-windowed)
 *   - L2: Working (active task context)
 *   - L3: Long-term (consolidated, indexed, persisted)
 *   - L4: Crystallized (skills learned from patterns)
 *
 * Each layer has:
 *   - add / get / query
 *   - promote (move up)
 *   - demote (move down)
 *   - TTL
 *   - capacity
 *
 * MemoryItem has:
 *   - id, layer, content, metadata
 *   - importance (0-1)
 *   - accessCount, lastAccessed
 *   - createdAt, expiresAt
 *
 * Promotions triggered by:
 *   - explicit promote() call
 *   - accessCount > threshold (auto-promote)
 *   - importance > threshold (auto-promote)
 *   - crystallization trigger (move to L4 skill)
 */

export type MemoryLayer = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

export const LAYER_RANK: Record<MemoryLayer, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
};

export interface MemoryItem {
  id: string;
  layer: MemoryLayer;
  content: string;
  metadata: Record<string, unknown>;
  importance: number; // 0-1
  accessCount: number;
  lastAccessed: number;
  createdAt: number;
  expiresAt?: number;
  /** Source layer when promoted (for trace) */
  promotedFrom?: MemoryLayer;
}

export interface LayerConfig {
  capacity: number;
  ttlMs?: number; // Optional TTL
  /** Auto-promote when accessCount exceeds this */
  autoPromoteOnAccess?: number;
  /** Auto-promote when importance exceeds this */
  autoPromoteOnImportance?: number;
}

export interface CrystallizationResult {
  promotedItem: MemoryItem;
  fromLayer: MemoryLayer;
  toLayer: MemoryLayer;
  reason: string;
}

export interface CrystallizationRule {
  /** Match item content/metadata */
  match: (item: MemoryItem) => boolean;
  /** Create a skill from the item */
  crystallize: (item: MemoryItem) => { name: string; description: string };
}

export const DEFAULT_LAYER_CONFIGS: Record<MemoryLayer, LayerConfig> = {
  L0: { capacity: 100, ttlMs: 60_000 },
  L1: { capacity: 50, ttlMs: 300_000 },
  L2: { capacity: 20, ttlMs: 1_800_000 },
  L3: { capacity: 500 },
  L4: { capacity: 50 },
};

export class MemoryLayerManager {
  private layers: Map<MemoryLayer, MemoryItem[]> = new Map();
  private configs: Record<MemoryLayer, LayerConfig>;
  private rules: CrystallizationRule[] = [];
  private counter: number = 0;
  /** Items evicted from L4 (over capacity) */
  private evictLog: Array<{ itemId: string; layer: MemoryLayer; timestamp: number }> = [];

  constructor(configs?: Partial<Record<MemoryLayer, LayerConfig>>) {
    this.configs = { ...DEFAULT_LAYER_CONFIGS, ...configs };
    for (const layer of Object.keys(this.configs) as MemoryLayer[]) {
      this.layers.set(layer, []);
    }
  }

  private nextId(): string {
    this.counter += 1;
    return `mem-${Date.now().toString(36)}-${this.counter}`;
  }

  /**
   * Add a memory item to a specific layer.
   * If layer is at capacity, evicts the least-important item.
   */
  add(layer: MemoryLayer, content: string, options: { importance?: number; metadata?: Record<string, unknown>; ttlMs?: number } = {}): MemoryItem {
    const config = this.configs[layer];
    const list = this.layers.get(layer)!;
    const now = Date.now();
    const item: MemoryItem = {
      id: this.nextId(),
      layer,
      content,
      metadata: options.metadata ?? {},
      importance: options.importance ?? 0.5,
      accessCount: 0,
      lastAccessed: now,
      createdAt: now,
      expiresAt: options.ttlMs ? now + options.ttlMs : (config.ttlMs ? now + config.ttlMs : undefined),
    };
    list.push(item);
    // Eviction
    if (list.length > config.capacity) {
      // Evict least important (with recency tiebreak)
      list.sort((a, b) => a.importance - b.importance || a.createdAt - b.createdAt);
      const evicted = list.shift()!;
      this.evictLog.push({ itemId: evicted.id, layer, timestamp: now });
    }
    return item;
  }

  /**
   * Get an item by id. Bumps accessCount + lastAccessed.
   * Returns undefined if not found or expired.
   */
  get(id: string): MemoryItem | undefined {
    for (const list of this.layers.values()) {
      const item = list.find((i) => i.id === id);
      if (item) {
        if (item.expiresAt && Date.now() > item.expiresAt) {
          // Expired — remove
          this.remove(id);
          return undefined;
        }
        item.accessCount += 1;
        item.lastAccessed = Date.now();
        // Auto-promote check
        const config = this.configs[item.layer];
        if (config.autoPromoteOnAccess && item.accessCount >= config.autoPromoteOnAccess) {
          this.promote(id, this.nextLayer(item.layer), 'auto-promote on access');
        } else if (config.autoPromoteOnImportance && item.importance >= config.autoPromoteOnImportance) {
          this.promote(id, this.nextLayer(item.layer), 'auto-promote on importance');
        }
        return item;
      }
    }
    return undefined;
  }

  /** Get all items in a layer. */
  list(layer: MemoryLayer): MemoryItem[] {
    return [...(this.layers.get(layer) ?? [])];
  }

  /** Get all items across all layers. */
  listAll(): MemoryItem[] {
    const all: MemoryItem[] = [];
    for (const list of this.layers.values()) all.push(...list);
    return all;
  }

  /**
   * Query items by predicate.
   */
  query(predicate: (item: MemoryItem) => boolean, options: { layer?: MemoryLayer; limit?: number } = {}): MemoryItem[] {
    let pool: MemoryItem[];
    if (options.layer) {
      pool = this.layers.get(options.layer) ?? [];
    } else {
      pool = this.listAll();
    }
    return pool.filter(predicate).slice(0, options.limit);
  }

  /**
   * Promote an item from its current layer to a higher layer.
   * Returns CrystallizationResult or undefined if not found.
   */
  promote(id: string, toLayer?: MemoryLayer, reason: string = 'manual'): CrystallizationResult | undefined {
    let item: MemoryItem | undefined;
    let fromLayer: MemoryLayer | undefined;
    for (const [layer, list] of this.layers.entries()) {
      const idx = list.findIndex((i) => i.id === id);
      if (idx >= 0) {
        item = list[idx];
        fromLayer = layer;
        list.splice(idx, 1);
        break;
      }
    }
    if (!item || !fromLayer) return undefined;
    const targetLayer = toLayer ?? this.nextLayer(fromLayer);
    if (!targetLayer || LAYER_RANK[targetLayer] <= LAYER_RANK[fromLayer]) {
      // Can't promote to same or lower layer — re-insert
      this.layers.get(fromLayer)!.push(item);
      return undefined;
    }
    item.layer = targetLayer;
    item.promotedFrom = fromLayer;
    const targetList = this.layers.get(targetLayer)!;
    targetList.push(item);
    if (targetList.length > this.configs[targetLayer].capacity) {
      // Evict
      targetList.sort((a, b) => a.importance - b.importance || a.createdAt - b.createdAt);
      const evicted = targetList.shift()!;
      this.evictLog.push({ itemId: evicted.id, layer: targetLayer, timestamp: Date.now() });
    }
    return { promotedItem: item, fromLayer, toLayer: targetLayer, reason };
  }

  /** Get next higher layer. Returns undefined if at top. */
  nextLayer(layer: MemoryLayer): MemoryLayer | undefined {
    const order: MemoryLayer[] = ['L0', 'L1', 'L2', 'L3', 'L4'];
    const idx = order.indexOf(layer);
    if (idx < 0 || idx >= order.length - 1) return undefined;
    return order[idx + 1];
  }

  /** Demote to a lower layer (for error recovery). */
  demote(id: string, toLayer?: MemoryLayer): boolean {
    let item: MemoryItem | undefined;
    let fromLayer: MemoryLayer | undefined;
    for (const [layer, list] of this.layers.entries()) {
      const idx = list.findIndex((i) => i.id === id);
      if (idx >= 0) {
        item = list[idx];
        fromLayer = layer;
        list.splice(idx, 1);
        break;
      }
    }
    if (!item || !fromLayer) return false;
    const targetLayer = toLayer ?? this.prevLayer(fromLayer);
    if (!targetLayer) {
      this.layers.get(fromLayer)!.push(item);
      return false;
    }
    item.layer = targetLayer;
    this.layers.get(targetLayer)!.push(item);
    return true;
  }

  /** Previous lower layer. */
  prevLayer(layer: MemoryLayer): MemoryLayer | undefined {
    const order: MemoryLayer[] = ['L0', 'L1', 'L2', 'L3', 'L4'];
    const idx = order.indexOf(layer);
    if (idx <= 0) return undefined;
    return order[idx - 1];
  }

  /** Remove an item by id. Returns true if found and removed. */
  remove(id: string): boolean {
    for (const list of this.layers.values()) {
      const idx = list.findIndex((i) => i.id === id);
      if (idx >= 0) {
        list.splice(idx, 1);
        return true;
      }
    }
    return false;
  }

  /** Add a crystallization rule. When promote() hits L4 and matches, the rule fires. */
  addCrystallizationRule(rule: CrystallizationRule): void {
    this.rules.push(rule);
  }

  /**
   * Run crystallization rules against L4 items.
   * Returns the list of items that matched (rule output stored in item.metadata.crystallizedAs).
   */
  crystallize(): Array<{ item: MemoryItem; skill: { name: string; description: string } }> {
    const l4 = this.layers.get('L4')!;
    const results: Array<{ item: MemoryItem; skill: { name: string; description: string } }> = [];
    for (const item of l4) {
      for (const rule of this.rules) {
        if (rule.match(item)) {
          const skill = rule.crystallize(item);
          item.metadata.crystallizedAs = skill;
          results.push({ item, skill });
        }
      }
    }
    return results;
  }

  /** Get eviction log. */
  getEvictLog(): Array<{ itemId: string; layer: MemoryLayer; timestamp: number }> {
    return [...this.evictLog];
  }

  /** Sweep expired items. Returns number removed. */
  sweep(): number {
    const now = Date.now();
    let removed = 0;
    for (const [layer, list] of this.layers.entries()) {
      const before = list.length;
      const remaining = list.filter((i) => !i.expiresAt || i.expiresAt > now);
      removed += before - remaining.length;
      this.layers.set(layer, remaining);
    }
    return removed;
  }

  /** Statistics. */
  stats(): Record<MemoryLayer, { count: number; capacity: number }> {
    const result = {} as Record<MemoryLayer, { count: number; capacity: number }>;
    for (const layer of ['L0', 'L1', 'L2', 'L3', 'L4'] as MemoryLayer[]) {
      result[layer] = {
        count: (this.layers.get(layer) ?? []).length,
        capacity: this.configs[layer].capacity,
      };
    }
    return result;
  }

  /** Total items across all layers. */
  totalSize(): number {
    let total = 0;
    for (const list of this.layers.values()) total += list.length;
    return total;
  }
}
