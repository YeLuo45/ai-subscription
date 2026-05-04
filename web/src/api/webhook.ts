// Webhook push API endpoint and utility
import type { Subscription, Article, Summary } from '../types';
import { savePushHistory } from '../services/storage';

export interface WebhookPayload {
  subscription: string;
  count: number;
  articles: Array<{
    title: string;
    link: string;
    description: string;
    pubDate: string;
  }>;
  summaries: Array<{
    title: string;
    summary: string;
  }>;
  pushedAt: string;
}

export async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  headers: Record<string, string> = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMessage };
  }
}

// API endpoint handler for POST /api/webhook/deliver
export async function handleWebhookDeliver(
  request: Request
): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json() as {
      subscription: string;
      count: number;
      articles: Array<{
        title: string;
        link: string;
        description: string;
        pubDate: string;
      }>;
      summaries: Array<{
        title: string;
        summary: string;
      }>;
      pushedAt: string;
      webhookUrl: string;
      webhookHeaders?: Record<string, string>;
    };

    const { webhookUrl, webhookHeaders = {} } = body;
    const payload: WebhookPayload = {
      subscription: body.subscription,
      count: body.count,
      articles: body.articles,
      summaries: body.summaries,
      pushedAt: body.pushedAt,
    };

    const result = await sendWebhook(webhookUrl, payload, webhookHeaders);

    if (!result.success) {
      // Save failed push to history
      await savePushHistory({
        subscriptionId: '',
        title: `[Webhook] ${payload.subscription} 更新 (${payload.count}篇)`,
        summary: `推送失败: ${result.error}`,
        pushChannel: 'webhook',
        pushedAt: new Date().toISOString(),
        status: 'failure',
        errorMessage: result.error,
      });
    }

    return Response.json(result);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return Response.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
