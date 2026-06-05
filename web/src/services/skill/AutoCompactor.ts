/**
 * AutoCompactor — Context window management with auto-summarization
 *
 * Inspired by: nanobot-design AutoCompactor
 * Source pattern: /home/hermes/projects/nanobot-design/docs-site/agent-loop.md
 *
 * Tracks token usage against a per-model budget. When usage exceeds a
 * threshold, it auto-compacts the oldest messages into a summary.
 *
 * 4 strategies: truncate_oldest, summarize_oldest, drop_low_priority, sliding_window.
 * 4 model tiers: small (4k), medium (8k), large (16k), xl (32k), xxl (128k), huge (200k).
 * Pure logic — no I/O. Pluggable summarizer function.
 */

export type ModelTier = 'small' | 'medium' | 'large' | 'xl' | 'xxl' | 'huge';

export type CompactionStrategy = 'truncate_oldest' | 'summarize_oldest' | 'drop_low_priority' | 'sliding_window';

export interface ContextMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** Approximate token count of content */
  tokens: number;
  /** Priority for drop_low_priority strategy (higher = more important) */
  priority?: number;
  /** Whether this message can be summarized (vs. must be kept verbatim) */
  summarizable?: boolean;
  timestamp?: number;
}

export interface CompactionResult {
  before: ContextMessage[];
  after: ContextMessage[];
  tokensBefore: number;
  tokensAfter: number;
  droppedIds: string[];
  summarizedIds: string[];
  summaryText?: string;
  reason: 'threshold' | 'manual' | 'overflow' | 'idle';
}

export interface CompactionConfig {
  modelTier: ModelTier;
  strategy: CompactionStrategy;
  /** Trigger compaction when used/max >= threshold (0.0-1.0) */
  threshold: number;
  /** Target tokens after compaction (defaults to 50% of max) */
  targetRatio?: number;
  /** Sliding window size (for sliding_window strategy) */
  windowSize?: number;
  /** Max summary length in tokens */
  maxSummaryTokens?: number;
}

export type Summarizer = (messages: ContextMessage[]) => Promise<string>;

const MODEL_MAX_TOKENS: Record<ModelTier, number> = {
  small: 4_000,
  medium: 8_000,
  large: 16_000,
  xl: 32_000,
  xxl: 128_000,
  huge: 200_000,
};

const DEFAULT_THRESHOLD = 0.8;
const DEFAULT_TARGET_RATIO = 0.5;
const DEFAULT_WINDOW_SIZE = 20;
const DEFAULT_MAX_SUMMARY_TOKENS = 500;

export class AutoCompactor {
  private messages: ContextMessage[] = [];
  private config: CompactionConfig;
  private maxTokens: number;
  private compactionLog: CompactionResult[] = [];

  constructor(config: CompactionConfig, private readonly summarizer?: Summarizer) {
    this.config = { ...config };
    if (!(config.modelTier in MODEL_MAX_TOKENS)) {
      throw new Error(`Invalid model tier "${config.modelTier}". Valid: ${Object.keys(MODEL_MAX_TOKENS).join(', ')}`);
    }
    this.maxTokens = MODEL_MAX_TOKENS[config.modelTier];
    if (this.maxTokens <= 0) {
      throw new Error(`Invalid model tier "${config.modelTier}"`);
    }
    if (config.threshold < 0 || config.threshold > 1) {
      throw new Error('threshold must be in [0, 1]');
    }
  }

  /** Add a single message. Triggers auto-compaction if needed (and not overflowing). */
  add(message: ContextMessage): CompactionResult | null {
    if (message.tokens < 0) {
      throw new Error('message.tokens must be >= 0');
    }
    this.messages.push({ ...message });
    // Skip auto-compaction when overflowing — caller should handle overflow manually
    if (this.shouldCompact() && !this.isOverflowing()) {
      return this.compact('threshold');
    }
    return null;
  }

  /** Add many messages at once. Triggers compaction once if needed. */
  addMany(messages: ContextMessage[]): CompactionResult | null {
    for (const m of messages) {
      if (m.tokens < 0) {
        throw new Error('message.tokens must be >= 0');
      }
      this.messages.push({ ...m });
    }
    if (this.shouldCompact()) {
      return this.compact('threshold');
    }
    return null;
  }

  /** Get current messages (read-only snapshot). */
  getMessages(): ContextMessage[] {
    return this.messages.map((m) => ({ ...m }));
  }

  /** Get total token count. */
  getUsedTokens(): number {
    return this.messages.reduce((sum, m) => sum + m.tokens, 0);
  }

  /** Get max tokens for this model tier. */
  getMaxTokens(): number {
    return this.maxTokens;
  }

  /** Get usage as ratio (0.0-1.0). */
  getUsageRatio(): number {
    if (this.maxTokens === 0) return 1;
    return this.getUsedTokens() / this.maxTokens;
  }

  /** Returns true if usage has crossed the compaction threshold. */
  shouldCompact(): boolean {
    return this.getUsageRatio() > this.config.threshold;
  }

  /** Returns true if usage has exceeded max tokens (overflow). */
  isOverflowing(): boolean {
    return this.getUsedTokens() > this.maxTokens;
  }

  /** Number of messages currently held. */
  size(): number {
    return this.messages.length;
  }

  /** Manually trigger compaction with current config. */
  compact(reason: 'threshold' | 'manual' | 'overflow' | 'idle' = 'manual'): CompactionResult {
    const before = this.getMessages();
    const tokensBefore = this.getUsedTokens();
    const targetTokens = (this.config.targetRatio ?? DEFAULT_TARGET_RATIO) * this.maxTokens;

    let result: { after: ContextMessage[]; dropped: string[]; summarized: string[]; summaryText?: string };

    switch (this.config.strategy) {
      case 'truncate_oldest':
        result = this.truncateOldest(targetTokens);
        break;
      case 'summarize_oldest':
        result = this.summarizeOldest(targetTokens);
        break;
      case 'drop_low_priority':
        result = this.dropLowPriority(targetTokens);
        break;
      case 'sliding_window':
        result = this.slidingWindow(this.config.windowSize ?? DEFAULT_WINDOW_SIZE);
        break;
      default:
        throw new Error(`Unknown strategy "${this.config.strategy}"`);
    }

    this.messages = result.after;
    const compactionResult: CompactionResult = {
      before,
      after: this.getMessages(),
      tokensBefore,
      tokensAfter: this.getUsedTokens(),
      droppedIds: result.dropped,
      summarizedIds: result.summarized,
      summaryText: result.summaryText,
      reason,
    };
    this.compactionLog.push(compactionResult);
    return compactionResult;
  }

  /** Get the compaction log. */
  getCompactionLog(): CompactionResult[] {
    return [...this.compactionLog];
  }

  /** Clear all messages. */
  clear(): void {
    this.messages = [];
  }

  /** Replace the current message list. */
  setMessages(messages: ContextMessage[]): void {
    this.messages = messages.map((m) => ({ ...m }));
  }

  /** Update config (e.g. switch model tier). */
  updateConfig(updates: Partial<CompactionConfig>): void {
    if (updates.modelTier !== undefined) {
      this.maxTokens = MODEL_MAX_TOKENS[updates.modelTier];
      if (this.maxTokens <= 0) {
        throw new Error(`Invalid model tier "${updates.modelTier}"`);
      }
    }
    this.config = { ...this.config, ...updates };
  }

  /** Get the current config. */
  getConfig(): CompactionConfig {
    return { ...this.config };
  }

  /** Get max tokens for a given model tier (static). */
  static getMaxTokensForTier(tier: ModelTier): number {
    return MODEL_MAX_TOKENS[tier];
  }

  // === Internal strategy implementations ===

  private truncateOldest(targetTokens: number): { after: ContextMessage[]; dropped: string[]; summarized: string[] } {
    const dropped: string[] = [];
    let total = this.getUsedTokens();
    let i = 0;
    while (total > targetTokens && i < this.messages.length) {
      total -= this.messages[i].tokens;
      dropped.push(this.messages[i].id);
      i += 1;
    }
    return { after: this.messages.slice(i), dropped, summarized: [] };
  }

  private summarizeOldest(targetTokens: number): { after: ContextMessage[]; dropped: string[]; summarized: string[]; summaryText?: string } {
    const summarized: string[] = [];
    let total = this.getUsedTokens();
    let i = 0;
    // Find all summarizable messages
    while (i < this.messages.length && total > targetTokens) {
      const m = this.messages[i];
      if (m.summarizable === false || m.role === 'system') {
        i += 1;
        continue;
      }
      summarized.push(m.id);
      total -= m.tokens;
      i += 1;
    }
    const after = this.messages.slice(i);
    if (summarized.length > 0 && this.summarizer) {
      // Run summarizer (sync wrapper, not awaited here for purity)
      // In real usage, callers should run via compactAsync()
      return { after, dropped: [], summarized, summaryText: `[${summarized.length} summarized — call compactAsync() to get full text]` };
    }
    return { after, dropped: [], summarized };
  }

  private dropLowPriority(targetTokens: number): { after: ContextMessage[]; dropped: string[]; summarized: string[] } {
    const dropped: string[] = [];
    // Sort by priority ascending (drop lowest priority first)
    const indexed = this.messages.map((m, idx) => ({ m, idx }));
    const sorted = [...indexed].sort((a, b) => (a.m.priority ?? 0) - (b.m.priority ?? 0));
    let total = this.getUsedTokens();
    let j = 0;
    while (total > targetTokens && j < sorted.length) {
      const m = sorted[j].m;
      // Never drop system messages
      if (m.role === 'system') {
        j += 1;
        continue;
      }
      total -= m.tokens;
      dropped.push(m.id);
      j += 1;
    }
    // Keep original order, remove dropped
    const droppedSet = new Set(dropped);
    return { after: this.messages.filter((m) => !droppedSet.has(m.id)), dropped, summarized: [] };
  }

  private slidingWindow(windowSize: number): { after: ContextMessage[]; dropped: string[]; summarized: string[] } {
    if (windowSize <= 0) {
      throw new Error('windowSize must be > 0');
    }
    // Keep system messages + last N messages
    const systemMsgs = this.messages.filter((m) => m.role === 'system');
    const nonSystem = this.messages.filter((m) => m.role !== 'system');
    const kept = nonSystem.slice(-windowSize);
    const droppedIds = nonSystem.slice(0, nonSystem.length - windowSize).map((m) => m.id);
    return { after: [...systemMsgs, ...kept], dropped: droppedIds, summarized: [] };
  }
}

/**
 * Async version of compact that actually runs the summarizer.
 * Use when summarize_oldest strategy is active.
 */
export async function compactAsync(
  compactor: AutoCompactor,
  summarizer: Summarizer,
): Promise<CompactionResult> {
  const before = compactor.getMessages();
  const tokensBefore = compactor.getUsedTokens();
  const targetTokens = (compactor.getConfig().targetRatio ?? DEFAULT_TARGET_RATIO) * compactor.getMaxTokens();
  const summarized: string[] = [];
  let total = tokensBefore;
  let i = 0;
  while (i < before.length && total > targetTokens) {
    const m = before[i];
    if (m.summarizable === false || m.role === 'system') {
      i += 1;
      continue;
    }
    summarized.push(m.id);
    total -= m.tokens;
    i += 1;
  }
  const toSummarize = before.filter((m) => summarized.includes(m.id));
  const summaryText = toSummarize.length > 0 ? await summarizer(toSummarize) : '';

  // Build after: prior non-summarized + summary as new system message
  const summaryTokens = Math.min(summaryText.length / 4, compactor.getConfig().maxSummaryTokens ?? DEFAULT_MAX_SUMMARY_TOKENS);
  const summaryMsg: ContextMessage = {
    id: `summary-${Date.now().toString(36)}`,
    role: 'system',
    content: summaryText,
    tokens: Math.ceil(summaryTokens),
    summarizable: false,
    timestamp: Date.now(),
  };
  const remaining = before.filter((m) => !summarized.includes(m.id));
  compactor.setMessages([summaryMsg, ...remaining]);

  const result: CompactionResult = {
    before,
    after: compactor.getMessages(),
    tokensBefore,
    tokensAfter: compactor.getUsedTokens(),
    droppedIds: [],
    summarizedIds: summarized,
    summaryText,
    reason: 'manual',
  };
  return result;
}
