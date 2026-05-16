/**
 * Workflow Engine - Core workflow parsing and execution
 * Singleton pattern for managing workflow lifecycle
 */

import type { Workflow, Trigger, Action, ArticleContext, WorkflowInstance } from './types';
import { isArticleMatchedTrigger, isScheduledTrigger, isWebhookTrigger, isManualTrigger } from './types';
import { executeActions } from './executor';
import { scheduleWorkflow, unscheduleWorkflow, rescheduleAllWorkflows, startScheduler } from './scheduler';
import * as workflowDB from '../../db/workflowDB';

// ============================================================
// Engine State
// ============================================================

let engineInstance: WorkflowEngine | null = null;
let initialized = false;

// ============================================================
// Engine Implementation
// ============================================================

export class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();
  private instances: Map<string, WorkflowInstance> = new Map();
  private articleMatchedHandlers: Array<(article: any, summary?: any) => void> = [];
  
  static getInstance(): WorkflowEngine {
    if (!engineInstance) {
      engineInstance = new WorkflowEngine();
    }
    return engineInstance;
  }
  
  async initialize(): Promise<void> {
    if (initialized) return;
    
    console.log('[WorkflowEngine] Initializing...');
    
    try {
      // Load all workflows from DB
      const rules = await workflowDB.getAllRules();
      for (const wf of rules) {
        this.workflows.set(wf.id, this.convertToNewFormat(wf));
      }
      
      // Start scheduler
      startScheduler();
      
      // Reschedule all workflows
      rescheduleAllWorkflows(Array.from(this.workflows.values()));
      
      // Register article matched handler
      this.registerArticleMatchedHandler();
      
      initialized = true;
      console.log(`[WorkflowEngine] Initialized with ${this.workflows.size} workflows`);
    } catch (err) {
      console.error('[WorkflowEngine] Initialization failed:', err);
      throw err;
    }
  }
  
  // Convert legacy WorkflowRule to new Workflow format
  private convertToNewFormat(rule: any): Workflow {
    return {
      id: rule.id,
      name: rule.name,
      description: '',
      enabled: rule.enabled,
      triggers: [{
        type: this.mapLegacyTriggerType(rule.trigger?.type),
        conditions: rule.conditions ? {
          feedId: rule.trigger?.sources?.[0],
          keyword: rule.trigger?.keywords?.join(','),
          regex: undefined,
          category: undefined,
          minContentLength: rule.conditions?.minLength,
        } : undefined,
        cron: undefined,
        endpoint: undefined,
        secret: undefined,
      }],
      actions: rule.actions?.map((a: any) => this.convertLegacyAction(a)) || [],
      createdAt: rule.createdAt,
      updatedAt: Date.now(),
    };
  }
  
  private mapLegacyTriggerType(type: string): Trigger['type'] {
    switch (type) {
      case 'article_added': return 'article-matched';
      case 'keyword_detected': return 'article-matched';
      case 'sentiment_match': return 'article-matched';
      case 'source_match': return 'article-matched';
      default: return 'article-matched';
    }
  }
  
  private convertLegacyAction(action: any): Action {
    switch (action.type) {
      case 'add_tag':
        return { type: 'tag-article', tags: [action.params?.tag].filter(Boolean), mode: 'add' };
      case 'send_telegram':
        return { type: 'send-notification', channel: 'telegram', template: action.params?.message };
      case 'send_webhook':
        return { type: 'http-request', url: action.params?.url, method: 'POST' };
      case 'http_request':
        return { type: 'http-request', ...action.params };
      case 'mark_starred':
        return { type: 'tag-article', tags: ['starred'], mode: 'add' };
      case 'add_to_list':
        return { type: 'tag-article', tags: ['read-later'], mode: 'add' };
      default:
        return action as Action;
    }
  }
  
  // ============================================================
  // Trigger Matching
  // ============================================================
  
  private matchesArticleConditions(conditions: Workflow['triggers'][0] extends { conditions: infer C } ? C : never, ctx: ArticleContext): boolean {
    if (!conditions) return true;
    
    const content = ctx.content || ctx.description || '';
    
    // Keyword match
    if (conditions.keyword) {
      const keywords = conditions.keyword.split(/[,，;；]/).filter(k => k.trim());
      const textToMatch = `${ctx.title} ${ctx.description} ${content}`.toLowerCase();
      if (!keywords.some(k => textToMatch.includes(k.toLowerCase().trim()))) {
        return false;
      }
    }
    
    // Regex match
    if (conditions.regex) {
      try {
        const regex = new RegExp(conditions.regex, 'i');
        if (!regex.test(ctx.title) && !regex.test(content)) {
          return false;
        }
      } catch {
        // Invalid regex, skip
      }
    }
    
    // Feed ID match
    if (conditions.feedId && ctx.feedId !== conditions.feedId && ctx.subscriptionId !== conditions.feedId) {
      return false;
    }
    
    // Category match
    if (conditions.category && ctx.category !== conditions.category) {
      return false;
    }
    
    // Min content length
    if (conditions.minContentLength && content.length < conditions.minContentLength) {
      return false;
    }
    
    return true;
  }
  
  private async matchArticleTriggers(article: any, summary?: any): Promise<Workflow[]> {
    const matched: Workflow[] = [];
    
    for (const workflow of this.workflows.values()) {
      if (!workflow.enabled) continue;
      
      for (const trigger of workflow.triggers) {
        if (trigger.type !== 'article-matched') continue;
        
        // Check conditions
        if (trigger.conditions && !this.matchesArticleConditions(trigger.conditions as any, {
          articleId: article.id,
          title: article.title,
          description: article.description,
          content: article.content,
          link: article.link,
          pubDate: article.pubDate,
          subscriptionId: article.subscriptionId,
          feedId: article.feedId,
          category: article.category,
          tags: summary?.tags || [],
          summary: summary?.content,
          summaryTags: summary?.tags,
        })) {
          continue;
        }
        
        matched.push(workflow);
        break;
      }
    }
    
    return matched;
  }
  
  // ============================================================
  // Execution
  // ============================================================
  
  async triggerWorkflow(workflowId: string, ctx: ArticleContext): Promise<{ success: boolean; error?: string }> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return { success: false, error: `Workflow not found: ${workflowId}` };
    }
    
    if (!workflow.enabled) {
      return { success: false, error: `Workflow is disabled: ${workflowId}` };
    }
    
    // Create instance
    const instance: WorkflowInstance = {
      id: `inst_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      workflowId: workflow.id,
      workflowName: workflow.name,
      triggerType: workflow.triggers[0]?.type || 'manual',
      articleId: ctx.articleId,
      articleTitle: ctx.title,
      startedAt: Date.now(),
      status: 'running',
      actionsCompleted: 0,
      actionsTotal: workflow.actions.length,
    };
    
    this.instances.set(instance.id, instance);
    
    try {
      // Execute all actions
      const result = await executeActions(
        workflow.id,
        workflow.name,
        workflow.actions,
        ctx
      );
      
      instance.status = result.success ? 'completed' : 'failed';
      instance.completedAt = Date.now();
      instance.error = result.error;
      
      return result;
    } catch (err) {
      instance.status = 'failed';
      instance.completedAt = Date.now();
      instance.error = err instanceof Error ? err.message : String(err);
      return { success: false, error: instance.error };
    }
  }
  
  async triggerScheduled(workflowId: string): Promise<{ success: boolean; error?: string }> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.enabled) {
      return { success: false, error: 'Workflow not found or disabled' };
    }
    
    // Create context for scheduled trigger (no specific article)
    const ctx: ArticleContext = {
      articleId: '',
      title: '',
      description: `Scheduled workflow triggered: ${workflow.name}`,
    };
    
    return this.triggerWorkflow(workflowId, ctx);
  }
  
  async triggerWebhook(workflowId: string, payload: any): Promise<{ success: boolean; error?: string }> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.enabled) {
      return { success: false, error: 'Workflow not found or disabled' };
    }
    
    const ctx: ArticleContext = {
      articleId: '',
      title: `Webhook triggered: ${workflow.name}`,
      description: JSON.stringify(payload).slice(0, 500),
      content: JSON.stringify(payload),
    };
    
    return this.triggerWorkflow(workflowId, ctx);
  }
  
  // ============================================================
  // Workflow CRUD
  // ============================================================
  
  async createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    const full: Workflow = {
      ...workflow,
      id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await workflowDB.saveWorkflow(full as any);
    this.workflows.set(full.id, full);
    
    // Schedule if has scheduled trigger
    if (workflow.enabled) {
      scheduleWorkflow(full);
    }
    
    console.log(`[WorkflowEngine] Created workflow: ${full.id}`);
    return full;
  }
  
  async updateWorkflow(workflow: Workflow): Promise<Workflow> {
    workflow.updatedAt = Date.now();
    
    await workflowDB.updateWorkflow(workflow as any);
    this.workflows.set(workflow.id, workflow);
    
    // Reschedule
    unscheduleWorkflow(workflow.id);
    if (workflow.enabled) {
      scheduleWorkflow(workflow);
    }
    
    console.log(`[WorkflowEngine] Updated workflow: ${workflow.id}`);
    return workflow;
  }
  
  async deleteWorkflow(workflowId: string): Promise<void> {
    unscheduleWorkflow(workflowId);
    this.workflows.delete(workflowId);
    await workflowDB.deleteWorkflow(workflowId);
    console.log(`[WorkflowEngine] Deleted workflow: ${workflowId}`);
  }
  
  async toggleWorkflow(workflowId: string, enabled: boolean): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;
    
    workflow.enabled = enabled;
    workflow.updatedAt = Date.now();
    
    await workflowDB.updateWorkflow(workflow as any);
    
    if (enabled) {
      scheduleWorkflow(workflow);
    } else {
      unscheduleWorkflow(workflowId);
    }
    
    console.log(`[WorkflowEngine] Toggled workflow ${workflowId}: ${enabled}`);
  }
  
  // ============================================================
  // Article Integration
  // ============================================================
  
  private registerArticleMatchedHandler(): void {
    // This will be called by the main app when articles are added
    // The app should call: WorkflowEngine.getInstance().onArticleAdded(article, summary)
  }
  
  async onArticleAdded(article: any, summary?: any): Promise<void> {
    if (!initialized) await this.initialize();
    
    const matchedWorkflows = await this.matchArticleTriggers(article, summary);
    
    for (const workflow of matchedWorkflows) {
      const ctx: ArticleContext = {
        articleId: article.id,
        title: article.title,
        description: article.description,
        content: article.content,
        link: article.link,
        pubDate: article.pubDate,
        subscriptionId: article.subscriptionId,
        subscriptionName: article.subscriptionName,
        feedId: article.feedId,
        feedName: article.feedName,
        category: article.category,
        tags: summary?.tags || [],
        summary: summary?.content,
        summaryTags: summary?.tags,
      };
      
      // Trigger in background
      this.triggerWorkflow(workflow.id, ctx).catch(err => {
        console.error(`[WorkflowEngine] Failed to trigger workflow ${workflow.id}:`, err);
      });
    }
  }
  
  getWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }
  
  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }
  
  getInstances(): WorkflowInstance[] {
    return Array.from(this.instances.values());
  }
}

// Export for use in article processing
export async function onArticleAdded(article: any, summary?: any): Promise<void> {
  return WorkflowEngine.getInstance().onArticleAdded(article, summary);
}

export async function onSummaryGenerated(article: any, summary: any): Promise<void> {
  return WorkflowEngine.getInstance().onArticleAdded(article, summary);
}