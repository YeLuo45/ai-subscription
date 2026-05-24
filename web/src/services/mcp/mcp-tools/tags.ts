/**
 * MCP Tool: generate_tags
 * Exposes AI tag recommendation via MCP
 */

export interface TagsInput {
  articleContent: string;
  existingTags?: string[];
}

export interface TagsOutput {
  tags: string[];
  confidence: number;
}

export async function tagsTool(input: TagsInput): Promise<TagsOutput> {
  if (!input.articleContent) {
    throw new Error('articleContent is required');
  }

  // Simple keyword-based tag generation (fallback when AI is unavailable)
  const keywords = extractKeywords(input.articleContent);
  const existingSet = new Set(input.existingTags || []);
  const newTags = keywords.filter(k => !existingSet.has(k)).slice(0, 5);

  return {
    tags: newTags.length > 0 ? newTags : ['general'],
    confidence: newTags.length > 0 ? 0.75 : 0.5,
  };
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);
}
