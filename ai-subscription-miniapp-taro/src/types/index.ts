// ============== 订阅源类型 ==============

export interface SubscriptionSource {
  id: string
  name: string
  url: string
  type: 'rss' | 'api' | 'custom'
  category: string
  enabled: boolean
  lastFetched?: number
  iconUrl?: string
  description?: string
}

// 预设 RSS 源
export const PRESET_SUBSCRIPTIONS: SubscriptionSource[] = [
  {
    id: 'zhihu-daily',
    name: '知乎日报',
    url: 'https://www.zhihu.com/rss',
    type: 'rss',
    category: '科技',
    enabled: true,
    iconUrl: '',
    description: '知乎热门问答精选'
  },
  {
    id: 'sspai',
    name: '少数派',
    url: 'https://sspai.com/feed',
    type: 'rss',
    category: '科技',
    enabled: true,
    iconUrl: '',
    description: '高质量应用评测与分享'
  },
  {
    id: '36kr',
    name: '36氪',
    url: 'https://36kr.com/feed',
    type: 'rss',
    category: '科技',
    enabled: true,
    iconUrl: '',
    description: '最新科技创投资讯'
  },
  {
    id: 'afdian',
    name: '爱发电',
    url: 'https://afdian.net/explore/rss',
    type: 'rss',
    category: '创作',
    enabled: false,
    iconUrl: '',
    description: '创作者支持平台'
  },
  {
    id: 'hacker-news',
    name: 'Hacker News',
    url: 'https://news.ycombinator.com/rss',
    type: 'rss',
    category: '科技',
    enabled: true,
    iconUrl: '',
    description: 'Y Combinator 技术社区'
  },
  {
    id: 'v2ex',
    name: 'V2EX',
    url: 'https://www.v2ex.com/index.xml',
    type: 'rss',
    category: '社区',
    enabled: true,
    iconUrl: '',
    description: '创意工作者的社区'
  }
]

// ============== 内容条目类型 ==============

export interface ContentItem {
  id: string
  sourceId: string
  sourceName: string
  title: string
  content: string
  url: string
  publishedAt: number
  fetchedAt: number
  summary?: string
  keywords?: string[]
  summaryModelUsed?: string
  isRead: boolean
  isFavorited: boolean
}

// ============== AI 模型配置类型（同 shared） ==============

export interface ModelConfig {
  id: string
  name: string
  provider: 'minimax' | 'xiaomi' | 'zhipu' | 'claude' | 'gemini'
  apiBaseUrl: string
  apiKey: string
  modelName: string
  temperature: number
  maxTokens: number
  isDefault: boolean
}

// 默认模型顺序
export const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'model-minimax',
    name: 'MiniMax M2.7',
    provider: 'minimax',
    apiBaseUrl: 'https://api.minimax.chat/v1',
    apiKey: '',
    modelName: 'MiniMax-M2.7',
    temperature: 0.3,
    maxTokens: 1000,
    isDefault: true
  },
  {
    id: 'model-xiaomi',
    name: '小米 MiLM',
    provider: 'xiaomi',
    apiBaseUrl: 'https://api.xiaomi.com/v1',
    apiKey: '',
    modelName: 'MiLM',
    temperature: 0.3,
    maxTokens: 1000,
    isDefault: false
  },
  {
    id: 'model-zhipu',
    name: '智谱 GLM-4',
    provider: 'zhipu',
    apiBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: '',
    modelName: 'glm-4',
    temperature: 0.3,
    maxTokens: 1000,
    isDefault: false
  },
  {
    id: 'model-claude',
    name: 'Claude',
    provider: 'claude',
    apiBaseUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    modelName: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 1000,
    isDefault: false
  },
  {
    id: 'model-gemini',
    name: 'Gemini',
    provider: 'gemini',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    modelName: 'gemini-2.0-flash',
    temperature: 0.3,
    maxTokens: 1000,
    isDefault: false
  }
]

// ============== 应用设置类型 ==============

export interface AppSettings {
  modelPriority: string[]  // provider 名称顺序
  autoFetchInterval: number  // 自动抓取间隔（分钟），0 = 不自动
  pushEnabled: boolean
  pushTime: string  // HH:mm 格式
  summaryLength: 'short' | 'medium' | 'long'
  maxCacheItems: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  modelPriority: ['minimax', 'xiaomi', 'zhipu', 'claude', 'gemini'],
  autoFetchInterval: 60,
  pushEnabled: false,
  pushTime: '09:00',
  summaryLength: 'medium',
  maxCacheItems: 200
}
