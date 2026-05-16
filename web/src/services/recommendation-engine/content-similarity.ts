// Content Similarity - TF-IDF + Cosine Similarity for subscription recommendation
import type { Subscription } from '../../types';

// Stop words for text processing
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

interface TermFrequencyMap {
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
function calculateTF(tokens: string[]): TermFrequencyMap {
  const tf: TermFrequencyMap = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  return tf;
}

// Build TF-IDF vector for a document
export function buildTFIDFVector(text: string, idf: Record<string, number>): TermFrequencyMap {
  const tokens = tokenize(text);
  const tf = calculateTF(tokens);
  const tfidf: TermFrequencyMap = {};
  
  for (const term of Object.keys(tf)) {
    tfidf[term] = tf[term] * (idf[term] || 1);
  }
  
  return tfidf;
}

// Build IDF from a corpus of documents
export function buildIDF(corpus: string[]): Record<string, number> {
  const documents = corpus.map(doc => tokenize(doc));
  const docCount = documents.length;
  
  if (docCount === 0) return {};
  
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
  
  const idf: Record<string, number> = {};
  for (const term of Object.keys(docFreq)) {
    idf[term] = Math.log((docCount + 1) / (docFreq[term] + 1)) + 1;
  }
  
  return idf;
}

// Cosine similarity between two vectors
export function cosineSimilarity(
  vecA: TermFrequencyMap,
  vecB: TermFrequencyMap
): number {
  const allTerms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  
  for (const term of allTerms) {
    const a = vecA[term] || 0;
    const b = vecB[term] || 0;
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  }
  
  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// Calculate content similarity between two subscriptions
export function calculateSubscriptionSimilarity(
  subA: Pick<Subscription, 'name' | 'category' | 'description'>,
  subB: Pick<Subscription, 'name' | 'category' | 'description'>,
  idf: Record<string, number>
): number {
  // Build text from subscription metadata
  const textA = `${subA.name} ${subA.category || ''} ${subA.description || ''}`;
  const textB = `${subB.name} ${subB.category || ''} ${subB.description || ''}`;
  
  const vecA = buildTFIDFVector(textA, idf);
  const vecB = buildTFIDFVector(textB, idf);
  
  return cosineSimilarity(vecA, vecB);
}

// Score a candidate subscription against user interest profile
export function scoreCandidateAgainstProfile(
  candidate: Pick<Subscription, 'name' | 'category' | 'description'>,
  userKeywords: Array<{ keyword: string; weight: number }>,
  userCategories: string[]
): { score: number; matchedKeywords: string[] } {
  const matched: string[] = [];
  let score = 0;
  
  const candidateText = `${candidate.name} ${candidate.category || ''} ${candidate.description || ''}`.toLowerCase();
  const candidateKeywords = new Set(tokenize(candidateText));
  
  // Check keyword matches
  for (const { keyword, weight } of userKeywords) {
    if (candidateKeywords.has(keyword.toLowerCase()) || candidateText.includes(keyword.toLowerCase())) {
      matched.push(keyword);
      score += weight * 2;
    }
  }
  
  // Check category match
  if (candidate.category && userCategories.includes(candidate.category)) {
    score += 3;
  }
  
  return {
    score,
    matchedKeywords: [...new Set(matched)].slice(0, 5),
  };
}
