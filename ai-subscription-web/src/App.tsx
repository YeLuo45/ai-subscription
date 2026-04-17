import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout, Menu, Typography, message } from 'antd';
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
  const schedulerRef = useRef(false);

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

  // 抓取单个订阅源
  const fetchSubscription = useCallback(async (sub: Subscription) => {
    try {
      const result = await fetchFeed(sub.url, sub.type);
      const items: ContentItem[] = result.items.map(item => ({
        ...item,
        subscriptionId: sub.id,
        isRead: false,
      }));

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

      if (items.length > 0) {
        message.success(`抓取成功：${items.length} 条新内容`);
      } else {
        message.info('暂无新内容');
      }
    } catch (err) {
      message.error(`抓取失败：${sub.name}`);
    }
  }, [settings.pushSettings.enabled]);

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
      <Header style={{ background: '#001529', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>
          🤖 AI 订阅助手
        </Title>
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
    </Layout>
  );
}

export default App;
