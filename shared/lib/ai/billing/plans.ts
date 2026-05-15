// Subscription plans definition
import type { SubscriptionPlan } from './types';

export const PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    priceUSD: 0,
    quotaTokens: 100_000, // 100K tokens
    features: ['Basic AI summaries', 'Up to 50 articles/month'],
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    priceUSD: 990, // $9.90
    quotaTokens: 1_000_000, // 1M tokens
    features: ['All Free features', 'Unlimited articles', 'Email support'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceUSD: 2990, // $29.90
    quotaTokens: 5_000_000, // 5M tokens
    features: ['All Basic features', 'Priority processing', 'Advanced analytics'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceUSD: 9900, // $99.00
    quotaTokens: Infinity, // unlimited
    features: ['All Pro features', 'Unlimited tokens', 'Dedicated support', 'Custom integrations'],
  },
};

export function getPlan(tier: string): SubscriptionPlan {
  return PLANS[tier] || PLANS.free;
}

export function formatPrice(cents: number): string {
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}
