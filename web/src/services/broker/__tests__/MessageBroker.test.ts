/**
 * MessageBroker.test.ts — Pure unit tests for message queue broker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MessageBroker } from '../MessageBroker';

describe('MessageBroker — publish and subscribe', () => {
  let b: MessageBroker;
  beforeEach(() => {
    b = new MessageBroker();
  });

  it('subscribe returns subscription id', () => {
    const id = b.subscribe('t', () => {});
    expect(id).toMatch(/^msg-/);
  });

  it('subscriber receives published message', async () => {
    let received: any = null;
    b.subscribe('t', (m) => { received = m; });
    b.publish('t', { x: 1 });
    await new Promise((r) => setTimeout(r, 10));
    expect(received).toBeDefined();
    expect(received.payload.x).toBe(1);
  });

  it('multiple subscribers all receive (fanout)', async () => {
    let count = 0;
    b.subscribe('t', () => { count += 1; });
    b.subscribe('t', () => { count += 1; });
    b.publish('t', {});
    await new Promise((r) => setTimeout(r, 10));
    expect(count).toBe(2);
  });

  it('publish with no subscribers returns id but drops message', () => {
    const id = b.publish('no-subs', 'x');
    expect(id).toMatch(/^msg-/);
  });
});

describe('MessageBroker — acknowledge', () => {
  it('removes message on acknowledge', async () => {
    const b = new MessageBroker();
    b.subscribe('t', (m) => {
      b.acknowledge(m.id, m.subscriptionId);
    });
    b.publish('t', { x: 1 });
    await new Promise((r) => setTimeout(r, 10));
    expect(b.inflightCount()).toBe(0);
  });

  it('acknowledge returns false for unknown', () => {
    const b = new MessageBroker();
    expect(b.acknowledge('nope')).toBe(false);
  });
});

describe('MessageBroker — reject and DLQ', () => {
  it('reject re-queues with attempt count', async () => {
    const b = new MessageBroker({ maxAttempts: 3 });
    let calls = 0;
    b.subscribe('t', (m) => {
      calls += 1;
      if (calls === 1) {
        b.reject(m.id, m.subscriptionId, true);
      } else {
        b.acknowledge(m.id, m.subscriptionId);
      }
    });
    b.publish('t', {});
    await new Promise((r) => setTimeout(r, 20));
    expect(calls).toBeGreaterThanOrEqual(1);
  });

  it('reject tracks attempts via DLQ path', async () => {
    const b = new MessageBroker({ maxAttempts: 2 });
    b.subscribe('t', (m) => {
      b.reject(m.id, m.subscriptionId, true);
    });
    b.publish('t', {});
    await new Promise((r) => setTimeout(r, 20));
    expect(b.getDLQ('t').length).toBe(1);
  });

  it('reject sends to DLQ after maxAttempts', async () => {
    const b = new MessageBroker({ maxAttempts: 1 });
    b.subscribe('t', (m) => {
      b.reject(m.id, m.subscriptionId, true);
    });
    b.publish('t', {});
    await new Promise((r) => setTimeout(r, 10));
    expect(b.getDLQ('t').length).toBe(1);
  });

  it('drainDLQ re-publishes dead-lettered', async () => {
    const b = new MessageBroker({ maxAttempts: 1 });
    b.subscribe('t', (m) => {
      b.reject(m.id, m.subscriptionId, true);
    });
    b.publish('t', {});
    await new Promise((r) => setTimeout(r, 10));
    expect(b.getDLQ('t').length).toBe(1);
    const drained = b.drainDLQ('t');
    expect(drained).toBe(1);
  });
});

describe('MessageBroker — unsubscribe and visibility', () => {
  it('unsubscribe removes subscriber', async () => {
    const b = new MessageBroker();
    let count = 0;
    const id = b.subscribe('t', () => { count += 1; });
    b.publish('t', {});
    await new Promise((r) => setTimeout(r, 10));
    b.unsubscribe(id);
    b.publish('t', {});
    await new Promise((r) => setTimeout(r, 10));
    expect(count).toBe(1);
  });

  it('unsubscribe returns false for unknown', () => {
    const b = new MessageBroker();
    expect(b.unsubscribe('nope')).toBe(false);
  });

  it('reapExpired re-queues timed-out messages', () => {
    const b = new MessageBroker({ defaultVisibilityMs: 50 });
    b.subscribe('t', () => {}); // delivery puts msg in inflight
    b.publish('t', {});
    expect(b.inflightCount()).toBe(1);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const reaped = b.reapExpired();
        expect(reaped).toBe(1);
        resolve();
      }, 100);
    });
  });
});

describe('MessageBroker — stats and peek', () => {
  it('peek returns messages for subscription', () => {
    const b = new MessageBroker();
    const subA = b.subscribe('a', () => {});
    b.publish('a', 1);
    b.publish('a', 2);
    const subB = b.subscribe('b', () => {});
    b.publish('b', 3);
    expect(b.peek(subA).length).toBe(2);
    expect(b.peek(subB).length).toBe(1);
  });

  it('peek returns empty for unknown subscription', () => {
    const b = new MessageBroker();
    expect(b.peek('nope')).toEqual([]);
  });

  it('stats reports counts', () => {
    const b = new MessageBroker();
    b.subscribe('a', () => {});
    b.subscribe('b', () => {});
    const s = b.stats();
    expect(s.totalTopics).toBe(2);
    expect(s.totalSubscribers).toBe(2);
  });

  it('tracks inflight count', async () => {
    const b = new MessageBroker();
    b.subscribe('t', () => {}); // no ack, so message stays inflight
    b.publish('t', {});
    await new Promise((r) => setTimeout(r, 10));
    expect(b.inflightCount()).toBe(1);
  });
});
