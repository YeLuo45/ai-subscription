import { useState, useCallback } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, ScrollView, Input, Switch } from '@tarojs/components'
import type { SubscriptionSource } from '../../types'
import { PRESET_SUBSCRIPTIONS } from '../../types'
import { getSubscriptions, saveSubscriptions, addSubscription, removeSubscription, toggleSubscription } from '../../services/storage'
import './index.scss'

type Category = string

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionSource[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSub, setNewSub] = useState<Partial<SubscriptionSource>>({
    name: '',
    url: '',
    type: 'rss',
    category: '自定义',
    enabled: true
  })
  const [activeCategory, setActiveCategory] = useState<string>('全部')

  useDidShow(() => {
    setSubscriptions(getSubscriptions())
  })

  const categories = ['全部', ...Array.from(new Set(subscriptions.map(s => s.category)))]

  const filteredSubs = activeCategory === '全部'
    ? subscriptions
    : subscriptions.filter(s => s.category === activeCategory)

  const handleToggle = useCallback((id: string) => {
    const updated = toggleSubscription(id)
    setSubscriptions(updated)
  }, [])

  const handleRemove = useCallback((sub: SubscriptionSource) => {
    Taro.showModal({
      title: '确认删除',
      content: `确定删除「${sub.name}」订阅源？`,
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success(res) {
        if (res.confirm) {
          const updated = removeSubscription(sub.id)
          setSubscriptions(updated)
          Taro.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  }, [])

  const handleAddSubmit = useCallback(() => {
    if (!newSub.name?.trim()) {
      Taro.showToast({ title: '请输入订阅源名称', icon: 'none' })
      return
    }
    if (!newSub.url?.trim() || !newSub.url.startsWith('http')) {
      Taro.showToast({ title: '请输入有效的 URL（http/https）', icon: 'none' })
      return
    }

    const sub: SubscriptionSource = {
      id: `custom_${Date.now()}`,
      name: newSub.name!.trim(),
      url: newSub.url!.trim(),
      type: 'rss',
      category: newSub.category || '自定义',
      enabled: true,
      description: ''
    }

    const updated = addSubscription(sub)
    setSubscriptions(updated)
    setShowAddModal(false)
    setNewSub({ name: '', url: '', type: 'rss', category: '自定义', enabled: true })
    Taro.showToast({ title: '添加成功', icon: 'success' })
  }, [newSub])

  const handleResetPreset = useCallback(() => {
    Taro.showModal({
      title: '重置为预设',
      content: '这会恢复所有预设订阅源，自定义源将被保留，是否继续？',
      success(res) {
        if (res.confirm) {
          const current = getSubscriptions()
          const customSubs = current.filter(s => s.id.startsWith('custom_'))
          const merged = [...PRESET_SUBSCRIPTIONS, ...customSubs]
          saveSubscriptions(merged)
          setSubscriptions(merged)
          Taro.showToast({ title: '已重置预设', icon: 'success' })
        }
      }
    })
  }, [])

  return (
    <View className='subs-page'>
      {/* 顶部 */}
      <View className='header'>
        <View className='header-info'>
          <Text className='header-title'>订阅管理</Text>
          <Text className='header-count'>{subscriptions.filter(s => s.enabled).length}/{subscriptions.length} 启用</Text>
        </View>
        <View className='header-actions'>
          <View className='action-btn secondary' onClick={handleResetPreset}>
            <Text>恢复预设</Text>
          </View>
          <View className='action-btn primary' onClick={() => setShowAddModal(true)}>
            <Text>+ 添加</Text>
          </View>
        </View>
      </View>

      {/* 分类 Tab */}
      <ScrollView scrollX className='category-tabs'>
        {categories.map(cat => (
          <View
            key={cat}
            className={`cat-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            <Text>{cat}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 订阅列表 */}
      <ScrollView scrollY className='sub-list'>
        {filteredSubs.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-icon'>📡</Text>
            <Text className='empty-text'>暂无订阅源\n点击右上角添加</Text>
          </View>
        ) : (
          filteredSubs.map(sub => (
            <View key={sub.id} className='sub-card'>
              <View className='sub-info'>
                <View className='sub-header-row'>
                  <Text className='sub-name'>{sub.name}</Text>
                  <Text className='sub-category'>{sub.category}</Text>
                </View>
                <Text className='sub-url'>{sub.url}</Text>
                {sub.description && (
                  <Text className='sub-desc'>{sub.description}</Text>
                )}
              </View>
              <View className='sub-controls'>
                <Switch
                  checked={sub.enabled}
                  color='#6c63ff'
                  onChange={() => handleToggle(sub.id)}
                />
                {sub.id.startsWith('custom_') && (
                  <View className='delete-btn' onClick={() => handleRemove(sub)}>
                    <Text className='delete-icon'>🗑</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 添加弹窗 */}
      {showAddModal && (
        <View className='modal-overlay' onClick={() => setShowAddModal(false)}>
          <View className='modal-content' onClick={e => e.stopPropagation()}>
            <View className='modal-header'>
              <Text className='modal-title'>添加订阅源</Text>
              <View onClick={() => setShowAddModal(false)}>
                <Text className='modal-close'>✕</Text>
              </View>
            </View>

            <View className='form-group'>
              <Text className='form-label'>名称 *</Text>
              <Input
                className='form-input'
                value={newSub.name}
                placeholder='例：少数派'
                onInput={e => setNewSub(prev => ({ ...prev, name: e.detail.value }))}
              />
            </View>

            <View className='form-group'>
              <Text className='form-label'>RSS URL *</Text>
              <Input
                className='form-input'
                value={newSub.url}
                placeholder='https://...'
                onInput={e => setNewSub(prev => ({ ...prev, url: e.detail.value }))}
              />
            </View>

            <View className='form-group'>
              <Text className='form-label'>分类</Text>
              <Input
                className='form-input'
                value={newSub.category}
                placeholder='例：科技、创作...'
                onInput={e => setNewSub(prev => ({ ...prev, category: e.detail.value }))}
              />
            </View>

            <View className='modal-actions'>
              <View className='btn-cancel' onClick={() => setShowAddModal(false)}>
                <Text>取消</Text>
              </View>
              <View className='btn-confirm' onClick={handleAddSubmit}>
                <Text>确认添加</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
