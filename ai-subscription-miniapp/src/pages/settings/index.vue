<template>
  <view class="container">
    <view class="header">
      <text class="title">设置</text>
    </view>

    <!-- AI 模型配置 -->
    <view class="section">
      <text class="section-title">AI 模型配置</text>
      <view v-for="model in models" :key="model.id" class="model-item">
        <view class="model-info">
          <text class="model-name">{{ model.name }}</text>
          <text class="model-provider">{{ model.provider }}</text>
          <text v-if="model.isDefault" class="model-default">默认</text>
        </view>
        <view class="model-actions">
          <button size="mini" @click="testModel(model)" :loading="testing === model.id">测试</button>
          <button size="mini" type="primary" v-if="!model.isDefault" @click="setDefault(model)">设为默认</button>
        </view>
      </view>
      <button type="warn" size="mini" @click="addModel">添加模型</button>
    </view>

    <!-- 推送设置 -->
    <view class="section">
      <text class="section-title">推送设置</text>
      <view class="setting-row">
        <switch :checked="pushSettings.enabled" @change="onEnableChange" />
        <text>启用定时推送</text>
      </view>
      <view class="setting-row">
        <text>推送时间</text>
        <input type="time" v-model="pushSettings.pushTime" class="time-input" />
      </view>
      <view class="setting-row">
        <text>推送渠道</text>
        <picker :range="channelOptions" @change="onChannelChange" :value="channelIndex">
          <view class="picker">{{ channelOptions[channelIndex] }}</view>
        </picker>
      </view>
      <button type="primary" size="small" @click="savePushSettings" style="margin-top: 20rpx;">保存推送设置</button>
    </view>

    <!-- 提示信息 -->
    <view class="tip">
      <text>模型优先级：miniMax → 小米 → 智谱 → Claude → Gemini</text>
      <text>失败后自动切换到下一个模型</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { loadSettings, saveSettings, PushSettings } from '../../utils/storage';
import { AISummarizer, ModelConfig } from '../../adapters/ai-model-adapter';

const channelOptions = ['通知栏', '邮件', '两者都要'];
const channelIndex = ref(0);
const models = ref<ModelConfig[]>([]);
const pushSettings = ref<PushSettings>({
  enabled: false,
  pushTime: '09:00',
  pushChannel: 'notification',
  contentType: 'title_summary',
});
const testing = ref<string | null>(null);
const summarizer = new AISummarizer();

onMounted(() => {
  const settings = loadSettings();
  models.value = settings.models || [];
  pushSettings.value = settings.pushSettings || {
    enabled: false,
    pushTime: '09:00',
    pushChannel: 'notification',
    contentType: 'title_summary',
  };
  summarizer.setModels(models.value);

  if (pushSettings.value.pushChannel === 'notification') channelIndex.value = 0;
  else if (pushSettings.value.pushChannel === 'email') channelIndex.value = 1;
  else channelIndex.value = 2;
});

const onChannelChange = (e: any) => {
  channelIndex.value = e.detail.value;
};

const onEnableChange = (e: any) => {
  pushSettings.value.enabled = e.detail.value;
};

const testModel = async (model: ModelConfig) => {
  testing.value = model.id;
  try {
    const result = await summarizer.testModel(model);
    if (result.success) {
      uni.showToast({ title: '连接成功', icon: 'success' });
    } else {
      uni.showToast({ title: '连接失败: ' + result.message, icon: 'none' });
    }
  } finally {
    testing.value = null;
  }
};

const setDefault = (model: ModelConfig) => {
  models.value = models.value.map(m => ({
    ...m,
    isDefault: m.id === model.id,
  }));
  summarizer.setModels(models.value);
  saveSettings({ ...loadSettings(), models: models.value });
  uni.showToast({ title: '已设为默认', icon: 'success' });
};

const addModel = () => {
  uni.showToast({ title: '请在代码中添加模型配置', icon: 'none' });
};

const savePushSettings = () => {
  const channelMap: Record<number, 'notification' | 'email' | 'both'> = {
    0: 'notification',
    1: 'email',
    2: 'both',
  };
  pushSettings.value.pushChannel = channelMap[channelIndex.value];
  saveSettings({ ...loadSettings(), pushSettings: pushSettings.value });
  uni.showToast({ title: '保存成功', icon: 'success' });
};
</script>

<style scoped>
.container {
  padding: 20rpx;
}
.header {
  margin-bottom: 30rpx;
}
.title {
  font-size: 36rpx;
  font-weight: bold;
}
.section {
  background: #fff;
  padding: 30rpx;
  border-radius: 12rpx;
  margin-bottom: 30rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 24rpx;
}
.model-item {
  border-bottom: 1px solid #eee;
  padding: 20rpx 0;
}
.model-info {
  margin-bottom: 16rpx;
}
.model-name {
  font-size: 30rpx;
  font-weight: 500;
  display: block;
}
.model-provider {
  font-size: 24rpx;
  color: #888;
  display: block;
  margin-top: 6rpx;
}
.model-default {
  background: #1890ff;
  color: #fff;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 22rpx;
  margin-left: 12rpx;
}
.model-actions {
  display: flex;
  gap: 16rpx;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1px solid #f5f5f5;
}
.time-input {
  border: 1px solid #ddd;
  padding: 10rpx 16rpx;
  border-radius: 8rpx;
  width: 200rpx;
  text-align: right;
}
.picker {
  padding: 10rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
}
.tip {
  background: #f0f9ff;
  padding: 24rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #666;
}
.tip text {
  display: block;
  margin-bottom: 8rpx;
}
</style>
