/**
 * Workflow Engine Service — Enhanced
 * Handles rule matching, branching, loops, and action execution for automation workflows
 */

import type {
  WorkflowRule,
  WorkflowLogEntry,
  WorkflowAction,
  WorkflowBranch,
  WorkflowLoop,
  WorkflowCondition,
  ConditionClause,
  ConditionField,
  ComparisonOperator,
} from '../types/workflow';
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
  loopItem?: string;  // current loop iteration item
}

// ============================================================
// Condition Evaluation
// ============================================================

function getFieldValue(field: ConditionField, ctx: ArticleContext): string | number | boolean {
  const { article, summary } = ctx;

  switch (field) {
    case 'title_length':
      return article.title.length;
    case 'content_length':
      return (article.content || article.description || '').length;
    case 'article_age_hours':
      const pubDate = article.pubDate ? new Date(article.pubDate).getTime() : Date.now();
      return Math.floor((Date.now() - pubDate) / (1000 * 60 * 60));
    case 'tag_count':
      return summary?.tags?.length || 0;
    case 'has_summary':
      return !!summary?.content;
    case 'source':
      return ctx.subscriptionName || article.subscriptionId;
    default:
      return '';
  }
}

function evaluateClause(clause: ConditionClause, ctx: ArticleContext): boolean {
  const fieldValue = getFieldValue(clause.field, ctx);
  const { operator, value } = clause;

  switch (operator) {
    case 'eq':     return fieldValue === value;
    case 'neq':    return fieldValue !== value;
    case 'gt':     return typeof fieldValue === 'number' && fieldValue > (value as number);
    case 'lt':     return typeof fieldValue === 'number' && fieldValue < (value as number);
    case 'gte':    return typeof fieldValue === 'number' && fieldValue >= (value as number);
    case 'lte':    return typeof fieldValue === 'number' && fieldValue <= (value as number);
    case 'contains':    return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    case 'not_contains': return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    default:       return false;
  }
}

function evaluateCondition(condition: WorkflowCondition, ctx: ArticleContext): boolean {
  // All clauses must match (AND)
  return condition.clauses.every(clause => evaluateClause(clause, ctx));
}

// ============================================================
// Trigger Matching
// ============================================================

function matchesTrigger(rule: WorkflowRule, ctx: ArticleContext): boolean {
  const { trigger } = rule;
  const { article, summary } = ctx;

  switch (trigger.type) {
    case 'article_added':
      return true;

    case 'keyword_detected':
      if (!trigger.keywords?.length) return false;
      const textToMatch = `${article.title} ${article.description} ${article.content || ''}`.toLowerCase();
      return trigger.keywords.some(k => textToMatch.includes(k.toLowerCase()));

    case 'sentiment_match':
      if (!trigger.sentiment?.length || !summary?.tags?.length) return false;
      return trigger.sentiment.some(s => summary.tags.includes(s));

    case 'source_match':
      if (!trigger.sources?.length) return false;
      const subName = ctx.subscriptionName?.toLowerCase() || '';
      return trigger.sources.some(s =>
        subName.includes(s.toLowerCase()) ||
        article.subscriptionId.includes(s.toLowerCase())
      );

    default:
      return false;
  }
}

// ============================================================
// Legacy + New Condition Matching
// ============================================================

function matchesConditions(rule: WorkflowRule, ctx: ArticleContext): boolean {
  // New structured preconditions
  if (rule.preconditions) {
    if (!evaluateCondition(rule.preconditions, ctx)) return false;
  }

  // Legacy flat conditions (backward compatible)
  const { conditions } = rule;
  if (conditions) {
    const contentLength = (ctx.article.content || ctx.article.description || '').length;
    if (conditions.minLength !== undefined && contentLength < conditions.minLength) return false;
    if (conditions.tags?.length) {
      if (!ctx.summary?.tags?.length) return false;
      if (!conditions.tags.some(t => ctx.summary!.tags!.includes(t))) return false;
    }
  }

  return true;
}

// ============================================================
// Branch & Loop Resolution
// ============================================================

function resolveBranch(rule: WorkflowRule, ctx: ArticleContext): WorkflowAction[] {
  // If no branches, fall back to flat actions
  if (!rule.branches?.length) return rule.actions;

  for (const branch of rule.branches) {
    // All clauses in a branch must match (AND)
    const branchMatches = branch.conditions.every(clause => evaluateClause(clause, ctx));
    if (branchMatches) {
      return branch.actions;
    }
  }

  return []; // No branch matched
}

function buildLoopContext(ctx: ArticleContext, itemsField: WorkflowLoop['itemsField']): string[] {
  const { article, summary } = ctx;

  switch (itemsField) {
    case 'tags':
      return summary?.tags || [];
    case 'sources':
      return [ctx.subscriptionName || article.subscriptionId];
    case 'keywords':
      return article.description?.split(/[，,、。.\s]+/).filter(Boolean) || [];
    default:
      return [];
  }
}

// ============================================================
// Variable Substitution
// ============================================================

function buildVariables(ctx: ArticleContext): Record<string, string> {
  const { article, summary, loopItem } = ctx;

  return {
    title: article.title,
    source: ctx.subscriptionName || '',
    url: article.link,
    generated_title: summary?.content?.slice(0, 100) || article.title,
    sentiment: summary?.tags?.join(', ') || '',
    key_points: summary?.content || '',
    item: loopItem || '',          // current loop item
    content: (article.content || article.description || '').slice(0, 500),
    pubDate: article.pubDate || new Date().toISOString(),
  };
}

function substituteTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? match);
}

// ============================================================
// Enhanced HTTP Request
// ============================================================

async function executeHttpRequest(
  params: Record<string, any>,
  variables: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const method = (params.method as string) || 'POST';
  const url = substituteTemplate(params.url as string || '', variables);
  const headers: Record<string, string> = (params.headers as Record<string, string>) || {};
  const bodyTemplate = params.body as string | undefined;
  const timeout = (params.timeout as number) || 10000;
  const retries = (params.retry as number) || 0;

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
// Action Execution
// ============================================================

async function executeAction(
  action: WorkflowAction,
  ctx: ArticleContext
): Promise<{ success: boolean; error?: string }> {
  const variables = buildVariables(ctx);

  async function substituteAndExecute(template: string): Promise<{ success: boolean; error?: string }> {
    return executeAction(
      { ...action, params: { ...action.params } },
      ctx
    );
  }

  try {
    switch (action.type) {
      case 'add_tag': {
        const tagName = substituteTemplate(action.params.tag as string || '', variables);
        if (!tagName) return { success: false, error: 'Missing tag name' };

        const allTags = await getAllTags();
        let tag = allTags.find(t => t.name === tagName);
        if (!tag) {
          tag = { id: `tag_${Date.now()}`, name: tagName, type: 'custom', createdAt: Date.now() };
          await saveTag(tag);
        }

        if (ctx.summary) {
          const { updateSummary } = await import('./storage');
          await updateSummary({
            ...ctx.summary,
            tags: [...(ctx.summary.tags || []), tagName],
          });
        }
        return { success: true };
      }

      case 'send_telegram': {
        const message = substituteTemplate(action.params.message as string || '', variables);
        const botToken = action.params.botToken as string;
        const chatId = action.params.chatId as string;
        if (!botToken || !chatId) return { success: false, error: 'Telegram not configured' };
        return telegramService.sendTelegramMessage(botToken, chatId, message);
      }

      case 'send_webhook': {
        const url = substituteTemplate(action.params.url as string || '', variables);
        if (!url) return { success: false, error: 'Webhook URL not configured' };

        const payload = {
          ...(action.params.body as Record<string, any> || {}),
          article: { title: ctx.article.title, url: ctx.article.link, description: ctx.article.description, source: ctx.subscriptionName || '' },
          summary: ctx.summary?.content,
          tags: ctx.summary?.tags,
          triggeredAt: new Date().toISOString(),
        };
        return sendWebhook(url, payload as any, (action.params.headers as Record<string, string>) || {});
      }

      case 'http_request': {
        return executeHttpRequest(action.params, variables);
      }

      case 'mark_starred': {
        const { updateArticle: ua } = await import('./storage');
        await ua({ ...ctx.article, isStarred: true });
        return { success: true };
      }

      case 'add_to_list': {
        const { updateArticle: ua } = await import('./storage');
        await ua({ ...ctx.article, isReadLater: true, readLaterAt: new Date().toISOString() });
        return { success: true };
      }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const { article: _art, ..._rest } = null as any;

async function getAllTags() {
  const { getAllTags: getTags } = await import('../db/indexeddb');
  return getTags();
}

// ============================================================
// Core Processing
// ============================================================

async function processActions(
  actions: WorkflowAction[],
  ctx: ArticleContext,
  ruleId: string,
  ruleName: string
): Promise<void> {
  for (const action of actions) {
    const result = await executeAction(action, ctx);
    await workflowDB.saveLog({
      ruleId,
      ruleName,
      articleId: ctx.article.id,
      articleTitle: ctx.article.title,
      actionType: action.type,
      success: result.success,
      error: result.error,
      timestamp: Date.now(),
    });
  }
}

async function processRule(rule: WorkflowRule, ctx: ArticleContext): Promise<void> {
  if (!rule.enabled) return;

  const isRecent = await workflowDB.isRuleExecutedRecently(rule.id, ctx.article.id, DEBOUNCE_MS);
  if (isRecent) return;

  if (!matchesTrigger(rule, ctx)) return;
  if (!matchesConditions(rule, ctx)) return;

  // Handle branches
  const resolvedActions = resolveBranch(rule, ctx);

  // Handle loop
  if (rule.loop && resolvedActions.length > 0) {
    const items = buildLoopContext(ctx, rule.loop.itemsField);
    for (const item of items) {
      const loopCtx = { ...ctx, loopItem: item };
      await processActions(rule.loop.actions, loopCtx, rule.id, rule.name);
    }
  } else {
    await processActions(resolvedActions, ctx, rule.id, rule.name);
  }
}

export async function processArticleForRules(article: Article, summary?: Summary): Promise<void> {
  setTimeout(async () => {
    try {
      let subscriptionName: string | undefined;
      try {
        const subs = await getSubscriptions();
        subscriptionName = subs.find(s => s.id === article.subscriptionId)?.name;
      } catch { /* optional */ }

      const ctx: ArticleContext = { article, summary, subscriptionName };
      const rules = await workflowDB.getEnabledRules();

      for (const rule of rules) {
        await processRule(rule, ctx);
      }
    } catch (err) {
      console.error('[WorkflowEngine] Error:', err);
    }
  }, 0);
}

export async function onArticleAdded(article: Article): Promise<void> {
  await processArticleForRules(article);
}

export async function onSummaryGenerated(article: Article, summary: Summary): Promise<void> {
  await processArticleForRules(article, summary);
}

export async function getWorkflowLogs(limit = 100): Promise<WorkflowLogEntry[]> {
  return workflowDB.getAllLogs(limit);
}

export async function getLogsForRule(ruleId: string, limit = 50): Promise<WorkflowLogEntry[]> {
  return workflowDB.getLogsByRuleId(ruleId, limit);
}
