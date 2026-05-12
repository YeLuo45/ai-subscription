// IndexedDB storage for conversation history

import type { ConversationHistoryStorage, ConversationSession, ConversationMessage } from './types';

const DB_NAME = 'ai-subscription-conversations';
const STORE_NAME = 'sessions';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

async function getDb(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

function generateTitle(firstMessage: string): string {
  const maxLength = 50;
  const truncated = firstMessage.length > maxLength
    ? firstMessage.substring(0, maxLength) + '...'
    : firstMessage;
  return truncated;
}

export class IndexedDBConversationHistoryStorage implements ConversationHistoryStorage {
  async createSession(title?: string): Promise<ConversationSession> {
    const database = await getDb();
    const now = Date.now();
    const session: ConversationSession = {
      id: crypto.randomUUID(),
      title: title || '新对话',
      messages: [],
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    };

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(session);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(session);
    });
  }

  async getSession(sessionId: string): Promise<ConversationSession | null> {
    const database = await getDb();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async listSessions(): Promise<ConversationSession[]> {
    const database = await getDb();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('updatedAt');
      const request = index.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        // Sort by updatedAt descending (newest first)
        const sessions = request.result as ConversationSession[];
        sessions.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(sessions);
      };
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    const database = await getDb();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async updateSession(sessionId: string, updates: Partial<ConversationSession>): Promise<void> {
    const database = await getDb();
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const updatedSession: ConversationSession = {
      ...session,
      ...updates,
      id: sessionId, // Ensure ID cannot be changed
    };

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(updatedSession);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async addMessage(
    sessionId: string,
    message: Omit<ConversationMessage, 'timestamp'>
  ): Promise<ConversationMessage> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const newMessage: ConversationMessage = {
      ...message,
      timestamp: Date.now(),
    };

    // Generate title from first user message if session is empty
    let title = session.title;
    if (session.messages.length === 0 && message.role === 'user') {
      title = generateTitle(message.content);
    }

    const updatedSession: ConversationSession = {
      ...session,
      messages: [...session.messages, newMessage],
      messageCount: session.messageCount + 1,
      updatedAt: Date.now(),
      title,
    };

    return new Promise((resolve, reject) => {
      const tx = db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(updatedSession);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(newMessage);
    });
  }

  async getMessages(sessionId: string): Promise<ConversationMessage[]> {
    const session = await this.getSession(sessionId);
    return session?.messages || [];
  }

  async clearMessages(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const updatedSession: ConversationSession = {
      ...session,
      messages: [],
      messageCount: 0,
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(updatedSession);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async searchSessions(query: string): Promise<ConversationSession[]> {
    const sessions = await this.listSessions();
    const lowerQuery = query.toLowerCase();

    return sessions.filter(session =>
      session.title.toLowerCase().includes(lowerQuery) ||
      session.messages.some(msg =>
        msg.content.toLowerCase().includes(lowerQuery)
      )
    );
  }
}

// Singleton instance
let storageInstance: IndexedDBConversationHistoryStorage | null = null;

export function getConversationHistoryStorage(): IndexedDBConversationHistoryStorage {
  if (!storageInstance) {
    storageInstance = new IndexedDBConversationHistoryStorage();
  }
  return storageInstance;
}
