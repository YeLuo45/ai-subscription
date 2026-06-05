/**
 * EventStream.test.ts — Pure unit tests for pub/sub event stream
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventStream } from '../EventStream';

describe('EventStream — publish and subscribe', () => {
  let es: EventStream;
  beforeEach(() => {
    es = new EventStream();
  });

  it('publishes an event with auto sequence', () => {
    const e = es.publish('user.created', { id: 1 });
    expect(e.topic).toBe('user.created');
    expect(e.sequence).toBe(1);
  });

  it('increments per-topic sequence', () => {
    const a = es.publish('a', {});
    const b = es.publish('a', {});
    expect(a.sequence).toBe(1);
    expect(b.sequence).toBe(2);
  });

  it('subscriber receives published event', () => {
    let received: any = null;
    es.subscribe('user.created', (e) => { received = e; });
    es.publish('user.created', { x: 1 });
    expect(received).toBeDefined();
    expect(received.payload.x).toBe(1);
  });

  it('multiple subscribers all receive', () => {
    let count = 0;
    es.subscribe('a', () => { count += 1; });
    es.subscribe('a', () => { count += 1; });
    es.subscribe('a', () => { count += 1; });
    es.publish('a', {});
    expect(count).toBe(3);
  });

  it('subscriber counter increments', () => {
    es.subscribe('a', () => {});
    es.subscribe('a', () => {});
    expect(es.subscriberCount()).toBe(2);
  });
});

describe('EventStream — wildcard topics', () => {
  let es: EventStream;
  beforeEach(() => {
    es = new EventStream();
  });

  it('user.* matches user.created and user.deleted', () => {
    let count = 0;
    es.subscribe('user.*', () => { count += 1; });
    es.publish('user.created', {});
    es.publish('user.deleted', {});
    es.publish('user.profile.updated', {});
    expect(count).toBe(2);
  });

  it('user.** matches all nested user topics', () => {
    let count = 0;
    es.subscribe('user.**', () => { count += 1; });
    es.publish('user.created', {});
    es.publish('user.profile.updated', {});
    es.publish('other.created', {});
    expect(count).toBe(2);
  });

  it('exact match when no wildcards', () => {
    let count = 0;
    es.subscribe('user.created', () => { count += 1; });
    es.publish('user.created', {});
    es.publish('user.deleted', {});
    expect(count).toBe(1);
  });
});

describe('EventStream — filter and async', () => {
  let es: EventStream;
  beforeEach(() => {
    es = new EventStream();
  });

  it('filter predicate blocks events', () => {
    let count = 0;
    es.subscribe('a', () => { count += 1; }, { filter: (e: any) => e.payload.v > 5 });
    es.publish('a', { v: 3 });
    es.publish('a', { v: 10 });
    es.publish('a', { v: 7 });
    expect(count).toBe(2);
  });

  it('async handler does not block publisher', async () => {
    es.subscribe('a', async () => {
      await new Promise((r) => setTimeout(r, 30));
    }, { async: true });
    const start = Date.now();
    es.publish('a', {});
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(20);
  });

  it('async handler error does not break publisher', () => {
    es.subscribe('a', async () => { throw new Error('x'); }, { async: true });
    expect(() => es.publish('a', {})).not.toThrow();
  });

  it('sync handler error does not break publisher', () => {
    es.subscribe('a', () => { throw new Error('x'); });
    expect(() => es.publish('a', {})).not.toThrow();
  });
});

describe('EventStream — unsubscribe and history', () => {
  let es: EventStream;
  beforeEach(() => {
    es = new EventStream();
  });

  it('unsubscribe removes subscriber', () => {
    let count = 0;
    const id = es.subscribe('a', () => { count += 1; });
    es.publish('a', {});
    es.unsubscribe(id);
    es.publish('a', {});
    expect(count).toBe(1);
  });

  it('unsubscribe returns false for unknown', () => {
    expect(es.unsubscribe('nope')).toBe(false);
  });

  it('subscriber history buffers events', () => {
    es.subscribe('a', () => {});
    for (let i = 0; i < 5; i++) es.publish('a', { i });
    const sub = es.subscribersFor('a')[0];
    expect(sub.history.length).toBe(5);
  });

  it('history bounded by historySize', () => {
    es.subscribe('a', () => {}, { historySize: 3 });
    for (let i = 0; i < 10; i++) es.publish('a', { i });
    const sub = es.subscribersFor('a')[0];
    expect(sub.history.length).toBe(3);
  });
});

describe('EventStream — getEvents and replay', () => {
  let es: EventStream;
  beforeEach(() => {
    es = new EventStream();
  });

  it('getEvents returns all events for a topic', () => {
    es.publish('a', { x: 1 });
    es.publish('a', { x: 2 });
    expect(es.getEvents('a').length).toBe(2);
  });

  it('getEvents with fromSequence filters', () => {
    es.publish('a', {});
    es.publish('a', {});
    es.publish('a', {});
    expect(es.getEvents('a', 2).length).toBe(2);
  });

  it('replay delivers historical events to subscriber', () => {
    es.publish('a', { x: 1 });
    es.publish('a', { x: 2 });
    let count = 0;
    const id = es.subscribe('a', () => { count += 1; });
    const replayed = es.replay(id);
    expect(replayed).toBe(2);
    expect(count).toBe(2);
  });

  it('replay returns 0 for unknown subscriber', () => {
    expect(es.replay('nope')).toBe(0);
  });
});

describe('EventStream — topics and clear', () => {
  let es: EventStream;
  beforeEach(() => {
    es = new EventStream();
  });

  it('topics lists all topics with events', () => {
    es.publish('a', {});
    es.publish('b', {});
    expect(es.topics().sort()).toEqual(['a', 'b']);
  });

  it('clearTopic removes events', () => {
    es.publish('a', {});
    es.publish('a', {});
    expect(es.clearTopic('a')).toBe(2);
    expect(es.topics()).toEqual([]);
  });

  it('clearTopic returns 0 for unknown topic', () => {
    expect(es.clearTopic('nope')).toBe(0);
  });
});

describe('EventStream — stats', () => {
  let es: EventStream;
  beforeEach(() => {
    es = new EventStream();
  });

  it('reports counts', () => {
    es.publish('a', {});
    es.publish('a', {});
    es.publish('b', {});
    es.subscribe('a', () => {});
    const s = es.stats();
    expect(s.totalTopics).toBe(2);
    expect(s.totalEvents).toBe(3);
    expect(s.totalSubscribers).toBe(1);
  });
});
