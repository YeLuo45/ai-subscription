<template>
  <view class="container">
    <view class="toolbar">
      <input class="search-input" v-model="searchKeyword" placeholder="搜索文章标题..." @confirm="search" />
      <button class="btn" @tap="search">🔍</button>
    </view>

    <view class="article-list">
      <view v-for="article in filteredArticles" :key="article.id" class="article-card">
        <view class="article-header" @tap="toggleExpand(article.id)">
          <text class="article-title">{{ article.title }}</text>
          <text class="expand-icon">{{ expandedId === article.id ? '▲' : '▼' }}</text>
        </view>
        <view v-if="expandedId === article.id" class="article-body">
          <text class="article-desc">{{ article.description || article.content || '无描述' }}</text>
          <view class="article-meta">
            <text>{{ formatDate(article.pubDate) }}</text>
            <text>{{ getSubName(article.subscriptionId) }}</text>
          </view>
          <view class="article-actions">
            <button class="action-btn" @tap="copyLink(article.link)">📋 复制链接</button>
            <button class="action-btn" @tap="summarize(article)">{{ summarizingId === article.id ? '生成中...' : '🤖 AI摘要' }}</button>
          </view>
          <view v-if="summaries[article.id]" class="summary-box">
            <text class="summary-label">AI摘要：</text>
            <text class="summary-content">{{ summaries[article.id] }}</text>
          </view>
        </view>
      </view>
      <view v-if="filteredArticles.length === 0" class="empty">
        <text>暂无文章</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Article } from '@/types';
import { getArticles, getSubscriptions, getSummaries } from '@/services/storage';
import { summarizeWithFallback } from '@/services/aiAdapter';
import { getModels } from '@/services/storage';

const articles = ref<Article[]>([]);
const subscriptions = ref<Awaited<ReturnType<typeof getSubscriptions>>>([]);
const searchKeyword = ref('');
const expandedId = ref<string | null>(null);
const summarizingId = ref<string | null>(null);
const summaries = ref<Record<string, string>>({});

const filteredArticles = computed(() => {
  if (!searchKeyword.value) return articles.value;
  const kw = searchKeyword.value.toLowerCase();
  return articles.value.filter(a => a.title.toLowerCase().includes(kw));
});

onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1] as any;
  const subId = currentPage?.options?.subId;
  
  articles.value = subId ? getArticles(subId) : getArticles(undefined, 100);
  subscriptions.value = getSubscriptions();
  
  // Load existing summaries
  const allSummaries = getSummaries();
  for (const s of allSummaries) {
    summaries.value[s.articleId] = s.content;
  }
});

function getSubName(subId: string): string {
  return subscriptions.value.find(s => s.id === subId)?.name || '';
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

function copyLink(link: string) {
  uni.setClipboardData({
    data: link,
    success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
  });
}

async function summarize(article: Article) {
  if (summarizingId.value) return;
  summarizingId.value = article.id;
  try {
    const mods = getModels();
    const result = await summarizeWithFallback(
      { title: article.title, content: article.content || '', description: article.description },
      mods,
      'medium'
    );
    if (result.success) {
      summaries.value[article.id] = result.summary;
      uni.showToast({ title: '摘要生成成功', icon: 'success' });
    } else {
      uni.showToast({ title: result.error || '生成失败', icon: 'fail' });
    }
  } finally {
    summarizingId.value = null;
  }
}

function search() {
  // Filter is reactive, this just triggers if needed
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN');
}
</script>

<style scoped>
.container { padding: 16px; background: #f5f5f5; min-height: 100vh; }
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
.search-input { flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; font-size: 14px; background: #fff; }
.btn { width: 40px; background: #fff; border: 1px solid #ddd; border-radius: 6px; }
.article-list { display: flex; flex-direction: column; gap: 10px; }
.article-card { background: #fff; border-radius: 8px; padding: 12px; }
.article-header { display: flex; justify-content: space-between; align-items: center; }
.article-title { font-size: 14px; font-weight: 500; flex: 1; }
.expand-icon { font-size: 10px; color: #888; margin-left: 8px; }
.article-body { margin-top: 10px; }
.article-desc { font-size: 13px; color: #666; display: block; line-height: 1.5; }
.article-meta { display: flex; justify-content: space-between; font-size: 11px; color: #aaa; margin-top: 8px; }
.article-actions { display: flex; gap: 8px; margin-top: 8px; }
.action-btn { flex: 1; font-size: 12px; padding: 4px 0; background: #f5f5f5; border-radius: 4px; }
.summary-box { margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 6px; border-left: 3px solid #1890ff; }
.summary-label { font-size: 12px; color: #1890ff; font-weight: bold; display: block; margin-bottom: 4px; }
.summary-content { font-size: 12px; color: #333; line-height: 1.5; display: block; }
.empty { text-align: center; padding: 40px; color: #888; }
</style>
