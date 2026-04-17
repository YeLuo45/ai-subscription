<template>
  <view class="container">
    <view class="section">
      <text class="section-title">🤖 AI模型配置</text>
      <view v-for="model in models" :key="model.id" class="model-card">
        <view class="model-header">
          <text class="model-name">{{ model.name }}</text>
          <view class="model-tags">
            <text class="tag">{{ model.provider }}</text>
            <text v-if="model.isDefault" class="tag tag-green">默认</text>
          </view>
        </view>
        <input class="input" v-model="model.apiKey" placeholder="API Key" password />
        <view class="model-actions">
          <button class="action-btn" @tap="saveModel(model)">💾 保存</button>
        </view>
      </view>
      <view v-if="models.length === 0" class="empty">
        <text>暂无模型配置</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">🔔 推送设置</text>
      <view class="setting-row">
        <text class="setting-label">启用推送</text>
        <switch :checked="settings.push.enabled" @change="updatePush('enabled', !settings.push.enabled)" />
      </view>
      <view class="setting-row">
        <text class="setting-label">推送时间</text>
        <input class="input-small" type="time" :value="settings.push.time" @change="updatePush('time', $event.detail.value)" />
      </view>
      <view class="setting-row">
        <text class="setting-label">推送频率</text>
        <picker :value="freqIndex" :range="freqOptions" @change="updatePush('frequency', freqOptions[$event.detail.value])">
          <view class="picker">{{ freqOptions[freqIndex] }}</view>
        </picker>
      </view>
      <view class="setting-row">
        <text class="setting-label">推送内容</text>
        <picker :value="contentIndex" :range="contentOptions" @change="updatePush('contentType', ['title_only','title_summary','title_full_summary'][$event.detail.value])">
          <view class="picker">{{ contentOptions[contentIndex] }}</view>
        </picker>
      </view>
      <view class="setting-row">
        <text class="setting-label">免打扰时段</text>
        <switch :checked="settings.push.quietHoursEnabled" @change="updatePush('quietHoursEnabled', !settings.push.quietHoursEnabled)" />
      </view>
      <view v-if="settings.push.quietHoursEnabled" class="setting-row">
        <text class="setting-label">时段范围</text>
        <view class="time-range">
          <input class="input-small" type="time" :value="settings.push.quietHoursStart" @change="updatePush('quietHoursStart', $event.detail.value)" />
          <text>至</text>
          <input class="input-small" type="time" :value="settings.push.quietHoursEnd" @change="updatePush('quietHoursEnd', $event.detail.value)" />
        </view>
      </view>
      <button class="btn-save" @tap="saveSettings">💾 保存推送设置</button>
    </view>

    <view class="section">
      <text class="section-title">📧 邮件设置</text>
      <view class="setting-row">
        <text class="setting-label">启用邮件</text>
        <switch :checked="settings.email.enabled" @change="updateEmail('enabled', !settings.email.enabled)" />
      </view>
      <input class="input" v-model="settings.email.smtpHost" placeholder="SMTP服务器" />
      <input class="input" type="number" v-model="settings.email.smtpPort" placeholder="端口" />
      <input class="input" v-model="settings.email.smtpUser" placeholder="用户名" />
      <input class="input" v-model="settings.email.smtpPassword" placeholder="密码/授权码" password />
      <input class="input" v-model="settings.email.fromEmail" placeholder="发件人邮箱" />
      <button class="btn-save" @tap="saveSettings">💾 保存邮件设置</button>
    </view>

    <view class="section">
      <text class="section-title">📝 摘要设置</text>
      <view class="setting-row">
        <text class="setting-label">摘要长度</text>
        <picker :value="lengthIndex" :range="lengthOptions" @change="summaryLength = ['short','medium','long'][$event.detail.value]">
          <view class="picker">{{ lengthOptions[lengthIndex] }}</view>
        </picker>
      </view>
      <button class="btn-save" @tap="saveSettings">💾 保存</button>
    </view>

    <view class="section">
      <text class="section-title">ℹ️ 关于</text>
      <text class="about-text">AI订阅聚合 v1.0</text>
      <text class="about-text">本地数据存储，四端各自独立</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { AIModel, AppSettings } from '@/types';
import { getModels, updateModel, getSettings, saveSettings } from '@/services/storage';

const models = ref<AIModel[]>([]);
const settings = ref<AppSettings>(getSettings());
const summaryLength = ref(settings.value.summaryLength);

const freqOptions = ['每小时', '每日', '每周'];
const contentOptions = ['仅标题', '标题+摘要', '标题+完整摘要'];
const lengthOptions = ['短（100字）', '中（300字）', '长（500字）'];

const freqIndex = computed(() => ['hourly', 'daily', 'weekly'].indexOf(settings.value.push.frequency));
const contentIndex = computed(() => ['title_only', 'title_summary', 'title_full_summary'].indexOf(settings.value.push.contentType));
const lengthIndex = computed(() => ['short', 'medium', 'long'].indexOf(summaryLength.value));

onMounted(() => {
  models.value = getModels();
  settings.value = getSettings();
  summaryLength.value = settings.value.summaryLength;
});

function updatePush(key: keyof AppSettings['push'], value: unknown) {
  (settings.value.push as any)[key] = value;
}

function updateEmail(key: keyof AppSettings['email'], value: unknown) {
  (settings.value.email as any)[key] = value;
}

function saveModel(model: AIModel) {
  updateModel(model);
  uni.showToast({ title: '已保存', icon: 'success' });
}

function saveSettings() {
  settings.value.summaryLength = summaryLength.value as 'short' | 'medium' | 'long';
  saveSettings(settings.value);
  uni.showToast({ title: '设置已保存', icon: 'success' });
}
</script>

<style scoped>
.container { padding: 16px; background: #f5f5f5; min-height: 100vh; }
.section { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.section-title { font-size: 15px; font-weight: bold; display: block; margin-bottom: 12px; }
.model-card { background: #f9f9f9; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.model-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.model-name { font-size: 14px; font-weight: 500; }
.model-tags { display: flex; gap: 4px; }
.tag { font-size: 10px; padding: 1px 6px; background: #f0f0f0; border-radius: 4px; color: #666; }
.tag-green { background: #d4edda; color: #28a745; }
.model-actions { margin-top: 8px; }
.action-btn { font-size: 12px; padding: 4px 12px; background: #1890ff; color: #fff; border-radius: 4px; display: inline-block; }
.setting-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.setting-row:last-child { border-bottom: none; }
.setting-label { font-size: 14px; }
.input { border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; font-size: 14px; margin-bottom: 8px; width: 100%; box-sizing: border-box; }
.input-small { border: 1px solid #ddd; border-radius: 6px; padding: 4px 8px; font-size: 14px; width: 80px; }
.time-range { display: flex; align-items: center; gap: 8px; }
.picker { padding: 4px 8px; background: #f5f5f5; border-radius: 4px; font-size: 13px; }
.btn-save { width: 100%; background: #1890ff; color: #fff; border-radius: 8px; font-size: 14px; margin-top: 12px; }
.empty { text-align: center; padding: 20px; color: #888; }
.about-text { font-size: 13px; color: #888; display: block; margin-bottom: 4px; }
</style>
