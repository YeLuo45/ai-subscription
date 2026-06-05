/**
 * FederationManager.test.ts — Pure unit tests for multi-device federation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FederationManager,
  InMemoryTransport,
  SimpleCipherTransport,
  type FederationNode,
} from '../FederationManager';

function makeSpec(overrides: Partial<FederationNode> = {}): Partial<FederationNode> & { name: string; publicKey: string; capabilities: string[] } {
  return {
    name: 'node-1',
    publicKey: 'pubkey-1',
    capabilities: ['chat', 'sync'],
    ...overrides,
  };
}

describe('FederationManager — node management', () => {
  let fm: FederationManager;
  beforeEach(() => {
    fm = new FederationManager(new InMemoryTransport());
  });

  it('adds a node', () => {
    const id = fm.addNode(makeSpec());
    expect(id).toMatch(/^node-/);
    expect(fm.size()).toBe(1);
  });

  it('rejects duplicate id', () => {
    fm.addNode({ ...makeSpec(), id: 'fixed' });
    expect(() => fm.addNode({ ...makeSpec({ name: 'b' }), id: 'fixed' })).toThrow('already exists');
  });

  it('removes a node', () => {
    const id = fm.addNode(makeSpec());
    expect(fm.removeNode(id)).toBe(true);
    expect(fm.size()).toBe(0);
  });

  it('removeNode returns false for unknown', () => {
    expect(fm.removeNode('nope')).toBe(false);
  });

  it('getNode returns by id', () => {
    const id = fm.addNode(makeSpec({ name: 'foo' }));
    expect(fm.getNode(id)?.name).toBe('foo');
  });

  it('listNodes returns all', () => {
    fm.addNode(makeSpec({ name: 'a' }));
    fm.addNode(makeSpec({ name: 'b' }));
    expect(fm.listNodes().length).toBe(2);
  });

  it('listByStatus filters by status', () => {
    const a = fm.addNode(makeSpec({ name: 'a' }));
    const b = fm.addNode(makeSpec({ name: 'b' }));
    fm.connect(a);
    expect(fm.listByStatus('online').length).toBe(1);
    expect(fm.listByStatus('offline').length).toBe(1);
  });
});

describe('FederationManager — connect and disconnect', () => {
  it('connect sets status to online and updates lastSeen', () => {
    const fm = new FederationManager(new InMemoryTransport());
    const id = fm.addNode(makeSpec());
    expect(fm.connect(id)).toBe(true);
    const node = fm.getNode(id)!;
    expect(node.status).toBe('online');
    expect(node.lastSeen).toBeGreaterThan(0);
  });

  it('connect returns false for unknown', () => {
    const fm = new FederationManager(new InMemoryTransport());
    expect(fm.connect('nope')).toBe(false);
  });

  it('disconnect sets status to offline', () => {
    const fm = new FederationManager(new InMemoryTransport());
    const id = fm.addNode(makeSpec());
    fm.connect(id);
    fm.disconnect(id);
    expect(fm.getNode(id)?.status).toBe('offline');
  });
});

describe('FederationManager — sendMessage', () => {
  let fm: FederationManager;
  let alice: string;
  let bob: string;
  beforeEach(() => {
    fm = new FederationManager(new InMemoryTransport());
    alice = fm.addNode(makeSpec({ name: 'alice', publicKey: 'pk-alice' }));
    bob = fm.addNode(makeSpec({ name: 'bob', publicKey: 'pk-bob' }));
    fm.connect(alice);
    fm.connect(bob);
  });

  it('sends a message', () => {
    const msg = fm.sendMessage(alice, bob, 'hello');
    expect(msg.from).toBe(alice);
    expect(msg.to).toBe(bob);
    expect(msg.payload).toBeDefined();
    expect(msg.timestamp).toBeGreaterThan(0);
  });

  it('throws if sender not found', () => {
    expect(() => fm.sendMessage('nope', bob, 'x')).toThrow('not found');
  });

  it('throws if recipient not found', () => {
    expect(() => fm.sendMessage(alice, 'nope', 'x')).toThrow('not found');
  });

  it('throws if sender is offline', () => {
    fm.disconnect(alice);
    expect(() => fm.sendMessage(alice, bob, 'x')).toThrow('offline');
  });

  it('throws if recipient is offline', () => {
    fm.disconnect(bob);
    expect(() => fm.sendMessage(alice, bob, 'x')).toThrow('offline');
  });

  it('throws if payload exceeds maxMessageBytes', () => {
    const fm2 = new FederationManager(new InMemoryTransport(), { maxMessageBytes: 10 });
    const a = fm2.addNode(makeSpec({ name: 'a' }));
    const b = fm2.addNode(makeSpec({ name: 'b' }));
    fm2.connect(a);
    fm2.connect(b);
    expect(() => fm2.sendMessage(a, b, 'x'.repeat(100))).toThrow('exceeds');
  });

  it('records messageSent/Received counters', () => {
    fm.sendMessage(alice, bob, 'hi');
    expect(fm.getNode(alice)?.messagesSent).toBe(1);
    expect(fm.getNode(bob)?.messagesReceived).toBe(1);
  });

  it('includes correlationId and replyTo', () => {
    const msg = fm.sendMessage(alice, bob, 'reply', { correlationId: 'trace-1', replyTo: 'msg-prev' });
    expect(msg.correlationId).toBe('trace-1');
    expect(msg.replyTo).toBe('msg-prev');
  });

  it('throws when requireSecure but transport is not secure', () => {
    const fm2 = new FederationManager(new InMemoryTransport(), { requireSecure: true });
    const a = fm2.addNode(makeSpec({ name: 'a' }));
    const b = fm2.addNode(makeSpec({ name: 'b' }));
    fm2.connect(a);
    fm2.connect(b);
    expect(() => fm2.sendMessage(a, b, 'x')).toThrow('secure transport required');
  });
});

describe('FederationManager — broadcast', () => {
  it('broadcasts to all online nodes except sender', () => {
    const fm = new FederationManager(new InMemoryTransport());
    const a = fm.addNode(makeSpec({ name: 'a' }));
    const b = fm.addNode(makeSpec({ name: 'b' }));
    const c = fm.addNode(makeSpec({ name: 'c' }));
    fm.connect(a);
    fm.connect(b);
    fm.connect(c);
    const result = fm.broadcast(a, 'broadcast message');
    expect(result.delivered).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('skips offline nodes', () => {
    const fm = new FederationManager(new InMemoryTransport());
    const a = fm.addNode(makeSpec({ name: 'a' }));
    const b = fm.addNode(makeSpec({ name: 'b' }));
    const c = fm.addNode(makeSpec({ name: 'c' }));
    fm.connect(a);
    fm.connect(b);
    fm.disconnect(c);
    const result = fm.broadcast(a, 'x');
    expect(result.delivered).toBe(1);
  });

  it('applies filter', () => {
    const fm = new FederationManager(new InMemoryTransport());
    const a = fm.addNode(makeSpec({ name: 'a', capabilities: ['chat'] }));
    const b = fm.addNode(makeSpec({ name: 'b', capabilities: ['video'] }));
    fm.connect(a);
    fm.connect(b);
    const result = fm.broadcast(a, 'x', (n) => n.capabilities.includes('chat'));
    expect(result.delivered).toBe(0); // b is not chat-capable
  });

  it('returns 0 delivered when no other nodes', () => {
    const fm = new FederationManager(new InMemoryTransport());
    const a = fm.addNode(makeSpec());
    fm.connect(a);
    const result = fm.broadcast(a, 'x');
    expect(result.delivered).toBe(0);
  });
});

describe('FederationManager — sync', () => {
  it('syncs two online nodes', () => {
    const fm = new FederationManager(new InMemoryTransport());
    const a = fm.addNode(makeSpec({ name: 'a' }));
    const b = fm.addNode(makeSpec({ name: 'b' }));
    fm.connect(a);
    fm.connect(b);
    expect(fm.sync(a, b, 5)).toBe(true);
    expect(fm.getSyncLog().length).toBe(1);
  });

  it('returns false if either node offline', () => {
    const fm = new FederationManager(new InMemoryTransport());
    const a = fm.addNode(makeSpec({ name: 'a' }));
    const b = fm.addNode(makeSpec({ name: 'b' }));
    fm.connect(a);
    expect(fm.sync(a, b)).toBe(false);
  });

  it('returns false for unknown nodes', () => {
    const fm = new FederationManager(new InMemoryTransport());
    expect(fm.sync('nope', 'nope2')).toBe(false);
  });
});

describe('FederationManager — sweepOffline', () => {
  it('marks nodes offline if lastSeen > threshold', () => {
    const fm = new FederationManager(new InMemoryTransport(), { offlineThresholdMs: 100 });
    const id = fm.addNode(makeSpec());
    fm.connect(id);
    const node = fm.getNode(id)!;
    node.lastSeen = Date.now() - 200; // Pretend 200ms ago
    const count = fm.sweepOffline();
    expect(count).toBe(1);
    expect(fm.getNode(id)?.status).toBe('offline');
  });

  it('returns 0 when all nodes are fresh', () => {
    const fm = new FederationManager(new InMemoryTransport());
    const id = fm.addNode(makeSpec());
    fm.connect(id);
    expect(fm.sweepOffline()).toBe(0);
  });
});

describe('FederationManager — messages log', () => {
  it('getMessages filters by from/to', () => {
    const fm = new FederationManager(new InMemoryTransport());
    const a = fm.addNode(makeSpec({ name: 'a' }));
    const b = fm.addNode(makeSpec({ name: 'b' }));
    fm.connect(a);
    fm.connect(b);
    fm.sendMessage(a, b, '1');
    fm.sendMessage(b, a, '2');
    expect(fm.getMessages({ from: a }).length).toBe(1);
    expect(fm.getMessages({ to: a }).length).toBe(1);
  });

  it('getMessages with limit returns last N', () => {
    const fm = new FederationManager(new InMemoryTransport());
    const a = fm.addNode(makeSpec({ name: 'a' }));
    const b = fm.addNode(makeSpec({ name: 'b' }));
    fm.connect(a);
    fm.connect(b);
    for (let i = 0; i < 10; i++) fm.sendMessage(a, b, `m${i}`);
    const last3 = fm.getMessages({ limit: 3 });
    expect(last3.length).toBe(3);
  });
});

describe('FederationManager — stats', () => {
  it('reports counts', () => {
    const fm = new FederationManager(new InMemoryTransport());
    const a = fm.addNode(makeSpec({ name: 'a' }));
    const b = fm.addNode(makeSpec({ name: 'b' }));
    fm.connect(a);
    fm.connect(b);
    fm.sendMessage(a, b, 'hi');
    fm.sync(a, b);
    const s = fm.stats();
    expect(s.totalNodes).toBe(2);
    expect(s.onlineNodes).toBe(2);
    expect(s.totalMessages).toBe(1);
    expect(s.totalSyncs).toBe(1);
  });
});

describe('InMemoryTransport — encode/decode', () => {
  it('round-trips payload', () => {
    const t = new InMemoryTransport();
    const encoded = t.encode('hello', 'k');
    expect(encoded).not.toBe('hello');
    expect(t.decode(encoded, 'k')).toBe('hello');
  });

  it('isSecure is false', () => {
    expect(new InMemoryTransport().isSecure).toBe(false);
  });
});

describe('SimpleCipherTransport — encode/decode', () => {
  it('round-trips with shared key', () => {
    const t = new SimpleCipherTransport('key');
    const encoded = t.encode('secret', 'k');
    expect(encoded).not.toBe('secret');
    expect(t.decode(encoded, 'k')).toBe('secret');
  });

  it('isSecure is true', () => {
    expect(new SimpleCipherTransport().isSecure).toBe(true);
  });
});
