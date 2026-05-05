/**
 * Email Subscription Types
 * Subscribers, templates, and email history types
 */

export type SubscriptionType = 'daily' | 'weekly' | 'custom';
export type SubscriberStatus = 'active' | 'paused' | 'unsubscribed';
export type EmailStatus = 'pending' | 'sending' | 'sent' | 'failed';

export interface Subscriber {
  id: string;
  email: string;
  name?: string;
  status: SubscriberStatus;
  subscriptionType: SubscriptionType;
  customTags?: string[];
  createdAt: number;
  updatedAt: number;
  unsubscribeToken?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  type: 'daily' | 'weekly';
  subject: string;
  content: string; // HTML content
  createdAt: number;
  updatedAt: number;
}

export interface EmailHistory {
  id: string;
  to: string;
  subject: string;
  content: string;
  status: EmailStatus;
  errorMessage?: string;
  sentAt?: number;
  createdAt: number;
  retryCount: number;
}

export interface EmailSendingProgress {
  total: number;
  sent: number;
  failed: number;
  current?: string;
}

export interface EmailSendingResult {
  success: boolean;
  progress: EmailSendingProgress;
  failedEmails: string[];
}

// Default templates
export const DEFAULT_DAILY_TEMPLATE: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '每日精选',
  type: 'daily',
  subject: '📬 每日精选 - {{date}}',
  content: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a1a1a;">📬 每日精选</h1>
  <p style="color: #666;">{{date}}</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <div>{{content}}</div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #999; font-size: 12px;">
    如果您不想继续接收此类邮件，<a href="{{unsubscribeUrl}}">点击退订</a>
  </p>
</body>
</html>
  `.trim(),
};

export const DEFAULT_WEEKLY_TEMPLATE: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '每周精选',
  type: 'weekly',
  subject: '📊 每周精选 - {{week}}',
  content: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #1a1a1a;">📊 每周精选</h1>
  <p style="color: #666;">{{week}}</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <div>{{content}}</div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #999; font-size: 12px;">
    如果您不想继续接收此类邮件，<a href="{{unsubscribeUrl}}">点击退订</a>
  </p>
</body>
</html>
  `.trim(),
};
