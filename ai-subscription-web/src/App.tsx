import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout, Menu, Typography, message, Drawer, Timeline, Tag, Badge, Empty, Tooltip, Button, Space } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, BugOutlined, ClearOutlined } from '@ant-design/icons';
import Text from 'antd/es/typography/Text';
import {
  DatabaseOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { SubscriptionsPage, ContentListPage, SettingsPage, SummaryPage } from './pages';
import {
  Subscription,
  ContentItem,
  AppSettings,
  FetchLogEntry,
  MAX_FETCH_LOGS,
} from './types';
import {
  loadSettings,
  saveSettings,
  generateId,
} from './utils/storage';
import { fetchFeed } from './services/feedParser';
import { requestNotificationPermission, sendContentNotification } from './services/notifications';
import { scheduler } from './services/scheduler';
import { AISummarizer } from './services/aiAdapter';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

type PageType = 'subscriptions' | 'content' | 'settings' | 'summary';

// 全局状态
const summarizer = new AISummarizer();

function App() {
  const [activePage, setActivePage] = useState<PageType>('subscriptions');
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [contents, setContents] = useState<Record<string, ContentItem[]>>({});
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchLogs, setFetchLogs] = useState<FetchLogEntry[]>([]);
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  // 每订阅源最新抓取状态（用于表格行内Badge显示）
  const [fetchStatus, setFetchStatus] = useState<Record<string, {
    status: 'idle' | 'pending' | 'success' | 'fail';
    itemCount?: number;
    error?: string;
    duration?: number;
  }>>({});
  const schedulerRef = useRef(false);

  // 生成抓取日志ID
  const makeLogId = () => `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 添加抓取日志
  const addFetchLog = useCallback((entry: Omit<FetchLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: FetchLogEntry = {
      ...entry,
      id: makeLogId(),
      timestamp: new Date().toISOString(),
    };
    setFetchLogs(prev => [newEntry, ...prev].slice(0, MAX_FETCH_LOGS));
    return newEntry;
  }, []);

  // 清除日志
  const clearFetchLogs = useCallback(() => {
    setFetchLogs([]);
  }, []);

  // 初始化
  useEffect(() => {
    // 加载已保存的内容
    const savedContents: Record<string, ContentItem[]> = {};
    for (const sub of settings.subscriptions) {
      try {
        const key = `ai_sub_content_${sub.id}`;
        const data = localStorage.getItem(key);
        if (data) savedContents[sub.id] = JSON.parse(data);
      } catch {}
    }
    setContents(savedContents);

    // 初始化模型
    if (settings.models.length === 0) {
      const defaultModels = AISummarizer.createDefaultModels();
      const newSettings = { ...settings, models: defaultModels };
      setSettings(newSettings);
      saveSettings(newSettings);
      summarizer.setModels(defaultModels);
    } else {
      summarizer.setModels(settings.models);
    }

    // 请求通知权限
    requestNotificationPermission();
  }, []);

  // 设置定时任务
  useEffect(() => {
    if (schedulerRef.current) return;
    schedulerRef.current = true;

    // 每30分钟抓取一次
    scheduler.addTask('content-fetch', '定时抓取', 30 * 60 * 1000, async () => {
      for (const sub of settings.subscriptions.filter(s => s.enabled)) {
        try {
          const result = await fetchFeed(sub.url, sub.type);
          const items: ContentItem[] = result.items.map(item => ({
            ...item,
            subscriptionId: sub.id,
            isRead: false,
          }));

          // 更新内容（去重）
          setContents(prev => {
            const existing = prev[sub.id] || [];
            const existingIds = new Set(existing.map(i => i.id));
            const newItems = items.filter(i => !existingIds.has(i.id));
            const updated = [...newItems, ...existing].slice(0, 50);

            // 持久化
            localStorage.setItem(`ai_sub_content_${sub.id}`, JSON.stringify(updated));

            // 发送通知
            if (newItems.length > 0 && settings.pushSettings.enabled) {
              sendContentNotification(newItems, sub.name);
            }

            return { ...prev, [sub.id]: updated };
          });
        } catch (err) {
          console.error(`抓取失败 [${sub.name}]:`, err);
        }
      }
    }, true); // immediate=true

    return () => {
      scheduler.removeTask('content-fetch');
    };
  }, [settings.subscriptions, settings.pushSettings.enabled]);

  // 保存设置
  const updateSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    summarizer.setModels(newSettings.models);
  }, []);

  // 添加订阅源
  const addSubscription = useCallback((sub: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSub: Subscription = {
      ...sub,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateSettings({
      ...settings,
      subscriptions: [...settings.subscriptions, newSub],
    });
    message.success(`已添加订阅源: ${sub.name}`);
  }, [settings, updateSettings]);

  // 删除订阅源
  const deleteSubscription = useCallback((id: string) => {
    updateSettings({
      ...settings,
      subscriptions: settings.subscriptions.filter(s => s.id !== id),
    });
    message.success('已删除订阅源');
  }, [settings, updateSettings]);

  // 切换订阅源启用状态
  const toggleSubscription = useCallback((id: string, enabled: boolean) => {
    updateSettings({
      ...settings,
      subscriptions: settings.subscriptions.map(s =>
        s.id === id ? { ...s, enabled } : s
      ),
    });
    message.success(enabled ? '订阅源已启用' : '订阅源已禁用');
  }, [settings, updateSettings]);

  // 抓取单个订阅源（带日志）
  const fetchSubscription = useCallback(async (sub: Subscription) => {
    const startTime = Date.now();
    // 设置 pending 状态
    setFetchStatus(prev => ({ ...prev, [sub.id]: { status: 'pending' } }));

    const logId = makeLogId();
    addFetchLog({
      subscriptionId: sub.id,
      subscriptionName: sub.name,
      url: sub.url,
      level: 'pending',
      message: `开始抓取...`,
    });

    try {
      const result = await fetchFeed(sub.url, sub.type);
      const items: ContentItem[] = result.items.map(item => ({
        ...item,
        subscriptionId: sub.id,
        isRead: false,
      }));
      const duration = Date.now() - startTime;

      setContents(prev => {
        const existing = prev[sub.id] || [];
        const existingIds = new Set(existing.map(i => i.id));
        const newItems = items.filter(i => !existingIds.has(i.id));
        const updated = [...newItems, ...existing].slice(0, 50);

        localStorage.setItem(`ai_sub_content_${sub.id}`, JSON.stringify(updated));

        if (newItems.length > 0 && settings.pushSettings.enabled) {
          sendContentNotification(newItems, sub.name);
        }

        return { ...prev, [sub.id]: updated };
      });

      // 成功日志
      setFetchStatus(prev => ({ ...prev, [sub.id]: { status: 'success', itemCount: items.length, duration } }));
      addFetchLog({
        subscriptionId: sub.id,
        subscriptionName: sub.name,
        url: sub.url,
        level: 'success',
        message: `抓取成功：${items.length} 条新内容`,
        duration,
        itemCount: items.length,
      });

      if (items.length > 0) {
        message.success(`抓取成功：${items.length} 条新内容`);
      } else {
        message.info('暂无新内容');
      }
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      // 失败日志
      setFetchStatus(prev => ({ ...prev, [sub.id]: { status: 'fail', error: errorMsg, duration } }));
      addFetchLog({
        subscriptionId: sub.id,
        subscriptionName: sub.name,
        url: sub.url,
        level: 'fail',
        message: `抓取失败：${errorMsg}`,
        duration,
        error: errorMsg,
      });
      message.error(`抓取失败：${sub.name}`);
    }
  }, [settings.pushSettings.enabled, addFetchLog]);

  // 抓取所有订阅源
  const fetchAllSubscriptions = useCallback(async () => {
    setFetching(true);
    try {
      for (const sub of settings.subscriptions.filter(s => s.enabled)) {
        await fetchSubscription(sub);
      }
      message.success('抓取完成');
    } finally {
      setFetching(false);
    }
  }, [settings.subscriptions, fetchSubscription]);

  // 生成 AI 摘要
  const generateSummary = useCallback(
    async (item: ContentItem, length: 'short' | 'medium' | 'long') => {
      const text = `${item.title}\n\n${item.description}`;
      const result = await summarizer.summarize(text, { summaryLength: length });

      if (result.success) {
        // 更新内容中的摘要
        setContents(prev => {
          const subContents = prev[item.subscriptionId] || [];
          const updated = subContents.map(c =>
            c.id === item.id ? { ...c, summary: result.summary, keywords: result.keywords } : c
          );
          localStorage.setItem(`ai_sub_content_${item.subscriptionId}`, JSON.stringify(updated));
          return { ...prev, [item.subscriptionId]: updated };
        });

        return { summary: result.summary, keywords: result.keywords, modelUsed: result.modelUsed };
      }
      throw new Error(result.error || '摘要生成失败');
    },
    []
  );

  const navigateToSummary = useCallback(() => {
    setActivePage('summary');
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'subscriptions':
        return (
          <SubscriptionsPage
            subscriptions={settings.subscriptions}
            fetchStatus={fetchStatus}
            onAdd={addSubscription}
            onDelete={deleteSubscription}
            onToggle={toggleSubscription}
            onFetch={fetchSubscription}
            onFetchAll={fetchAllSubscriptions}
            loading={fetching}
          />
        );
      case 'content':
        return (
          <ContentListPage
            subscriptions={settings.subscriptions}
            contents={contents}
            onSelectContent={setSelectedContent}
            onNavigateToSummary={navigateToSummary}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            settings={settings}
            onUpdateSettings={updateSettings}
            summarizer={summarizer}
          />
        );
      case 'summary':
        return (
          <SummaryPage
            content={selectedContent}
            onGenerateSummary={generateSummary}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>
          🤖 AI 订阅助手
        </Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            type="text"
            icon={<BugOutlined />}
            style={{ color: 'white' }}
            onClick={() => setLogDrawerOpen(true)}
            title="抓取日志"
          >
            {fetchLogs.length > 0 && <Badge count={fetchLogs.length} size="small" />}
          </Button>
        </div>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[activePage]}
            onClick={({ key }) => setActivePage(key as PageType)}
            style={{ height: '100%', paddingTop: 8 }}
            items={[
              { key: 'subscriptions', icon: <DatabaseOutlined />, label: '订阅源' },
              { key: 'content', icon: <UnorderedListOutlined />, label: '内容列表' },
              { key: 'summary', icon: <RobotOutlined />, label: 'AI 摘要' },
              { key: 'settings', icon: <SettingOutlined />, label: '设置' },
            ]}
          />
        </Sider>
        <Layout style={{ padding: '16px 24px' }}>
          <Content
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 8,
              minHeight: 'calc(100vh - 112px)',
              overflow: 'auto',
            }}
          >
            {renderPage()}
          </Content>
        </Layout>
      </Layout>

      {/* 抓取日志抽屉 */}
      <Drawer
        title={
          <Space>
            <BugOutlined />
            <span>抓取日志</span>
            {fetchLogs.length > 0 && <Tag>{fetchLogs.length}</Tag>}
          </Space>
        }
        placement="right"
        width={480}
        open={logDrawerOpen}
        onClose={() => setLogDrawerOpen(false)}
        extra={
          <Button icon={<ClearOutlined />} size="small" onClick={clearFetchLogs} disabled={fetchLogs.length === 0}>
            清除
          </Button>
        }
      >
        {fetchLogs.length === 0 ? (
          <Empty description="暂无抓取日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Timeline
            items={fetchLogs.map(log => {
              let color = 'gray';
              let icon = <ClockCircleOutlined />;
              if (log.level === 'success') { color = 'green'; icon = <CheckCircleOutlined />; }
              else if (log.level === 'fail') { color = 'red'; icon = <CloseCircleOutlined />; }
              return {
                color,
                dot: icon,
                children: (
                  <div style={{ paddingBottom: 8 }}>
                    <Space>
                      <Text strong style={{ fontSize: 13 }}>{log.subscriptionName}</Text>
                      {log.duration !== undefined && (
                        <Tag style={{ fontSize: 11 }}>{log.duration}ms</Tag>
                      )}
                      {log.itemCount !== undefined && (
                        <Tag color="green" style={{ fontSize: 11 }}>+{log.itemCount}</Tag>
                      )}
                    </Space>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                      <div>{log.message}</div>
                      {log.url && (
                        <div style={{ fontSize: 11, color: '#999', wordBreak: 'break-all' }}>
                          URL: {log.url}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ),
              };
            })}
          />
        )}
      </Drawer>
    </Layout>
  );
}

export default App;
