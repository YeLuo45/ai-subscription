/**
 * StateMachine.test.ts — Pure unit tests for finite state machine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateMachine } from '../StateMachine';

type LightState = 'red' | 'yellow' | 'green';

describe('StateMachine — basic transitions', () => {
  let sm: StateMachine<LightState>;
  beforeEach(() => {
    sm = new StateMachine<LightState>({
      initial: 'red',
      states: [
        { name: 'red' },
        { name: 'yellow' },
        { name: 'green' },
      ],
      transitions: [
        { from: 'red', to: 'green', event: 'go' },
        { from: 'green', to: 'yellow', event: 'slow' },
        { from: 'yellow', to: 'red', event: 'stop' },
      ],
    });
  });

  it('starts in initial state', () => {
    expect(sm.getState()).toBe('red');
  });

  it('fires matching transition', async () => {
    const r = await sm.fire('go');
    expect(r.success).toBe(true);
    expect(sm.getState()).toBe('green');
  });

  it('returns false for unknown event', async () => {
    const r = await sm.fire('unknown');
    expect(r.success).toBe(false);
  });

  it('canFire returns true for valid event', async () => {
    expect(await sm.canFire('go')).toBe(true);
  });

  it('canFire returns false for invalid event', async () => {
    expect(await sm.canFire('stop')).toBe(false); // stop only valid in yellow
  });

  it('records history', async () => {
    await sm.fire('go');
    await sm.fire('slow');
    const h = sm.getHistory();
    expect(h.length).toBe(3); // initial + 2 transitions
    expect(h[0].state).toBe('red');
    expect(h[1].state).toBe('green');
    expect(h[2].state).toBe('yellow');
  });

  it('records transition count', async () => {
    await sm.fire('go');
    await sm.fire('slow');
    expect(sm.getTransitionCount()).toBe(2);
  });
});

describe('StateMachine — guards', () => {
  it('blocks transition when guard returns false', async () => {
    const sm = new StateMachine<LightState>({
      initial: 'red',
      states: [{ name: 'red' }, { name: 'green' }],
      transitions: [
        {
          from: 'red',
          to: 'green',
          event: 'go',
          guard: (ctx) => (ctx as any).hasPermission === true,
        },
      ],
      context: { hasPermission: false } as any,
    });
    const r = await sm.fire('go');
    expect(r.success).toBe(false);
  });

  it('allows transition when guard returns true', async () => {
    const sm = new StateMachine<LightState>({
      initial: 'red',
      states: [{ name: 'red' }, { name: 'green' }],
      transitions: [
        {
          from: 'red',
          to: 'green',
          event: 'go',
          guard: (ctx) => (ctx as any).hasPermission === true,
        },
      ],
      context: { hasPermission: true } as any,
    });
    const r = await sm.fire('go');
    expect(r.success).toBe(true);
  });

  it('supports async guards', async () => {
    const sm = new StateMachine<LightState>({
      initial: 'red',
      states: [{ name: 'red' }, { name: 'green' }],
      transitions: [
        {
          from: 'red',
          to: 'green',
          event: 'go',
          guard: async (ctx) => {
            await new Promise((r) => setTimeout(r, 10));
            return (ctx as any).ok === true;
          },
        },
      ],
      context: { ok: true } as any,
    });
    const r = await sm.fire('go');
    expect(r.success).toBe(true);
  });
});

describe('StateMachine — actions', () => {
  it('runs onEnter action', async () => {
    let entered = '';
    const sm = new StateMachine<LightState>({
      initial: 'red',
      states: [
        { name: 'red' },
        { name: 'green', onEnter: () => { entered = 'green'; } },
      ],
      transitions: [{ from: 'red', to: 'green', event: 'go' }],
    });
    await sm.fire('go');
    expect(entered).toBe('green');
  });

  it('runs onExit action', async () => {
    let exited = '';
    const sm = new StateMachine<LightState>({
      initial: 'red',
      states: [
        { name: 'red', onExit: () => { exited = 'red'; } },
        { name: 'green' },
      ],
      transitions: [{ from: 'red', to: 'green', event: 'go' }],
    });
    await sm.fire('go');
    expect(exited).toBe('red');
  });

  it('runs transition action', async () => {
    let actionRan = false;
    const sm = new StateMachine<LightState>({
      initial: 'red',
      states: [{ name: 'red' }, { name: 'green' }],
      transitions: [{
        from: 'red',
        to: 'green',
        event: 'go',
        action: () => { actionRan = true; },
      }],
    });
    await sm.fire('go');
    expect(actionRan).toBe(true);
  });
});

describe('StateMachine — context', () => {
  it('getContext returns current context', () => {
    const sm = new StateMachine<LightState>({
      initial: 'red',
      states: [{ name: 'red' }],
      transitions: [],
      context: { x: 1, y: 2 } as any,
    });
    expect(sm.getContext()).toEqual({ x: 1, y: 2 });
  });

  it('setContext merges updates', () => {
    const sm = new StateMachine<LightState>({
      initial: 'red',
      states: [{ name: 'red' }],
      transitions: [],
      context: { x: 1 } as any,
    });
    sm.setContext({ y: 2 } as any);
    expect(sm.getContext()).toEqual({ x: 1, y: 2 });
  });
});

describe('StateMachine — final states', () => {
  it('isFinal returns true for final state', () => {
    const sm = new StateMachine<LightState>({
      initial: 'red',
      states: [{ name: 'red', final: true }],
      transitions: [],
    });
    expect(sm.isFinal()).toBe(true);
  });

  it('isFinal returns false for non-final', () => {
    const sm = new StateMachine<LightState>({
      initial: 'red',
      states: [{ name: 'red' }],
      transitions: [],
    });
    expect(sm.isFinal()).toBe(false);
  });
});

describe('StateMachine — getAvailableEvents', () => {
  it('returns events for current state', () => {
    const sm = new StateMachine<LightState>({
      initial: 'red',
      states: [{ name: 'red' }, { name: 'green' }, { name: 'yellow' }],
      transitions: [
        { from: 'red', to: 'green', event: 'go' },
        { from: 'red', to: 'yellow', event: 'caution' },
        { from: 'green', to: 'yellow', event: 'slow' },
      ],
    });
    const events = sm.getAvailableEvents();
    expect(events).toContain('go');
    expect(events).toContain('caution');
    expect(events).not.toContain('slow');
  });
});

describe('StateMachine — reset and validate', () => {
  it('reset returns to initial', async () => {
    const sm = new StateMachine<LightState>({
      initial: 'red',
      states: [{ name: 'red' }, { name: 'green' }],
      transitions: [{ from: 'red', to: 'green', event: 'go' }],
    });
    await sm.fire('go');
    sm.reset();
    expect(sm.getState()).toBe('red');
    expect(sm.getTransitionCount()).toBe(0);
  });

  it('validate detects unknown state references', () => {
    const sm = new StateMachine<LightState>({
      initial: 'red',
      states: [{ name: 'red' }],
      transitions: [{ from: 'red', to: 'green' as any, event: 'go' }],
    });
    const issues = sm.validate();
    expect(issues.length).toBeGreaterThan(0);
  });

  it('validate returns empty for valid config', () => {
    const sm = new StateMachine<LightState>({
      initial: 'red',
      states: [{ name: 'red' }, { name: 'green' }],
      transitions: [{ from: 'red', to: 'green', event: 'go' }],
    });
    expect(sm.validate()).toEqual([]);
  });
});

describe('StateMachine — addTransition at runtime', () => {
  it('adds new transition', async () => {
    const sm = new StateMachine<LightState>({
      initial: 'red',
      states: [{ name: 'red' }, { name: 'green' }],
      transitions: [],
    });
    expect(await sm.canFire('go')).toBe(false);
    sm.addTransition({ from: 'red', to: 'green', event: 'go' });
    expect(await sm.canFire('go')).toBe(true);
  });
});
