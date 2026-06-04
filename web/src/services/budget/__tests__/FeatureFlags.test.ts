/**
 * FeatureFlags.test.ts — Pure unit tests for 19-flag system with A/B test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FeatureFlags,
  DEFAULT_FLAGS,
  type FlagDefinition,
  type FlagContext,
} from '../FeatureFlags';

function makeContext(overrides: Partial<FlagContext> = {}): FlagContext {
  return {
    userId: 'user-1',
    plan: 'free',
    environment: 'development',
    ...overrides,
  };
}

describe('FeatureFlags — registration', () => {
  it('registers a single flag', () => {
    const ff = new FeatureFlags();
    ff.register({
      name: 'test.flag',
      defaultState: 'enabled',
      description: 'A test flag',
      state: 'enabled',
    });
    expect(ff.size()).toBe(1);
    expect(ff.hasFlag('test.flag')).toBe(true);
  });

  it('registers multiple flags at once', () => {
    const ff = new FeatureFlags();
    ff.registerAll(DEFAULT_FLAGS);
    expect(ff.size()).toBe(19);
  });

  it('rejects duplicate flag names', () => {
    const ff = new FeatureFlags();
    ff.register({ name: 'dup', defaultState: 'enabled', description: '', state: 'enabled' });
    expect(() =>
      ff.register({ name: 'dup', defaultState: 'disabled', description: '', state: 'disabled' }),
    ).toThrow('already registered');
  });

  it('rejects invalid flag names', () => {
    const ff = new FeatureFlags();
    expect(() =>
      ff.register({ name: '', defaultState: 'enabled', description: '', state: 'enabled' }),
    ).toThrow('non-empty');
    expect(() =>
      ff.register({ name: 'UPPER', defaultState: 'enabled', description: '', state: 'enabled' }),
    ).toThrow('Invalid flag name');
    expect(() =>
      ff.register({ name: 'with space', defaultState: 'enabled', description: '', state: 'enabled' }),
    ).toThrow('Invalid flag name');
  });

  it('accepts valid flag names with dots/underscores/dashes', () => {
    const ff = new FeatureFlags();
    ff.register({ name: 'feat.test_v1-alpha', defaultState: 'enabled', description: '', state: 'enabled' });
    expect(ff.hasFlag('feat.test_v1-alpha')).toBe(true);
  });
});

describe('FeatureFlags — isEnabled / evaluate', () => {
  let ff: FeatureFlags;
  beforeEach(() => {
    ff = new FeatureFlags();
  });

  it('returns false for unknown flag', () => {
    expect(ff.isEnabled('unknown', makeContext())).toBe(false);
    const ev = ff.evaluate('unknown', makeContext());
    expect(ev.reason).toBe('flag not registered');
  });

  it('honors static state=enabled', () => {
    ff.register({ name: 'feat.a', defaultState: 'enabled', description: '', state: 'enabled' });
    expect(ff.isEnabled('feat.a', makeContext())).toBe(true);
  });

  it('honors static state=disabled', () => {
    ff.register({ name: 'feat.b', defaultState: 'enabled', description: '', state: 'disabled' });
    expect(ff.isEnabled('feat.b', makeContext())).toBe(false);
  });

  it('uses defaultState when no other mode specified', () => {
    ff.register({ name: 'feat.c', defaultState: 'enabled', description: '' });
    expect(ff.isEnabled('feat.c', makeContext())).toBe(true);
    ff.register({ name: 'feat.d', defaultState: 'disabled', description: '' });
    expect(ff.isEnabled('feat.d', makeContext())).toBe(false);
  });

  it('plan-based: enabled for matching plan', () => {
    ff.register({
      name: 'plan.1',
      defaultState: 'enabled',
      description: '',
      plans: ['pro', 'enterprise'],
    });
    expect(ff.isEnabled('plan.1', makeContext({ plan: 'pro' }))).toBe(true);
    expect(ff.isEnabled('plan.1', makeContext({ plan: 'enterprise' }))).toBe(true);
    expect(ff.isEnabled('plan.1', makeContext({ plan: 'free' }))).toBe(false);
  });

  it('plan-based: empty plans list = enabled for all', () => {
    ff.register({ name: 'plan.all', defaultState: 'enabled', description: '', plans: [] });
    expect(ff.isEnabled('plan.all', makeContext({ plan: 'free' }))).toBe(true);
    expect(ff.isEnabled('plan.all', makeContext({ plan: 'admin' }))).toBe(true);
  });

  it('percentage: 0% always disables', () => {
    ff.register({ name: 'pct.0', defaultState: 'enabled', description: '', percentage: 0 });
    for (let i = 0; i < 20; i++) {
      expect(ff.isEnabled('pct.0', makeContext({ userId: `u${i}` }))).toBe(false);
    }
  });

  it('percentage: 100% always enables', () => {
    ff.register({ name: 'pct.100', defaultState: 'enabled', description: '', percentage: 1 });
    for (let i = 0; i < 20; i++) {
      expect(ff.isEnabled('pct.100', makeContext({ userId: `u${i}` }))).toBe(true);
    }
  });

  it('percentage: 50% enables roughly half the users', () => {
    ff.register({ name: 'pct.50', defaultState: 'enabled', description: '', percentage: 0.5 });
    let enabled = 0;
    for (let i = 0; i < 1000; i++) {
      if (ff.isEnabled('pct.50', makeContext({ userId: `user-${i}` }))) enabled++;
    }
    expect(enabled).toBeGreaterThan(400);
    expect(enabled).toBeLessThan(600);
  });

  it('percentage: deterministic for same userId', () => {
    ff.register({ name: 'pct.det', defaultState: 'enabled', description: '', percentage: 0.5 });
    const first = ff.isEnabled('pct.det', makeContext({ userId: 'alice' }));
    for (let i = 0; i < 10; i++) {
      expect(ff.isEnabled('pct.det', makeContext({ userId: 'alice' }))).toBe(first);
    }
  });

  it('percentage: different userIds get different buckets', () => {
    ff.register({ name: 'pct.diff', defaultState: 'enabled', description: '', percentage: 0.5 });
    const results = new Set<boolean>();
    for (let i = 0; i < 50; i++) {
      results.add(ff.isEnabled('pct.diff', makeContext({ userId: `u${i}` })));
    }
    expect(results.size).toBe(2); // both true and false present
  });
});

describe('FeatureFlags — allowList and blockList', () => {
  let ff: FeatureFlags;
  beforeEach(() => {
    ff = new FeatureFlags();
  });

  it('allowList enables flag for specific user', () => {
    ff.register({
      name: 'beta',
      defaultState: 'enabled',
      description: '',
      percentage: 0,
      allowList: ['vip-1', 'vip-2'],
    });
    expect(ff.isEnabled('beta', makeContext({ userId: 'vip-1' }))).toBe(true);
    expect(ff.isEnabled('beta', makeContext({ userId: 'normal' }))).toBe(false);
  });

  it('blockList disables flag for specific user even if otherwise enabled', () => {
    ff.register({
      name: 'beta',
      defaultState: 'enabled',
      description: '',
      state: 'enabled',
      blockList: ['banned-1'],
    });
    expect(ff.isEnabled('beta', makeContext({ userId: 'normal' }))).toBe(true);
    expect(ff.isEnabled('beta', makeContext({ userId: 'banned-1' }))).toBe(false);
  });

  it('allowList takes priority over blockList (allow wins)', () => {
    ff.register({
      name: 'beta',
      defaultState: 'enabled',
      description: '',
      state: 'enabled',
      allowList: ['special'],
      blockList: ['special'],
    });
    expect(ff.isEnabled('beta', makeContext({ userId: 'special' }))).toBe(true);
  });
});

describe('FeatureFlags — context overrides', () => {
  it('setContextOverride forces flag state', () => {
    const ff = new FeatureFlags();
    ff.register({ name: 'f', defaultState: 'enabled', description: '', state: 'disabled' });
    expect(ff.isEnabled('f', makeContext())).toBe(false);
    ff.setContextOverride('f', 'enabled');
    expect(ff.isEnabled('f', makeContext())).toBe(true);
  });

  it('clearContextOverride restores original behavior', () => {
    const ff = new FeatureFlags();
    ff.register({ name: 'f', defaultState: 'enabled', description: '', state: 'disabled' });
    ff.setContextOverride('f', 'enabled');
    ff.clearContextOverride('f');
    expect(ff.isEnabled('f', makeContext())).toBe(false);
  });

  it('clearAllContextOverrides resets all overrides', () => {
    const ff = new FeatureFlags();
    ff.register({ name: 'a', defaultState: 'enabled', description: '', state: 'disabled' });
    ff.register({ name: 'b', defaultState: 'enabled', description: '', state: 'disabled' });
    ff.setContextOverride('a', 'enabled');
    ff.setContextOverride('b', 'enabled');
    ff.clearAllContextOverrides();
    expect(ff.isEnabled('a', makeContext())).toBe(false);
    expect(ff.isEnabled('b', makeContext())).toBe(false);
  });
});

describe('FeatureFlags — DEFAULT_FLAGS sanity', () => {
  it('contains exactly 19 flags', () => {
    expect(DEFAULT_FLAGS.length).toBe(19);
  });

  it('all flag names are unique', () => {
    const names = DEFAULT_FLAGS.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all flag names are valid', () => {
    for (const f of DEFAULT_FLAGS) {
      expect(f.name).toMatch(/^[a-z][a-z0-9._-]*$/);
      expect(f.description.length).toBeGreaterThan(0);
    }
  });

  it('at least one percentage flag is below 1.0 (staged rollout)', () => {
    const pctFlags = DEFAULT_FLAGS.filter((f) => f.percentage !== undefined);
    expect(pctFlags.length).toBeGreaterThan(0);
    expect(pctFlags.some((f) => f.percentage! < 1.0)).toBe(true);
  });

  it('at least one plan-restricted flag for free-blocked feature', () => {
    const planFlags = DEFAULT_FLAGS.filter((f) => f.plans !== undefined && f.plans.length > 0);
    expect(planFlags.length).toBeGreaterThan(0);
  });
});

describe('FeatureFlags — listFlags and getDefinition', () => {
  it('listFlags returns registered flag definitions', () => {
    const ff = new FeatureFlags();
    ff.registerAll(DEFAULT_FLAGS);
    const list = ff.listFlags();
    expect(list.length).toBe(19);
    expect(list[0].name).toBeDefined();
  });

  it('getDefinition returns clone of definition', () => {
    const ff = new FeatureFlags();
    ff.register({ name: 'def', defaultState: 'enabled', description: 'test', state: 'enabled' });
    const def = ff.getDefinition('def');
    expect(def?.description).toBe('test');
    // mutating returned object should not affect internal state
    def!.description = 'mutated';
    const def2 = ff.getDefinition('def');
    expect(def2?.description).toBe('test');
  });

  it('getDefinition returns undefined for unknown flag', () => {
    const ff = new FeatureFlags();
    expect(ff.getDefinition('unknown')).toBeUndefined();
  });
});

describe('FeatureFlags — evaluation log', () => {
  it('logs every evaluation', () => {
    const ff = new FeatureFlags();
    ff.register({ name: 'f', defaultState: 'enabled', description: '', state: 'enabled' });
    ff.isEnabled('f', makeContext());
    ff.isEnabled('f', makeContext({ userId: 'u2' }));
    const log = ff.getEvaluationLog();
    expect(log.length).toBe(2);
  });

  it('clearEvaluationLog resets log', () => {
    const ff = new FeatureFlags();
    ff.register({ name: 'f', defaultState: 'enabled', description: '', state: 'enabled' });
    ff.isEnabled('f', makeContext());
    ff.clearEvaluationLog();
    expect(ff.getEvaluationLog().length).toBe(0);
  });

  it('log is bounded by maxLogSize (FIFO eviction)', () => {
    const ff = new FeatureFlags();
    // @ts-expect-error — accessing private for test
    ff.maxLogSize = 5;
    ff.register({ name: 'f', defaultState: 'enabled', description: '', state: 'enabled' });
    for (let i = 0; i < 20; i++) {
      ff.isEnabled('f', makeContext({ userId: `u${i}` }));
    }
    expect(ff.getEvaluationLog().length).toBe(5);
  });
});

describe('FeatureFlags — unregister', () => {
  it('removes a flag and returns true', () => {
    const ff = new FeatureFlags();
    ff.register({ name: 'tmp', defaultState: 'enabled', description: '', state: 'enabled' });
    expect(ff.unregister('tmp')).toBe(true);
    expect(ff.hasFlag('tmp')).toBe(false);
  });

  it('returns false when removing unknown flag', () => {
    const ff = new FeatureFlags();
    expect(ff.unregister('nope')).toBe(false);
  });
});
