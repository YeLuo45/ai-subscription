/**
 * 设置页面 - AI 模型配置 + 推送设置
 */
import React, { useState } from 'react';
import {
  Tabs, Table, Button, Space, Tag, Typography, Form, Input,
  Select, Switch, Divider, message, Modal, Alert,
} from 'antd';
import { PlusOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { AppSettings, ModelConfig } from '../types';

const { Title, Text } = Typography;

interface SettingsPageProps {
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  summarizer: {
    testModel: (m: ModelConfig) => Promise<{ success: boolean; message: string }>;
  };
}

const DEFAULT_MODEL_CONFIGS: Omit<ModelConfig, 'id' | 'isDefault'>[] = [
  {
    name: 'MiniMax M2.7',
    provider: 'minimax',
    apiBaseUrl: 'https://api.minimax.chat/v',
    apiKey: '',
    modelName: 'MiniMax-M2.7',
    temperature: 0.3,
    maxTokens: 1000,
  },
  {
    name: '小米 MiLM',
    provider: 'xiaomi',
    apiBaseUrl: 'https://account.platform.minimax.io',
    apiKey: '',
    modelName: 'MiLM',
    temperature: 0.3,
    maxTokens: 1000,
  },
  {
    name: '智谱 GLM-4',
    provider: 'zhipu',
    apiBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: '',
    modelName: 'glm-4',
    temperature: 0.3,
    maxTokens: 1000,
  },
  {
    name: 'Claude',
    provider: 'claude',
    apiBaseUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    modelName: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 1000,
  },
  {
    name: 'Gemini',
    provider: 'gemini',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    modelName: 'gemini-2.0-flash',
    temperature: 0.3,
    maxTokens: 1000,
  },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  summarizer,
}) => {
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [testLoading, setTestLoading] = useState<string | null>(null);

  // 模型列表
  const modelColumns = [
    {
      title: '模型',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ModelConfig) => (
        <Space>
          <Text strong>{name}</Text>
          {record.isDefault && <Tag color="blue">默认</Tag>}
          {!record.apiKey && <Tag color="orange">未配置</Tag>}
        </Space>
      ),
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      key: 'provider',
      render: (p: string) => <Tag>{p}</Tag>,
    },
    {
      title: 'API Key',
      dataIndex: 'apiKey',
      key: 'apiKey',
      render: (k: string) => k ? (
        <Text type="secondary">••••{k.slice(-4)}</Text>
      ) : (
        <Tag color="red">未配置</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      render: (_: unknown, record: ModelConfig) => (
        <Space size="small">
          <Button
            size="small"
            onClick={() => handleTest(record.id)}
            loading={testLoading === record.id}
          >
            测试
          </Button>
          <Button size="small" type="link" onClick={() => setEditingModel(record)}>
            编辑
          </Button>
          {!record.isDefault && (
            <Button
              size="small"
              type="link"
              onClick={() => handleSetDefault(record.id)}
            >
              设为默认
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleTest = async (modelId: string) => {
    const model = settings.models.find(m => m.id === modelId);
    if (!model || !model.apiKey) {
      message.error('请先配置 API Key');
      return;
    }
    setTestLoading(modelId);
    try {
      const result = await summarizer.testModel(model);
      if (result.success) {
        message.success(`${model.name} 连接成功！`);
      } else {
        message.error(`${model.name} 连接失败: ${result.message}`);
      }
    } finally {
      setTestLoading(null);
    }
  };

  const handleSetDefault = (modelId: string) => {
    const newModels = settings.models.map(m => ({
      ...m,
      isDefault: m.id === modelId,
    }));
    onUpdateSettings({ ...settings, models: newModels });
    message.success('已设为默认模型');
  };

  const handleAddModel = () => {
    const newId = `model-${Date.now()}`;
    const newModel: ModelConfig = {
      ...DEFAULT_MODEL_CONFIGS[0],
      id: newId,
      name: '新模型',
      isDefault: false,
    };
    onUpdateSettings({
      ...settings,
      models: [...settings.models, newModel],
    });
    setEditingModel(newModel);
  };

  const handleSaveModel = (model: ModelConfig) => {
    const newModels = settings.models.map(m => m.id === model.id ? model : m);
    onUpdateSettings({ ...settings, models: newModels });
    setEditingModel(null);
    message.success('模型配置已保存');
  };

  const handleDeleteModel = (modelId: string) => {
    const model = settings.models.find(m => m.id === modelId);
    if (model?.isDefault) {
      message.error('默认模型不可删除');
      return;
    }
    const newModels = settings.models.filter(m => m.id !== modelId);
    onUpdateSettings({ ...settings, models: newModels });
    message.success('模型已删除');
  };

  const handlePushSettingChange = (key: string, value: unknown) => {
    onUpdateSettings({
      ...settings,
      pushSettings: {
        ...settings.pushSettings,
        [key]: value,
      },
    });
  };

  return (
    <div>
      <Title level={4}>设置</Title>

      <Tabs
        items={[
          {
            key: 'models',
            label: '🤖 AI 模型配置',
            children: (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddModel}
                  >
                    添加模型
                  </Button>
                </div>

                <Table
                  dataSource={settings.models}
                  columns={modelColumns}
                  rowKey="id"
                  pagination={false}
                />

                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                  message={
                    <div>
                      <Text strong>模型优先级说明</Text>
                      <br />
                      系统按以下顺序尝试各模型：MiniMax → 小米 → 智谱 → Claude → Gemini
                      <br />
                      请确保至少配置一个模型的 API Key，否则无法生成 AI 摘要。
                    </div>
                  }
                />
              </div>
            ),
          },
          {
            key: 'push',
            label: '📬 推送设置',
            children: (
              <div>
                <Form layout="vertical">
                  <Form.Item label="启用推送">
                    <Switch
                      checked={settings.pushSettings.enabled}
                      onChange={(checked) => handlePushSettingChange('enabled', checked)}
                    />
                  </Form.Item>

                  <Form.Item label="推送时间">
                    <Input
                      type="time"
                      value={settings.pushSettings.pushTime}
                      onChange={(e) => handlePushSettingChange('pushTime', e.target.value)}
                      style={{ width: 150 }}
                    />
                  </Form.Item>

                  <Form.Item label="推送渠道">
                    <Select
                      value={settings.pushSettings.pushChannel}
                      onChange={(v) => handlePushSettingChange('pushChannel', v)}
                      style={{ width: 200 }}
                    >
                      <Select.Option value="notification">通知栏</Select.Option>
                      <Select.Option value="email">邮件</Select.Option>
                      <Select.Option value="both">两者都要</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="推送内容">
                    <Select
                      value={settings.pushSettings.contentType}
                      onChange={(v) => handlePushSettingChange('contentType', v)}
                      style={{ width: 250 }}
                    >
                      <Select.Option value="title_only">仅标题</Select.Option>
                      <Select.Option value="title_summary">标题 + AI 摘要</Select.Option>
                      <Select.Option value="title_full_summary">标题 + 完整摘要</Select.Option>
                    </Select>
                  </Form.Item>
                </Form>

                <Alert
                  type="warning"
                  showIcon
                  message="Web 端推送依赖浏览器通知权限，请在弹窗中允许通知。"
                  style={{ marginTop: 8 }}
                />
              </div>
            ),
          },
        ]}
      />

      {/* 编辑模型弹窗 */}
      <ModelEditModal
        model={editingModel}
        onSave={handleSaveModel}
        onDelete={handleDeleteModel}
        onClose={() => setEditingModel(null)}
      />
    </div>
  );
};

// ========== 模型编辑弹窗 ==========
interface ModelEditModalProps {
  model: ModelConfig | null;
  onSave: (m: ModelConfig) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const ModelEditModal: React.FC<ModelEditModalProps> = ({
  model,
  onSave,
  onDelete,
  onClose,
}) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (model) {
      form.setFieldsValue(model);
    }
  }, [model, form]);

  if (!model) return null;

  const handleOk = () => {
    form.validateFields().then(values => {
      onSave({ ...model, ...values });
    });
  };

  const providerOptions = [
    { value: 'minimax', label: 'MiniMax' },
    { value: 'xiaomi', label: '小米 (MiLM)' },
    { value: 'zhipu', label: '智谱 (GLM-4)' },
    { value: 'claude', label: 'Claude' },
    { value: 'gemini', label: 'Gemini' },
  ];

  return (
    <Modal
      title={`编辑模型 - ${model.name}`}
      open={!!model}
      onOk={handleOk}
      onCancel={onClose}
      width={520}
      footer={
        <Space>
          {!model.isDefault && (
            <Button danger onClick={() => { onDelete(model.id); onClose(); }}>
              删除
            </Button>
          )}
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleOk}>保存</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" initialValues={model}>
        <Form.Item name="name" label="显示名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="provider" label="提供商" rules={[{ required: true }]}>
          <Select options={providerOptions} />
        </Form.Item>
        <Form.Item name="apiBaseUrl" label="API Base URL" rules={[{ required: true }]}>
          <Input placeholder="https://api.example.com/v1" />
        </Form.Item>
        <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}>
          <Input.Password placeholder="sk-..." />
        </Form.Item>
        <Form.Item name="modelName" label="模型名称" rules={[{ required: true }]}>
          <Input placeholder="glm-4, claude-3-5-sonnet, etc." />
        </Form.Item>
        <Form.Item name="temperature" label="Temperature (0-1)">
          <Input type="number" min={0} max={1} step={0.1} />
        </Form.Item>
        <Form.Item name="maxTokens" label="最大 Token 数">
          <Input type="number" min={100} max={10000} step={100} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
