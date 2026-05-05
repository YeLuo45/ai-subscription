/**
 * Email Service
 * Handles email sending via fetch-based API
 */

import type { Subscriber, EmailTemplate, EmailHistory, EmailSendingProgress, EmailSendingResult } from '../types/emailSubscription';
import * as db from '../db/emailSubscriptionDB';

const EMAIL_API_ENDPOINT = 'https://email.moeyy.cn/api/send'; // Example email API

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

function generateUnsubscribeToken(subscriberId: string): string {
  return btoa(`${subscriberId}:${Date.now()}`).replace(/[+/=]/g, '');
}

function buildUnsubscribeUrl(token: string): string {
  return `${window.location.origin}/unsubscribe?token=${token}`;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function generateSubscriberId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function createSubscriber(
  email: string,
  name?: string,
  subscriptionType: Subscriber['subscriptionType'] = 'daily',
  customTags?: string[]
): Promise<Subscriber> {
  // Check if email already exists
  const existing = await db.getSubscriberByEmail(email);
  if (existing) {
    throw new Error('该邮箱已被订阅');
  }

  if (!validateEmail(email)) {
    throw new Error('邮箱格式不正确');
  }

  const now = Date.now();
  const subscriber: Subscriber = {
    id: generateSubscriberId(),
    email,
    name,
    status: 'active',
    subscriptionType,
    customTags,
    createdAt: now,
    updatedAt: now,
    unsubscribeToken: generateUnsubscribeToken(email),
  };

  await db.saveSubscriber(subscriber);
  return subscriber;
}

export async function removeSubscriber(id: string): Promise<void> {
  await db.updateSubscriberStatus(id, 'unsubscribed');
}

export async function permanentlyDeleteSubscriber(id: string): Promise<void> {
  await db.deleteSubscriber(id);
}

export async function updateSubscriber(
  id: string,
  updates: Partial<Pick<Subscriber, 'name' | 'subscriptionType' | 'customTags' | 'status'>>
): Promise<Subscriber> {
  const subscriber = await db.getSubscriberById(id);
  if (!subscriber) {
    throw new Error('订阅者不存在');
  }

  const updated: Subscriber = {
    ...subscriber,
    ...updates,
    updatedAt: Date.now(),
  };

  await db.saveSubscriber(updated);
  return updated;
}

export async function pauseSubscriber(id: string): Promise<void> {
  await db.updateSubscriberStatus(id, 'paused');
}

export async function resumeSubscriber(id: string): Promise<void> {
  await db.updateSubscriberStatus(id, 'active');
}

export async function unsubscribeByToken(token: string): Promise<boolean> {
  const allSubscribers = await db.getAllSubscribers();
  const subscriber = allSubscribers.find(s => s.unsubscribeToken === token);
  
  if (subscriber) {
    await db.updateSubscriberStatus(subscriber.id, 'unsubscribed');
    return true;
  }
  return false;
}

async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(EMAIL_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.message || `HTTP ${response.status}` 
      };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '网络错误' 
    };
  }
}

export async function sendEmailToSubscriber(
  subscriber: Subscriber,
  template: EmailTemplate,
  content: string,
  additionalVars?: Record<string, string>
): Promise<EmailHistory> {
  const now = Date.now();
  const historyId = `hist_${now}_${Math.random().toString(36).slice(2, 9)}`;
  
  // Replace template variables
  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN');
  const weekStr = `${today.getFullYear()}年第${Math.ceil(today.getDate() / 7)}周`;
  
  const unsubscribeUrl = buildUnsubscribeUrl(subscriber.unsubscribeToken || '');
  
  const subject = template.subject
    .replace('{{date}}', dateStr)
    .replace('{{week}}', weekStr);
  
  const htmlContent = template.content
    .replace('{{content}}', content)
    .replace('{{date}}', dateStr)
    .replace('{{week}}', weekStr)
    .replace('{{unsubscribeUrl}}', unsubscribeUrl);
  
  // Create history record
  const historyEntry: EmailHistory = {
    id: historyId,
    to: subscriber.email,
    subject,
    content: htmlContent,
    status: 'pending',
    createdAt: now,
    retryCount: 0,
  };
  
  await db.saveEmailHistory(historyEntry);
  
  // Send email
  const result = await sendEmail({
    to: subscriber.email,
    subject,
    html: htmlContent,
  });
  
  if (result.success) {
    await db.updateEmailHistoryStatus(historyId, 'sent');
    historyEntry.status = 'sent';
    historyEntry.sentAt = Date.now();
  } else {
    await db.updateEmailHistoryStatus(historyId, 'failed', result.error);
    historyEntry.status = 'failed';
    historyEntry.errorMessage = result.error;
  }
  
  return historyEntry;
}

export async function sendBulkEmails(
  subscribers: Subscriber[],
  template: EmailTemplate,
  content: string,
  onProgress?: (progress: EmailSendingProgress) => void
): Promise<EmailSendingResult> {
  const progress: EmailSendingProgress = {
    total: subscribers.length,
    sent: 0,
    failed: 0,
  };
  
  const failedEmails: string[] = [];
  
  for (const subscriber of subscribers) {
    if (subscriber.status !== 'active') {
      continue;
    }
    
    progress.current = subscriber.email;
    onProgress?.(progress);
    
    try {
      const result = await sendEmailToSubscriber(subscriber, template, content);
      
      if (result.status === 'sent') {
        progress.sent++;
      } else {
        progress.failed++;
        failedEmails.push(subscriber.email);
      }
    } catch (error) {
      progress.failed++;
      failedEmails.push(subscriber.email);
    }
    
    onProgress?.(progress);
  }
  
  // Remove current after completion
  progress.current = undefined;
  onProgress?.(progress);
  
  return {
    success: progress.failed === 0,
    progress,
    failedEmails,
  };
}

export async function retryFailedEmails(
  template: EmailTemplate,
  content: string,
  onProgress?: (progress: EmailSendingProgress) => void
): Promise<EmailSendingResult> {
  const failedRecords = await db.getFailedEmails();
  
  // Get unique emails from failed records
  const uniqueEmails = [...new Set(failedRecords.map(h => h.to))];
  
  // Get subscribers for these emails
  const subscribers: Subscriber[] = [];
  for (const email of uniqueEmails) {
    const subscriber = await db.getSubscriberByEmail(email);
    if (subscriber && subscriber.status === 'active') {
      subscribers.push(subscriber);
    }
  }
  
  return sendBulkEmails(subscribers, template, content, onProgress);
}

export async function getEmailHistory(): Promise<EmailHistory[]> {
  return db.getAllEmailHistory();
}

export async function getTemplates(): Promise<EmailTemplate[]> {
  return db.getAllTemplates();
}

export async function getTemplate(id: string): Promise<EmailTemplate | undefined> {
  return db.getTemplateById(id);
}

export async function saveTemplate(template: EmailTemplate): Promise<void> {
  return db.saveTemplate(template);
}

export async function deleteTemplate(id: string): Promise<void> {
  return db.deleteTemplate(id);
}

export async function initDefaultTemplatesIfNeeded(): Promise<void> {
  return db.initDefaultTemplates();
}

export async function getSubscribers(): Promise<Subscriber[]> {
  return db.getAllSubscribers();
}

export async function getActiveSubscribers(): Promise<Subscriber[]> {
  return db.getActiveSubscribers();
}
