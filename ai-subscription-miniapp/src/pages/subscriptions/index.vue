<template>
  <view class="container">
    <view class="header">
      <text class="title">订阅源管理</text>
      <button type="primary" size="mini" @click="showAddModal = true">+ 添加</button>
    </view>

    <!-- 预设订阅源 -->
    <view class="section">
      <text class="section-title">预设订阅源</text>
      <view class="preset-list">
        <view v-for="preset in presets" :key="preset.url" class="preset-item" @click="addPreset(preset)">
          <text class="preset-name">{{ preset.name }}</text>
          <text class="preset-category">{{ preset.category }}</text>
        </view>
      </view>
    </view>

    <!-- 订阅源列表 -->
    <view class="section">
      <text class="section-title">我的订阅源</text>
      <view v-if="subscriptions.length === 0" class="empty">
        <text>暂无订阅源，请添加</text>
      </view>
      <view v-for="sub in subscriptions" :key="sub.id" class="subscription-item">
        <view class="sub-info">
          <text class="sub-name">{{ sub.name }}</text>
          <text class="sub-url">{{ sub.url }}</text>
          <view class="sub-tags">
            <text class="tag">{{ sub.type.toUpperCase() }}</text>
            <text class="tag">{{ sub.category }}</text>
            <text v-if="sub.enabled" class="tag enabled">启用</text>
            <text v-else class="tag">禁用</text>
          </view>
        </view>
        <view class="sub-actions">
          <button size="mini" @click="fetchSubscription(sub)" :loading="fetching">抓取</button>
          <button size="mini" type="warn" @click="deleteSubscription(sub.id)">删除</button>
        </view>
      </view>
    </view>

    <!-- 添加订阅源弹窗 -->
    <view v-if="showAddModal" class="modal">
      <view class="modal-content">
        <text class="modal-title">添加订阅源</text>
        <input v-model="newSub.name" placeholder="名称" class="input" />
        <input v-model="newSub.url" placeholder="URL" class="input" type="url" />
        <view class="select-row">
          <picker :range="typeOptions" @change="onTypeChange" :value="typeIndex">
            <view class="picker">类型: {{ typeOptions[typeIndex] }}</view>
          </picker>
        </view>
        <input v-model="newSub.category" placeholder="分类" class="input" />
        <view class="modal-actions">
          <button @click="showAddModal = false">取消</button>
          <button type="primary" @click="addSubscription">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { loadSettings, saveSettings, generateId, Subscription, ContentItem } from '../../utils/storage';
import { AISummarizer } from '../../adapters/ai-model-adapter';

const presets = [
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', type: 'rss' as const, category: '技术' },
  { name: 'GitHub Trending', url: 'https://github.com/trending.atom', type: 'atom' as const, category: '技术' },
  { name: '36氪', url: 'https://36kr.com/feed', type: 'rss' as const, category: '科技' },
  { name: '少数派', url: 'https://sspai.com/feed', type: 'rss' as const, category: '科技' },
];

const typeOptions = ['rss', 'atom', 'api'];
const typeIndex = ref(0);

const subscriptions = ref<Subscription[]>([]);
const showAddModal = ref(false);
const fetching = ref(false);
const newSub = ref({
  name: '',
  url: '',
  type: 'rss' as 'rss' | 'atom' | 'api',
  category: '未分类',
});

onMounted(() => {
  const settings = loadSettings();
  subscriptions.value = settings.subscriptions || [];
});

const onTypeChange = (e: any) => {
  typeIndex.value = e.detail.value;
  newSub.value.type = typeOptions[e.detail.value] as 'rss' | 'atom' | 'api';
};

const addSubscription = () => {
  if (!newSub.value.name || !newSub.value.url) {
    uni.showToast({ title: '请填写完整', icon: 'none' });
    return;
  }

  const sub: Subscription = {
    id: generateId(),
    name: newSub.value.name,
    url: newSub.value.url,
    type: newSub.value.type,
    category: newSub.value.category,
    enabled: true,
    aiSummaryEnabled: true,
    fetchIntervalMinutes: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  subscriptions.value.push(sub);
  saveSettings({ ...loadSettings(), subscriptions: subscriptions.value });
  showAddModal.value = false;
  newSub.value = { name: '', url: '', type: 'rss', category: '未分类' };
  uni.showToast({ title: '添加成功', icon: 'success' });
};

const addPreset = (preset: typeof presets[0]) => {
  const exists = subscriptions.value.find(s => s.url === preset.url);
  if (exists) {
    uni.showToast({ title: '已存在', icon: 'none' });
    return;
  }

  const sub: Subscription = {
    id: generateId(),
    name: preset.name,
    url: preset.url,
    type: preset.type,
    category: preset.category,
    enabled: true,
    aiSummaryEnabled: true,
    fetchIntervalMinutes: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  subscriptions.value.push(sub);
  saveSettings({ ...loadSettings(), subscriptions: subscriptions.value });
  uni.showToast({ title: '添加成功', icon: 'success' });
};

const deleteSubscription = (id: string) => {
  subscriptions.value = subscriptions.value.filter(s => s.id !== id);
  saveSettings({ ...loadSettings(), subscriptions: subscriptions.value });
  uni.showToast({ title: '已删除', icon: 'success' });
};

const fetchSubscription = async (sub: Subscription) => {
  fetching.value = true;
  try {
    // 小程序中需要将 RSS 抓取委托到云函数/服务器
    // 这里简化处理，提示用户实际需要后端支持
    uni.showToast({ title: '小程序需要云端抓取', icon: 'none' });
  } finally {
    fetching.value = false;
  }
};
</script>

<style scoped>
.container {
  padding: 20rpx;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}
.title {
  font-size: 36rpx;
  font-weight: bold;
}
.section {
  margin-bottom: 40rpx;
}
.section-title {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
  display: block;
}
.preset-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}
.preset-item {
  background: #fff;
  padding: 20rpx;
  border-radius: 8rpx;
  width: 220rpx;
}
.preset-name {
  display: block;
  font-weight: 500;
}
.preset-category {
  font-size: 24rpx;
  color: #888;
}
.empty {
  text-align: center;
  color: #999;
  padding: 40rpx;
}
.subscription-item {
  background: #fff;
  padding: 24rpx;
  border-radius: 8rpx;
  margin-bottom: 20rpx;
}
.sub-info {
  margin-bottom: 16rpx;
}
.sub-name {
  font-size: 32rpx;
  font-weight: 500;
  display: block;
}
.sub-url {
  font-size: 24rpx;
  color: #888;
  display: block;
  margin-top: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sub-tags {
  margin-top: 12rpx;
  display: flex;
  gap: 10rpx;
}
.tag {
  background: #eee;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 22rpx;
  color: #666;
}
.tag.enabled {
  background: #e6f7ff;
  color: #1890ff;
}
.sub-actions {
  display: flex;
  gap: 16rpx;
}
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: #fff;
  padding: 40rpx;
  border-radius: 16rpx;
  width: 600rpx;
}
.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 30rpx;
}
.input {
  border: 1px solid #ddd;
  padding: 16rpx;
  border-radius: 8rpx;
  margin-bottom: 20rpx;
}
.select-row {
  margin-bottom: 20rpx;
}
.picker {
  border: 1px solid #ddd;
  padding: 16rpx;
  border-radius: 8rpx;
}
.modal-actions {
  display: flex;
  gap: 20rpx;
  justify-content: flex-end;
}
</style>
