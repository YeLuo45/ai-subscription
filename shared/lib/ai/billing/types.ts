// Billing types - Subscription plans, usage tracking, billing history

export type PlanTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface SubscriptionPlan {
  id: PlanTier;
  name: string;
  priceUSD: number; // cents
  quotaTokens: number; // monthly limit
  features: string[];
}

export interface UsageRecord {
  periodStart: number; // timestamp
  periodEnd: number;
  totalTokens: number;
  totalCostUSD: number;
  requestCount: number;
  overageCount: number; // how many times quota was exceeded
}

export interface BillingHistoryEntry {
  id: string;
  periodStart: number;
  periodEnd: number;
  plan: PlanTier;
  usage: UsageRecord;
  status: 'paid' | 'pending' | 'overdue' | 'free';
  createdAt: number;
}

export interface CurrentSubscription {
  plan: PlanTier;
  startDate: number;
  isActive: boolean;
}

export interface QuotaStatus {
  usedTokens: number;
  quotaTokens: number;
  usagePercent: number;
  remainingTokens: number;
  isOverQuota: boolean;
  isWarning: boolean; // >= 80%
}
