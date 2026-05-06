/**
 * Workflow Engine Service
 * Handles rule matching and action execution for automation workflows
 */

import type { WorkflowRule, WorkflowLogEntry } from '../types/workflow';
import type { Article, Summary } from '../types';
import * as workflowDB from '../db/workflowDB';
import * as telegramService from './telegramService';
import { sendWebhook } from '../api/webhook';
import { saveArticle, updateArticle } from './storage';
import { getArticleTags, saveArticleTag } from '../db/indexeddb';
import { getTagById, saveTag } from '../db/indexeddb';
import { getSubscriptions } from './storage';

const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

interface ArticleContext {
  article: Article;
  summary?: Summary;
  subscriptionName?: string;
}

/**
 * Check if an article matches a rule's trigger conditions
 */
function matchesTrigger(rule: WorkflowRule, ctx: ArticleContext): boolean {
  const { trigger } = rule;
  const { article, summary } = ctx;

  switch (trigger.type) {
    case 'article_added':
      // article_added always matches - it's triggered when article is added
      return true;

    case 'keyword_detected':
      if (!trigger.keywords || trigger.keywords.length === 0) return false;
      const textToMatch = `${article.title} ${article.description} ${article.content || ''}`.toLowerCase();
      return trigger.keywords.some(keyword => textToMatch.includes(keyword.toLowerCase()));

    case 'sentiment_match':
      if (!trigger.sentiment || trigger.sentiment.length === 0 || !summary) return false;
      if (!summary.tags || summary.tags.length === 0) return false;
      return trigger.sentiment.some(s => summary.tags.includes(s));

    case 'source_match':
      if (!trigger.sources || trigger.sources.length === 0) return false;
      // Match against subscription ID or name
      const subName = ctx.subscriptionName?.toLowerCase() || '';
      return trigger.sources.some(source => 
        subName.includes(source.toLowerCase()) || 
        article.subscriptionId.includes(source.toLowerCase())
      );

    default:
      return false;
  }
}

/**
 * Check if an article matches a rule's additional conditions
 */
function matchesConditions(rule: WorkflowRule, ctx: ArticleContext): boolean {
  const { conditions } = rule;
  const { article, summary } = ctx;

  // Check minLength condition
  if (conditions.minLength !== undefined) {
    const contentLength = (article.content || article.description || '').length;
    if (contentLength < conditions.minLength) return false;
  }

  // Check tags condition
  if (conditions.tags && conditions.tags.length > 0) {
    // For now, we check if summary tags contain any of the required tags
    // This could be enhanced to check article tags as well
    if (!summary || !summary.tags || summary.tags.length === 0) {
      return false;
    }
    const hasTag = conditions.tags.some(tag => summary.tags.includes(tag));
    if (!hasTag) return false;
  }

  return true;
}

/**
 * Execute a single action for a rule
 */
async function executeAction(
  action: WorkflowRule['actions'][0],
  ctx: ArticleContext
): Promise<{ success: boolean; error?: string }> {
  const { article, summary } = ctx;

  // Build variable substitution map for message templates
  const variables: Record<string, string> = {
    title: article.title,
    source: ctx.subscriptionName || '',
    url: article.link,
    generated_title: summary?.content?.slice(0, 100) || article.title,
    sentiment: summary?.tags?.join(', ') || '',
    key_points: summary?.content || '',
  };

  function substituteTemplate(template: string): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match);
  }

  try {
    switch (action.type) {
      case 'add_tag': {
        const tagName = action.params.tag as string;
        if (!tagName) return { success: false, error: 'Missing tag name' };

        // Ensure tag exists
        const allTags = await getAllTags();
        let tag = allTags.find(t => t.name === tagName);
        if (!tag) {
          tag = { id: `tag_${Date.now()}`, name: tagName, type: 'custom', createdAt: Date.now() };
          await saveTag(tag);
        }

        // Add tag to article via summary tags
        if (summary) {
          const updatedSummary = {
            ...summary,
            tags: [...(summary.tags || []), tagName],
          };
          const { updateSummary } = await import('./storage');
          await updateSummary(updatedSummary);
        }
        return { success: true };
      }

      case 'send_telegram': {
        const message = substituteTemplate(action.params.message as string || '');
        const botToken = action.params.botToken as string;
        const chatId = action.params.chatId as string;
        
        if (!botToken || !chatId) {
          return { success: false, error: 'Telegram bot token or chat ID not configured' };
        }

        return await telegramService.sendTelegramMessage(botToken, chatId, message);
      }

      case 'send_webhook': {
        const url = action.params.url as string;
        const body = action.params.body as Record<string, any>;
        
        if (!url) {
          return { success: false, error: 'Webhook URL not configured' };
        }

        const payload = {
          ...body,
          article: {
            title: article.title,
            url: article.link,
            description: article.description,
            source: ctx.subscriptionName || '',
          },
          summary: summary?.content,
          tags: summary?.tags,
          triggeredAt: new Date().toISOString(),
        };

        const headers = (action.params.headers as Record<string, string>) || {};
        return await sendWebhook(url, payload as any, headers);
      }

      case 'mark_starred': {
        const { updateArticle: ua } = await import('./storage');
        await ua({ ...article, isStarred: true });
        return { success: true };
      }

      case 'add_to_list': {
        const listId = action.params.listId as string;
        if (!listId) return { success: false, error: 'List ID not configured' };

        const { updateArticle: ua } = await import('./storage');
        await ua({ ...article, isReadLater: true, readLaterAt: new Date().toISOString() });
        return { success: true };
      }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}

// Need to import getAllTags and saveTag
async function getAllTags() {
  const { getAllTags: getTags } = await import('../db/indexeddb');
  return getTags();
}

/**
 * Process a single rule against an article
 */
async function processRule(
  rule: WorkflowRule,
  ctx: ArticleContext
): Promise<void> {
  // Check if rule is enabled
  if (!rule.enabled) return;

  // Check debounce - prevent same rule from firing on same article within 5 minutes
  const isRecent = await workflowDB.isRuleExecutedRecently(rule.id, ctx.article.id, DEBOUNCE_MS);
  if (isRecent) return;

  // Check trigger match
  if (!matchesTrigger(rule, ctx)) return;

  // Check additional conditions
  if (!matchesConditions(rule, ctx)) return;

  // Execute all actions sequentially (failures don't stop subsequent actions)
  for (const action of rule.actions) {
    const result = await executeAction(action, ctx);

    // Log the action execution
    await workflowDB.saveLog({
      ruleId: rule.id,
      ruleName: rule.name,
      articleId: ctx.article.id,
      articleTitle: ctx.article.title,
      actionType: action.type,
      success: result.success,
      error: result.error,
      timestamp: Date.now(),
    });
  }
}

/**
 * Main entry point: Process an article through all enabled rules
 * This is called asynchronously and does not block the main flow
 */
export async function processArticleForRules(
  article: Article,
  summary?: Summary
): Promise<void> {
  // Don't await - run in background
  setTimeout(async () => {
    try {
      // Get subscription name for context
      let subscriptionName: string | undefined;
      try {
        const subs = await getSubscriptions();
        const sub = subs.find(s => s.id === article.subscriptionId);
        subscriptionName = sub?.name;
      } catch (e) {
        // Subscription lookup is optional
      }

      const ctx: ArticleContext = { article, summary, subscriptionName };

      // Get all enabled rules
      const rules = await workflowDB.getEnabledRules();

      // Process each rule
      for (const rule of rules) {
        await processRule(rule, ctx);
      }
    } catch (err) {
      console.error('[WorkflowEngine] Error processing article for rules:', err);
    }
  }, 0);
}

/**
 * Trigger rules on article_added event (called when new article is saved)
 */
export async function onArticleAdded(article: Article): Promise<void> {
  await processArticleForRules(article);
}

/**
 * Trigger rules when summary is generated (for keyword_detected, sentiment_match triggers)
 */
export async function onSummaryGenerated(article: Article, summary: Summary): Promise<void> {
  await processArticleForRules(article, summary);
}

/**
 * Get all workflow logs
 */
export async function getWorkflowLogs(limit = 100): Promise<WorkflowLogEntry[]> {
  return workflowDB.getAllLogs(limit);
}

/**
 * Get logs for a specific rule
 */
export async function getLogsForRule(ruleId: string, limit = 50): Promise<WorkflowLogEntry[]> {
  return workflowDB.getLogsByRuleId(ruleId, limit);
}
