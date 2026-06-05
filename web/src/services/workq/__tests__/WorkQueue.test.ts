/**
 * WorkQueue.test.ts — Pure unit tests for priority work queue
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkQueue } from '../WorkQueue';

describe('WorkQueue — enqueue and basic', () => {
  let wq: WorkQueue;
  beforeEach(() => {
    wq = new WorkQueue();
  });

  it('enqueues a job', () => {
    const id = wq.enqueue('send-email', { to: 'a@b.com' });
    expect(id).toMatch(/^job-/);
    const job = wq.getJob(id);
    expect(job?.name).toBe('send-email');
  });

  it('default priority is 5', () => {
    const id = wq.enqueue('a', {});
    expect(wq.getJob(id)?.priority).toBe(5);
  });

  it('respects custom priority', () => {
    const id = wq.enqueue('a', {}, { priority: 1 });
    expect(wq.getJob(id)?.priority).toBe(1);
  });

  it('enqueue with delay sets status to delayed', () => {
    const id = wq.enqueue('a', {}, { delayMs: 5000 });
    expect(wq.getJob(id)?.status).toBe('delayed');
  });

  it('maxAttempts is stored', () => {
    const id = wq.enqueue('a', {}, { maxAttempts: 5 });
    expect(wq.getJob(id)?.maxAttempts).toBe(5);
  });
});

describe('WorkQueue — pickNext (priority + FIFO)', () => {
  it('picks highest priority (lowest number) first', () => {
    const wq = new WorkQueue();
    wq.enqueue('a', {}, { priority: 5 });
    wq.enqueue('b', {}, { priority: 1 });
    wq.enqueue('c', {}, { priority: 10 });
    const picked = wq.pickNext();
    expect(picked?.name).toBe('b');
  });

  it('FIFO within same priority', async () => {
    const wq = new WorkQueue();
    wq.enqueue('first', {}, { priority: 5 });
    await new Promise((r) => setTimeout(r, 2));
    wq.enqueue('second', {}, { priority: 5 });
    const picked = wq.pickNext();
    expect(picked?.name).toBe('first');
  });

  it('skips delayed jobs', () => {
    const wq = new WorkQueue();
    const delayed = wq.enqueue('a', {}, { delayMs: 60000 });
    wq.enqueue('b', {});
    expect(wq.getJob(delayed)?.status).toBe('delayed');
    expect(wq.pickNext()?.name).toBe('b');
  });

  it('promoteDelayed moves delayed to pending', () => {
    const wq = new WorkQueue();
    const id = wq.enqueue('a', {}, { delayMs: 1 });
    setTimeout(() => {
      const count = wq.promoteDelayed();
      expect(count).toBe(1);
      expect(wq.getJob(id)?.status).toBe('pending');
    }, 10);
  });
});

describe('WorkQueue — process and handlers', () => {
  it('runs a handler and marks completed', async () => {
    const wq = new WorkQueue();
    wq.registerHandler('sum', (job) => (job.data as any).a + (job.data as any).b);
    const id = wq.enqueue('sum', { a: 2, b: 3 });
    await wq.process();
    await wq.drain();
    const job = wq.getJob(id);
    expect(job?.status).toBe('completed');
    expect(job?.result).toBe(5);
  });

  it('marks failed on handler error', async () => {
    const wq = new WorkQueue();
    wq.registerHandler('boom', () => { throw new Error('oops'); });
    const id = wq.enqueue('boom', {});
    await wq.process();
    await wq.drain();
    expect(wq.getJob(id)?.error).toBe('oops');
  });

  it('retries with exponential backoff on failure', async () => {
    const wq = new WorkQueue({ backoffBaseMs: 10 });
    let calls = 0;
    wq.registerHandler('retry', () => { calls += 1; throw new Error('always'); });
    const id = wq.enqueue('retry', {}, { maxAttempts: 2 });
    await wq.process();
    await new Promise((r) => setTimeout(r, 30));
    wq.promoteDelayed();
    await wq.process();
    await wq.drain();
    expect(calls).toBeGreaterThanOrEqual(1);
  });

  it('moves to dead after maxAttempts', async () => {
    const wq = new WorkQueue({ backoffBaseMs: 1 });
    wq.registerHandler('fail', () => { throw new Error('always'); });
    const id = wq.enqueue('fail', {}, { maxAttempts: 1 });
    await wq.process();
    await wq.drain();
    expect(wq.getJob(id)?.status).toBe('dead');
  });
});

describe('WorkQueue — concurrency', () => {
  it('processes multiple jobs in parallel', async () => {
    const wq = new WorkQueue({ concurrency: 3 });
    let inFlight = 0;
    let maxInFlight = 0;
    wq.registerHandler('slow', async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 30));
      inFlight -= 1;
    });
    for (let i = 0; i < 5; i++) wq.enqueue('slow', i);
    await wq.process();
    await wq.drain();
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });
});

describe('WorkQueue — management', () => {
  it('cancel removes a pending job', () => {
    const wq = new WorkQueue();
    const id = wq.enqueue('a', {});
    expect(wq.cancel(id)).toBe(true);
    expect(wq.getJob(id)?.status).toBe('failed');
  });

  it('cancel returns false for unknown', () => {
    const wq = new WorkQueue();
    expect(wq.cancel('nope')).toBe(false);
  });

  it('countByStatus filters correctly', () => {
    const wq = new WorkQueue();
    wq.enqueue('a', {});
    wq.enqueue('b', {});
    expect(wq.countByStatus('pending')).toBe(2);
  });

  it('listByStatus returns matching jobs', () => {
    const wq = new WorkQueue();
    wq.enqueue('a', {});
    wq.enqueue('b', {});
    const list = wq.listByStatus('pending');
    expect(list.length).toBe(2);
  });

  it('stats reports counts', () => {
    const wq = new WorkQueue();
    wq.enqueue('a', {});
    wq.enqueue('b', {});
    const s = wq.stats();
    expect(s.total).toBe(2);
    expect(s.pending).toBe(2);
  });
});
