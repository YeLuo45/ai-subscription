import { parseIntent, parseIntentSimple } from './intent-parser';
import { executeOperation, formatOperationMessage } from './operations';
import { Intent, IntentResult, ConversationMessage, OperationResult } from './types';

export class ConversationManager {
  private messages: ConversationMessage[] = [];

  addMessage(role: 'user' | 'assistant', content: string) {
    this.messages.push({ role, content, timestamp: new Date() });
  }

  async processMessage(userMessage: string): Promise<{
    intentResult: IntentResult;
    operationResult?: OperationResult;
    finalResponse: string;
  }> {
    this.addMessage('user', userMessage);

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
      this.addMessage('assistant', response);
      return { intentResult, finalResponse: response };
    }

    // Execute operation
    const operationResult = await executeOperation(intentResult.intent, intentResult.entities);
    const finalResponse = formatOperationMessage(operationResult);

    this.addMessage('assistant', finalResponse);

    return { intentResult, operationResult, finalResponse };
  }

  getHistory(): ConversationMessage[] {
    return [...this.messages];
  }

  clear() {
    this.messages = [];
  }
}

// Singleton instance
let managerInstance: ConversationManager | null = null;

export function getConversationManager(): ConversationManager {
  if (!managerInstance) {
    managerInstance = new ConversationManager();
  }
  return managerInstance;
}
