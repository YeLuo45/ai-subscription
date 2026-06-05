/**
 * ChannelAdapter.test.ts — Pure unit tests for IM/platform channel abstraction
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ChannelAdapterRegistry,
  createChannelAdapter,
  DEFAULT_CHANNELS,
  type ChannelConfig,
  type OutboundMessage,
} from '../ChannelAdapter';

function makeConfig(overrides: Partial<ChannelConfig> = {}): ChannelConfig {
  return {
    kind: 'console',
    name: 'test-channel',
    config: {},
    enabled: true,
    ...overrides,
  };
}

describe('ChannelAdapterRegistry — registration', () => {
  let reg: ChannelAdapterRegistry;
  beforeEach(() => {
    reg = new ChannelAdapterRegistry();
  });

  it('registers an adapter', () => {
    const adapter = createChannelAdapter(makeConfig({ name: 'a' }));
    reg.register(adapter);
    expect(reg.size()).toBe(1);
  });

  it('rejects duplicate name', () => {
    reg.register(createChannelAdapter(makeConfig({ name: 'a' })));
    expect(() => reg.register(createChannelAdapter(makeConfig({ name: 'a' })))).toThrow('already registered');
  });

  it('unregister returns true for existing', () => {
    reg.register(createChannelAdapter(makeConfig({ name: 'a' })));
    expect(reg.unregister('a')).toBe(true);
    expect(reg.size()).toBe(0);
  });

  it('unregister returns false for unknown', () => {
    expect(reg.unregister('nope')).toBe(false);
  });

  it('get returns adapter by name', () => {
    const adapter = createChannelAdapter(makeConfig({ name: 'a' }));
    reg.register(adapter);
    expect(reg.get('a')).toBe(adapter);
  });

  it('get returns undefined for unknown', () => {
    expect(reg.get('nope')).toBeUndefined();
  });

  it('getByKind returns all adapters of a kind', () => {
    reg.register(createChannelAdapter(makeConfig({ name: 'tg1', kind: 'telegram' })));
    reg.register(createChannelAdapter(makeConfig({ name: 'tg2', kind: 'telegram' })));
    reg.register(createChannelAdapter(makeConfig({ name: 'sl1', kind: 'slack' })));
    expect(reg.getByKind('telegram').length).toBe(2);
    expect(reg.getByKind('slack').length).toBe(1);
  });

  it('list returns all adapters', () => {
    reg.register(createChannelAdapter(makeConfig({ name: 'a' })));
    reg.register(createChannelAdapter(makeConfig({ name: 'b' })));
    expect(reg.list().length).toBe(2);
  });
});

describe('ChannelAdapterRegistry — send', () => {
  let reg: ChannelAdapterRegistry;
  beforeEach(() => {
    reg = new ChannelAdapterRegistry();
  });

  it('send via named adapter', async () => {
    const adapter = createChannelAdapter(makeConfig({ name: 'console' }));
    reg.register(adapter);
    const msg: OutboundMessage = { channel: 'console', chatId: 'user-1', text: 'hello' };
    const result = await reg.send('console', msg);
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('send returns error for unknown adapter', async () => {
    const result = await reg.send('nope', { channel: 'console', chatId: 'x', text: 'hi' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('send returns error for disabled adapter', async () => {
    reg.register(createChannelAdapter(makeConfig({ name: 'a', enabled: false })));
    const result = await reg.send('a', { channel: 'console', chatId: 'x', text: 'hi' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('disabled');
  });

  it('broadcast to all adapters of a kind', async () => {
    reg.register(createChannelAdapter(makeConfig({ name: 'tg1', kind: 'telegram' })));
    reg.register(createChannelAdapter(makeConfig({ name: 'tg2', kind: 'telegram' })));
    const results = await reg.broadcast('telegram', { chatId: 'all', text: 'broadcast' });
    expect(results.length).toBe(2);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it('broadcast returns empty array for no adapters of kind', async () => {
    const results = await reg.broadcast('slack', { chatId: 'all', text: 'broadcast' });
    expect(results).toEqual([]);
  });
});

describe('ChannelAdapterRegistry — receive and poll', () => {
  it('pollInbound collects from all adapters', async () => {
    const reg = new ChannelAdapterRegistry();
    const a = createChannelAdapter(makeConfig({ name: 'a' }));
    const b = createChannelAdapter(makeConfig({ name: 'b' }));
    reg.register(a);
    reg.register(b);
    // Enqueue messages
    (a as any).enqueue({ from: 'u1', chatId: 'c1', text: 'hello a' });
    (b as any).enqueue({ from: 'u2', chatId: 'c2', text: 'hello b' });
    (b as any).enqueue({ from: 'u3', chatId: 'c3', text: 'second b' });
    const messages = await reg.pollInbound();
    expect(messages.length).toBe(3);
    expect(messages.find((m) => m.text === 'hello a')).toBeDefined();
  });

  it('receive returns null when queue empty', async () => {
    const reg = new ChannelAdapterRegistry();
    const a = createChannelAdapter(makeConfig({ name: 'a' }));
    reg.register(a);
    const messages = await reg.pollInbound();
    expect(messages).toEqual([]);
  });
});

describe('ChannelAdapterRegistry — health check and close', () => {
  it('healthCheckAll returns status for all', async () => {
    const reg = new ChannelAdapterRegistry();
    reg.register(createChannelAdapter(makeConfig({ name: 'a' })));
    reg.register(createChannelAdapter(makeConfig({ name: 'b' })));
    const status = await reg.healthCheckAll();
    expect(Object.keys(status).length).toBe(2);
    expect(status.a.healthy).toBe(true);
  });

  it('closeAll closes all adapters', async () => {
    const reg = new ChannelAdapterRegistry();
    reg.register(createChannelAdapter(makeConfig({ name: 'a' })));
    reg.register(createChannelAdapter(makeConfig({ name: 'b' })));
    await reg.closeAll();
    // After close, send should fail
    const result = await reg.send('a', { channel: 'console', chatId: 'x', text: 'hi' });
    expect(result.success).toBe(false);
  });
});

describe('createChannelAdapter — factory', () => {
  it('creates adapter from config', () => {
    const adapter = createChannelAdapter(makeConfig({ name: 'test', kind: 'telegram' }));
    expect(adapter.kind).toBe('telegram');
    expect(adapter.name).toBe('test');
  });

  it('adapter has working send and receive', async () => {
    const adapter = createChannelAdapter(makeConfig({ name: 'test' }));
    const result = await adapter.send({ channel: 'console', chatId: 'x', text: 'hi' });
    expect(result.success).toBe(true);
    const recv = await adapter.receive();
    expect(recv).toBeNull();
  });

  it('adapter has working healthCheck', async () => {
    const adapter = createChannelAdapter(makeConfig({ name: 'test' }));
    const h = await adapter.healthCheck();
    expect(h.healthy).toBe(true);
  });
});

describe('DEFAULT_CHANNELS — sanity', () => {
  it('contains 6 channels (5 common + console)', () => {
    expect(DEFAULT_CHANNELS.length).toBe(6);
  });

  it('all channel names are unique', () => {
    const names = DEFAULT_CHANNELS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('covers 5 platform kinds (telegram, slack, webhook, email, push) + console', () => {
    const kinds = new Set(DEFAULT_CHANNELS.map((c) => c.kind));
    expect(kinds.has('telegram')).toBe(true);
    expect(kinds.has('slack')).toBe(true);
    expect(kinds.has('webhook')).toBe(true);
    expect(kinds.has('email')).toBe(true);
    expect(kinds.has('push')).toBe(true);
    expect(kinds.has('console')).toBe(true);
  });

  it('only console is enabled by default', () => {
    const enabled = DEFAULT_CHANNELS.filter((c) => c.enabled);
    expect(enabled.length).toBe(1);
    expect(enabled[0].kind).toBe('console');
  });
});
