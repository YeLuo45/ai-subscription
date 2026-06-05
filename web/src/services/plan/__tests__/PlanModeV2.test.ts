/**
 * PlanModeV2.test.ts — Pure unit tests for plan/checkpoint/rollback
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlanModeV2, type PlanStep } from '../PlanModeV2';

describe('PlanModeV2 — plan creation', () => {
  let pm: PlanModeV2;
  beforeEach(() => {
    pm = new PlanModeV2();
  });

  it('creates a plan with steps', () => {
    const plan = pm.createPlan('test', [
      { id: 'a', description: 'first' },
      { id: 'b', description: 'second', dependencies: ['a'] },
    ]);
    expect(plan.id).toMatch(/^plan-/);
    expect(plan.steps.length).toBe(2);
    expect(plan.status).toBe('draft');
  });

  it('rejects duplicate step ids', () => {
    expect(() => pm.createPlan('test', [
      { id: 'a', description: '1' },
      { id: 'a', description: '2' },
    ])).toThrow('Duplicate step id');
  });

  it('rejects unknown dependency', () => {
    expect(() => pm.createPlan('test', [
      { id: 'a', description: '1', dependencies: ['nonexistent'] },
    ])).toThrow('unknown dependency');
  });

  it('auto-generates step ids', () => {
    const plan = pm.createPlan('test', [{ description: 'first' }]);
    expect(plan.steps[0].id).toMatch(/^step-/);
  });
});

describe('PlanModeV2 — approval and execution order', () => {
  let pm: PlanModeV2;
  beforeEach(() => {
    pm = new PlanModeV2();
  });

  it('approves a draft plan', () => {
    const plan = pm.createPlan('test', [{ id: 'a', description: '1' }]);
    expect(pm.approve(plan.id)).toBe(true);
    expect(pm.getPlan(plan.id)?.status).toBe('approved');
  });

  it('approve returns false for unknown plan', () => {
    expect(pm.approve('nope')).toBe(false);
  });

  it('approve returns false for non-draft plan', () => {
    const plan = pm.createPlan('test', [{ id: 'a', description: '1' }]);
    pm.approve(plan.id);
    expect(pm.approve(plan.id)).toBe(false);
  });

  it('computes topological order', () => {
    const plan = pm.createPlan('test', [
      { id: 'a', description: '1' },
      { id: 'b', description: '2', dependencies: ['a'] },
      { id: 'c', description: '3', dependencies: ['a'] },
      { id: 'd', description: '4', dependencies: ['b', 'c'] },
    ]);
    const order = pm.getExecutionOrder(plan.id);
    expect(order).toEqual(['a', 'b', 'c', 'd']); // a first, d last
  });

  it('returns null for cyclic dependencies', () => {
    const plan = pm.createPlan('test', [
      { id: 'a', description: '1', dependencies: ['b'] },
      { id: 'b', description: '2', dependencies: ['a'] },
    ]);
    expect(pm.getExecutionOrder(plan.id)).toBeNull();
  });

  it('getReadySteps returns steps with completed deps', () => {
    const plan = pm.createPlan('test', [
      { id: 'a', description: '1' },
      { id: 'b', description: '2', dependencies: ['a'] },
    ]);
    expect(pm.getReadySteps(plan.id).length).toBe(1);
    expect(pm.getReadySteps(plan.id)[0].id).toBe('a');
  });
});

describe('PlanModeV2 — executeStep', () => {
  it('executes a step with custom action', async () => {
    const pm = new PlanModeV2();
    const plan = pm.createPlan('test', [{
      id: 'a', description: '1', action: async (input) => ({ result: ((input.n as number) ?? 0) * 2 }),
    }]);
    pm.approve(plan.id);
    const result = await pm.executeStep(plan.id, 'a');
    expect(result.status).toBe('completed');
    expect(result.output?.result).toBe(0); // n not provided, defaults to 0
  });

  it('records error on action failure', async () => {
    const pm = new PlanModeV2();
    const plan = pm.createPlan('test', [{
      id: 'a', description: '1', maxRetries: 0, action: async () => { throw new Error('boom'); },
    }]);
    pm.approve(plan.id);
    const result = await pm.executeStep(plan.id, 'a');
    expect(result.status).toBe('failed');
    expect(result.error).toBe('boom');
  });

  it('retries on failure when maxRetries > 0', async () => {
    const pm = new PlanModeV2();
    let attempts = 0;
    const plan = pm.createPlan('test', [{
      id: 'a', description: '1', maxRetries: 2, action: async () => {
        attempts += 1;
        if (attempts < 2) throw new Error('not yet');
        return { ok: true };
      },
    }]);
    pm.approve(plan.id);
    const r1 = await pm.executeStep(plan.id, 'a');
    expect(r1.status).toBe('pending'); // can retry
    const r2 = await pm.executeStep(plan.id, 'a');
    expect(r2.status).toBe('completed');
  });

  it('throws if step already running', async () => {
    const pm = new PlanModeV2();
    const plan = pm.createPlan('test', [{
      id: 'a', description: '1', action: async () => {
        await new Promise((r) => setTimeout(r, 50));
        return {};
      },
    }]);
    pm.approve(plan.id);
    pm.executeStep(plan.id, 'a'); // don't await
    await expect(pm.executeStep(plan.id, 'a')).rejects.toThrow('already running');
  });

  it('throws if plan not approved', async () => {
    const pm = new PlanModeV2();
    const plan = pm.createPlan('test', [{ id: 'a', description: '1' }]);
    await expect(pm.executeStep(plan.id, 'a')).rejects.toThrow('cannot execute step');
  });
});

describe('PlanModeV2 — run full plan', () => {
  it('runs plan with topological order', async () => {
    const pm = new PlanModeV2();
    const executionOrder: string[] = [];
    const plan = pm.createPlan('test', [
      { id: 'a', description: '1', action: async () => { executionOrder.push('a'); return {}; } },
      { id: 'b', description: '2', dependencies: ['a'], action: async () => { executionOrder.push('b'); return {}; } },
      { id: 'c', description: '3', dependencies: ['a'], action: async () => { executionOrder.push('c'); return {}; } },
    ]);
    pm.approve(plan.id);
    const result = await pm.run(plan.id);
    expect(result.status).toBe('completed');
    expect(executionOrder[0]).toBe('a');
    expect(executionOrder).toContain('b');
    expect(executionOrder).toContain('c');
  });

  it('marks plan failed if any step fails', async () => {
    const pm = new PlanModeV2();
    const plan = pm.createPlan('test', [
      { id: 'a', description: '1', maxRetries: 0, action: async () => { throw new Error('fail'); } },
    ]);
    pm.approve(plan.id);
    const result = await pm.run(plan.id);
    expect(result.status).toBe('failed');
    expect(result.stepsFailed).toBe(1);
  });

  it('rejects run on non-approved plan', async () => {
    const pm = new PlanModeV2();
    const plan = pm.createPlan('test', [{ id: 'a', description: '1' }]);
    await expect(pm.run(plan.id)).rejects.toThrow('must be approved');
  });
});

describe('PlanModeV2 — checkpoint and rollback', () => {
  it('captures a checkpoint', () => {
    const pm = new PlanModeV2();
    const plan = pm.createPlan('test', [{ id: 'a', description: '1' }]);
    expect(pm.captureCheckpoint(plan.id, 'a', { x: 1 })).toBe(true);
    expect(plan.checkpoints.length).toBe(1);
  });

  it('captureCheckpoint returns false for unknown step', () => {
    const pm = new PlanModeV2();
    const plan = pm.createPlan('test', [{ id: 'a', description: '1' }]);
    expect(pm.captureCheckpoint(plan.id, 'nope', {})).toBe(false);
  });

  it('rollback to checkpoint restores state', async () => {
    const pm = new PlanModeV2();
    const plan = pm.createPlan('test', [
      { id: 'a', description: '1', action: async () => ({ v: 'a-result' }) },
      { id: 'b', description: '2', dependencies: ['a'], action: async () => ({ v: 'b-result' }) },
    ]);
    pm.approve(plan.id);
    pm.captureCheckpoint(plan.id, 'a', { snapshot: 'before-b' });
    await pm.run(plan.id);
    expect(pm.rollback(plan.id, 'a')).toBe(true);
    expect(pm.getPlan(plan.id)?.status).toBe('rolled_back');
  });

  it('rollback returns false for unknown checkpoint', () => {
    const pm = new PlanModeV2();
    const plan = pm.createPlan('test', [{ id: 'a', description: '1' }]);
    expect(pm.rollback(plan.id, 'nope')).toBe(false);
  });
});

describe('PlanModeV2 — pause and resume', () => {
  it('pauses a running plan', () => {
    const pm = new PlanModeV2();
    const plan = pm.createPlan('test', [{ id: 'a', description: '1' }]);
    pm.approve(plan.id);
    // Force plan into running state via executeStep would be async; use manual state
    const p = pm.getPlan(plan.id)!;
    p.status = 'running';
    expect(pm.pause(plan.id)).toBe(true);
    expect(pm.getPlan(plan.id)?.status).toBe('paused');
  });

  it('pause returns false for non-running plan', () => {
    const pm = new PlanModeV2();
    const plan = pm.createPlan('test', [{ id: 'a', description: '1' }]);
    expect(pm.pause(plan.id)).toBe(false);
  });

  it('resume returns false for non-paused plan', () => {
    const pm = new PlanModeV2();
    const plan = pm.createPlan('test', [{ id: 'a', description: '1' }]);
    expect(pm.resume(plan.id)).toBe(false);
  });
});

describe('PlanModeV2 — skip step', () => {
  it('marks a step as skipped', () => {
    const pm = new PlanModeV2();
    const plan = pm.createPlan('test', [{ id: 'a', description: '1' }]);
    expect(pm.skipStep(plan.id, 'a')).toBe(true);
    expect(pm.getPlan(plan.id)?.steps[0].status).toBe('skipped');
  });
});

describe('PlanModeV2 — audit log and stats', () => {
  it('audit log records events', () => {
    const pm = new PlanModeV2();
    const plan = pm.createPlan('test', [{ id: 'a', description: '1' }]);
    pm.approve(plan.id);
    const log = pm.getAuditLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log.some((e) => e.event === 'plan created')).toBe(true);
  });

  it('stats counts plans by status', () => {
    const pm = new PlanModeV2();
    pm.createPlan('a', [{ id: 'x', description: '1' }]);
    pm.createPlan('b', [{ id: 'y', description: '2' }]);
    const stats = pm.stats();
    expect(stats.totalPlans).toBe(2);
    expect(stats.byStatus.draft).toBe(2);
  });
});
