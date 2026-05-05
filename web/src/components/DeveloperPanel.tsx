/**
 * Developer Panel Component
 * API Key management and developer documentation
 */

import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, message, Popconfirm, Typography, Divider, Alert } from 'antd';
import { KeyOutlined, DeleteOutlined, PlusOutlined, CopyOutlined, ApiOutlined, WarningOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as apiService from '../services/apiService';
import type { ApiKey, ApiLog } from '../db/apiDB';

const { Text, Paragraph } = Typography;

export const DeveloperPanel: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const keys = await apiService.getAllApiKeys();
      setApiKeys(keys);
      const apiLogs = await apiService.getApiLogs(undefined, 50);
      setLogs(apiLogs);
    } catch (err) {
      console.error('Failed to load API data:', err);
    }
  };

  const handleCreateKey = async (values: { name: string }) => {
    setLoading(true);
    try {
      const newKey = await apiService.createApiKey(values.name);
      message.success('API Key 创建成功');
      setApiKeys(prev => [newKey, ...prev]);
      setIsCreateModalOpen(false);
      createForm.resetFields();
    } catch (err) {
      message.error('创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await apiService.revokeApiKey(id);
      message.success('API Key 已撤销');
      setApiKeys(prev => prev.filter(k => k.id !== id));
    } catch (err) {
      message.error('撤销失败');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  const keyColumns: ColumnsType<ApiKey> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'API Key',
      dataIndex: 'key',
      key: 'key',
      render: (key: string) => (
        <Text code copyable={{ text: key, icon: [<CopyOutlined key="copy" />] }}>
          {key.slice(0, 12)}...{key.slice(-4)}
        </Text>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (ts: number) => new Date(ts).toLocaleString('zh-CN'),
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      render: (ts: number | null) => ts ? new Date(ts).toLocaleString('zh-CN') : '从未使用',
    },
    {
      title: '状态',
      dataIndex: 'revoked',
      key: 'revoked',
      render: (revoked: boolean) => revoked ? <Tag color="red">已撤销</Tag> : <Tag color="green">有效</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="确定要撤销此 API Key 吗？"
          description="撤销后使用此 Key 的请求将无法通过验证"
          onConfirm={() => handleRevokeKey(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button danger size="small" icon={<DeleteOutlined />}>
            撤销
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const logColumns: ColumnsType<ApiLog> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (ts: number) => new Date(ts).toLocaleString('zh-CN'),
    },
    {
      title: '端点',
      dataIndex: 'endpoint',
      key: 'endpoint',
      render: (ep: string) => <Text code>{ep}</Text>,
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      render: (m: string) => <Tag color={m === 'GET' ? 'blue' : 'green'}>{m}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'statusCode',
      key: 'statusCode',
      render: (code: number) => (
        <Tag color={code >= 200 && code < 300 ? 'green' : code >= 400 ? 'red' : 'orange'}>
          {code}
        </Tag>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      render: (ms: number) => `${ms}ms`,
    },
  ];

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* API Key Management Section */}
      <Card 
        title={
          <Space>
            <KeyOutlined />
            <span>API Key 管理</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)}>
            生成新 Key
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Alert
          message="API Key 用途"
          description="使用 API Key 可以通过 REST API 访问您的订阅源、文章和摘要数据。请妥善保管您的 Key，不要泄露给他人。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={keyColumns}
          dataSource={apiKeys}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: '暂无 API Key，点击上方按钮生成' }}
        />
      </Card>

      {/* API Documentation Section */}
      <Card title={<Space><ApiOutlined /><span>API 接口文档</span></Space>}>
        <Alert
          message="开发者须知"
          description="以下 API 仅在开发环境（npm run dev）下可用。生产环境需要部署独立的 API 服务器。"
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
        />

        <Paragraph>使用方式：在请求 Header 中添加 <Text code>Authorization: Bearer YOUR_API_KEY</Text></Paragraph>

        <Divider>接口列表</Divider>

        {/* GET /api/v1/feeds */}
        <Card size="small" style={{ marginBottom: 12 }} type="inner">
          <Space>
            <Tag color="blue">GET</Tag>
            <Text code>/api/v1/feeds</Text>
          </Space>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            获取所有订阅源列表
          </Paragraph>
          <CodeBlock>
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
     http://localhost:5173/api/v1/feeds`}
          </CodeBlock>
        </Card>

        {/* GET /api/v1/feeds/{feedId}/articles */}
        <Card size="small" style={{ marginBottom: 12 }} type="inner">
          <Space>
            <Tag color="blue">GET</Tag>
            <Text code>/api/v1/feeds/{'{feedId}'}/articles</Text>
          </Space>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            获取指定订阅源下的文章列表，支持分页参数：page, perPage
          </Paragraph>
          <CodeBlock>
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
     "http://localhost:5173/api/v1/feeds/feed1/articles?page=1&perPage=20"`}
          </CodeBlock>
        </Card>

        {/* GET /api/v1/articles/{articleId} */}
        <Card size="small" style={{ marginBottom: 12 }} type="inner">
          <Space>
            <Tag color="blue">GET</Tag>
            <Text code>/api/v1/articles/{'{articleId}'}</Text>
          </Space>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            获取文章详情，包含 AI 摘要
          </Paragraph>
          <CodeBlock>
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
     http://localhost:5173/api/v1/articles/art1`}
          </CodeBlock>
        </Card>

        {/* GET /api/v1/tags */}
        <Card size="small" style={{ marginBottom: 12 }} type="inner">
          <Space>
            <Tag color="blue">GET</Tag>
            <Text code>/api/v1/tags</Text>
          </Space>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            获取所有标签列表
          </Paragraph>
          <CodeBlock>
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
     http://localhost:5173/api/v1/tags`}
          </CodeBlock>
        </Card>

        {/* GET /api/v1/search */}
        <Card size="small" style={{ marginBottom: 12 }} type="inner">
          <Space>
            <Tag color="blue">GET</Tag>
            <Text code>/api/v1/search?q={'{query}'}</Text>
          </Space>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            搜索文章，支持参数：q (搜索关键词), page, perPage
          </Paragraph>
          <CodeBlock>
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
     "http://localhost:5173/api/v1/search?q=AI&page=1&perPage=20"`}
          </CodeBlock>
        </Card>

        <Divider>响应格式</Divider>

        <CodeBlock>
{`{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "perPage": 20
  }
}`}
        </CodeBlock>

        <Divider>错误响应</Divider>

        <CodeBlock>
{`{
  "success": false,
  "error": "Invalid API Key",
  "statusCode": 401
}`}
        </CodeBlock>
      </Card>

      {/* API Logs Section */}
      {logs.length > 0 && (
        <Card title="API 调用日志" style={{ marginTop: 16 }}>
          <Table
            columns={logColumns}
            dataSource={logs}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            scroll={{ x: 800 }}
          />
        </Card>
      )}

      {/* Create Key Modal */}
      <Modal
        title="生成新 API Key"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
      >
        <Form form={createForm} onFinish={handleCreateKey} layout="vertical">
          <Form.Item
            label="Key 名称"
            name="name"
            rules={[{ required: true, message: '请输入 Key 名称' }]}
          >
            <Input placeholder="例如：我的应用、测试Key" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                生成
              </Button>
              <Button onClick={() => setIsCreateModalOpen(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// Simple code block component
const CodeBlock: React.FC<{ children: string }> = ({ children }) => (
  <pre style={{ 
    background: '#f5f5f5', 
    padding: 12, 
    borderRadius: 4, 
    overflow: 'auto',
    fontSize: 12,
    margin: '8px 0'
  }}>
    <code>{children}</code>
  </pre>
);

export default DeveloperPanel;
