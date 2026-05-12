/**
 * Similarity Engine
 * Computes similarity between user interest profile and candidate feeds
 */

import type { UserInterestProfile, FeedRecommendation, CandidateFeed } from './types';

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vector dimensions must match');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Convert interest vector to array format for similarity computation
 */
function interestVectorToArray(
  interestVector: { [category: string]: number },
  categories: string[]
): number[] {
  return categories.map(cat => interestVector[cat] || 0);
}

/**
 * Convert feed categories to vector format
 */
function feedCategoriesToVector(
  feedCategories: string[],
  allCategories: string[]
): number[] {
  // Create a normalized vector based on category presence
  return allCategories.map(cat => {
    const idx = feedCategories.indexOf(cat);
    return idx >= 0 ? 1.0 / (1 + idx) : 0; // Weight by position
  });
}

/**
 * Compute recommendations based on user profile and candidate feeds
 */
export function computeRecommendations(
  userProfile: UserInterestProfile,
  candidateFeeds: CandidateFeed[]
): FeedRecommendation[] {
  if (!userProfile.interestVector || Object.keys(userProfile.interestVector).length === 0) {
    return [];
  }

  if (candidateFeeds.length === 0) {
    return [];
  }

  // Get all categories from user profile
  const allCategories = Object.keys(userProfile.interestVector);

  // Convert user interest vector to array
  const userVector = interestVectorToArray(userProfile.interestVector, allCategories);

  const recommendations: FeedRecommendation[] = [];

  for (const feed of candidateFeeds) {
    // Create feed vector from its categories
    const feedVector = feedCategoriesToVector(feed.categories, allCategories);

    // Compute cosine similarity
    const similarity = cosineSimilarity(userVector, feedVector);

    if (similarity > 0) {
      // Generate recommendation reason
      const reason = generateReason(userProfile, feed, similarity);

      recommendations.push({
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        feedUrl: feed.feedUrl,
        feedTitle: feed.feedTitle,
        categories: feed.categories,
        similarityScore: similarity,
        reason,
        source: 'content',
        fetchedAt: Date.now(),
      });
    }
  }

  // Sort by similarity score descending
  recommendations.sort((a, b) => b.similarityScore - a.similarityScore);

  return recommendations;
}

/**
 * Generate human-readable reason for recommendation
 */
function generateReason(
  userProfile: UserInterestProfile,
  feed: CandidateFeed,
  similarity: number
): string {
  const matchingCategories = feed.categories.filter(cat =>
    userProfile.topCategories.includes(cat)
  );

  const matchingKeywords = feed.categories.filter(cat =>
    userProfile.topKeywords.includes(cat)
  );

  if (matchingCategories.length > 0) {
    return `与你关注的「${matchingCategories[0]}」类内容高度匹配`;
  }

  if (matchingKeywords.length > 0) {
    return `包含你感兴趣的「${matchingKeywords[0]}」话题`;
  }

  // Fallback reason based on score
  if (similarity > 0.8) {
    return '与你阅读兴趣非常匹配';
  } else if (similarity > 0.5) {
    return '符合你的阅读偏好';
  } else {
    return '可能是你感兴趣的内容';
  }
}

/**
 * Batch compute recommendations with collaboration filtering
 */
export function computeRecommendationsWithCollab(
  userProfile: UserInterestProfile,
  candidateFeeds: CandidateFeed[],
  collabScores?: { [feedUrl: string]: number }
): FeedRecommendation[] {
  const contentRecs = computeRecommendations(userProfile, candidateFeeds);

  // Apply collaborative filtering boost if available
  if (collabScores) {
    for (const rec of contentRecs) {
      const collabScore = collabScores[rec.feedUrl];
      if (collabScore) {
        // Blend content and collaborative scores
        rec.similarityScore = rec.similarityScore * 0.7 + collabScore * 0.3;
        if (collabScore > 0.5) {
          rec.source = 'collab';
        }
      }
    }

    // Re-sort after score adjustment
    contentRecs.sort((a, b) => b.similarityScore - a.similarityScore);
  }

  return contentRecs;
}
