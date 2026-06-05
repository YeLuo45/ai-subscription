/**
 * AutoCompactor.test.ts — Pure unit tests for context window management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AutoCompactor, compactAsync, type ContextMessage } from '../AutoCompactor';

function msg(overrides: Partial<ContextMessage> = {}): ContextMessage {
  return {
    id: `m-${Math.random().toString(36).slice(2, 8)}`,
    role: 'user',
    content: 'hello world',
    tokens: 100,
    ...overrides,
  };
}

describe('AutoCompactor — initialization and config', () => {
  it('initializes with valid config', () => {
    const c = new AutoCompactor({ modelTier: 'large', strategy: 'truncate_oldest', threshold: 0.8 });
    expect(c.size()).toBe(0);
    expect(c.getUsedTokens()).toBe(0);
    expect(c.getMaxTokens()).toBe(16_000);
  });

  it('rejects invalid threshold', () => {
    expect(() => new AutoCompactor({ modelTier: 'large', strategy: 'truncate_oldest', threshold: 1.5 })).toThrow('threshold must be in [0, 1]');
    expect(() => new AutoCompactor({ modelTier: 'large', strategy: 'truncate_oldest', threshold: -0.1 })).toThrow('threshold must be in [0, 1]');
  });

  it('rejects invalid model tier', () => {
    expect(() => new AutoCompactor({ modelTier: 'invalid' as never, strategy: 'truncate_oldest', threshold: 0.8 })).toThrow('Invalid model tier');
  });

  it('static getMaxTokensForTier returns model capacity', () => {
    expect(AutoCompactor.getMaxTokensForTier('small')).toBe(4_000);
    expect(AutoCompactor.getMaxTokensForTier('medium')).toBe(8_000);
    expect(AutoCompactor.getMaxTokensForTier('large')).toBe(16_000);
    expect(AutoCompactor.getMaxTokensForTier('xl')).toBe(32_000);
    expect(AutoCompactor.getMaxTokensForTier('xxl')).toBe(128_000);
    expect(AutoCompactor.getMaxTokensForTier('huge')).toBe(200_000);
  });

  it('updateConfig can change model tier', () => {
    const c = new AutoCompactor({ modelTier: 'small', strategy: 'truncate_oldest', threshold: 0.8 });
    expect(c.getMaxTokens()).toBe(4_000);
    c.updateConfig({ modelTier: 'huge' });
    expect(c.getMaxTokens()).toBe(200_000);
  });
});

describe('AutoCompactor — add and tracking', () => {
  it('add increments messages and tokens', () => {
    const c = new AutoCompactor({ modelTier: 'small', strategy: 'truncate_oldest', threshold: 0.8 });
    c.add(msg({ tokens: 100 }));
    c.add(msg({ tokens: 200 }));
    expect(c.size()).toBe(2);
    expect(c.getUsedTokens()).toBe(300);
  });

  it('add rejects negative tokens', () => {
    const c = new AutoCompactor({ modelTier: 'small', strategy: 'truncate_oldest', threshold: 0.8 });
    expect(() => c.add(msg({ tokens: -1 }))).toThrow('tokens must be');
  });

  it('addMany adds and triggers compaction once', () => {
    const c = new AutoCompactor({ modelTier: 'small', strategy: 'truncate_oldest', threshold: 0.8, targetRatio: 0.5 });
    c.addMany([msg({ tokens: 1000 }), msg({ tokens: 1000 }), msg({ tokens: 1000 })]);
    // 3000 / 4000 = 0.75 < 0.8, no compaction
    expect(c.size()).toBe(3);
    // Manually trigger compaction
    c.compact('manual');
    expect(c.getUsedTokens()).toBeLessThanOrEqual(2000);
  });

  it('getUsageRatio returns fraction of max', () => {
    const c = new AutoCompactor({ modelTier: 'small', strategy: 'truncate_oldest', threshold: 0.8 });
    c.add(msg({ tokens: 2000 }));
    expect(c.getUsageRatio()).toBe(0.5);
  });

  it('shouldCompact returns true when ratio > threshold', () => {
    const c = new AutoCompactor({ modelTier: 'huge', strategy: 'truncate_oldest', threshold: 0.01, targetRatio: 0.5 });
    c.add(msg({ tokens: 0 })); // 0/200000 = 0
    expect(c.shouldCompact()).toBe(false);
    // Manually push tokens via setMessages to avoid auto-compaction
    c.setMessages([msg({ id: 'a', tokens: 3000 })]);
    expect(c.shouldCompact()).toBe(true); // 3000/200000 = 0.015 > 0.01
  });

  it('threshold=1.0 effectively disables auto-compaction', () => {
    const c = new AutoCompactor({ modelTier: 'small', strategy: 'truncate_oldest', threshold: 1.0, targetRatio: 0.5 });
    c.add(msg({ tokens: 4000 })); // ratio = 1.0, NOT > 1.0
    expect(c.shouldCompact()).toBe(false);
    expect(c.size()).toBe(1);
  });

  it('isOverflowing returns true when used > max', () => {
    const c = new AutoCompactor({ modelTier: 'small', strategy: 'truncate_oldest', threshold: 1.0, targetRatio: 0.5 });
    c.add(msg({ tokens: 5000 })); // exceeds 4000, but no compaction (threshold=1.0)
    expect(c.isOverflowing()).toBe(true);
  });
});

describe('AutoCompactor — truncate_oldest strategy', () => {
  it('drops oldest messages until under target', () => {
    const c = new AutoCompactor({
      modelTier: 'small',
      strategy: 'truncate_oldest',
      threshold: 1.0, // disable auto-compaction
      targetRatio: 0.5,
    });
    c.add(msg({ id: 'a', tokens: 1000 }));
    c.add(msg({ id: 'b', tokens: 1000 }));
    c.add(msg({ id: 'c', tokens: 1000 }));
    c.add(msg({ id: 'd', tokens: 1000 }));
    // 4000 used, target 2000
    const r = c.compact('manual');
    expect(r.droppedIds).toEqual(['a', 'b']);
    expect(r.tokensAfter).toBe(2000);
  });

  it('no-op when already under target', () => {
    const c = new AutoCompactor({
      modelTier: 'small',
      strategy: 'truncate_oldest',
      threshold: 0.99,
      targetRatio: 0.5,
    });
    c.add(msg({ id: 'a', tokens: 500 }));
    c.add(msg({ id: 'b', tokens: 500 }));
    const r = c.compact('manual');
    expect(r.droppedIds).toEqual([]);
  });
});

describe('AutoCompactor — drop_low_priority strategy', () => {
  it('drops lowest-priority messages first', () => {
    const c = new AutoCompactor({
      modelTier: 'small',
      strategy: 'drop_low_priority',
      threshold: 1.0, // disable auto-compaction
      targetRatio: 0.5,
    });
    c.add(msg({ id: 'high', tokens: 1000, priority: 10 }));
    c.add(msg({ id: 'low', tokens: 1000, priority: 1 }));
    c.add(msg({ id: 'med', tokens: 1000, priority: 5 }));
    c.add(msg({ id: 'veryhigh', tokens: 1000, priority: 20 }));
    const r = c.compact('manual');
    expect(r.droppedIds).toContain('low');
    expect(r.droppedIds).toContain('med');
    expect(r.droppedIds).not.toContain('high');
    expect(r.droppedIds).not.toContain('veryhigh');
  });

  it('never drops system messages', () => {
    const c = new AutoCompactor({
      modelTier: 'small',
      strategy: 'drop_low_priority',
      threshold: 1.0,
      targetRatio: 0.5,
    });
    c.add(msg({ id: 'sys', role: 'system', tokens: 1000, priority: 0 }));
    c.add(msg({ id: 'low', tokens: 1000, priority: 1 }));
    c.add(msg({ id: 'med', tokens: 1000, priority: 5 }));
    c.add(msg({ id: 'high', tokens: 1000, priority: 10 }));
    c.compact('manual');
    const after = c.getMessages();
    expect(after.find((m) => m.id === 'sys')).toBeDefined();
  });
});

describe('AutoCompactor — sliding_window strategy', () => {
  it('keeps system messages + last N non-system', () => {
    const c = new AutoCompactor({
      modelTier: 'small',
      strategy: 'sliding_window',
      threshold: 1.0, // disable auto-compaction
      windowSize: 2,
    });
    c.add(msg({ id: 'sys1', role: 'system' }));
    c.add(msg({ id: 'a' }));
    c.add(msg({ id: 'b' }));
    c.add(msg({ id: 'c' }));
    c.add(msg({ id: 'd' }));
    c.compact('manual');
    const after = c.getMessages().map((m) => m.id);
    expect(after).toContain('sys1');
    expect(after).toContain('c');
    expect(after).toContain('d');
    expect(after).not.toContain('a');
    expect(after).not.toContain('b');
  });

  it('rejects non-positive windowSize', () => {
    const c = new AutoCompactor({
      modelTier: 'small',
      strategy: 'sliding_window',
      threshold: 1.0,
      windowSize: 0,
    });
    c.add(msg());
    expect(() => c.compact()).toThrow('windowSize must be > 0');
  });
});

describe('AutoCompactor — summarize_oldest strategy', () => {
  it('marks old messages as summarized (without async summarizer)', () => {
    const c = new AutoCompactor({
      modelTier: 'small',
      strategy: 'summarize_oldest',
      threshold: 1.0, // disable auto-compaction
      targetRatio: 0.5,
    });
    c.add(msg({ id: 'a', tokens: 1000, summarizable: true }));
    c.add(msg({ id: 'b', tokens: 1000, summarizable: true }));
    c.add(msg({ id: 'c', tokens: 1000 }));
    c.add(msg({ id: 'd', tokens: 1000 }));
    const r = c.compact('manual');
    expect(r.summarizedIds.length).toBeGreaterThan(0);
  });

  it('skips non-summarizable messages', () => {
    const c = new AutoCompactor({
      modelTier: 'small',
      strategy: 'summarize_oldest',
      threshold: 1.0,
      targetRatio: 0.5,
    });
    c.add(msg({ id: 'lock', tokens: 1000, summarizable: false }));
    c.add(msg({ id: 'a', tokens: 1000 }));
    c.add(msg({ id: 'b', tokens: 1000 }));
    c.add(msg({ id: 'c', tokens: 1000 }));
    const r = c.compact('manual');
    expect(r.summarizedIds).not.toContain('lock');
  });

  it('compactAsync returns summary text from summarizer', async () => {
    const c = new AutoCompactor({
      modelTier: 'small',
      strategy: 'summarize_oldest',
      threshold: 1.0,
      targetRatio: 0.5,
    });
    c.add(msg({ id: 'a', tokens: 1000, content: 'first' }));
    c.add(msg({ id: 'b', tokens: 1000, content: 'second' }));
    c.add(msg({ id: 'c', tokens: 1000, content: 'third' }));
    c.add(msg({ id: 'd', tokens: 1000, content: 'fourth' }));
    const summarizer = async (msgs: ContextMessage[]) => `Summary of ${msgs.length} messages`;
    const r = await compactAsync(c, summarizer);
    expect(r.summaryText).toBe('Summary of 2 messages');
    expect(r.summarizedIds.length).toBe(2);
    // Verify summary message was added
    const sys = c.getMessages().find((m) => m.role === 'system' && m.content.startsWith('Summary'));
    expect(sys).toBeDefined();
  });

  it('compactAsync returns empty summary when no messages to summarize', async () => {
    const c = new AutoCompactor({
      modelTier: 'small',
      strategy: 'summarize_oldest',
      threshold: 1.0,
      targetRatio: 0.5,
    });
    c.add(msg({ id: 'a', tokens: 100, summarizable: false }));
    const r = await compactAsync(c, async () => 'should not run');
    expect(r.summaryText).toBe('');
  });
});

describe('AutoCompactor — auto-compaction on add', () => {
  it('triggers compaction when adding a message crosses threshold', () => {
    const c = new AutoCompactor({
      modelTier: 'small',
      strategy: 'truncate_oldest',
      threshold: 0.8,
      targetRatio: 0.5,
    });
    c.add(msg({ id: 'a', tokens: 1500 }));
    c.add(msg({ id: 'b', tokens: 1500 })); // 3000/4000 = 0.75, no compact
    expect(c.size()).toBe(2);
    c.add(msg({ id: 'c', tokens: 1000 })); // 4000/4000 = 1.0, compact
    expect(c.getUsedTokens()).toBeLessThanOrEqual(2000);
  });

  it('returns null when no compaction needed', () => {
    const c = new AutoCompactor({
      modelTier: 'huge',
      strategy: 'truncate_oldest',
      threshold: 0.8,
    });
    const r = c.add(msg({ tokens: 100 }));
    expect(r).toBeNull();
  });
});

describe('AutoCompactor — clear and replace', () => {
  it('clear removes all messages', () => {
    const c = new AutoCompactor({ modelTier: 'small', strategy: 'truncate_oldest', threshold: 0.8 });
    c.add(msg());
    c.add(msg());
    c.clear();
    expect(c.size()).toBe(0);
    expect(c.getUsedTokens()).toBe(0);
  });

  it('setMessages replaces content', () => {
    const c = new AutoCompactor({ modelTier: 'small', strategy: 'truncate_oldest', threshold: 0.8 });
    c.add(msg({ id: 'a' }));
    c.setMessages([msg({ id: 'x', tokens: 500 })]);
    expect(c.size()).toBe(1);
    expect(c.getUsedTokens()).toBe(500);
  });
});

describe('AutoCompactor — compaction log', () => {
  it('records every compaction', () => {
    const c = new AutoCompactor({
      modelTier: 'small',
      strategy: 'truncate_oldest',
      threshold: 1.0, // disable auto-compaction
      targetRatio: 0.5,
    });
    c.add(msg({ id: 'a', tokens: 2000 }));
    c.add(msg({ id: 'b', tokens: 2000 }));
    c.compact('manual');
    c.compact('idle');
    const log = c.getCompactionLog();
    expect(log.length).toBe(2);
    expect(log[0].reason).toBe('manual');
    expect(log[1].reason).toBe('idle');
  });

  it('log captures before/after state', () => {
    const c = new AutoCompactor({
      modelTier: 'small',
      strategy: 'truncate_oldest',
      threshold: 1.0, // disable auto-compaction
      targetRatio: 0.5,
    });
    c.add(msg({ id: 'a', tokens: 1000 }));
    c.add(msg({ id: 'b', tokens: 1000 }));
    c.add(msg({ id: 'c', tokens: 1000 }));
    c.add(msg({ id: 'd', tokens: 1000 }));
    const r = c.compact('manual');
    expect(r.tokensBefore).toBe(4000);
    expect(r.tokensAfter).toBe(2000);
    expect(r.before.length).toBe(4);
    expect(r.after.length).toBe(2);
  });
});
