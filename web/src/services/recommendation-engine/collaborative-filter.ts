// Collaborative filtering - user-based and item-based CF
import type { UserInterestProfile, RecommendationItem, InterestVector } from './types';
import { cosineSimilarity } from './interest-profiler';

// Simulated user profiles storage (in real app, would be backed by IndexedDB)
const userProfiles = new Map<string, UserInterestProfile>();

export function registerUserProfile(profile: UserInterestProfile): void {
  userProfiles.set(profile.userId, profile);
}

export function getUserProfile(userId: string): UserInterestProfile | undefined {
  return userProfiles.get(userId);
}

export function getAllUserProfiles(): UserInterestProfile[] {
  return Array.from(userProfiles.values());
}

export function findSimilarUsers(
  targetProfile: InterestVector,
  excludeUserId?: string,
  k = 10
): Array<{ userId: string; similarity: number }> {
  const similarities: Array<{ userId: string; similarity: number }> = [];

  for (const [userId, profile] of userProfiles.entries()) {
    if (userId === excludeUserId) continue;
    
    const sim = cosineSimilarity(targetProfile, profile.interestVector);
    if (sim > 0.1) { // Minimum threshold
      similarities.push({ userId, similarity: sim });
    }
  }

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

export function recommendFromSimilarUsers(
  targetUserId: string,
  excludeArticleIds: string[],
  maxResults = 10
): RecommendationItem[] {
  const targetProfile = userProfiles.get(targetUserId);
  if (!targetProfile) return [];

  const similarUsers = findSimilarUsers(targetProfile.interestVector, targetUserId);
  if (similarUsers.length === 0) return [];

  // Aggregate articles from similar users
  const articleScores = new Map<string, { score: number; sources: string[] }>();

  for (const { userId, similarity } of similarUsers) {
    const profile = userProfiles.get(userId);
    if (!profile) continue;

    for (const articleId of profile.bookmarkedArticles) {
      if (excludeArticleIds.includes(articleId)) continue;
      
      const existing = articleScores.get(articleId) || { score: 0, sources: [] };
      existing.score += similarity;
      existing.sources.push(userId);
      articleScores.set(articleId, existing);
    }
  }

  // Normalize and convert to recommendations
  const maxScore = Math.max(...Array.from(articleScores.values()).map(v => v.score), 1);

  return Array.from(articleScores.entries())
    .map(([articleId, { score, sources }]) => ({
      articleId,
      articleTitle: `Article: ${articleId.slice(0, 20)}...`,
      score: score / maxScore,
      reasons: [`${sources.length} similar users bookmarked this`],
      source: 'collaborative' as const,
      matchedInterests: [],
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

// Item-based CF: find related articles
export function findRelatedArticles(
  articleId: string,
  allArticles: Array<{ id: string; topics: string[] }>,
  maxResults = 5
): Array<{ articleId: string; similarity: number }> {
  const target = allArticles.find(a => a.id === articleId);
  if (!target) return [];

  const scores = allArticles
    .filter(a => a.id !== articleId)
    .map(a => {
      const commonTopics = a.topics.filter(t => target.topics.includes(t));
      const similarity = commonTopics.length / Math.max(a.topics.length, target.topics.length);
      return { articleId: a.id, similarity };
    });

  return scores
    .filter(s => s.similarity > 0.1)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
}
