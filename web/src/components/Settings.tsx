/**
 * Settings Component
 * Settings panel with Tab interface including TagManager
 */

import React, { useState } from 'react';
import { Tabs, Card, Form, Input, InputNumber, Switch, Button, message, Divider } from 'antd';
import { SettingOutlined, GlobalOutlined } from '@ant-design/icons';
import { TagManager } from './TagManager';

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

export default Settings;
