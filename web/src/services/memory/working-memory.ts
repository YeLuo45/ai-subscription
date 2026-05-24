/**
 * L0 Working Memory - Current Session Context
 * Uses sessionStorage for ephemeral session data
 */

import type { WorkingMemory, Message } from './types';

const SESSION_KEY = 'ai_subscription_session';
const CONTEXT_WINDOW_LIMIT = 50;

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get current session from sessionStorage
 */
export function getSession(): WorkingMemory | null {
  try {
    const data = sessionStorage.getItem(SESSION_KEY);
    if (!data) return null;
    return JSON.parse(data) as WorkingMemory;
  } catch {
    return null;
  }
}

/**
 * Initialize a new session
 */
export function initSession(): WorkingMemory {
  const session: WorkingMemory = {
    sessionId: generateSessionId(),
    contextWindow: [],
    currentArticleId: null,
    currentFeedId: null,
    timestamp: Date.now(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/**
 * Save session to sessionStorage
 */
function saveSession(session: WorkingMemory): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Get or create session
 */
export function getOrCreateSession(): WorkingMemory {
  const existing = getSession();
  if (existing) return existing;
  return initSession();
}

/**
 * Add a message to the context window
 */
export function addMessage(content: string, role: 'user' | 'assistant'): Message {
  const session = getOrCreateSession();
  const message: Message = {
    id: generateMessageId(),
    role,
    content,
    timestamp: Date.now(),
  };
  
  session.contextWindow.push(message);
  
  // Keep only the last N messages
  if (session.contextWindow.length > CONTEXT_WINDOW_LIMIT) {
    session.contextWindow = session.contextWindow.slice(-CONTEXT_WINDOW_LIMIT);
  }
  
  saveSession(session);
  return message;
}

/**
 * Set current article being viewed
 */
export function setCurrentArticle(articleId: string, feedId: string): void {
  const session = getOrCreateSession();
  session.currentArticleId = articleId;
  session.currentFeedId = feedId;
  session.timestamp = Date.now();
  saveSession(session);
}

/**
 * Clear current article context
 */
export function clearCurrentArticle(): void {
  const session = getSession();
  if (!session) return;
  session.currentArticleId = null;
  session.currentFeedId = null;
  session.timestamp = Date.now();
  saveSession(session);
}

/**
 * Get context window for AI processing
 */
export function getContextWindow(): Message[] {
  const session = getSession();
  if (!session) return [];
  return session.contextWindow;
}

/**
 * Clear session data
 */
export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Export session for debugging
 */
export function exportSession(): string | null {
  const session = getSession();
  if (!session) return null;
  return JSON.stringify(session, null, 2);
}