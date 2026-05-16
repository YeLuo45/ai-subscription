/**
 * Workflow Executor - Executes workflow actions
 * Handles: ai-process, send-notification, tag-article, http-request
 */

import type { Action, ArticleContext, WorkflowExecutionLog } from './types';
import { isAIAction, isNotificationAction, isTagAction, isHttpRequestAction } from './types';
import * as workflowDB from '../../db/workflowDB';
import { getPushChannelService } from '../../../../shared/lib/ai/push-channel';

// ============================================================
// Variable Substitution
// ============================================================

export function buildVariables(ctx: ArticleContext): Record<string, string> {
  return {
    title: ctx.title,
    source: ctx.subscriptionName || ctx.feedName || '',
    url: ctx.link || '',
    summary: ctx.summary || '',
    content: (ctx.content || ctx.description || '').slice(0, 500),
    category: ctx.category || '',
    tags: ctx.tags?.join(', ') || '',
    summaryTags: ctx.summaryTags?.join(', ') || '',
    pubDate: ctx.pubDate || new Date().toISOString(),
    articleId: ctx.articleId,
  };
}

export function substituteTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? match);
}

// ============================================================
// HTTP Request Execution
// ============================================================

async function executeHttpRequest(
  action: Action,
  variables: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const method = action.method || 'GET';
  const url = substituteTemplate(action.url || '', variables);
  const headers = action.headers || {};
  const bodyTemplate = action.body;
  const timeout = action.timeout || 30000;
  const retries = action.retry || 0;

  // Substitute variables in body
  const body = bodyTemplate ? substituteTemplate(bodyTemplate, variables) : JSON.stringify(variables);

  // Add Content-Type if not set
  if (!headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  let lastError = '';

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' ? body : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        return { success: true };
      }

      lastError = `HTTP ${response.status}: ${response.statusText}`;
    } catch (err: any) {
      lastError = err?.message || String(err);
    }

    if (attempt < retries) {
      await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
    }
  }

  return { success: false, error: lastError };
}

// ============================================================
// AI Process Execution
// ============================================================

async function executeAIAction(
  action: Action,
  ctx: ArticleContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const { routeAndCall } = await import('../../../../shared/lib/ai/llm-router');
    
    const taskType = action.taskType || 'structured-summary';
    const processType = action.processType || 'article';
    
    // Build prompt based on task type
    let prompt = '';
    const content = ctx.content || ctx.description || '';
    
    switch (taskType) {
      case 'structured-summary':
        prompt = `请为以下文章生成结构化摘要：

标题：${ctx.title}
内容：${content.slice(0, 2000)}

请按以下格式输出：
## 要点
- 要点1
- 要点2

## 关键词
- 关键词1
- 关键词2

## 一句话总结
[一句话总结]`;
        break;
      case 'tag-generation':
        prompt = `分析以下文章，生成3-5个标签（主题标签、形式标签、情绪标签各选1-2个）：

标题：${ctx.title}
内容：${content.slice(0, 1000)}

标签应该是简短的词汇（2-4字），只返回标签名，用逗号分隔。`;
        break;
      case 'translation':
        prompt = `翻译以下文章内容为中文：

标题：${ctx.title}
内容：${content.slice(0, 1500)}`;
        break;
      default:
        return { success: false, error: `Unknown task type: ${taskType}` };
    }

    const result = await routeAndCall({
      taskType,
      messages: [{ role: 'user' as const, content: prompt }],
      temperature: 0.7,
      maxTokens: 1000,
    });

    console.log(`[WorkflowExecutor] AI action completed for article ${ctx.articleId}:`, result.text?.slice(0, 100));
    return { success: true };
  } catch (err) {
    console.error('[WorkflowExecutor] AI action failed:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================
// Send Notification Execution
// ============================================================

async function executeNotificationAction(
  action: Action,
  ctx: ArticleContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const service = getPushChannelService();
    const channels = await service.getChannels();
    const channel = channels.find(c => c.name === action.channel);
    
    if (!channel) {
      return { success: false, error: `Channel not found: ${action.channel}` };
    }

    if (!channel.enabled) {
      return { success: false, error: `Channel is disabled: ${action.channel}` };
    }

    const template = action.template || '{{title}} - {{summary}}';
    const variables = buildVariables(ctx);
    const message = substituteTemplate(template, variables);

    // Send to appropriate channel
    switch (action.channel) {
      case 'telegram': {
        const config = channel.config as { botToken: string; chatId: string };
        const { sendTelegram } = await import('../../../../shared/lib/ai/push-channel');
        await sendTelegram(config.botToken, config.chatId, message);
        break;
      }
      case 'email': {
        const config = channel.config as { smtpHost: string; smtpPort: number; smtpUser: string; smtpPassword: string; fromAddress: string; toAddresses: string[] };
        const { sendEmail } = await import('../../../../shared/lib/ai/push-channel');
        await sendEmail(config, message, message);
        break;
      }
      case 'webhook': {
        const { sendWebPush } = await import('../../../../shared/lib/ai/push-channel');
        await sendWebPush(message, { title: ctx.title, body: message });
        break;
      }
    }

    console.log(`[WorkflowExecutor] Notification sent via ${action.channel} for article ${ctx.articleId}`);
    return { success: true };
  } catch (err) {
    console.error('[WorkflowExecutor] Notification action failed:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================
// Tag Article Execution
// ============================================================

async function executeTagAction(
  action: Action,
  ctx: ArticleContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const { getTagsForArticle, addTagToArticle, removeTagFromArticle, getAllTags, saveTag: saveTagToDb } = await import('../tagService');
    
    const currentTags = await getTagsForArticle(ctx.articleId);
    const currentTagNames = currentTags.map(t => t.name);
    const targetTags = action.tags || [];
    const mode = action.mode || 'add';

    switch (mode) {
      case 'add':
        for (const tagName of targetTags) {
          if (!currentTagNames.includes(tagName)) {
            // Find or create tag
            let tag = (await getAllTags()).find(t => t.name === tagName);
            if (!tag) {
              tag = {
                id: `tag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                name: tagName,
                color: '#1890ff',
                type: 'custom',
                createdAt: Date.now(),
              };
              await saveTagToDb(tag);
            }
            await addTagToArticle(ctx.articleId, tag.id, 'workflow');
          }
        }
        break;
      case 'remove':
        for (const tagName of targetTags) {
          const tag = currentTags.find(t => t.name === tagName);
          if (tag) {
            await removeTagFromArticle(ctx.articleId, tag.id);
          }
        }
        break;
      case 'replace':
        // Remove all current tags and add new ones
        for (const tag of currentTags) {
          await removeTagFromArticle(ctx.articleId, tag.id);
        }
        for (const tagName of targetTags) {
          let tag = (await getAllTags()).find(t => t.name === tagName);
          if (!tag) {
            tag = {
              id: `tag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              name: tagName,
              color: '#1890ff',
              type: 'custom',
              createdAt: Date.now(),
            };
            await saveTagToDb(tag);
          }
          await addTagToArticle(ctx.articleId, tag.id, 'workflow');
        }
        break;
    }

    console.log(`[WorkflowExecutor] Tag action ${mode} completed for article ${ctx.articleId}:`, targetTags);
    return { success: true };
  } catch (err) {
    console.error('[WorkflowExecutor] Tag action failed:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================
// Main Executor
// ============================================================

export async function executeAction(
  workflowId: string,
  workflowName: string,
  action: Action,
  ctx: ArticleContext,
  actionIndex: number
): Promise<{ success: boolean; error?: string; duration?: number }> {
  const startTime = Date.now();
  const variables = buildVariables(ctx);
  
  let result: { success: boolean; error?: string } = { success: false, error: 'Unknown action type' };

  try {
    if (isAIAction(action)) {
      result = await executeAIAction(action, ctx);
    } else if (isNotificationAction(action)) {
      result = await executeNotificationAction(action, ctx);
    } else if (isTagAction(action)) {
      result = await executeTagAction(action, ctx);
    } else if (isHttpRequestAction(action)) {
      result = await executeHttpRequest(action, variables);
    }
  } catch (err) {
    result = { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  const duration = Date.now() - startTime;

  // Log execution
  const logEntry: Omit<WorkflowExecutionLog, 'id'> = {
    workflowId,
    workflowName,
    instanceId: `inst_${Date.now()}`,
    articleId: ctx.articleId,
    articleTitle: ctx.title,
    actionType: action.type,
    actionIndex,
    success: result.success,
    error: result.error,
    duration,
    timestamp: Date.now(),
  };

  try {
    await workflowDB.saveWorkflowLog(logEntry as any);
  } catch (err) {
    console.error('[WorkflowExecutor] Failed to save log:', err);
  }

  return { ...result, duration };
}

export async function executeActions(
  workflowId: string,
  workflowName: string,
  actions: Action[],
  ctx: ArticleContext
): Promise<{ success: boolean; error?: string }> {
  let hasError = false;
  let lastError: string | undefined;

  for (let i = 0; i < actions.length; i++) {
    const result = await executeAction(workflowId, workflowName, actions[i], ctx, i);
    if (!result.success) {
      hasError = true;
      lastError = result.error;
      console.error(`[WorkflowExecutor] Action ${i} failed:`, result.error);
    }
  }

  return { success: !hasError, error: lastError };
}