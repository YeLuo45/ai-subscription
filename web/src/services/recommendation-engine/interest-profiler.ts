// Interest profiler - builds user interest profile from behaviors
import type { UserInterestProfile, UserBehavior, InterestVector } from './types';

// Behavior weights
const BEHAVIOR_WEIGHTS: Record<UserBehavior['type'], number> = {
  bookmark: 1.0,
  share: 0.9,
  complete: 0.8,
  read: 0.6,
  view: 0.4,
  skip: 0.1,
};

// Time decay half-life in days
const DECAY_HALF_LIFE_DAYS = 14;

function timeDecay(timestamp: number): number {
  const daysAgo = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  return Math.exp(-daysAgo / DECAY_HALF_LIFE_DAYS);
}

export function buildInterestVector(behaviors: UserBehavior[]): InterestVector {
  const categories: Record<string, number> = {};
  const topics: Record<string, number> = {};
  let sentimentSum = 0;
  let complexitySum = 0;
  let count = 0;

  for (const behavior of behaviors) {
    const weight = BEHAVIOR_WEIGHTS[behavior.type] * timeDecay(behavior.timestamp);
    
    // Extract category from articleId (simplified - in real app would look up article metadata)
    const category = extractCategory(behavior.articleId);
    if (category) {
      categories[category] = (categories[category] || 0) + weight;
    }

    // Extract topics (simplified keyword extraction)
    const topicKeywords = extractTopics(behavior.articleId);
    for (const topic of topicKeywords) {
      topics[topic] = (topics[topic] || 0) + weight;
    }

    // Sentiment and complexity from scroll/time spent
    if (behavior.scrollDepth !== undefined) {
      // High scroll depth = positive sentiment
      sentimentSum += (behavior.scrollDepth / 100) * weight;
    }
    if (behavior.timeSpentMs !== undefined) {
      // Time spent indicates content complexity preference
      complexitySum += Math.min(1, behavior.timeSpentMs / 300000) * weight; // 5min = max
    }
    count++;
  }

  // Normalize
  const normalize = (obj: Record<string, number>) => {
    const max = Math.max(...Object.values(obj), 1);
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, v / max])
    );
  };

  return {
    categories: normalize(categories),
    topics: normalize(topics),
    sentiment: count > 0 ? sentimentSum / count : 0,
    complexity: count > 0 ? complexitySum / count : 0.5,
  };
}

function extractCategory(articleId: string): string {
  // Simplified: extract from articleId or storage lookup
  // In real implementation, would look up article metadata
  const cats = ['technology', 'science', 'business', 'entertainment', 'sports', 'health'];
  const hash = hashString(articleId);
  return cats[hash % cats.length];
}

function extractTopics(articleId: string): string[] {
  // Simplified: would actually analyze article content
  const allTopics = ['AI', 'machine-learning', 'web-dev', 'startup', 'crypto', 'sports', 'politics', 'health'];
  const hash = hashString(articleId + 'topic');
  const count = (hash % 3) + 1;
  const topics: string[] = [];
  for (let i = 0; i < count; i++) {
    topics.push(allTopics[(hash + i) % allTopics.length]);
  }
  return topics;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function buildInterestProfile(
  userId: string,
  behaviors: UserBehavior[],
  bookmarkedArticles: string[] = []
): UserInterestProfile {
  return {
    userId,
    interestVector: buildInterestVector(behaviors),
    recentBehaviors: behaviors.slice(-50), // Keep last 50
    bookmarkedArticles: bookmarkedArticles,
    lastUpdated: Date.now(),
  };
}

export function cosineSimilarity(a: InterestVector, b: InterestVector): number {
  // Compare category vectors
  const allCats = new Set([...Object.keys(a.categories), ...Object.keys(b.categories)]);
  let catDot = 0, catMagA = 0, catMagB = 0;
  for (const cat of allCats) {
    const va = a.categories[cat] || 0;
    const vb = b.categories[cat] || 0;
    catDot += va * vb;
    catMagA += va * va;
    catMagB += vb * vb;
  }

  // Compare topic vectors
  const allTopics = new Set([...Object.keys(a.topics), ...Object.keys(b.topics)]);
  let topicDot = 0, topicMagA = 0, topicMagB = 0;
  for (const topic of allTopics) {
    const va = a.topics[topic] || 0;
    const vb = b.topics[topic] || 0;
    topicDot += va * vb;
    topicMagA += va * va;
    topicMagB += vb * vb;
  }

  const catSim = catMagA && catMagB ? catDot / (Math.sqrt(catMagA) * Math.sqrt(catMagB)) : 0;
  const topicSim = topicMagA && topicMagB ? topicDot / (Math.sqrt(topicMagA) * Math.sqrt(topicMagB)) : 0;
  const sentSim = 1 - Math.abs(a.sentiment - b.sentiment);
  const complexSim = 1 - Math.abs(a.complexity - b.complexity);

  // Weighted combination
  return 0.4 * catSim + 0.4 * topicSim + 0.1 * sentSim + 0.1 * complexSim;
}
