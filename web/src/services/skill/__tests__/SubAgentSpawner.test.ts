/**
 * SubAgentSpawner.test.ts — Pure unit tests for dynamic subagent spawning
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SubAgentSpawner, type SkillExecutor } from '../SubAgentSpawner';
import { SkillRegistry, DEFAULT_SKILLS } from '../SkillRegistry';

function makeRegistry(): SkillRegistry {
  const r = new SkillRegistry();
  r.registerAll(DEFAULT_SKILLS);
  return r;
}

describe('SubAgentSpawner — spawn lifecycle', () => {
  it('spawn returns handle in ready state', () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r);
    const { handle, agentId } = spawner.spawn('summarize-article', { content: 'long text' });
    expect(agentId).toMatch(/^agent-/);
    expect(handle.skillName).toBe('summarize-article');
    expect(handle.status).toBe('ready');
    expect(handle.inputs).toEqual({ content: 'long text' });
  });

  it('rejects unknown skill', () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r);
    expect(() => spawner.spawn('unknown-skill', {})).toThrow('not found');
  });

  it('rejects missing required inputs', () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r);
    expect(() => spawner.spawn('summarize-article', {})).toThrow('Required input "content" missing');
  });

  it('respects maxConcurrent', () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r, { maxConcurrent: 2 });
    spawner.spawn('summarize-article', { content: 'a' });
    spawner.spawn('extract-entities', { text: 'a' });
    expect(() => spawner.spawn('classify-content', { text: 'a', categories: ['t'] })).toThrow('Max concurrent');
  });

  it('default maxConcurrent is 10', () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r);
    for (let i = 0; i < 10; i++) {
      spawner.spawn('summarize-article', { content: `c${i}` });
    }
    expect(() => spawner.spawn('summarize-article', { content: 'overflow' })).toThrow('Max concurrent');
  });
});

describe('SubAgentSpawner — execute', () => {
  it('execute with custom executor returns outputs', async () => {
    const r = makeRegistry();
    const executor: SkillExecutor = async (skill, inputs) => {
      return { [skill.outputs[0].name]: `processed: ${(inputs.content as string) || ''}` };
    };
    const spawner = new SubAgentSpawner(r, {}, executor);
    const handle = await spawner.spawnAndExecute('summarize-article', { content: 'hello' });
    expect(handle.status).toBe('completed');
    expect(handle.outputs).toEqual({ summary: 'processed: hello' });
    expect(handle.startedAt).toBeDefined();
    expect(handle.completedAt).toBeDefined();
  });

  it('execute without executor echoes inputs', async () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r);
    const handle = await spawner.spawnAndExecute('summarize-article', { content: 'x' });
    expect(handle.status).toBe('completed');
    expect(handle.outputs?.note).toBe('no executor provided');
  });

  it('executor error marks handle failed', async () => {
    const r = makeRegistry();
    const executor: SkillExecutor = async () => {
      throw new Error('boom');
    };
    const spawner = new SubAgentSpawner(r, {}, executor);
    const handle = await spawner.spawnAndExecute('summarize-article', { content: 'x' });
    expect(handle.status).toBe('failed');
    expect(handle.error).toBe('boom');
  });

  it('records invocation in registry on success', async () => {
    const r = makeRegistry();
    const executor: SkillExecutor = async (skill) => ({ [skill.outputs[0].name]: 'ok' });
    const spawner = new SubAgentSpawner(r, {}, executor);
    await spawner.spawnAndExecute('summarize-article', { content: 'x' });
    expect(r.get('summarize-article')?.invocationCount).toBe(1);
  });

  it('does not increment invocation count on failure', async () => {
    const r = makeRegistry();
    const executor: SkillExecutor = async () => {
      throw new Error('fail');
    };
    const spawner = new SubAgentSpawner(r, {}, executor);
    await spawner.spawnAndExecute('summarize-article', { content: 'x' });
    expect(r.get('summarize-article')?.invocationCount).toBe(0);
  });

  it('execute twice on same agent throws', async () => {
    const r = makeRegistry();
    const executor: SkillExecutor = async (s) => ({ [s.outputs[0].name]: 'x' });
    const spawner = new SubAgentSpawner(r, {}, executor);
    const { agentId } = spawner.spawn('summarize-article', { content: 'x' });
    await spawner.execute(agentId);
    await expect(spawner.execute(agentId)).rejects.toThrow('already completed');
  });
});

describe('SubAgentSpawner — destroy and TTL', () => {
  it('destroy transitions to destroyed', () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r);
    const { agentId } = spawner.spawn('summarize-article', { content: 'x' });
    expect(spawner.destroy(agentId)).toBe(true);
    expect(spawner.get(agentId)?.status).toBe('destroyed');
  });

  it('destroy returns false for unknown agent', () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r);
    expect(spawner.destroy('nope')).toBe(false);
  });

  it('destroy returns false for already-destroyed', () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r);
    const { agentId } = spawner.spawn('summarize-article', { content: 'x' });
    spawner.destroy(agentId);
    expect(spawner.destroy(agentId)).toBe(false);
  });

  it('destroyAll destroys every agent', () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r, { maxConcurrent: 5 });
    spawner.spawn('summarize-article', { content: 'a' });
    spawner.spawn('summarize-article', { content: 'b' });
    spawner.spawn('extract-entities', { text: 'c' });
    expect(spawner.destroyAll()).toBe(3);
    expect(spawner.activeCount()).toBe(0);
  });

  it('TTL auto-destroys after expiry', async () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r, { ttlMs: 30 });
    const { agentId } = spawner.spawn('summarize-article', { content: 'x' });
    await new Promise((r) => setTimeout(r, 60));
    expect(spawner.get(agentId)?.status).toBe('destroyed');
  });
});

describe('SubAgentSpawner — queries', () => {
  it('listActive excludes destroyed', () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r);
    const { agentId } = spawner.spawn('summarize-article', { content: 'x' });
    spawner.spawn('extract-entities', { text: 'y' });
    spawner.destroy(agentId);
    const active = spawner.listActive();
    expect(active.length).toBe(1);
    expect(active[0].skillName).toBe('extract-entities');
  });

  it('countByStatus returns counts', () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r);
    spawner.spawn('summarize-article', { content: 'a' });
    spawner.spawn('summarize-article', { content: 'b' });
    const counts = spawner.countByStatus();
    expect(counts.ready).toBe(2);
    expect(counts.running).toBe(0);
    expect(counts.completed).toBe(0);
  });

  it('get returns clone of handle', () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r);
    const { agentId } = spawner.spawn('summarize-article', { content: 'x' });
    const h1 = spawner.get(agentId);
    h1!.status = 'destroyed';
    expect(spawner.get(agentId)?.status).toBe('ready');
  });

  it('get returns undefined for unknown', () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r);
    expect(spawner.get('nope')).toBeUndefined();
  });

  it('activeCount returns non-destroyed count', () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r);
    const { agentId } = spawner.spawn('summarize-article', { content: 'a' });
    spawner.spawn('extract-entities', { text: 'b' });
    spawner.destroy(agentId);
    expect(spawner.activeCount()).toBe(1);
  });
});

describe('SubAgentSpawner — execution log', () => {
  it('logs every execution with timing', async () => {
    const r = makeRegistry();
    const executor: SkillExecutor = async (s) => ({ [s.outputs[0].name]: 'x' });
    const spawner = new SubAgentSpawner(r, {}, executor);
    await spawner.spawnAndExecute('summarize-article', { content: 'a' });
    await spawner.spawnAndExecute('extract-entities', { text: 'b' });
    const log = spawner.getExecutionLog();
    expect(log.length).toBe(2);
    expect(log[0].skillName).toBe('summarize-article');
    expect(log[0].status).toBe('completed');
    expect(log[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('clearExecutionLog resets log', async () => {
    const r = makeRegistry();
    const executor: SkillExecutor = async (s) => ({ [s.outputs[0].name]: 'x' });
    const spawner = new SubAgentSpawner(r, {}, executor);
    await spawner.spawnAndExecute('summarize-article', { content: 'a' });
    spawner.clearExecutionLog();
    expect(spawner.getExecutionLog()).toEqual([]);
  });

  it('getExecutionLog limit returns last N', async () => {
    const r = makeRegistry();
    const executor: SkillExecutor = async (s) => ({ [s.outputs[0].name]: 'x' });
    const spawner = new SubAgentSpawner(r, {}, executor);
    for (let i = 0; i < 5; i++) {
      await spawner.spawnAndExecute('summarize-article', { content: `c${i}` });
    }
    expect(spawner.getExecutionLog(2).length).toBe(2);
  });

  it('totalSpawned increments with each execution', async () => {
    const r = makeRegistry();
    const executor: SkillExecutor = async (s) => ({ [s.outputs[0].name]: 'x' });
    const spawner = new SubAgentSpawner(r, {}, executor);
    await spawner.spawnAndExecute('summarize-article', { content: 'a' });
    await spawner.spawnAndExecute('summarize-article', { content: 'b' });
    expect(spawner.totalSpawned()).toBe(2);
  });
});

describe('SubAgentSpawner — waitFor', () => {
  it('resolves when agent reaches completed', async () => {
    const r = makeRegistry();
    const executor: SkillExecutor = async (s) => ({ [s.outputs[0].name]: 'x' });
    const spawner = new SubAgentSpawner(r, {}, executor);
    const { agentId } = spawner.spawn('summarize-article', { content: 'a' });
    spawner.execute(agentId); // not awaited
    const final = await spawner.waitFor(agentId, 1000);
    expect(final.status).toBe('completed');
  });

  it('throws on timeout', async () => {
    const r = makeRegistry();
    const executor: SkillExecutor = async () => {
      await new Promise((res) => setTimeout(res, 200));
      return {};
    };
    const spawner = new SubAgentSpawner(r, {}, executor);
    const { agentId } = spawner.spawn('summarize-article', { content: 'a' });
    spawner.execute(agentId);
    await expect(spawner.waitFor(agentId, 50)).rejects.toThrow('did not reach terminal state');
  });

  it('throws for unknown agent', async () => {
    const r = makeRegistry();
    const spawner = new SubAgentSpawner(r);
    await expect(spawner.waitFor('unknown', 100)).rejects.toThrow('not found');
  });
});
