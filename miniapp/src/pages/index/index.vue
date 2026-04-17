<template>
  <view class="container">
    <view class="header">
      <text class="title">🤖 AI订阅聚合</text>
      <text class="subtitle">智能摘要 · 定时推送</text>
    </view>

    <view class="stats">
      <view class="stat-item">
        <text class="stat-num">{{ subscriptions.length }}</text>
        <text class="stat-label">订阅源</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">{{ articles.length }}</text>
        <text class="stat-label">文章</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">{{ enabledCount }}</text>
        <text class="stat-label">已启用</text>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">📰 热门订阅源</text>
        <text class="more" @tap="goFeeds">更多 »</text>
      </view>
      <view class="feed-list">
        <view v-for="sub in topSubscriptions" :key="sub.id" class="feed-item" @tap="goArticles(sub.id)">
          <view class="feed-info">
            <text class="feed-name">{{ sub.name }}</text>
            <text class="feed-meta">{{ sub.category }} · {{ sub.type.toUpperCase() }}</text>
          </view>
          <switch :checked="sub.enabled" @change.stop="toggleEnabled(sub)" />
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">📝 最新文章</text>
        <text class="more" @tap="goArticlesAll">更多 »</text>
      </view>
      <view class="article-list">
        <view v-for="article in recentArticles" :key="article.id" class="article-item" @tap="openArticle(article)">
          <text class="article-title">{{ article.title }}</text>
          <text class="article-desc">{{ article.description?.slice(0, 80) }}...</text>
          <text class="article-date">{{ formatDate(article.pubDate) }}</text>
        </view>
        <view v-if="recentArticles.length === 0" class="empty">
          <text>暂无文章，点击刷新获取内容</text>
        </view>
      </view>
    </view>

    <view class="actions">
      <button class="btn-primary" @tap="refreshAll" :loading="refreshing">
        {{ refreshing ? '刷新中...' : '🔄 刷新全部' }}
      </button>
      <button class="btn-secondary" @tap="generateAllSummaries" :disabled="summarizing">
        {{ summarizing ? '生成中...' : '🤖 AI摘要' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Subscription, Article } from '@/types';
import { getSubscriptions, updateSubscription, getArticles, saveSubscription } from '@/services/storage';
import { fetchFeed, fetchGitHubTrending, attachSubscriptionId } from '@/services/feedParser';
import { summarizeWithFallback } from '@/services/aiAdapter';
import { PRESET_SUBSCRIPTIONS, DEFAULT_MODELS } from '@/types';
import { getModels, saveModel, saveSummary } from '@/services/storage';

const subscriptions = ref<Subscription[]>([]);
const articles = ref<Article[]>([]);
const refreshing = ref(false);
const summarizing = ref(false);

const enabledCount = computed(() => subscriptions.value.filter(s => s.enabled).length);
const topSubscriptions = computed(() => subscriptions.value.slice(0, 5));
const recentArticles = computed(() => articles.value.slice(0, 10));

onMounted(async () => {
  await initData();
});

async function initData() {
  let subs = getSubscriptions();
  if (subs.length === 0) {
    for (const preset of PRESET_SUBSCRIPTIONS) {
      saveSubscription(preset);
    }
    subs = getSubscriptions();
  }
  const mods = getModels();
  if (mods.length === 0) {
    for (const model of DEFAULT_MODELS) {
      saveModel(model);
    }
  }
  subscriptions.value = subs;
  articles.value = getArticles(undefined, 100);
}

async function refreshAll() {
  refreshing.value = true;
  try {
    const enabledSubs = subscriptions.value.filter(s => s.enabled);
    for (const sub of enabledSubs) {
      try {
        let arts;
        if (sub.url.includes('github.com/trending')) {
          arts = await fetchGitHubTrending();
        } else {
          arts = await fetchFeed(sub.url);
        }
        arts = attachSubscriptionId(arts, sub.id);
        for (const art of arts) {
          const existing = getArticles().find(a => a.link === art.link);
          if (!existing) {
            const { saveArticle } = await import('@/services/storage');
            saveArticle(art);
          }
        }
        updateSubscription({ ...sub, lastFetchedAt: new Date().toISOString() });
      } catch (e) {
        console.warn(`Failed to fetch ${sub.name}:`, e);
      }
    }
    articles.value = getArticles(undefined, 100);
    uni.showToast({ title: '刷新完成', icon: 'success' });
  } catch (e) {
    uni.showToast({ title: '刷新失败', icon: 'fail' });
  } finally {
    refreshing.value = false;
  }
}

async function generateAllSummaries() {
  if (summarizing.value) return;
  summarizing.value = true;
  try {
    const mods = getModels();
    const sets = { summaryLength: 'medium' as const };
    const arts = articles.value.slice(0, 5);
    for (const art of arts) {
      const result = await summarizeWithFallback(
        { title: art.title, content: art.content || '', description: art.description },
        mods,
        sets.summaryLength
      );
      if (result.success) {
        saveSummary({
          articleId: art.id,
          subscriptionId: art.subscriptionId,
          content: result.summary,
          keywords: result.keywords,
          modelId: result.modelId,
          tokenUsed: result.tokensUsed,
        });
      }
    }
    uni.showToast({ title: '摘要生成完成', icon: 'success' });
  } catch (e) {
    uni.showToast({ title: '摘要生成失败', icon: 'fail' });
  } finally {
    summarizing.value = false;
  }
}

function toggleEnabled(sub: Subscription) {
  const updated = updateSubscription({ ...sub, enabled: !sub.enabled });
  subscriptions.value = subscriptions.value.map(s => s.id === updated.id ? updated : s);
}

function goFeeds() {
  uni.navigateTo({ url: '/pages/feeds/feeds' });
}

function goArticles(subId: string) {
  uni.navigateTo({ url: `/pages/articles/articles?subId=${subId}` });
}

function goArticlesAll() {
  uni.navigateTo({ url: '/pages/articles/articles' });
}

function openArticle(article: Article) {
  // #ifdef H5
  window.open(article.link, '_blank');
  // #endif
  // #ifndef H5
  uni.setClipboardData({ data: article.link, success: () => uni.showToast({ title: '链接已复制' }) });
  // #endif
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${Math.floor(diff / 86400000)}天前`;
}

onMounted(() => {
  uni.startPullDownRefresh({});
});

onPullDownRefresh(() => {
  refreshAll().finally(() => uni.stopPullDownRefresh());
});
</script>

<style scoped>
.container { padding: 16px; background: #f5f5f5; min-height: 100vh; }
.header { text-align: center; padding: 20px 0; }
.title { font-size: 24px; font-weight: bold; display: block; }
.subtitle { font-size: 14px; color: #888; display: block; margin-top: 4px; }
.stats { display: flex; justify-content: space-around; background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.stat-item { text-align: center; }
.stat-num { font-size: 24px; font-weight: bold; color: #1890ff; display: block; }
.stat-label { font-size: 12px; color: #888; }
.section { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-title { font-size: 16px; font-weight: bold; }
.more { font-size: 12px; color: #1890ff; }
.feed-list { display: flex; flex-direction: column; gap: 12px; }
.feed-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.feed-item:last-child { border-bottom: none; }
.feed-name { font-size: 14px; font-weight: 500; display: block; }
.feed-meta { font-size: 12px; color: #888; }
.article-list { display: flex; flex-direction: column; gap: 12px; }
.article-item { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.article-item:last-child { border-bottom: none; }
.article-title { font-size: 14px; font-weight: 500; display: block; margin-bottom: 4px; }
.article-desc { font-size: 12px; color: #888; display: block; }
.article-date { font-size: 11px; color: #bbb; display: block; margin-top: 4px; }
.empty { text-align: center; padding: 20px; color: #888; font-size: 14px; }
.actions { display: flex; gap: 12px; margin-top: 8px; }
.btn-primary { flex: 1; background: #1890ff; color: #fff; border-radius: 8px; font-size: 14px; }
.btn-secondary { flex: 1; background: #fff; color: #1890ff; border: 1px solid #1890ff; border-radius: 8px; font-size: 14px; }
</style>
