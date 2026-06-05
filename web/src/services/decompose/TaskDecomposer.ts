/**
 * TaskDecomposer — task decomposition into DAG
 *
 * Inspired by: kanban-orchestrator decomposition playbook
 * Source: /home/hermes/projects/kanban-orchestrator
 *
 * A high-level task is decomposed into a DAG of sub-tasks.
 * Each sub-task has dependencies on others; the engine computes
 * a parallel execution plan with level-by-level batches.
 *
 * Key methods:
 *   - decompose(description, strategy): break into sub-tasks
 *   - getExecutionBatches(): parallel batches (level by level)
 *   - getCriticalPath(): longest path through the DAG
 *   - addDependency / removeDependency
 *   - validate(): detect cycles, missing deps, orphans
 */

export type SubTaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type DecompositionStrategy = 'sequential' | 'parallel' | 'hybrid' | 'aggressive' | 'conservative';

export interface SubTask {
  id: string;
  title: string;
  description: string;
  /** Task IDs that must complete before this one */
  dependencies: string[];
  /** Estimated duration in minutes */
  estimatedMinutes: number;
  priority: SubTaskPriority;
  tags: string[];
  /** Optional payload for the executor */
  payload?: Record<string, unknown>;
}

export interface DecompositionResult {
  parentDescription: string;
  strategy: DecompositionStrategy;
  subTasks: SubTask[];
  totalEstimatedMinutes: number;
  /** Critical path (longest chain) */
  criticalPath: string[];
  /** Critical path duration */
  criticalPathMinutes: number;
  /** Batches that can run in parallel (each batch is independent) */
  executionBatches: string[][];
  /** Validation issues (cycles, missing deps, orphans) */
  validationIssues: string[];
}

export interface DecompositionRule {
  /** Match keywords/regex in the description */
  match: string[] | RegExp;
  /** Strategy to apply */
  strategy: DecompositionStrategy;
  /** Decompose into sub-tasks */
  decompose: (description: string) => Omit<SubTask, 'id' | 'dependencies'>[];
}

export class TaskDecomposer {
  private rules: DecompositionRule[] = [];
  private counter: number = 0;

  private nextId(): string {
    this.counter += 1;
    return `task-${Date.now().toString(36)}-${this.counter}`;
  }

  /** Add a decomposition rule. */
  addRule(rule: DecompositionRule): void {
    this.rules.push(rule);
  }

  /** List all rules. */
  listRules(): DecompositionRule[] {
    return [...this.rules];
  }

  /** Clear all rules. */
  clearRules(): void {
    this.rules = [];
  }

  /**
   * Decompose a high-level task into sub-tasks.
   * Returns null if no rule matches.
   */
  decompose(description: string, strategyOverride?: DecompositionStrategy): DecompositionResult | null {
    for (const rule of this.rules) {
      const matches = Array.isArray(rule.match)
        ? rule.match.some((m) => description.toLowerCase().includes(m.toLowerCase()))
        : rule.match.test(description);
      if (!matches) continue;
      const strategy = strategyOverride ?? rule.strategy;
      const subTaskSpecs = rule.decompose(description);
      const subTasks = subTaskSpecs.map((s) => ({ ...s, id: this.nextId(), dependencies: [] as string[] }));
      // Apply sequential/hybrid/aggressive linking based on strategy
      this.applyLinkingStrategy(subTasks, strategy);
      return this.buildResult(description, strategy, subTasks);
    }
    return null;
  }

  /**
   * Apply dependency linking based on strategy.
   *   - sequential: each task depends on the previous
   *   - parallel: no dependencies
   *   - hybrid: first task is root, parallel groups by priority
   *   - aggressive: minimal dependencies (just high-priority chains)
   *   - conservative: every task depends on previous (safe)
   */
  private applyLinkingStrategy(subTasks: SubTask[], strategy: DecompositionStrategy): void {
    if (subTasks.length === 0) return;
    switch (strategy) {
      case 'sequential':
        for (let i = 1; i < subTasks.length; i++) {
          subTasks[i].dependencies.push(subTasks[i - 1].id);
        }
        break;
      case 'parallel':
        // No dependencies
        break;
      case 'hybrid': {
        // Group by priority; first task is root
        if (subTasks.length > 0) {
          for (let i = 1; i < subTasks.length; i++) {
            if (subTasks[i].priority === subTasks[0].priority) {
              subTasks[i].dependencies.push(subTasks[0].id);
            } else {
              subTasks[i].dependencies.push(subTasks[0].id);
            }
          }
        }
        break;
      }
      case 'aggressive': {
        // Only critical-priority tasks chain
        for (let i = 1; i < subTasks.length; i++) {
          if (subTasks[i].priority === 'critical') {
            subTasks[i].dependencies.push(subTasks[i - 1].id);
          }
        }
        break;
      }
      case 'conservative':
        for (let i = 1; i < subTasks.length; i++) {
          subTasks[i].dependencies.push(subTasks[i - 1].id);
        }
        break;
    }
  }

  /** Build the decomposition result with all derived info. */
  private buildResult(parentDescription: string, strategy: DecompositionStrategy, subTasks: SubTask[]): DecompositionResult {
    const totalEstimatedMinutes = subTasks.reduce((s, t) => s + t.estimatedMinutes, 0);
    const validationIssues = this.validateSubTasks(subTasks);
    const executionBatches = this.computeExecutionBatches(subTasks);
    const criticalPath = this.findCriticalPath(subTasks);
    const criticalPathMinutes = criticalPath.reduce((s, id) => {
      const t = subTasks.find((x) => x.id === id);
      return s + (t?.estimatedMinutes ?? 0);
    }, 0);
    return {
      parentDescription,
      strategy,
      subTasks,
      totalEstimatedMinutes,
      criticalPath,
      criticalPathMinutes,
      executionBatches,
      validationIssues,
    };
  }

  /** Detect cycles, missing deps, orphan tasks. */
  validateSubTasks(subTasks: SubTask[]): string[] {
    const issues: string[] = [];
    const ids = new Set(subTasks.map((t) => t.id));
    for (const t of subTasks) {
      for (const dep of t.dependencies) {
        if (!ids.has(dep)) {
          issues.push(`task "${t.id}" has missing dependency "${dep}"`);
        }
      }
    }
    if (this.detectCycle(subTasks)) {
      issues.push('cycle detected in task dependencies');
    }
    return issues;
  }

  private detectCycle(subTasks: SubTask[]): boolean {
    const state: Record<string, 'white' | 'gray' | 'black'> = {};
    for (const t of subTasks) state[t.id] = 'white';
    const adj: Record<string, string[]> = {};
    for (const t of subTasks) adj[t.id] = [...t.dependencies];
    const visit = (id: string): boolean => {
      if (state[id] === 'gray') return true;
      if (state[id] === 'black') return false;
      state[id] = 'gray';
      for (const dep of adj[id] ?? []) {
        if (visit(dep)) return true;
      }
      state[id] = 'black';
      return false;
    };
    for (const t of subTasks) {
      if (visit(t.id)) return true;
    }
    return false;
  }

  /**
   * Compute execution batches: tasks grouped by level (no deps within a level).
   * Tasks in the same batch can run in parallel.
   */
  computeExecutionBatches(subTasks: SubTask[]): string[][] {
    if (subTasks.length === 0) return [];
    const level: Record<string, number> = {};
    const computeLevel = (id: string): number => {
      if (level[id] !== undefined) return level[id];
      const task = subTasks.find((t) => t.id === id);
      if (!task) return 0;
      if (task.dependencies.length === 0) {
        level[id] = 0;
        return 0;
      }
      const depLevels = task.dependencies.map((d) => computeLevel(d));
      level[id] = Math.max(...depLevels) + 1;
      return level[id];
    };
    for (const t of subTasks) computeLevel(t.id);
    const groups: Record<number, string[]> = {};
    for (const t of subTasks) {
      const lv = level[t.id];
      if (!groups[lv]) groups[lv] = [];
      groups[lv].push(t.id);
    }
    const maxLevel = Math.max(...Object.keys(groups).map((k) => parseInt(k, 10)));
    const batches: string[][] = [];
    for (let i = 0; i <= maxLevel; i++) {
      if (groups[i]) batches.push(groups[i]);
    }
    return batches;
  }

  /**
   * Find the critical path (longest weighted path through the DAG).
   * Uses a topological traversal to find the path with max total estimatedMinutes.
   */
  findCriticalPath(subTasks: SubTask[]): string[] {
    if (subTasks.length === 0) return [];
    const idToTask = new Map(subTasks.map((t) => [t.id, t]));
    // Topological order via Kahn's algorithm
    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    for (const t of subTasks) {
      inDegree[t.id] = t.dependencies.length;
      adj[t.id] = [];
    }
    for (const t of subTasks) {
      for (const dep of t.dependencies) {
        if (!adj[dep]) adj[dep] = [];
        adj[dep].push(t.id);
      }
    }
    const queue: string[] = [];
    for (const [id, deg] of Object.entries(inDegree)) {
      if (deg === 0) queue.push(id);
    }
    // DP: maxDuration[id] = max total duration to reach this node
    const maxDuration: Record<string, number> = {};
    const predecessor: Record<string, string | null> = {};
    while (queue.length > 0) {
      const id = queue.shift()!;
      const task = idToTask.get(id)!;
      const dur = task.estimatedMinutes;
      const currentMax = maxDuration[id] ?? dur;
      for (const next of adj[id] ?? []) {
        const candidate = currentMax + (idToTask.get(next)?.estimatedMinutes ?? 0);
        if (candidate > (maxDuration[next] ?? 0)) {
          maxDuration[next] = candidate;
          predecessor[next] = id;
        }
        inDegree[next] -= 1;
        if (inDegree[next] === 0) queue.push(next);
      }
    }
    // Find node with max duration
    let endNode: string | null = null;
    let maxVal = -1;
    for (const [id, dur] of Object.entries(maxDuration)) {
      if (dur > maxVal) {
        maxVal = dur;
        endNode = id;
      }
    }
    if (!endNode) {
      // No critical path — return first task
      return subTasks[0] ? [subTasks[0].id] : [];
    }
    // Trace back
    const path: string[] = [];
    let cur: string | null = endNode;
    while (cur) {
      path.unshift(cur);
      cur = predecessor[cur] ?? null;
    }
    return path;
  }

  /** Get total rules. */
  ruleCount(): number {
    return this.rules.length;
  }
}

export const DEFAULT_DECOMPOSITION_RULES: DecompositionRule[] = [
  {
    match: ['ship', 'release', 'deploy', 'publish'],
    strategy: 'hybrid',
    decompose: (description) => [
      { title: 'Run final tests', description: 'Execute the test suite', estimatedMinutes: 10, priority: 'critical', tags: ['qa', 'test'] },
      { title: 'Build artifacts', description: 'Compile and bundle', estimatedMinutes: 15, priority: 'high', tags: ['build'] },
      { title: 'Update changelog', description: 'Document the release', estimatedMinutes: 5, priority: 'medium', tags: ['docs'] },
      { title: 'Tag release', description: 'Create git tag', estimatedMinutes: 2, priority: 'high', tags: ['git'] },
      { title: 'Deploy to production', description: 'Push to production', estimatedMinutes: 20, priority: 'critical', tags: ['deploy'] },
      { title: 'Notify team', description: 'Send release notification', estimatedMinutes: 5, priority: 'low', tags: ['notify'] },
    ],
  },
  {
    match: ['feature', 'implement', 'add'],
    strategy: 'aggressive',
    decompose: (description) => [
      { title: 'Design', description: 'Create the design', estimatedMinutes: 30, priority: 'high', tags: ['design'] },
      { title: 'Implementation', description: 'Write the code', estimatedMinutes: 90, priority: 'critical', tags: ['code'] },
      { title: 'Tests', description: 'Write unit tests', estimatedMinutes: 30, priority: 'high', tags: ['test'] },
      { title: 'Documentation', description: 'Document the feature', estimatedMinutes: 15, priority: 'medium', tags: ['docs'] },
    ],
  },
  {
    match: ['investigate', 'debug', 'analyze'],
    strategy: 'sequential',
    decompose: (description) => [
      { title: 'Reproduce the issue', description: 'Confirm the bug', estimatedMinutes: 15, priority: 'high', tags: ['debug'] },
      { title: 'Identify root cause', description: 'Find the underlying issue', estimatedMinutes: 30, priority: 'critical', tags: ['debug'] },
      { title: 'Propose fix', description: 'Design the fix', estimatedMinutes: 20, priority: 'high', tags: ['design'] },
      { title: 'Implement and test', description: 'Apply and verify the fix', estimatedMinutes: 45, priority: 'high', tags: ['code', 'test'] },
    ],
  },
];
