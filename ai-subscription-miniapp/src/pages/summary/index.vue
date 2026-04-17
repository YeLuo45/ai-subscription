<template>
  <view class="container">
    <view class="header">
      <text class="title">AI 摘要</text>
    </view>

    <view v-if="!content" class="empty">
      <text>请先在内容列表中选择文章</text>
    </view>

    <view v-else>
      <!-- 文章信息 -->
      <view class="article-card">
        <text class="article-title">{{ content.title }}</text>
        <text class="article-date">{{ formatDate(content.pubDate) }}</text>
        <text class="article-desc">{{ content.description?.slice(0, 200) }}...</text>
      </view>

      <!-- 生成按钮 -->
      <button type="primary" @click="generateSummary" :loading="loading" :disabled="loading">
        {{ loading ? '生成中...' : '生成 AI 摘要' }}
      </button>

      <!-- 错误提示 -->
      <view v-if="error" class="error">
        <text>{{ error }}</text>
      </view>

      <!-- 摘要结果 -->
      <view v-if="summaryResult" class="result-card">
        <text class="result-title">摘要结果</text>
        <view class="summary-content">
          <text>{{ summaryResult.summary }}</text>
        </view>
        <view v-if="summaryResult.keywords.length > 0" class="keywords">
          <text class="keywords-label">关键词：</text>
          <view v-for="(kw, i) in summaryResult.keywords" :key="i" class="keyword-tag">{{ kw }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ContentItem } from '../../utils/storage';
import { AISummarizer } from '../../adapters/ai-model-adapter';
import { loadSettings } from '../../utils/storage';

const content = ref<ContentItem | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const summaryResult = ref<{ summary: string; keywords: string[] } | null>(null);
const summarizer = new AISummarizer();

onMounted(() => {
  // 获取全局选中的内容
  const app = getApp();
  if (app.globalData?.selectedContent) {
    content.value = app.globalData.selectedContent;
  }

  // 初始化 summarizer
  const settings = loadSettings();
  summarizer.setModels(settings.models || []);
});

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const generateSummary = async () => {
  if (!content.value) return;
  
  loading.value = true;
  error.value = null;
  summaryResult.value = null;

  try {
    const text = `${content.value.title}\n\n${content.value.description}`;
    const result = await summarizer.summarize(text, { summaryLength: 'medium' });

    if (result.success) {
      summaryResult.value = {
        summary: result.summary,
        keywords: result.keywords,
      };
    } else {
      error.value = result.error || '摘要生成失败';
    }
  } catch (err: any) {
    error.value = err.message || '摘要生成失败';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.container {
  padding: 20rpx;
}
.header {
  margin-bottom: 20rpx;
}
.title {
  font-size: 36rpx;
  font-weight: bold;
}
.empty {
  text-align: center;
  color: #999;
  padding: 100rpx 40rpx;
}
.article-card {
  background: #fff;
  padding: 30rpx;
  border-radius: 12rpx;
  margin-bottom: 30rpx;
}
.article-title {
  font-size: 32rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 12rpx;
}
.article-date {
  font-size: 24rpx;
  color: #888;
  display: block;
  margin-bottom: 16rpx;
}
.article-desc {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  display: block;
}
.error {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  padding: 20rpx;
  border-radius: 8rpx;
  margin-top: 20rpx;
  color: #ff4d4f;
}
.result-card {
  background: #fff;
  padding: 30rpx;
  border-radius: 12rpx;
  margin-top: 30rpx;
}
.result-title {
  font-size: 30rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 20rpx;
}
.summary-content {
  font-size: 28rpx;
  line-height: 1.8;
  color: #333;
  margin-bottom: 20rpx;
}
.keywords {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12rpx;
}
.keywords-label {
  font-size: 26rpx;
  color: #666;
}
.keyword-tag {
  background: #e6f7ff;
  color: #1890ff;
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
  font-size: 24rpx;
}
</style>
