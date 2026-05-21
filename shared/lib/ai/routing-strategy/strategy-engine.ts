/**
 * Strategy Engine
 * Executes routing with strategies and supports A/B test traffic splitting
 */

import type { TaskType } from '../providers-ai-subscription';
import type { RoutingStrategy, ABTest, ABTestAssignment } from './types';
import { getActiveABTests, saveABTestAssignment, getABTestAssignments } from './types';
import { routeAndCall, type RouteAndCallOptions } from '../llm-router';
import type { RoutingDecision } from '../routing-history/types';
import { saveRoutingDecision } from '../routing-history/storage';

// Content from first message for content-based routing
function getContentFromMessages(messages: { content?: string }[]): string {
  return messages.map(m => m.content || '').join('\n');
}

/**
 * Route with a specific strategy
 */
export async function routeWithStrategy(
  taskType: TaskType,
  content: string,
  options?: RouteAndCallOptions
): Promise<{
  text: string;
  modelId: string;
  providerId: string;
  strategyId: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}> {
  const { strategy, ...rest } = options || {};

  if (strategy) {
    // Use strategy's preferred model/provider
    return routeAndCall({
      taskType,
      messages: [{ role: 'user', content }],
      modelId: strategy.preferredModel,
      providerId: strategy.preferredProvider,
      ...rest,
    }).then(result => ({
      ...result,
      strategyId: strategy.id,
    }));
  }

  // Fall back to default routing
  const result = await routeAndCall({
    taskType,
    messages: [{ role: 'user', content }],
    ...rest,
  });

  return {
    ...result,
    strategyId: 'default',
  };
}

/**
 * Check if there's an active A/B test for this task type
 */
async function getActiveTestForTaskType(taskType: TaskType): Promise<ABTest | null> {
  const activeTests = await getActiveABTests();

  for (const test of activeTests) {
    if (
      test.strategyA.taskType === taskType ||
      test.strategyB.taskType === taskType
    ) {
      // Check if test is within time bounds
      const now = Date.now();
      if (test.startTime <= now && (!test.endTime || test.endTime >= now)) {
        return test;
      }
    }
  }

  return null;
}

/**
 * Determine which strategy to use based on traffic split
 */
function selectStrategyByTrafficSplit(test: ABTest): 'A' | 'B' {
  const rand = Math.random() * 100;
  return rand < test.trafficSplit ? 'A' : 'B';
}

/**
 * Get or create A/B test assignment for a request
 */
async function getOrCreateAssignment(
  test: ABTest,
  existingAssignments?: ABTestAssignment[]
): Promise<{ strategy: RoutingStrategy; assignment: ABTestAssignment; routingDecisionId: string }> {
  const strategyId = selectStrategyByTrafficSplit(test);
  const strategy = strategyId === 'A' ? test.strategyA : test.strategyB;

  // Generate a routing decision ID for tracking
  const routingDecisionId = `${test.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const assignment: ABTestAssignment = {
    testId: test.id,
    strategyId,
    timestamp: Date.now(),
    routingDecisionId,
  };

  // Save assignment
  await saveABTestAssignment(assignment);

  return { strategy, assignment, routingDecisionId };
}

/**
 * Route with A/B test support
 * Automatically handles traffic splitting between strategies
 */
export async function routeWithABTest(
  taskType: TaskType,
  content: string,
  options?: RouteAndCallOptions
): Promise<{
  text: string;
  modelId: string;
  providerId: string;
  abTestId?: string;
  strategyId?: string;
  strategyName?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}> {
  // Check if there's an active A/B test for this task type
  const activeTest = await getActiveTestForTaskType(taskType);

  if (!activeTest) {
    // No active A/B test, use default routing
    const result = await routeAndCall({
      taskType,
      messages: [{ role: 'user', content }],
      ...options,
    });

    return {
      ...result,
      abTestId: undefined,
      strategyId: 'default',
      strategyName: 'Default Routing',
    };
  }

  // Get existing assignments to count for statistical purposes
  const existingAssignments = await getABTestAssignments(activeTest.id);
  const { strategy, assignment } = await getOrCreateAssignment(activeTest, existingAssignments);

  console.log(`[A/B Test] ${activeTest.name}: Using strategy ${assignment.strategyId} (${strategy.name})`);

  try {
    // Route using the selected strategy
    const result = await routeAndCall({
      taskType,
      messages: [{ role: 'user', content }],
      modelId: strategy.preferredModel,
      providerId: strategy.preferredProvider,
      ...options,
    });

    // Save routing decision with A/B test context
    const routingDecision: RoutingDecision = {
      id: assignment.routingDecisionId,
      timestamp: Date.now(),
      taskType,
      contentLength: content.length,
      selectedModel: result.modelId,
      selectedProvider: result.providerId,
      selectedScore: 0, // Score not applicable for strategy-based routing
      alternatives: [],
      estimatedCostUSD: 0, // Would need cost estimation
    };

    // Save async (non-blocking)
    saveRoutingDecision(routingDecision).catch(() => {});

    return {
      text: result.text,
      modelId: result.modelId,
      providerId: result.providerId,
      abTestId: activeTest.id,
      strategyId: assignment.strategyId,
      strategyName: strategy.name,
      usage: result.usage,
    };
  } catch (error) {
    // If preferred strategy fails, try fallback
    if (strategy.fallbackModel && strategy.fallbackProvider) {
      console.log(`[A/B Test] ${activeTest.name}: Preferred failed, trying fallback`);

      const result = await routeAndCall({
        taskType,
        messages: [{ role: 'user', content }],
        modelId: strategy.fallbackModel,
        providerId: strategy.fallbackProvider,
        ...options,
      });

      return {
        text: result.text,
        modelId: result.modelId,
        providerId: result.providerId,
        abTestId: activeTest.id,
        strategyId: assignment.strategyId,
        strategyName: `${strategy.name} (fallback)`,
        usage: result.usage,
      };
    }

    throw error;
  }
}

/**
 * Get statistics for an A/B test
 */
export async function getABTestStats(testId: string): Promise<{
  totalAssignments: number;
  strategyACount: number;
  strategyBCount: number;
  assignments: ABTestAssignment[];
}> {
  const assignments = await getABTestAssignments(testId);

  return {
    totalAssignments: assignments.length,
    strategyACount: assignments.filter(a => a.strategyId === 'A').length,
    strategyBCount: assignments.filter(a => a.strategyId === 'B').length,
    assignments,
  };
}
