<template>
  <view class="container">
    <view class="toolbar">
      <button class="btn" @tap="showAddModal = true">➕ 添加订阅源</button>
      <button class="btn" @tap="refreshAll">🔄 刷新</button>
    </view>

    <view class="tabs">
      <view v-for="cat in categories" :key="cat" :class="['tab', { active: activeCategory === cat }]" @tap="activeCategory = cat">
        {{ cat === 'all' ? '全部' : cat }}
      </view>
    </view>

    <view class="feed-list">
      <view v-for="sub in filteredSubscriptions" :key="sub.id" class="feed-card">
        <view class="feed-header">
          <view class="feed-info">
            <text class="feed-name">{{ sub.name }}</text>
            <view class="feed-tags">
              <text class="tag">{{ sub.category }}</text>
              <text class="tag tag-blue">{{ sub.type.toUpperCase() }}</text>
            </view>
          </view>
          <switch :checked="sub.enabled" @change="toggleEnabled(sub)" />
        </view>
        <text class="feed-url">{{ sub.url }}</text>
        <view class="feed-actions">
          <button class="action-btn" @tap="editSub(sub)">✏️ 编辑</button>
          <button class="action-btn action-danger" @tap="deleteSub(sub)">🗑️ 删除</button>
        </view>
      </view>
      <view v-if="filteredSubscriptions.length === 0" class="empty">
        <text>暂无订阅源</text>
      </view>
    </view>

    <!-- Add/Edit Modal -->
    <view v-if="showAddModal" class="modal-mask" @tap="closeModal">
      <view class="modal" @tap.stop>
        <text class="modal-title">{{ editingSub ? '编辑订阅源' : '添加订阅源' }}</text>
        <input class="input" v-model="form.name" placeholder="名称（如：科技资讯）" />
        <input class="input" v-model="form.url" placeholder="URL（如：https://example.com/feed.xml）" />
        <view class="form-row">
          <view class="form-label">类型</view>
          <picker :value="typeIndex" :range="typeOptions" @change="typeIndex = $event.detail.value">
            <view class="picker">{{ typeOptions[typeIndex] }}</view>
          </picker>
        </view>
        <input class="input" v-model="form.category" placeholder="分类（如：科技、AI）" />
        <view class="modal-actions">
          <button class="btn-cancel" @tap="closeModal">取消</button>
          <button class="btn-confirm" @tap="saveSub">{{ editingSub ? '保存' : '添加' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Subscription } from '@/types';
import { getSubscriptions, saveSubscription, updateSubscription, deleteSubscription } from '@/services/storage';
import { fetchFeed } from '@/services/feedParser';

const subscriptions = ref<Subscription[]>([]);
const showAddModal = ref(false);
const editingSub = ref<Subscription | null>(null);
const activeCategory = ref('all');
const typeIndex = ref(0);
const typeOptions = ['rss', 'atom', 'api'];
const refreshing = ref(false);

const form = ref({ name: '', url: '', type: 'rss' as 'rss' | 'atom' | 'api', category: 'Custom' });

const categories = computed(() => {
  const cats = ['all', ...new Set(subscriptions.value.map(s => s.category))];
  return cats;
});

const filteredSubscriptions = computed(() => {
  if (activeCategory.value === 'all') return subscriptions.value;
  return subscriptions.value.filter(s => s.category === activeCategory.value);
});

onMounted(() => {
  subscriptions.value = getSubscriptions();
});

function refreshAll() {
  refreshing.value = true;
  const enabled = subscriptions.value.filter(s => s.enabled);
  let done = 0;
  uni.showLoading({ title: '刷新中...' });
  enabled.forEach(async (sub) => {
    try {
      let arts;
      if (sub.url.includes('github.com/trending')) {
        const { fetchGitHubTrending, attachSubscriptionId } = await import('@/services/feedParser');
        arts = await fetchGitHubTrending();
        arts = attachSubscriptionId(arts, sub.id);
      } else {
        arts = await fetchFeed(sub.url);
        arts = attachSubscriptionId(arts, sub.id);
      }
      for (const art of arts) {
        const { saveArticle } = await import('@/services/storage');
        const existing = getSubscriptions();
        if (!existing.find(s => s.id === art.id)) {
          saveArticle(art as any);
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch ${sub.name}:`, e);
    }
    done++;
    if (done === enabled.length) {
      uni.hideLoading();
      uni.showToast({ title: '刷新完成', icon: 'success' });
      refreshing.value = false;
    }
  });
}

function toggleEnabled(sub: Subscription) {
  const updated = updateSubscription({ ...sub, enabled: !sub.enabled });
  subscriptions.value = subscriptions.value.map(s => s.id === updated.id ? updated : s);
}

function editSub(sub: Subscription) {
  editingSub.value = sub;
  form.value = { name: sub.name, url: sub.url, type: sub.type, category: sub.category };
  typeIndex.value = typeOptions.indexOf(sub.type);
  showAddModal.value = true;
}

function deleteSub(sub: Subscription) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除订阅源 "${sub.name}" 吗？`,
    success: (res) => {
      if (res.confirm) {
        deleteSubscription(sub.id);
        subscriptions.value = subscriptions.value.filter(s => s.id !== sub.id);
        uni.showToast({ title: '已删除', icon: 'success' });
      }
    },
  });
}

function closeModal() {
  showAddModal.value = false;
  editingSub.value = null;
  form.value = { name: '', url: '', type: 'rss', category: 'Custom' };
  typeIndex.value = 0;
}

function saveSub() {
  if (!form.value.name || !form.value.url) {
    uni.showToast({ title: '请填写名称和URL', icon: 'fail' });
    return;
  }
  if (editingSub.value) {
    const updated = updateSubscription({
      ...editingSub.value,
      name: form.value.name,
      url: form.value.url,
      type: typeOptions[typeIndex.value] as 'rss' | 'atom' | 'api',
      category: form.value.category || 'Custom',
    });
    subscriptions.value = subscriptions.value.map(s => s.id === updated.id ? updated : s);
    uni.showToast({ title: '已保存', icon: 'success' });
  } else {
    const sub = saveSubscription({
      name: form.value.name,
      url: form.value.url,
      type: typeOptions[typeIndex.value] as 'rss' | 'atom' | 'api',
      category: form.value.category || 'Custom',
      enabled: true,
      aiSummaryEnabled: true,
      fetchIntervalMinutes: 60,
    });
    subscriptions.value = [...subscriptions.value, sub];
    uni.showToast({ title: '已添加', icon: 'success' });
  }
  closeModal();
}
</script>

<style scoped>
.container { padding: 16px; background: #f5f5f5; min-height: 100vh; }
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
.btn { flex: 1; background: #fff; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; padding: 6px 0; }
.tabs { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.tab { padding: 4px 12px; background: #fff; border-radius: 16px; font-size: 12px; color: #666; }
.tab.active { background: #1890ff; color: #fff; }
.feed-list { display: flex; flex-direction: column; gap: 12px; }
.feed-card { background: #fff; border-radius: 8px; padding: 12px; }
.feed-header { display: flex; justify-content: space-between; align-items: flex-start; }
.feed-name { font-size: 15px; font-weight: bold; display: block; }
.feed-tags { display: flex; gap: 4px; margin-top: 4px; }
.tag { font-size: 10px; padding: 1px 6px; background: #f0f0f0; border-radius: 4px; color: #666; }
.tag-blue { background: #e6f0ff; color: #1890ff; }
.feed-url { font-size: 11px; color: #aaa; display: block; margin-top: 6px; word-break: break-all; }
.feed-actions { display: flex; gap: 8px; margin-top: 8px; }
.action-btn { flex: 1; font-size: 12px; padding: 4px 0; background: #f5f5f5; border-radius: 4px; }
.action-danger { color: #ff4d4f; }
.empty { text-align: center; padding: 40px; color: #888; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal { background: #fff; border-radius: 12px; padding: 20px; width: 90%; max-width: 360px; }
.modal-title { font-size: 16px; font-weight: bold; display: block; margin-bottom: 16px; }
.input { border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; font-size: 14px; margin-bottom: 10px; width: 100%; box-sizing: border-box; }
.form-row { display: flex; align-items: center; margin-bottom: 10px; }
.form-label { font-size: 14px; width: 60px; }
.picker { padding: 8px; background: #f5f5f5; border-radius: 6px; font-size: 14px; }
.modal-actions { display: flex; gap: 8px; margin-top: 16px; }
.btn-cancel { flex: 1; background: #f5f5f5; border-radius: 6px; font-size: 14px; }
.btn-confirm { flex: 1; background: #1890ff; color: #fff; border-radius: 6px; font-size: 14px; }
</style>
