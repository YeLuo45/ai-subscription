/**
 * Settings Component
 * Settings panel with Tab interface including TagManager and Sync config
 */

import React, { useState, useEffect } from 'react';
import { Tabs, Card, Form, Input, InputNumber, Switch, Button, message, Divider, Space, Tag, Alert, Select, Empty } from 'antd';
import { SettingOutlined, GlobalOutlined, CloudSyncOutlined, DeleteOutlined, TranslationOutlined, ShareAltOutlined, MailOutlined, ApiOutlined, RocketOutlined, BgColorsOutlined } from '@ant-design/icons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '../i18n';
import { TagManager } from './TagManager';
import { WorkflowList } from './WorkflowList';
import { TranslationSettings } from './TranslationSettings';
import { PublicListEditor } from './PublicListEditor';
import { RSSGenerator } from './RSSGenerator';
import { SubscriberList } from './SubscriberList';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import { EmailSender } from './EmailSender';
import { DeveloperPanel } from './DeveloperPanel';
import { PersonalizationPanel } from './PersonalizationPanel';
import * as syncService from '../services/syncService';
import type { PublicList, FeedInfo } from '../types/publicList';
import * as publicListDB from '../db/publicListDB';

const { TabPane } = Tabs;

export const Settings: React.FC = () => {
  const { t } = useI18n();
  
  return (
    <div style={{ padding: 16 }}>
      <h2>{t('settings.title')}</h2>
      <Tabs defaultActiveKey="general">
        <TabPane tab={<span><SettingOutlined /> {t('settings.generalSettings')}</span>} key="general">
          <GeneralSettings />
        </TabPane>
        <TabPane tab={<span><GlobalOutlined /> {t('settings.tagsManagement')}</span>} key="tags">
          <TagManager />
        </TabPane>
        <TabPane tab={<span><TranslationOutlined /> {t('settings.translationSettings')}</span>} key="translation">
          <TranslationSettings />
        </TabPane>
        <TabPane tab={<span><CloudSyncOutlined /> {t('settings.syncSettings')}</span>} key="sync">
          <SyncSettings />
        </TabPane>
        <TabPane tab={<span><ShareAltOutlined /> {t('settings.publicLists')}</span>} key="public">
          <PublicListsSettings />
        </TabPane>
        <TabPane tab={<span><MailOutlined /> {t('settings.emailSubscription')}</span>} key="email">
          <EmailSubscriptionSettings />
        </TabPane>
        <TabPane tab={<span><ApiOutlined /> {t('settings.developer')}</span>} key="developer">
          <DeveloperPanel />
        </TabPane>
        <TabPane tab={<span><RocketOutlined /> {t('settings.workflow')}</span>} key="workflow">
          <WorkflowList />
        </TabPane>
        <TabPane tab={<span><BgColorsOutlined /> 个性化</span>} key="personalization">
          <PersonalizationPanel />
        </TabPane>
      </Tabs>
    </div>
  );
};

const GeneralSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [localModeEnabled, setLocalModeEnabled] = useState(false);
  const [localModelStatus, setLocalModelStatus] = useState<string>('');

  useEffect(() => {
    // Load current settings
    import('../services/storage').then(({ getSettings }) => {
      getSettings().then(settings => {
        setLocalModeEnabled(settings.localModeEnabled || false);
      });
    });

    // Check local model status
    import('../services/local-inference').then(({ initializeLocalInference, getHardware }) => {
      initializeLocalInference().then(() => {
        const hw = getHardware();
        if (hw) {
          setLocalModelStatus(`WebGPU: ${hw.webGPUAvailable ? '支持' : '不支持'}, 内存: ${hw.memoryGB.toFixed(1)}GB`);
        } else {
          setLocalModelStatus('检测中...');
        }
      });
    });
  }, []);

  const handleSave = async () => {
    const settings = await import('../services/storage').then(m => m.getSettings());
    await import('../services/storage').then(m => 
      m.saveSettings({ ...settings, localModeEnabled })
    );
    message.success('设置已保存');
  };

  return (
    <Card title="通用设置" size="small" style={{ maxWidth: 600 }}>
      <Form form={form} layout="vertical">
        <Form.Item label="API Key" name="apiKey">
          <Input.Password placeholder="输入 AI API Key" />
        </Form.Item>
        
        <Form.Item label="默认模型" name="defaultModel" initialValue="minimax/MiniMax-Text-01">
          <Input placeholder="如: minimax/MiniMax-Text-01" />
        </Form.Item>
        
        <Form.Item label="摘要长度" name="summaryLength" initialValue="medium">
          <Input.Group compact>
            <Form.Item name="summaryLength" noStyle initialValue="medium">
              <InputNumber style={{ width: 200 }} min="short" max="long" />
            </Form.Item>
          </Input.Group>
        </Form.Item>

        <Divider />

        <Form.Item 
          label="本地模式 (Local Mode)" 
          extra={
            <div style={{ fontSize: 12, color: '#666' }}>
              <div>启用后，摘要、标签生成、意图分类等轻量任务将使用本地 WebLLM 模型运行</div>
              <div style={{ marginTop: 4 }}>模型: Qwen2-0.5B (从 HuggingFace CDN 加载)</div>
              {localModelStatus && <div style={{ marginTop: 2 }}>状态: {localModelStatus}</div>}
            </div>
          }
        >
          <Switch 
            checked={localModeEnabled} 
            onChange={setLocalModeEnabled}
            checkedChildren="启用"
            unCheckedChildren="关闭"
          />
        </Form.Item>

        <Divider />

        <Form.Item>
          <Button type="primary" onClick={handleSave}>
            保存设置
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

const SyncSettings: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<{
    readwise: { connected: boolean; lastSync: Date | null };
    instapaper: { connected: boolean; lastSync: Date | null };
  } | null>(null);
  const [rwForm] = Form.useForm();
  const [ipForm] = Form.useForm();

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    const status = await syncService.getSyncStatus();
    setSyncStatus(status);
  };

  const handleSaveReadwise = async (values: { token: string }) => {
    try {
      await syncService.saveReadwiseConfig(values.token);
      message.success('Readwise 配置已保存');
      loadSyncStatus();
    } catch (err) {
      message.error('保存失败');
    }
  };

  const handleDisconnectReadwise = async () => {
    try {
      await syncService.disconnectService('readwise');
      message.success('Readwise 已断开连接');
      rwForm.resetFields();
      loadSyncStatus();
    } catch (err) {
      message.error('操作失败');
    }
  };

  const handleSaveInstapaper = async (values: { username: string; password: string }) => {
    try {
      await syncService.saveInstapaperConfig({
        username: values.username,
        password: values.password,
      });
      message.success('Instapaper 配置已保存');
      loadSyncStatus();
    } catch (err) {
      message.error('保存失败');
    }
  };

  const handleDisconnectInstapaper = async () => {
    try {
      await syncService.disconnectService('instapaper');
      message.success('Instapaper 已断开连接');
      ipForm.resetFields();
      loadSyncStatus();
    } catch (err) {
      message.error('操作失败');
    }
  };

  const formatLastSync = (date: Date | null): string => {
    if (!date) return '从未同步';
    return date.toLocaleString('zh-CN');
  };

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Readwise Section */}
      <Card 
        title="Readwise 同步" 
        size="small" 
        style={{ marginBottom: 16 }}
        extra={
          syncStatus?.readwise.connected ? (
            <Tag color="green">已连接</Tag>
          ) : (
            <Tag color="default">未连接</Tag>
          )
        }
      >
        {syncStatus?.readwise.connected && (
          <Alert
            message={`最后同步: ${formatLastSync(syncStatus.readwise.lastSync)}`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={rwForm}
          layout="vertical"
          onFinish={handleSaveReadwise}
          initialValues={{ token: '' }}
        >
          <Form.Item
            label="Readwise API Token"
            name="token"
            rules={[{ required: true, message: '请输入 API Token' }]}
          >
            <Input.Password placeholder="输入 Readwise API Token" />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit">
              保存配置
            </Button>
            {syncStatus?.readwise.connected && (
              <Button danger icon={<DeleteOutlined />} onClick={handleDisconnectReadwise}>
                断开连接
              </Button>
            )}
          </Space>
        </Form>

        <Divider />

        <div style={{ color: '#666', fontSize: 12 }}>
          <p>从 Readwise 获取 API Token: <a href="https://readwise.io/settings" target="_blank" rel="noopener noreferrer">https://readwise.io/settings</a></p>
        </div>
      </Card>

      {/* Instapaper Section */}
      <Card 
        title="Instapaper 同步" 
        size="small"
        extra={
          syncStatus?.instapaper.connected ? (
            <Tag color="green">已连接</Tag>
          ) : (
            <Tag color="default">未连接</Tag>
          )
        }
      >
        {syncStatus?.instapaper.connected && (
          <Alert
            message={`最后同步: ${formatLastSync(syncStatus.instapaper.lastSync)}`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={ipForm}
          layout="vertical"
          onFinish={handleSaveInstapaper}
          initialValues={{ username: '', password: '' }}
        >
          <Form.Item
            label="用户名 / 邮箱"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="Instapaper 用户名或邮箱" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="Instapaper 密码" />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit">
              保存配置
            </Button>
            {syncStatus?.instapaper.connected && (
              <Button danger icon={<DeleteOutlined />} onClick={handleDisconnectInstapaper}>
                断开连接
              </Button>
            )}
          </Space>
        </Form>

        <Divider />

        <div style={{ color: '#666', fontSize: 12 }}>
          <p>Instapaper 账户: <a href="https://www.instapaper.com" target="_blank" rel="noopener noreferrer">https://www.instapaper.com</a></p>
        </div>
      </Card>
    </div>
  );
};

const EmailSubscriptionSettings: React.FC = () => {
  return (
    <div style={{ maxWidth: 900 }}>
      <Tabs defaultActiveKey="subscribers" size="small">
        <Tabs.TabPane tab="订阅者管理" key="subscribers">
          <SubscriberList />
        </Tabs.TabPane>
        <Tabs.TabPane tab="模板编辑" key="templates">
          <EmailTemplateEditor />
        </Tabs.TabPane>
        <Tabs.TabPane tab="发送邮件" key="sender">
          <EmailSender />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

const PublicListsSettings: React.FC = () => {
  const [lists, setLists] = useState<PublicList[]>([]);
  const [selectedList, setSelectedList] = useState<PublicList | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'editor' | 'generator'>('editor');

  // Mock feeds for demo - in production these would come from actual feed data
  const availableFeeds: FeedInfo[] = [
    { id: 'feed1', title: '科技资讯', url: 'https://tech.example.com', description: '科技行业新闻' },
    { id: 'feed2', title: '前端开发', url: 'https://dev.example.com', description: '前端技术文章' },
    { id: 'feed3', title: '财经分析', url: 'https://finance.example.com', description: '金融市场分析' },
  ];

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      const allLists = await publicListDB.getAllPublicLists();
      setLists(allLists.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (err) {
      console.error('Failed to load public lists:', err);
    }
  };

  const handleSelectList = (list: PublicList) => {
    setSelectedList(list);
    setActiveSubTab('generator');
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <Tabs
        activeKey={activeSubTab}
        onChange={setActiveSubTab as (key: string) => void}
        size="small"
      >
        <Tabs.TabPane tab="列表管理" key="editor">
          <PublicListEditor
            availableFeeds={availableFeeds}
            onSelectList={handleSelectList}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="生成 RSS/Atom" key="generator" disabled={lists.length === 0}>
          {selectedList ? (
            <RSSGenerator list={selectedList} />
          ) : (
            <Card size="small">
              <Empty description="请先选择一个公开列表进行生成" />
            </Card>
          )}
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default Settings;
