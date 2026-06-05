/**
 * MessageBroker — message queue
 *
 * Inspired by: RabbitMQ / Redis Streams / SQS
 *
 * Topic-based message broker with:
 *   - publish(topic, message): append to topic
 *   - subscribe(topic, handler): consume messages (fanout per-subscriber)
 *   - acknowledge(id): confirm processed
 *   - reject(id): re-queue or send to DLQ
 *   - dead-letter queue for failed messages
 *   - visibility timeout (message locked while being processed)
 */

export interface BrokerMessage<T = unknown> {
  id: string;
  topic: string;
  payload: T;
  timestamp: number;
  attempts: number;
  correlationId?: string;
  headers?: Record<string, string>;
  visibleAt: number;
  acknowledged: boolean;
  rejected: boolean;
  /** Subscriber ID who received this copy */
  subscriptionId?: string;
}

export interface SubscriptionOptions {
  consumerGroup: string;
  name?: string;
}

interface SubscriberRecord {
  id: string;
  topic: string;
  handler: (m: BrokerMessage) => void | Promise<void>;
  consumerGroup: string;
}

export class MessageBroker {
  private dlq: Map<string, BrokerMessage[]> = new Map();
  private subscribers: Map<string, SubscriberRecord[]> = new Map();
  private subscriberQueues: Map<string, BrokerMessage[]> = new Map();
  private inflight: Set<string> = new Set(); // composite keys: ${subId}:${msgId}
  private defaultVisibilityMs: number;
  private maxAttempts: number;
  private counter: number = 0;

  constructor(options: { defaultVisibilityMs?: number; maxAttempts?: number } = {}) {
    this.defaultVisibilityMs = options.defaultVisibilityMs ?? 30_000;
    this.maxAttempts = options.maxAttempts ?? 3;
  }

  private nextId(): string {
    this.counter += 1;
    return `msg-${Date.now().toString(36)}-${this.counter}`;
  }

  /**
   * Publish a message to a topic. Fan-out: every subscriber gets a copy.
   * Returns the message ID (shared across copies).
   */
  publish<T = unknown>(topic: string, payload: T, options: { correlationId?: string; headers?: Record<string, string> } = {}): string {
    const id = this.nextId();
    const subs = this.subscribers.get(topic);
    if (!subs || subs.length === 0) {
      // No subscribers — drop the message
      return id;
    }
    for (const sub of subs) {
      const msg: BrokerMessage = {
        id,
        topic,
        payload,
        timestamp: Date.now(),
        attempts: 0,
        correlationId: options.correlationId,
        headers: options.headers,
        visibleAt: Date.now(),
        acknowledged: false,
        rejected: false,
        subscriptionId: sub.id,
      };
      const subQueue = this.subscriberQueues.get(sub.id);
      if (subQueue) subQueue.push(msg);
    }
    this.deliver(topic);
    return id;
  }

  /**
   * Subscribe to a topic.
   */
  subscribe(topic: string, handler: (m: BrokerMessage) => void | Promise<void>, options: SubscriptionOptions = { consumerGroup: 'default' }): string {
    const id = this.nextId();
    if (!this.subscribers.has(topic)) this.subscribers.set(topic, []);
    this.subscribers.get(topic)!.push({
      id,
      topic,
      handler,
      consumerGroup: options.consumerGroup,
    });
    this.subscriberQueues.set(id, []);
    return id;
  }

  /**
   * Unsubscribe from a topic.
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [, list] of this.subscribers) {
      const idx = list.findIndex((s) => s.id === subscriptionId);
      if (idx >= 0) {
        list.splice(idx, 1);
        this.subscriberQueues.delete(subscriptionId);
        return true;
      }
    }
    return false;
  }

  /**
   * Acknowledge a message (successfully processed).
   */
  acknowledge(messageId: string, subscriptionId?: string): boolean {
    for (const queue of this.subscriberQueues.values()) {
      const idx = queue.findIndex((m) => m.id === messageId && (subscriptionId === undefined || m.subscriptionId === subscriptionId));
      if (idx >= 0) {
        queue.splice(idx, 1);
        if (subscriptionId !== undefined) this.inflight.delete(`${subscriptionId}:${messageId}`);
        else this.clearInflightForMsg(messageId);
        return true;
      }
    }
    for (const list of this.dlq.values()) {
      const idx = list.findIndex((m) => m.id === messageId);
      if (idx >= 0) {
        list.splice(idx, 1);
        return true;
      }
    }
    return false;
  }

  private clearInflightForMsg(messageId: string): void {
    for (const key of Array.from(this.inflight)) {
      if (key.endsWith(`:${messageId}`)) this.inflight.delete(key);
    }
  }

  /**
   * Reject a message. If attempts < maxAttempts, re-queue. Otherwise DLQ.
   */
  reject(messageId: string, subscriptionId?: string, requeue: boolean = true): boolean {
    for (const queue of this.subscriberQueues.values()) {
      const idx = queue.findIndex((m) => m.id === messageId && (subscriptionId === undefined || m.subscriptionId === subscriptionId));
      if (idx >= 0) {
        const msg = queue[idx];
        msg.attempts += 1;
        msg.rejected = true;
        if (msg.subscriptionId) this.inflight.delete(`${msg.subscriptionId}:${messageId}`);
        if (requeue && msg.attempts < this.maxAttempts) {
          msg.rejected = false;
          msg.visibleAt = Date.now();
        } else {
          queue.splice(idx, 1);
          if (!this.dlq.has(msg.topic)) this.dlq.set(msg.topic, []);
          this.dlq.get(msg.topic)!.push(msg);
        }
        this.deliver(msg.topic);
        return true;
      }
    }
    return false;
  }

  /**
   * Re-queue messages that exceeded their visibility timeout.
   */
  reapExpired(): number {
    const now = Date.now();
    let count = 0;
    for (const queue of this.subscriberQueues.values()) {
      for (const msg of queue) {
        const inflightKey = msg.subscriptionId ? `${msg.subscriptionId}:${msg.id}` : msg.id;
        if (this.inflight.has(inflightKey) && msg.visibleAt <= now) {
          this.inflight.delete(inflightKey);
          msg.attempts += 1;
          if (msg.attempts >= this.maxAttempts) {
            const idx = queue.indexOf(msg);
            if (idx >= 0) queue.splice(idx, 1);
            if (!this.dlq.has(msg.topic)) this.dlq.set(msg.topic, []);
            this.dlq.get(msg.topic)!.push(msg);
          } else {
            msg.visibleAt = Date.now() + this.defaultVisibilityMs;
          }
          count += 1;
        }
      }
    }
    return count;
  }

  private deliver(topic: string): void {
    const subs = this.subscribers.get(topic);
    if (!subs) return;
    for (const sub of subs) {
      const queue = this.subscriberQueues.get(sub.id);
      if (!queue) continue;
      for (const msg of queue) {
        if (msg.acknowledged || msg.rejected) continue;
        if (msg.visibleAt > Date.now()) continue;
        const inflightKey = msg.subscriptionId ? `${msg.subscriptionId}:${msg.id}` : msg.id;
        if (this.inflight.has(inflightKey)) continue;
        this.inflight.add(inflightKey);
        msg.visibleAt = Date.now() + this.defaultVisibilityMs;
        try {
          Promise.resolve(sub.handler(msg)).catch(() => {});
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Get dead-letter messages for a topic.
   */
  getDLQ(topic: string): BrokerMessage[] {
    return [...(this.dlq.get(topic) ?? [])];
  }

  /**
   * Drain DLQ: re-publish all dead-lettered messages back to their subscribers.
   */
  drainDLQ(topic: string): number {
    const list = this.dlq.get(topic);
    if (!list || list.length === 0) return 0;
    let n = 0;
    for (const msg of list) {
      msg.attempts = 0;
      msg.rejected = false;
      msg.acknowledged = false;
      msg.visibleAt = Date.now();
      const subId = msg.subscriptionId;
      if (subId) {
        const queue = this.subscriberQueues.get(subId);
        if (queue) queue.push(msg);
      }
      n += 1;
    }
    list.length = 0;
    this.deliver(topic);
    return n;
  }

  /** Get all messages for a subscriber's queue. */
  peek(subscriptionId: string): BrokerMessage[] {
    return [...(this.subscriberQueues.get(subscriptionId) ?? [])];
  }

  /** Get inflight message count. */
  inflightCount(): number {
    return this.inflight.size;
  }

  /** Statistics. */
  stats(): { totalTopics: number; totalSubscribers: number; inflight: number; totalDLQ: number } {
    let totalDLQ = 0;
    for (const list of this.dlq.values()) totalDLQ += list.length;
    let totalSubscribers = 0;
    for (const list of this.subscribers.values()) totalSubscribers += list.length;
    return {
      totalTopics: this.subscribers.size,
      totalSubscribers,
      inflight: this.inflight.size,
      totalDLQ,
    };
  }
}
