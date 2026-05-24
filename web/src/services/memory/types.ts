/**
 * L0-L4 Memory System Types
 * Five-layer memory architecture for AI subscription
 */

// L0: Working Memory - current session context
export interface WorkingMemory {
  sessionId: string;
  contextWindow: Message[];
  currentArticleId: string | null;
  currentFeedId: string | null;
  timestamp: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// L1: Recent Memory - last 20 reading records
export interface RecentMemoryItem {
  id: string;
  articleId: string;
  articleTitle: string;
  feedId: string;
  feedTitle: string;
  tags: string[];
  readAt: number;
  readDuration: number; // seconds
  progress: number; // 0-1
}

// L2: Episode Memory - article reading episodes (summary + rating)
export interface EpisodeMemoryItem {
  id: string;
  articleId: string;
  articleTitle: string;
  summary: string;
  rating: number; // 1-5
  keyQuotes: string[];
  personalNotes: string;
  tags: string[];
  feedId: string;
  feedTitle: string;
  author: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number; // 30 days from creation
}

// L3: Semantic Memory - user interest vectors
export interface UserInterestVector {
  id: string;
  tagWeights: Record<string, number>;     // tag -> weight (0-1)
  topicWeights: Record<string, number>;   // topic -> weight
  authorAffinity: Record<string, number>; // author -> affinity (0-1)
  sourceWeights: Record<string, number>;  // feedId -> weight
  totalReads: number;
  lastUpdate: string;
}

// L4: Procedural Memory - subscription operation habits
export interface ProceduralMemoryItem {
  id: string;
  action: string;
  frequency: number;
  lastUsed: number;
  context: Record<string, any>;
  workflow: string[];
}

// Memory event types for cross-component notification
export interface MemoryEvent {
  type: 'article_read' | 'episode_created' | 'interest_updated' | 'action_recorded';
  payload: any;
  timestamp: number;
}

// Memory service interface
export interface IMemoryService {
  // L0 Working Memory
  initSession(): Promise<string>;
  getSession(): WorkingMemory | null;
  addMessage(content: string, role: 'user' | 'assistant'): Promise<void>;
  setCurrentArticle(articleId: string, feedId: string): Promise<void>;
  clearSession(): Promise<void>;

  // L1 Recent Memory
  getRecentReads(limit?: number): Promise<RecentMemoryItem[]>;
  recordArticleRead(read: Omit<RecentMemoryItem, 'id' | 'readAt'>): Promise<void>;
  updateReadProgress(articleId: string, progress: number, duration: number): Promise<void>;

  // L2 Episode Memory
  getEpisodes(limit?: number): Promise<EpisodeMemoryItem[]>;
  createEpisode(episode: Omit<EpisodeMemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt'>): Promise<EpisodeMemoryItem>;
  updateEpisode(id: string, updates: Partial<EpisodeMemoryItem>): Promise<void>;
  deleteEpisode(id: string): Promise<void>;

  // L3 Semantic Memory
  getInterestVector(): Promise<UserInterestVector>;
  recordArticleReadForInterest(tags: string[], author: string, feedId: string, rating: number): Promise<void>;
  applyDecay(weeksSinceUpdate: number): Promise<void>;

  // L4 Procedural Memory
  getProceduralActions(action?: string): Promise<ProceduralMemoryItem[]>;
  recordAction(action: string, context?: Record<string, any>): Promise<void>;
  getRecommendedActions(): Promise<ProceduralMemoryItem[]>;

  // Cross-layer operations
  getMemoryStats(): Promise<{
    sessionMessages: number;
    recentReads: number;
    episodes: number;
    topTags: string[];
    topAuthors: string[];
    recentActions: string[];
  }>;
}