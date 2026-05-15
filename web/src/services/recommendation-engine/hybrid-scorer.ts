// Hybrid scorer - combines multiple recommendation signals
import type { RecommendationItem, InterestVector, HybridScoreWeights, UserInterestProfile } from './types';
import { cosineSimilarity } from './interest-profiler';
import { recommendFromSimilarUsers } from './collaborative-filter';
import { recommendForNewUser } from './cold-start';

export function combineScores(
  item: { id: string; topics?: string[]; createdAt?: number; viewCount?: number },
  profile: InterestVector,
  weights: HybridScoreWeights = { content: 0.3, collaborative: 0.4, popularity: 0.15, recency: 0.15 }
): { score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};

  // Content similarity score
  let contentScore = 0;
  if (profile.topics && item.topics) {
    const profileVec: InterestVector = { categories: {}, topics: profile.topics, sentiment: 0, complexity: 0.5 };
    const itemVec: InterestVector = { categories: {}, topics: Object.fromEntries(item.topics.map(t => [t, 1])), sentiment: 0, complexity: 0.5 };
    contentScore = cosineSimilarity(profileVec, itemVec);
  }
  breakdown.content = contentScore * weights.content;

  // Collaborative score (simplified - would normally use recommendFromSimilarUsers)
  const collabScore = 0.3; // Placeholder - real implementation would use actual CF results
  breakdown.collaborative = collabScore * weights.collaborative;

  // Popularity score (normalized view count)
  const popScore = Math.min(1, (item.viewCount || 0) / 10000);
  breakdown.popularity = popScore * weights.popularity;

  // Recency score (exponential decay)
  const ageDays = item.createdAt ? (Date.now() - item.createdAt) / (1000 * 60 * 60 * 24) : 30;
  const recencyScore = Math.exp(-ageDays / 7); // 7-day half-life
  breakdown.recency = recencyScore * weights.recency;

  const totalScore = breakdown.content + breakdown.collaborative + breakdown.popularity + breakdown.recency;

  return { score: totalScore, breakdown };
}

export async function getHybridRecommendations(
  profile: UserInterestProfile | null,
  excludeIds: string[],
  limit = 20
): Promise<RecommendationItem[]> {
  // Cold start: no profile or very few behaviors
  if (!profile || profile.recentBehaviors.length < 3) {
    return recommendForNewUser(excludeIds);
  }

  const recommendations: RecommendationItem[] = [];

  // 1. Collaborative filtering recommendations
  const collabRecs = recommendFromSimilarUsers(profile.userId, excludeIds, limit);
  recommendations.push(...collabRecs);

  // 2. Content-based recommendations (simplified)
  // In real app would use TF-IDF or embedding similarity
  const contentRecs = generateContentBasedRecs(profile, excludeIds, limit);
  recommendations.push(...contentRecs);

  // 3. Deduplicate and re-score with hybrid weights
  const deduped = deduplicateAndMerge(recs_to_items(recommendations));

  // 4. Sort by combined score
  const scored = deduped.map(item => {
    const { score, breakdown } = combineScores(item, profile.interestVector);
    return {
      ...item,
      score,
      reasons: generateReasons(breakdown),
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function generateContentBasedRecs(
  profile: UserInterestProfile,
  excludeIds: string[],
  limit: number
): RecommendationItem[] {
  // Simplified content-based recs
  const topInterests = Object.entries(profile.interestVector.topics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  return topInterests.map(topic => ({
    articleId: `content-${topic}`,
    articleTitle: `Article matching: ${topic}`,
    score: 0.5,
    reasons: [`Matches your ${topic} interest`],
    source: 'content' as const,
    matchedInterests: [topic],
  })).filter(r => !excludeIds.includes(r.articleId)).slice(0, limit);
}

function dedupeAndMergeRecs(recs: RecommendationItem[]): Map<string, RecommendationItem> {
  const map = new Map<string, RecommendationItem>();
  for (const rec of recs) {
    const existing = map.get(rec.articleId);
    if (existing) {
      // Merge reasons
      existing.reasons = [...new Set([...existing.reasons, ...rec.reasons])];
      existing.score = Math.max(existing.score, rec.score);
    } else {
      map.set(rec.articleId, { ...rec });
    }
  }
  return map;
}

function recs_to_items(recs: RecommendationItem[]): Array<{ id: string; topics?: string[]; createdAt?: number; viewCount?: number }> {
  return recs.map(r => ({
    id: r.articleId,
    topics: r.matchedInterests,
  }));
}

function deduplicateAndMerge(recs: RecommendationItem[]): RecommendationItem[] {
  const map = new Map<string, RecommendationItem>();
  for (const rec of recs) {
    const existing = map.get(rec.articleId);
    if (existing) {
      existing.reasons = [...new Set([...existing.reasons, ...rec.reasons])];
      existing.score = Math.max(existing.score, rec.score);
    } else {
      map.set(rec.articleId, { ...rec });
    }
  }
  return Array.from(map.values());
}

function generateReasons(breakdown: Record<string, number>): string[] {
  const reasons: string[] = [];
  if (breakdown.content > 0.15) reasons.push('Matches your interests');
  if (breakdown.collaborative > 0.15) reasons.push('Popular with similar users');
  if (breakdown.popularity > 0.08) reasons.push('Trending article');
  if (breakdown.recency > 0.08) reasons.push('Recently published');
  return reasons.length > 0 ? reasons : ['Recommended for you'];
}
