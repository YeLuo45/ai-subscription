/**
 * API Service - Business logic for API key management and data operations
 */

import * as apiDB from '../db/apiDB';
import type { ApiKey, ApiLog } from '../db/apiDB';

// ============================================================
// API Key Management
// ============================================================

export async function createApiKey(name: string): Promise<ApiKey> {
  return apiDB.createApiKey(name);
}

export async function getAllApiKeys(): Promise<ApiKey[]> {
  return apiDB.getAllApiKeys();
}

export async function revokeApiKey(id: string): Promise<void> {
  return apiDB.revokeApiKey(id);
}

export async function validateApiKey(key: string): Promise<ApiKey | null> {
  const apiKey = await apiDB.getApiKeyByKey(key);
  if (!apiKey || apiKey.revoked) {
    return null;
  }
  // Update last used timestamp
  await apiDB.updateApiKeyLastUsed(apiKey.id);
  return apiKey;
}

// ============================================================
// API Logs
// ============================================================

export async function addApiLog(log: Omit<ApiLog, 'id'>): Promise<void> {
  return apiDB.addApiLog(log);
}

export async function getApiLogs(keyId?: string, limit?: number): Promise<ApiLog[]> {
  return apiDB.getApiLogs(keyId, limit);
}

// ============================================================
// API Response Helpers
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total: number;
    page: number;
    perPage: number;
  };
}

export function successResponse<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
  return {
    success: true,
    data,
    meta,
  };
}

export function errorResponse(message: string, statusCode = 400): { success: false; error: string; statusCode: number } {
  return {
    success: false,
    error: message,
    statusCode,
  };
}

// ============================================================
// Mock Data Helpers (for demo - replace with real IndexedDB data)
// ============================================================

// Mock feeds data
export const mockFeeds = [
  { id: 'feed1', title: '科技资讯', url: 'https://tech.example.com', description: '科技行业新闻', articleCount: 128, createdAt: Date.now() - 86400000 * 30 },
  { id: 'feed2', title: '前端开发', url: 'https://dev.example.com', description: '前端技术文章', articleCount: 86, createdAt: Date.now() - 86400000 * 20 },
  { id: 'feed3', title: '财经分析', url: 'https://finance.example.com', description: '金融市场分析', articleCount: 54, createdAt: Date.now() - 86400000 * 10 },
];

// Mock articles data
export const mockArticles = [
  { 
    id: 'art1', 
    feedId: 'feed1', 
    title: 'AI技术的最新发展趋势', 
    url: 'https://tech.example.com/ai-trends',
    summary: '人工智能技术正在快速发展，特别是大语言模型和生成式AI领域...',
    author: '张三',
    publishedAt: Date.now() - 3600000 * 2,
    read: false,
    tags: ['AI', '技术'],
  },
  { 
    id: 'art2', 
    feedId: 'feed1', 
    title: '新一代芯片技术解析', 
    url: 'https://tech.example.com/chip-tech',
    summary: '芯片技术正在迎来新的突破，3nm工艺已经开始量产...',
    author: '李四',
    publishedAt: Date.now() - 3600000 * 5,
    read: true,
    tags: ['芯片', '硬件'],
  },
  { 
    id: 'art3', 
    feedId: 'feed2', 
    title: 'React 19新特性详解', 
    url: 'https://dev.example.com/react-19',
    summary: 'React 19引入了许多新特性，包括Actions、use() Hook等...',
    author: '王五',
    publishedAt: Date.now() - 3600000 * 8,
    read: false,
    tags: ['React', '前端'],
  },
];

// Mock tags data
export const mockTags = [
  { id: 'tag1', name: 'AI', color: '#1890ff', type: 'topic' },
  { id: 'tag2', name: '技术', color: '#52c41a', type: 'topic' },
  { id: 'tag3', name: '芯片', color: '#faad14', type: 'topic' },
  { id: 'tag4', name: '前端', color: '#722ed1', type: 'topic' },
  { id: 'tag5', name: 'React', color: '#13c2c2', type: 'topic' },
];

// ============================================================
// Data Query Functions
// ============================================================

export function getFeeds() {
  return mockFeeds;
}

export function getFeedArticles(feedId: string, page = 1, perPage = 20) {
  const articles = mockArticles.filter(a => a.feedId === feedId);
  const total = articles.length;
  const start = (page - 1) * perPage;
  const paginated = articles.slice(start, start + perPage);
  
  return {
    items: paginated,
    total,
    page,
    perPage,
  };
}

export function getArticleById(articleId: string) {
  return mockArticles.find(a => a.id === articleId) || null;
}

export function getTags() {
  return mockTags;
}

export function searchArticles(query: string, page = 1, perPage = 20) {
  const q = query.toLowerCase();
  const articles = mockArticles.filter(a => 
    a.title.toLowerCase().includes(q) || 
    a.summary.toLowerCase().includes(q) ||
    a.tags.some(t => t.toLowerCase().includes(q))
  );
  
  const total = articles.length;
  const start = (page - 1) * perPage;
  const paginated = articles.slice(start, start + perPage);
  
  return {
    items: paginated,
    total,
    page,
    perPage,
  };
}
