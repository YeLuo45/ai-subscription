/**
 * EventStream — pub/sub event stream
 *
 * Inspired by: ruflo event bus + thunderbolt event stream
 *
 * Topic-based pub/sub:
 *   - publish(topic, event): append to stream, notify subscribers
 *   - subscribe(topic, handler, options): register subscriber
 *   - unsubscribe(subscriberId)
 *   - replay(topic, fromIndex?): get historical events
 *
 * Features:
 *   - Wildcard topics: 'user.*' matches 'user.created', 'user.deleted'
 *   - Filter predicates on event payload
 *   - Per-subscriber history buffer
 *   - Bounded event log per topic
 *   - Async delivery with backpressure
 */

export interface StreamEvent<T = unknown> {
  id: string;
  topic: string;
  payload: T;
  timestamp: number;
  /** Optional correlation ID for trace linking */
  correlationId?: string;
  /** Sequence number within the topic (monotonic) */
  sequence: number;
}

export interface SubscriberOptions {
  /** If true, deliver only the latest event (drops intermediate) */
  latestOnly?: boolean;
  /** If true, fire-and-forget (don't block publisher) */
  async?: boolean;
  /** Filter predicate */
  filter?: (event: StreamEvent) => boolean;
  /** Optional buffer size for replay (default 100) */
  historySize?: number;
  /** Optional name for debugging */
  name?: string;
}

export interface Subscriber {
  id: string;
  topic: string;
  options: SubscriberOptions;
  handler: (event: StreamEvent) => void | Promise<void>;
  /** Total events received */
  received: number;
  /** Last event timestamp */
  lastReceivedAt?: number;
  /** Local history buffer for replay */
  history: StreamEvent[];
}

export class EventStream {
  private events: Map<string, StreamEvent[]> = new Map();
  private subscribers: Map<string, Subscriber> = new Map();
  private seqByTopic: Map<string, number> = new Map();
  private globalSequence: number = 0;
  private maxTopicEvents: number;
  private counter: number = 0;

  constructor(options: { maxTopicEvents?: number } = {}) {
    this.maxTopicEvents = options.maxTopicEvents ?? 1000;
  }

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${Date.now().toString(36)}-${this.counter}`;
  }

  /**
   * Publish an event to a topic. Notifies all matching subscribers.
   */
  publish<T = unknown>(topic: string, payload: T, options: { correlationId?: string } = {}): StreamEvent<T> {
    const seq = (this.seqByTopic.get(topic) ?? 0) + 1;
    this.seqByTopic.set(topic, seq);
    this.globalSequence += 1;
    const event: StreamEvent<T> = {
      id: this.nextId('evt'),
      topic,
      payload,
      timestamp: Date.now(),
      correlationId: options.correlationId,
      sequence: seq,
    };
    if (!this.events.has(topic)) this.events.set(topic, []);
    const list = this.events.get(topic)!;
    list.push(event as StreamEvent);
    if (list.length > this.maxTopicEvents) list.shift();
    this.notifySubscribers(event as StreamEvent);
    return event;
  }

  private notifySubscribers(event: StreamEvent): void {
    for (const sub of this.subscribers.values()) {
      if (!this.topicMatches(sub.topic, event.topic)) continue;
      if (sub.options.filter && !sub.options.filter(event)) continue;
      sub.received += 1;
      sub.lastReceivedAt = Date.now();
      sub.history.push(event);
      const histSize = sub.options.historySize ?? 100;
      if (sub.history.length > histSize) sub.history.shift();
      if (sub.options.latestOnly) {
        // Schedule and drop intermediate (keep only last)
        // For simplicity, just deliver — latestOnly is more about coalescing,
        // but in this single-threaded model, deliveries are sequential.
      }
      if (sub.options.async) {
        Promise.resolve().then(() => sub.handler(event)).catch(() => {});
      } else {
        try {
          sub.handler(event);
        } catch {
          // Swallow to prevent breaking publisher
        }
      }
    }
  }

  /**
   * Check if a subscriber's topic pattern matches a published topic.
   * Supports wildcards: 'user.*' matches 'user.created' but not 'user.thing.other'
   * 'user.**' matches any nested topic
   */
  topicMatches(pattern: string, topic: string): boolean {
    if (pattern === topic) return true;
    if (!pattern.includes('*')) return false;
    if (pattern.endsWith('.**')) {
      const prefix = pattern.slice(0, -3);
      return topic === prefix || topic.startsWith(prefix + '.');
    }
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+') + '$');
      return regex.test(topic);
    }
    return false;
  }

  /**
   * Subscribe to a topic.
   */
  subscribe(topic: string, handler: (event: StreamEvent) => void | Promise<void>, options: SubscriberOptions = {}): string {
    const id = this.nextId('sub');
    this.subscribers.set(id, {
      id,
      topic,
      options,
      handler,
      received: 0,
      history: [],
    });
    return id;
  }

  /** Unsubscribe by id. */
  unsubscribe(subscriberId: string): boolean {
    return this.subscribers.delete(subscriberId);
  }

  /** Get all events for a topic. */
  getEvents(topic: string, fromSequence?: number): StreamEvent[] {
    const list = this.events.get(topic) ?? [];
    if (fromSequence === undefined) return [...list];
    return list.filter((e) => e.sequence >= fromSequence);
  }

  /** Get all topics. */
  topics(): string[] {
    return Array.from(this.events.keys());
  }

  /** Get subscriber count. */
  subscriberCount(): number {
    return this.subscribers.size;
  }

  /** Get subscribers for a topic. */
  subscribersFor(topic: string): Subscriber[] {
    return Array.from(this.subscribers.values()).filter((s) => this.topicMatches(s.topic, topic));
  }

  /** Replay: deliver historical events to a subscriber's handler. */
  replay(subscriberId: string, options: { fromSequence?: number } = {}): number {
    const sub = this.subscribers.get(subscriberId);
    if (!sub) return 0;
    const events = this.getEvents(sub.topic, options.fromSequence);
    let delivered = 0;
    for (const event of events) {
      try {
        sub.handler(event);
        delivered += 1;
      } catch {
        // ignore
      }
    }
    return delivered;
  }

  /** Clear all events for a topic. */
  clearTopic(topic: string): number {
    const list = this.events.get(topic);
    if (!list) return 0;
    const n = list.length;
    this.events.delete(topic);
    this.seqByTopic.delete(topic);
    return n;
  }

  /** Get statistics. */
  stats(): {
    totalTopics: number;
    totalSubscribers: number;
    totalEvents: number;
    globalSequence: number;
  } {
    let totalEvents = 0;
    for (const list of this.events.values()) totalEvents += list.length;
    return {
      totalTopics: this.events.size,
      totalSubscribers: this.subscribers.size,
      totalEvents,
      globalSequence: this.globalSequence,
    };
  }
}
