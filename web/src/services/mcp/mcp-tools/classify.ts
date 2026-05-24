/**
 * MCP Tool: classify_feed
 * Exposes feed category classification via MCP
 */

export interface ClassifyInput {
  feedUrl: string;
  feedTitle?: string;
}

export interface ClassifyOutput {
  category: string;
  subcategories: string[];
}

const CATEGORY_PATTERNS: [string, RegExp, string[]][] = [
  ['technology', /tech|software|programming|developer|code|ai|machine learning|crypto|blockchain|web|app/i, ['programming', 'AI', 'mobile', 'security']],
  ['business', /business|startup|entrepreneur|invest|finance|market|economy|stock|crypto/i, ['startups', 'investing', 'markets', 'economy']],
  ['science', /science|research|study|discovery|nasa|physics|biology|chemistry|genetics/i, ['physics', 'biology', 'chemistry', 'astronomy']],
  ['health', /health|medical|medicine|doctor|disease|treatment|therapy|wellness|fitness/i, ['nutrition', 'mental health', 'fitness', 'medical research']],
  ['entertainment', /entertainment|movie|film|tv|show|music|game|gaming|celebrity|star/i, ['movies', 'music', 'gaming', 'celebrities']],
  ['sports', /sports|football|basketball|soccer|baseball|tennis|golf|olympics|athlete/i, ['football', 'basketball', 'baseball', 'tennis']],
  ['education', /education|school|university|learning|student|teacher|course|training/i, ['K-12', 'higher ed', 'online learning', 'professional development']],
  ['politics', /politics|government|election|vote|congress|senate|president|policy/i, ['elections', 'legislation', 'international', 'public policy']],
  ['food', /food|recipe|cooking|chef|restaurant|meal|ingredient/i, ['recipes', 'restaurants', 'food culture', 'nutrition']],
  ['travel', /travel|trip|flight|hotel|tourist|destination|vacation|adventure/i, ['destinations', 'budget travel', 'luxury', 'adventure']],
];

export async function classifyTool(input: ClassifyInput): Promise<ClassifyOutput> {
  if (!input.feedUrl && !input.feedTitle) {
    throw new Error('Either feedUrl or feedTitle is required');
  }

  const text = `${input.feedUrl} ${input.feedTitle || ''}`.toLowerCase();

  for (const [category, pattern, subcategories] of CATEGORY_PATTERNS) {
    if (pattern.test(text)) {
      return { category, subcategories: subcategories.slice(0, 3) };
    }
  }

  return { category: 'general', subcategories: ['news', 'information'] };
}
