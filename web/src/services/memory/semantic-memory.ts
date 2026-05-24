/**
 * L3 Semantic Memory - User Interest Vector
 * Uses IndexedDB for permanent storage with decay mechanism
 */

import type { UserInterestVector } from './types';

const DB_NAME = 'AISubscriptionDB';
const DB_VERSION = 3;
const STORE_NAME = 'semantic_memory';
const VECTOR_KEY = 'user_interest_vector';

let dbInstance: IDBDatabase | null = null;

// Decay factor per week (Ebbinghaus forgetting curve approximation)
const WEEKLY_DECAY = 0.95;
// Minimum weight threshold for pruning
const MIN_WEIGHT_THRESHOLD = 0.01;
// Maximum number of top interests to track
const MAX_INTERESTS = 50;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) { resolve(dbInstance); return; }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

function createDefaultVector(): UserInterestVector {
  return {
    id: VECTOR_KEY,
    tagWeights: {},
    topicWeights: {},
    authorAffinity: {},
    sourceWeights: {},
    totalReads: 0,
    lastUpdate: new Date().toISOString(),
  };
}

/**
 * Get the user's interest vector
 */
export async function getInterestVector(): Promise<UserInterestVector> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(VECTOR_KEY);
    
    request.onsuccess = () => {
      const result = request.result as UserInterestVector | undefined;
      resolve(result ?? createDefaultVector());
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save the interest vector
 */
async function saveVector(vector: UserInterestVector): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(vector);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Record article read and update interest weights
 */
export async function recordArticleReadForInterest(
  tags: string[],
  author: string,
  feedId: string,
  rating: number
): Promise<void> {
  const vector = await getInterestVector();
  
  // Rating multiplier (1-5 scale normalized to 0.2-1.0)
  const ratingMultiplier = 0.2 + (rating / 5) * 0.8;
  
  // Update tag weights
  for (const tag of tags) {
    const currentWeight = vector.tagWeights[tag] ?? 0.3; // Start with 0.3 for new tags
    const increment = (1 - currentWeight) * 0.2 * ratingMultiplier;
    vector.tagWeights[tag] = Math.min(1, currentWeight + increment);
  }
  
  // Update author affinity
  if (author) {
    const currentAffinity = vector.authorAffinity[author] ?? 0.3;
    const increment = (1 - currentAffinity) * 0.15 * ratingMultiplier;
    vector.authorAffinity[author] = Math.min(1, currentAffinity + increment);
  }
  
  // Update source/feed weights
  const currentSourceWeight = vector.sourceWeights[feedId] ?? 0.3;
  const sourceIncrement = (1 - currentSourceWeight) * 0.1 * ratingMultiplier;
  vector.sourceWeights[feedId] = Math.min(1, currentSourceWeight + sourceIncrement);
  
  // Increment total reads
  vector.totalReads++;
  vector.lastUpdate = new Date().toISOString();
  
  // Trim excessive entries
  await pruneVector(vector);
  
  await saveVector(vector);
  
  // Emit custom event for cross-component notification
  dispatchMemoryEvent('interest_updated', { vector });
}

/**
 * Prune low-weight entries to prevent unbounded growth
 */
async function pruneVector(vector: UserInterestVector): Promise<void> {
  // Prune tags
  const sortedTags = Object.entries(vector.tagWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_INTERESTS);
  vector.tagWeights = Object.fromEntries(sortedTags.filter(([, w]) => w >= MIN_WEIGHT_THRESHOLD));
  
  // Prune topics
  const sortedTopics = Object.entries(vector.topicWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_INTERESTS);
  vector.topicWeights = Object.fromEntries(sortedTopics.filter(([, w]) => w >= MIN_WEIGHT_THRESHOLD));
  
  // Prune authors
  const sortedAuthors = Object.entries(vector.authorAffinity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.floor(MAX_INTERESTS / 2));
  vector.authorAffinity = Object.fromEntries(sortedAuthors.filter(([, w]) => w >= MIN_WEIGHT_THRESHOLD));
  
  // Prune sources
  const sortedSources = Object.entries(vector.sourceWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.floor(MAX_INTERESTS / 2));
  vector.sourceWeights = Object.fromEntries(sortedSources.filter(([, w]) => w >= MIN_WEIGHT_THRESHOLD));
}

/**
 * Apply decay factor to all weights (forgotten over time)
 */
export async function applyDecay(weeksSinceUpdate: number): Promise<void> {
  if (weeksSinceUpdate <= 0) return;
  
  const vector = await getInterestVector();
  const decayFactor = Math.pow(WEEKLY_DECAY, weeksSinceUpdate);
  
  // Apply decay to tag weights
  for (const tag of Object.keys(vector.tagWeights)) {
    vector.tagWeights[tag] *= decayFactor;
    if (vector.tagWeights[tag] < MIN_WEIGHT_THRESHOLD) {
      delete vector.tagWeights[tag];
    }
  }
  
  // Apply decay to topic weights
  for (const topic of Object.keys(vector.topicWeights)) {
    vector.topicWeights[topic] *= decayFactor;
    if (vector.topicWeights[topic] < MIN_WEIGHT_THRESHOLD) {
      delete vector.topicWeights[topic];
    }
  }
  
  // Apply decay to author affinity
  for (const author of Object.keys(vector.authorAffinity)) {
    vector.authorAffinity[author] *= decayFactor;
    if (vector.authorAffinity[author] < MIN_WEIGHT_THRESHOLD) {
      delete vector.authorAffinity[author];
    }
  }
  
  // Apply decay to source weights
  for (const source of Object.keys(vector.sourceWeights)) {
    vector.sourceWeights[source] *= decayFactor;
    if (vector.sourceWeights[source] < MIN_WEIGHT_THRESHOLD) {
      delete vector.sourceWeights[source];
    }
  }
  
  vector.lastUpdate = new Date().toISOString();
  await saveVector(vector);
  
  dispatchMemoryEvent('interest_updated', { vector });
}

/**
 * Get top N interests by weight
 */
export async function getTopInterests(n: number = 10): Promise<{
  tags: Array<{ tag: string; weight: number }>;
  authors: Array<{ author: string; affinity: number }>;
  sources: Array<{ source: string; weight: number }>;
}> {
  const vector = await getInterestVector();
  
  return {
    tags: Object.entries(vector.tagWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([tag, weight]) => ({ tag, weight })),
    
    authors: Object.entries(vector.authorAffinity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([author, affinity]) => ({ author, affinity })),
    
    sources: Object.entries(vector.sourceWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([source, weight]) => ({ source, weight })),
  };
}

/**
 * Get interest-based recommendations for new content
 */
export async function getInterestScores(
  tags: string[],
  author: string,
  feedId: string
): Promise<number> {
  const vector = await getInterestVector();
  
  if (vector.totalReads === 0) return 0.5; // Neutral for new users
  
  let score = 0;
  let weightSum = 0;
  
  // Tag scores
  for (const tag of tags) {
    if (vector.tagWeights[tag]) {
      score += vector.tagWeights[tag];
      weightSum += 1;
    }
  }
  
  // Author affinity
  if (author && vector.authorAffinity[author]) {
    score += vector.authorAffinity[author];
    weightSum += 1;
  }
  
  // Source weight
  if (feedId && vector.sourceWeights[feedId]) {
    score += vector.sourceWeights[feedId];
    weightSum += 1;
  }
  
  return weightSum > 0 ? score / weightSum : 0.5;
}

/**
 * Dispatch memory event for cross-component notification
 */
function dispatchMemoryEvent(type: string, payload: any): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('memory-event', {
      detail: { type, payload, timestamp: Date.now() }
    }));
  }
}