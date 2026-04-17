import { useState, useEffect, useCallback } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import type { ContentItem, SubscriptionSource } from '../../types'
import { getContentItems, getSubscriptions, addContentItems, updateItemSummary, markAsRead } from '../../services/storage'
import { fetchAllSources } from '../../services/rss'
import { aiSummarizer } from '../../services/ai-model-adapter'
import { getModelConfigs, getAppSettings } from '../../services/storage'
import './index.scss'

export default function IndexPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchProgress, setFetchProgress] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'favorites'>('all')

  useDidShow(() => {
    loadItems()
  })

  const loadItems = useCallback(() => {
    const stored = getContentItems()
    setItems(stored)
  }, [])

  const handleRefresh = useCallback(async () => {
    if (loading) return
    setLoading(true)
    setFetchProgress('准备抓取...')

    try {
      const sources: SubscriptionSource[] = getSubscriptions()
      const fetched = await fetchAllSources(sources, (current, total, name) => {
        setFetchProgress(`正在抓取 ${name}... (${current}/${total})`)
      })

      if (fetched.length > 0) {
        const settings = getAppSettings()
        const updated = addContentItems(fetched, settings.maxCacheItems)
        setItems(updated)
        Taro.showToast({ title: `获取到 ${fetched.length} 条新内容`, icon: 'success' })
      } else {
        Taro.showToast({ title: '暂无新内容', icon: 'none' })
      }
    } catch (err) {
      console.error('[Index] fetchAllSources error:', err)
      Taro.showToast({ title: '抓取失败，请检查网络', icon: 'none' })
    } finally {
      setLoading(false)
      setFetchProgress('')
    }
  }, [loading])

  const handleGenerateSummary = useCallback(async (item: ContentItem) => {
    if (item.summary) {
      navigateToDetail(item)
      return
    }

    Taro.showLoading({ title: 'AI 生成摘要中...' })
    try {
      const models = getModelConfigs()
      const settings = getAppSettings()
      aiSummarizer.setModels(models)

      const result = await aiSummarizer.summarize(
        `${item.title}\n\n${item.content}`,
        {
          modelPriority: settings.modelPriority,
          summaryLength: settings.summaryLength,
        }
      )

      if (result.success) {
        updateItemSummary(item.id, result.summary, result.keywords, result.modelUsed)
        setItems(getContentItems())
        Taro.hideLoading()
        navigateToDetail({ ...item, summary: result.summary, keywords: result.keywords })
      } else {
        Taro.hideLoading()
        Taro.showToast({ title: result.error || 'AI 摘要失败', icon: 'none', duration: 3000 })
      }
    } catch (err) {
      Taro.hideLoading()
      Taro.showToast({ title: '摘要生成出错', icon: 'none' })
    }
  }, [])

  const navigateToDetail = (item: ContentItem) => {
    markAsRead(item.id)
    Taro.navigateTo({
      url: `/pages/detail/index?id=${item.id}`
    })
  }

  const filteredItems = items.filter(item => {
    if (activeTab === 'unread') return !item.isRead
    if (activeTab === 'favorites') return item.isFavorited
    return true
  })

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <View className='index-page'>
      {/* 顶部标题栏 */}
      <View className='header'>
        <View className='header-left'>
          <Text className='header-title'>AI 摘要</Text>
          <Text className='header-count'>{items.length} 条</Text>
        </View>
        <View
          className={`refresh-btn ${loading ? 'loading' : ''}`}
          onClick={handleRefresh}
        >
          <Text className='refresh-icon'>↻</Text>
          <Text className='refresh-text'>{loading ? '抓取中' : '刷新'}</Text>
        </View>
      </View>

      {/* 进度提示 */}
      {loading && fetchProgress && (
        <View className='progress-bar'>
          <Text className='progress-text'>{fetchProgress}</Text>
        </View>
      )}

      {/* Tab 切换 */}
      <View className='tab-bar'>
        {[
          { key: 'all', label: '全部' },
          { key: 'unread', label: '未读' },
          { key: 'favorites', label: '收藏' }
        ].map(tab => (
          <View
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key as any)}
          >
            <Text>{tab.label}</Text>
          </View>
        ))}
      </View>

      {/* 内容列表 */}
      {filteredItems.length === 0 ? (
        <View className='empty-state'>
          <Text className='empty-icon'>📭</Text>
          <Text className='empty-text'>
            {loading ? '正在获取内容...' : '暂无内容\n点击右上角刷新获取'}
          </Text>
        </View>
      ) : (
        <ScrollView scrollY className='content-list'>
          {filteredItems.map(item => (
            <View
              key={item.id}
              className={`content-card ${item.isRead ? 'read' : ''}`}
              onClick={() => handleGenerateSummary(item)}
            >
              <View className='card-header'>
                <Text className='source-name'>{item.sourceName}</Text>
                <Text className='pub-time'>{formatTime(item.publishedAt)}</Text>
              </View>

              <Text className='card-title'>{item.title}</Text>

              {item.summary ? (
                <View className='summary-block'>
                  <View className='summary-tag'>
                    <Text>✨ AI摘要</Text>
                    {item.summaryModelUsed && (
                      <Text className='model-badge'>{item.summaryModelUsed}</Text>
                    )}
                  </View>
                  <Text className='summary-text'>{item.summary}</Text>
                  {item.keywords && item.keywords.length > 0 && (
                    <View className='keywords'>
                      {item.keywords.map((kw, i) => (
                        <Text key={i} className='keyword-tag'>#{kw}</Text>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <Text className='card-desc'>
                  {item.content ? item.content.slice(0, 80) + '...' : '点击生成 AI 摘要'}
                </Text>
              )}

              <View className='card-footer'>
                {item.isFavorited && <Text className='fav-icon'>★</Text>}
                {!item.isRead && <View className='unread-dot' />}
                <Text className='read-more'>点击查看详情 →</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}
