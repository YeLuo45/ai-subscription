// AI Chat Service - Natural language interface for subscription management
import type { AIModel } from '../types';
import { getSubscriptions, getArticles, getModels } from './storage';
import { summarizeWithFallback } from './aiAdapter';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const CHAT_STORAGE_KEY = 'ai-subscription-chat-history';
const MAX_SESSION_MESSAGES = 50;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============ Storage ============

export function saveChatHistory(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('[ChatService] Failed to save chat history:', error);
  }
}

export function loadChatHistory(): ChatSession[] {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[ChatService] Failed to load chat history:', error);
  }
  return [];
}

export function createNewSession(): ChatSession {
  return {
    id: generateId(),
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ============ Query Understanding ============

interface QueryResult {
  response: string;
  actions?: string[];
}

async function handleSubscriptionQuery(query: string): Promise<QueryResult> {
  const lowerQuery = query.toLowerCase();
  const subscriptions = await getSubscriptions();
  const articles = await getArticles();
  
  // Unread count query
  if (lowerQuery.includes('未读') || lowerQuery.includes('unread')) {
    const unreadCount = articles.filter(a => !a.isRead).length;
    const unreadBySource = subscriptions.map(sub => {
      const subArticles = articles.filter(a => a.subscriptionId === sub.id);
      const unread = subArticles.filter(a => !a.isRead).length;
      return { name: sub.name, unread };
    }).filter(s => s.unread > 0);
    
    let response = `当前共有 ${unreadCount} 篇未读文章。\n`;
    if (unreadBySource.length > 0) {
      response += '\n各订阅源未读情况：\n';
      unreadBySource.slice(0, 5).forEach(s => {
        response += `- ${s.name}: ${s.unread} 篇\n`;
      });
    }
    return { response };
  }
  
  // Subscription count query
  if (lowerQuery.includes('订阅') && (lowerQuery.includes('多少') || lowerQuery.includes('数量') || lowerQuery.includes('统计'))) {
    const enabledCount = subscriptions.filter(s => s.enabled).length;
    const totalCount = subscriptions.length;
    const categories = Array.from(new Set(subscriptions.map(s => s.category)));
    
    let response = `当前共有 ${totalCount} 个订阅源，其中 ${enabledCount} 个已启用。\n`;
    response += `涵盖 ${categories.length} 个分类：${categories.slice(0, 5).join('、')}${categories.length > 5 ? '等' : ''}`;
    return { response };
  }
  
  // Article count query
  if (lowerQuery.includes('文章') && (lowerQuery.includes('多少') || lowerQuery.includes('总数'))) {
    const totalCount = articles.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = articles.filter(a => new Date(a.fetchedAt) >= today).length;
    
    let response = `文章库共有 ${totalCount} 篇文章。\n`;
    response += `其中今天抓取了 ${todayCount} 篇。`;
    return { response };
  }
  
  // Recent articles query
  if (lowerQuery.includes('最近') || lowerQuery.includes('最新')) {
    const sorted = [...articles].sort((a, b) => 
      new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    ).slice(0, 5);
    
    let response = '最新文章：\n';
    sorted.forEach((article, i) => {
      response += `${i + 1}. ${article.title}\n`;
      response += `   来源: ${subscriptions.find(s => s.id === article.subscriptionId)?.name || '未知'}\n`;
      response += `   时间: ${new Date(article.pubDate).toLocaleString()}\n\n`;
    });
    return { response };
  }
  
  // Starred articles query
  if (lowerQuery.includes('收藏') || lowerQuery.includes('星标')) {
    const starred = articles.filter(a => a.isStarred);
    let response = `共有 ${starred.length} 篇收藏文章。\n\n`;
    starred.slice(0, 5).forEach((article, i) => {
      response += `${i + 1}. ${article.title}\n`;
    });
    return { response };
  }
  
  return { response: '' };
}

async function handleRecommendationQuery(query: string): Promise<QueryResult> {
  const lowerQuery = query.toLowerCase();
  
  // AI related content recommendation
  if (lowerQuery.includes('推荐') || lowerQuery.includes('相关')) {
    const articles = await getArticles();
    const subscriptions = await getSubscriptions();
    
    // Find AI related subscriptions
    const aiKeywords = ['ai', '人工智能', 'machine learning', 'deep learning', 'llm', 'gpt', '大模型'];
    const aiSubs = subscriptions.filter(s => 
      aiKeywords.some(k => s.name.toLowerCase().includes(k) || s.category.toLowerCase().includes(k))
    );
    
    if (aiSubs.length > 0) {
      const aiArticles = articles.filter(a => 
        aiSubs.some(s => s.id === a.subscriptionId)
      ).sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()).slice(0, 5);
      
      let response = '根据你的兴趣，我推荐以下 AI 相关内容：\n\n';
      aiArticles.forEach((article, i) => {
        response += `${i + 1}. ${article.title}\n`;
        response += `   ${article.description?.slice(0, 100)}...\n\n`;
      });
      return { response };
    }
  }
  
  return { response: '' };
}

// ============ AI Summary Handler ============

async function handleSummaryRequest(query: string): Promise<QueryResult> {
  const lowerQuery = query.toLowerCase();
  const summaryKeywords = ['摘要', '总结', 'summarize', 'summary'];
  
  if (!summaryKeywords.some(k => lowerQuery.includes(k))) {
    return { response: '' };
  }
  
  // Extract what user wants summarized
  const articles = await getArticles();
  const models = await getModels();
  const defaultModel = models.find(m => m.isDefault) || models[0];
  
  if (!defaultModel) {
    return { response: '请先在设置中配置 AI 模型。' };
  }
  
  // Get recent articles
  const recentArticles = articles
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 3);
  
  if (recentArticles.length === 0) {
    return { response: '暂无文章可摘要。' };
  }
  
  let response = '正在为最近的文章生成摘要...\n\n';
  
  for (const article of recentArticles) {
    const result = await summarizeWithFallback(
      { title: article.title, content: article.content || '', description: article.description },
      models,
      'medium'
    );
    
    if (result.success) {
      response += `【${article.title}】\n`;
      response += `${result.summary}\n`;
      if (result.keywords.length > 0) {
        response += `关键词: ${result.keywords.join(', ')}\n`;
      }
      response += '\n';
    }
  }
  
  return { response };
}

// ============ Main Chat Handler ============

export async function processUserMessage(
  message: string,
  model: AIModel | null
): Promise<{ content: string; isLoading: boolean }> {
  const lowerMessage = message.toLowerCase().trim();
  
  // Handle different types of queries
  const subResult = await handleSubscriptionQuery(lowerMessage);
  if (subResult.response) {
    return { content: subResult.response, isLoading: false };
  }
  
  const recResult = await handleRecommendationQuery(lowerMessage);
  if (recResult.response) {
    return { content: recResult.response, isLoading: false };
  }
  
  const summaryResult = await handleSummaryRequest(lowerMessage);
  if (summaryResult.response) {
    return { content: summaryResult.response, isLoading: false };
  }
  
  // Default: Use AI model for general conversation
  if (model && model.apiKey) {
    try {
      const response = await fetch(`${model.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`,
        },
        body: JSON.stringify({
          model: model.modelName,
          messages: [
            { 
              role: 'system', 
              content: '你是一个智能订阅助手，可以帮助用户管理RSS订阅、查询文章统计、推荐相关内容。请用中文回答。'
            },
            { role: 'user', content: message }
          ],
          temperature: model.temperature,
          max_tokens: model.maxTokens,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error ${response.status}`);
      }
      
      const data = await response.json();
      return { content: data.choices?.[0]?.message?.content || '抱歉，我无法理解您的问题。', isLoading: false };
    } catch (error) {
      console.error('[ChatService] AI call failed:', error);
      return { 
        content: `抱歉，AI 服务暂时不可用。请稍后重试或检查模型配置。\n\n您也可以尝试询问：\n- 我的订阅统计\n- 有多少未读文章\n- 推荐一些内容`, 
        isLoading: false 
      };
    }
  }
  
  // No model configured
  return {
    content: `您好！我是您的订阅助手，可以帮您：\n\n` +
             `📊 **订阅统计** - 询问"我的订阅有多少？"或"未读文章多少？"\n` +
             `📰 **内容推荐** - 询问"推荐一些内容"或"AI相关的文章"\n` +
             `📝 **文章摘要** - 询问"帮我总结最近的新闻"\n\n` +
             `💡 请先在设置中配置 AI 模型以获得更好的体验。`,
    isLoading: false
  };
}

// ============ Session Management ============

export function addMessageToSession(
  session: ChatSession,
  role: ChatMessage['role'],
  content: string
): ChatSession {
  const newMessage: ChatMessage = {
    id: generateId(),
    role,
    content,
    timestamp: Date.now(),
  };
  
  let messages = [...session.messages, newMessage];
  
  // Keep only last MAX_SESSION_MESSAGES
  if (messages.length > MAX_SESSION_MESSAGES) {
    messages = messages.slice(-MAX_SESSION_MESSAGES);
  }
  
  return {
    ...session,
    messages,
    updatedAt: Date.now(),
  };
}

export function clearSession(session: ChatSession): ChatSession {
  return {
    ...session,
    messages: [],
    updatedAt: Date.now(),
  };
}