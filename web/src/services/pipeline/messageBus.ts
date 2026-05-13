/**
 * Message Bus for Agent Communication
 * Decouples agents via pub/sub message passing
 */

export type MessageType = 
  | 'extraction_result'
  | 'summary_result' 
  | 'tag_result'
  | 'translation_result'
  | 'critic_result'
  | 'error'
  | 'agent_status';

export interface Message<T = unknown> {
  id: string;
  type: MessageType;
  source: string;
  payload: T;
  timestamp: number;
}

export type MessageHandler<T = unknown> = (message: Message<T>) => void | Promise<void>;

let messageIdCounter = 0;

function generateMessageId(): string {
  return `msg_${Date.now()}_${++messageIdCounter}`;
}

/**
 * Simple in-memory message bus for agent communication
 */
export class MessageBus {
  private handlers: Map<MessageType, Set<MessageHandler>> = new Map();
  private messageHistory: Message[] = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to a message type
   */
  subscribe<T = unknown>(type: MessageType, handler: MessageHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as MessageHandler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(type)?.delete(handler as MessageHandler);
    };
  }

  /**
   * Publish a message to all subscribers
   */
  async publish<T = unknown>(type: MessageType, source: string, payload: T): Promise<Message<T>> {
    const message: Message<T> = {
      id: generateMessageId(),
      type,
      source,
      payload,
      timestamp: Date.now(),
    };

    // Store in history
    this.messageHistory.push(message as Message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }

    // Notify handlers
    const handlers = this.handlers.get(type);
    if (handlers) {
      await Promise.all(
        Array.from(handlers).map(handler => 
          Promise.resolve(handler(message as Message)).catch(() => {})
        )
      );
    }

    return message;
  }

  /**
   * Get message history for a specific type
   */
  getHistory(type?: MessageType): Message[] {
    if (type) {
      return this.messageHistory.filter(m => m.type === type);
    }
    return [...this.messageHistory];
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
  }
}

// Singleton instance
export const messageBus = new MessageBus();
