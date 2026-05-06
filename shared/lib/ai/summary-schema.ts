import { z } from 'zod';

export const SENTIMENT_LABELS = ['positive', 'negative', 'neutral', 'shocking', 'inspiring'] as const;
export type Sentiment = typeof SENTIMENT_LABELS[number];

export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  positive: '#52c41a',
  negative: '#ff4d4f',
  neutral: '#999',
  shocking: '#fa8c16',
  inspiring: '#1890ff',
};

export const SENTIMENT_LABELS_CN: Record<Sentiment, string> = {
  positive: '正面',
  negative: '负面',
  neutral: '中性',
  shocking: '震惊',
  inspiring: '启发',
};

export const summarySchema = z.object({
  generated_title: z.string().min(1).max(100).describe('AI生成的优质标题（15-30字，不复述原文）'),
  key_points: z.array(z.string()).min(3).max(3).describe('3个关键信息点（推理/延伸洞察，非原文复述）'),
  sentiment: z.enum(SENTIMENT_LABELS).describe('情感标签'),
  summary: z.string().min(1).max(30).describe('30字内的一句话概括'),
});

export interface StructuredSummary {
  generatedTitle: string;
  keyPoints: string[];
  sentiment: Sentiment;
  oneLineSummary: string;
}

export interface ArticleSummary {
  originalTitle: string;
  generatedTitle: string;
  keyPoints: string[];
  sentiment: Sentiment;
  oneLineSummary: string;
  isManuallyEdited?: boolean;
  updatedAt?: number;
}

export function parseStructuredSummary(text: string): StructuredSummary | null {
  try {
    // Try to extract JSON from the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]);
    const result = summarySchema.safeParse(parsed);
    
    if (!result.success) {
      // Try with snake_case keys
      const mapped = {
        generated_title: parsed.generated_title || parsed.generatedTitle,
        key_points: parsed.key_points || parsed.keyPoints,
        sentiment: parsed.sentiment,
        summary: parsed.summary,
      };
      const result2 = summarySchema.safeParse(mapped);
      if (!result2.success) return null;
      return {
        generatedTitle: result2.data.generated_title,
        keyPoints: result2.data.key_points,
        sentiment: result2.data.sentiment,
        oneLineSummary: result2.data.summary,
      };
    }
    
    return {
      generatedTitle: result.data.generated_title,
      keyPoints: result.data.key_points,
      sentiment: result.data.sentiment,
      oneLineSummary: result.data.summary,
    };
  } catch {
    return null;
  }
}
