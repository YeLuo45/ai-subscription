// GitHub Trending Integration for Recommendations
// Uses MCP GitHub tools to get trending repositories and recommend them

import { searchGitHubRepositories } from '../mcp/ai-adapter';
import type { Subscription } from '../../types';

export interface GitHubTrendingRepo {
  name: string;
  fullName: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
}

export interface GitHubTrendingRecommendation {
  type: 'github-trending';
  subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>;
  trendScore: number;
  reason: string;
  repoInfo: GitHubTrendingRepo;
}

/**
 * Get trending GitHub repositories by topic/category
 */
export async function getGitHubTrending(
  category: string,
  limit = 10
): Promise<GitHubTrendingRepo[]> {
  try {
    // Map category to GitHub search query
    const query = buildSearchQuery(category);
    const repos = await searchGitHubRepositories(query, limit);
    
    return repos.map((repo: any) => ({
      name: repo.name || '',
      fullName: repo.full_name || repo.fullName || '',
      description: repo.description || '',
      url: repo.html_url || repo.url || '',
      stars: repo.stargazers_count || repo.stars || 0,
      forks: repo.forks_count || repo.forks || 0,
      language: repo.language || '',
      topics: repo.topics || [],
    }));
  } catch (error) {
    console.error('[GitHub Trending] Failed to fetch trending repos:', error);
    return [];
  }
}

/**
 * Build search query from category
 */
function buildSearchQuery(category: string): string {
  const categoryMap: Record<string, string> = {
    'AI': 'topic:artificial-intelligence OR topic:machine-learning OR topic:deep-learning',
    'Tech': 'stars:>1000 pushed:>2024-01-01',
    'Startup': 'topic:startup OR topic:saas',
    'Design': 'topic:design OR topic:ui OR topic:ux',
    'Science': 'topic:science OR topic:research',
    'JavaScript': 'language:javascript stars:>5000',
    'Python': 'language:python stars:>5000',
    'TypeScript': 'language:typescript stars:>3000',
    'Go': 'language:go stars:>3000',
    'Rust': 'language:rust stars:>2000',
  };
  
  return categoryMap[category] || `topic:${category.toLowerCase()} stars:>1000`;
}

/**
 * Convert GitHub repo to subscription recommendation
 */
function repoToRecommendation(repo: GitHubTrendingRepo): GitHubTrendingRecommendation {
  const score = Math.min(repo.stars / 1000, 10); // Normalize to 0-10 scale
  
  return {
    type: 'github-trending',
    subscription: {
      name: repo.fullName,
      url: repo.url,
      type: 'rss',
      category: repo.language || 'Tech',
      enabled: true,
      aiSummaryEnabled: true,
      fetchIntervalMinutes: 120,
    },
    trendScore: score,
    reason: `GitHub 热门项目 ⭐ ${repo.stars.toLocaleString()} stars - ${repo.description?.slice(0, 50) || ''}`,
    repoInfo: repo,
  };
}

/**
 * Recommend subscriptions based on GitHub trending for a category
 */
export async function recommendByGitHubTrend(
  category: string,
  limit = 5
): Promise<GitHubTrendingRecommendation[]> {
  const repos = await getGitHubTrending(category, limit);
  return repos.map(repoToRecommendation);
}

/**
 * Get multiple category recommendations
 */
export async function getMultiCategoryGitHubRecommendations(
  categories: string[],
  limitPerCategory = 3
): Promise<GitHubTrendingRecommendation[]> {
  const allRecommendations: GitHubTrendingRecommendation[] = [];
  
  for (const category of categories) {
    const recs = await recommendByGitHubTrend(category, limitPerCategory);
    allRecommendations.push(...recs);
  }
  
  // Sort by trend score and limit
  return allRecommendations
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, categories.length * limitPerCategory);
}

/**
 * Check if GitHub MCP server is available and connected
 */
export async function isGitHubMCPAvailable(): Promise<boolean> {
  try {
    const { getMCPServerRegistry } = await import('../mcp/registry');
    const registry = getMCPServerRegistry();
    const status = registry.getServerStatus('github');
    return status?.state === 'connected';
  } catch {
    return false;
  }
}