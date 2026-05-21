/**
 * A/B Testing Framework
 * Create, manage, and conclude A/B tests for routing strategies
 */

import type { TaskType } from '../providers-ai-subscription';
import type { ABTest, ABTestResult, RoutingStrategy } from './types';
import {
  saveABTest,
  getABTest,
  getAllABTests,
  getActiveABTests,
  getABTestAssignments,
} from './types';
import { getModelPerformance } from '../routing-history/analytics';
import type { ModelPerformance } from '../routing-history/analytics';

/**
 * Create a new A/B test
 */
export async function createABTest(
  name: string,
  strategyA: RoutingStrategy,
  strategyB: RoutingStrategy,
  trafficSplit: number = 50,
  durationHours?: number
): Promise<ABTest> {
  // Validate inputs
  if (trafficSplit < 0 || trafficSplit > 100) {
    throw new Error('trafficSplit must be between 0 and 100');
  }

  if (strategyA.taskType !== strategyB.taskType) {
    throw new Error('Both strategies must have the same taskType');
  }

  // Check for overlapping active tests
  const activeTests = await getActiveABTests();
  const overlapping = activeTests.filter(
    t =>
      (t.strategyA.id === strategyA.id || t.strategyA.id === strategyB.id ||
       t.strategyB.id === strategyA.id || t.strategyB.id === strategyB.id) &&
      t.strategyA.taskType === strategyA.taskType
  );

  if (overlapping.length > 0) {
    throw new Error(`Overlapping A/B test already exists for taskType: ${strategyA.taskType}`);
  }

  const test: ABTest = {
    id: `ab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    strategyA,
    strategyB,
    trafficSplit,
    startTime: Date.now(),
    endTime: durationHours ? Date.now() + durationHours * 60 * 60 * 1000 : undefined,
    status: 'running',
  };

  await saveABTest(test);

  console.log(`[A/B Tester] Created test "${name}" (${test.id}) for ${strategyA.taskType}`);
  console.log(`[A/B Tester] Traffic split: ${trafficSplit}% A / ${100 - trafficSplit}% B`);

  return test;
}

/**
 * Get all active (running) A/B tests
 */
export async function getActiveTests(): Promise<ABTest[]> {
  const tests = await getActiveABTests();

  // Filter out expired tests
  const now = Date.now();
  return tests.filter(t => !t.endTime || t.endTime > now);
}

/**
 * Pause an A/B test
 */
export async function pauseTest(testId: string): Promise<ABTest> {
  const test = await getABTest(testId);

  if (!test) {
    throw new Error(`A/B test not found: ${testId}`);
  }

  if (test.status !== 'running') {
    throw new Error(`Test is not running: ${test.status}`);
  }

  test.status = 'paused';
  await saveABTest(test);

  console.log(`[A/B Tester] Paused test "${test.name}" (${testId})`);
  return test;
}

/**
 * Resume a paused A/B test
 */
export async function resumeTest(testId: string): Promise<ABTest> {
  const test = await getABTest(testId);

  if (!test) {
    throw new Error(`A/B test not found: ${testId}`);
  }

  if (test.status !== 'paused') {
    throw new Error(`Test is not paused: ${test.status}`);
  }

  test.status = 'running';
  await saveABTest(test);

  console.log(`[A/B Tester] Resumed test "${test.name}" (${testId})`);
  return test;
}

/**
 * Conclude an A/B test and generate results
 */
export async function concludeTest(testId: string): Promise<ABTestResult> {
  const test = await getABTest(testId);

  if (!test) {
    throw new Error(`A/B test not found: ${testId}`);
  }

  if (test.status === 'completed') {
    throw new Error('Test has already been concluded');
  }

  // Get performance data for both strategies
  const [performance, assignments] = await Promise.all([
    getModelPerformance(),
    getABTestAssignments(testId),
  ]);

  // Calculate performance for each strategy
  const strategyAPerf = calculateStrategyPerformance(
    test.strategyA,
    performance,
    assignments.filter(a => a.strategyId === 'A')
  );

  const strategyBPerf = calculateStrategyPerformance(
    test.strategyB,
    performance,
    assignments.filter(a => a.strategyId === 'B')
  );

  // Determine winner based on key metrics
  const winner = determineWinner(strategyAPerf, strategyBPerf);

  // Calculate statistical confidence
  const confidence = calculateConfidence(
    assignments.length,
    strategyAPerf.totalCalls,
    strategyBPerf.totalCalls
  );

  // Generate recommendation
  const recommendation = generateRecommendation(test, winner, strategyAPerf, strategyBPerf, confidence);

  // Update test status
  test.status = 'completed';
  test.endTime = Date.now();
  await saveABTest(test);

  const result: ABTestResult = {
    testId,
    strategyA: strategyAPerf,
    strategyB: strategyBPerf,
    winner,
    confidence,
    recommendation,
  };

  console.log(`[A/B Tester] Concluded test "${test.name}" (${testId})`);
  console.log(`[A/B Tester] Winner: ${winner} (confidence: ${confidence.toFixed(1)}%)`);
  console.log(`[A/B Tester] Recommendation: ${recommendation}`);

  return result;
}

/**
 * Calculate performance metrics for a strategy
 */
function calculateStrategyPerformance(
  strategy: RoutingStrategy,
  allPerformance: ModelPerformance[],
  assignments: { testId: string; strategyId: string; timestamp: number; routingDecisionId: string }[]
): ModelPerformance {
  // Find matching performance records
  const matchingPerf = allPerformance.filter(
    p => p.modelId === strategy.preferredModel && p.providerId === strategy.preferredProvider
  );

  if (matchingPerf.length > 0) {
    return matchingPerf[0];
  }

  // Return a default performance with the assignment count
  return {
    modelId: strategy.preferredModel,
    providerId: strategy.preferredProvider,
    totalCalls: assignments.length,
    successRate: 0,
    avgLatencyMs: 0,
    avgCostUSD: 0,
    bestFor: [strategy.taskType],
  };
}

/**
 * Determine winner between two strategies
 */
function determineWinner(perfA: ModelPerformance, perfB: ModelPerformance): 'A' | 'B' | 'tie' {
  // Use a weighted scoring system
  // Success rate (40%), latency (30%), cost (30%)

  const scoreA = perfA.totalCalls > 0
    ? (perfA.successRate * 0.4) +
      (Math.max(0, 1 - perfA.avgLatencyMs / 2000) * 0.3) +
      (Math.max(0, 1 - perfA.avgCostUSD / 0.1) * 0.3)
    : 0;

  const scoreB = perfB.totalCalls > 0
    ? (perfB.successRate * 0.4) +
      (Math.max(0, 1 - perfB.avgLatencyMs / 2000) * 0.3) +
      (Math.max(0, 1 - perfB.avgCostUSD / 0.1) * 0.3)
    : 0;

  const diff = Math.abs(scoreA - scoreB);

  // If difference is very small, call it a tie
  if (diff < 0.05) {
    return 'tie';
  }

  return scoreA > scoreB ? 'A' : 'B';
}

/**
 * Calculate statistical confidence
 */
function calculateConfidence(
  totalAssignments: number,
  countA: number,
  countB: number
): number {
  // Minimum sample size for meaningful results
  if (totalAssignments < 30) {
    return Math.min(50, totalAssignments * 1.5);
  }

  // Simple confidence based on sample size and distribution
  const expectedCount = totalAssignments / 2;
  const deviationA = Math.abs(countA - expectedCount) / expectedCount;
  const deviationB = Math.abs(countB - expectedCount) / expectedCount;
  const avgDeviation = (deviationA + deviationB) / 2;

  // Base confidence on sample size, reduced if distribution is very skewed
  const baseConfidence = Math.min(95, 50 + totalAssignments * 0.5);
  const distributionPenalty = avgDeviation * 20;

  return Math.max(50, baseConfidence - distributionPenalty);
}

/**
 * Generate recommendation based on test results
 */
function generateRecommendation(
  test: ABTest,
  winner: 'A' | 'B' | 'tie',
  perfA: ModelPerformance,
  perfB: ModelPerformance,
  confidence: number
): string {
  if (confidence < 70) {
    return 'Insufficient data for a reliable recommendation. Consider running the test longer.';
  }

  if (winner === 'tie') {
    return 'Both strategies performed similarly. No clear winner. Consider keeping the current default.';
  }

  const winnerStrategy = winner === 'A' ? test.strategyA : test.strategyB;
  const loserStrategy = winner === 'A' ? test.strategyB : test.strategyA;
  const winnerPerf = winner === 'A' ? perfA : perfB;
  const loserPerf = winner === 'A' ? perfB : perfA;

  const improvements: string[] = [];

  if (winnerPerf.successRate > loserPerf.successRate) {
    improvements.push(`success rate +${(winnerPerf.successRate - loserPerf.successRate).toFixed(1)}%`);
  }

  if (winnerPerf.avgLatencyMs < loserPerf.avgLatencyMs) {
    improvements.push(`latency -${(loserPerf.avgLatencyMs - winnerPerf.avgLatencyMs).toFixed(0)}ms`);
  }

  if (winnerPerf.avgCostUSD < loserPerf.avgCostUSD) {
    improvements.push(`cost -$${(loserPerf.avgCostUSD - winnerPerf.avgCostUSD).toFixed(4)}`);
  }

  return `Strategy "${winnerStrategy.name}" outperformed "${loserStrategy.name}" with ${improvements.join(', ')}. Adopt strategy "${winnerStrategy.name}" for ${test.strategyA.taskType} tasks.`;
}

/**
 * List all A/B tests with their status
 */
export async function listTests(): Promise<Array<{
  id: string;
  name: string;
  taskType: TaskType;
  status: string;
  trafficSplit: number;
  startTime: number;
  endTime?: number;
}>> {
  const tests = await getAllABTests();

  return tests.map(t => ({
    id: t.id,
    name: t.name,
    taskType: t.strategyA.taskType,
    status: t.status,
    trafficSplit: t.trafficSplit,
    startTime: t.startTime,
    endTime: t.endTime,
  }));
}
