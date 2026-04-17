import { useState, useEffect, useCallback } from 'react';
import {
  Layout, Menu, Typography, Card, List, Button, Switch, Modal, Form, Input, Select, Tag, Space,
  message, Popconfirm, Tooltip, Empty, Spin, message as antdMessage,
} from 'antd';
import {
  ApiOutlined, SettingOutlined, RobotOutlined, HistoryOutlined, PlusOutlined,
  ReloadOutlined, DeleteOutlined, EditOutlined, EyeOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { Subscription, AIModel, Article, AppSettings } from './types';
import { PRESET_SUBSCRIPTIONS, DEFAULT_MODELS } from './types';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

declare global {
  interface Window {
    electronAPI: {
      getSubscriptions: () => Promise<any[]>;
      saveSubscription: (sub: any) => Promise<any>;
      updateSubscription: (sub: any) => Promise<any>;
      deleteSubscription: (id: string) => Promise<void>;
      fetchSubscription: (sub: any) => Promise<number>;
      fetchAll: () => Promise<void>;
      getArticles: (opts: { subId?: string; limit?: number }) => Promise<any[]>;
      getModels: () => Promise<any[]>;
      saveModel: (model: any) => Promise<any>;
      updateModel: (model: any) => Promise<any>;
      deleteModel: (id: string) => Promise<void>;
      getSettings: () => Promise<AppSettings>;
      saveSettings: (settings: AppSettings) => Promise<AppSettings>;
      summarizeArticle: (article: any) => Promise<{ summary: string; keywords: string[]; tokens: number }>;
      getPushHistory: (limit?: number) => Promise<any[]>;
      sendNotification: (title: string, body: string) => Promise<void>;
      sendEmail: (to: string, subject: string, body: string) => Promise<boolean>;
      onDataUpdated: (cb: () => void) => void;
      onNavigate: (cb: (path: string) => void) => void;
    };
  }
}

type MenuKey = 'feeds' | 'articles' | 'models' | 'settings' | 'history';

export default function App() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('feeds');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [pushHistory, setPushHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editSub, setEditSub] = useState<any>(null);
  const [addForm] = Form.useForm();
  const [modelForm] = Form.useForm();
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      const [subs, mods, sets] = await Promise.all([
        window.electronAPI.getSubscriptions(),
        window.electronAPI.getModels(),
        window.electronAPI.getSettings(),
      ]);
      
      // Initialize presets
      if (subs.length === 0) {
        for (const preset of PRESET_SUBSCRIPTIONS) {
          await window.electronAPI.saveSubscription(preset);
        }
        const newSubs = await window.electronAPI.getSubscriptions();
        setSubscriptions(newSubs);
      } else {
        setSubscriptions(subs);
      }

      if (mods.length === 0) {
        for (const model of DEFAULT_MODELS) {
          await window.electronAPI.saveModel(model);
        }
        const newMods = await window.electronAPI.getModels();
        setModels(newMods);
      } else {
        setModels(mods);
      }

      setSettings(sets);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    window.electronAPI.onDataUpdated(() => {
      loadData();
      if (activeMenu === 'articles') loadArticles();
    });
  }, [loadData]);

  useEffect(() => {
    if (activeMenu === 'articles') loadArticles();
    if (activeMenu === 'history') loadHistory();
  }, [activeMenu]);

  async function loadArticles(subId?: string) {
    const arts = await window.electronAPI.getArticles({ subId, limit: 100 });
    setArticles(arts);
  }

  async function loadHistory() {
    const hist = await window.electronAPI.getPushHistory(50);
    setPushHistory(hist);
  }

  const menuItems: MenuProps['items'] = [
    { key: 'feeds', icon: <ApiOutlined />, label: '订阅源' },
    { key: 'articles', icon: <EyeOutlined />, label: '文章' },
    { key: 'models', icon: <RobotOutlined />, label: 'AI模型' },
    { key: 'settings', icon: <SettingOutlined />, label: '推送设置' },
    { key: 'history', icon: <HistoryOutlined />, label: '推送历史' },
  ];

  async function handleAddSubscription(values: any) {
    try {
      const sub = await window.electronAPI.saveSubscription({
        name: values.name,
        url: values.url,
        type: values.type || 'rss',
        category: values.category || 'Custom',
        enabled: true,
        aiSummaryEnabled: true,
        fetchIntervalMinutes: values.fetchIntervalMinutes || 60,
      });
      setSubscriptions((prev) => [...prev, sub]);
      setAddModalOpen(false);
      addForm.resetFields();
      antdMessage.success(`已添加: ${sub.name}`);
    } catch { antdMessage.error('添加失败'); }
  }

  async function handleEditSubscription(values: any) {
    if (!editSub) return;
    try {
      const updated = await window.electronAPI.updateSubscription({ ...editSub, name: values.name, url: values.url, type: values.type, category: values.category, fetchIntervalMinutes: values.fetchIntervalMinutes });
      setSubscriptions((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      setEditSub(null);
      antdMessage.success('已更新');
    } catch { antdMessage.error('更新失败'); }
  }

  async function handleDeleteSubscription(id: string) {
    await window.electronAPI.deleteSubscription(id);
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    antdMessage.success('已删除');
  }

  async function handleToggleEnabled(sub: any) {
    const updated = await window.electronAPI.updateSubscription({ ...sub, enabled: !sub.enabled });
    setSubscriptions((prev) => prev.map((s) => s.id === updated.id ? updated : s));
  }

  async function handleRefreshAll() {
    setLoading(true);
    try {
      await window.electronAPI.fetchAll();
      await loadArticles();
      antdMessage.success('刷新完成');
    } catch { antdMessage.error('刷新失败'); }
    finally { setLoading(false); }
  }

  async function handleSummarize(article: any) {
    setSummarizing(article.id);
    try {
      const result = await window.electronAPI.summarizeArticle(article);
      if (result.summary) {
        setSelectedArticle({ ...article, summary: result.summary, keywords: result.keywords, tokens: result.tokens });
        antdMessage.success(`摘要生成成功 (${result.tokens} tokens)`);
      } else {
        antdMessage.error('摘要生成失败');
      }
    } catch (err: any) { antdMessage.error(err.message || '失败'); }
    finally { setSummarizing(null); }
  }

  async function handleSaveSettings(values: any) {
    if (!settings) return;
    const updated: AppSettings = {
      ...settings,
      push: { ...settings.push, enabled: values.pushEnabled, time: values.pushTime, frequency: values.pushFrequency, contentType: values.contentType, channel: values.pushChannel, quietHoursEnabled: values.quietHoursEnabled, quietHoursStart: values.quietHoursStart, quietHoursEnd: values.quietHoursEnd, maxDailyPush: values.maxDailyPush || 20 },
      email: { ...settings.email, enabled: values.emailEnabled, smtpHost: values.smtpHost, smtpPort: values.smtpPort, smtpUser: values.smtpUser, smtpPassword: values.smtpPassword, fromEmail: values.fromEmail, fromName: values.fromName },
      summaryLength: values.summaryLength,
    };
    await window.electronAPI.saveSettings(updated);
    setSettings(updated);
    antdMessage.success('设置已保存');
  }

  async function handleSaveModel(values: any) {
    const model = await window.electronAPI.saveModel({
      name: values.name,
      provider: values.provider,
      apiBaseUrl: values.apiBaseUrl,
      apiKey: values.apiKey,
      modelName: values.modelName,
      temperature: values.temperature || 0.3,
      maxTokens: values.maxTokens || 1000,
      isDefault: models.length === 0,
    });
    setModels((prev) => [...prev, model]);
    modelForm.resetFields();
    antdMessage.success('模型已添加');
  }

  async function handleUpdateModel(model: any) {
    await window.electronAPI.updateModel(model);
    setModels((prev) => prev.map((m) => m.id === model.id ? model : m));
    antdMessage.success('模型已更新');
  }

  const renderFeeds = () => (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => setAddModalOpen(true)}>添加订阅源</Button>
        <Button icon={<ReloadOutlined />} onClick={handleRefreshAll} loading={loading}>刷新全部</Button>
      </div>
      <List
        dataSource={subscriptions}
        locale={{ emptyText: <Empty description="暂无订阅源" /> }}
        renderItem={(sub: any) => (
          <List.Item actions={[
            <Switch key="toggle" checked={sub.enabled} onChange={() => handleToggleEnabled(sub)} size="small" />,
            <Tooltip key="edit" title="编辑"><Button icon={<EditOutlined />} size="small" onClick={() => { setEditSub(sub); modelForm.setFieldsValue(sub); }} /></Tooltip>,
            <Popconfirm key="delete" title="确认删除？" onConfirm={() => handleDeleteSubscription(sub.id)}>
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>,
          ]}>
            <List.Item.Meta title={<Space><Text strong={sub.enabled}>{sub.name}</Text><Tag>{sub.category}</Tag><Tag color="blue">{sub.type?.toUpperCase()}</Tag></Space>} description={<Text type="secondary" style={{ fontSize: 12 }}>{sub.url}</Text>} />
          </List.Item>
        )}
      />

      <Modal title="添加订阅源" open={addModalOpen} onCancel={() => { setAddModalOpen(false); addForm.resetFields(); }} footer={null}>
        <Form form={addForm} layout="vertical" onFinish={handleAddSubscription}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input placeholder="科技资讯" /></Form.Item>
          <Form.Item name="url" label="URL" rules={[{ required: true, type: 'url' }]}><Input placeholder="https://example.com/feed.xml" /></Form.Item>
          <Form.Item name="type" label="类型" initialValue="rss"><Select options={[{ value: 'rss', label: 'RSS' }, { value: 'atom', label: 'Atom' }, { value: 'api', label: 'API' }]} /></Form.Item>
          <Form.Item name="category" label="分类" initialValue="Custom"><Input placeholder="科技" /></Form.Item>
          <Form.Item name="fetchIntervalMinutes" label="抓取间隔(分钟)" initialValue={60}><Input type="number" min={5} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" loading={loading}>保存</Button></Form.Item>
        </Form>
      </Modal>

      <Modal title="编辑订阅源" open={!!editSub} onCancel={() => setEditSub(null)} footer={null}>
        <Form form={modelForm} layout="vertical" onFinish={handleEditSubscription}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="url" label="URL" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="类型"><Select options={[{ value: 'rss', label: 'RSS' }, { value: 'atom', label: 'Atom' }]} /></Form.Item>
          <Form.Item name="category" label="分类"><Input /></Form.Item>
          <Form.Item name="fetchIntervalMinutes" label="抓取间隔"><Input type="number" /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit">保存</Button></Form.Item>
        </Form>
      </Modal>
    </div>
  );

  const renderArticles = () => (
    <div>
      <List
        dataSource={articles}
        locale={{ emptyText: <Empty description="暂无文章，请先刷新订阅源" /> }}
        renderItem={(article: any) => (
          <List.Item
            actions={[
              <Button key="summarize" icon={<RobotOutlined />} size="small" loading={summarizing === article.id} onClick={() => handleSummarize(article)}>AI摘要</Button>,
              <Button key="open" icon={<EyeOutlined />} size="small" onClick={() => window.open(article.link, '_blank')} />,
            ]}
          >
            <List.Item.Meta title={<a href={article.link} target="_blank" rel="noopener noreferrer">{article.title}</a>} description={<Space direction="vertical" size={0}><Text type="secondary" style={{ fontSize: 12 }}>{article.description?.slice(0, 150)}</Text><Text type="secondary" style={{ fontSize: 11 }}>{new Date(article.pub_date || article.fetched_at).toLocaleString('zh-CN')}</Text></Space>} />
          </List.Item>
        )}
      />
      <Modal title="AI摘要" open={!!selectedArticle?.summary} onCancel={() => setSelectedArticle(null)} footer={null} width={600}>
        {selectedArticle && (
          <div>
            <Text strong>{selectedArticle.title}</Text>
            <hr style={{ margin: '12px 0' }} />
            <Text>{selectedArticle.summary}</Text>
            {selectedArticle.keywords?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">关键词：</Text>
                {selectedArticle.keywords.map((k: string) => <Tag key={k} color="blue" style={{ marginLeft: 4 }}>{k}</Tag>)}
              </div>
            )}
            <div style={{ marginTop: 8 }}><Text type="secondary">Tokens: {selectedArticle.tokens}</Text></div>
          </div>
        )}
      </Modal>
    </div>
  );

  const renderModels = () => {
    const [addOpen, setAddOpen] = useState(false);
    return (
      <div>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => setAddOpen(true)} style={{ marginBottom: 16 }}>添加模型</Button>
        <List dataSource={models} renderItem={(model: any) => (
          <List.Item>
            <List.Item.Meta title={<Space><Text strong>{model.name}</Text>{model.is_default || model.isDefault ? <Tag color="green">默认</Tag> : null}<Tag>{model.provider}</Tag></Space>} description={<Space direction="vertical" size={0}><Text type="secondary" style={{ fontSize: 12 }}>模型: {model.model_name || model.modelName}</Text><Text type="secondary" style={{ fontSize: 12 }}>API: {model.api_base_url || model.apiBaseUrl}</Text><Text type="secondary" style={{ fontSize: 12 }}>Key: {model.api_key ? '****' + model.api_key.slice(-4) : '未配置'}</Text></Space>} />
            <Button size="small" onClick={() => handleUpdateModel(model)}>保存</Button>
          </List.Item>
        )} />
        <Modal title="添加AI模型" open={addOpen} onCancel={() => { setAddOpen(false); modelForm.resetFields(); }} footer={null}>
          <Form form={modelForm} layout="vertical" onFinish={handleSaveModel}>
            <Form.Item name="name" label="显示名称" rules={[{ required: true }]}><Input placeholder="智谱 GLM-4" /></Form.Item>
            <Form.Item name="provider" label="提供商" rules={[{ required: true }]}><Select options={[{ value: 'minimax', label: 'MiniMax' }, { value: 'xiaomi', label: '小米' }, { value: 'zhipu', label: '智谱' }, { value: 'claude', label: 'Claude' }, { value: 'gemini', label: 'Gemini' }]} /></Form.Item>
            <Form.Item name="apiBaseUrl" label="API Base URL" rules={[{ required: true }]}><Input placeholder="https://api.example.com/v1" /></Form.Item>
            <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}><Input.Password placeholder="sk-xxxxx" /></Form.Item>
            <Form.Item name="modelName" label="模型名称" rules={[{ required: true }]}><Input placeholder="glm-4" /></Form.Item>
            <Form.Item name="temperature" label="Temperature" initialValue={0.3}><Input type="number" min={0} max={1} step={0.1} /></Form.Item>
            <Form.Item name="maxTokens" label="最大Token数" initialValue={1000}><Input type="number" min={100} /></Form.Item>
            <Form.Item><Button type="primary" htmlType="submit">保存</Button></Form.Item>
          </Form>
        </Modal>
      </div>
    );
  };

  const renderSettings = () => {
    if (!settings) return <Spin />;
    return (
      <Form layout="vertical" initialValues={{
        pushEnabled: settings.push.enabled,
        pushTime: settings.push.time,
        pushFrequency: settings.push.frequency,
        contentType: settings.push.contentType,
        pushChannel: settings.push.channel,
        quietHoursEnabled: settings.push.quietHoursEnabled,
        quietHoursStart: settings.push.quietHoursStart,
        quietHoursEnd: settings.push.quietHoursEnd,
        maxDailyPush: settings.push.maxDailyPush,
        emailEnabled: settings.email.enabled,
        smtpHost: settings.email.smtpHost,
        smtpPort: settings.email.smtpPort,
        smtpUser: settings.email.smtpUser,
        smtpPassword: settings.email.smtpPassword,
        fromEmail: settings.email.fromEmail,
        fromName: settings.email.fromName,
        summaryLength: settings.summaryLength,
      }} onFinish={handleSaveSettings}>
        <Card title="推送设置" size="small">
          <Form.Item name="pushEnabled" valuePropName="checked" label="启用推送"><Switch /></Form.Item>
          <Form.Item name="pushTime" label="每日推送时间"><Input type="time" /></Form.Item>
          <Form.Item name="pushFrequency" label="推送频率"><Select options={[{ value: 'hourly', label: '每小时' }, { value: 'daily', label: '每日' }, { value: 'weekly', label: '每周' }]} /></Form.Item>
          <Form.Item name="contentType" label="推送内容"><Select options={[{ value: 'title_only', label: '仅标题' }, { value: 'title_summary', label: '标题+摘要' }, { value: 'title_full_summary', label: '标题+完整摘要' }]} /></Form.Item>
          <Form.Item name="pushChannel" label="推送渠道"><Select options={[{ value: 'notification', label: '通知栏' }, { value: 'email', label: '邮件' }, { value: 'both', label: '两者都有' }]} /></Form.Item>
          <Form.Item name="quietHoursEnabled" valuePropName="checked" label="免打扰时段"><Switch /></Form.Item>
          <Space>
            <Form.Item name="quietHoursStart"><Input type="time" placeholder="开始" /></Form.Item>
            <Form.Item name="quietHoursEnd"><Input type="time" placeholder="结束" /></Form.Item>
          </Space>
          <Form.Item name="maxDailyPush" label="每日最大推送条数"><Input type="number" min={1} max={100} /></Form.Item>
          <Space><Button type="primary" htmlType="submit">保存设置</Button><Button onClick={() => window.electronAPI.sendNotification('AI订阅', '测试通知')}>测试通知</Button></Space>
        </Card>
        <Card title="邮件设置" size="small" style={{ marginTop: 16 }}>
          <Form.Item name="emailEnabled" valuePropName="checked" label="启用邮件"><Switch /></Form.Item>
          <Form.Item name="smtpHost" label="SMTP服务器"><Input placeholder="smtp.gmail.com" /></Form.Item>
          <Form.Item name="smtpPort" label="端口"><Input type="number" defaultValue={587} /></Form.Item>
          <Form.Item name="smtpUser" label="用户名"><Input /></Form.Item>
          <Form.Item name="smtpPassword" label="密码"><Input.Password /></Form.Item>
          <Form.Item name="fromEmail" label="发件人邮箱"><Input type="email" /></Form.Item>
          <Form.Item name="fromName" label="发件人名称"><Input /></Form.Item>
          <Button type="primary" htmlType="submit">保存</Button>
        </Card>
        <Card title="摘要设置" size="small" style={{ marginTop: 16 }}>
          <Form.Item name="summaryLength" label="摘要长度"><Select options={[{ value: 'short', label: '短（100字）' }, { value: 'medium', label: '中（300字）' }, { value: 'long', label: '长（500字）' }]} /></Form.Item>
          <Button type="primary" htmlType="submit">保存</Button>
        </Card>
      </Form>
    );
  };

  const renderHistory = () => (
    <List dataSource={pushHistory} locale={{ emptyText: <Empty description="暂无推送记录" /> }} renderItem={(item: any) => (
      <List.Item>
        <List.Item.Meta title={<Space><Text strong>{item.title}</Text><Tag color={item.status === 'success' ? 'green' : 'red'}>{item.status}</Tag></Space>} description={<Text type="secondary" style={{ fontSize: 12 }}>{new Date(item.pushed_at || item.pushedAt).toLocaleString('zh-CN')}</Text>} />
      </List.Item>
    )} />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>🤖 AI订阅聚合</Title>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu mode="inline" selectedKeys={[activeMenu]} items={menuItems} onClick={({ key }) => setActiveMenu(key as MenuKey)} style={{ height: '100%' }} />
        </Sider>
        <Content style={{ padding: 24, minHeight: 280, overflow: 'auto' }}>
          {activeMenu === 'feeds' && renderFeeds()}
          {activeMenu === 'articles' && renderArticles()}
          {activeMenu === 'models' && renderModels()}
          {activeMenu === 'settings' && renderSettings()}
          {activeMenu === 'history' && renderHistory()}
        </Content>
      </Layout>
    </Layout>
  );
}
