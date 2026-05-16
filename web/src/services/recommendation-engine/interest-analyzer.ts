// Interest Analyzer - Extracts user interests from reading history using TF-IDF
import { getSubscriptions, getSummaries, getArticles } from '../storage';
import type { InterestProfile } from './types';

// Stop words for Chinese and English
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'also', 'now', '的', '了', '在', '是', '我',
  '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到',
  '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这',
  '的', '地', '得', '而', '于', '与', '或', '等', '被', '把', '让', '用',
  '对', '则', '而且', '但是', '如果', '因为', '所以', '虽然', '然而',
]);

interface TermFrequency {
  [term: string]: number;
}

// Tokenize text into terms
function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 1 && !STOP_WORDS.has(term));
}

// Calculate TF (Term Frequency)
function calculateTF(tokens: string[]): TermFrequency {
  const tf: TermFrequency = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  return tf;
}

// Calculate IDF (Inverse Document Frequency) for a corpus
function calculateIDF(documents: string[][]): Record<string, number> {
  const docCount = documents.length;
  const idf: Record<string, number> = {};
  const docFreq: Record<string, number> = {};

  for (const doc of documents) {
    const seen = new Set<string>();
    for (const term of doc) {
      if (!seen.has(term)) {
        docFreq[term] = (docFreq[term] || 0) + 1;
        seen.add(term);
      }
    }
  }

  for (const term of Object.keys(docFreq)) {
    idf[term] = Math.log((docCount + 1) / (docFreq[term] + 1)) + 1;
  }

  return idf;
}

// Calculate TF-IDF
function calculateTFIDF(tf: TermFrequency, idf: Record<string, number>): TermFrequency {
  const tfidf: TermFrequency = {};
  for (const term of Object.keys(tf)) {
    tfidf[term] = tf[term] * (idf[term] || 1);
  }
  return tfidf;
}

// Build IDF from documents
function buildIDF(corpus: string[][]): Record<string, number> {
  return calculateIDF(corpus);
}

// Analyze reading history to build interest profile
export async function analyzeInterests(): Promise<InterestProfile> {
  const [subscriptions, summaries, articles] = await Promise.all([
    getSubscriptions(),
    getSummaries(),
    getArticles(),
  ]);

  // Collect all documents for IDF calculation
  const corpus: string[][] = [];

  // Extract text from summaries (keywords + tags + content)
  const summaryTexts: string[] = [];
  for (const summary of summaries) {
    const text = [
      summary.keywords?.join(' ') || '',
      summary.tags?.join(' ') || '',
      summary.summary || '',
      summary.title || '',
    ].join(' ');
    if (text.trim()) {
      summaryTexts.push(text);
      corpus.push(tokenize(text));
    }
  }

  // Extract text from subscriptions (name + category)
  const subTexts: string[] = [];
  for (const sub of subscriptions) {
    const text = [sub.name, sub.category || ''].join(' ');
    if (text.trim()) {
      subTexts.push(text);
      corpus.push(tokenize(text));
    }
  }

  // Extract text from articles (title + description)
  const articleTexts: string[] = [];
  for (const article of articles.slice(0, 100)) { // Limit to latest 100
    const text = [article.title, article.description || ''].join(' ');
    if (text.trim()) {
      articleTexts.push(text);
      corpus.push(tokenize(text));
    }
  }

  // Build global IDF
  const globalIDF = buildIDF(corpus);

  // Aggregate TF-IDF scores across all documents
  const aggregatedTFIDF: TermFrequency = {};

  // Process summaries with higher weight
  for (const text of summaryTexts) {
    const tokens = tokenize(text);
    const tf = calculateTF(tokens);
    const tfidf = calculateTFIDF(tf, globalIDF);
    const weight = 3; // Summary weight (starred gets extra in caller)
    for (const term of Object.keys(tfidf)) {
      aggregatedTFIDF[term] = (aggregatedTFIDF[term] || 0) + tfidf[term] * weight;
    }
  }

  // Process subscriptions
  for (const text of subTexts) {
    const tokens = tokenize(text);
    const tf = calculateTF(tokens);
    const tfidf = calculateTFIDF(tf, globalIDF);
    const weight = 1;
    for (const term of Object.keys(tfidf)) {
      aggregatedTFIDF[term] = (aggregatedTFIDF[term] || 0) + tfidf[term] * weight;
    }
  }

  // Process articles
  for (const text of articleTexts) {
    const tokens = tokenize(text);
    const tf = calculateTF(tokens);
    const tfidf = calculateTFIDF(tf, globalIDF);
    const weight = 1;
    for (const term of Object.keys(tfidf)) {
      aggregatedTFIDF[term] = (aggregatedTFIDF[term] || 0) + tfidf[term] * weight;
    }
  }

  // Normalize scores
  const maxScore = Math.max(...Object.values(aggregatedTFIDF), 1);

  // Get top keywords
  const topKeywords = Object.entries(aggregatedTFIDF)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([keyword, weight]) => ({
      keyword,
      weight: weight / maxScore,
    }));

  // Get top categories from subscriptions
  const categoryCount: Record<string, number> = {};
  subscriptions.filter(s => s.enabled).forEach(s => {
    const cat = s.category || '未分类';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  // Get top feeds by article count
  const articleCount: Record<string, number> = {};
  articles.forEach(a => {
    articleCount[a.subscriptionId] = (articleCount[a.subscriptionId] || 0) + 1;
  });
  const topFeedIds = Object.entries(articleCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);
  const topFeeds = topFeedIds.filter(id => id); // Keep as IDs, will resolve to names in UI

  return {
    topKeywords,
    topCategories,
    topFeeds,
    updatedAt: Date.now(),
  };
}

// Simple cosine similarity between two keyword vectors
export function cosineSimilarity(
  vecA: Array<{ keyword: string; weight: number }>,
  vecB: Array<{ keyword: string; weight: number }>
): number {
  const mapA = new Map(vecA.map(v => [v.keyword, v.weight]));
  const mapB = new Map(vecB.map(v => [v.keyword, v.weight]));

  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const key of allKeys) {
    const a = mapA.get(key) || 0;
    const b = mapB.get(key) || 0;
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}
