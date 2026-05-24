/**
 * Offline Search Index - Custom full-text search implementation
 * Provides FlexSearch-like capability with IndexedDB persistence
 * Uses inverted index for efficient full-text search
 */

export interface IndexedArticle {
  id: string;
  title: string;
  content: string;
  tags: string[];
  summary?: string;
  link?: string;
  author?: string;
  pubDate?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  score: number;
  matchedField: string;
}

interface IndexedDocument {
  id: string;
  title: string;
  content: string;
  tags: string;
  summary: string;
}

interface InvertedIndex {
  [token: string]: {
    docs: Map<string, number>; // docId -> frequency
    docCount: number;
  };
}

const DB_NAME = 'ai-subscription-offline-search';
const DB_VERSION = 1;
const STORE_NAME = 'search_index';

let dbInstance: IDBDatabase | null = null;

/**
 * Open IndexedDB for search index persistence
 */
function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Tokenize text into search tokens (lowercase, alphanumeric only)
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, ' ') // Keep CJK characters
    .split(/\s+/)
    .filter(token => token.length > 1);
}

/**
 * Calculate term frequency for scoring
 */
function calculateTF(token: string, text: string): number {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  const count = tokens.filter(t => t.includes(token)).length;
  return count / tokens.length;
}

/**
 * OfflineSearchIndex provides full-text search using inverted index
 * with IndexedDB persistence for offline capability
 */
export class OfflineSearchIndex {
  private documents: Map<string, IndexedDocument> = new Map();
  private invertedIndex: InvertedIndex = {};
  private isInitialized: boolean = false;

  constructor() {
    // Initialize empty index
  }

  /**
   * Initialize the index by loading persisted data from IndexedDB
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const allDocs = await promisifyRequest<IndexedDocument[]>(store.getAll());
      
      for (const doc of allDocs) {
        if (doc && doc.id) {
          this.documents.set(doc.id, doc);
          this.indexDocument(doc);
        }
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('[OfflineSearchIndex] Failed to initialize:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Add a document to the inverted index
   */
  private indexDocument(doc: IndexedDocument): void {
    const allText = [
      doc.title,
      doc.content,
      doc.tags,
      doc.summary,
    ].join(' ');

    const tokens = tokenize(allText);

    for (const token of tokens) {
      if (!this.invertedIndex[token]) {
        this.invertedIndex[token] = { docs: new Map(), docCount: 0 };
      }
      
      const index = this.invertedIndex[token];
      const currentFreq = index.docs.get(doc.id) || 0;
      index.docs.set(doc.id, currentFreq + 1);
      index.docCount++;
    }
  }

  /**
   * Remove a document from the inverted index
   */
  private unindexDocument(doc: IndexedDocument): void {
    const allText = [
      doc.title,
      doc.content,
      doc.tags,
      doc.summary,
    ].join(' ');

    const tokens = tokenize(allText);

    for (const token of tokens) {
      if (this.invertedIndex[token]) {
        this.invertedIndex[token].docs.delete(doc.id);
        this.invertedIndex[token].docCount--;
        
        if (this.invertedIndex[token].docCount <= 0) {
          delete this.invertedIndex[token];
        }
      }
    }
  }

  /**
   * Index a batch of articles
   */
  async indexArticles(articles: IndexedArticle[]): Promise<void> {
    await this.initialize();

    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    for (const article of articles) {
      const doc: IndexedDocument = {
        id: article.id,
        title: article.title,
        content: article.content,
        tags: article.tags?.join(',') || '',
        summary: article.summary || '',
      };

      // Remove existing if present
      const existing = this.documents.get(article.id);
      if (existing) {
        this.unindexDocument(existing);
      }

      this.documents.set(doc.id, doc);
      this.indexDocument(doc);

      // Persist to IndexedDB
      await promisifyRequest(store.put(doc));
    }
  }

  /**
   * Index a single article
   */
  async indexArticle(article: IndexedArticle): Promise<void> {
    return this.indexArticles([article]);
  }

  /**
   * Search the index
   * @param query Search query string
   * @param limit Maximum number of results (default: 20)
   * @returns Array of search results sorted by relevance
   */
  async search(query: string, limit = 20): Promise<SearchResult[]> {
    await this.initialize();

    if (!query.trim()) {
      return [];
    }

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) {
      return [];
    }

    // Calculate document scores based on term frequency and inverse document frequency
    const scores: Map<string, { score: number; matchedField: string }> = new Map();
    const totalDocs = this.documents.size;
    if (totalDocs === 0) return [];

    for (const token of queryTokens) {
      // Check if token exists in any document
      if (this.invertedIndex[token]) {
        const index = this.invertedIndex[token];
        
        // Calculate IDF (Inverse Document Frequency)
        const idf = Math.log(totalDocs / index.docCount);

        for (const [docId, freq] of Array.from(index.docs.entries())) {
          const tf = freq / Math.max(1, tokenize(this.documents.get(docId)?.title || '').length);
          const docScore = (1 + tf) * idf;

          const existing = scores.get(docId);
          if (existing) {
            existing.score += docScore;
          } else {
            scores.set(docId, { score: docScore, matchedField: 'content' });
          }
        }
      }
    }

    // Sort by score and build results
    const sortedResults = Array.from(scores.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit);

    return sortedResults.map(([docId, { score, matchedField }]) => {
      const doc = this.documents.get(docId);
      return {
        id: docId,
        title: doc?.title || '',
        excerpt: this.createExcerpt(doc?.content || '', query),
        score,
        matchedField,
      };
    });
  }

  /**
   * Remove an article from the index
   */
  async remove(articleId: string): Promise<void> {
    const existing = this.documents.get(articleId);
    if (existing) {
      this.unindexDocument(existing);
      this.documents.delete(articleId);
    }

    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await promisifyRequest(store.delete(articleId));
    } catch (error) {
      console.error('[OfflineSearchIndex] Failed to remove from IndexedDB:', error);
    }
  }

  /**
   * Clear the entire index
   */
  async clear(): Promise<void> {
    this.documents.clear();
    this.invertedIndex = {};

    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await promisifyRequest(store.clear());
    } catch (error) {
      console.error('[OfflineSearchIndex] Failed to clear IndexedDB:', error);
    }
  }

  /**
   * Get total number of indexed documents
   */
  async getDocumentCount(): Promise<number> {
    await this.initialize();
    return this.documents.size;
  }

  /**
   * Create a text excerpt around the matched query
   */
  private createExcerpt(text: string, query: string, contextLength = 50): string {
    if (!text) return '';
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const idx = lowerText.indexOf(lowerQuery);
    
    if (idx === -1) {
      return text.slice(0, 100);
    }

    const start = Math.max(0, idx - contextLength);
    const end = Math.min(text.length, idx + query.length + contextLength);
    let excerpt = text.slice(start, end);

    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';

    return excerpt;
  }
}

// Singleton instance
let searchIndexInstance: OfflineSearchIndex | null = null;

export function getSearchIndex(): OfflineSearchIndex {
  if (!searchIndexInstance) {
    searchIndexInstance = new OfflineSearchIndex();
  }
  return searchIndexInstance;
}