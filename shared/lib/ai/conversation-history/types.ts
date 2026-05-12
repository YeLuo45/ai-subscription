// Types for conversation history storage

import type { Intent } from '../../../../web/src/services/conversation/types';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  intent?: Intent;
}

export interface ConversationSession {
  id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface ConversationHistoryStorage {
  // Session management
  createSession(title?: string): Promise<ConversationSession>;
  getSession(sessionId: string): Promise<ConversationSession | null>;
  listSessions(): Promise<ConversationSession[]>;
  deleteSession(sessionId: string): Promise<void>;
  updateSession(sessionId: string, updates: Partial<ConversationSession>): Promise<void>;

  // Message management
  addMessage(sessionId: string, message: Omit<ConversationMessage, 'timestamp'>): Promise<ConversationMessage>;
  getMessages(sessionId: string): Promise<ConversationMessage[]>;
  clearMessages(sessionId: string): Promise<void>;

  // Search
  searchSessions(query: string): Promise<ConversationSession[]>;
}
