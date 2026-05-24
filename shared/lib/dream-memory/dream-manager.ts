/**
 * Dream Manager - Memory management and context suggestions
 */

import type { DreamEntry, ArticleContext, SessionSummary } from './types';
import * as storage from './storage';
import { summarizeArticle, summarizeTitle } from './summarizer';

const DB_NAME = 'ai-subscription-dreams';
const STORE_NAME = 'dreams';

let instance: DreamManager | null = null;

export class DreamManager {
  private storage: typeof storage;
  private currentSessionId: string;
  private initialized: boolean = false;

  constructor() {
    this.storage = storage;
    this.currentSessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.storage.initStorage({
        dbName: DB_NAME,
        storeName: STORE_NAME,
        version: 1,
      });
      this.initialized = true;
    }
  }

  /**
   * Create a dream entry from article context
   */
  async createDreamFromArticle(article: ArticleContext): Promise<DreamEntry> {
    await this.initialize();

    // Generate summary using summarizer
    const summaryResult = article.content 
      ? summarizeArticle(article.title, article.content)
      : summarizeTitle(article.title);

    const entry: DreamEntry = {
      id: `dream_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      sessionId: this.currentSessionId,
      timestamp: Date.now(),
      title: article.title,
      summary: summaryResult.summary,
      keyPoints: summaryResult.keyPoints,
      sentiment: summaryResult.sentiment,
      articleUrl: article.url,
      feedTitle: article.feedTitle,
      tags: article.tags,
    };

    await this.storage.createDream(entry);
    return entry;
  }

  /**
   * Get recent dreams
   */
  async getRecentDreams(limit: number = 10): Promise<DreamEntry[]> {
    await this.initialize();
    return this.storage.getRecentDreams(limit);
  }

  /**
   * Get dreams by session
   */
  async getDreamBySession(sessionId: string): Promise<DreamEntry[]> {
    await this.initialize();
    return this.storage.getDreamsBySession(sessionId);
  }

  /**
   * Get context suggestions based on recent dreams
   */
  async getContextSuggestions(): Promise<string[]> {
    await this.initialize();
    
    const recentDreams = await this.storage.getRecentDreams(5);
    const suggestions: string[] = [];
    
    // Get unique feed titles from recent dreams
    const feedTitles = new Set<string>();
    for (const dream of recentDreams) {
      if (dream.feedTitle && !feedTitles.has(dream.feedTitle)) {
        feedTitles.add(dream.feedTitle);
        suggestions.push(`Continue reading: ${dream.title}`);
      }
    }
    
    // Add sentiment-based suggestions
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    for (const dream of recentDreams) {
      sentimentCounts[dream.sentiment]++;
    }
    
    if (sentimentCounts.positive > sentimentCounts.negative) {
      suggestions.unshift('Your recent reads have been positive! Keep exploring similar content.');
    } else if (sentimentCounts.negative > 1) {
      suggestions.unshift('Consider exploring lighter topics to balance your reading.');
    }
    
    // Add last article context
    if (recentDreams.length > 0) {
      const lastDream = recentDreams[0];
      suggestions.unshift(`Last viewed: ${lastDream.title}`);
    }
    
    return suggestions;
  }

  /**
   * Clear old dreams
   */
  async clearOldDreams(days: number = 30): Promise<void> {
    await this.initialize();
    const beforeTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;
    await this.storage.clearOldDreams(beforeTimestamp);
  }

  /**
   * Get session summary
   */
  async getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
    await this.initialize();
    const dreams = await this.storage.getDreamsBySession(sessionId);
    
    if (dreams.length === 0) return null;
    
    const sortedDreams = dreams.sort((a, b) => b.timestamp - a.timestamp);
    
    return {
      sessionId,
      startTime: dreams[0]?.timestamp || Date.now(),
      endTime: sortedDreams[0]?.timestamp,
      dreamCount: dreams.length,
      lastArticleTitle: sortedDreams[0]?.title,
    };
  }

  /**
   * Delete a dream
   */
  async deleteDream(id: string): Promise<void> {
    await this.initialize();
    await this.storage.deleteDream(id);
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string {
    return this.currentSessionId;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DreamManager {
    if (!instance) {
      instance = new DreamManager();
    }
    return instance;
  }
}