/**
 * PipelineEngine.test.ts — Pure unit tests for pipeline executor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PipelineEngine } from '../PipelineEngine';

describe('PipelineEngine — basic execution', () => {
  let p: PipelineEngine;
  beforeEach(() => {
    p = new PipelineEngine('test');
  });

  it('runs a single transform stage', async () => {
    p.addStage({ name: 'double', type: 'transform', handler: (n: any) => n * 2 });
    const r = await p.run(5);
    expect(r.success).toBe(true);
    expect(r.finalOutput).toBe(10);
    expect(r.stages.length).toBe(1);
  });

  it('chains multiple stages', async () => {
    p.addStage({ name: 'double', type: 'transform', handler: (n: any) => n * 2 });
    p.addStage({ name: 'addOne', type: 'transform', handler: (n: any) => n + 1 });
    p.addStage({ name: 'square', type: 'transform', handler: (n: any) => n * n });
    const r = await p.run(3);
    expect(r.finalOutput).toBe(49); // 3*2=6, +1=7, *7=49
  });

  it('passes output of one stage to next', async () => {
    const calls: unknown[] = [];
    p.addStage({ name: 's1', type: 'transform', handler: (x: any) => { calls.push(x); return x + '!'; } });
    p.addStage({ name: 's2', type: 'transform', handler: (x: any) => { calls.push(x); return x.toUpperCase(); } });
    await p.run('hi');
    expect(calls).toEqual(['hi', 'hi!']);
  });

  it('records per-stage timing', async () => {
    p.addStage({ name: 'a', type: 'transform', handler: async () => {
      await new Promise((r) => setTimeout(r, 20));
      return 1;
    } });
    const r = await p.run(0);
    expect(r.stages[0].durationMs).toBeGreaterThanOrEqual(15);
  });
});

describe('PipelineEngine — filter stages', () => {
  it('drops value when filter returns null', async () => {
    const p = new PipelineEngine('p');
    p.addStage({ name: 'onlyPositive', type: 'filter', handler: (n: any) => n > 0 ? n : null });
    p.addStage({ name: 'double', type: 'transform', handler: (n: any) => n * 2 });
    const r = await p.run(-5);
    expect(r.finalOutput).toBeNull();
    expect(r.stages[0].skipped).toBe(true);
  });

  it('passes through when filter accepts', async () => {
    const p = new PipelineEngine('p');
    p.addStage({ name: 'onlyPositive', type: 'filter', handler: (n: any) => n > 0 ? n : null });
    p.addStage({ name: 'double', type: 'transform', handler: (n: any) => n * 2 });
    const r = await p.run(5);
    expect(r.finalOutput).toBe(10);
  });
});

describe('PipelineEngine — tee stages', () => {
  it('tee does not change value', async () => {
    const p = new PipelineEngine('p');
    let sideEffect = 0;
    p.addStage({ name: 'count', type: 'tee', handler: () => { sideEffect += 1; return 0; } });
    p.addStage({ name: 'inc', type: 'transform', handler: (n: any) => n + 1 });
    const r = await p.run(5);
    expect(r.finalOutput).toBe(6); // tee returned 0 but value 5 continues
    // Actually no — tee DOESN'T continue, it does its side effect and... let me check
    // My code: if stage.type !== 'tee', current = output;
    // For tee, current stays the input
    expect(sideEffect).toBe(1);
  });
});

describe('PipelineEngine — error handling', () => {
  it('stops on error by default', async () => {
    const p = new PipelineEngine('p');
    p.addStage({ name: 'fail', type: 'transform', handler: () => { throw new Error('boom'); } });
    p.addStage({ name: 'never', type: 'transform', handler: () => 99 });
    const r = await p.run(0);
    expect(r.success).toBe(false);
    expect(r.stages.length).toBe(1);
  });

  it('continueOnError allows pipeline to continue', async () => {
    const p = new PipelineEngine('p');
    p.addStage({ name: 'fail', type: 'transform', handler: () => { throw new Error('boom'); }, continueOnError: true });
    p.addStage({ name: 'ok', type: 'transform', handler: (n: any) => n + 1 });
    const r = await p.run(5);
    expect(r.success).toBe(false);
    expect(r.stages.length).toBe(2);
    expect(r.finalOutput).toBe(6);
  });

  it('records error message in stage result', async () => {
    const p = new PipelineEngine('p');
    p.addStage({ name: 'fail', type: 'transform', handler: () => { throw new Error('specific error'); } });
    const r = await p.run(0);
    expect(r.stages[0].error).toBe('specific error');
  });
});

describe('PipelineEngine — timeout', () => {
  it('times out on slow stage', async () => {
    const p = new PipelineEngine('p');
    p.addStage({
      name: 'slow',
      type: 'transform',
      handler: async () => {
        await new Promise((r) => setTimeout(r, 200));
        return 1;
      },
      timeoutMs: 50,
    });
    const r = await p.run(0);
    expect(r.success).toBe(false);
    expect(r.stages[0].error).toContain('timed out');
  });
});

describe('PipelineEngine — management', () => {
  it('counts stages', () => {
    const p = new PipelineEngine();
    p.addStage({ name: 'a', type: 'transform', handler: (x: any) => x });
    p.addStage({ name: 'b', type: 'transform', handler: (x: any) => x });
    expect(p.count()).toBe(2);
  });

  it('listStages returns names', () => {
    const p = new PipelineEngine();
    p.addStage({ name: 'first', type: 'transform', handler: (x: any) => x });
    p.addStage({ name: 'second', type: 'transform', handler: (x: any) => x });
    expect(p.listStages()).toEqual(['first', 'second']);
  });

  it('addStage is chainable', () => {
    const p = new PipelineEngine();
    const result = p.addStage({ name: 'a', type: 'transform', handler: (x: any) => x });
    expect(result).toBe(p);
  });

  it('clear removes all stages', () => {
    const p = new PipelineEngine();
    p.addStage({ name: 'a', type: 'transform', handler: (x: any) => x });
    p.clear();
    expect(p.count()).toBe(0);
  });

  it('getName returns pipeline name', () => {
    expect(new PipelineEngine('my-pipe').getName()).toBe('my-pipe');
  });
});

describe('PipelineEngine — async handlers', () => {
  it('supports async handler', async () => {
    const p = new PipelineEngine();
    p.addStage({ name: 'async', type: 'transform', handler: async (n: any) => {
      await new Promise((r) => setTimeout(r, 10));
      return n + 100;
    } });
    const r = await p.run(5);
    expect(r.finalOutput).toBe(105);
  });
});
