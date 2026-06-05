/**
 * PuppeteerOrchestrator — master agent that delegates to sub-agents
 *
 * Inspired by: chatdev-design Puppeteer pattern
 * Source: /home/hermes/projects/chatdev-design/docs-site/zh/puppeteer.md
 *
 * In chatdev, the "Puppeteer" is the master agent that:
 * 1. Receives high-level tasks
 * 2. Decomposes them into sub-tasks for specialized agents
 * 3. Routes sub-tasks to appropriate agents (role-based assignment)
 * 4. Aggregates results and synthesizes final output
 * 5. Maintains conversation history and shared state
 * 6. Handles role-specific prompts (CEO/CTO/Programmer/Reviewer/Tester)
 *
 * PuppeteerOrchestrator provides:
 * - Task queue with priority
 * - Agent registry (role-specialized)
 * - Decomposition: break complex task into N sub-tasks
 * - Dispatch: route to best-matching agent (capability match)
 * - Aggregation: collect results and synthesize
 * - Conversation: shared scratchpad
 */

export type AgentRole = 'ceo' | 'cto' | 'programmer' | 'reviewer' | 'tester' | 'designer' | 'researcher' | 'custom';

export type SubTaskStatus = 'pending' | 'assigned' | 'in-progress' | 'completed' | 'failed' | 'cancelled';

export interface SubTask {
  id: string;
  description: string;
  role: AgentRole;
  status: SubTaskStatus;
  /** Input data for the sub-task */
  input?: Record<string, unknown>;
  /** Output data from the sub-task */
  output?: Record<string, unknown>;
  /** Assigned agent ID */
  assignedTo?: string;
  /** Priority (lower = higher priority) */
  priority: number;
  /** Creation timestamp */
  createdAt: number;
  /** Completion timestamp */
  completedAt?: number;
  /** Error message if failed */
  error?: string;
  /** Number of retry attempts */
  attempts: number;
}

export interface Agent {
  id: string;
  role: AgentRole;
  name: string;
  /** Capabilities this agent has (used for matching) */
  capabilities: string[];
  /** Whether agent is available */
  available: boolean;
  /** Custom handler (optional — defaults to mock that returns the input echo) */
  handler?: (task: SubTask) => Promise<Record<string, unknown>>;
  /** Total tasks handled */
  tasksHandled: number;
}

export interface DecompositionRule {
  /** Match the task description for keywords */
  match: string[] | RegExp;
  /** If matched, produce sub-tasks with these roles */
  subTasks: Array<{ description: string; role: AgentRole; priority?: number }>;
}

export interface OrchestrationResult {
  parentId: string;
  subTasks: SubTask[];
  synthesized?: Record<string, unknown>;
  /** Total wall time in ms */
  durationMs: number;
  /** True if all sub-tasks completed */
  allCompleted: boolean;
}

export interface ConversationEntry {
  timestamp: number;
  role: AgentRole;
  agentId: string;
  text: string;
  meta?: Record<string, unknown>;
}

export class PuppeteerOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, SubTask> = new Map();
  private conversations: ConversationEntry[] = [];
  private decompositionRules: DecompositionRule[] = [];
  private counter: number = 0;

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${Date.now().toString(36)}-${this.counter}`;
  }

  /** Register an agent. */
  registerAgent(agent: Omit<Agent, 'id' | 'tasksHandled'>): string {
    const id = this.nextId('agent');
    this.agents.set(id, { ...agent, id, tasksHandled: 0 });
    return id;
  }

  /** Unregister an agent. */
  unregisterAgent(id: string): boolean {
    return this.agents.delete(id);
  }

  /** Get agent by ID. */
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /** List all agents. */
  listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /** List agents by role. */
  listByRole(role: AgentRole): Agent[] {
    return this.listAgents().filter((a) => a.role === role);
  }

  /** Get the first available agent for a given role. */
  findAgentForRole(role: AgentRole): Agent | undefined {
    return this.listAgents().find((a) => a.role === role && a.available);
  }

  /** Add a decomposition rule. */
  addDecompositionRule(rule: DecompositionRule): void {
    this.decompositionRules.push(rule);
  }

  /** Decompose a parent task into sub-tasks based on registered rules. */
  decompose(parentId: string, description: string, parentInput?: Record<string, unknown>): SubTask[] {
    const subTasks: SubTask[] = [];
    for (const rule of this.decompositionRules) {
      const matches = Array.isArray(rule.match)
        ? rule.match.some((m) => description.toLowerCase().includes(m.toLowerCase()))
        : rule.match.test(description);
      if (matches) {
        for (const st of rule.subTasks) {
          subTasks.push({
            id: this.nextId('sub'),
            description: st.description,
            role: st.role,
            status: 'pending',
            input: parentInput ? { ...parentInput } : undefined,
            priority: st.priority ?? 100,
            createdAt: Date.now(),
            attempts: 0,
          });
        }
      }
    }
    for (const t of subTasks) this.tasks.set(t.id, t);
    return subTasks;
  }

  /** Assign a sub-task to an available agent with matching role. */
  assign(subTaskId: string): boolean {
    const task = this.tasks.get(subTaskId);
    if (!task) return false;
    if (task.status !== 'pending' && task.status !== 'cancelled' && task.status !== 'failed') return false;
    const agent = this.findAgentForRole(task.role);
    if (!agent) return false;
    task.assignedTo = agent.id;
    task.status = 'assigned';
    return true;
  }

  /** Execute a sub-task via its assigned agent. */
  async execute(subTaskId: string): Promise<SubTask> {
    const task = this.tasks.get(subTaskId);
    if (!task) throw new Error(`Sub-task ${subTaskId} not found`);
    if (!task.assignedTo) throw new Error(`Sub-task ${subTaskId} not assigned`);
    const agent = this.agents.get(task.assignedTo);
    if (!agent) throw new Error(`Agent ${task.assignedTo} not found`);

    task.status = 'in-progress';
    task.attempts += 1;
    try {
      if (agent.handler) {
        task.output = await agent.handler(task);
      } else {
        // Default: echo the input with the role prefix
        task.output = { echo: task.input ?? null, role: agent.role, agentId: agent.id };
      }
      task.status = 'completed';
      task.completedAt = Date.now();
      agent.tasksHandled += 1;
      this.appendConversation({
        role: agent.role,
        agentId: agent.id,
        text: `[${task.id}] completed: ${task.description}`,
        meta: { taskId: task.id, output: task.output },
      });
    } catch (err) {
      task.status = 'failed';
      task.error = err instanceof Error ? err.message : String(err);
      this.appendConversation({
        role: agent.role,
        agentId: agent.id,
        text: `[${task.id}] failed: ${task.error}`,
        meta: { taskId: task.id },
      });
    }
    return task;
  }

  /** Assign + execute all sub-tasks for a parent (parallel where possible). */
  async run(parentId: string, description: string, parentInput?: Record<string, unknown>): Promise<OrchestrationResult> {
    const start = Date.now();
    const subTasks = this.decompose(parentId, description);
    // Set parent input on each sub-task
    for (const st of subTasks) st.input = { ...parentInput, parentId };

    // Assign all that can be assigned
    for (const st of subTasks) this.assign(st.id);

    // Execute all in parallel
    await Promise.all(subTasks.map((st) => this.execute(st.id)));

    const allCompleted = subTasks.length > 0 && subTasks.every((t) => t.status === 'completed');
    const synthesized = allCompleted
      ? this.synthesize(subTasks)
      : undefined;

    return {
      parentId,
      subTasks,
      synthesized,
      durationMs: Date.now() - start,
      allCompleted,
    };
  }

  /**
   * Synthesize results from sub-tasks into a unified output.
   * Default strategy: merge all outputs with role prefixes.
   */
  synthesize(subTasks: SubTask[]): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const t of subTasks) {
      if (t.output && t.assignedTo) {
        const agent = this.agents.get(t.assignedTo);
        const role = agent?.role ?? t.role;
        merged[`${role}:${t.id}`] = t.output;
      }
    }
    return merged;
  }

  /** Get a sub-task by ID. */
  getSubTask(id: string): SubTask | undefined {
    return this.tasks.get(id);
  }

  /** List all sub-tasks. */
  listSubTasks(filter?: { status?: SubTaskStatus; parentId?: string }): SubTask[] {
    let list = Array.from(this.tasks.values());
    if (filter?.status) list = list.filter((t) => t.status === filter.status);
    // Note: SubTask doesn't carry parentId; we just filter by status
    return list;
  }

  /** Append a conversation entry. */
  appendConversation(entry: Omit<ConversationEntry, 'timestamp'>): void {
    this.conversations.push({ ...entry, timestamp: Date.now() });
  }

  /** Get conversation log. */
  getConversationLog(limit?: number): ConversationEntry[] {
    if (limit === undefined) return [...this.conversations];
    return this.conversations.slice(-limit);
  }

  /** Clear conversation log. */
  clearConversationLog(): void {
    this.conversations = [];
  }

  /** Get statistics. */
  stats(): {
    totalAgents: number;
    totalTasks: number;
    pendingTasks: number;
    completedTasks: number;
    failedTasks: number;
    conversationEntries: number;
  } {
    const tasks = Array.from(this.tasks.values());
    return {
      totalAgents: this.agents.size,
      totalTasks: tasks.length,
      pendingTasks: tasks.filter((t) => t.status === 'pending').length,
      completedTasks: tasks.filter((t) => t.status === 'completed').length,
      failedTasks: tasks.filter((t) => t.status === 'failed').length,
      conversationEntries: this.conversations.length,
    };
  }
}

/** Pre-built decomposition rules for common scenarios. */
export const DEFAULT_DECOMPOSITION_RULES: DecompositionRule[] = [
  {
    match: ['code', 'implement', 'function', 'feature'],
    subTasks: [
      { description: 'Design the module structure', role: 'cto', priority: 10 },
      { description: 'Implement the code', role: 'programmer', priority: 50 },
      { description: 'Review the implementation', role: 'reviewer', priority: 80 },
      { description: 'Test the implementation', role: 'tester', priority: 100 },
    ],
  },
  {
    match: ['research', 'investigate', 'analyze'],
    subTasks: [
      { description: 'Gather background information', role: 'researcher', priority: 50 },
      { description: 'Synthesize findings', role: 'ceo', priority: 100 },
    ],
  },
  {
    match: ['design', 'mockup', 'wireframe'],
    subTasks: [
      { description: 'Create visual design', role: 'designer', priority: 50 },
      { description: 'Review the design', role: 'reviewer', priority: 100 },
    ],
  },
];
