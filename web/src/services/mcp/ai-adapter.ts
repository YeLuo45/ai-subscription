/**
 * MCP AI Adapter - AI-focused MCP tool integration
 * 
 * Provides AI-friendly interface to MCP tools for content analysis.
 * Handles GitHub URL detection, repo info enhancement, and Brave Search.
 */

import { getMCPServerRegistry, type MCPServerStatus } from './registry';

// ============================================================
// Types
// ============================================================

export interface Article {
  id: string;
  title: string;
  description: string;
  content?: string;
  url?: string;
  link?: string;
  author?: string;
  pubDate?: string;
}

export interface AnalysisContext {
  taskType: 'structured-summary' | 'quick-summary' | 'tag-generation' | 'intent-classification';
  existingContext?: string;
}

export interface EnrichedArticle extends Article {
  mcpEnhancements: {
    githubRepo?: GitHubRepoInfo;
    searchResults?: SearchResult[];
  };
}

export interface GitHubRepoInfo {
  url: string;
  name: string;
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  latestCommit?: string;
  openIssues?: number;
  watchers?: number;
  homepage?: string;
  license?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

// ============================================================
// MCP Tool Caller
// ============================================================

/**
 * Call an MCP tool from a specific server
 */
export async function callMCPTool(
  serverId: string,
  toolName: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const registry = getMCPServerRegistry();
  const status = registry.getServerStatus(serverId);
  
  if (!status || status.state !== 'connected') {
    // Try to connect first
    try {
      await registry.connectServer(serverId);
    } catch (error) {
      throw new Error(`MCP server ${serverId} is not connected and failed to connect: ${error}`);
    }
  }
  
  const client = await registry.connect(serverId);
  const result = await client.callTool(toolName, params);
  return result;
}

// ============================================================
// GitHub URL Detection
// ============================================================

const GITHUB_URL_REGEX = /https?:\/\/github\.com\/[\w-]+\/[\w.-]+(?:\/.*)?/g;

/**
 * Detect GitHub URLs in text
 */
export function detectGitHubURL(text: string): string[] {
  if (!text) return [];
  const matches = text.match(GITHUB_URL_REGEX);
  if (!matches) return [];
  // Return unique URLs
  return [...new Set(matches)];
}

/**
 * Normalize GitHub URL (remove trailing slashes and paths)
 */
export function normalizeGitHubUrl(url: string): string {
  return url
    .replace(/\/$/, '')
    .replace(/\\/github\.com/, 'https://github.com')
    .split('/pull/')[0]
    .split('/tree/')[0]
    .split('/issues/')[0]
    .split('/commits/')[0];
}

// ============================================================
// GitHub Tool Enhancement
// ============================================================

/**
 * Get repository info from GitHub MCP server
 */
export async function getRepoInfo(url: string): Promise<GitHubRepoInfo | null> {
  try {
    const result = await callMCPTool('github', 'get_repo', { url }) as any;
    
    if (!result || result.isError) {
      console.warn('[MCP AI Adapter] get_repo returned error:', result);
      return null;
    }
    
    // Extract text content from MCP response
    const content = result.content?.[0]?.text;
    if (!content) return null;
    
    const repoData = typeof content === 'string' ? JSON.parse(content) : content;
    
    return {
      url,
      name: repoData.name || '',
      fullName: repoData.full_name || '',
      description: repoData.description || '',
      stars: repoData.stargazers_count || 0,
      forks: repoData.forks_count || 0,
      language: repoData.language || '',
      topics: repoData.topics || [],
      latestCommit: repoData.latest_commit || undefined,
      openIssues: repoData.open_issues_count || 0,
      watchers: repoData.watchers_count || 0,
      homepage: repoData.homepage || undefined,
      license: repoData.license?.name || repoData.license || undefined,
      createdAt: repoData.created_at || '',
      updatedAt: repoData.updated_at || '',
    };
  } catch (error) {
    console.error('[MCP AI Adapter] Failed to get repo info:', error);
    return null;
  }
}

/**
 * Search GitHub repositories
 */
export async function searchGitHubRepositories(query: string, limit = 5): Promise<any[]> {
  try {
    const result = await callMCPTool('github', 'search_repositories', { query, limit }) as any;
    
    if (!result || result.isError) {
      return [];
    }
    
    const content = result.content?.[0]?.text;
    if (!content) return [];
    
    const data = typeof content === 'string' ? JSON.parse(content) : content;
    return data.items || [];
  } catch (error) {
    console.error('[MCP AI Adapter] Failed to search repositories:', error);
    return [];
  }
}

/**
 * Enhance article with GitHub repository information
 */
export async function enhanceArticleWithGitHub(article: Article): Promise<string> {
  const textToCheck = `${article.title} ${article.description} ${article.content || ''} ${article.url || ''} ${article.link || ''}`;
  const urls = detectGitHubURL(textToCheck);
  
  if (urls.length === 0) return '';
  
  const normalizedUrl = normalizeGitHubUrl(urls[0]);
  const repoInfo = await getRepoInfo(normalizedUrl);
  
  if (!repoInfo) return '';
  
  const lines = [
    '',
    '--- GitHub 仓库信息 ---',
    `项目: ${repoInfo.fullName}`,
    `描述: ${repoInfo.description || '无描述'}`,
    `语言: ${repoInfo.language || '未指定'}`,
    `Stars: ${repoInfo.stars.toLocaleString()}`,
    `Forks: ${repoInfo.forks.toLocaleString()}`,
  ];
  
  if (repoInfo.topics.length > 0) {
    lines.push(`主题: ${repoInfo.topics.slice(0, 5).join(', ')}`);
  }
  
  if (repoInfo.license) {
    lines.push(`许可证: ${repoInfo.license}`);
  }
  
  lines.push('---');
  
  return lines.join('\n');
}

// ============================================================
// Brave Search Enhancement
// ============================================================

/**
 * Check if article should trigger search enhancement
 */
export function shouldTriggerSearch(article: Article): boolean {
  const textToCheck = `${article.title} ${article.description} ${article.content || ''}`;
  
  // Technical keywords that warrant additional search
  const technicalKeywords = [
    'ai', 'machine learning', 'deep learning', 'neural network',
    'api', 'sdk', 'library', 'framework', 'open source',
    'github', 'repository', 'code', 'programming',
    'technical', 'algorithm', 'model', 'training',
    'startup', 'funding', 'product launch', 'technology',
  ];
  
  const lowerText = textToCheck.toLowerCase();
  return technicalKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Search using Brave Search MCP tool
 */
export async function searchWithBrave(query: string, limit = 5): Promise<SearchResult[]> {
  try {
    const result = await callMCPTool('brave-search', 'brave_web_search', { 
      query,
      count: limit,
    }) as any;
    
    if (!result || result.isError) {
      return [];
    }
    
    const content = result.content?.[0]?.text;
    if (!content) return [];
    
    const data = typeof content === 'string' ? JSON.parse(content) : content;
    
    // Parse Brave Search API response format
    if (Array.isArray(data.results)) {
      return data.results.map((r: any) => ({
        title: r.title || '',
        url: r.url || r.link || '',
        snippet: r.description || r.snippet || '',
        source: r.source || 'Brave Search',
      }));
    }
    
    return [];
  } catch (error) {
    console.error('[MCP AI Adapter] Failed to search:', error);
    return [];
  }
}

/**
 * Enhance article with Brave Search results
 */
export async function enhanceArticleWithSearch(article: Article): Promise<string> {
  if (!shouldTriggerSearch(article)) return '';
  
  const searchQuery = `${article.title} ${article.description}`.slice(0, 200);
  const results = await searchWithBrave(searchQuery, 3);
  
  if (results.length === 0) return '';
  
  const lines = [
    '',
    '--- 相关搜索结果 ---',
    ...results.map(r => `[${r.title}](${r.url})\n${r.snippet.slice(0, 150)}...`),
    '---',
  ];
  
  return lines.join('\n');
}

// ============================================================
// Main Enhancement Function
// ============================================================

/**
 * Enhance article with MCP tools based on configuration
 */
export async function enhanceWithMCP(
  article: Article,
  context: AnalysisContext
): Promise<{
  enhancedContext: string;
  githubInfo?: GitHubRepoInfo;
  searchResults?: SearchResult[];
}> {
  const parts: string[] = [];
  let githubInfo: GitHubRepoInfo | undefined;
  let searchResults: SearchResult[] | undefined;
  
  // Get configuration
  const config = getMCPEnhanceConfig();
  
  // GitHub enhancement
  if (config.github.enabled) {
    const textToCheck = `${article.title} ${article.description} ${article.content || ''} ${article.url || ''} ${article.link || ''}`;
    const urls = detectGitHubURL(textToCheck);
    
    if (urls.length > 0) {
      const normalizedUrl = normalizeGitHubUrl(urls[0]);
      const info = await getRepoInfo(normalizedUrl);
      
      if (info) {
        githubInfo = info;
        parts.push(`GitHub 仓库信息:
- 项目: ${info.fullName}
- 描述: ${info.description || '无'}
- 语言: ${info.language || '未指定'}
- Stars: ${info.stars.toLocaleString()}
- Forks: ${info.forks.toLocaleString()}
${info.topics.length > 0 ? `- 主题: ${info.topics.slice(0, 5).join(', ')}` : ''}
${info.license ? `- 许可证: ${info.license}` : ''}`);
      }
    }
  }
  
  // Brave Search enhancement
  if (config.braveSearch.enabled && shouldTriggerSearch(article)) {
    const searchQuery = `${article.title} ${article.description}`.slice(0, 200);
    const results = await searchWithBrave(searchQuery, config.braveSearch.maxResults);
    
    if (results.length > 0) {
      searchResults = results;
      parts.push(`相关搜索结果:
${results.map(r => `- ${r.title}: ${r.snippet.slice(0, 100)}...`).join('\n')}`);
    }
  }
  
  return {
    enhancedContext: parts.join('\n'),
    githubInfo,
    searchResults,
  };
}

// ============================================================
// Configuration
// ============================================================

export interface MCPEnhanceConfig {
  github: {
    enabled: boolean;
    maxResults: number;
  };
  braveSearch: {
    enabled: boolean;
    maxResults: number;
  };
}

const MCP_ENHANCE_CONFIG_KEY = 'mcp-enhance-config';

const DEFAULT_MCP_ENHANCE_CONFIG: MCPEnhanceConfig = {
  github: {
    enabled: true,
    maxResults: 1,
  },
  braveSearch: {
    enabled: true,
    maxResults: 3,
  },
};

/**
 * Get MCP enhancement configuration
 */
export function getMCPEnhanceConfig(): MCPEnhanceConfig {
  try {
    const stored = localStorage.getItem(MCP_ENHANCE_CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_MCP_ENHANCE_CONFIG, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('[MCP AI Adapter] Failed to load config:', error);
  }
  return DEFAULT_MCP_ENHANCE_CONFIG;
}

/**
 * Save MCP enhancement configuration
 */
export function saveMCPEnhanceConfig(config: MCPEnhanceConfig): void {
  try {
    localStorage.setItem(MCP_ENHANCE_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('[MCP AI Adapter] Failed to save config:', error);
  }
}

/**
 * Update specific enhancement setting
 */
export function updateMCPEnhanceConfig(
  key: 'github' | 'braveSearch',
  updates: Partial<MCPEnhanceConfig['github'] | MCPEnhanceConfig['braveSearch']>
): MCPEnhanceConfig {
  const current = getMCPEnhanceConfig();
  const updated = {
    ...current,
    [key]: {
      ...current[key],
      ...updates,
    },
  };
  saveMCPEnhanceConfig(updated);
  return updated;
}