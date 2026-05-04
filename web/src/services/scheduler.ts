// Scheduler service - manages periodic fetching
import type { Subscription } from '../types';
import { fetchFeed, fetchGitHubTrending, attachSubscriptionId } from './feedParser';
import { summarizeWithFallback } from './aiAdapter';
import { notifyError } from './notifications';
import { sendWebhook } from '../api/webhook';
import { sendSubscriptionEmail } from './email';
import {
  getSubscriptions,
  updateSubscription,
  getArticles,
  saveArticle,
  getArticleByLink,
  getModels,
  getSettings,
  saveSummary,
  savePushHistory,
} from './storage';

let fetchTimer: number | null = null;
let onUpdateCallback: (() => void) | undefined;

export function setOnUpdate(cb: () => void) {
  onUpdateCallback = cb;
}

function triggerUpdate() {
  onUpdateCallback?.();
}

async function fetchSubscription(sub: Subscription): Promise<number> {
  try {
    let articles;
    if (sub.url.includes('github.com/trending')) {
      articles = await fetchGitHubTrending();
    } else {
      articles = await fetchFeed(sub.url);
    }
    articles = attachSubscriptionId(articles, sub.id);

    let newCount = 0;
    for (const article of articles) {
      // Check if already saved
      const existing = await getArticleByLink(article.link);
      if (!existing) {
        await saveArticle(article);
        newCount++;
      }
    }

    // Update last fetched time
    await updateSubscription({ ...sub, lastFetchedAt: new Date().toISOString() });
    return newCount;
  } catch (err) {
    console.error(`Failed to fetch ${sub.name}:`, err);
    notifyError(`${sub.name} 抓取失败: ${err instanceof Error ? err.message : String(err)}`);
    return 0;
  }
}

export async function fetchAllSubscriptions(): Promise<void> {
  const subs = await getSubscriptions();
  const enabledSubs = subs.filter((s) => s.enabled);
  let totalNew = 0;

  for (const sub of enabledSubs) {
    const newCount = await fetchSubscription(sub);
    totalNew += newCount;
  }

  if (totalNew > 0) {
    triggerUpdate();
  }
}

export async function generateSummariesForSubscription(sub: Subscription): Promise<{ articleId: string; summaryId: string }[]> {
  const models = await getModels();
  const settings = await getSettings();
  const articles = await getArticles(sub.id, 20);
  const results: { articleId: string; summaryId: string }[] = [];

  for (const article of articles.slice(0, 5)) {
    const result = await summarizeWithFallback(
      { title: article.title, content: article.content || '', description: article.description },
      models,
      settings.summaryLength
    );

    if (result.success) {
      const summaryRec = await saveSummary({
        articleId: article.id,
        subscriptionId: sub.id,
        content: result.summary,
        keywords: result.keywords,
        modelId: result.modelId,
        tokenUsed: result.tokensUsed,
      });
      results.push({ articleId: article.id, summaryId: summaryRec.id });
    }
  }

  return results;
}

export async function runScheduledPush(): Promise<void> {
  const settings = await getSettings();
  if (!settings.push.enabled) return;

  // Check quiet hours
  if (settings.push.quietHoursEnabled) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const [qStart, qEnd] = [settings.push.quietHoursStart, settings.push.quietHoursEnd];
    if (isInQuietHours(currentTime, qStart, qEnd)) {
      return;
    }
  }

  // Fetch fresh content
  await fetchAllSubscriptions();

  // Get recent articles
  const articles = await getArticles(undefined, settings.push.maxDailyPush);
  const subs = await getSubscriptions();
  const subMap = new Map(subs.map((s) => [s.id, s]));

  if (articles.length === 0) return;

  // Group by subscription
  const bySub = new Map<string, typeof articles>();
  for (const article of articles) {
    const list = bySub.get(article.subscriptionId) || [];
    list.push(article);
    bySub.set(article.subscriptionId, list);
  }

  // Generate summaries and push
  for (const [subId, subArticles] of bySub) {
    const sub = subMap.get(subId);
    if (!sub || !sub.enabled || !sub.aiSummaryEnabled) continue;

    const summaries = await generateSummariesForSubscription(sub);

    // Send notification
    const article = subArticles[0];
    const summaryContent = summaries.length > 0
      ? `已生成${summaries.length}篇AI摘要`
      : '';

    const notificationTitle = `${sub.name} 更新 (${subArticles.length}篇)`;
    const notificationBody = `${article.title}${summaryContent ? '\n' + summaryContent : ''}`;

    if (settings.push.channel === 'notification' || settings.push.channel === 'both') {
      // Use synthetic notification via browser
      if (Notification.permission === 'granted') {
        new Notification(notificationTitle, {
          body: notificationBody.slice(0, 200),
          icon: '/favicon.ico',
        });
      }
    }

    // Send email if configured
    if ((settings.push.channel === 'email' || settings.push.channel === 'both') && settings.email.enabled) {
      const emailSent = await sendSubscriptionEmail(
        settings.email.fromEmail || 'user@example.com',
        sub.name,
        subArticles.length,
        subArticles.map(a => ({ title: a.title, link: a.link, description: a.description })),
        summaries.map(s => ({ title: subArticles.find(a => a.id === s.articleId)?.title || '', summary: '' }))
      );
      
      if (!emailSent) {
        console.error(`Email send failed for ${sub.name}`);
      }
    }

    // Send webhook if configured
    if (settings.push.channel === 'webhook' || settings.push.channel === 'both') {
      const webhookUrl = (settings as any).webhookUrl;
      if (webhookUrl) {
        const webhookHeaders = (settings as any).webhookHeaders || {};
        const result = await sendWebhook(
          webhookUrl,
          {
            subscription: sub.name,
            count: subArticles.length,
            articles: subArticles.map(a => ({
              title: a.title,
              link: a.link,
              description: a.description,
              pubDate: a.pubDate,
            })),
            summaries: summaries.map(s => ({
              title: subArticles.find(a => a.id === s.articleId)?.title || '',
              summary: s.summaryId || '',
            })),
            pushedAt: new Date().toISOString(),
          },
          webhookHeaders
        );

        if (!result.success) {
          console.error(`Webhook send failed for ${sub.name}:`, result.error);
          await savePushHistory({
            subscriptionId: subId,
            title: `[Webhook] ${notificationTitle}`,
            summary: `推送失败: ${result.error}`,
            pushChannel: 'webhook',
            pushedAt: new Date().toISOString(),
            status: 'failure',
            errorMessage: result.error,
          });
        }
      }
    }

    // Save push history
    await savePushHistory({
      subscriptionId: subId,
      title: notificationTitle,
      summary: notificationBody,
      pushChannel: settings.push.channel,
      pushedAt: new Date().toISOString(),
      status: 'success',
    });
  }
}

function isInQuietHours(current: string, start: string, end: string): boolean {
  if (start <= end) {
    return current >= start && current <= end;
  } else {
    // Overnight quiet hours (e.g., 23:00 - 08:00)
    return current >= start || current <= end;
  }
}

export function startScheduler(intervalMinutes = 30): void {
  if (fetchTimer) clearInterval(fetchTimer);
  
  // Initial fetch
  fetchAllSubscriptions();

  // Periodic fetch
  fetchTimer = setInterval(() => {
    fetchAllSubscriptions();
  }, intervalMinutes * 60 * 1000);

  // Also schedule daily push at configured time
  scheduleDailyPush();
}

export function stopScheduler(): void {
  if (fetchTimer) {
    clearInterval(fetchTimer);
    fetchTimer = null;
  }
}

let dailyPushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleDailyPush(): void {
  // Reschedule based on settings time
  getSettings().then((settings) => {
    if (dailyPushTimer) clearTimeout(dailyPushTimer);
    const [hours, minutes] = settings.push.time.split(':').map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();
    dailyPushTimer = setTimeout(async () => {
      await runScheduledPush();
      scheduleDailyPush(); // Reschedule for next day
    }, delay);
  });
}

export { isInQuietHours };
