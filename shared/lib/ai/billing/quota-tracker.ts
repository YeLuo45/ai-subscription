// Quota tracker - monitors token usage against plan limits
import type { QuotaStatus, CurrentSubscription } from './types';
import { PLANS, getPlan } from './plans';
import type { CostRecord } from '../cost-tracker/types';

// Storage key for current subscription
const SUBSCRIPTION_KEY = 'ai-subscription-current';

function getCurrentPeriod(): { start: number; end: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  return { start, end };
}

function getStorage(): typeof localStorage {
  return globalThis.localStorage;
}

export async function getCurrentSubscription(): Promise<CurrentSubscription> {
  const stored = getStorage().getItem(SUBSCRIPTION_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  // Default to free plan
  return { plan: 'free', startDate: Date.now(), isActive: true };
}

export async function setCurrentSubscription(sub: CurrentSubscription): Promise<void> {
  getStorage().setItem(SUBSCRIPTION_KEY, JSON.stringify(sub));
}

export async function getCurrentUsage(): Promise<number> {
  const { start, end } = getCurrentPeriod();
  
  // Dynamic import to avoid circular dependency
  const { getRecordsByTimeRange } = await import('../cost-tracker/storage');
  const records: CostRecord[] = await getRecordsByTimeRange(start, end);
  
  return records.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0);
}

export async function getQuotaStatus(): Promise<QuotaStatus> {
  const [subscription, usage] = await Promise.all([
    getCurrentSubscription(),
    getCurrentUsage(),
  ]);
  
  const plan = getPlan(subscription.plan);
  const quotaTokens = plan.quotaTokens === Infinity ? Number.MAX_SAFE_INTEGER : plan.quotaTokens;
  const remaining = Math.max(0, quotaTokens - usage);
  const usagePercent = quotaTokens === Number.MAX_SAFE_INTEGER ? 0 : (usage / quotaTokens) * 100;
  
  return {
    usedTokens: usage,
    quotaTokens: plan.quotaTokens,
    usagePercent: Math.min(100, usagePercent),
    remainingTokens: remaining,
    isOverQuota: usage >= quotaTokens,
    isWarning: usagePercent >= 80,
  };
}

export async function checkQuota(): Promise<{ allowed: boolean; reason?: string; status?: QuotaStatus }> {
  const status = await getQuotaStatus();
  
  if (status.isOverQuota) {
    return { allowed: false, reason: 'quota_exceeded', status };
  }
  
  if (status.isWarning) {
    // Allow but warn
    return { allowed: true, status };
  }
  
  return { allowed: true, status };
}

export async function recordOverage(): Promise<void> {
  // Track overage count - stored in localStorage for simplicity
  const key = `ai-subscription-overage-${getCurrentPeriod().start}`;
  const count = parseInt(getStorage().getItem(key) || '0', 10);
  getStorage().setItem(key, String(count + 1));
}

export async function getOverageCount(): Promise<number> {
  const key = `ai-subscription-overage-${getCurrentPeriod().start}`;
  return parseInt(getStorage().getItem(key) || '0', 10);
}
