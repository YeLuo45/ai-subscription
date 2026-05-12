import { parseIntent, parseIntentSimple } from './intent-parser';
import { executeOperation, formatOperationMessage } from './operations';
import type { Intent, IntentResult, ConversationMessage as TypesMessage, OperationResult } from './types';
import type { ConversationHistoryStorage, ConversationMessage } from '../../../shared/lib/ai/conversation-history/types';

export class ConversationManager {
  private sessionId: string;
  private storage: ConversationHistoryStorage;

  constructor(storage: ConversationHistoryStorage, sessionId?: string) {
    this.storage = storage;
    this.sessionId = sessionId || crypto.randomUUID();
  }

  async initSession(): Promise<ConversationSession | null> {
    let session = await this.storage.getSession(this.sessionId);
    if (!session) {
      session = await this.storage.createSession();
      this.sessionId = session.id;
    }
    return session;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  async processMessage(userMessage: string): Promise<{
    intentResult: IntentResult;
    operationResult?: OperationResult;
    finalResponse: string;
  }> {
    // Add user message
    await this.storage.addMessage(this.sessionId, {
      role: 'user',
      content: userMessage,
    });

    // Try AI-powered parsing first, fallback to simple regex
    let intentResult: IntentResult;
    try {
      intentResult = await parseIntent(userMessage);
    } catch {
      intentResult = parseIntentSimple(userMessage);
    }

    // If needs confirmation, return confirmation message
    if (intentResult.needsConfirmation && !userMessage.includes('确认')) {
      const response = intentResult.confirmationMessage || intentResult.response;
      await this.storage.addMessage(this.sessionId, {
        role: 'assistant',
        content: response,
      });
      return { intentResult, finalResponse: response };
    }

    // Execute operation
    const operationResult = await executeOperation(intentResult.intent, intentResult.entities);
    const finalResponse = formatOperationMessage(operationResult);

    await this.storage.addMessage(this.sessionId, {
      role: 'assistant',
      content: finalResponse,
    });

    return { intentResult, operationResult, finalResponse };
  }

  async loadHistory(): Promise<ConversationMessage[]> {
    return this.storage.getMessages(this.sessionId);
  }

  async clearHistory(): Promise<void> {
    await this.storage.clearMessages(this.sessionId);
  }

  async switchSession(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
  }
}

// Singleton instance
let managerInstance: ConversationManager | null = null;
let storageInstance: ConversationHistoryStorage | null = null;

export function initConversationStorage(storage: ConversationHistoryStorage): void {
  storageInstance = storage;
}

export function getConversationManager(): ConversationManager {
  if (!managerInstance || !storageInstance) {
    throw new Error('ConversationStorage not initialized. Call initConversationStorage first.');
  }
  if (!managerInstance) {
    managerInstance = new ConversationManager(storageInstance);
  }
  return managerInstance;
}

export function createConversationManager(storage: ConversationHistoryStorage, sessionId?: string): ConversationManager {
  return new ConversationManager(storage, sessionId);
}

// Re-export types for convenience
export type { ConversationMessage } from '../../../shared/lib/ai/conversation-history/types';
import type { ConversationSession } from '../../../shared/lib/ai/conversation-history/types';
export type { ConversationSession };
