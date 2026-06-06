/**
 * EventBus — pub/sub event emitter
 *
 * Inspired by: EventEmitter / postal.js
 *
 * Synchronous event delivery with priority.
 * - on(event, handler, priority): subscribe
 * - off(event, handler): unsubscribe
 * - emit(event, ...args): fire event
 * - once(event, handler): one-time
 * - removeAllListeners(event)
 */

export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

interface HandlerEntry<T> {
  handler: EventHandler<T>;
  priority: number;
  once: boolean;
}

export class EventBus<EventMap extends Record<string, unknown> = Record<string, unknown>> {
  private listeners: Map<keyof EventMap, HandlerEntry<unknown>[]> = new Map();
  private asyncHandlers: Set<EventHandler<unknown>> = new Set();
  private maxListeners: number = 100;

  /**
   * Subscribe to an event.
   */
  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>, priority: number = 0): this {
    const list = this.listeners.get(event) ?? [];
    list.push({ handler: handler as EventHandler<unknown>, priority, once: false });
    list.sort((a, b) => b.priority - a.priority);
    this.listeners.set(event, list);
    return this;
  }

  /**
   * Subscribe to fire only once.
   */
  once<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): this {
    const list = this.listeners.get(event) ?? [];
    list.push({ handler: handler as EventHandler<unknown>, priority: 0, once: true });
    this.listeners.set(event, list);
    return this;
  }

  /**
   * Unsubscribe.
   */
  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): this {
    const list = this.listeners.get(event);
    if (!list) return this;
    this.listeners.set(
      event,
      list.filter((e) => e.handler !== handler),
    );
    return this;
  }

  /**
   * Emit event synchronously.
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): number {
    const list = this.listeners.get(event);
    if (!list) return 0;
    const toRemove: number[] = [];
    let fired = 0;
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      entry.handler(data);
      fired += 1;
      if (entry.once) toRemove.push(i);
    }
    // Remove once listeners
    for (let i = toRemove.length - 1; i >= 0; i--) {
      list.splice(toRemove[i], 1);
    }
    return fired;
  }

  /**
   * Emit event asynchronously (handlers return Promises).
   */
  async emitAsync<K extends keyof EventMap>(event: K, data: EventMap[K]): Promise<number> {
    const list = this.listeners.get(event);
    if (!list) return 0;
    const promises: Promise<void>[] = [];
    const toRemove: number[] = [];
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      const result = entry.handler(data);
      if (result instanceof Promise) {
        promises.push(result);
        if (this.asyncHandlers.has(entry.handler as EventHandler<unknown>)) {
          // wait
        }
      }
      if (entry.once) toRemove.push(i);
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      list.splice(toRemove[i], 1);
    }
    await Promise.all(promises);
    return list.length;
  }

  /**
   * Listener count.
   */
  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  /**
   * List all events.
   */
  eventNames(): (keyof EventMap)[] {
    return Array.from(this.listeners.keys()).filter((k) => (this.listeners.get(k)?.length ?? 0) > 0);
  }

  /**
   * Remove all listeners for an event (or all).
   */
  removeAllListeners<K extends keyof EventMap>(event?: K): this {
    if (event !== undefined) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }
}
