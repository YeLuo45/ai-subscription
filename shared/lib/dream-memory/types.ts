/**
 * Dream Memory System Types
 * Cross-session persistent context and reading history summaries
 */

export interface DreamEntry {
  id: string;
  sessionId: string;
  timestamp: number;
  title: string;
  summary: string;        // Summary within 100 characters
  keyPoints: string[];    // Key points (max 5)
  sentiment: 'positive' | 'neutral' | 'negative';
  articleUrl: string;
  feedTitle?: string;
  tags?: string[];
}

export interface SessionSummary {
  sessionId: string;
  startTime: number;
  endTime?: number;
  dreamCount: number;
  lastArticleTitle?: string;
}

export interface ArticleContext {
  id: string;
  title: string;
  content: string;
  url: string;
  feedTitle?: string;
  tags?: string[];
}

export interface DreamStorageConfig {
  dbName?: string;
  storeName?: string;
  version?: number;
}