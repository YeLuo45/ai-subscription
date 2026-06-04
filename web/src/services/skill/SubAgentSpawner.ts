/**
 * SubAgentSpawner — Dynamic subagent spawn with lifecycle management
 *
 * Inspired by: nanobot-design SubAgent spawn
 * Source pattern: /home/hermes/projects/nanobot-design/SPEC.md (agent/subagent.py)
 *
 * A SubAgent is a short-lived worker agent that loads a Skill from the
 * SkillRegistry, executes it, and is then despawned. Includes:
 *   - spawn() — pick a Skill matching task type, load it, return handle
 *   - execute() — run the skill with provided inputs
 *   - lifecycle states: created -> loading -> ready -> running -> completed/failed -> destroyed
 *   - active agent registry with TTL-based auto-cleanup
 *   - execution log with timing
 *
 * Pure logic, no actual LLM call — execute() delegates to a pluggable executor.
 */

import type { Skill, SkillRegistry } from './SkillRegistry';

export type SubAgentStatus =
  | 'created'
  | 'loading'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed'
  | 'destroyed';

export interface SubAgentOptions {
  /** Max lifetime in ms before auto-destroy (default 60000) */
  ttlMs?: number;
  /** Max concurrent agents (default 10) */
  maxConcurrent?: number;
  /** Tags to filter skills by */
  skillTags?: string[];
  /** Required category */
  skillCategory?: string;
}

export interface SubAgentHandle {
  id: string;
  skillName: string;
  skillVersion: string;
  status: SubAgentStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
}

export type SkillExecutor = (
  skill: Skill,
  inputs: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export interface SubAgentSpawnResult {
  handle: SubAgentHandle;
  agentId: string;
}

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_MAX_CONCURRENT = 10;
const AGENT_ID_PREFIX = 'agent';

export class SubAgentSpawner {
  private agents: Map<string, SubAgentHandle> = new Map();
  private ttlTimers: Map<string, NodeJS.Timeout> = new Map();
  private executionLog: SubAgentExecutionLog[] = [];
  private counter: number = 0;

  constructor(
    private readonly registry: SkillRegistry,
    private readonly options: SubAgentOptions = {},
    private readonly executor?: SkillExecutor,
  ) {}

  /** Generate a unique agent ID. */
  private nextAgentId(): string {
    this.counter += 1;
    return `${AGENT_ID_PREFIX}-${Date.now().toString(36)}-${this.counter}`;
  }

  /** Spawn a new subagent. Returns the handle (status: created). */
  spawn(skillName: string, inputs: Record<string, unknown> = {}): SubAgentSpawnResult {
    const max = this.options.maxConcurrent ?? DEFAULT_MAX_CONCURRENT;
    if (this.agents.size >= max) {
      throw new Error(
        `Max concurrent subagents reached (${max}); wait for active agents to complete`,
      );
    }

    const skill = this.registry.get(skillName);
    if (!skill) {
      throw new Error(`Skill "${skillName}" not found in registry`);
    }

    // Validate required inputs
    for (const inp of skill.inputs) {
      if (inp.required && !(inp.name in inputs)) {
        throw new Error(
          `Required input "${inp.name}" missing for skill "${skillName}"`,
        );
      }
    }

    const id = this.nextAgentId();
    const handle: SubAgentHandle = {
      id,
      skillName: skill.name,
      skillVersion: skill.version,
      status: 'created',
      createdAt: Date.now(),
      inputs: { ...inputs },
    };
    this.agents.set(id, handle);

    // Transition to loading -> ready
    handle.status = 'loading';
    handle.status = 'ready';

    // Set TTL auto-destroy
    const ttl = this.options.ttlMs ?? DEFAULT_TTL_MS;
    const timer = setTimeout(() => this.destroy(id, 'ttl-expired'), ttl);
    this.ttlTimers.set(id, timer);

    return { handle, agentId: id };
  }

  /** Spawn an agent and immediately execute it. */
  async spawnAndExecute(
    skillName: string,
    inputs: Record<string, unknown> = {},
  ): Promise<SubAgentHandle> {
    const { agentId } = this.spawn(skillName, inputs);
    return await this.execute(agentId);
  }

  /** Execute a spawned agent's skill. */
  async execute(agentId: string): Promise<SubAgentHandle> {
    const handle = this.agents.get(agentId);
    if (!handle) {
      throw new Error(`SubAgent "${agentId}" not found`);
    }
    if (handle.status === 'destroyed') {
      throw new Error(`SubAgent "${agentId}" is destroyed`);
    }
    if (handle.status === 'running') {
      throw new Error(`SubAgent "${agentId}" is already running`);
    }
    if (handle.status === 'completed' || handle.status === 'failed') {
      throw new Error(`SubAgent "${agentId}" already ${handle.status}`);
    }

    const skill = this.registry.getVersion(handle.skillName, handle.skillVersion);
    if (!skill) {
      handle.status = 'failed';
      handle.error = 'Skill not found at execution time';
      handle.completedAt = Date.now();
      return handle;
    }

    handle.status = 'running';
    handle.startedAt = Date.now();
    const startTime = handle.startedAt;

    try {
      if (this.executor) {
        const outputs = await this.executor(skill, handle.inputs || {});
        handle.outputs = outputs;
        handle.status = 'completed';
        // Track invocation in registry
        this.registry.recordInvocation(skill.name);
      } else {
        // No executor provided — mark as completed with echo output
        handle.outputs = { echo: handle.inputs, note: 'no executor provided' };
        handle.status = 'completed';
      }
    } catch (err) {
      handle.status = 'failed';
      handle.error = err instanceof Error ? err.message : String(err);
    } finally {
      handle.completedAt = Date.now();
      this.executionLog.push({
        agentId,
        skillName: handle.skillName,
        durationMs: handle.completedAt - startTime,
        status: handle.status,
        timestamp: startTime,
      });
    }

    return handle;
  }

  /** Get handle by id. */
  get(agentId: string): SubAgentHandle | undefined {
    const h = this.agents.get(agentId);
    return h ? { ...h } : undefined;
  }

  /** List all active (non-destroyed) agents. */
  listActive(): SubAgentHandle[] {
    return Array.from(this.agents.values())
      .filter((h) => h.status !== 'destroyed')
      .map((h) => ({ ...h }));
  }

  /** Count agents by status. */
  countByStatus(): Record<SubAgentStatus, number> {
    const out: Record<SubAgentStatus, number> = {
      created: 0,
      loading: 0,
      ready: 0,
      running: 0,
      completed: 0,
      failed: 0,
      destroyed: 0,
    };
    for (const h of this.agents.values()) {
      out[h.status] += 1;
    }
    return out;
  }

  /** Destroy an agent and free resources. */
  destroy(agentId: string, reason: string = 'manual'): boolean {
    const handle = this.agents.get(agentId);
    if (!handle) return false;
    if (handle.status === 'destroyed') return false;

    handle.status = 'destroyed';
    handle.completedAt = handle.completedAt ?? Date.now();
    handle.error = handle.error ?? reason;

    const timer = this.ttlTimers.get(agentId);
    if (timer) {
      clearTimeout(timer);
      this.ttlTimers.delete(agentId);
    }
    return true;
  }

  /** Destroy all agents. */
  destroyAll(reason: string = 'manual'): number {
    let count = 0;
    for (const id of Array.from(this.agents.keys())) {
      if (this.destroy(id, reason)) count += 1;
    }
    return count;
  }

  /** Get the most recent N execution log entries. */
  getExecutionLog(limit?: number): SubAgentExecutionLog[] {
    if (limit === undefined) return [...this.executionLog];
    return this.executionLog.slice(-limit);
  }

  /** Clear the execution log. */
  clearExecutionLog(): void {
    this.executionLog = [];
  }

  /** Total agents ever spawned. */
  totalSpawned(): number {
    return this.executionLog.length;
  }

  /** Active count (non-destroyed). */
  activeCount(): number {
    return this.listActive().length;
  }

  /** Wait for an agent to reach a terminal state. Polls since no real event system. */
  async waitFor(agentId: string, timeoutMs: number = 10_000): Promise<SubAgentHandle> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const h = this.agents.get(agentId);
      if (!h) throw new Error(`SubAgent "${agentId}" not found`);
      if (h.status === 'completed' || h.status === 'failed' || h.status === 'destroyed') {
        return { ...h };
      }
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error(`SubAgent "${agentId}" did not reach terminal state in ${timeoutMs}ms`);
  }
}

export interface SubAgentExecutionLog {
  agentId: string;
  skillName: string;
  durationMs: number;
  status: SubAgentStatus;
  timestamp: number;
}
