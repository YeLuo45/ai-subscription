import { useState, useCallback } from 'react'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { View, Text, ScrollView, WebView } from '@tarojs/components'
import type { ContentItem } from '../../types'
import { getContentItems, toggleFavorite, updateItemSummary, markAsRead } from '../../services/storage'
import { aiSummarizer } from '../../services/ai-model-adapter'
import { getModelConfigs, getAppSettings } from '../../services/storage'
import './index.scss'

export default function DetailPage() {
  const router = useRouter()
  const itemId = router.params?.id || ''

  const [item, setItem] = useState<ContentItem | null>(null)
  const [showWebview, setShowWebview] = useState(false)
  const [generatingSummary, setGeneratingSummary] = useState(false)

  useDidShow(() => {
    if (!itemId) {
      Taro.navigateBack()
      return
    }
    const items = getContentItems()
    const found = items.find(i => i.id === itemId) || null
    setItem(found)
    if (found) markAsRead(found.id)
  })

  const handleToggleFavorite = useCallback(() => {
    if (!item) return
    const updated = toggleFavorite(item.id)
    const found = updated.find(i => i.id === item.id)
    if (found) setItem(found)
    Taro.showToast({
      title: found?.isFavorited ? '已收藏 ★' : '已取消收藏',
      icon: 'none'
    })
  }, [item])

  const handleGenerateSummary = useCallback(async () => {
    if (!item || generatingSummary) return
    setGeneratingSummary(true)

    try {
      const models = getModelConfigs()
      const settings = getAppSettings()
      aiSummarizer.setModels(models)

      const result = await aiSummarizer.summarize(
        `${item.title}\n\n${item.content}`,
        {
          modelPriority: settings.modelPriority,
          summaryLength: settings.summaryLength
        }
      )

      if (result.success) {
        updateItemSummary(item.id, result.summary, result.keywords, result.modelUsed)
        setItem(prev => prev ? {
          ...prev,
          summary: result.summary,
          keywords: result.keywords,
          summaryModelUsed: result.modelUsed
        } : prev)
        Taro.showToast({ title: '摘要生成成功', icon: 'success' })
      } else {
        Taro.showModal({
          title: '摘要生成失败',
          content: result.error || '请检查 AI 模型配置',
          showCancel: false
        })
      }
    } catch (err) {
      Taro.showToast({ title: '生成出错', icon: 'none' })
    } finally {
      setGeneratingSummary(false)
    }
  }, [item, generatingSummary])

  const handleOpenOriginal = useCallback(() => {
    if (!item?.url) return
    // 微信小程序内 WebView
    setShowWebview(true)
  }, [item])

  const handleShare = useCallback(() => {
    if (!item) return
    Taro.setClipboardData({
      data: `${item.title}\n${item.url}`,
      success: () => Taro.showToast({ title: '已复制链接', icon: 'success' })
    })
  }, [item])

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  if (!item) {
    return (
      <View className='detail-page loading'>
        <Text className='loading-text'>加载中...</Text>
      </View>
    )
  }

  if (showWebview && item.url) {
    return (
      <View className='webview-container'>
        <View className='webview-back' onClick={() => setShowWebview(false)}>
          <Text>← 返回</Text>
        </View>
        <WebView src={item.url} />
      </View>
    )
  }

  return (
    <View className='detail-page'>
      <ScrollView scrollY className='detail-scroll'>
        {/* 标题区域 */}
        <View className='detail-header'>
          <View className='meta-row'>
            <Text className='source-badge'>{item.sourceName}</Text>
            <Text className='pub-date'>{formatDate(item.publishedAt)}</Text>
          </View>
          <Text className='detail-title'>{item.title}</Text>
          <View className='action-row'>
            <View className='action-icon' onClick={handleToggleFavorite}>
              <Text>{item.isFavorited ? '★ 已收藏' : '☆ 收藏'}</Text>
            </View>
            <View className='action-icon' onClick={handleShare}>
              <Text>📋 复制链接</Text>
            </View>
            <View className='action-icon' onClick={handleOpenOriginal}>
              <Text>🌐 原文</Text>
            </View>
          </View>
        </View>

        {/* AI 摘要区域 */}
        <View className='summary-section'>
          <View className='summary-header'>
            <Text className='summary-title'>✨ AI 摘要</Text>
            {item.summaryModelUsed && (
              <Text className='summary-model'>by {item.summaryModelUsed}</Text>
            )}
          </View>

          {item.summary ? (
            <View className='summary-content'>
              <Text className='summary-text'>{item.summary}</Text>

              {item.keywords && item.keywords.length > 0 && (
                <View className='keywords-section'>
                  <Text className='keywords-title'>关键词</Text>
                  <View className='keywords-row'>
                    {item.keywords.map((kw, i) => (
                      <Text key={i} className='kw-tag'>#{kw}</Text>
                    ))}
                  </View>
                </View>
              )}

              <View className='re-generate-btn' onClick={handleGenerateSummary}>
                <Text>{generatingSummary ? '重新生成中...' : '🔄 重新生成'}</Text>
              </View>
            </View>
          ) : (
            <View className='no-summary'>
              <Text className='no-summary-text'>尚未生成 AI 摘要</Text>
              <View
                className={`generate-btn ${generatingSummary ? 'loading' : ''}`}
                onClick={handleGenerateSummary}
              >
                <Text>{generatingSummary ? '✨ 生成中...' : '✨ 立即生成摘要'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* 原文内容 */}
        <View className='original-section'>
          <Text className='original-title'>📄 原文内容</Text>
          {item.content ? (
            <Text className='original-text'>{item.content}</Text>
          ) : (
            <View className='view-original-btn' onClick={handleOpenOriginal}>
              <Text>点击查看原文 →</Text>
            </View>
          )}
        </View>

        {/* URL 链接 */}
        {item.url && (
          <View className='url-section'>
            <Text className='url-label'>来源链接</Text>
            <View className='url-link' onClick={handleOpenOriginal}>
              <Text className='url-text'>{item.url}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
