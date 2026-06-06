/**
 * Stopwatch.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Stopwatch } from '../Stopwatch';

describe('Stopwatch — basic', () => {
  it('starts and stops', async () => {
    const sw = Stopwatch.startNew();
    await new Promise((r) => setTimeout(r, 50));
    sw.stop();
    expect(sw.elapsedMs()).toBeGreaterThanOrEqual(40);
  });

  it('not started', () => {
    const sw = new Stopwatch();
    expect(sw.elapsedMs()).toBe(0);
  });

  it('throws if stop without start', () => {
    const sw = new Stopwatch();
    expect(() => sw.stop()).toThrow();
  });
});

describe('Stopwatch — reset', () => {
  it('resets', () => {
    const sw = Stopwatch.startNew();
    sw.reset();
    expect(sw.elapsedMs()).toBe(0);
    expect(sw.isRunning).toBe(false);
  });
});

describe('Stopwatch — units', () => {
  it('elapsedSec', async () => {
    const sw = Stopwatch.startNew();
    await new Promise((r) => setTimeout(r, 100));
    sw.stop();
    expect(sw.elapsedSec()).toBeGreaterThanOrEqual(0.1);
  });

  it('elapsedNs is BigInt', () => {
    const sw = Stopwatch.startNew();
    sw.stop();
    expect(typeof sw.elapsedNs()).toBe('bigint');
  });
});

describe('Stopwatch — measure', () => {
  it('measures async function', async () => {
    const { result, elapsedMs } = await Stopwatch.measure(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return 'done';
    });
    expect(result).toBe('done');
    expect(elapsedMs).toBeGreaterThanOrEqual(15);
  });

  it('measures even on error', async () => {
    await expect(Stopwatch.measure(async () => {
      throw new Error('x');
    })).rejects.toThrow('x');
  });
});

describe('Stopwatch — startNew', () => {
  it('is running after startNew', () => {
    const sw = Stopwatch.startNew();
    expect(sw.isRunning).toBe(true);
  });
});
