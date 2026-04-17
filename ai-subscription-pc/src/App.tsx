import { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Typography, message, Table, Button, Modal, Form, Input, Select, Space, Tag, Popconfirm, Card, Row, Col, List, Tabs, Alert, Spin } from 'antd';
import { DatabaseOutlined, UnorderedListOutlined, SettingOutlined, RobotOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { AISummarizer, ModelConfig } from './adapters/ai-model-adapter';
import type { Subscription, ContentItem, PushSettings, StoreData } from './utils/storage';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

type PageType = 'subscriptions' | 'content' | 'settings' | 'summary';

// Electron API
const api = window.electronAPI;
const summarizer = new AISummarizer();

// 预设订阅源
const PRESET_SUBSCRIPTIONS = [
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', type: 'rss' as const, category: '技术' },
  { name: 'GitHub Trending', url: 'https://github.com/trending.atom', type: 'atom' as const, category: '技术' },
  { name: '36氪', url: 'https://36kr.com/feed', type: 'rss' as const, category: '科技' },
  { name: '少数派', url: 'https://sspai.com/feed', type: 'rss' as const, category: '科技' },
  { name: 'InfoQ', url: 'https://feed.infoq.com/', type: 'rss' as const, category: '技术' },
];

function App() {
  const [activePage, setActivePage] = useState<PageType>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [pushSettings, setPushSettings] = useState<PushSettings>({
    enabled: false,
    pushTime: '09:00',
    pushChannel: 'notification',
    contentType: 'title_summary',
  });
  const [contents, setContents] = useState<Record<string, ContentItem[]>>({});
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // 初始化加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const data: StoreData = await api.store.getAll();
        setSubscriptions(data.subscriptions || []);
        setModels(data.models || []);
        setPushSettings(data.pushSettings || {
          enabled: false,
          pushTime: '09:00',
          pushChannel: 'notification',
          contentType: 'title_summary',
        });
        setContents(data.contents || {});
        
        // 初始化 summarizer
        const loadedModels = data.models && data.models.length > 0 ? data.models : AISummarizer.createDefaultModels();
        if (data.models && data.models.length === 0) {
          // 首次使用，创建默认模型
          const defaults = AISummarizer.createDefaultModels();
          setModels(defaults);
          await api.store.setModels(defaults);
        }
        summarizer.setModels(data.models && data.models.length > 0 ? data.models : loadedModels);
      } catch (err) {
        console.error('[App] 加载数据失败:', err);
        const defaults = AISummarizer.createDefaultModels();
        setModels(defaults);
        summarizer.setModels(defaults);
      }
    };
    loadData();
  }, []);

  // 监听 Electron 事件
  useEffect(() => {
    api.on('fetch-all', () => {
      fetchAllSubscriptions();
    });

    api.on('trigger-push', () => {
      handlePush();
    });

    return () => {
      api.removeAllListeners('fetch-all');
      api.removeAllListeners('trigger-push');
    };
  }, [subscriptions, models, pushSettings]);

  // 生成 ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 添加订阅源
  const addSubscription = useCallback(async (sub: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSub: Subscription = {
      ...sub,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newSubs = [...subscriptions, newSub];
    setSubscriptions(newSubs);
    await api.store.setSubscriptions(newSubs);
    message.success(`已添加订阅源: ${sub.name}`);
  }, [subscriptions]);

  // 删除订阅源
  const deleteSubscription = useCallback(async (id: string) => {
    const newSubs = subscriptions.filter(s => s.id !== id);
    setSubscriptions(newSubs);
    await api.store.setSubscriptions(newSubs);
    message.success('已删除订阅源');
  }, [subscriptions]);

  // 抓取单个订阅源
  const fetchSubscription = useCallback(async (sub: Subscription) => {
    try {
      const result = await api.fetch.rss(sub.url, sub.type);
      if (result.success && result.items) {
        const items: ContentItem[] = result.items.map(item => ({
          ...item,
          subscriptionId: sub.id,
          isRead: false,
        }));
        setContents(prev => ({ ...prev, [sub.id]: items }));
        await api.store.setContents(sub.id, items);
        return items;
      }
      message.error(`抓取失败 [${sub.name}]: ${result.error}`);
      return [];
    } catch (err) {
      console.error(`[Fetch] 抓取失败 [${sub.name}]:`, err);
      message.error(`抓取失败 [${sub.name}]`);
      return [];
    }
  }, []);

  // 抓取所有订阅源
  const fetchAllSubscriptions = useCallback(async () => {
    setFetching(true);
    try {
      for (const sub of subscriptions.filter(s => s.enabled)) {
        await fetchSubscription(sub);
      }
      message.success('抓取完成');
    } finally {
      setFetching(false);
    }
  }, [subscriptions, fetchSubscription]);

  // 生成 AI 摘要
  const generateSummary = useCallback(async (item: ContentItem) => {
    const text = `${item.title}\n\n${item.description}`;
    const result = await summarizer.summarize(text, { summaryLength: 'medium' });
    
    if (result.success) {
      return { summary: result.summary, keywords: result.keywords };
    }
    return { summary: result.error || '摘要生成失败', keywords: [] };
  }, []);

  // 添加预设订阅源
  const addPresetSubscription = useCallback((preset: typeof PRESET_SUBSCRIPTIONS[0]) => {
    const exists = subscriptions.find(s => s.url === preset.url);
    if (exists) {
      message.warning('该订阅源已存在');
      return;
    }
    addSubscription({
      name: preset.name,
      url: preset.url,
      type: preset.type,
      category: preset.category,
      enabled: true,
      aiSummaryEnabled: true,
      fetchIntervalMinutes: 60,
    });
  }, [subscriptions, addSubscription]);

  // 更新模型
  const updateModel = useCallback(async (model: ModelConfig) => {
    const newModels = models.map(m => m.id === model.id ? model : m);
    setModels(newModels);
    summarizer.setModels(newModels);
    await api.store.setModels(newModels);
  }, [models]);

  // 添加模型
  const addModel = useCallback(async () => {
    const newModel: ModelConfig = {
      id: generateId(),
      name: '新模型',
      provider: 'zhipu',
      apiBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: '',
      modelName: '',
      temperature: 0.3,
      maxTokens: 1000,
      isDefault: false,
    };
    const newModels = [...models, newModel];
    setModels(newModels);
    await api.store.setModels(newModels);
    message.success('已添加新模型，请配置');
  }, [models]);

  // 保存推送设置
  const savePushSettings = useCallback(async (newSettings: PushSettings) => {
    setPushSettings(newSettings);
    await api.store.setPushSettings(newSettings);
    message.success('推送设置已保存');
  }, []);

  // 执行推送
  const handlePush = useCallback(async () => {
    const allContents = Object.values(contents).flat();
    if (allContents.length === 0) {
      message.warning('没有可推送的内容');
      return;
    }

    // 取最新 10 条
    const toPush = allContents.slice(0, 10);
    const title = `📬 AI 订阅助手 - ${toPush.length} 条新内容`;
    const body = toPush.map(c => c.title).join('\n').slice(0, 200);

    if (pushSettings.pushChannel === 'notification' || pushSettings.pushChannel === 'both') {
      await api.notification.show(title, body);
    }

    if (pushSettings.pushChannel === 'email' || pushSettings.pushChannel === 'both') {
      if (pushSettings.emailConfig) {
        const html = toPush.map(c => `<li><a href="${c.link}">${c.title}</a></li>`).join('');
        await api.email.send({
          smtpConfig: pushSettings.emailConfig,
          to: pushSettings.emailConfig.email,
          subject: title,
          html: `<h2>${title}</h2><ul>${html}</ul>`,
        });
      }
    }

    // 记录历史
    await api.history.add({
      subscriptionId: 'batch',
      subscriptionName: '批量推送',
      title: `${toPush.length} 条内容`,
      pushChannel: pushSettings.pushChannel,
      status: 'success',
    });

    message.success('推送完成');
  }, [contents, pushSettings]);

  const renderPage = () => {
    switch (activePage) {
      case 'subscriptions':
        return (
          <SubscriptionsPage
            subscriptions={subscriptions}
            onAdd={addSubscription}
            onDelete={deleteSubscription}
            onFetch={fetchSubscription}
            onAddPreset={addPresetSubscription}
            presets={PRESET_SUBSCRIPTIONS}
            loading={fetching}
            onFetchAll={fetchAllSubscriptions}
          />
        );
      case 'content':
        return (
          <ContentListPage
            subscriptions={subscriptions}
            contents={contents}
            onSelectContent={setSelectedContent}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            models={models}
            pushSettings={pushSettings}
            onUpdateModel={updateModel}
            onAddModel={addModel}
            onSavePushSettings={savePushSettings}
            summarizer={summarizer}
            onTestEmail={async (config) => {
              const result = await api.email.test(config);
              return result;
            }}
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
          🤖 AI 订阅助手 (PC)
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

// ========== 订阅源管理页面 ==========
interface SubscriptionsPageProps {
  subscriptions: Subscription[];
  onAdd: (sub: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete: (id: string) => void;
  onFetch: (sub: Subscription) => Promise<ContentItem[]>;
  onAddPreset: (preset: typeof PRESET_SUBSCRIPTIONS[0]) => void;
  presets: typeof PRESET_SUBSCRIPTIONS;
  loading: boolean;
  onFetchAll: () => void;
}

function SubscriptionsPage({ subscriptions, onAdd, onDelete, onFetch, onAddPreset, presets, loading, onFetchAll }: SubscriptionsPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleAdd = () => {
    form.validateFields().then(values => {
      onAdd({
        name: values.name,
        url: values.url,
        type: values.type,
        category: values.category || '未分类',
        enabled: true,
        aiSummaryEnabled: true,
        fetchIntervalMinutes: values.fetchIntervalMinutes || 60,
      });
      setIsModalOpen(false);
      form.resetFields();
    });
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true },
    { title: '类型', dataIndex: 'type', key: 'type', render: (t: string) => <Tag>{t.toUpperCase()}</Tag> },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '状态', dataIndex: 'enabled', key: 'enabled', render: (e: boolean) => e ? <Tag color="green">启用</Tag> : <Tag color="gray">禁用</Tag> },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Subscription) => (
        <Space>
          <Button size="small" onClick={() => onFetch(record)} loading={loading}>抓取</Button>
          <Popconfirm title="确定删除？" onConfirm={() => onDelete(record.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>订阅源管理</Title>
          <Button onClick={onFetchAll} loading={loading}>刷新全部</Button>
        </Space>
        <Button type="primary" onClick={() => setIsModalOpen(true)}>+ 添加订阅源</Button>
      </div>

      <Title level={5} style={{ marginTop: 24 }}>预设订阅源</Title>
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        {presets.map((preset) => (
          <Col key={preset.url}>
            <Card size="small" style={{ width: 200 }}>
              <div style={{ fontWeight: 500 }}>{preset.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{preset.category}</div>
              <Button size="small" style={{ marginTop: 8 }} onClick={() => onAddPreset(preset)}>
                添加
              </Button>
            </Card>
          </Col>
        ))}
      </Row>

      <Table
        dataSource={subscriptions}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      <Modal title="添加订阅源" open={isModalOpen} onOk={handleAdd} onCancel={() => setIsModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="例如：我的科技博客" />
          </Form.Item>
          <Form.Item name="url" label="URL" rules={[{ required: true, type: 'url' }]}>
            <Input placeholder="https://example.com/feed.xml" />
          </Form.Item>
          <Form.Item name="type" label="类型" initialValue="rss">
            <Select>
              <Select.Option value="rss">RSS</Select.Option>
              <Select.Option value="atom">Atom</Select.Option>
              <Select.Option value="api">JSON API</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="category" label="分类" initialValue="未分类">
            <Input placeholder="例如：科技、AI" />
          </Form.Item>
          <Form.Item name="fetchIntervalMinutes" label="抓取间隔（分钟）" initialValue={60}>
            <Input type="number" min={5} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ========== 内容列表页面 ==========
interface ContentListPageProps {
  subscriptions: Subscription[];
  contents: Record<string, ContentItem[]>;
  onSelectContent: (content: ContentItem) => void;
}

function ContentListPage({ subscriptions, contents, onSelectContent }: ContentListPageProps) {
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  
  const allContents = Object.values(contents).flat();
  const displayContents = selectedSubId ? (contents[selectedSubId] || []) : allContents;

  return (
    <div>
      <Title level={4}>内容列表</Title>
      
      <div style={{ marginBottom: 16 }}>
        <Button
          type={selectedSubId === null ? 'primary' : 'default'}
          onClick={() => setSelectedSubId(null)}
          style={{ marginRight: 8 }}
        >
          全部
        </Button>
        {subscriptions.map(sub => (
          <Tag
            key={sub.id}
            color={selectedSubId === sub.id ? 'blue' : 'default'}
            onClick={() => setSelectedSubId(sub.id)}
            style={{ cursor: 'pointer', marginRight: 8, padding: '4px 12px' }}
          >
            {sub.name} ({(contents[sub.id] || []).length})
          </Tag>
        ))}
      </div>

      <List
        itemLayout="vertical"
        dataSource={displayContents}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button key="view" type="link" onClick={() => onSelectContent(item)}>
                生成摘要
              </Button>,
              item.link && (
                <Button key="open" type="link" href={item.link} target="_blank" rel="noopener noreferrer">
                  原文
                </Button>
              ),
            ]}
          >
            <List.Item.Meta
              title={<a href={item.link || '#'} target="_blank" rel="noopener noreferrer">{item.title}</a>}
              description={dayjs(item.pubDate).format('YYYY-MM-DD HH:mm')}
            />
            <div style={{ color: '#666', maxHeight: 100, overflow: 'hidden' }}>
              {item.description?.slice(0, 200)}...
            </div>
          </List.Item>
        )}
        locale={{ emptyText: '暂无内容，请先抓取订阅源' }}
      />
    </div>
  );
}

// ========== 设置页面 ==========
interface SettingsPageProps {
  models: ModelConfig[];
  pushSettings: PushSettings;
  onUpdateModel: (m: ModelConfig) => void;
  onAddModel: () => void;
  onSavePushSettings: (s: PushSettings) => void;
  summarizer: AISummarizer;
  onTestEmail: (config: NonNullable<PushSettings['emailConfig']>) => Promise<{ success: boolean; error?: string }>;
}

function SettingsPage({ models, pushSettings, onUpdateModel, onAddModel, onSavePushSettings, summarizer, onTestEmail }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState('models');
  const [emailForm] = Form.useForm();

  const handleTestModel = async (model: ModelConfig) => {
    const result = await summarizer.testModel(model);
    if (result.success) {
      message.success(`模型 ${model.name} 连接成功`);
    } else {
      message.error(`模型 ${model.name} 连接失败: ${result.message}`);
    }
  };

  const handleTestEmail = async () => {
    const values = emailForm.getFieldsValue();
    const result = await onTestEmail({
      smtpHost: values.smtpHost,
      smtpPort: values.smtpPort,
      email: values.email,
      password: values.password,
      useTLS: values.useTLS,
    });
    if (result.success) {
      message.success('测试邮件发送成功');
    } else {
      message.error(`测试失败: ${result.error}`);
    }
  };

  const modelColumns = [
    { title: '模型', dataIndex: 'name', key: 'name', render: (n: string, r: ModelConfig) => (
      <Space>
        {n}
        {r.isDefault && <Tag color="blue">默认</Tag>}
      </Space>
    )},
    { title: '提供商', dataIndex: 'provider', key: 'provider', render: (p: string) => <Tag>{p}</Tag> },
    { title: 'API Key', dataIndex: 'apiKey', key: 'apiKey', render: (k: string) => k ? '******' + k.slice(-4) : <Tag>未配置</Tag> },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ModelConfig) => (
        <Space>
          <Button size="small" onClick={() => handleTestModel(record)}>测试</Button>
          <Button size="small" type="primary" onClick={() => onUpdateModel({ ...record, isDefault: true })}>
            设为默认
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>设置</Title>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'models',
            label: 'AI 模型配置',
            children: (
              <div>
                <Button type="primary" onClick={onAddModel} style={{ marginBottom: 16 }}>
                  + 添加模型
                </Button>
                <Table
                  dataSource={models}
                  columns={modelColumns}
                  rowKey="id"
                  pagination={false}
                />
                <Alert
                  message="模型优先级说明"
                  description="系统按以下顺序尝试各模型：miniMax → 小米 → 智谱 → Claude → Gemini。失败后自动切换下一个。"
                  type="info"
                  style={{ marginTop: 24 }}
                />
              </div>
            ),
          },
          {
            key: 'push',
            label: '推送设置',
            children: (
              <div>
                <Form
                  layout="vertical"
                  initialValues={pushSettings}
                  onFinish={(values) => {
                    onSavePushSettings({
                      ...pushSettings,
                      ...values,
                      emailConfig: pushSettings.emailConfig,
                    });
                  }}
                >
                  <Form.Item name={['enabled']} valuePropName="checked">
                    <Input type="checkbox" /> 启用定时推送
                  </Form.Item>
                  <Space>
                    <Form.Item label="推送时间" name="pushTime" initialValue={pushSettings.pushTime}>
                      <Input type="time" />
                    </Form.Item>
                    <Form.Item label="推送渠道" name="pushChannel" initialValue={pushSettings.pushChannel}>
                      <Select style={{ width: 150 }}>
                        <Select.Option value="notification">通知栏</Select.Option>
                        <Select.Option value="email">邮件</Select.Option>
                        <Select.Option value="both">两者都要</Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item label="推送内容" name="contentType" initialValue={pushSettings.contentType}>
                      <Select style={{ width: 180 }}>
                        <Select.Option value="title_only">仅标题</Select.Option>
                        <Select.Option value="title_summary">标题 + 摘要</Select.Option>
                        <Select.Option value="title_full_summary">标题 + 完整摘要</Select.Option>
                      </Select>
                    </Form.Item>
                  </Space>
                  <Button type="primary" htmlType="submit">保存推送设置</Button>
                </Form>

                <Title level={5} style={{ marginTop: 32 }}>邮件配置</Title>
                <Form
                  form={emailForm}
                  layout="vertical"
                  initialValues={pushSettings.emailConfig || { smtpHost: 'smtp.qq.com', smtpPort: 465, useTLS: true }}
                >
                  <Space>
                    <Form.Item label="SMTP 服务器" name="smtpHost">
                      <Input placeholder="smtp.qq.com" style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item label="端口" name="smtpPort">
                      <Input type="number" placeholder="465" style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item label="使用 TLS" name="useTLS" valuePropName="checked">
                      <Input type="checkbox" />
                    </Form.Item>
                  </Space>
                  <Form.Item label="邮箱" name="email">
                    <Input placeholder="your-email@example.com" style={{ width: 300 }} />
                  </Form.Item>
                  <Form.Item label="密码/授权码" name="password">
                    <Input.Password placeholder="邮箱密码或授权码" style={{ width: 300 }} />
                  </Form.Item>
                  <Space>
                    <Button onClick={handleTestEmail}>发送测试邮件</Button>
                    <Button type="primary" onClick={() => {
                      const values = emailForm.getFieldsValue();
                      onSavePushSettings({
                        ...pushSettings,
                        emailConfig: {
                          smtpHost: values.smtpHost,
                          smtpPort: values.smtpPort,
                          email: values.email,
                          password: values.password,
                          useTLS: values.useTLS,
                        },
                      });
                    }}>保存邮件配置</Button>
                  </Space>
                </Form>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

// ========== AI 摘要页面 ==========
interface SummaryPageProps {
  content: ContentItem | null;
  onGenerateSummary: (item: ContentItem) => Promise<{ summary: string; keywords: string[] }>;
}

function SummaryPage({ content, onGenerateSummary }: SummaryPageProps) {
  const [summaryResult, setSummaryResult] = useState<{ summary: string; keywords: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!content) return;
    setLoading(true);
    setError(null);
    try {
      const result = await onGenerateSummary(content);
      setSummaryResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '摘要生成失败');
    } finally {
      setLoading(false);
    }
  };

  if (!content) {
    return (
      <div>
        <Title level={4}>AI 摘要</Title>
        <Alert message="请先在内容列表中选择一篇文章，然后点击'生成摘要'" type="info" />
      </div>
    );
  }

  return (
    <div>
      <Title level={4}>AI 摘要</Title>
      
      <Card title={content.title} style={{ marginBottom: 16 }}>
        <p style={{ color: '#666', fontSize: 12 }}>{dayjs(content.pubDate).format('YYYY-MM-DD HH:mm')}</p>
        <p>{content.description?.slice(0, 300)}...</p>
      </Card>

      <Button type="primary" onClick={handleGenerate} loading={loading} style={{ marginBottom: 16 }}>
        {loading ? '生成中...' : '生成 AI 摘要'}
      </Button>

      {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} />}

      {summaryResult && (
        <Card title="摘要结果">
          <div style={{ marginBottom: 16 }}>
            <strong>摘要：</strong>
            <p style={{ whiteSpace: 'pre-wrap' }}>{summaryResult.summary}</p>
          </div>
          {summaryResult.keywords.length > 0 && (
            <div>
              <strong>关键词：</strong>
              <Space wrap>
                {summaryResult.keywords.map((kw, i) => (
                  <Tag key={i} color="blue">{kw}</Tag>
                ))}
              </Space>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default App;
