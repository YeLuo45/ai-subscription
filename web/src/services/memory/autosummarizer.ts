/**
 * L4 Auto-Summarizer - Procedural Memory Automation
 * Automatically generates summaries for frequently used workflows
 * Based on action frequency and context patterns
 */

import type { ProceduralMemoryItem } from './types';
import { getProceduralActions, getActionStats } from './procedural-memory';

export interface SummarizationResult {
  action: string;
  summary: string;
  frequency: number;
  lastUsed: number;
  suggestedWorkflow?: string[];
  automationHint?: string;
}

export interface AutoSummarizeOptions {
  frequencyThreshold?: number;  // Min frequency to trigger summarization
  minActions?: number;          // Min number of actions to analyze
  maxSuggestions?: number;      // Max number of suggestions to return
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<AutoSummarizeOptions> = {
  frequencyThreshold: 3,      // Actions used 3+ times
  minActions: 2,              // At least 2 similar actions
  maxSuggestions: 10,         // Top 10 suggestions
};

/**
 * Workflow pattern templates for common actions
 */
const WORKFLOW_TEMPLATES: Record<string, {
  pattern: string[];
  summaryTemplate: (ctx: Record<string, any>) => string;
}> = {
  'subscribe': {
    pattern: ['search', 'view', 'subscribe'],
    summaryTemplate: (ctx) => `Subscribed to ${ctx.feedName || 'a feed'} after searching and viewing content`,
  },
  'unsubscribe': {
    pattern: ['view', 'unsubscribe'],
    summaryTemplate: (ctx) => `Unsubscribed from ${ctx.feedName || 'a feed'}`,
  },
  'mark-read': {
    pattern: ['view', 'mark-read'],
    summaryTemplate: (ctx) => `Marked ${ctx.count || 'an'} item(s) as read in ${ctx.feedName || 'a feed'}`,
  },
  'search': {
    pattern: ['search', 'view', 'subscribe'],
    summaryTemplate: (ctx) => `Searched for "${ctx.query || 'content'}" and subscribed to results`,
  },
  'export': {
    pattern: ['view', 'export'],
    summaryTemplate: (ctx) => `Exported ${ctx.feedName || 'feed'} data in ${ctx.format || 'JSON'} format`,
  },
};

/**
 * Detect workflow pattern from action sequence
 */
function detectWorkflowPattern(actions: ProceduralMemoryItem[]): string[] {
  if (actions.length < 2) return [];
  
  // Get action types in order
  const actionTypes = actions.map(a => a.action);
  
  // Match against known patterns
  for (const [name, template] of Object.entries(WORKFLOW_TEMPLATES)) {
    if (template.pattern.every(step => actionTypes.includes(step))) {
      return template.pattern;
    }
  }
  
  // No pattern matched, return raw action sequence
  return actionTypes;
}

/**
 * Generate summary for a single action
 */
function generateActionSummary(action: ProceduralMemoryItem): string {
  const { action: actionType, frequency, context } = action;
  
  // Use template if available
  const template = WORKFLOW_TEMPLATES[actionType];
  if (template) {
    return template.summaryTemplate(context || {});
  }
  
  // Generate generic summary
  const timeSinceUse = Date.now() - action.lastUsed;
  const recency = timeSinceUse < 60000 ? 'recently' :
                  timeSinceUse < 3600000 ? 'in the last hour' :
                  timeSinceUse < 86400000 ? 'today' : 'recently';
  
  if (frequency === 1) {
    return `Used "${actionType}" ${recency}`;
  }
  
  return `Used "${actionType}" ${frequency} times ${recency}`;
}

/**
 * Auto-summarize high-frequency actions
 */
export async function autoSummarize(
  options: AutoSummarizeOptions = {}
): Promise<SummarizationResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Get all procedural actions
  const allActions = await getProceduralActions();
  
  // Filter to high-frequency actions
  const frequentActions = allActions.filter(a => a.frequency >= opts.frequencyThreshold);
  
  // Group by action type
  const actionGroups = new Map<string, ProceduralMemoryItem[]>();
  for (const action of frequentActions) {
    const group = actionGroups.get(action.action) || [];
    group.push(action);
    actionGroups.set(action.action, group);
  }
  
  const results: SummarizationResult[] = [];
  
  for (const [actionType, actions] of actionGroups) {
    // Detect pattern across similar actions
    const workflowPattern = detectWorkflowPattern(actions);
    
    // Calculate aggregate stats
    const totalFrequency = actions.reduce((sum, a) => sum + a.frequency, 0);
    const lastUsed = Math.max(...actions.map(a => a.lastUsed));
    const avgFrequency = totalFrequency / actions.length;
    
    // Get most common context
    const contextUsage = new Map<string, number>();
    for (const action of actions) {
      if (action.context) {
        const key = JSON.stringify(action.context);
        contextUsage.set(key, (contextUsage.get(key) || 0) + action.frequency);
      }
    }
    
    // Find most common context
    let mostCommonContext: Record<string, any> = {};
    let maxCount = 0;
    for (const [ctxKey, count] of contextUsage) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonContext = JSON.parse(ctxKey);
      }
    }
    
    // Generate summary
    const summary = generateSummaryText(actionType, avgFrequency, workflowPattern, mostCommonContext);
    
    results.push({
      action: actionType,
      summary,
      frequency: totalFrequency,
      lastUsed,
      suggestedWorkflow: workflowPattern.length > 0 ? workflowPattern : undefined,
      automationHint: workflowPattern.length > 0 ? generateAutomationHint(actionType, workflowPattern) : undefined,
    });
  }
  
  // Sort by frequency descending
  results.sort((a, b) => b.frequency - a.frequency);
  
  return results.slice(0, opts.maxSuggestions);
}

/**
 * Generate human-readable summary text
 */
function generateSummaryText(
  actionType: string,
  avgFrequency: number,
  workflowPattern: string[],
  context: Record<string, any>
): string {
  const timesUsed = avgFrequency >= 10 ? 'very frequently' :
                    avgFrequency >= 5 ? 'often' :
                    avgFrequency >= 3 ? 'regularly' : 'occasionally';
  
  if (workflowPattern.length > 0) {
    return `"${actionType}" is part of a ${workflowPattern.length}-step workflow used ${timesUsed}`;
  }
  
  // Context-aware summary
  if (context.feedName) {
    return `"${actionType}" on "${context.feedName}" — used ${timesUsed}`;
  }
  
  if (context.query) {
    return `"${actionType}" for searches about "${context.query}" — used ${timesUsed}`;
  }
  
  return `"${actionType}" is performed ${timesUsed}`;
}

/**
 * Generate automation hint for suggested workflow
 */
function generateAutomationHint(actionType: string, workflow: string[]): string {
  if (workflow.length <= 2) {
    return `Consider combining "${workflow.join('" → "')}" into a single shortcut`;
  }
  
  return `The ${workflow.length}-step workflow "${workflow.slice(0, 3).join(' → ')}..." could be automated`;
}

/**
 * Get automation opportunities
 */
export async function getAutomationOpportunities(): Promise<{
  highFrequency: SummarizationResult[];
  workflowCandidates: string[][];
  totalActions: number;
  uniqueActions: number;
}> {
  const [stats, summarized] = await Promise.all([
    getActionStats(),
    autoSummarize({ frequencyThreshold: 5, maxSuggestions: 5 }),
  ]);
  
  // Find workflow candidates (actions used in sequence)
  const allActions = await getProceduralActions();
  const workflowCandidates = findSequentialPatterns(allActions);
  
  return {
    highFrequency: summarized,
    workflowCandidates: workflowCandidates.slice(0, 3),
    totalActions: stats.totalActions,
    uniqueActions: stats.uniqueActions,
  };
}

/**
 * Find sequential patterns in action history
 */
function findSequentialPatterns(actions: ProceduralMemoryItem[]): string[][] {
  if (actions.length < 2) return [];
  
  const patterns: string[][] = [];
  
  // Sort by lastUsed to get temporal order
  const sorted = [...actions].sort((a, b) => b.lastUsed - a.lastUsed);
  
  // Look for common sequences
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    // Check if these actions are frequently used together
    const timeDiff = current.lastUsed - next.lastUsed;
    if (timeDiff < 60000) { // Within 1 minute
      patterns.push([next.action, current.action]);
    }
  }
  
  return patterns;
}

/**
 * Clear old procedural memories (for maintenance)
 */
export async function pruneOldProceduralMemories(
  maxAge: number = 30 * 24 * 60 * 60 * 1000 // 30 days
): Promise<number> {
  const allActions = await getProceduralActions();
  const cutoff = Date.now() - maxAge;
  
  let pruned = 0;
  for (const action of allActions) {
    if (action.lastUsed < cutoff && action.frequency === 1) {
      // Only prune actions that were barely used and old
      pruned++;
    }
  }
  
  return pruned;
}
