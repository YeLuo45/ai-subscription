/**
 * Deferred.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Deferred } from '../Deferred';

describe('Deferred — basic', () => {
  it('starts pending', () => {
    const d = new Deferred<number>();
    expect(d.state).toBe('pending');
  });

  it('resolve fulfills', async () => {
    const d = new Deferred<number>();
    d.resolve(42);
    expect(d.state).toBe('fulfilled');
    expect(await d.promise).toBe(42);
  });

  it('reject rejects', async () => {
    const d = new Deferred<number>();
    d.reject(new Error('x'));
    expect(d.state).toBe('rejected');
    await expect(d.promise).rejects.toThrow('x');
  });
});

describe('Deferred — state immutability', () => {
  it('cannot resolve twice', async () => {
    const d = new Deferred<number>();
    d.resolve(1);
    d.resolve(2);
    expect(await d.promise).toBe(1);
  });

  it('cannot reject after resolve', async () => {
    const d = new Deferred<number>();
    d.resolve(1);
    d.reject(new Error('x'));
    expect(await d.promise).toBe(1);
  });

  it('cannot resolve after reject', async () => {
    const d = new Deferred<number>();
    d.reject(new Error('x'));
    d.resolve(1);
    await expect(d.promise).rejects.toThrow('x');
  });
});

describe('Deferred — then/catch/finally', () => {
  it('then chain', async () => {
    const d = new Deferred<number>();
    const r = d.promise.then((n) => n * 2);
    d.resolve(5);
    expect(await r).toBe(10);
  });

  it('catch error', async () => {
    const d = new Deferred<number>();
    const r = d.promise.catch(() => 'caught');
    d.reject(new Error('x'));
    expect(await r).toBe('caught');
  });

  it('finally runs', async () => {
    const d = new Deferred<number>();
    let ran = false;
    const r = d.promise.finally(() => { ran = true; });
    d.resolve(1);
    await r;
    expect(ran).toBe(true);
  });
});

describe('Deferred — static factories', () => {
  it('Deferred.resolved', async () => {
    const d = Deferred.resolved(42);
    expect(d.state).toBe('fulfilled');
    expect(await d.promise).toBe(42);
  });

  it('Deferred.rejected', async () => {
    const d = Deferred.rejected<number>(new Error('x'));
    expect(d.state).toBe('rejected');
    await expect(d.promise).rejects.toThrow('x');
  });
});
