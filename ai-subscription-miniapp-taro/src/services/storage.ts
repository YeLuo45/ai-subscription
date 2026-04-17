/**
 * 本地存储服务
 * 封装 Taro.getStorageSync / setStorageSync 提供类型安全操作
 */
import Taro from '@tarojs/taro'
import type { SubscriptionSource, ContentItem, ModelConfig, AppSettings } from '../types'
import { PRESET_SUBSCRIPTIONS, DEFAULT_MODELS, DEFAULT_SETTINGS } from '../types'

// Storage keys
const KEYS = {
  SUBSCRIPTIONS: 'subscriptions',
  CONTENT_ITEMS: 'content_items',
  MODEL_CONFIGS: 'model_configs',
  APP_SETTINGS: 'app_settings'
} as const

function get<T>(key: string, fallback: T): T {
  try {
    const val = Taro.getStorageSync(key)
    return val !== '' && val !== null && val !== undefined ? (val as T) : fallback
  } catch {
    return fallback
  }
}

function set<T>(key: string, value: T): void {
  try {
    Taro.setStorageSync(key, value)
  } catch (e) {
    console.error('[Storage] setStorageSync failed:', key, e)
  }
}

// ============== 订阅源 ==============

export function getSubscriptions(): SubscriptionSource[] {
  return get<SubscriptionSource[]>(KEYS.SUBSCRIPTIONS, PRESET_SUBSCRIPTIONS)
}

export function saveSubscriptions(list: SubscriptionSource[]): void {
  set(KEYS.SUBSCRIPTIONS, list)
}

export function addSubscription(sub: SubscriptionSource): SubscriptionSource[] {
  const list = getSubscriptions()
  const updated = [...list, sub]
  saveSubscriptions(updated)
  return updated
}

export function removeSubscription(id: string): SubscriptionSource[] {
  const list = getSubscriptions().filter(s => s.id !== id)
  saveSubscriptions(list)
  return list
}

export function toggleSubscription(id: string): SubscriptionSource[] {
  const list = getSubscriptions().map(s =>
    s.id === id ? { ...s, enabled: !s.enabled } : s
  )
  saveSubscriptions(list)
  return list
}

// ============== 内容条目 ==============

export function getContentItems(): ContentItem[] {
  return get<ContentItem[]>(KEYS.CONTENT_ITEMS, [])
}

export function saveContentItems(items: ContentItem[]): void {
  set(KEYS.CONTENT_ITEMS, items)
}

export function addContentItems(newItems: ContentItem[], maxCount = 200): ContentItem[] {
  const existing = getContentItems()
  const merged = [...newItems, ...existing]
  // 去重（按 id）
  const seen = new Set<string>()
  const deduped = merged.filter(item => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
  // 保留最新 maxCount 条
  const trimmed = deduped.slice(0, maxCount)
  saveContentItems(trimmed)
  return trimmed
}

export function markAsRead(id: string): void {
  const items = getContentItems().map(item =>
    item.id === id ? { ...item, isRead: true } : item
  )
  saveContentItems(items)
}

export function toggleFavorite(id: string): ContentItem[] {
  const items = getContentItems().map(item =>
    item.id === id ? { ...item, isFavorited: !item.isFavorited } : item
  )
  saveContentItems(items)
  return items
}

export function updateItemSummary(
  id: string,
  summary: string,
  keywords: string[],
  modelUsed: string
): void {
  const items = getContentItems().map(item =>
    item.id === id
      ? { ...item, summary, keywords, summaryModelUsed: modelUsed }
      : item
  )
  saveContentItems(items)
}

// ============== AI 模型配置 ==============

export function getModelConfigs(): ModelConfig[] {
  return get<ModelConfig[]>(KEYS.MODEL_CONFIGS, DEFAULT_MODELS)
}

export function saveModelConfigs(configs: ModelConfig[]): void {
  set(KEYS.MODEL_CONFIGS, configs)
}

export function updateModelConfig(updated: ModelConfig): ModelConfig[] {
  const configs = getModelConfigs().map(c => c.id === updated.id ? updated : c)
  saveModelConfigs(configs)
  return configs
}

// ============== 应用设置 ==============

export function getAppSettings(): AppSettings {
  return get<AppSettings>(KEYS.APP_SETTINGS, DEFAULT_SETTINGS)
}

export function saveAppSettings(settings: AppSettings): void {
  set(KEYS.APP_SETTINGS, settings)
}

export function updateAppSettings(partial: Partial<AppSettings>): AppSettings {
  const settings = { ...getAppSettings(), ...partial }
  saveAppSettings(settings)
  return settings
}

// ============== 清空所有数据 ==============

export function clearAll(): void {
  try {
    Taro.clearStorageSync()
  } catch (e) {
    console.error('[Storage] clearStorageSync failed:', e)
  }
}
