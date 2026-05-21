/**
 * Routing Strategy Types
 * Type definitions for routing strategy automation and A/B testing
 */

import type { TaskType } from '../providers-ai-subscription';
import type { ModelPerformance } from '../routing-history/analytics';

/**
 * Routing Strategy - defines how to route a specific task type
 */
export interface RoutingStrategy {
  id: string;
  name: string;
  taskType: TaskType;
  preferredModel: string;
  preferredProvider: string;
  fallbackModel?: string;
  fallbackProvider?: string;
  minSuccessRate: number;    // Minimum acceptable success rate (0-100)
  maxLatencyMs: number;     // Maximum acceptable latency in ms
  enabled: boolean;
}

/**
 * A/B Test definition for comparing two routing strategies
 */
export interface ABTest {
  id: string;
  name: string;
  strategyA: RoutingStrategy;
  strategyB: RoutingStrategy;
  trafficSplit: number;      // 0-100, percentage of traffic to send to A
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'paused';
}

/**
 * Result of an A/B test conclusion
 */
export interface ABTestResult {
  testId: string;
  strategyA: ModelPerformance;
  strategyB: ModelPerformance;
  winner: 'A' | 'B' | 'tie';
  confidence: number;       // Statistical confidence in the result (0-100)
  recommendation: string;
}

/**
 * A/B Test assignment record
 */
export interface ABTestAssignment {
  testId: string;
  strategyId: string;        // 'A' or 'B'
  timestamp: number;
  routingDecisionId: string;
}

/**
 * Storage for A/B test data
 */
const AB_TEST_DB_NAME = 'ai-subscription-ab-tests';
const AB_TEST_STORE_NAME = 'ab-tests';
const AB_ASSIGNMENT_STORE_NAME = 'ab-assignments';

let abTestDB: IDBDatabase | null = null;

/**
 * Initialize A/B test database
 */
async function initABTestDB(): Promise<IDBDatabase> {
  if (abTestDB) return abTestDB;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AB_TEST_DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      abTestDB = request.result;
      resolve(abTestDB);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create ab-tests store
      if (!database.objectStoreNames.contains(AB_TEST_STORE_NAME)) {
        const store = database.createObjectStore(AB_TEST_STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('startTime', 'startTime', { unique: false });
      }

      // Create ab-assignments store
      if (!database.objectStoreNames.contains(AB_ASSIGNMENT_STORE_NAME)) {
        const store = database.createObjectStore(AB_ASSIGNMENT_STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('testId', 'testId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Get A/B test database instance
 */
async function getABTestDB(): Promise<IDBDatabase> {
  if (!abTestDB) await initABTestDB();
  return abTestDB!;
}

// ============================================================
// A/B Test Storage Operations
// ============================================================

/**
 * Save an A/B test
 */
export async function saveABTest(test: ABTest): Promise<void> {
  const db = await getABTestDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AB_TEST_STORE_NAME, 'readwrite');
    const store = tx.objectStore(AB_TEST_STORE_NAME);
    const request = store.put(test);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get an A/B test by ID
 */
export async function getABTest(testId: string): Promise<ABTest | null> {
  const db = await getABTestDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AB_TEST_STORE_NAME, 'readonly');
    const store = tx.objectStore(AB_TEST_STORE_NAME);
    const request = store.get(testId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Get all A/B tests
 */
export async function getAllABTests(): Promise<ABTest[]> {
  const db = await getABTestDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AB_TEST_STORE_NAME, 'readonly');
    const store = tx.objectStore(AB_TEST_STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get active (running) A/B tests
 */
export async function getActiveABTests(): Promise<ABTest[]> {
  const allTests = await getAllABTests();
  return allTests.filter(t => t.status === 'running');
}

/**
 * Save an A/B test assignment record
 */
export async function saveABTestAssignment(assignment: ABTestAssignment): Promise<void> {
  const db = await getABTestDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AB_ASSIGNMENT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(AB_ASSIGNMENT_STORE_NAME);
    const request = store.add(assignment);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get assignments for a specific test
 */
export async function getABTestAssignments(testId: string): Promise<ABTestAssignment[]> {
  const db = await getABTestDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AB_ASSIGNMENT_STORE_NAME, 'readonly');
    const store = tx.objectStore(AB_ASSIGNMENT_STORE_NAME);
    const index = store.index('testId');
    const request = index.getAll(testId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}
