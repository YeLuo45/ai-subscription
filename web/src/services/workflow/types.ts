// Workflow Engine Types - Advanced Automation with Triggers and Actions

// ============================================================
// Trigger Types
// ============================================================

export type TriggerType = 'article-matched' | 'scheduled' | 'webhook-received' | 'manual';

export interface ArticleConditions {
  feedId?: string;           // Specific subscription source
  keyword?: string;          // Keyword match (title/description)
  regex?: string;            // Regex match
  category?: string;         // Category match
  minContentLength?: number; // Minimum content length
}

export interface Trigger {
  type: TriggerType;
  conditions?: ArticleConditions;
  cron?: string;             // Cron expression (5 fields)
  timezone?: string;         // Timezone, default local
  endpoint?: string;         // Webhook endpoint path
  secret?: string;           // HMAC-SHA256 signature secret
}

// ============================================================
// Action Types
// ============================================================

export type ActionType = 'ai-process' | 'send-notification' | 'tag-article' | 'http-request';

export interface Action {
  type: ActionType;
  taskType?: 'structured-summary' | 'tag-generation' | 'translation';
  processType?: 'article' | 'feed';
  target?: 'current-article' | 'triggered-feed';
  channel?: 'telegram' | 'email' | 'webhook';
  template?: string;         // Template string, supports {{title}} etc.
  tags?: string[];
  mode?: 'add' | 'remove' | 'replace';
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  retry?: number;
}

// ============================================================
// Workflow Definition
// ============================================================

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  triggers: Trigger[];
  actions: Action[];
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// Workflow Instance & Execution
// ============================================================

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowName: string;
  triggerType: TriggerType;
  articleId?: string;
  articleTitle?: string;
  startedAt: number;
  completedAt?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  actionsCompleted: number;
  actionsTotal: number;
  error?: string;
}

export interface WorkflowExecutionLog {
  id: string;
  workflowId: string;
  workflowName: string;
  instanceId: string;
  articleId?: string;
  articleTitle?: string;
  actionType: ActionType;
  actionIndex: number;
  success: boolean;
  error?: string;
  duration?: number;        // Execution duration in ms
  timestamp: number;
}

// ============================================================
// Cron Scheduling
// ============================================================

export interface ScheduledJob {
  workflowId: string;
  cron: string;
  nextRunTime: number;
  intervalId?: ReturnType<typeof setInterval>;
}

// ============================================================
// Trigger Matching Context
// ============================================================

export interface ArticleContext {
  articleId: string;
  title: string;
  description?: string;
  content?: string;
  link?: string;
  pubDate?: string;
  subscriptionId?: string;
  subscriptionName?: string;
  feedId?: string;
  feedName?: string;
  category?: string;
  tags?: string[];
  summary?: string;
  summaryTags?: string[];
}

// ============================================================
// Type Guards & Helpers
// ============================================================

export function isArticleMatchedTrigger(trigger: Trigger): trigger is Trigger & { type: 'article-matched' } {
  return trigger.type === 'article-matched';
}

export function isScheduledTrigger(trigger: Trigger): trigger is Trigger & { type: 'scheduled' } {
  return trigger.type === 'scheduled';
}

export function isWebhookTrigger(trigger: Trigger): trigger is Trigger & { type: 'webhook-received' } {
  return trigger.type === 'webhook-received';
}

export function isManualTrigger(trigger: Trigger): trigger is Trigger & { type: 'manual' } {
  return trigger.type === 'manual';
}

export function isAIAction(action: Action): action is Action & { type: 'ai-process' } {
  return action.type === 'ai-process';
}

export function isNotificationAction(action: Action): action is Action & { type: 'send-notification' } {
  return action.type === 'send-notification';
}

export function isTagAction(action: Action): action is Action & { type: 'tag-article' } {
  return action.type === 'tag-article';
}

export function isHttpRequestAction(action: Action): action is Action & { type: 'http-request' } {
  return action.type === 'http-request';
}

// ============================================================
// Constants
// ============================================================

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  'article-matched': '文章匹配',
  'scheduled': '定时调度',
  'webhook-received': 'Webhook触发',
  'manual': '手动触发',
};

export const ACTION_LABELS: Record<ActionType, string> = {
  'ai-process': 'AI处理',
  'send-notification': '发送通知',
  'tag-article': '标签操作',
  'http-request': 'HTTP请求',
};

export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const DEFAULT_RETRY = 0;
export const CRON_CHECK_INTERVAL = 60000; // 1 minute