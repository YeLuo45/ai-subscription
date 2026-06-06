/**
 * JobScheduler.test.ts — Pure unit tests
 */

import { describe, it, expect, vi } from 'vitest';
import { JobScheduler } from '../JobScheduler';

describe('JobScheduler — interval', () => {
  it('runs periodically', async () => {
    const s = new JobScheduler();
    const fn = vi.fn();
    s.interval(fn, 20);
    await new Promise((r) => setTimeout(r, 75));
    s.cancelAll();
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('JobScheduler — timeout', () => {
  it('runs once', async () => {
    const s = new JobScheduler();
    const fn = vi.fn();
    s.timeout(fn, 20);
    await new Promise((r) => setTimeout(r, 30));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('JobScheduler — at', () => {
  it('schedules for future date', async () => {
    const s = new JobScheduler();
    const fn = vi.fn();
    s.at(fn, new Date(Date.now() + 30));
    await new Promise((r) => setTimeout(r, 50));
    expect(fn).toHaveBeenCalled();
  });
});

describe('JobScheduler — cancel', () => {
  it('cancels interval', async () => {
    const s = new JobScheduler();
    const fn = vi.fn();
    const id = s.interval(fn, 20);
    await new Promise((r) => setTimeout(r, 30));
    const ok = s.cancel(id);
    expect(ok).toBe(true);
    const count = fn.mock.calls.length;
    await new Promise((r) => setTimeout(r, 60));
    expect(fn.mock.calls.length).toBe(count); // no more calls
  });

  it('cancels returns false for unknown', () => {
    const s = new JobScheduler();
    expect(s.cancel('unknown')).toBe(false);
  });
});

describe('JobScheduler — cancelAll', () => {
  it('cancels all jobs', async () => {
    const s = new JobScheduler();
    s.interval(() => {}, 100);
    s.interval(() => {}, 100);
    expect(s.size).toBe(2);
    const n = s.cancelAll();
    expect(n).toBe(2);
    expect(s.size).toBe(0);
  });
});

describe('JobScheduler — utility', () => {
  it('getJobIds', () => {
    const s = new JobScheduler();
    s.timeout(() => {}, 1000);
    s.interval(() => {}, 1000);
    expect(s.getJobIds().length).toBe(2);
    s.cancelAll();
  });

  it('has(id)', () => {
    const s = new JobScheduler();
    const id = s.timeout(() => {}, 1000);
    expect(s.has(id)).toBe(true);
    s.cancel(id);
    expect(s.has(id)).toBe(false);
  });
});
