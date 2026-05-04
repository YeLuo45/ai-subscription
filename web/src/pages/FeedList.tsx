import { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Menu,
  Typography,
  Card,
  List,
  Button,
  Switch,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  message,
  Popconfirm,
  Tooltip,
  Empty,
  Spin,
  Drawer,
  Badge,
  Checkbox,
} from 'antd';
import {
  SettingOutlined,
  RobotOutlined,
  HistoryOutlined,
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  GlobalOutlined,
  CloseOutlined,
  FileTextOutlined,
  BookOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  StarOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { Subscription, SubscriptionGroup, Article, AIModel, AppSettings, ThemeMode } from '../types';
import { PRESET_SUBSCRIPTIONS, DEFAULT_MODELS } from '../types';
import {
  getSubscriptions,
  saveSubscription,
  updateSubscription,
  deleteSubscription,
  getArticles,
  getModels,
  getSettings,
  saveSettings,
  getPushHistory,
  getReadLaterArticles,
  getGroups,
  updateGroup,
} from '../services/storage';
import GroupManager from '../components/GroupManager';
import { fetchFeed, fetchGitHubTrending } from '../services/feedParser';
import { summarizeWithFallback } from '../services/aiAdapter';
import { requestPermission } from '../services/notifications';
import { startScheduler, fetchAllSubscriptions, runScheduledPush } from '../services/scheduler';
import { sendSubscriptionEmail } from '../services/email';
import TransformBar from '../components/TransformBar';
import ImportExportPanel from '../components/ImportExportPanel';
import OfflineBanner from '../components/OfflineBanner';
import InstallPrompt from '../components/InstallPrompt';
import RealtimeStatus from '../components/RealtimeStatus';
import SummaryHistory from './SummaryHistory';
import ReadLater from './ReadLater';
import Recommendations from './Recommendations';
import NoteEditor from '../components/NoteEditor';
import SearchPage from './Search';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

type MenuKey = 'feeds' | 'articles' | 'models' | 'settings' | 'history' | 'summaries' | 'readlater' | 'recommendations' | 'search';

export default function App() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('feeds');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [groups, setGroups] = useState<SubscriptionGroup[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [pushHistory, setPushHistory] = useState<Awaited<ReturnType<typeof getPushHistory>>>([]);
  const [readLaterCount, setReadLaterCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set());
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [addForm] = Form.useForm();
  const [modelForm] = Form.useForm();
  const [summarizing, setSummarizing] = useState(false);
  const [summaryDrawerOpen, setSummaryDrawerOpen] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<{ content: string; keywords: string[]; articleLink: string } | null>(null);
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false);
  const [noteArticleId, setNoteArticleId] = useState<string | null>(null);
  const [noteArticleTitle, setNoteArticleTitle] = useState<string>('');

  const loadData = useCallback(async () => {
    const [subs, mods, sets, hist, gs] = await Promise.all([
      getSubscriptions(),
      getModels(),
      getSettings(),
      getPushHistory(),
      getGroups(),
    ]);
    const rlArts = await getReadLaterArticles();
    setReadLaterCount(rlArts.filter(a => a.isReadLater).length);
    setSubscriptions(subs);
    setModels(mods);
    setSettings(sets);
    setPushHistory(hist);
    setGroups(gs);
    if (subs.length === 0) {
      // Initialize with presets
      for (const preset of PRESET_SUBSCRIPTIONS) {
        await saveSubscription(preset as Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>);
      }
      const newSubs = await getSubscriptions();
      setSubscriptions(newSubs);
    }
    if (mods.length === 0) {
      for (const model of DEFAULT_MODELS) {
        await saveModel(model as Omit<AIModel, 'id' | 'createdAt'>);
      }
      const newMods = await getModels();
      setModels(newMods);
    }
    // Initialize collapsed group IDs from groups data
    setCollapsedGroupIds(new Set(gs.filter(g => g.collapsed).map(g => g.id)));
    startScheduler(30);
  }, []);

  useEffect(() => {
    loadData();
    requestPermission();
  }, [loadData]);

  useEffect(() => {
    if (activeMenu === 'articles') {
      getArticles(undefined, 100).then(setArticles);
    }
  }, [activeMenu]);

  const menuItems: MenuProps['items'] = [
    { key: 'feeds', icon: <GlobalOutlined />, label: '订阅源' },
    { key: 'articles', icon: <EyeOutlined />, label: '文章' },
    { key: 'models', icon: <RobotOutlined />, label: 'AI模型' },
    { key: 'settings', icon: <SettingOutlined />, label: '推送设置' },
    { key: 'history', icon: <HistoryOutlined />, label: '推送历史' },
    { key: 'summaries', icon: <FileTextOutlined />, label: '摘要历史' },
    { key: 'readlater', label: <span>稍后读 {readLaterCount > 0 ? <Badge count={readLaterCount} size="small" /> : null}</span>, icon: <BookOutlined /> },
    { key: 'recommendations', icon: <StarOutlined />, label: '推荐' },
    { key: 'search', icon: <SearchOutlined />, label: '搜索' },
  ];

  async function saveModel(model: Omit<AIModel, 'id' | 'createdAt'>) {
    const { saveModel: sm } = await import('../services/storage');
    return sm(model);
  }

  async function handleAddSubscription(values: Record<string, unknown>) {
    try {
      const sub = await saveSubscription({
        name: values.name as string,
        url: values.url as string,
        type: values.type as 'rss' | 'atom' | 'api',
        category: (values.category as string) || 'Custom',
        enabled: true,
        aiSummaryEnabled: true,
        fetchIntervalMinutes: Number(values.fetchIntervalMinutes) || 60,
        useCustomInterval: Boolean(values.useCustomInterval),
      });
      setSubscriptions((prev) => [...prev, sub]);
      setAddModalOpen(false);
      addForm.resetFields();
      message.success(`已添加订阅源: ${sub.name}`);
    } catch (err) {
      message.error('添加失败');
    }
  }

  async function handleEditSubscription(values: Record<string, unknown>) {
    if (!editSub) return;
    try {
      const updated = await updateSubscription({
        ...editSub,
        name: values.name as string,
        url: values.url as string,
        type: values.type as 'rss' | 'atom' | 'api',
        category: (values.category as string) || 'Custom',
        fetchIntervalMinutes: Number(values.fetchIntervalMinutes) || 60,
        useCustomInterval: Boolean(values.useCustomInterval),
      });
      setSubscriptions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditSub(null);
      message.success('已更新订阅源');
    } catch {
      message.error('更新失败');
    }
  }

  async function handleDeleteSubscription(id: string) {
    await deleteSubscription(id);
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    message.success('已删除订阅源');
  }

  async function handleToggleEnabled(sub: Subscription) {
    const updated = await updateSubscription({ ...sub, enabled: !sub.enabled });
    setSubscriptions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  async function handleRefreshAll() {
    setLoading(true);
    try {
      await fetchAllSubscriptions();
      await getArticles(undefined, 100).then(setArticles);
      message.success('抓取完成');
    } catch {
      message.error('抓取失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleSummarizeArticle(article: Article) {
    setSummarizing(true);
    try {
      const mods = await getModels();
      const sets = await getSettings();
      const result = await summarizeWithFallback(
        { title: article.title, content: article.content || '', description: article.description },
        mods,
        sets.summaryLength
      );
      if (result.success) {
        message.success(`摘要生成成功 (${result.tokensUsed} tokens)`);
        setCurrentSummary({
          content: result.summary,
          keywords: result.keywords,
          articleLink: article.link,
        });
        setSummaryDrawerOpen(true);
      } else {
        message.error(result.error || '摘要生成失败');
      }
    } finally {
      setSummarizing(false);
    }
  }

  async function handleToggleReadLater(article: Article) {
    const { updateArticle: ua } = await import('../services/storage');
    const updated = { 
      ...article, 
      isReadLater: !article.isReadLater,
      readLaterAt: !article.isReadLater ? new Date().toISOString() : undefined,
    };
    await ua(updated);
    setArticles(prev => prev.map(a => a.id === updated.id ? updated : a));
    setReadLaterCount(prev => updated.isReadLater ? prev + 1 : prev - 1);
    message.success(updated.isReadLater ? '已加入稍后读' : '已从稍后读移除');
  }

  function openNoteDrawer(articleId: string, articleTitle: string) {
    setNoteArticleId(articleId);
    setNoteArticleTitle(articleTitle);
    setNoteDrawerOpen(true);
  }

  async function handleSaveSettings(values: Record<string, unknown>) {
    if (!settings) return;
    const updated: AppSettings = {
      ...settings,
      push: {
        ...settings.push,
        enabled: Boolean(values.pushEnabled),
        time: values.pushTime as string,
        frequency: values.pushFrequency as 'hourly' | 'daily' | 'weekly',
        contentType: values.contentType as 'title_only' | 'title_summary' | 'title_full_summary',
        channel: values.pushChannel as 'notification' | 'email' | 'both',
        quietHoursEnabled: Boolean(values.quietHoursEnabled),
        quietHoursStart: values.quietHoursStart as string,
        quietHoursEnd: values.quietHoursEnd as string,
        maxDailyPush: Number(values.maxDailyPush) || 20,
      },
      email: {
        ...settings.email,
        enabled: Boolean(values.emailEnabled),
        smtpHost: values.smtpHost as string,
        smtpPort: Number(values.smtpPort) || 587,
        smtpUser: values.smtpUser as string,
        smtpPassword: values.smtpPassword as string,
        fromEmail: values.fromEmail as string,
        fromName: values.fromName as string,
      },
      summaryLength: values.summaryLength as 'short' | 'medium' | 'long',
      webhookUrl: values.webhookUrl as string,
      webhookHeaders: typeof values.webhookHeaders === 'string' 
        ? JSON.parse(values.webhookHeaders as string) 
        : (values.webhookHeaders as Record<string, string>),
      defaultFetchInterval: Number(values.defaultFetchInterval) || 60,
      schedulerEnabled: Boolean(values.schedulerEnabled),
      themeMode: values.themeMode as ThemeMode,
    };
    await saveSettings(updated);
    setSettings(updated);
    message.success('设置已保存');
  }

  async function handleManualPush() {
    setLoading(true);
    try {
      await runScheduledPush();
      message.success('推送已触发');
    } catch {
      message.error('推送失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleTestNotification() {
    const perm = await requestPermission();
    if (perm !== 'granted') {
      message.warning('请允许通知权限');
      return;
    }
    new Notification('AI订阅助手', { body: '通知测试成功！' });
    message.success('通知已发送');
  }

  async function handleTestEmail() {
    if (!settings?.email.fromEmail) {
      message.warning('请先配置发件人邮箱');
      return;
    }
    const sent = await sendSubscriptionEmail(
      settings.email.fromEmail,
      '测试订阅',
      3,
      [
        { title: '测试文章1', link: 'https://example.com/1', description: '测试描述1' },
        { title: '测试文章2', link: 'https://example.com/2', description: '测试描述2' },
        { title: '测试文章3', link: 'https://example.com/3', description: '测试描述3' },
      ],
      [
        { title: '测试文章1', summary: '这是AI生成的摘要内容，用于测试邮件发送功能是否正常工作。' },
        { title: '测试文章2', summary: '这是另一篇测试文章的AI摘要内容。' },
      ]
    );
    if (sent) {
      message.success('测试邮件已发送');
    } else {
      message.error('邮件发送失败');
    }
  }

  async function handleTestFeed(values: Record<string, unknown>) {
    setLoading(true);
    try {
      const url = values.url as string;
      if (url.includes('github.com/trending')) {
        const arts = await fetchGitHubTrending();
        message.success(`获取到 ${arts.length} 条 GitHub Trending 内容`);
      } else {
        const arts = await fetchFeed(url);
        message.success(`获取到 ${arts.length} 条内容`);
      }
    } catch (err) {
      message.error('抓取失败，请检查URL是否可访问');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleGroupCollapse(groupId: string) {
    const isCollapsed = collapsedGroupIds.has(groupId);
    const newCollapsed = new Set(collapsedGroupIds);
    if (isCollapsed) {
      newCollapsed.delete(groupId);
    } else {
      newCollapsed.add(groupId);
    }
    setCollapsedGroupIds(newCollapsed);
    // Persist to groups
    const group = groups.find(g => g.id === groupId);
    if (group) {
      await updateGroup({ ...group, collapsed: !isCollapsed });
    }
    const newGroups = await getGroups();
    setGroups(newGroups);
  }

  const renderFeeds = () => (
    <div>
      <InstallPrompt />
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => setAddModalOpen(true)}>添加订阅源</Button>
        <Button icon={<ReloadOutlined />} onClick={handleRefreshAll} loading={loading}>刷新全部</Button>
      </div>

      {/* Grouped subscriptions */}
      {groups.map((group) => {
        const groupSubs = subscriptions.filter(s => s.groupId === group.id);
        const isCollapsed = collapsedGroupIds.has(group.id);
        return (
          <div key={group.id} style={{ marginBottom: 8 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                background: '#f5f5f5',
                borderRadius: 6,
                cursor: 'pointer',
              }}
              onClick={() => handleToggleGroupCollapse(group.id)}
            >
              {isCollapsed ? <FolderOutlined /> : <FolderOpenOutlined />}
              <Text strong style={{ marginLeft: 8 }}>{group.name}</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>({groupSubs.length})</Text>
            </div>
            {!isCollapsed && (
              <List
                dataSource={groupSubs}
                renderItem={(sub) => (
                  <List.Item
                    actions={[
                      <Switch key="toggle" checked={sub.enabled} onChange={() => handleToggleEnabled(sub)} size="small" />,
                      <Select
                        key="group"
                        size="small"
                        placeholder="移动到分组"
                        allowClear
                        style={{ width: 120 }}
                        value={sub.groupId}
                        onChange={async (newGroupId) => {
                          await updateSubscription({ ...sub, groupId: newGroupId });
                          message.success(newGroupId ? '已移动到分组' : '已移出分组');
                          const [newSubs, newGroups] = await Promise.all([getSubscriptions(), getGroups()]);
                          setSubscriptions(newSubs);
                          setGroups(newGroups);
                        }}
                        options={[
                          { label: '未分组', value: undefined },
                          ...groups.map(g => ({ label: g.name, value: g.id })),
                        ]}
                      />,
                      <Tooltip key="edit" title="编辑"><Button icon={<EditOutlined />} size="small" onClick={() => { setEditSub(sub); modelForm.setFieldsValue(sub); }} /></Tooltip>,
                      <Popconfirm key="delete" title="确认删除？" onConfirm={() => handleDeleteSubscription(sub.id)}>
                        <Button icon={<DeleteOutlined />} size="small" danger />
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      title={<Space><Text strong={sub.enabled}>{sub.name}</Text><Tag>{sub.category}</Tag><Tag color="blue">{sub.type.toUpperCase()}</Tag></Space>}
                      description={<Text type="secondary" style={{ fontSize: 12 }}>{sub.url}</Text>}
                    />
                  </List.Item>
                )}
              />
            )}
          </div>
        );
      })}

      {/* Ungrouped subscriptions */}
      {(() => {
        const ungroupedSubs = subscriptions.filter(s => !s.groupId);
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', marginBottom: 8 }}>
              <FolderOutlined />
              <Text strong style={{ marginLeft: 8 }}>未分组</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>({ungroupedSubs.length})</Text>
            </div>
            <List
              dataSource={ungroupedSubs}
              renderItem={(sub) => (
                <List.Item
                  actions={[
                    <Switch key="toggle" checked={sub.enabled} onChange={() => handleToggleEnabled(sub)} size="small" />,
                    <Select
                      key="group"
                      size="small"
                      placeholder="移动到分组"
                      allowClear
                      style={{ width: 120 }}
                      value={sub.groupId}
                      onChange={async (newGroupId) => {
                        await updateSubscription({ ...sub, groupId: newGroupId });
                        message.success(newGroupId ? '已移动到分组' : '已移出分组');
                        const [newSubs, newGroups] = await Promise.all([getSubscriptions(), getGroups()]);
                        setSubscriptions(newSubs);
                        setGroups(newGroups);
                      }}
                      options={[
                        { label: '未分组', value: undefined },
                        ...groups.map(g => ({ label: g.name, value: g.id })),
                      ]}
                    />,
                    <Tooltip key="edit" title="编辑"><Button icon={<EditOutlined />} size="small" onClick={() => { setEditSub(sub); modelForm.setFieldsValue(sub); }} /></Tooltip>,
                    <Popconfirm key="delete" title="确认删除？" onConfirm={() => handleDeleteSubscription(sub.id)}>
                      <Button icon={<DeleteOutlined />} size="small" danger />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={<Space><Text strong={sub.enabled}>{sub.name}</Text><Tag>{sub.category}</Tag><Tag color="blue">{sub.type.toUpperCase()}</Tag></Space>}
                    description={<Text type="secondary" style={{ fontSize: 12 }}>{sub.url}</Text>}
                  />
                </List.Item>
              )}
              locale={{ emptyText: <Empty description="暂无订阅源" /> }}
            />
          </div>
        );
      })()}

      <Modal title="添加订阅源" open={addModalOpen} onCancel={() => { setAddModalOpen(false); addForm.resetFields(); }} footer={null}>
        <Form form={addForm} layout="vertical" onFinish={handleAddSubscription}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="例如：科技资讯" />
          </Form.Item>
          <Form.Item name="url" label="URL" rules={[{ required: true, type: 'url' }]}>
            <Input placeholder="https://example.com/feed.xml" />
          </Form.Item>
          <Form.Item name="type" label="类型" initialValue="rss">
            <Select options={[{ value: 'rss', label: 'RSS' }, { value: 'atom', label: 'Atom' }, { value: 'api', label: 'API' }]} />
          </Form.Item>
          <Form.Item name="category" label="分类" initialValue="Custom">
            <Input placeholder="例如：科技、AI、开发" />
          </Form.Item>
          <Form.Item label="刷新间隔">
            <Space direction="vertical">
              <Form.Item name="useCustomInterval" valuePropName="checked" noStyle>
                <Checkbox>使用自定义间隔</Checkbox>
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.useCustomInterval !== curr.useCustomInterval}>
                {({ getFieldValue }) =>
                  getFieldValue('useCustomInterval') ? (
                    <Form.Item name="fetchIntervalMinutes" initialValue={60}>
                      <Select style={{ width: 200 }}>
                        <Select.Option value={15}>15 分钟</Select.Option>
                        <Select.Option value={30}>30 分钟</Select.Option>
                        <Select.Option value={60}>1 小时</Select.Option>
                        <Select.Option value={120}>2 小时</Select.Option>
                        <Select.Option value={360}>6 小时</Select.Option>
                        <Select.Option value={720}>12 小时</Select.Option>
                        <Select.Option value={1440}>1 天</Select.Option>
                      </Select>
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
            </Space>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>保存</Button>
              <Button onClick={() => {
                const vals = addForm.getFieldsValue();
                if (vals.url) handleTestFeed(vals);
              }}>测试抓取</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="编辑订阅源" open={!!editSub} onCancel={() => { setEditSub(null); }} footer={null}>
        <Form form={modelForm} layout="vertical" onFinish={handleEditSubscription}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="url" label="URL" rules={[{ required: true, type: 'url' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select options={[{ value: 'rss', label: 'RSS' }, { value: 'atom', label: 'Atom' }, { value: 'api', label: 'API' }]} />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input />
          </Form.Item>
          <Form.Item label="刷新间隔">
            <Space direction="vertical">
              <Form.Item name="useCustomInterval" valuePropName="checked" noStyle>
                <Checkbox>使用自定义间隔</Checkbox>
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.useCustomInterval !== curr.useCustomInterval}>
                {({ getFieldValue }) =>
                  getFieldValue('useCustomInterval') ? (
                    <Form.Item name="fetchIntervalMinutes">
                      <Select style={{ width: 200 }}>
                        <Select.Option value={15}>15 分钟</Select.Option>
                        <Select.Option value={30}>30 分钟</Select.Option>
                        <Select.Option value={60}>1 小时</Select.Option>
                        <Select.Option value={120}>2 小时</Select.Option>
                        <Select.Option value={360}>6 小时</Select.Option>
                        <Select.Option value={720}>12 小时</Select.Option>
                        <Select.Option value={1440}>1 天</Select.Option>
                      </Select>
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
            </Space>
          </Form.Item>
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
        renderItem={(article) => (
          <List.Item
            actions={[
              <Button key="summarize" icon={<RobotOutlined />} size="small" loading={summarizing} onClick={() => handleSummarizeArticle(article)}>AI摘要</Button>,
              <Button key="note" icon={<EditOutlined />} size="small" onClick={() => openNoteDrawer(article.id, article.title)} />,
              <Button key="readlater" icon={article.isReadLater ? <BookOutlined /> : <BookOutlined />} size="small" onClick={() => handleToggleReadLater(article)} />,
              <Button key="open" icon={<EyeOutlined />} size="small" onClick={() => window.open(article.link, '_blank')} />,
            ]}
          >
            <List.Item.Meta
              title={<a href={article.link} target="_blank" rel="noopener noreferrer">{article.title}</a>}
              description={<Space direction="vertical" size={0}><Text type="secondary" style={{ fontSize: 12 }}>{article.description?.slice(0, 150)}</Text><Text type="secondary" style={{ fontSize: 11 }}>{new Date(article.pubDate).toLocaleString('zh-CN')}</Text></Space>}
            />
          </List.Item>
        )}
      />
    </div>
  );

  const renderModels = () => {
    const [addModelOpen, setAddModelOpen] = useState(false);

    async function handleSaveModel(values: Record<string, unknown>) {
      const model = await saveModel({
        name: values.name as string,
        provider: values.provider as AIModel['provider'],
        apiBaseUrl: values.apiBaseUrl as string,
        apiKey: values.apiKey as string,
        modelName: values.modelName as string,
        temperature: Number(values.temperature) || 0.3,
        maxTokens: Number(values.maxTokens) || 1000,
        isDefault: models.length === 0,
      });
      setModels((prev) => [...prev, model]);
      setAddModelOpen(false);
      modelForm.resetFields();
      message.success('模型已添加');
    }

    return (
      <div>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => setAddModelOpen(true)} style={{ marginBottom: 16 }}>添加模型</Button>
        <List
          dataSource={models}
          renderItem={(model) => (
            <List.Item>
              <List.Item.Meta
                title={<Space><Text strong>{model.name}</Text>{model.isDefault && <Tag color="green">默认</Tag>}<Tag>{model.provider}</Tag></Space>}
                description={<Space direction="vertical" size={0}><Text type="secondary" style={{ fontSize: 12 }}>模型: {model.modelName}</Text><Text type="secondary" style={{ fontSize: 12 }}>API: {model.apiBaseUrl}</Text><Text type="secondary" style={{ fontSize: 12 }}>Key: {model.apiKey ? '****' + model.apiKey.slice(-4) : '未配置'}</Text></Space>}
              />
            </List.Item>
          )}
        />

        <Modal title="添加AI模型" open={addModelOpen} onCancel={() => { setAddModelOpen(false); modelForm.resetFields(); }} footer={null}>
          <Form form={modelForm} layout="vertical" onFinish={handleSaveModel}>
            <Form.Item name="name" label="显示名称" rules={[{ required: true }]} initialValue="">
              <Input placeholder="例如：智谱 GLM-4" />
            </Form.Item>
            <Form.Item name="provider" label="提供商" rules={[{ required: true }]}>
              <Select options={[
                { value: 'minimax', label: 'MiniMax' },
                { value: 'xiaomi', label: '小米' },
                { value: 'zhipu', label: '智谱' },
                { value: 'claude', label: 'Claude' },
                { value: 'gemini', label: 'Gemini' },
                { value: 'openai', label: 'OpenAI兼容' },
              ]} />
            </Form.Item>
            <Form.Item name="apiBaseUrl" label="API Base URL" rules={[{ required: true }]}>
              <Input placeholder="https://api.example.com/v1" />
            </Form.Item>
            <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}>
              <Input.Password placeholder="sk-xxxxx" />
            </Form.Item>
            <Form.Item name="modelName" label="模型名称" rules={[{ required: true }]}>
              <Input placeholder="glm-4" />
            </Form.Item>
            <Form.Item name="temperature" label="Temperature" initialValue={0.3}>
              <Input type="number" min={0} max={1} step={0.1} />
            </Form.Item>
            <Form.Item name="maxTokens" label="最大Token数" initialValue={1000}>
              <Input type="number" min={100} />
            </Form.Item>
            <Form.Item><Button type="primary" htmlType="submit">保存并测试</Button></Form.Item>
          </Form>
        </Modal>
      </div>
    );
  };

  const renderSettings = () => {
    if (!settings) return <Spin />;
    return (
      <Form
        layout="vertical"
        initialValues={{
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
          webhookUrl: settings.webhookUrl || '',
          webhookHeaders: settings.webhookHeaders ? JSON.stringify(settings.webhookHeaders, null, 2) : '{}',
          defaultFetchInterval: settings.defaultFetchInterval || 60,
          schedulerEnabled: settings.schedulerEnabled !== false,
          themeMode: settings.themeMode || 'light',
        }}
        onFinish={handleSaveSettings}
      >
        <Card title="推送设置" size="small">
          <Form.Item name="pushEnabled" valuePropName="checked" label="启用推送">
            <Switch />
          </Form.Item>
          <Form.Item name="pushTime" label="每日推送时间">
            <Input type="time" />
          </Form.Item>
          <Form.Item name="pushFrequency" label="推送频率">
            <Select options={[
              { value: 'hourly', label: '每小时' },
              { value: 'daily', label: '每日' },
              { value: 'weekly', label: '每周' },
            ]} />
          </Form.Item>
          <Form.Item name="contentType" label="推送内容">
            <Select options={[
              { value: 'title_only', label: '仅标题' },
              { value: 'title_summary', label: '标题+摘要' },
              { value: 'title_full_summary', label: '标题+完整摘要' },
            ]} />
          </Form.Item>
          <Form.Item name="pushChannel" label="推送渠道">
            <Select options={[
              { value: 'notification', label: '通知栏' },
              { value: 'email', label: '邮件' },
              { value: 'webhook', label: 'Webhook' },
              { value: 'both', label: '全部' },
            ]} />
          </Form.Item>
          <Form.Item name="webhookUrl" label="Webhook URL">
            <Input placeholder="https://your-webhook-endpoint.com/push" />
          </Form.Item>
          <Form.Item name="webhookHeaders" label="Webhook Headers (JSON)">
            <Input.TextArea placeholder='{"Authorization": "Bearer xxx"}' rows={2} />
          </Form.Item>
          <Form.Item name="quietHoursEnabled" valuePropName="checked" label="免打扰时段">
            <Switch />
          </Form.Item>
          <Space>
            <Form.Item name="quietHoursStart"><Input type="time" placeholder="开始时间" /></Form.Item>
            <Form.Item name="quietHoursEnd"><Input type="time" placeholder="结束时间" /></Form.Item>
          </Space>
          <Form.Item name="maxDailyPush" label="每日最大推送条数">
            <Input type="number" min={1} max={100} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">保存设置</Button>
            <Button onClick={handleManualPush} loading={loading}>立即推送</Button>
            <Button onClick={handleTestNotification}>测试通知</Button>
            <Button onClick={handleTestEmail}>测试邮件</Button>
          </Space>
        </Card>

        <Card title="刷新设置" size="small" style={{ marginTop: 16 }}>
          <Form.Item name="schedulerEnabled" valuePropName="checked" label="启用定时刷新">
            <Switch />
          </Form.Item>
          <Form.Item name="themeMode" label="主题模式">
            <Select
              options={[
                { value: 'light', label: '浅色' },
                { value: 'dark', label: '深色' },
                { value: 'system', label: '跟随系统' },
              ]}
              onChange={(val) => {
                const isDark = val === 'dark' ||
                  (val === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
              }}
            />
          </Form.Item>
          <Form.Item name="defaultFetchInterval" label="全局刷新间隔">
            <Select options={[
              { value: 15, label: '15 分钟' },
              { value: 30, label: '30 分钟' },
              { value: 60, label: '1 小时' },
              { value: 120, label: '2 小时' },
              { value: 360, label: '6 小时' },
              { value: 720, label: '12 小时' },
              { value: 1440, label: '1 天' },
            ]} />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>影响所有未使用自定义间隔的订阅源</Text>
        </Card>

        <Card title="邮件设置" size="small" style={{ marginTop: 16 }}>
          <Form.Item name="emailEnabled" valuePropName="checked" label="启用邮件推送">
            <Switch />
          </Form.Item>
          <Form.Item name="smtpHost" label="SMTP服务器">
            <Input placeholder="smtp.gmail.com" />
          </Form.Item>
          <Form.Item name="smtpPort" label="SMTP端口">
            <Input type="number" defaultValue={587} />
          </Form.Item>
          <Form.Item name="smtpUser" label="用户名">
            <Input />
          </Form.Item>
          <Form.Item name="smtpPassword" label="密码/授权码">
            <Input.Password />
          </Form.Item>
          <Form.Item name="fromEmail" label="发件人邮箱">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="fromName" label="发件人名称">
            <Input />
          </Form.Item>
        </Card>

        <Card title="Cron 定时触发" size="small" style={{ marginTop: 16 }}>
          <Form.Item label="Cron 端点 URL">
            <Input.Password value={`${window.location.origin}/api/cron/notify?secret=YOUR_CRON_SECRET`} readOnly />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>将此 URL 配置到外部定时服务（如 GitHub Actions、Vercel Cron）即可触发定时抓取</Text>
        </Card>

        <Card title="摘要设置" size="small" style={{ marginTop: 16 }}>
          <Form.Item name="summaryLength" label="摘要长度">
            <Select options={[
              { value: 'short', label: '短（100字）' },
              { value: 'medium', label: '中（300字）' },
              { value: 'long', label: '长（500字）' },
            ]} />
          </Form.Item>
          <Button type="primary" htmlType="submit">保存</Button>
        </Card>

        <Card title="数据管理" size="small" style={{ marginTop: 16 }}>
          <ImportExportPanel />
        </Card>

        <GroupManager />
      </Form>
    );
  };

  const renderHistory = () => {
    const handleRetry = async (item: typeof pushHistory[0]) => {
      try {
        await runScheduledPush();
        message.success('重试推送已触发');
        const hist = await getPushHistory();
        setPushHistory(hist);
      } catch {
        message.error('重试失败');
      }
    };

    const getChannelIcon = (channel: string) => {
      switch (channel) {
        case 'notification': return '🔔';
        case 'email': return '📧';
        case 'webhook': return '🔗';
        case 'both': return '📦';
        default: return '📬';
      }
    };

    return (
      <List
        dataSource={pushHistory}
        locale={{ emptyText: <Empty description="暂无推送记录" /> }}
        renderItem={(item) => (
          <List.Item
            actions={[
              item.status === 'failure' && (
                <Button key="retry" size="small" onClick={() => handleRetry(item)}>重试</Button>
              ),
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Text>{getChannelIcon(item.pushChannel)}</Text>
                  <Text strong>{item.title}</Text>
                  <Tag color={item.status === 'success' ? 'green' : 'red'}>
                    {item.status === 'success' ? '✅ 成功' : '❌ 失败'}
                  </Tag>
                  <Tag>{item.pushChannel}</Tag>
                </Space>
              }
              description={
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(item.pushedAt).toLocaleString('zh-CN')}
                  </Text>
                  {item.errorMessage && (
                    <Text type="danger" style={{ fontSize: 11 }}>{item.errorMessage}</Text>
                  )}
                </Space>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>🤖 AI订阅聚合</Title>
        <span style={{ marginLeft: 12 }}><RealtimeStatus /></span>
        <OfflineBanner />
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <Input.Search
              placeholder="搜索..."
              prefix={<SearchOutlined />}
              onSearch={(value) => {
                if (value.trim()) {
                  setActiveMenu('search');
                  (window as any).__searchQuery = value;
                }
              }}
            />
          </div>
          <Menu mode="inline" selectedKeys={[activeMenu]} items={menuItems} onClick={({ key }) => setActiveMenu(key as MenuKey)} style={{ height: '100%' }} />
        </Sider>
        <Content style={{ padding: 24, minHeight: 280, overflow: 'auto' }}>
          {activeMenu === 'feeds' && renderFeeds()}
          {activeMenu === 'articles' && renderArticles()}
          {activeMenu === 'models' && renderModels()}
          {activeMenu === 'settings' && renderSettings()}
          {activeMenu === 'history' && renderHistory()}
          {activeMenu === 'summaries' && <SummaryHistory />}
          {activeMenu === 'readlater' && <ReadLater />}
          {activeMenu === 'recommendations' && <Recommendations />}
          {activeMenu === 'search' && <SearchPage />}
        </Content>
      </Layout>

      {/* Summary Transform Drawer */}
      <Drawer
        title="摘要内容变换"
        placement="right"
        width={600}
        open={summaryDrawerOpen}
        onClose={() => setSummaryDrawerOpen(false)}
        closeIcon={<CloseOutlined />}
        styles={{ body: { padding: 16 } }}
      >
        {currentSummary && (
          <TransformBar
            summary={currentSummary.content}
            keywords={currentSummary.keywords}
            originalArticleLink={currentSummary.articleLink}
          />
        )}
      </Drawer>

      {/* Note Editor Drawer */}
      <Drawer
        title="📝 笔记"
        placement="right"
        width={400}
        open={noteDrawerOpen}
        onClose={() => setNoteDrawerOpen(false)}
        closeIcon={<CloseOutlined />}
      >
        {noteArticleId && (
          <NoteEditor articleId={noteArticleId} articleTitle={noteArticleTitle} />
        )}
      </Drawer>
    </Layout>
  );
}
