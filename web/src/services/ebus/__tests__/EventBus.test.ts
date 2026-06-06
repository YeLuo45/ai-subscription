/**
 * EventBus.test.ts — Pure unit tests
 */

import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../EventBus';

describe('EventBus — basic', () => {
  it('emits and receives', () => {
    const bus = new EventBus<{ ping: void }>();
    const h = vi.fn();
    bus.on('ping', h);
    bus.emit('ping', undefined);
    expect(h).toHaveBeenCalledTimes(1);
  });

  it('passes data', () => {
    const bus = new EventBus<{ msg: string }>();
    const h = vi.fn();
    bus.on('msg', h);
    bus.emit('msg', 'hello');
    expect(h).toHaveBeenCalledWith('hello');
  });

  it('returns count of fired handlers', () => {
    const bus = new EventBus<{ x: void }>();
    bus.on('x', () => {});
    bus.on('x', () => {});
    expect(bus.emit('x', undefined)).toBe(2);
  });
});

describe('EventBus — off', () => {
  it('removes listener', () => {
    const bus = new EventBus<{ x: void }>();
    const h = vi.fn();
    bus.on('x', h);
    bus.off('x', h);
    bus.emit('x', undefined);
    expect(h).not.toHaveBeenCalled();
  });
});

describe('EventBus — once', () => {
  it('fires only once', () => {
    const bus = new EventBus<{ x: void }>();
    const h = vi.fn();
    bus.once('x', h);
    bus.emit('x', undefined);
    bus.emit('x', undefined);
    expect(h).toHaveBeenCalledTimes(1);
  });
});

describe('EventBus — priority', () => {
  it('higher priority first', () => {
    const bus = new EventBus<{ x: void }>();
    const order: string[] = [];
    bus.on('x', () => { order.push('low'); }, 0);
    bus.on('x', () => { order.push('high'); }, 10);
    bus.on('x', () => { order.push('med'); }, 5);
    bus.emit('x', undefined);
    expect(order).toEqual(['high', 'med', 'low']);
  });
});

describe('EventBus — async', () => {
  it('awaits async handlers', async () => {
    const bus = new EventBus<{ x: void }>();
    let resolved = false;
    bus.on('x', async () => {
      await new Promise((r) => setTimeout(r, 10));
      resolved = true;
    });
    await bus.emitAsync('x', undefined);
    expect(resolved).toBe(true);
  });
});

describe('EventBus — utility', () => {
  it('listenerCount', () => {
    const bus = new EventBus<{ x: void }>();
    bus.on('x', () => {});
    bus.on('x', () => {});
    expect(bus.listenerCount('x')).toBe(2);
  });

  it('eventNames', () => {
    const bus = new EventBus<{ a: void; b: void }>();
    bus.on('a', () => {});
    bus.on('b', () => {});
    const names = bus.eventNames();
    expect(names).toContain('a');
    expect(names).toContain('b');
  });

  it('removeAllListeners for one event', () => {
    const bus = new EventBus<{ a: void; b: void }>();
    bus.on('a', () => {});
    bus.on('b', () => {});
    bus.removeAllListeners('a');
    expect(bus.listenerCount('a')).toBe(0);
    expect(bus.listenerCount('b')).toBe(1);
  });
});
