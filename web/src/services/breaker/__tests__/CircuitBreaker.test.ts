/**
 * CircuitBreaker.test.ts — Pure unit tests for circuit breaker pattern
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker } from '../CircuitBreaker';

describe('CircuitBreaker — initial state', () => {
  it('starts in closed state', () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe('closed');
  });

  it('records initial closed state in history', () => {
    const cb = new CircuitBreaker();
    const h = cb.getStateHistory();
    expect(h[0].state).toBe('closed');
  });
});

describe('CircuitBreaker — closed state execution', () => {
  it('executes function successfully', async () => {
    const cb = new CircuitBreaker();
    const result = await cb.execute(async () => 'ok');
    expect(result.success).toBe(true);
    expect(result.output).toBe('ok');
  });

  it('records error on failure', async () => {
    const cb = new CircuitBreaker();
    const result = await cb.execute(async () => { throw new Error('boom'); });
    expect(result.success).toBe(false);
    expect(result.error).toBe('boom');
  });

  it('does not open on single failure', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    await cb.execute(async () => { throw new Error('x'); });
    expect(cb.getState()).toBe('closed');
  });

  it('opens after failureThreshold consecutive failures', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    for (let i = 0; i < 3; i++) {
      await cb.execute(async () => { throw new Error('x'); });
    }
    expect(cb.getState()).toBe('open');
  });

  it('resets failureCount on success', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    await cb.execute(async () => { throw new Error('x'); });
    await cb.execute(async () => { throw new Error('x'); });
    await cb.execute(async () => 'ok');
    await cb.execute(async () => { throw new Error('x'); });
    await cb.execute(async () => { throw new Error('x'); });
    // After reset, should need 3 more to open
    expect(cb.getState()).toBe('closed');
  });
});

describe('CircuitBreaker — open state', () => {
  it('rejects requests without calling function', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 10000 });
    await cb.execute(async () => { throw new Error('x'); });
    const fn = vi.fn(async () => 'ok');
    const result = await cb.execute(fn);
    expect(result.rejected).toBe(true);
    expect(result.error).toBe('circuit open');
    expect(fn).not.toHaveBeenCalled();
  });

  it('transitions to half-open after cooldown', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 50 });
    await cb.execute(async () => { throw new Error('x'); });
    expect(cb.getState()).toBe('open');
    await new Promise((r) => setTimeout(r, 70));
    expect(cb.getState()).toBe('half-open');
  });
});

describe('CircuitBreaker — half-open state', () => {
  it('closes on successThreshold successes', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      cooldownMs: 30,
      successThreshold: 2,
    });
    await cb.execute(async () => { throw new Error('x'); });
    await new Promise((r) => setTimeout(r, 50));
    expect(cb.getState()).toBe('half-open');
    await cb.execute(async () => 'ok');
    await cb.execute(async () => 'ok');
    expect(cb.getState()).toBe('closed');
  });

  it('reopens on failure in half-open', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      cooldownMs: 30,
      successThreshold: 2,
    });
    await cb.execute(async () => { throw new Error('x'); });
    await new Promise((r) => setTimeout(r, 50));
    await cb.execute(async () => { throw new Error('y'); });
    expect(cb.getState()).toBe('open');
  });

  it('limits concurrent probes in half-open', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      cooldownMs: 30,
      successThreshold: 2,
      halfOpenMax: 1,
    });
    await cb.execute(async () => { throw new Error('x'); });
    await new Promise((r) => setTimeout(r, 50));
    // Start a slow probe
    const slowProbe = cb.execute(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return 'ok';
    });
    // Second probe should be rejected
    const second = await cb.execute(async () => 'ok');
    expect(second.rejected).toBe(true);
    expect(second.error).toBe('half-open capacity exceeded');
    await slowProbe;
  });
});

describe('CircuitBreaker — state transitions', () => {
  it('forceState moves between states', () => {
    const cb = new CircuitBreaker();
    cb.forceState('open');
    expect(cb.getState()).toBe('open');
  });

  it('onStateChange callback fires', () => {
    const events: Array<[string, string]> = [];
    const cb = new CircuitBreaker({
      onStateChange: (n, o) => events.push([o, n]),
    });
    cb.forceState('open');
    expect(events).toContainEqual(['closed', 'open']);
  });

  it('state history records transitions', () => {
    const cb = new CircuitBreaker();
    cb.forceState('open');
    cb.forceState('half-open');
    cb.forceState('closed');
    const h = cb.getStateHistory();
    expect(h.map((s) => s.state)).toEqual(['closed', 'open', 'half-open', 'closed']);
  });
});

describe('CircuitBreaker — stats and config', () => {
  it('tracks totals', async () => {
    const cb = new CircuitBreaker();
    await cb.execute(async () => 'ok');
    await cb.execute(async () => { throw new Error('x'); });
    const s = cb.getStats();
    expect(s.totalRequests).toBe(2);
    expect(s.totalSuccesses).toBe(1);
    expect(s.totalFailures).toBe(1);
  });

  it('counts rejections in stats', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 60000 });
    await cb.execute(async () => { throw new Error('x'); });
    await cb.execute(async () => 'ok');
    const s = cb.getStats();
    expect(s.totalRejections).toBe(1);
  });

  it('reset clears all stats and forces closed', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    await cb.execute(async () => { throw new Error('x'); });
    cb.reset();
    expect(cb.getState()).toBe('closed');
    expect(cb.getStats().totalRequests).toBe(0);
  });

  it('setConfig updates config', () => {
    const cb = new CircuitBreaker();
    cb.setConfig({ failureThreshold: 10 });
    expect(cb.getConfig().failureThreshold).toBe(10);
  });
});
