import { useState, useCallback } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Switch, Input, ScrollView } from '@tarojs/components'
import type { ModelConfig, AppSettings } from '../../types'
import { getModelConfigs, saveModelConfigs, getAppSettings, saveAppSettings, clearAll } from '../../services/storage'
import { aiSummarizer } from '../../services/ai-model-adapter'
import './index.scss'

export default function SettingsPage() {
  const [models, setModels] = useState<ModelConfig[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [editingModelId, setEditingModelId] = useState<string | null>(null)
  const [tempApiKey, setTempApiKey] = useState('')
  const [testingModel, setTestingModel] = useState<string | null>(null)

  useDidShow(() => {
    setModels(getModelConfigs())
    setSettings(getAppSettings())
  })

  const handleSaveModelKey = useCallback(() => {
    if (!editingModelId) return
    const updated = models.map(m =>
      m.id === editingModelId ? { ...m, apiKey: tempApiKey.trim() } : m
    )
    saveModelConfigs(updated)
    setModels(updated)
    setEditingModelId(null)
    setTempApiKey('')
    Taro.showToast({ title: 'API Key 已保存', icon: 'success' })
  }, [editingModelId, tempApiKey, models])

  const handleTestModel = useCallback(async (model: ModelConfig) => {
    if (!model.apiKey) {
      Taro.showToast({ title: '请先配置 API Key', icon: 'none' })
      return
    }
    setTestingModel(model.id)
    const result = await aiSummarizer.testModel(model)
    setTestingModel(null)
    Taro.showModal({
      title: result.success ? '✅ 连接成功' : '❌ 连接失败',
      content: result.message,
      showCancel: false
    })
  }, [])

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0 || !settings) return
    const newOrder = [...settings.modelPriority]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    const newSettings = { ...settings, modelPriority: newOrder }
    saveAppSettings(newSettings)
    setSettings(newSettings)
  }, [settings])

  const handleMoveDown = useCallback((index: number) => {
    if (!settings || index >= settings.modelPriority.length - 1) return
    const newOrder = [...settings.modelPriority]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    const newSettings = { ...settings, modelPriority: newOrder }
    saveAppSettings(newSettings)
    setSettings(newSettings)
  }, [settings])

  const handleSettingChange = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (!settings) return
    const newSettings = { ...settings, [key]: value }
    saveAppSettings(newSettings)
    setSettings(newSettings)
  }, [settings])

  const handleClearData = useCallback(() => {
    Taro.showModal({
      title: '清除所有数据',
      content: '这会删除所有缓存内容、订阅设置和 API Key，操作不可撤销，确认继续？',
      confirmText: '清除',
      confirmColor: '#ff4d4f',
      success(res) {
        if (res.confirm) {
          clearAll()
          Taro.showToast({ title: '数据已清除', icon: 'success' })
          setTimeout(() => {
            setModels(getModelConfigs())
            setSettings(getAppSettings())
          }, 500)
        }
      }
    })
  }, [])

  if (!settings) return null

  const getModelName = (provider: string) => {
    const found = models.find(m => m.provider === provider)
    return found?.name || provider
  }

  const SUMMARY_OPTIONS: Array<{ key: AppSettings['summaryLength'], label: string }> = [
    { key: 'short', label: '短（约100字）' },
    { key: 'medium', label: '中（约300字）' },
    { key: 'long', label: '长（约500字）' },
  ]

  return (
    <View className='settings-page'>
      <ScrollView scrollY className='settings-scroll'>

        {/* AI 模型配置 */}
        <View className='section'>
          <Text className='section-title'>🤖 AI 模型配置</Text>
          <Text className='section-desc'>配置各模型的 API Key，有 Key 的模型才会生效</Text>

          {models.map(model => (
            <View key={model.id} className='model-card'>
              <View className='model-info'>
                <Text className='model-name'>{model.name}</Text>
                <Text className='model-status'>
                  {model.apiKey ? '✅ 已配置' : '⚠️ 未配置'}
                </Text>
              </View>

              <View className='model-key-row'>
                {editingModelId === model.id ? (
                  <View className='key-edit-group'>
                    <Input
                      className='key-input'
                      value={tempApiKey}
                      password
                      placeholder='输入 API Key'
                      onInput={e => setTempApiKey(e.detail.value)}
                    />
                    <View className='key-save-btn' onClick={handleSaveModelKey}>
                      <Text>保存</Text>
                    </View>
                    <View className='key-cancel-btn' onClick={() => setEditingModelId(null)}>
                      <Text>取消</Text>
                    </View>
                  </View>
                ) : (
                  <View className='key-display-row'>
                    <Text className='key-value'>
                      {model.apiKey ? '••••••••••••' : '未设置'}
                    </Text>
                    <View
                      className='key-edit-btn'
                      onClick={() => {
                        setEditingModelId(model.id)
                        setTempApiKey(model.apiKey)
                      }}
                    >
                      <Text>编辑</Text>
                    </View>
                    {model.apiKey && (
                      <View
                        className={`key-test-btn ${testingModel === model.id ? 'testing' : ''}`}
                        onClick={() => handleTestModel(model)}
                      >
                        <Text>{testingModel === model.id ? '测试中...' : '测试'}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* 模型优先级 */}
        <View className='section'>
          <Text className='section-title'>📊 模型优先级</Text>
          <Text className='section-desc'>AI 摘要生成时，优先使用排名靠前的模型</Text>

          {settings.modelPriority.map((provider, index) => (
            <View key={provider} className='priority-row'>
              <View className='priority-rank'>
                <Text>{index + 1}</Text>
              </View>
              <Text className='priority-name'>{getModelName(provider)}</Text>
              <View className='priority-arrows'>
                <View
                  className={`arrow-btn ${index === 0 ? 'disabled' : ''}`}
                  onClick={() => handleMoveUp(index)}
                >
                  <Text>↑</Text>
                </View>
                <View
                  className={`arrow-btn ${index === settings.modelPriority.length - 1 ? 'disabled' : ''}`}
                  onClick={() => handleMoveDown(index)}
                >
                  <Text>↓</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* 摘要设置 */}
        <View className='section'>
          <Text className='section-title'>✍️ 摘要设置</Text>

          <View className='setting-item'>
            <Text className='setting-label'>摘要长度</Text>
            <View className='option-group'>
              {SUMMARY_OPTIONS.map(opt => (
                <View
                  key={opt.key}
                  className={`option-item ${settings.summaryLength === opt.key ? 'active' : ''}`}
                  onClick={() => handleSettingChange('summaryLength', opt.key)}
                >
                  <Text>{opt.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 推送设置 */}
        <View className='section'>
          <Text className='section-title'>🔔 推送设置</Text>
          <Text className='section-desc'>微信小程序推送需要用户授权订阅消息</Text>

          <View className='setting-row'>
            <Text className='setting-label'>启用定时推送</Text>
            <Switch
              checked={settings.pushEnabled}
              color='#6c63ff'
              onChange={e => handleSettingChange('pushEnabled', e.detail.value)}
            />
          </View>

          {settings.pushEnabled && (
            <View className='setting-item'>
              <Text className='setting-label'>推送时间（HH:mm）</Text>
              <Input
                className='time-input'
                value={settings.pushTime}
                placeholder='09:00'
                onInput={e => handleSettingChange('pushTime', e.detail.value)}
              />
            </View>
          )}
        </View>

        {/* 数据管理 */}
        <View className='section'>
          <Text className='section-title'>🗂 数据管理</Text>

          <View className='setting-item'>
            <Text className='setting-label'>最大缓存条数</Text>
            <Input
              className='number-input'
              type='number'
              value={String(settings.maxCacheItems)}
              onInput={e => handleSettingChange('maxCacheItems', parseInt(e.detail.value) || 200)}
            />
          </View>

          <View className='danger-btn' onClick={handleClearData}>
            <Text>🗑 清除所有缓存数据</Text>
          </View>
        </View>

        {/* 版本信息 */}
        <View className='version-info'>
          <Text>AI 订阅内容聚合 v1.0.0</Text>
          <Text>Taro 4.x + React + TypeScript</Text>
        </View>

      </ScrollView>
    </View>
  )
}
