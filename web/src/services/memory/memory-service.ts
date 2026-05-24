/**
 * Memory Service - Unified Interface for L0-L4 Memory System
 * Coordinates all five memory layers
 */

import * as workingMemory from './working-memory';
import * as recentMemory from './recent-memory';
import * as episodeMemory from './episode-memory';
import * as semanticMemory from './semantic-memory';
import * as proceduralMemory from './procedural-memory';
import type {
  IMemoryService,
  WorkingMemory,
  RecentMemoryItem,
  EpisodeMemoryItem,
  UserInterestVector,
  ProceduralMemoryItem,
} from './types';

export class MemoryService implements IMemoryService {
  // L0 Working Memory
  async initSession(): Promise<string> {
    const session = workingMemory.initSession();
    return session.sessionId;
  }

  getSession(): WorkingMemory | null {
    return workingMemory.getSession();
  }

  async addMessage(content: string, role: 'user' | 'assistant'): Promise<void> {
    workingMemory.addMessage(content, role);
  }

  async setCurrentArticle(articleId: string, feedId: string): Promise<void> {
    workingMemory.setCurrentArticle(articleId, feedId);
  }

  async clearSession(): Promise<void> {
    workingMemory.clearSession();
  }

  // L1 Recent Memory
  async getRecentReads(limit?: number): Promise<RecentMemoryItem[]> {
    return recentMemory.getRecentReads(limit);
  }

  async recordArticleRead(
    read: Omit<RecentMemoryItem, 'id' | 'readAt'>
  ): Promise<void> {
    const item = recentMemory.recordArticleRead(read);
    
    // Also update semantic memory for interest learning
    await semanticMemory.recordArticleReadForInterest(
      read.tags,
      '', // author not available in recent memory
      read.feedId,
      3 // default rating
    );
    
    // Dispatch event for cross-component notification
    this.dispatchEvent('article_read', { item });
  }

  async updateReadProgress(
    articleId: string,
    progress: number,
    duration: number
  ): Promise<void> {
    recentMemory.updateReadProgress(articleId, progress, duration);
  }

  // L2 Episode Memory
  async getEpisodes(limit?: number): Promise<EpisodeMemoryItem[]> {
    return episodeMemory.getEpisodes(limit);
  }

  async createEpisode(
    episode: Omit<EpisodeMemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt'>
  ): Promise<EpisodeMemoryItem> {
    const item = await episodeMemory.createEpisode(episode);
    
    // Update semantic memory with episode data
    await semanticMemory.recordArticleReadForInterest(
      episode.tags,
      episode.author,
      episode.feedId,
      episode.rating
    );
    
    // Dispatch event
    this.dispatchEvent('episode_created', { item });
    
    return item;
  }

  async updateEpisode(
    id: string,
    updates: Partial<EpisodeMemoryItem>
  ): Promise<void> {
    await episodeMemory.updateEpisode(id, updates);
  }

  async deleteEpisode(id: string): Promise<void> {
    await episodeMemory.deleteEpisode(id);
  }

  // L3 Semantic Memory
  async getInterestVector(): Promise<UserInterestVector> {
    return semanticMemory.getInterestVector();
  }

  async recordArticleReadForInterest(
    tags: string[],
    author: string,
    feedId: string,
    rating: number
  ): Promise<void> {
    await semanticMemory.recordArticleReadForInterest(tags, author, feedId, rating);
  }

  async applyDecay(weeksSinceUpdate: number): Promise<void> {
    await semanticMemory.applyDecay(weeksSinceUpdate);
  }

  // L4 Procedural Memory
  async getProceduralActions(action?: string): Promise<ProceduralMemoryItem[]> {
    return proceduralMemory.getProceduralActions(action);
  }

  async recordAction(action: string, context?: Record<string, any>): Promise<void> {
    await proceduralMemory.recordAction(action, context);
  }

  async getRecommendedActions(): Promise<ProceduralMemoryItem[]> {
    return proceduralMemory.getRecommendedActions();
  }

  // Cross-layer statistics
  async getMemoryStats(): Promise<{
    sessionMessages: number;
    recentReads: number;
    episodes: number;
    topTags: string[];
    topAuthors: string[];
    recentActions: string[];
  }> {
    // Get session info
    const session = this.getSession();
    const sessionMessages = session?.contextWindow.length ?? 0;
    
    // Get recent reads
    const recentReads = recentMemory.getRecentReads(20);
    
    // Get episodes
    const episodes = await episodeMemory.getEpisodes(100);
    
    // Get interest vector for top tags/authors
    const vector = await semanticMemory.getInterestVector();
    
    // Get action stats
    const actionStats = await proceduralMemory.getActionStats();
    
    // Sort and get top tags
    const topTags = Object.entries(vector.tagWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
    
    // Sort and get top authors
    const topAuthors = Object.entries(vector.authorAffinity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([author]) => author);
    
    return {
      sessionMessages,
      recentReads: recentReads.length,
      episodes: episodes.length,
      topTags,
      topAuthors,
      recentActions: actionStats.recentActions.slice(0, 5),
    };
  }

  // Helper to dispatch events
  private dispatchEvent(type: string, payload: any): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('memory-event', {
        detail: { type, payload, timestamp: Date.now() }
      }));
    }
  }
}

// Singleton instance
let memoryServiceInstance: MemoryService | null = null;

export function getMemoryService(): IMemoryService {
  if (!memoryServiceInstance) {
    memoryServiceInstance = new MemoryService();
  }
  return memoryServiceInstance;
}

// Export all types and utilities
export * from './types';
export { workingMemory, recentMemory, episodeMemory, semanticMemory, proceduralMemory };