/**
 * PuppeteerOrchestrator.test.ts — Pure unit tests for master-agent delegation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PuppeteerOrchestrator,
  DEFAULT_DECOMPOSITION_RULES,
  type Agent,
  type SubTask,
  type AgentRole,
} from '../PuppeteerOrchestrator';

describe('PuppeteerOrchestrator — agent management', () => {
  let orch: PuppeteerOrchestrator;
  beforeEach(() => {
    orch = new PuppeteerOrchestrator();
  });

  it('registers an agent', () => {
    const id = orch.registerAgent({ role: 'programmer', name: 'Alice', capabilities: ['js'], available: true });
    expect(id).toMatch(/^agent-/);
    expect(orch.listAgents().length).toBe(1);
  });

  it('unregisters an agent', () => {
    const id = orch.registerAgent({ role: 'programmer', name: 'A', capabilities: [], available: true });
    expect(orch.unregisterAgent(id)).toBe(true);
    expect(orch.listAgents().length).toBe(0);
  });

  it('unregister returns false for unknown', () => {
    expect(orch.unregisterAgent('nope')).toBe(false);
  });

  it('getAgent returns by id', () => {
    const id = orch.registerAgent({ role: 'tester', name: 'T', capabilities: [], available: true });
    expect(orch.getAgent(id)?.name).toBe('T');
  });

  it('listByRole filters by role', () => {
    orch.registerAgent({ role: 'programmer', name: 'A', capabilities: [], available: true });
    orch.registerAgent({ role: 'programmer', name: 'B', capabilities: [], available: true });
    orch.registerAgent({ role: 'tester', name: 'C', capabilities: [], available: true });
    expect(orch.listByRole('programmer').length).toBe(2);
    expect(orch.listByRole('tester').length).toBe(1);
  });

  it('findAgentForRole returns first available', () => {
    const a1 = orch.registerAgent({ role: 'programmer', name: 'A', capabilities: [], available: false });
    const a2 = orch.registerAgent({ role: 'programmer', name: 'B', capabilities: [], available: true });
    const found = orch.findAgentForRole('programmer');
    expect(found?.id).toBe(a2);
    expect(found?.id).not.toBe(a1);
  });

  it('findAgentForRole returns undefined when none available', () => {
    orch.registerAgent({ role: 'programmer', name: 'A', capabilities: [], available: false });
    expect(orch.findAgentForRole('programmer')).toBeUndefined();
  });
});

describe('PuppeteerOrchestrator — decompose', () => {
  let orch: PuppeteerOrchestrator;
  beforeEach(() => {
    orch = new PuppeteerOrchestrator();
    for (const rule of DEFAULT_DECOMPOSITION_RULES) {
      orch.addDecompositionRule(rule);
    }
  });

  it('decomposes code task into 4 sub-tasks', () => {
    const subs = orch.decompose('p1', 'Implement a code feature');
    expect(subs.length).toBe(4);
    expect(subs.map((s) => s.role)).toEqual(['cto', 'programmer', 'reviewer', 'tester']);
  });

  it('decomposes research task into 2 sub-tasks', () => {
    const subs = orch.decompose('p1', 'Research the topic');
    expect(subs.length).toBe(2);
    expect(subs[0].role).toBe('researcher');
  });

  it('decomposes design task', () => {
    const subs = orch.decompose('p1', 'Create a design mockup');
    expect(subs.length).toBe(2);
  });

  it('returns empty array when no rule matches', () => {
    const subs = orch.decompose('p1', 'Random unrelated task xyz');
    expect(subs.length).toBe(0);
  });

  it('sub-tasks have unique IDs and pending status', () => {
    const subs = orch.decompose('p1', 'code task');
    expect(new Set(subs.map((s) => s.id)).size).toBe(subs.length);
    expect(subs.every((s) => s.status === 'pending')).toBe(true);
  });
});

describe('PuppeteerOrchestrator — assign & execute', () => {
  let orch: PuppeteerOrchestrator;
  beforeEach(() => {
    orch = new PuppeteerOrchestrator();
    for (const rule of DEFAULT_DECOMPOSITION_RULES) orch.addDecompositionRule(rule);
    orch.registerAgent({ role: 'programmer', name: 'P', capabilities: ['js'], available: true });
  });

  it('assigns sub-task to matching agent', () => {
    const subs = orch.decompose('p1', 'code task');
    const programmerTask = subs.find((s) => s.role === 'programmer')!;
    expect(orch.assign(programmerTask.id)).toBe(true);
    const updated = orch.getSubTask(programmerTask.id);
    expect(updated?.status).toBe('assigned');
    expect(updated?.assignedTo).toBeDefined();
  });

  it('returns false when no agent available', () => {
    const orch2 = new PuppeteerOrchestrator();
    for (const rule of DEFAULT_DECOMPOSITION_RULES) orch2.addDecompositionRule(rule);
    // No agents registered
    const subs = orch2.decompose('p1', 'code task');
    const programmerTask = subs.find((s) => s.role === 'programmer')!;
    expect(orch2.assign(programmerTask.id)).toBe(false);
  });

  it('execute invokes default handler (echo input)', async () => {
    const subs = orch.decompose('p1', 'code task', { x: 1 });
    const programmerTask = subs.find((s) => s.role === 'programmer')!;
    orch.assign(programmerTask.id);
    const result = await orch.execute(programmerTask.id);
    expect(result.status).toBe('completed');
    expect(result.output?.echo).toEqual({ x: 1 });
    expect(result.attempts).toBe(1);
  });

  it('execute invokes custom handler', async () => {
    const orch2 = new PuppeteerOrchestrator();
    for (const rule of DEFAULT_DECOMPOSITION_RULES) orch2.addDecompositionRule(rule);
    orch2.registerAgent({
      role: 'programmer', name: 'Custom', capabilities: [], available: true,
      handler: async (task) => ({ doubled: ((task.input?.n as number) ?? 0) * 2 }),
    });
    const subs = orch2.decompose('p1', 'code', { n: 21 });
    const programmerTask = subs.find((s) => s.role === 'programmer')!;
    orch2.assign(programmerTask.id);
    const result = await orch2.execute(programmerTask.id);
    expect(result.output?.doubled).toBe(42);
  });

  it('execute records error on failure', async () => {
    const orch2 = new PuppeteerOrchestrator();
    for (const rule of DEFAULT_DECOMPOSITION_RULES) orch2.addDecompositionRule(rule);
    orch2.registerAgent({
      role: 'programmer', name: 'Bad', capabilities: [], available: true,
      handler: async () => { throw new Error('task failed'); },
    });
    const subs = orch2.decompose('p1', 'code');
    const programmerTask = subs.find((s) => s.role === 'programmer')!;
    orch2.assign(programmerTask.id);
    const result = await orch2.execute(programmerTask.id);
    expect(result.status).toBe('failed');
    expect(result.error).toBe('task failed');
  });

  it('execute throws if sub-task not assigned', async () => {
    const subs = orch.decompose('p1', 'code');
    const programmerTask = subs.find((s) => s.role === 'programmer')!;
    await expect(orch.execute(programmerTask.id)).rejects.toThrow('not assigned');
  });

  it('increments agent tasksHandled on success', async () => {
    const subs = orch.decompose('p1', 'code');
    const programmerTask = subs.find((s) => s.role === 'programmer')!;
    orch.assign(programmerTask.id);
    const agentId = orch.getSubTask(programmerTask.id)!.assignedTo!;
    await orch.execute(programmerTask.id);
    expect(orch.getAgent(agentId)?.tasksHandled).toBe(1);
  });
});

describe('PuppeteerOrchestrator — run (full orchestration)', () => {
  it('runs code task end-to-end', async () => {
    const orch = new PuppeteerOrchestrator();
    for (const rule of DEFAULT_DECOMPOSITION_RULES) orch.addDecompositionRule(rule);
    for (const role of ['cto', 'programmer', 'reviewer', 'tester'] as AgentRole[]) {
      orch.registerAgent({ role, name: role, capabilities: [], available: true });
    }
    const result = await orch.run('p1', 'Implement code feature', { input: 'x' });
    expect(result.subTasks.length).toBe(4);
    expect(result.allCompleted).toBe(true);
    expect(result.synthesized).toBeDefined();
    expect(Object.keys(result.synthesized!).length).toBe(4);
  });

  it('synthesize merges outputs with role prefix', async () => {
    const orch = new PuppeteerOrchestrator();
    for (const rule of DEFAULT_DECOMPOSITION_RULES) orch.addDecompositionRule(rule);
    for (const role of ['cto', 'programmer', 'reviewer', 'tester'] as AgentRole[]) {
      orch.registerAgent({ role, name: role, capabilities: [], available: true });
    }
    const result = await orch.run('p1', 'code task');
    const keys = Object.keys(result.synthesized!);
    expect(keys.some((k) => k.startsWith('cto:'))).toBe(true);
    expect(keys.some((k) => k.startsWith('programmer:'))).toBe(true);
  });

  it('records duration in ms', async () => {
    const orch = new PuppeteerOrchestrator();
    for (const rule of DEFAULT_DECOMPOSITION_RULES) orch.addDecompositionRule(rule);
    for (const role of ['cto', 'programmer', 'reviewer', 'tester'] as AgentRole[]) {
      orch.registerAgent({ role, name: role, capabilities: [], available: true });
    }
    const result = await orch.run('p1', 'code');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('PuppeteerOrchestrator — conversation log', () => {
  it('appends entries on execute', async () => {
    const orch = new PuppeteerOrchestrator();
    for (const rule of DEFAULT_DECOMPOSITION_RULES) orch.addDecompositionRule(rule);
    orch.registerAgent({ role: 'programmer', name: 'P', capabilities: [], available: true });
    const subs = orch.decompose('p1', 'code');
    const programmerTask = subs.find((s) => s.role === 'programmer')!;
    orch.assign(programmerTask.id);
    await orch.execute(programmerTask.id);
    const log = orch.getConversationLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].role).toBe('programmer');
  });

  it('clearConversationLog empties the log', () => {
    const orch = new PuppeteerOrchestrator();
    orch.appendConversation({ role: 'ceo', agentId: 'a1', text: 'hi' });
    orch.clearConversationLog();
    expect(orch.getConversationLog()).toEqual([]);
  });

  it('getConversationLog with limit returns last N', () => {
    const orch = new PuppeteerOrchestrator();
    for (let i = 0; i < 10; i++) {
      orch.appendConversation({ role: 'ceo', agentId: 'a1', text: `entry ${i}` });
    }
    const last3 = orch.getConversationLog(3);
    expect(last3.length).toBe(3);
    expect(last3[2].text).toBe('entry 9');
  });
});

describe('PuppeteerOrchestrator — stats', () => {
  it('returns zero state for fresh orchestrator', () => {
    const orch = new PuppeteerOrchestrator();
    const s = orch.stats();
    expect(s.totalAgents).toBe(0);
    expect(s.totalTasks).toBe(0);
    expect(s.completedTasks).toBe(0);
  });

  it('counts completed and failed tasks', async () => {
    const orch = new PuppeteerOrchestrator();
    for (const rule of DEFAULT_DECOMPOSITION_RULES) orch.addDecompositionRule(rule);
    orch.registerAgent({
      role: 'programmer', name: 'P', capabilities: [], available: true,
      handler: async () => { throw new Error('fail'); },
    });
    const subs = orch.decompose('p1', 'code');
    const programmerTask = subs.find((s) => s.role === 'programmer')!;
    orch.assign(programmerTask.id);
    await orch.execute(programmerTask.id);
    const s = orch.stats();
    expect(s.failedTasks).toBe(1);
  });
});

describe('DEFAULT_DECOMPOSITION_RULES — sanity', () => {
  it('contains 3 default rules', () => {
    expect(DEFAULT_DECOMPOSITION_RULES.length).toBe(3);
  });

  it('rules cover code/research/design', () => {
    const matches = DEFAULT_DECOMPOSITION_RULES.map((r) =>
      Array.isArray(r.match) ? r.match.join(',') : r.match.source
    ).join('|');
    expect(matches).toContain('code');
    expect(matches).toContain('research');
    expect(matches).toContain('design');
  });
});
