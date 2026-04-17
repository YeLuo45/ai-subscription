/**
 * RSS 内容抓取服务（微信小程序端）
 * 注意：小程序无法直接请求非 HTTPS 域名，需要在小程序后台配置合法域名
 * 真实场景建议通过后端代理抓取 RSS，此处为前端直接请求的实现
 */
import Taro from '@tarojs/taro'
import type { ContentItem, SubscriptionSource } from '../types'

/**
 * 简单的 XML 解析 - 提取 RSS 条目
 * 小程序环境无 DOMParser，使用正则解析
 */
function parseRSSXML(xml: string, source: SubscriptionSource): ContentItem[] {
  const items: ContentItem[] = []
  
  // 提取所有 <item> 块
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1]
    
    const title = extractTag(itemXml, 'title')
    const link = extractTag(itemXml, 'link')
    const description = extractTag(itemXml, 'description')
    const pubDate = extractTag(itemXml, 'pubDate')
    const guid = extractTag(itemXml, 'guid') || link

    if (!title || !link) continue

    const publishedAt = pubDate ? new Date(pubDate).getTime() : Date.now()

    items.push({
      id: `${source.id}_${btoa(encodeURIComponent(guid || link)).slice(0, 20)}`,
      sourceId: source.id,
      sourceName: source.name,
      title: cleanHTML(title),
      content: cleanHTML(description),
      url: link,
      publishedAt,
      fetchedAt: Date.now(),
      isRead: false,
      isFavorited: false,
    })
  }

  return items
}

function extractTag(xml: string, tag: string): string {
  // 尝试 CDATA
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
  if (cdataMatch) return cdataMatch[1].trim()

  // 普通标签
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  if (match) return match[1].trim()

  return ''
}

function cleanHTML(html: string): string {
  // 移除 HTML 标签
  return html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
}

/**
 * 抓取单个 RSS 源
 */
export async function fetchRSSSource(source: SubscriptionSource): Promise<ContentItem[]> {
  return new Promise((resolve) => {
    Taro.request({
      url: source.url,
      method: 'GET',
      header: {
        'User-Agent': 'AI-Subscription-Miniapp/1.0'
      },
      success(res) {
        if (res.statusCode === 200 && typeof res.data === 'string') {
          const items = parseRSSXML(res.data, source)
          console.log(`[RSS] ${source.name}: 获取到 ${items.length} 条`)
          resolve(items)
        } else {
          console.warn(`[RSS] ${source.name}: 返回异常 ${res.statusCode}`)
          resolve([])
        }
      },
      fail(err) {
        console.error(`[RSS] ${source.name} 抓取失败:`, err.errMsg)
        resolve([])
      }
    })
  })
}

/**
 * 批量抓取所有已启用的订阅源
 */
export async function fetchAllSources(
  sources: SubscriptionSource[],
  onProgress?: (current: number, total: number, sourceName: string) => void
): Promise<ContentItem[]> {
  const enabled = sources.filter(s => s.enabled)
  const allItems: ContentItem[] = []

  for (let i = 0; i < enabled.length; i++) {
    const source = enabled[i]
    onProgress?.(i + 1, enabled.length, source.name)
    const items = await fetchRSSSource(source)
    allItems.push(...items)
  }

  // 按发布时间降序排列
  allItems.sort((a, b) => b.publishedAt - a.publishedAt)
  return allItems
}

/**
 * 生成唯一 ID（不依赖 btoa）
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}
