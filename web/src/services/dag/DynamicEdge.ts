/**
 * DynamicEdge — Map fan-out + Tree fan-in on DAG edges
 *
 * Inspired by: chatdev-design Dynamic execution mode
 * Source pattern: /home/hermes/projects/chatdev-design/docs-site/zh/dynamic.md
 *
 * Two modes:
 *   - Map: splits incoming message into multiple units, parallel processing
 *          (e.g., split an article into paragraphs and process each in parallel)
 *   - Tree: splits AND reduces — group results by some key, recursively merge
 *           (e.g., summarize chunks, then merge summaries, then final summary)
 *
 * Edge configuration:
 *   - split: { type: 'message' | 'regex' | 'jsonPath' | 'field', pattern?, path? }
 *   - max_parallel: limit parallel workers
 *
 * Pure logic + pluggable processor. No I/O.
 */

export type SplitType = 'message' | 'regex' | 'jsonPath' | 'field' | 'array' | 'fixed';

export interface SplitConfig {
  type: SplitType;
  /** For regex: pattern to match (use capturing groups) */
  pattern?: string;
  /** For jsonPath: JSONPath expression */
  path?: string;
  /** For field: object key to extract */
  field?: string;
  /** For fixed: literal split string */
  literal?: string;
  /** For regex without capture groups: return entire match */
  includeWholeMatch?: boolean;
}

export type DynamicMode = 'map' | 'tree';

export interface DynamicEdgeConfig {
  mode: DynamicMode;
  split: SplitConfig;
  /** Max parallel workers (default 5) */
  maxParallel?: number;
  /** For tree mode: key extractor to group results */
  groupBy?: string;
}

export type Item = string | number | boolean | object | null;
export type ItemWithMeta = { item: Item; meta?: Record<string, unknown> };

export type Processor = (item: Item) => Promise<Item> | Item;

export interface MapResult {
  mode: 'map';
  inputs: Item[];
  outputs: Item[];
  errors: Array<{ index: number; item: Item; error: string }>;
  totalTimeMs: number;
  parallelUsed: number;
}

export interface TreeResult {
  mode: 'tree';
  inputs: Item[];
  /** Tree structure: leaf or { groupKey, children, output } */
  output: TreeNode;
  totalTimeMs: number;
}

export interface TreeNode {
  groupKey: string;
  children: TreeNode[];
  output: Item;
  leaf?: boolean;
}

const DEFAULT_MAX_PARALLEL = 5;

/**
 * Split a message into items according to config.
 */
export function splitMessage(message: Item, split: SplitConfig): Item[] {
  if (split.type === 'message') {
    if (typeof message !== 'string') return [message];
    // Default: split by paragraph (double newline) if not further specified
    return message.split(/\n\s*\n/).filter((s) => s.length > 0).map((s) => s.trim());
  }
  if (split.type === 'regex') {
    if (typeof message !== 'string' || !split.pattern) {
      throw new Error('regex split requires string message and pattern');
    }
    const re = new RegExp(split.pattern, 'g');
    const matches: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(message)) !== null) {
      if (m[1] !== undefined) {
        matches.push(m[1]);
      } else if (split.includeWholeMatch) {
        matches.push(m[0]);
      }
    }
    return matches;
  }
  if (split.type === 'jsonPath') {
    if (typeof message !== 'object' || message === null || !split.path) {
      throw new Error('jsonPath split requires object message and path');
    }
    return applyJsonPath(message, split.path);
  }
  if (split.type === 'field') {
    if (typeof message !== 'object' || message === null || !split.field) {
      throw new Error('field split requires object message and field');
    }
    const v = (message as Record<string, unknown>)[split.field];
    if (Array.isArray(v)) return v as Item[];
    if (v === undefined || v === null) return [];
    return [v as Item];
  }
  if (split.type === 'array') {
    if (Array.isArray(message)) return message as Item[];
    return [message];
  }
  if (split.type === 'fixed') {
    if (typeof message !== 'string' || !split.literal) return [message];
    return message.split(split.literal).filter((s) => s.length > 0);
  }
  throw new Error(`Unknown split type "${split.type}"`);
}

/** Apply a simple JSONPath subset: $ for root, .field for nested, [n] for array index. */
function applyJsonPath(obj: Item, path: string): Item[] {
  if (!path.startsWith('$')) {
    throw new Error('jsonPath must start with $');
  }
  const parts: string[] = [];
  const re = /\[(\d+)\]|\.([\w]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    if (m[1] !== undefined) parts.push(`[${m[1]}]`);
    else if (m[2] !== undefined) parts.push(`.${m[2]}`);
  }
  if (parts.length === 0) return [obj];

  let current: Item = obj;
  for (const p of parts) {
    if (p.startsWith('.')) {
      if (typeof current !== 'object' || current === null) return [];
      current = (current as Record<string, unknown>)[p.slice(1)] as Item;
    } else if (p.startsWith('[')) {
      const idx = parseInt(p.slice(1, -1), 10);
      if (!Array.isArray(current)) return [];
      current = current[idx] as Item;
    }
    if (current === undefined) return [];
  }
  if (Array.isArray(current)) return current as Item[];
  return [current];
}

/**
 * Map mode: split input into items, process each in parallel, return flat results.
 */
export async function runMap(
  message: Item,
  config: DynamicEdgeConfig,
  processor: Processor,
): Promise<MapResult> {
  if (config.mode !== 'map') {
    throw new Error('runMap requires mode="map"');
  }
  const startTime = Date.now();
  const items = splitMessage(message, config.split);
  const maxParallel = config.maxParallel ?? DEFAULT_MAX_PARALLEL;

  const outputs: Item[] = new Array(items.length);
  const errors: Array<{ index: number; item: Item; error: string }> = [];
  let parallelUsed = 0;

  // Bounded parallelism via simple chunked execution
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      parallelUsed = Math.max(parallelUsed, cursor - idx);
      const item = items[idx];
      try {
        outputs[idx] = await processor(item);
      } catch (err) {
        errors.push({ index: idx, item, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  const workerCount = Math.min(maxParallel, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return {
    mode: 'map',
    inputs: items,
    outputs,
    errors,
    totalTimeMs: Date.now() - startTime,
    parallelUsed: Math.min(workerCount, items.length),
  };
}

/**
 * Group items by a key (extracted from each item).
 */
export function groupBy(items: Item[], key: string): Map<string, Item[]> {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    let k: string;
    if (typeof item === 'object' && item !== null) {
      const v = (item as Record<string, unknown>)[key];
      k = v === undefined || v === null ? '_null' : String(v);
    } else {
      k = String(item);
    }
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(item);
  }
  return groups;
}

/**
 * Tree mode: split, group by key, recursively reduce each group, build tree.
 */
export async function runTree(
  message: Item,
  config: DynamicEdgeConfig,
  processor: Processor,
  reducer: (groupItems: Item[], groupKey: string) => Promise<Item> | Item,
): Promise<TreeResult> {
  if (config.mode !== 'tree') {
    throw new Error('runTree requires mode="tree"');
  }
  if (!config.groupBy) {
    throw new Error('tree mode requires groupBy key');
  }
  const startTime = Date.now();
  const items = splitMessage(message, config.split);
  const groups = groupBy(items, config.groupBy);

  // Build tree: each group becomes a node, with sub-nodes for each input item
  const buildTree = async (groupItems: Item[], groupKey: string): Promise<TreeNode> => {
    if (groupItems.length === 1) {
      return { groupKey, children: [], output: await processor(groupItems[0]), leaf: true };
    }
    // Sub-nodes: one per item, each processed individually
    const childNodes: TreeNode[] = [];
    for (const item of groupItems) {
      const subGroupKey = String((item as Record<string, unknown>)[config.groupBy!] ?? '_item');
      childNodes.push({ groupKey: subGroupKey, children: [], output: await processor(item), leaf: true });
    }
    // Reduce this group
    const reduced = await reducer(groupItems, groupKey);
    return { groupKey, children: childNodes, output: reduced };
  };

  const children: TreeNode[] = [];
  for (const [gKey, gItems] of groups) {
    children.push(await buildTree(gItems, gKey));
  }

  return {
    mode: 'tree',
    inputs: items,
    output: { groupKey: 'root', children, output: null as unknown as Item },
    totalTimeMs: Date.now() - startTime,
  };
}
