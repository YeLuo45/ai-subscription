/**
 * SkillCrystallizer.test.ts — Self-Evolution + Plan/Supervisor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SkillCrystallizer,
  PlanMode,
  Supervisor,
  traceFingerprint,
  traceSimilarity,
  type ExecutionTrace,
  type ExecutionStep,
} from '../SkillCrystallizer';
import { SkillRegistry } from '../SkillRegistry';

function makeStep(overrides: Partial<ExecutionStep> = {}): ExecutionStep {
  return {
    id: `s-${Math.random().toString(36).slice(2, 6)}`,
    tool: 'summarize-article',
    inputs: { content: 'hello' },
    durationMs: 1000,
    order: 0,
    ...overrides,
  };
}

function makeTrace(overrides: Partial<ExecutionTrace> = {}): ExecutionTrace {
  return {
    id: `t-${Math.random().toString(36).slice(2, 6)}`,
    goal: 'summarize-article',
    tags: ['test'],
    steps: [makeStep()],
    totalDurationMs: 1000,
    success: true,
    timestamp: Date.now(),
    userId: 'u1',
    ...overrides,
  };
}

describe('SkillCrystallizer — trace recording', () => {
  let registry: SkillRegistry;
  let c: SkillCrystallizer;

  beforeEach(() => {
    registry = new SkillRegistry();
    c = new SkillCrystallizer(registry);
  });

  it('records a single trace', () => {
    const t = makeTrace();
    c.recordTrace(t);
    expect(c.traceCount()).toBe(1);
  });

  it('rejects trace without id or goal', () => {
    expect(() => c.recordTrace(makeTrace({ id: '' }))).toThrow('id and goal');
    expect(() => c.recordTrace(makeTrace({ goal: '' }))).toThrow('id and goal');
  });

  it('clearTraces removes all', () => {
    c.recordTrace(makeTrace());
    c.recordTrace(makeTrace());
    c.clearTraces();
    expect(c.traceCount()).toBe(0);
  });
});

describe('SkillCrystallizer — REPEATED_PATTERN trigger', () => {
  let registry: SkillRegistry;
  let c: SkillCrystallizer;
  beforeEach(() => {
    registry = new SkillRegistry();
    c = new SkillCrystallizer(registry, { repeatedMinOccurrences: 3 });
  });

  it('no candidate below threshold', () => {
    c.recordTrace(makeTrace({ goal: 'g1' }));
    c.recordTrace(makeTrace({ goal: 'g1' }));
    const candidates = c.detectCandidates();
    expect(candidates.find((cand) => cand.trigger === 'repeated_pattern')).toBeUndefined();
  });

  it('triggers at threshold', () => {
    c.recordTrace(makeTrace({ goal: 'g1' }));
    c.recordTrace(makeTrace({ goal: 'g1' }));
    c.recordTrace(makeTrace({ goal: 'g1' }));
    const candidates = c.detectCandidates();
    const cand = candidates.find((c) => c.trigger === 'repeated_pattern');
    expect(cand).toBeDefined();
    expect(cand!.traces.length).toBe(3);
  });

  it('confidence scales with success rate', () => {
    c.recordTrace(makeTrace({ goal: 'g1', success: true }));
    c.recordTrace(makeTrace({ goal: 'g1', success: true }));
    c.recordTrace(makeTrace({ goal: 'g1', success: false }));
    const cand = c.detectCandidates().find((c) => c.trigger === 'repeated_pattern')!;
    expect(cand.confidence).toBeLessThan(1);
    expect(cand.confidence).toBeGreaterThan(0);
  });
});

describe('SkillCrystallizer — HIGH_FAILURE trigger', () => {
  it('triggers when failure rate exceeds threshold', () => {
    const c = new SkillCrystallizer(new SkillRegistry(), { failureRateThreshold: 0.5 });
    c.recordTrace(makeTrace({ goal: 'g1', success: false }));
    c.recordTrace(makeTrace({ goal: 'g1', success: false }));
    c.recordTrace(makeTrace({ goal: 'g1', success: true }));
    const cand = c.detectCandidates().find((c) => c.trigger === 'high_failure');
    expect(cand).toBeDefined();
  });

  it('does not trigger when success rate is high', () => {
    const c = new SkillCrystallizer(new SkillRegistry(), { failureRateThreshold: 0.5 });
    c.recordTrace(makeTrace({ goal: 'g1', success: true }));
    c.recordTrace(makeTrace({ goal: 'g1', success: true }));
    c.recordTrace(makeTrace({ goal: 'g1', success: true }));
    const cand = c.detectCandidates().find((c) => c.trigger === 'high_failure');
    expect(cand).toBeUndefined();
  });
});

describe('SkillCrystallizer — HIGH_LATENCY trigger', () => {
  it('triggers when totalDurationMs exceeds threshold', () => {
    const c = new SkillCrystallizer(new SkillRegistry(), { maxDurationMs: 5000 });
    c.recordTrace(makeTrace({ goal: 'g1', totalDurationMs: 10000, success: true }));
    const cand = c.detectCandidates().find((c) => c.trigger === 'high_latency');
    expect(cand).toBeDefined();
  });

  it('does not trigger for fast traces', () => {
    const c = new SkillCrystallizer(new SkillRegistry(), { maxDurationMs: 5000 });
    c.recordTrace(makeTrace({ goal: 'g1', totalDurationMs: 1000 }));
    const cand = c.detectCandidates().find((c) => c.trigger === 'high_latency');
    expect(cand).toBeUndefined();
  });
});

describe('SkillCrystallizer — LOW_EFFICIENCY trigger', () => {
  it('triggers when steps exceed maxForOutcome', () => {
    const c = new SkillCrystallizer(new SkillRegistry(), { maxStepsForOutcome: 3 });
    const manySteps = Array.from({ length: 6 }, (_, i) => makeStep({ order: i, tool: 't' + i }));
    c.recordTrace(makeTrace({ goal: 'g1', steps: manySteps, success: true }));
    const cand = c.detectCandidates().find((c) => c.trigger === 'low_efficiency');
    expect(cand).toBeDefined();
  });

  it('does not trigger for short traces', () => {
    const c = new SkillCrystallizer(new SkillRegistry(), { maxStepsForOutcome: 5 });
    c.recordTrace(makeTrace({ goal: 'g1', success: true }));
    const cand = c.detectCandidates().find((c) => c.trigger === 'low_efficiency');
    expect(cand).toBeUndefined();
  });
});

describe('SkillCrystallizer — SIMILAR_CLUSTER trigger', () => {
  it('triggers when similar traces cluster', () => {
    const c = new SkillCrystallizer(new SkillRegistry(), { clusterMinSize: 3, similarityThreshold: 0.5 });
    const t1 = makeTrace({ steps: [makeStep({ tool: 'a' }), makeStep({ tool: 'b', order: 1 })] });
    const t2 = makeTrace({ steps: [makeStep({ tool: 'a' }), makeStep({ tool: 'b', order: 1 })] });
    const t3 = makeTrace({ steps: [makeStep({ tool: 'a' }), makeStep({ tool: 'b', order: 1 })] });
    c.recordTrace(t1);
    c.recordTrace(t2);
    c.recordTrace(t3);
    const cand = c.detectCandidates().find((c) => c.trigger === 'similar_cluster');
    expect(cand).toBeDefined();
    expect(cand!.traces.length).toBeGreaterThanOrEqual(3);
  });

  it('does not trigger when traces are different', () => {
    const c = new SkillCrystallizer(new SkillRegistry(), { clusterMinSize: 3 });
    c.recordTrace(makeTrace({ steps: [makeStep({ tool: 'a' })] }));
    c.recordTrace(makeTrace({ steps: [makeStep({ tool: 'b' })] }));
    c.recordTrace(makeTrace({ steps: [makeStep({ tool: 'c' })] }));
    const cand = c.detectCandidates().find((c) => c.trigger === 'similar_cluster');
    expect(cand).toBeUndefined();
  });
});

describe('SkillCrystallizer — crystallize', () => {
  it('crystallizes candidate into Skill', () => {
    const c = new SkillCrystallizer(new SkillRegistry(), { repeatedMinOccurrences: 2 });
    c.recordTrace(makeTrace({ goal: 'summarize-and-tag' }));
    c.recordTrace(makeTrace({ goal: 'summarize-and-tag' }));
    const candidate = c.detectCandidates().find((c) => c.trigger === 'repeated_pattern');
    expect(candidate).toBeDefined();
    const skill = c.crystallize(candidate!);
    expect(skill).toBeDefined();
    expect(skill!.name).toMatch(/^sop-/);
    expect(skill!.tags).toContain('crystallized');
  });

  it('crystallizeExplicit registers with custom name', () => {
    const c = new SkillCrystallizer(new SkillRegistry());
    const t1 = makeTrace();
    const t2 = makeTrace();
    const skill = c.crystallizeExplicit([t1, t2], 'my-skill', 'My custom SOP');
    expect(skill.name).toBe('my-skill');
    expect(skill.description).toBe('My custom SOP');
  });

  it('crystallize returns existing on duplicate name', () => {
    const c = new SkillCrystallizer(new SkillRegistry(), { repeatedMinOccurrences: 2 });
    c.recordTrace(makeTrace({ goal: 'g' }));
    c.recordTrace(makeTrace({ goal: 'g' }));
    const cand = c.detectCandidates().find((c) => c.trigger === 'repeated_pattern')!;
    const s1 = c.crystallize(cand);
    const s2 = c.crystallize(cand);
    expect(s1).toEqual(s2);
    expect(s1?.name).toBe(s2?.name);
  });
});

describe('traceFingerprint / traceSimilarity', () => {
  it('fingerprint is tool sequence', () => {
    const t = makeTrace({ steps: [
      makeStep({ tool: 'a', order: 0 }),
      makeStep({ tool: 'b', order: 1 }),
      makeStep({ tool: 'c', order: 2 }),
    ]});
    expect(traceFingerprint(t)).toBe('a->b->c');
  });

  it('similarity 1.0 for identical traces', () => {
    const t1 = makeTrace({ steps: [makeStep({ tool: 'a' }), makeStep({ tool: 'b', order: 1 })] });
    const t2 = makeTrace({ steps: [makeStep({ tool: 'a' }), makeStep({ tool: 'b', order: 1 })] });
    expect(traceSimilarity(t1, t2)).toBe(1);
  });

  it('similarity < 1.0 for different traces', () => {
    const t1 = makeTrace({ steps: [makeStep({ tool: 'a' })] });
    const t2 = makeTrace({ steps: [makeStep({ tool: 'b' })] });
    expect(traceSimilarity(t1, t2)).toBeLessThan(1);
  });

  it('similarity 0 for empty traces', () => {
    const t1 = makeTrace({ steps: [] });
    const t2 = makeTrace({ steps: [] });
    expect(traceSimilarity(t1, t2)).toBe(0);
  });
});

describe('PlanMode — basic lifecycle', () => {
  let pm: PlanMode;
  beforeEach(() => {
    pm = new PlanMode();
  });

  it('plans single goal', () => {
    const p = pm.plan('summarize this article');
    expect(p.steps.length).toBeGreaterThan(0);
    expect(p.status).toBe('draft');
  });

  it('plan with "then" splits into sequential steps', () => {
    const p = pm.plan('summarize then tag then archive');
    expect(p.steps.length).toBe(3);
    expect(p.steps[1].dependsOn).toContain('step-1');
    expect(p.steps[2].dependsOn).toContain('step-2');
  });

  it('plan with custom steps', () => {
    const p = pm.plan('goal', [
      { id: 'a', description: 'first' },
      { id: 'b', description: 'second', dependsOn: ['a'] },
    ]);
    expect(p.steps.length).toBe(2);
  });

  it('approve transitions draft to approved', () => {
    const p = pm.plan('g');
    expect(pm.approve(p.id)).toBe(true);
    expect(pm.getPlan(p.id)?.status).toBe('approved');
  });

  it('approve returns false for non-draft', () => {
    const p = pm.plan('g');
    pm.approve(p.id);
    expect(pm.approve(p.id)).toBe(false);
  });

  it('start requires approved', () => {
    const p = pm.plan('g');
    expect(pm.start(p.id)).toBe(false);
    pm.approve(p.id);
    expect(pm.start(p.id)).toBe(true);
  });

  it('complete requires executing', () => {
    const p = pm.plan('g');
    expect(pm.complete(p.id)).toBe(false);
    pm.approve(p.id);
    pm.start(p.id);
    expect(pm.complete(p.id)).toBe(true);
  });

  it('cancel works from draft/approved/executing', () => {
    const p1 = pm.plan('g1');
    expect(pm.cancel(p1.id)).toBe(true);
    const p2 = pm.plan('g2');
    pm.approve(p2.id);
    expect(pm.cancel(p2.id)).toBe(true);
  });

  it('cancel fails for completed', () => {
    const p = pm.plan('g');
    pm.approve(p.id);
    pm.start(p.id);
    pm.complete(p.id);
    expect(pm.cancel(p.id)).toBe(false);
  });

  it('getExecutionOrder respects dependsOn', () => {
    const p = pm.plan('g', [
      { id: 'a', description: 'a' },
      { id: 'b', description: 'b', dependsOn: ['a'] },
      { id: 'c', description: 'c', dependsOn: ['b'] },
    ]);
    const order = pm.getExecutionOrder(p.id);
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'));
  });

  it('getPlan returns undefined for unknown id', () => {
    expect(pm.getPlan('nope')).toBeUndefined();
  });
});

describe('Supervisor — intervention triggers', () => {
  let sup: Supervisor;
  beforeEach(() => {
    sup = new Supervisor();
  });

  it('triggers retry on failure with error', () => {
    const step = { id: 's1', description: 'x', estimatedDurationMs: 5000 };
    const intervention = sup.check(step, { success: false, durationMs: 1000, error: 'boom' });
    expect(intervention?.action).toBe('retry');
  });

  it('triggers ask_user on failure without error', () => {
    const step = { id: 's1', description: 'x' };
    const intervention = sup.check(step, { success: false, durationMs: 1000 });
    expect(intervention?.action).toBe('ask_user');
  });

  it('triggers ask_user when duration exceeds 3x estimate', () => {
    const step = { id: 's1', description: 'x', estimatedDurationMs: 1000 };
    const intervention = sup.check(step, { success: true, durationMs: 5000 });
    expect(intervention?.action).toBe('ask_user');
  });

  it('does not trigger on success within estimate', () => {
    const step = { id: 's1', description: 'x', estimatedDurationMs: 1000 };
    const intervention = sup.check(step, { success: true, durationMs: 500 });
    expect(intervention).toBeNull();
  });

  it('records every intervention in log', () => {
    const step = { id: 's1', description: 'x' };
    sup.check(step, { success: false, durationMs: 1, error: 'a' });
    sup.check(step, { success: false, durationMs: 1, error: 'b' });
    expect(sup.count()).toBe(2);
    sup.clearInterventions();
    expect(sup.count()).toBe(0);
  });
});
