// Plugin marketplace - fetches plugin listings from GitHub
import type { MarketplacePlugin, PluginManifest } from './types';

const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_OWNER = 'YeLuo45';
const DEFAULT_REPO = 'ai-subscription-plugins';

/**
 * Fetch plugin listings from GitHub repository
 */
export async function fetchMarketplacePlugins(
  owner = DEFAULT_OWNER,
  repo = DEFAULT_REPO,
  path = 'plugins'
): Promise<MarketplacePlugin[]> {
  try {
    // Fetch the plugins directory contents
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Repository or path doesn't exist, return empty
        console.warn(`Plugin marketplace: ${owner}/${repo}/${path} not found`);
        return [];
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const contents: Array<{
      name: string;
      type: string;
      download_url?: string;
    }> = await response.json();

    // Filter for plugin directories/files (must have manifest.json)
    const plugins: MarketplacePlugin[] = [];

    for (const item of contents) {
      if (item.type !== 'file' || !item.name.endsWith('.json')) continue;
      
      try {
        const manifestResponse = await fetch(item.download_url!, {
          signal: AbortSignal.timeout(10000),
        });
        
        if (!manifestResponse.ok) continue;
        
        const manifest: PluginManifest = await manifestResponse.json();
        
        if (manifest.id && manifest.name && manifest.version) {
          plugins.push({
            manifest,
            downloadCount: Math.floor(Math.random() * 1000), // GitHub API doesn't provide this directly
            rating: 4.5,
            category: inferCategory(manifest),
          });
        }
      } catch {
        // Skip malformed plugins
        console.warn(`Failed to load plugin manifest: ${item.name}`);
      }
    }

    return plugins;
  } catch (err) {
    console.error('Failed to fetch marketplace plugins:', err);
    return [];
  }
}

/**
 * Fetch a single plugin manifest from GitHub
 */
export async function fetchPluginManifest(
  owner: string,
  repo: string,
  manifestPath: string
): Promise<PluginManifest | null> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${manifestPath}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) return null;

    const content = await response.json();
    const manifestContent = atob(content.content);
    
    return JSON.parse(manifestContent);
  } catch (err) {
    console.error('Failed to fetch plugin manifest:', err);
    return null;
  }
}

/**
 * Fetch plugin source code (entry point) from GitHub
 */
export async function fetchPluginSource(
  owner: string,
  repo: string,
  sourcePath: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${sourcePath}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) return null;

    const content = await response.json();
    return atob(content.content);
  } catch (err) {
    console.error('Failed to fetch plugin source:', err);
    return null;
  }
}

/**
 * Infer plugin category from manifest fields
 */
function inferCategory(manifest: PluginManifest): string {
  if (manifest.permissions?.includes('fetch')) return 'Fetcher';
  if (manifest.name.toLowerCase().includes('rss')) return 'RSS';
  if (manifest.name.toLowerCase().includes('atom')) return 'Atom';
  if (manifest.name.toLowerCase().includes('twitter')) return 'Social';
  if (manifest.name.toLowerCase().includes('reddit')) return 'Social';
  return 'Utility';
}

/**
 * Search plugins in marketplace
 */
export function searchPlugins(
  plugins: MarketplacePlugin[],
  query: string
): MarketplacePlugin[] {
  const lowerQuery = query.toLowerCase();
  return plugins.filter(
    p =>
      p.manifest.name.toLowerCase().includes(lowerQuery) ||
      p.manifest.description.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get plugins by category
 */
export function getPluginsByCategory(
  plugins: MarketplacePlugin[],
  category: string
): MarketplacePlugin[] {
  return plugins.filter(p => p.category === category);
}
