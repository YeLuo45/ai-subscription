/**
 * SkillRegistry.test.ts — Pure unit tests for 50-skill registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SkillRegistry,
  DEFAULT_SKILLS,
  type Skill,
} from '../SkillRegistry';

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    name: 'test.skill',
    version: '1.0.0',
    category: 'content',
    description: 'A test skill',
    tags: ['test'],
    inputs: [{ name: 'x', type: 'string', required: true, description: 'input x' }],
    outputs: [{ name: 'y', type: 'string', description: 'output y' }],
    dependencies: [],
    estimatedCostUSD: 0.01,
    estimatedDurationMs: 1000,
    invocationCount: 0,
    registeredAt: '2026-06-05',
    ...overrides,
  };
}

describe('SkillRegistry — registration', () => {
  it('registers a single skill', () => {
    const r = new SkillRegistry();
    r.register(makeSkill());
    expect(r.size()).toBe(1);
    expect(r.has('test.skill')).toBe(true);
  });

  it('rejects duplicate name+version', () => {
    const r = new SkillRegistry();
    r.register(makeSkill());
    expect(() => r.register(makeSkill())).toThrow('already registered');
  });

  it('allows multiple versions of same skill', () => {
    const r = new SkillRegistry();
    r.register(makeSkill({ version: '1.0.0' }));
    r.register(makeSkill({ version: '2.0.0' }));
    expect(r.size()).toBe(2);
    expect(r.getVersions('test.skill')).toEqual(['2.0.0', '1.0.0']); // latest first
  });

  it('rejects skill with empty name', () => {
    const r = new SkillRegistry();
    expect(() => r.register(makeSkill({ name: '' }))).toThrow('non-empty');
  });

  it('rejects skill with empty version', () => {
    const r = new SkillRegistry();
    expect(() => r.register(makeSkill({ version: '' }))).toThrow('version must be non-empty');
  });

  it('rejects skill with negative cost', () => {
    const r = new SkillRegistry();
    expect(() => r.register(makeSkill({ estimatedCostUSD: -1 }))).toThrow('estimatedCostUSD must be');
  });

  it('rejects skill with negative duration', () => {
    const r = new SkillRegistry();
    expect(() => r.register(makeSkill({ estimatedDurationMs: -1 }))).toThrow('estimatedDurationMs must be');
  });

  it('rejects skill with duplicate input names', () => {
    const r = new SkillRegistry();
    expect(() =>
      r.register(
        makeSkill({
          inputs: [
            { name: 'x', type: 'string', required: true, description: '' },
            { name: 'x', type: 'number', required: false, description: '' },
          ],
        }),
      ),
    ).toThrow('Duplicate input name');
  });
});

describe('SkillRegistry — get / getVersion / getVersions', () => {
  let r: SkillRegistry;
  beforeEach(() => {
    r = new SkillRegistry();
    r.register(makeSkill({ version: '1.0.0' }));
    r.register(makeSkill({ version: '1.1.0' }));
    r.register(makeSkill({ version: '2.0.0' }));
  });

  it('get returns latest version', () => {
    const s = r.get('test.skill');
    expect(s?.version).toBe('2.0.0');
  });

  it('getVersion returns specific version', () => {
    expect(r.getVersion('test.skill', '1.0.0')?.version).toBe('1.0.0');
    expect(r.getVersion('test.skill', '1.1.0')?.version).toBe('1.1.0');
  });

  it('getVersion returns undefined for unknown version', () => {
    expect(r.getVersion('test.skill', '9.9.9')).toBeUndefined();
  });

  it('get returns undefined for unknown skill', () => {
    expect(r.get('unknown')).toBeUndefined();
  });

  it('getVersions returns all versions sorted descending', () => {
    expect(r.getVersions('test.skill')).toEqual(['2.0.0', '1.1.0', '1.0.0']);
  });
});

describe('SkillRegistry — find / findByTag', () => {
  let r: SkillRegistry;
  beforeEach(() => {
    r = new SkillRegistry();
    r.registerAll(DEFAULT_SKILLS);
  });

  it('find by category returns matching skills', () => {
    const content = r.find({ category: 'content' });
    expect(content.length).toBeGreaterThan(0);
    expect(content.every((s) => s.category === 'content')).toBe(true);
  });

  it('find by tags (AND logic)', () => {
    const skills = r.find({ tags: ['nlp', 'summary'] });
    expect(skills.every((s) => s.tags.includes('nlp') && s.tags.includes('summary'))).toBe(true);
  });

  it('find by namePattern (substring case-insensitive)', () => {
    const skills = r.find({ namePattern: 'summar' });
    expect(skills.length).toBeGreaterThan(0);
    expect(skills.every((s) => s.name.toLowerCase().includes('summar'))).toBe(true);
  });

  it('find by maxCostUSD', () => {
    const skills = r.find({ maxCostUSD: 0.001 });
    expect(skills.every((s) => s.estimatedCostUSD <= 0.001)).toBe(true);
  });

  it('find by maxDurationMs', () => {
    const skills = r.find({ maxDurationMs: 1000 });
    expect(skills.every((s) => s.estimatedDurationMs <= 1000)).toBe(true);
  });

  it('find by requiredInputs (all must be present)', () => {
    const skills = r.find({ requiredInputs: ['content', 'maxLength'] });
    expect(skills.every((s) => s.inputs.some((i) => i.name === 'content') && s.inputs.some((i) => i.name === 'maxLength'))).toBe(true);
  });

  it('find combines multiple criteria (AND)', () => {
    const skills = r.find({ category: 'content', maxCostUSD: 0.002, tags: ['nlp'] });
    expect(skills.every((s) => s.category === 'content' && s.estimatedCostUSD <= 0.002 && s.tags.includes('nlp'))).toBe(true);
  });

  it('findByTag returns skills with that tag', () => {
    const skills = r.findByTag('github');
    expect(skills.length).toBeGreaterThan(0);
    expect(skills.every((s) => s.tags.includes('github'))).toBe(true);
  });

  it('findByTag returns empty array for unknown tag', () => {
    expect(r.findByTag('unknown-tag-xyz')).toEqual([]);
  });
});

describe('SkillRegistry — invocation tracking', () => {
  it('recordInvocation increments count', () => {
    const r = new SkillRegistry();
    r.register(makeSkill());
    r.recordInvocation('test.skill');
    r.recordInvocation('test.skill');
    r.recordInvocation('test.skill');
    expect(r.get('test.skill')?.invocationCount).toBe(3);
  });

  it('recordInvocation returns false for unknown skill', () => {
    const r = new SkillRegistry();
    expect(r.recordInvocation('unknown')).toBe(false);
  });

  it('topInvoked returns most-used first', () => {
    const r = new SkillRegistry();
    r.register(makeSkill({ name: 'a', invocationCount: 5 }));
    r.register(makeSkill({ name: 'b', invocationCount: 20 }));
    r.register(makeSkill({ name: 'c', invocationCount: 10 }));
    const top = r.topInvoked(2);
    expect(top.map((s) => s.name)).toEqual(['b', 'c']);
  });

  it('topInvoked with limit 0 returns empty', () => {
    const r = new SkillRegistry();
    r.register(makeSkill());
    expect(r.topInvoked(0)).toEqual([]);
  });
});

describe('SkillRegistry — unregister / has', () => {
  it('unregister removes all versions and returns count', () => {
    const r = new SkillRegistry();
    r.register(makeSkill({ version: '1.0.0' }));
    r.register(makeSkill({ version: '2.0.0' }));
    r.register(makeSkill({ name: 'other' }));
    const removed = r.unregister('test.skill');
    expect(removed).toBe(2);
    expect(r.has('test.skill')).toBe(false);
    expect(r.has('other')).toBe(true);
  });

  it('unregister returns 0 for unknown skill', () => {
    const r = new SkillRegistry();
    expect(r.unregister('unknown')).toBe(0);
  });

  it('has returns false for unknown skill', () => {
    const r = new SkillRegistry();
    expect(r.has('unknown')).toBe(false);
  });
});

describe('SkillRegistry — listNames / listAll', () => {
  it('listNames returns unique names', () => {
    const r = new SkillRegistry();
    r.register(makeSkill({ version: '1.0.0' }));
    r.register(makeSkill({ version: '2.0.0' }));
    expect(r.listNames()).toEqual(['test.skill']);
  });

  it('listAll returns latest version of each skill', () => {
    const r = new SkillRegistry();
    r.register(makeSkill({ version: '1.0.0' }));
    r.register(makeSkill({ version: '2.0.0' }));
    r.register(makeSkill({ name: 'other' }));
    const all = r.listAll();
    expect(all.length).toBe(2);
    expect(all.find((s) => s.name === 'test.skill')?.version).toBe('2.0.0');
  });
});

describe('SkillRegistry — dependency validation', () => {
  it('validateDependencies returns valid=true when all present', () => {
    const r = new SkillRegistry();
    r.register(makeSkill({ name: 'base' }));
    r.register(makeSkill({ name: 'derived', dependencies: ['base'] }));
    const result = r.validateDependencies('derived');
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('validateDependencies returns valid=false with missing list', () => {
    const r = new SkillRegistry();
    r.register(makeSkill({ name: 'derived', dependencies: ['base', 'missing'] }));
    const result = r.validateDependencies('derived');
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['base', 'missing']);
  });

  it('validateDependencies returns valid=false for unknown skill', () => {
    const r = new SkillRegistry();
    expect(r.validateDependencies('unknown').valid).toBe(false);
  });
});

describe('SkillRegistry — topological sort', () => {
  it('returns dependencies before dependents', () => {
    const r = new SkillRegistry();
    r.register(makeSkill({ name: 'a' }));
    r.register(makeSkill({ name: 'b', dependencies: ['a'] }));
    r.register(makeSkill({ name: 'c', dependencies: ['b'] }));
    const order = r.topologicalSort();
    const ai = order.indexOf('a');
    const bi = order.indexOf('b');
    const ci = order.indexOf('c');
    expect(ai).toBeLessThan(bi);
    expect(bi).toBeLessThan(ci);
  });

  it('handles multiple independent skills', () => {
    const r = new SkillRegistry();
    r.register(makeSkill({ name: 'a' }));
    r.register(makeSkill({ name: 'b' }));
    r.register(makeSkill({ name: 'c' }));
    const order = r.topologicalSort();
    expect(order.sort()).toEqual(['a', 'b', 'c']);
  });

  it('detects cyclic dependencies', () => {
    const r = new SkillRegistry();
    r.register(makeSkill({ name: 'a', dependencies: ['b'] }));
    r.register(makeSkill({ name: 'b', dependencies: ['a'] }));
    expect(() => r.topologicalSort()).toThrow('Cyclic dependency');
  });
});

describe('SkillRegistry — DEFAULT_SKILLS sanity', () => {
  it('contains exactly 50 skills', () => {
    expect(DEFAULT_SKILLS.length).toBe(50);
  });

  it('all skill names are unique', () => {
    const names = DEFAULT_SKILLS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all skills have valid input/output schemas', () => {
    for (const s of DEFAULT_SKILLS) {
      expect(s.inputs).toBeDefined();
      expect(s.outputs).toBeDefined();
      expect(s.estimatedCostUSD).toBeGreaterThanOrEqual(0);
      expect(s.estimatedDurationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('category distribution: 12 content, 8 analysis, 8 transform, 6 search, 5 notification, 5 workflow, 3 memory, 3 integration', () => {
    const byCat = new Map<string, number>();
    for (const s of DEFAULT_SKILLS) {
      byCat.set(s.category, (byCat.get(s.category) || 0) + 1);
    }
    expect(byCat.get('content')).toBe(12);
    expect(byCat.get('analysis')).toBe(8);
    expect(byCat.get('transform')).toBe(8);
    expect(byCat.get('search')).toBe(6);
    expect(byCat.get('notification')).toBe(5);
    expect(byCat.get('workflow')).toBe(5);
    expect(byCat.get('memory')).toBe(3);
    expect(byCat.get('integration')).toBe(3);
  });

  it('all dependency references exist within DEFAULT_SKILLS', () => {
    const r = new SkillRegistry();
    r.registerAll(DEFAULT_SKILLS);
    for (const s of DEFAULT_SKILLS) {
      const result = r.validateDependencies(s.name);
      expect(result.missing).toEqual([]);
    }
  });
});
