/**
 * Tag Types and Constants
 */

export interface Tag {
  id: string;
  name: string;
  color: string;
  type: 'topic' | 'format' | 'sentiment';
  createdAt: number;
  updatedAt: number;
}

export interface ArticleTag {
  id: string;
  articleId: string;
  tagId: string;
  source: 'ai' | 'manual';
  createdAt: number;
}

export interface FeedTag {
  id: string;
  feedId: string;
  tagId: string;
  source: 'ai' | 'manual';
  createdAt: number;
}

// Preset colors for tags
export const TAG_COLORS = [
  '#1890ff', // blue
  '#52c41a', // green
  '#faad14', // orange
  '#f5222d', // red
  '#722ed1', // purple
  '#13c2c2', // cyan
  '#eb2f96', // pink
  '#fa8c16', // lime
] as const;

export type TagColor = typeof TAG_COLORS[number];

export const TAG_TYPE_LABELS = {
  topic: '主题',
  format: '形式',
  sentiment: '情绪',
} as const;

export function generateTagId(): string {
  return `tag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createTag(params: {
  name: string;
  color: string;
  type: Tag['type'];
}): Tag {
  const now = Date.now();
  return {
    id: generateTagId(),
    name: params.name,
    color: params.color,
    type: params.type,
    createdAt: now,
    updatedAt: now,
  };
}
