/**
 * Web Search Utility
 * Uses DuckDuckGo API for free web search (no API key required)
 */

export interface SearchResult {
  title: string;
  url: string;
}

export async function searchWeb(query: string): Promise<{ results: SearchResult[] }> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&kad=zh-CN`;

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  const data = await response.json();

  const results: SearchResult[] = (data.RelatedTopics ?? [])
    .filter((t: any) => t.Text && t.FirstURL)
    .slice(0, 5)
    .map((t: any) => ({
      title: t.Text,
      url: t.FirstURL,
    }));

  return { results };
}
