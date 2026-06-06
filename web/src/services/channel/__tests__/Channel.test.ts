/**
 * Channel.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Channel } from '../Channel';

describe('Channel — basic', () => {
  it('buffered send/recv', async () => {
    const ch = new Channel<number>(3);
    await ch.send(1);
    await ch.send(2);
    expect(ch.length).toBe(2);
    expect(await ch.recv()).toBe(1);
    expect(await ch.recv()).toBe(2);
  });

  it('unbuffered direct handoff', async () => {
    const ch = new Channel<number>(0);
    const p = ch.recv();
    await ch.send(42);
    expect(await p).toBe(42);
  });
});

describe('Channel — trySend/tryRecv', () => {
  it('trySend returns false when full', () => {
    const ch = new Channel<number>(1);
    expect(ch.trySend(1)).toBe(true);
    expect(ch.trySend(2)).toBe(false);
  });

  it('tryRecv returns null when empty', () => {
    const ch = new Channel<number>(1);
    expect(ch.tryRecv()).toBe(null);
  });
});

describe('Channel — close', () => {
  it('closed channel throws on send', async () => {
    const ch = new Channel<number>(1);
    ch.close();
    await expect(ch.send(1)).rejects.toThrow('closed');
  });

  it('closed channel allows draining', async () => {
    const ch = new Channel<number>(2);
    await ch.send(1);
    await ch.send(2);
    ch.close();
    expect(await ch.recv()).toBe(1);
    expect(await ch.recv()).toBe(2);
  });
});

describe('Channel — queueing', () => {
  it('blocks sender when full', async () => {
    const ch = new Channel<number>(1);
    await ch.send(1);
    let sent = false;
    const p = ch.send(2).then(() => { sent = true; });
    await new Promise((r) => setTimeout(r, 10));
    expect(sent).toBe(false);
    expect(await ch.recv()).toBe(1);
    await p;
    expect(sent).toBe(true);
    expect(await ch.recv()).toBe(2);
  });
});
