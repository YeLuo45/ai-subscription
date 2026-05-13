/**
 * Message Bus for Multi-Agent Communication
 * Decouples agents via pub/sub message passing
 * Zero dependencies - pure TypeScript implementation
 */

import type {
  AgentMessage,
  AgentMessageType,
  AgentId,
  MessageBusOptions,
} from './types';

let messageIdCounter = 0;

function generateMessageId(): string {
  return `msg_${Date.now()}_${++messageIdCounter}`;
}

/**
 * Message handler function type
 */
export type MessageHandler<T = unknown> = (
  message: AgentMessage<T>
) => void | Promise<void>;

/**
 * In-memory message bus for agent communication
 * Implements publish-subscribe pattern with history
 */
export class MessageBus {
  private handlers: Map<AgentMessageType, Set<MessageHandler>> = new Map();
  private messageHistory: AgentMessage[] = [];
  private maxHistorySize: number;
  private enableLogging: boolean;

  constructor(options: MessageBusOptions = {}) {
    this.maxHistorySize = options.maxHistorySize ?? 100;
    this.enableLogging = options.enableLogging ?? false;
  }

  /**
   * Subscribe to a message type
   * @returns Unsubscribe function
   */
  subscribe<T = unknown>(
    type: AgentMessageType,
    handler: MessageHandler<T>
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as MessageHandler);

    if (this.enableLogging) {
      console.log(`[MessageBus] Subscribed to ${type}`);
    }

    return () => {
      this.handlers.get(type)?.delete(handler as MessageHandler);
      if (this.enableLogging) {
        console.log(`[MessageBus] Unsubscribed from ${type}`);
      }
    };
  }

  /**
   * Subscribe to multiple message types
   * @returns Unsubscribe function
   */
  subscribeMultiple(
    types: AgentMessageType[],
    handler: MessageHandler
  ): () => void {
    const unsubscribers = types.map(type => this.subscribe(type, handler));
    return () => unsubscribers.forEach(unsub => unsub());
  }

  /**
   * Publish a message to all subscribers
   */
  async publish<T = unknown>(
    type: AgentMessageType,
    source: AgentId,
    payload: T,
    correlationId?: string
  ): Promise<AgentMessage<T>> {
    const message: AgentMessage<T> = {
      id: generateMessageId(),
      type,
      source,
      payload,
      timestamp: Date.now(),
      correlationId,
    };

    if (this.enableLogging) {
      console.log(`[MessageBus] Publishing ${type} from ${source.id}`, payload);
    }

    // Store in history
    this.messageHistory.push(message as AgentMessage);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }

    // Notify handlers asynchronously
    const handlers = this.handlers.get(type);
    if (handlers) {
      await Promise.all(
        Array.from(handlers).map(handler =>
          Promise.resolve(handler(message as AgentMessage)).catch(err => {
            console.error(`[MessageBus] Handler error for ${type}:`, err);
          })
        )
      );
    }

    return message;
  }

  /**
   * Send a message to a specific agent (point-to-point)
   */
  async send<T = unknown>(
    type: AgentMessageType,
    source: AgentId,
    target: AgentId,
    payload: T,
    correlationId?: string
  ): Promise<AgentMessage<T>> {
    const message: AgentMessage<T> = {
      id: generateMessageId(),
      type,
      source,
      target,
      payload,
      timestamp: Date.now(),
      correlationId,
    };

    if (this.enableLogging) {
      console.log(`[MessageBus] Sending ${type} from ${source.id} to ${target.id}`);
    }

    // Store in history
    this.messageHistory.push(message as AgentMessage);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }

    // Find handlers for this message type
    const handlers = this.handlers.get(type);
    if (handlers) {
      await Promise.all(
        Array.from(handlers).map(handler =>
          Promise.resolve(handler(message as AgentMessage)).catch(err => {
            console.error(`[MessageBus] Handler error for ${type}:`, err);
          })
        )
      );
    }

    return message;
  }

  /**
   * Get message history, optionally filtered by type
   */
  getHistory(type?: AgentMessageType): AgentMessage[] {
    if (type) {
      return this.messageHistory.filter(m => m.type === type);
    }
    return [...this.messageHistory];
  }

  /**
   * Get messages by correlation ID (for tracing request chains)
   */
  getMessagesByCorrelationId(correlationId: string): AgentMessage[] {
    return this.messageHistory.filter(m => m.correlationId === correlationId);
  }

  /**
   * Get messages involving a specific agent
   */
  getMessagesForAgent(agentId: AgentId): AgentMessage[] {
    return this.messageHistory.filter(
      m => m.source.id === agentId.id || m.target?.id === agentId.id
    );
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
    if (this.enableLogging) {
      console.log('[MessageBus] History cleared');
    }
  }

  /**
   * Get handler count for a message type
   */
  getHandlerCount(type: AgentMessageType): number {
    return this.handlers.get(type)?.size ?? 0;
  }

  /**
   * Check if there are handlers for a message type
   */
  hasHandlers(type: AgentMessageType): boolean {
    return this.getHandlerCount(type) > 0;
  }
}

// Singleton instance
export const messageBus = new MessageBus();

/**
 * Create a new MessageBus instance (for isolated multi-agent environments)
 */
export function createMessageBus(options?: MessageBusOptions): MessageBus {
  return new MessageBus(options);
}
