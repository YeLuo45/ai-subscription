/**
 * TaskDecomposer.test.ts — Pure unit tests for task decomposition
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskDecomposer, DEFAULT_DECOMPOSITION_RULES, type SubTask } from '../TaskDecomposer';

describe('TaskDecomposer — rule management', () => {
  let td: TaskDecomposer;
  beforeEach(() => {
    td = new TaskDecomposer();
  });

  it('starts with zero rules', () => {
    expect(td.ruleCount()).toBe(0);
  });

  it('adds a rule', () => {
    td.addRule({ match: ['test'], strategy: 'parallel', decompose: () => [] });
    expect(td.ruleCount()).toBe(1);
  });

  it('listRules returns a copy', () => {
    td.addRule({ match: ['x'], strategy: 'parallel', decompose: () => [] });
    expect(td.listRules().length).toBe(1);
  });

  it('clearRules empties the list', () => {
    td.addRule({ match: ['x'], strategy: 'parallel', decompose: () => [] });
    td.clearRules();
    expect(td.ruleCount()).toBe(0);
  });
});

describe('TaskDecomposer — decompose', () => {
  it('returns null when no rule matches', () => {
    const td = new TaskDecomposer();
    expect(td.decompose('unrelated task xyz')).toBeNull();
  });

  it('matches keyword rule', () => {
    const td = new TaskDecomposer();
    for (const r of DEFAULT_DECOMPOSITION_RULES) td.addRule(r);
    const result = td.decompose('ship a new release');
    expect(result).not.toBeNull();
    expect(result!.subTasks.length).toBe(6);
  });

  it('matches regex rule', () => {
    const td = new TaskDecomposer();
    td.addRule({
      match: /^test_\d+/i,
      strategy: 'parallel',
      decompose: () => [{ title: 't', description: 'd', estimatedMinutes: 1, priority: 'low', tags: [] }],
    });
    const result = td.decompose('test_123 something');
    expect(result).not.toBeNull();
  });

  it('strategyOverride replaces rule strategy', () => {
    const td = new TaskDecomposer();
    for (const r of DEFAULT_DECOMPOSITION_RULES) td.addRule(r);
    const result = td.decompose('ship release', 'parallel');
    expect(result!.strategy).toBe('parallel');
  });

  it('sequential strategy chains all tasks', () => {
    const td = new TaskDecomposer();
    td.addRule({
      match: ['seq'],
      strategy: 'sequential',
      decompose: () => [
        { title: 'a', description: '1', estimatedMinutes: 1, priority: 'low', tags: [] },
        { title: 'b', description: '2', estimatedMinutes: 1, priority: 'low', tags: [] },
        { title: 'c', description: '3', estimatedMinutes: 1, priority: 'low', tags: [] },
      ],
    });
    const r = td.decompose('seq task')!;
    expect(r.subTasks[0].dependencies.length).toBe(0);
    expect(r.subTasks[1].dependencies.length).toBe(1);
    expect(r.subTasks[2].dependencies.length).toBe(1);
  });

  it('parallel strategy has no deps', () => {
    const td = new TaskDecomposer();
    td.addRule({
      match: ['par'],
      strategy: 'parallel',
      decompose: () => [
        { title: 'a', description: '1', estimatedMinutes: 1, priority: 'low', tags: [] },
        { title: 'b', description: '2', estimatedMinutes: 1, priority: 'low', tags: [] },
      ],
    });
    const r = td.decompose('par task')!;
    expect(r.subTasks[0].dependencies.length).toBe(0);
    expect(r.subTasks[1].dependencies.length).toBe(0);
  });
});

describe('TaskDecomposer — validateSubTasks', () => {
  it('detects missing dependency', () => {
    const td = new TaskDecomposer();
    const subTasks: SubTask[] = [
      { id: 'a', title: 'a', description: '', dependencies: ['nonexistent'], estimatedMinutes: 1, priority: 'low', tags: [] },
    ];
    const issues = td.validateSubTasks(subTasks);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain('missing dependency');
  });

  it('detects cycle', () => {
    const td = new TaskDecomposer();
    const subTasks: SubTask[] = [
      { id: 'a', title: 'a', description: '', dependencies: ['b'], estimatedMinutes: 1, priority: 'low', tags: [] },
      { id: 'b', title: 'b', description: '', dependencies: ['a'], estimatedMinutes: 1, priority: 'low', tags: [] },
    ];
    const issues = td.validateSubTasks(subTasks);
    expect(issues.some((i) => i.includes('cycle'))).toBe(true);
  });

  it('passes valid DAG', () => {
    const td = new TaskDecomposer();
    const subTasks: SubTask[] = [
      { id: 'a', title: 'a', description: '', dependencies: [], estimatedMinutes: 1, priority: 'low', tags: [] },
      { id: 'b', title: 'b', description: '', dependencies: ['a'], estimatedMinutes: 1, priority: 'low', tags: [] },
    ];
    const issues = td.validateSubTasks(subTasks);
    expect(issues).toEqual([]);
  });
});

describe('TaskDecomposer — executionBatches', () => {
  it('returns one batch for parallel tasks', () => {
    const td = new TaskDecomposer();
    const subTasks: SubTask[] = [
      { id: 'a', title: 'a', description: '', dependencies: [], estimatedMinutes: 1, priority: 'low', tags: [] },
      { id: 'b', title: 'b', description: '', dependencies: [], estimatedMinutes: 1, priority: 'low', tags: [] },
    ];
    const batches = td.computeExecutionBatches(subTasks);
    expect(batches.length).toBe(1);
    expect(batches[0].length).toBe(2);
  });

  it('returns multiple batches for sequential tasks', () => {
    const td = new TaskDecomposer();
    const subTasks: SubTask[] = [
      { id: 'a', title: 'a', description: '', dependencies: [], estimatedMinutes: 1, priority: 'low', tags: [] },
      { id: 'b', title: 'b', description: '', dependencies: ['a'], estimatedMinutes: 1, priority: 'low', tags: [] },
      { id: 'c', title: 'c', description: '', dependencies: ['b'], estimatedMinutes: 1, priority: 'low', tags: [] },
    ];
    const batches = td.computeExecutionBatches(subTasks);
    expect(batches.length).toBe(3);
  });

  it('groups parallel-by-level tasks in same batch', () => {
    const td = new TaskDecomposer();
    const subTasks: SubTask[] = [
      { id: 'a', title: 'a', description: '', dependencies: [], estimatedMinutes: 1, priority: 'low', tags: [] },
      { id: 'b', title: 'b', description: '', dependencies: [], estimatedMinutes: 1, priority: 'low', tags: [] },
      { id: 'c', title: 'c', description: '', dependencies: ['a', 'b'], estimatedMinutes: 1, priority: 'low', tags: [] },
    ];
    const batches = td.computeExecutionBatches(subTasks);
    expect(batches.length).toBe(2);
    expect(batches[0].length).toBe(2); // a, b
    expect(batches[1].length).toBe(1); // c
  });

  it('returns empty for empty input', () => {
    const td = new TaskDecomposer();
    expect(td.computeExecutionBatches([])).toEqual([]);
  });
});

describe('TaskDecomposer — critical path', () => {
  it('finds the longest path', () => {
    const td = new TaskDecomposer();
    const subTasks: SubTask[] = [
      { id: 'a', title: 'a', description: '', dependencies: [], estimatedMinutes: 1, priority: 'low', tags: [] },
      { id: 'b', title: 'b', description: '', dependencies: ['a'], estimatedMinutes: 5, priority: 'low', tags: [] },
      { id: 'c', title: 'c', description: '', dependencies: ['a'], estimatedMinutes: 1, priority: 'low', tags: [] },
    ];
    const path = td.findCriticalPath(subTasks);
    expect(path).toEqual(['a', 'b']);
  });

  it('returns single node for disconnected', () => {
    const td = new TaskDecomposer();
    const subTasks: SubTask[] = [
      { id: 'a', title: 'a', description: '', dependencies: [], estimatedMinutes: 1, priority: 'low', tags: [] },
    ];
    const path = td.findCriticalPath(subTasks);
    expect(path).toEqual(['a']);
  });

  it('returns empty for empty input', () => {
    const td = new TaskDecomposer();
    expect(td.findCriticalPath([])).toEqual([]);
  });
});

describe('TaskDecomposer — full decomposition result', () => {
  it('builds a complete result', () => {
    const td = new TaskDecomposer();
    for (const r of DEFAULT_DECOMPOSITION_RULES) td.addRule(r);
    const r = td.decompose('ship release v2.0')!;
    expect(r.parentDescription).toContain('ship');
    expect(r.subTasks.length).toBe(6);
    expect(r.totalEstimatedMinutes).toBeGreaterThan(0);
    expect(r.criticalPath.length).toBeGreaterThan(0);
    expect(r.criticalPathMinutes).toBeGreaterThan(0);
    expect(r.executionBatches.length).toBeGreaterThan(0);
    expect(r.validationIssues).toEqual([]);
  });
});

describe('DEFAULT_DECOMPOSITION_RULES — sanity', () => {
  it('contains 3 default rules', () => {
    expect(DEFAULT_DECOMPOSITION_RULES.length).toBe(3);
  });

  it('covers ship/feature/debug categories', () => {
    const r = DEFAULT_DECOMPOSITION_RULES;
    expect(r[0].match).toContain('ship');
    expect(r[1].match).toContain('feature');
    expect(r[2].match).toContain('debug');
  });
});
