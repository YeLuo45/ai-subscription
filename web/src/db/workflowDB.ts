/**
 * IndexedDB Database Layer for Workflow Rules and Logs
 * Tables: workflow_rules, workflow_logs, workflow_instances
 */

import type { WorkflowRule, WorkflowLogEntry } from '../types/workflow';
import type { Workflow, WorkflowExecutionLog } from '../services/workflow/types';

const DB_NAME = 'ai-subscription-workflow';
const DB_VERSION = 2;

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // workflow_rules table
      if (!db.objectStoreNames.contains('workflow_rules')) {
        const rulesStore = db.createObjectStore('workflow_rules', { keyPath: 'id' });
        rulesStore.createIndex('enabled', 'enabled', { unique: false });
        rulesStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // workflow_logs table
      if (!db.objectStoreNames.contains('workflow_logs')) {
        const logsStore = db.createObjectStore('workflow_logs', { keyPath: 'id' });
        logsStore.createIndex('ruleId', 'ruleId', { unique: false });
        logsStore.createIndex('articleId', 'articleId', { unique: false });
        logsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

function tx(storeName: string, mode: IDBTransactionMode = 'readonly') {
  return openDB().then(db => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    return { transaction, store };
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function generateId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================
// Workflow Rules Operations
// ============================================================

export async function getAllRules(): Promise<WorkflowRule[]> {
  const { store } = await tx('workflow_rules');
  const rules = await promisifyRequest<WorkflowRule[]>(store.getAll());
  return rules.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getEnabledRules(): Promise<WorkflowRule[]> {
  const { store } = await tx('workflow_rules');
  const index = store.index('enabled');
  return promisifyRequest<WorkflowRule[]>(index.getAll(true));
}

export async function getRuleById(id: string): Promise<WorkflowRule | undefined> {
  const { store } = await tx('workflow_rules');
  return promisifyRequest<WorkflowRule | undefined>(store.get(id));
}

export async function saveRule(rule: Omit<WorkflowRule, 'id' | 'createdAt'>): Promise<WorkflowRule> {
  const { store } = await tx('workflow_rules', 'readwrite');
  const full: WorkflowRule = {
    ...rule,
    id: generateId(),
    createdAt: Date.now(),
  };
  await promisifyRequest(store.put(full));
  return full;
}

export async function updateRule(rule: WorkflowRule): Promise<WorkflowRule> {
  const { store } = await tx('workflow_rules', 'readwrite');
  await promisifyRequest(store.put(rule));
  return rule;
}

export async function deleteRule(id: string): Promise<void> {
  const { store } = await tx('workflow_rules', 'readwrite');
  await promisifyRequest(store.delete(id));
}

export async function toggleRuleEnabled(id: string, enabled: boolean): Promise<void> {
  const rule = await getRuleById(id);
  if (rule) {
    await updateRule({ ...rule, enabled });
  }
}

// ============================================================
// Workflow Logs Operations
// ============================================================

export async function getAllLogs(limit = 100): Promise<WorkflowLogEntry[]> {
  const { store } = await tx('workflow_logs');
  const logs = await promisifyRequest<WorkflowLogEntry[]>(store.getAll());
  return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export async function getLogsByRuleId(ruleId: string, limit = 50): Promise<WorkflowLogEntry[]> {
  const { store } = await tx('workflow_logs');
  const index = store.index('ruleId');
  const logs = await promisifyRequest<WorkflowLogEntry[]>(index.getAll(ruleId));
  return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export async function getLogsByArticleId(articleId: string): Promise<WorkflowLogEntry[]> {
  const { store } = await tx('workflow_logs');
  const index = store.index('articleId');
  return promisifyRequest<WorkflowLogEntry[]>(index.getAll(articleId));
}

export async function saveLog(entry: Omit<WorkflowLogEntry, 'id'>): Promise<WorkflowLogEntry> {
  const { store } = await tx('workflow_logs', 'readwrite');
  const full: WorkflowLogEntry = {
    ...entry,
    id: generateId(),
  };
  await promisifyRequest(store.put(full));
  return full;
}

export async function clearLogs(): Promise<void> {
  const { store } = await tx('workflow_logs', 'readwrite');
  await promisifyRequest(store.clear());
}

// Check if a rule has already been executed for an article within the debounce window (5 minutes)
export async function isRuleExecutedRecently(
  ruleId: string,
  articleId: string,
  debounceMs = 5 * 60 * 1000
): Promise<boolean> {
  const { store } = await tx('workflow_logs');
  const index = store.index('ruleId');
  const logs = await promisifyRequest<WorkflowLogEntry[]>(index.getAll(ruleId));

  const now = Date.now();
  return logs.some(
    log => log.articleId === articleId && log.success && (now - log.timestamp) < debounceMs
  );
}

// ============================================================
// New Workflow (Advanced) Operations
// ============================================================

export async function getAllWorkflows(): Promise<Workflow[]> {
  const { store } = await tx('workflow_rules');
  const rules = await promisifyRequest<WorkflowRule[]>(store.getAll());
  // Convert legacy rules to new format
  return rules.map(rule => ({
    id: rule.id,
    name: rule.name,
    description: '',
    enabled: rule.enabled,
    triggers: [{
      type: 'article-matched',
      conditions: rule.conditions ? {
        feedId: rule.trigger?.sources?.[0],
        keyword: rule.trigger?.keywords?.join(','),
        minContentLength: rule.conditions?.minLength,
      } : undefined,
    }],
    actions: (rule.actions || []).map(a => ({
      type: a.type === 'add_tag' ? 'tag-article' :
            a.type === 'send_telegram' ? 'send-notification' :
            a.type === 'http_request' ? 'http-request' : a.type,
      tags: a.params?.tag ? [a.params.tag] : undefined,
      channel: a.type === 'send_telegram' ? 'telegram' : undefined,
      template: a.params?.message || a.params?.url,
      url: a.params?.url,
      method: 'POST' as const,
    })),
    createdAt: rule.createdAt,
    updatedAt: Date.now(),
  }));
}

export async function saveWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt'>): Promise<Workflow> {
  const { store } = await tx('workflow_rules', 'readwrite');
  const full: Workflow = {
    ...workflow,
    id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
  };
  await promisifyRequest(store.put(full as any));
  return full;
}

export async function updateWorkflow(workflow: Workflow): Promise<Workflow> {
  const { store } = await tx('workflow_rules', 'readwrite');
  await promisifyRequest(store.put(workflow as any));
  return workflow;
}

export async function deleteWorkflow(id: string): Promise<void> {
  const { store } = await tx('workflow_rules', 'readwrite');
  await promisifyRequest(store.delete(id));
}

export async function saveWorkflowLog(entry: Omit<WorkflowExecutionLog, 'id'>): Promise<WorkflowExecutionLog> {
  const { store } = await tx('workflow_logs', 'readwrite');
  const full: WorkflowExecutionLog = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  };
  await promisifyRequest(store.put(full as any));
  return full;
}

export async function getWorkflowLogs(limit = 100): Promise<WorkflowExecutionLog[]> {
  const { store } = await tx('workflow_logs');
  const logs = await promisifyRequest<WorkflowExecutionLog[]>(store.getAll());
  return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export async function getWorkflowLogsByWorkflowId(workflowId: string, limit = 50): Promise<WorkflowExecutionLog[]> {
  const { store } = await tx('workflow_logs');
  const index = store.index('ruleId');
  const logs = await promisifyRequest<WorkflowExecutionLog[]>(index.getAll(workflowId));
  return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}
