/**
 * Settings Component
 * Settings panel with Tab interface including TagManager and Sync config
 */

import React, { useState, useEffect } from 'react';
import { Tabs, Card, Form, Input, InputNumber, Switch, Button, message, Divider, Space, Tag, Alert } from 'antd';
import { SettingOutlined, GlobalOutlined, CloudSyncOutlined, DeleteOutlined } from '@ant-design/icons';
import { TagManager } from './TagManager';
import * as syncService from '../services/syncService';

const { TabPane } = Tabs;

export const Settings: React.FC = () => {
  return (
    <div style={{ padding: 16 }}>
      <h2>设置</h2>
      <Tabs defaultActiveKey="general">
        <TabPane tab={<span><SettingOutlined /> 通用设置</span>} key="general">
          <GeneralSettings />
        </TabPane>
        <TabPane tab={<span><GlobalOutlined /> 标签管理</span>} key="tags">
          <TagManager />
        </TabPane>
        <TabPane tab={<span><CloudSyncOutlined /> 同步设置</span>} key="sync">
          <SyncSettings />
        </TabPane>
      </Tabs>
    </div>
  );
};

const GeneralSettings: React.FC = () => {
  const [form] = Form.useForm();

  const handleSave = () => {
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

export default Settings;
