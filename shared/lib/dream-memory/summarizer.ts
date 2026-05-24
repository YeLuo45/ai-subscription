/**
 * Lightweight Summarizer - Keyword extraction based summary (non-LLM)
 * 
 * Features:
 * - Extract summary from content (first 100 chars)
 * - Extract key points using TF-IDF style noun/verb phrases (max 5)
 * - Sentiment analysis using keyword dictionary
 */

export interface SummarizerResult {
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

// Positive keywords for sentiment analysis
const POSITIVE_KEYWORDS = [
  'great', 'amazing', 'excellent', 'good', 'wonderful', 'fantastic', 'awesome',
  'best', 'love', 'like', 'happy', 'success', 'successful', 'impressive',
  'brilliant', 'outstanding', 'perfect', 'beautiful', 'nice', 'enjoy',
  'breakthrough', 'innovative', 'revolutionary', 'game-changer', 'helpful'
];

// Negative keywords for sentiment analysis
const NEGATIVE_KEYWORDS = [
  'bad', 'poor', 'boring', 'terrible', 'awful', 'worst', 'hate', 'dislike',
  'fail', 'failed', 'failure', 'disappointing', 'disappointment', 'sad',
  'wrong', 'error', 'bug', 'issue', 'problem', 'broken', 'crash', 'crash',
  'slow', 'boring', 'annoying', 'frustrating', 'useless', 'waste'
];

// Common stop words to filter out
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'any', 'no', 'not', 'only', 'same', 'so', 'than', 'too',
  'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once', 'if'
]);

/**
 * Extract words from text
 */
function extractWords(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Calculate word frequency
 */
function calculateFrequency(words: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  return freq;
}

/**
 * Extract noun/verb phrases (simple chunking)
 */
function extractPhrases(text: string): string[] {
  const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/);
  const phrases: string[] = [];
  
  // Extract 2-3 word phrases
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i].length > 2 && !STOP_WORDS.has(words[i])) {
      if (words[i + 1].length > 2 && !STOP_WORDS.has(words[i + 1])) {
        phrases.push(`${words[i]} ${words[i + 1]}`);
      }
    }
  }
  
  // Extract 3-word phrases
  for (let i = 0; i < words.length - 2; i++) {
    if (words[i].length > 2 && !STOP_WORDS.has(words[i])) {
      if (words[i + 1].length > 2 && !STOP_WORDS.has(words[i + 1])) {
        if (words[i + 2].length > 2 && !STOP_WORDS.has(words[i + 2])) {
          phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
        }
      }
    }
  }
  
  return phrases;
}

/**
 * Calculate TF-IDF style scores for phrases
 */
function scorePhrases(phrases: string[], freq: Map<string, number>): Map<string, number> {
  const scores = new Map<string, number>();
  const total = phrases.length || 1;
  
  // Count phrase frequency
  const phraseFreq = new Map<string, number>();
  for (const phrase of phrases) {
    phraseFreq.set(phrase, (phraseFreq.get(phrase) || 0) + 1);
  }
  
  // Score each phrase (frequency * length factor)
  for (const [phrase, count] of phraseFreq) {
    const lengthFactor = phrase.split(' ').length;
    const idf = Math.log(total / (count + 1)) + 1;
    scores.set(phrase, count * lengthFactor * idf);
  }
  
  return scores;
}

/**
 * Detect sentiment from keywords
 */
function detectSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const words = text.toLowerCase().split(/\s+/);
  const textStr = text.toLowerCase();
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const keyword of POSITIVE_KEYWORDS) {
    if (textStr.includes(keyword)) {
      positiveCount++;
    }
  }
  
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (textStr.includes(keyword)) {
      negativeCount++;
    }
  }
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

/**
 * Summarize article content
 * @param title - Article title
 * @param content - Article content body
 * @returns SummarizerResult with summary, keyPoints, and sentiment
 */
export function summarizeArticle(title: string, content: string): SummarizerResult {
  // 1. Generate summary (first 100 characters of content)
  const cleanContent = content.replace(/\s+/g, ' ').trim();
  const summary = cleanContent.slice(0, 100) + (cleanContent.length > 100 ? '...' : '');
  
  // 2. Extract key points using TF-IDF style scoring
  const words = extractWords(cleanContent);
  const freq = calculateFrequency(words);
  const phrases = extractPhrases(cleanContent);
  const scores = scorePhrases(phrases, freq);
  
  // Get top scored phrases, sorted by score descending
  const sortedPhrases = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase]) => phrase);
  
  // If not enough phrases, add high frequency words
  if (sortedPhrases.length < 5) {
    const sortedWords = Array.from(freq.entries())
      .filter(([word]) => word.length > 4)
      .sort((a, b) => b[1] - a[1]);
    
    for (const [word] of sortedWords) {
      if (sortedPhrases.length >= 5) break;
      const phrase = word.charAt(0).toUpperCase() + word.slice(1);
      if (!sortedPhrases.includes(phrase)) {
        sortedPhrases.push(phrase);
      }
    }
  }
  
  // 3. Detect sentiment
  const sentiment = detectSentiment(title + ' ' + cleanContent);
  
  return {
    summary,
    keyPoints: sortedPhrases.slice(0, 5),
    sentiment,
  };
}

/**
 * Summarize article with title only (minimal summary)
 */
export function summarizeTitle(title: string): SummarizerResult {
  const sentiment = detectSentiment(title);
  
  // Extract key words from title
  const words = extractWords(title);
  const keyPoints = words.slice(0, 5).map(w => w.charAt(0).toUpperCase() + w.slice(1));
  
  return {
    summary: title.slice(0, 100),
    keyPoints,
    sentiment,
  };
}