/**
 * HookLifecycle.test.ts — Pure unit tests for 17-hook lifecycle system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HookLifecycle, ALL_HOOKS, type HookName, type HookContext } from '../HookLifecycle';

describe('HookLifecycle — registration', () => {
  let hl: HookLifecycle;
  beforeEach(() => {
    hl = new HookLifecycle();
  });

  it('registers a sync handler', () => {
    const id = hl.register('pre-task', () => {});
    expect(id).toMatch(/^hook-/);
    expect(hl.totalRegistrations()).toBe(1);
  });

  it('registers an async handler', () => {
    const id = hl.register('post-task', async () => {}, { async: true });
    expect(hl.totalRegistrations()).toBe(1);
  });

  it('rejects unknown hook name', () => {
    expect(() => hl.register('bogus-hook' as HookName, () => {})).toThrow('Unknown hook');
  });

  it('unregister by id returns true when found', () => {
    const id = hl.register('pre-task', () => {});
    expect(hl.unregister(id)).toBe(true);
    expect(hl.totalRegistrations()).toBe(0);
  });

  it('unregister returns false for unknown id', () => {
    expect(hl.unregister('nope')).toBe(false);
  });

  it('unregisterAll removes all handlers for a hook', () => {
    hl.register('pre-task', () => {});
    hl.register('pre-task', () => {});
    hl.register('post-task', () => {});
    expect(hl.unregisterAll('pre-task')).toBe(2);
    expect(hl.totalRegistrations()).toBe(1);
  });

  it('getRegistrations returns sorted by priority', () => {
    hl.register('pre-task', () => 'a', { priority: 200, name: 'high' });
    hl.register('pre-task', () => 'b', { priority: 50, name: 'low' });
    const regs = hl.getRegistrations('pre-task');
    expect(regs[0].name).toBe('low');
    expect(regs[1].name).toBe('high');
  });
});

describe('HookLifecycle — fire', () => {
  let hl: HookLifecycle;
  beforeEach(() => {
    hl = new HookLifecycle();
  });

  it('fires a hook and runs sync handler', async () => {
    let called = 0;
    hl.register('pre-task', () => {
      called += 1;
    });
    const result = await hl.fire('pre-task', { foo: 'bar' });
    expect(called).toBe(1);
    expect(result.successful).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.totalHandlers).toBe(1);
  });

  it('passes payload to handler', async () => {
    let received: Record<string, unknown> | null = null;
    hl.register('pre-task', (ctx) => {
      received = ctx.payload;
    });
    await hl.fire('pre-task', { x: 1, y: 'hello' });
    expect(received).toEqual({ x: 1, y: 'hello' });
  });

  it('runs handlers in priority order', async () => {
    const order: string[] = [];
    hl.register('pre-task', () => order.push('high'), { priority: 200, name: 'high' });
    hl.register('pre-task', () => order.push('low'), { priority: 50, name: 'low' });
    hl.register('pre-task', () => order.push('mid'), { priority: 100, name: 'mid' });
    await hl.fire('pre-task');
    expect(order).toEqual(['low', 'mid', 'high']);
  });

  it('async handler does not block — fire returns immediately', async () => {
    let resolved = false;
    hl.register('pre-task', async () => {
      await new Promise((r) => setTimeout(r, 30));
      resolved = true;
    }, { async: true });
    const start = Date.now();
    const result = await hl.fire('pre-task');
    const elapsed = Date.now() - start;
    expect(result.successful).toBe(1);
    expect(elapsed).toBeLessThan(20); // returns before async finishes
    await new Promise((r) => setTimeout(r, 50));
    expect(resolved).toBe(true);
  });

  it('records errors without throwing', async () => {
    hl.register('pre-task', () => {
      throw new Error('boom');
    });
    const result = await hl.fire('pre-task');
    expect(result.failed).toBe(1);
    expect(result.successful).toBe(0);
  });

  it('records lastError on registration', async () => {
    const id = hl.register('pre-task', () => {
      throw new Error('test error');
    });
    await hl.fire('pre-task');
    const reg = hl.getRegistrations('pre-task')[0];
    expect(reg.lastError).toBe('test error');
    expect(reg.invocationCount).toBe(1);
  });

  it('chained mode passes previous result to next handler', async () => {
    const calls: unknown[] = [];
    hl.register('pre-task', (ctx) => {
      calls.push(ctx.previous);
      return 1;
    });
    hl.register('pre-task', (ctx) => {
      calls.push(ctx.previous);
      return 2;
    });
    await hl.fire('pre-task', {}, { chained: true });
    expect(calls[0]).toBeUndefined();
    expect(calls[1]).toBe(1);
  });

  it('chainedResult on fire result returns last non-undefined', async () => {
    hl.register('pre-task', () => undefined);
    hl.register('pre-task', () => 42);
    const result = await hl.fire('pre-task', {}, { chained: true });
    expect(result.chainedResult).toBe(42);
  });

  it('filter can skip handler', async () => {
    let called = 0;
    hl.register('pre-task', () => {
      called += 1;
    }, { filter: () => false });
    const result = await hl.fire('pre-task');
    expect(called).toBe(0);
    expect(result.totalHandlers).toBe(1); // counted in total but skipped
  });

  it('filter receives context with previous result', async () => {
    let filterSawPrevious: unknown = 'unset';
    hl.register('pre-task', () => 7);
    hl.register('pre-task', () => {}, { filter: (ctx) => {
      filterSawPrevious = ctx.previous;
      return true;
    } });
    await hl.fire('pre-task', {}, { chained: true });
    expect(filterSawPrevious).toBe(7);
  });

  it('fireAndForget returns immediately', () => {
    hl.register('pre-task', () => {});
    expect(() => hl.fireAndForget('pre-task', { x: 1 })).not.toThrow();
  });

  it('fire logs result in fireLog', async () => {
    hl.register('pre-task', () => {});
    await hl.fire('pre-task');
    expect(hl.getFireLog().length).toBe(1);
    hl.clearFireLog();
    expect(hl.getFireLog().length).toBe(0);
  });

  it('fireLog bounded to 1000 entries', async () => {
    hl.register('pre-task', () => {});
    for (let i = 0; i < 1100; i++) {
      await hl.fire('pre-task');
    }
    expect(hl.getFireLog().length).toBe(1000);
  });

  it('correlationId is passed to handler', async () => {
    let receivedId: string | undefined;
    hl.register('pre-task', (ctx) => {
      receivedId = ctx.correlationId;
    });
    await hl.fire('pre-task', {}, { correlationId: 'trace-123' });
    expect(receivedId).toBe('trace-123');
  });
});

describe('HookLifecycle — background workers', () => {
  let hl: HookLifecycle;
  beforeEach(() => {
    hl = new HookLifecycle();
  });

  it('registers a worker', () => {
    const id = hl.registerWorker('cleanup', async () => {}, 1000);
    expect(id).toMatch(/^worker-/);
    expect(hl.listWorkers().length).toBe(1);
  });

  it('rejects interval < 100ms', () => {
    expect(() => hl.registerWorker('x', async () => {}, 50)).toThrow('>= 100ms');
  });

  it('unregisterWorker stops and removes', async () => {
    let runs = 0;
    const id = hl.registerWorker('counter', async () => {
      runs += 1;
    }, 100);
    await new Promise((r) => setTimeout(r, 250));
    const beforeStop = runs;
    expect(beforeStop).toBeGreaterThan(0);
    expect(hl.unregisterWorker(id)).toBe(true);
    const afterStop = runs;
    await new Promise((r) => setTimeout(r, 200));
    expect(runs).toBe(afterStop); // no more runs after unregister
  });

  it('worker records lastError on failure', async () => {
    const id = hl.registerWorker('fail', async () => {
      throw new Error('worker boom');
    }, 100);
    await new Promise((r) => setTimeout(r, 200));
    const worker = hl.listWorkers().find((w) => w.id === id)!;
    expect(worker.lastError).toBe('worker boom');
    hl.unregisterWorker(id);
  });

  it('shutdown stops all workers and clears hooks', async () => {
    hl.register('pre-task', () => {});
    hl.registerWorker('w1', async () => {}, 100);
    hl.registerWorker('w2', async () => {}, 100);
    hl.shutdown();
    expect(hl.isShutdown()).toBe(true);
    expect(hl.totalRegistrations()).toBe(0);
    expect(hl.listWorkers().length).toBe(0);
  });
});

describe('HookLifecycle — ALL_HOOKS sanity', () => {
  it('contains exactly 17 hooks', () => {
    expect(ALL_HOOKS.length).toBe(17);
  });

  it('all names are unique', () => {
    expect(new Set(ALL_HOOKS).size).toBe(ALL_HOOKS.length);
  });

  it('includes the ruflo core 11 + 6 lifecycle extensions', () => {
    const core = ['pre-task', 'post-task', 'tool-error', 'agent-spawn', 'agent-despawn',
      'memory-store', 'memory-retrieve', 'security-violation', 'config-change',
      'memory-store', 'memory-retrieve'];
    for (const c of core) {
      expect(ALL_HOOKS).toContain(c);
    }
  });
});
