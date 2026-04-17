<template>
  <view class="container">
    <view class="header">
      <text class="title">内容列表</text>
    </view>

    <!-- 筛选标签 -->
    <scroll-view scroll-x class="filter-scroll">
      <view class="filter-tags">
        <view
          :class="['filter-tag', selectedSubId === null ? 'active' : '']"
          @click="selectedSubId = null"
        >
          全部
        </view>
        <view
          v-for="sub in subscriptions"
          :key="sub.id"
          :class="['filter-tag', selectedSubId === sub.id ? 'active' : '']"
          @click="selectedSubId = sub.id"
        >
          {{ sub.name }} ({{ getContents(sub.id).length }})
        </view>
      </view>
    </scroll-view>

    <!-- 内容列表 -->
    <view v-if="displayContents.length === 0" class="empty">
      <text>暂无内容，请先在订阅源中抓取</text>
    </view>
    <view v-else class="content-list">
      <view v-for="item in displayContents" :key="item.id" class="content-item">
        <view class="content-header">
          <text class="content-title">{{ item.title }}</text>
          <text class="content-date">{{ formatDate(item.pubDate) }}</text>
        </view>
        <text class="content-desc">{{ item.description?.slice(0, 100) }}...</text>
        <view class="content-actions">
          <button size="mini" type="primary" @click="goToSummary(item)">生成摘要</button>
          <button v-if="item.link" size="mini" @click="openLink(item.link)">原文</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { loadSettings, ContentItem, Subscription } from '../../utils/storage';

const subscriptions = ref<Subscription[]>([]);
const contents = ref<Record<string, ContentItem[]>>({});
const selectedSubId = ref<string | null>(null);

onMounted(() => {
  const settings = loadSettings();
  subscriptions.value = settings.subscriptions || [];
  
  // 从存储加载内容
  for (const sub of subscriptions.value) {
    const key = `ai_subscription_content_${sub.id}`;
    try {
      const data = uni.getStorageSync(key);
      if (data) {
        contents.value[sub.id] = JSON.parse(data);
      }
    } catch {}
    if (!contents.value[sub.id]) {
      contents.value[sub.id] = [];
    }
  }
});

const getContents = (subId: string): ContentItem[] => {
  return contents.value[subId] || [];
};

const displayContents = computed(() => {
  if (selectedSubId.value === null) {
    return Object.values(contents.value).flat();
  }
  return contents.value[selectedSubId.value] || [];
});

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const goToSummary = (item: ContentItem) => {
  // 保存当前选中的内容到全局
  getApp().globalData.selectedContent = item;
  uni.navigateTo({ url: '/pages/summary/index' });
};

const openLink = (link: string) => {
  if (link) {
    // #ifdef MP-WEIXIN
    uni.setClipboardData({
      data: link,
      success: () => uni.showToast({ title: '链接已复制', icon: 'none' })
    });
    // #endif
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
.filter-scroll {
  margin-bottom: 20rpx;
  white-space: nowrap;
}
.filter-tags {
  display: inline-flex;
  gap: 16rpx;
  padding: 10rpx 0;
}
.filter-tag {
  padding: 12rpx 24rpx;
  background: #fff;
  border-radius: 20rpx;
  font-size: 26rpx;
  white-space: nowrap;
}
.filter-tag.active {
  background: #1890ff;
  color: #fff;
}
.empty {
  text-align: center;
  color: #999;
  padding: 100rpx 40rpx;
}
.content-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.content-item {
  background: #fff;
  padding: 24rpx;
  border-radius: 12rpx;
}
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12rpx;
}
.content-title {
  font-size: 30rpx;
  font-weight: 500;
  flex: 1;
  margin-right: 16rpx;
}
.content-date {
  font-size: 24rpx;
  color: #888;
  white-space: nowrap;
}
.content-desc {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 16rpx;
  line-height: 1.5;
}
.content-actions {
  display: flex;
  gap: 16rpx;
}
</style>
