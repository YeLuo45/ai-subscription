/**
 * ChannelAdapter — IM/platform integration abstraction
 *
 * Inspired by: nanobot-design Channel Adapter
 * Source pattern: /home/hermes/projects/nanobot-design/docs-site/channels.md
 *
 * Abstract interface for sending messages to / receiving from external platforms
 * (Telegram, Slack, Webhook, Email, Push, WebSocket, etc.). The ChannelManager
 * discovers and routes messages to/from registered channels via a uniform
 * InboundMessage / OutboundMessage shape.
 *
 * 6 built-in channel types:
 *   - telegram: HTTP API to bot
 *   - slack: webhook URL with HMAC signature
 *   - webhook: generic HTTP POST
 *   - email: SMTP-like (simulated)
 *   - push: browser Push API
 *   - console: stdout (default for dev)
 *
 * ChannelAdapterRegistry tracks all registered adapters. Each adapter
 * implements send / receive / healthCheck.
 */

export type ChannelKind = 'telegram' | 'slack' | 'webhook' | 'email' | 'push' | 'console' | 'custom';

export interface InboundMessage {
  id: string;
  channel: ChannelKind;
  /** Sender identifier (user ID, email, etc.) */
  from: string;
  /** Channel-specific chat/conversation ID */
  chatId: string;
  /** Message text or payload */
  text: string;
  /** Optional structured data (e.g., command + args) */
  data?: Record<string, unknown>;
  timestamp: number;
  /** Optional correlation ID for trace linking */
  correlationId?: string;
}

export interface OutboundMessage {
  /** Target channel */
  channel: ChannelKind;
  /** Target chat/conversation ID */
  chatId: string;
  /** Message text or payload */
  text: string;
  /** Optional structured data */
  data?: Record<string, unknown>;
  /** Optional reply-to message ID */
  replyTo?: string;
  /** Optional attachments (URI list) */
  attachments?: string[];
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: number;
}

export interface ChannelConfig {
  kind: ChannelKind;
  /** Display name */
  name: string;
  /** Channel-specific config (bot token, webhook URL, etc.) */
  config: Record<string, unknown>;
  /** Whether this channel is enabled */
  enabled: boolean;
}

export interface ChannelAdapter {
  kind: ChannelKind;
  name: string;
  config: ChannelConfig;
  send(message: OutboundMessage): Promise<SendResult>;
  /** Simulated receive — returns a message if one is queued */
  receive(): Promise<InboundMessage | null>;
  /** Health check — verifies the channel is reachable */
  healthCheck(): Promise<{ healthy: boolean; reason?: string }>;
  /** Cleanup resources */
  close(): Promise<void>;
}

/** A simple queue-based adapter for testing. */
class QueueAdapter implements ChannelAdapter {
  public kind: ChannelKind;
  public name: string;
  public inboundQueue: InboundMessage[] = [];
  public outboundLog: OutboundMessage[] = [];
  public healthy: boolean = true;
  public closed: boolean = false;
  public config: ChannelConfig;

  constructor(config: ChannelConfig) {
    this.config = config;
    this.kind = config.kind;
    this.name = config.name;
  }

  async send(message: OutboundMessage): Promise<SendResult> {
    if (this.closed) return { success: false, error: 'channel closed', timestamp: Date.now() };
    this.outboundLog.push({ ...message });
    return { success: true, messageId: `msg-${Date.now().toString(36)}`, timestamp: Date.now() };
  }

  async receive(): Promise<InboundMessage | null> {
    return this.inboundQueue.shift() ?? null;
  }

  async healthCheck(): Promise<{ healthy: boolean; reason?: string }> {
    return { healthy: this.healthy && !this.closed, reason: this.closed ? 'closed' : undefined };
  }

  async close(): Promise<void> {
    this.closed = true;
  }

  /** Test helper: enqueue an inbound message. */
  enqueue(msg: Omit<InboundMessage, 'channel' | 'id' | 'timestamp'>): InboundMessage {
    const full: InboundMessage = {
      ...msg,
      id: `in-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      channel: this.config.kind,
      timestamp: Date.now(),
    };
    this.inboundQueue.push(full);
    return full;
  }
}

export class ChannelAdapterRegistry {
  private adapters: Map<string, ChannelAdapter> = new Map();
  private routes: Map<ChannelKind, string[]> = new Map();

  /** Register a channel adapter. */
  register(adapter: ChannelAdapter): void {
    if (this.adapters.has(adapter.name)) {
      throw new Error(`Channel adapter "${adapter.name}" already registered`);
    }
    this.adapters.set(adapter.name, adapter);
    if (!this.routes.has(adapter.kind)) this.routes.set(adapter.kind, []);
    this.routes.get(adapter.kind)!.push(adapter.name);
  }

  /** Unregister an adapter by name. */
  unregister(name: string): boolean {
    const adapter = this.adapters.get(name);
    if (!adapter) return false;
    adapter.close().catch(() => {});
    this.adapters.delete(name);
    const list = this.routes.get(adapter.kind);
    if (list) {
      this.routes.set(adapter.kind, list.filter((n) => n !== name));
    }
    return true;
  }

  /** Get an adapter by name. */
  get(name: string): ChannelAdapter | undefined {
    return this.adapters.get(name);
  }

  /** Get all adapter names for a given kind. */
  getByKind(kind: ChannelKind): ChannelAdapter[] {
    const names = this.routes.get(kind) ?? [];
    return names.map((n) => this.adapters.get(n)!).filter(Boolean);
  }

  /** List all registered adapters. */
  list(): ChannelAdapter[] {
    return Array.from(this.adapters.values());
  }

  /** Number of registered adapters. */
  size(): number {
    return this.adapters.size;
  }

  /**
   * Send a message via a named adapter.
   * Returns SendResult with success/error.
   */
  async send(adapterName: string, message: OutboundMessage): Promise<SendResult> {
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      return { success: false, error: `adapter "${adapterName}" not found`, timestamp: Date.now() };
    }
    if (!adapter.config.enabled) {
      return { success: false, error: `adapter "${adapterName}" is disabled`, timestamp: Date.now() };
    }
    return await adapter.send(message);
  }

  /**
   * Broadcast a message to all adapters of a given kind.
   * Returns array of SendResults (one per adapter).
   */
  async broadcast(kind: ChannelKind, message: Omit<OutboundMessage, 'channel'>): Promise<SendResult[]> {
    const adapters = this.getByKind(kind);
    return Promise.all(adapters.map((a) => a.send({ ...message, channel: kind })));
  }

  /**
   * Poll all registered adapters for inbound messages.
   * Returns array of received messages.
   */
  async pollInbound(): Promise<InboundMessage[]> {
    const results: InboundMessage[] = [];
    for (const adapter of this.adapters.values()) {
      let msg: InboundMessage | null;
      while ((msg = await adapter.receive()) !== null) {
        results.push(msg);
      }
    }
    return results;
  }

  /** Health check all adapters. */
  async healthCheckAll(): Promise<Record<string, { healthy: boolean; reason?: string }>> {
    const out: Record<string, { healthy: boolean; reason?: string }> = {};
    for (const [name, adapter] of this.adapters) {
      out[name] = await adapter.healthCheck();
    }
    return out;
  }

  /** Close all adapters. */
  async closeAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.close();
    }
  }
}

/**
 * Factory: create a channel adapter from a config.
 * The factory returns a QueueAdapter (test-friendly) by default; real adapters
 * would wrap HTTP clients etc.
 */
export function createChannelAdapter(config: ChannelConfig): ChannelAdapter {
  return new QueueAdapter(config);
}

/**
 * Pre-built channel configs for common channels.
 */
export const DEFAULT_CHANNELS: ChannelConfig[] = [
  { kind: 'telegram', name: 'telegram-bot', config: { botToken: 'PLACEHOLDER' }, enabled: false },
  { kind: 'slack', name: 'slack-webhook', config: { webhookUrl: 'PLACEHOLDER', secret: 'PLACEHOLDER' }, enabled: false },
  { kind: 'webhook', name: 'webhook-main', config: { url: 'https://example.com/webhook' }, enabled: false },
  { kind: 'email', name: 'email-smtp', config: { host: 'smtp.example.com', port: 587 }, enabled: false },
  { kind: 'push', name: 'web-push', config: { vapidKey: 'PLACEHOLDER' }, enabled: false },
  { kind: 'console', name: 'console-out', config: {}, enabled: true },
];
