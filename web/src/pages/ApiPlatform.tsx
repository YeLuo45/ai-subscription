/**
 * API Platform Management Page
 * Third-party Integration + Webhook Event Subscription + Open API
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Tabs,
  Statistic,
  Row,
  Col,
  Typography,
  Tooltip,
  Popconfirm,
  Alert,
  Descriptions,
  Badge,
} from 'antd';
import {
  KeyOutlined,
  DeleteOutlined,
  PlusOutlined,
  ApiOutlined,
  WebhookOutlined,
  BarChartOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

// Types
interface ApiKey {
  id: string;
  name: string;
  role: 'developer' | 'admin';
  owner: string;
  permissions: string[];
  rateLimit: number;
  createdAt: string;
  lastUsedAt: string;
  isActive: boolean;
  keyPreview?: string;
}

interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  lastTriggeredAt: string;
  failureCount: number;
  secret?: string;
}

interface ApiStats {
  period: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  requestsPerMinute: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  activeApiKeys: number;
  activeWebhooks: number;
}

interface ApiUsageRecord {
  id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
}

// API Base URL
const API_BASE = '/api/platform';

// Available events for webhooks
const AVAILABLE_EVENTS = [
  { value: 'plugin.created', label: 'Plugin Created' },
  { value: 'plugin.updated', label: 'Plugin Updated' },
  { value: 'plugin.deleted', label: 'Plugin Deleted' },
  { value: 'review.submitted', label: 'Review Submitted' },
  { value: 'review.approved', label: 'Review Approved' },
  { value: 'review.rejected', label: 'Review Rejected' },
  { value: 'version.created', label: 'Version Created' },
  { value: 'download.incremented', label: 'Download Incremented' },
];

export const ApiPlatformPage: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [usageLog, setUsageLog] = useState<ApiUsageRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [editingWebhook, setEditingWebhook] = useState<WebhookSubscription | null>(null);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  // Form refs
  const [keyForm] = Form.useForm();
  const [webhookForm] = Form.useForm();

  // Fetch API Keys
  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/keys`);
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  }, []);

  // Fetch Webhooks
  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/webhooks`);
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    }
  }, []);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  // Fetch Usage Log
  const fetchUsageLog = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/usage?limit=100`);
      if (response.ok) {
        const data = await response.json();
        setUsageLog(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch usage log:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchApiKeys();
    fetchWebhooks();
    fetchStats();
  }, [fetchApiKeys, fetchWebhooks, fetchStats]);

  // Load usage when switching to that tab
  useEffect(() => {
    if (activeTab === 'usage') {
      fetchUsageLog();
    }
  }, [activeTab, fetchUsageLog]);

  // Create API Key
  const handleCreateKey = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const data = await response.json();
        setNewKeyValue(data.key); // Show the new key only once
        message.success('API Key created successfully');
        setShowKeyModal(false);
        keyForm.resetFields();
        fetchApiKeys();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to create API key');
      }
    } catch (error) {
      message.error('Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  // Update API Key
  const handleUpdateKey = async (values: any) => {
    if (!editingKey) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/keys/${editingKey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success('API Key updated successfully');
        setShowKeyModal(false);
        setEditingKey(null);
        keyForm.resetFields();
        fetchApiKeys();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to update API key');
      }
    } catch (error) {
      message.error('Failed to update API key');
    } finally {
      setLoading(false);
    }
  };

  // Delete API Key
  const handleDeleteKey = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/keys/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('API Key deleted successfully');
        fetchApiKeys();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to delete API key');
      }
    } catch (error) {
      message.error('Failed to delete API key');
    }
  };

  // Create Webhook
  const handleCreateWebhook = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const data = await response.json();
        setNewWebhookSecret(data.secret); // Show the secret only once
        message.success('Webhook subscription created successfully');
        setShowWebhookModal(false);
        webhookForm.resetFields();
        fetchWebhooks();
        fetchStats();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to create webhook');
      }
    } catch (error) {
      message.error('Failed to create webhook');
    } finally {
      setLoading(false);
    }
  };

  // Update Webhook
  const handleUpdateWebhook = async (values: any) => {
    if (!editingWebhook) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/webhooks/${editingWebhook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success('Webhook subscription updated successfully');
        setShowWebhookModal(false);
        setEditingWebhook(null);
        webhookForm.resetFields();
        fetchWebhooks();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to update webhook');
      }
    } catch (error) {
      message.error('Failed to update webhook');
    } finally {
      setLoading(false);
    }
  };

  // Delete Webhook
  const handleDeleteWebhook = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/webhooks/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('Webhook subscription deleted successfully');
        fetchWebhooks();
        fetchStats();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to delete webhook');
      }
    } catch (error) {
      message.error('Failed to delete webhook');
    }
  };

  // Test Webhook
  const handleTestWebhook = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/webhooks/${id}/test`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        message.success('Webhook test successful');
      } else {
        message.error(data.message || 'Webhook test failed');
      }
    } catch (error) {
      message.error('Failed to test webhook');
    }
  };

  // Open Edit Key Modal
  const openEditKeyModal = (key: ApiKey) => {
    setEditingKey(key);
    keyForm.setFieldsValue({
      name: key.name,
      permissions: key.permissions,
      rateLimit: key.rateLimit,
      isActive: key.isActive,
    });
    setShowKeyModal(true);
  };

  // Open Edit Webhook Modal
  const openEditWebhookModal = (webhook: WebhookSubscription) => {
    setEditingWebhook(webhook);
    webhookForm.setFieldsValue({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
    });
    setShowWebhookModal(true);
  };

  // Table columns for API Keys
  const keyColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ApiKey) => (
        <Space>
          <KeyOutlined />
          <Text strong>{name}</Text>
          <Tag color={record.role === 'admin' ? 'red' : 'blue'}>{record.role}</Tag>
        </Space>
      ),
    },
    {
      title: 'Key Preview',
      dataIndex: 'keyPreview',
      key: 'keyPreview',
      render: (key: string) => <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{key}</code>,
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
    },
    {
      title: 'Rate Limit',
      dataIndex: 'rateLimit',
      key: 'rateLimit',
      render: (limit: number) => `${limit}/min`,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => active ? <Badge status="success" text="Active" /> : <Badge status="default" text="Inactive" />,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ApiKey) => (
        <Space>
          <Button type="link" onClick={() => openEditKeyModal(record)}>Edit</Button>
          <Popconfirm
            title="Delete this API key?"
            onConfirm={() => handleDeleteKey(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Table columns for Webhooks
  const webhookColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <WebhookOutlined />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (url: string) => (
        <Tooltip title={url}>
          <Text type="secondary" style={{ maxWidth: 200 }} ellipsis>{url}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Events',
      dataIndex: 'events',
      key: 'events',
      render: (events: string[]) => (
        <Space wrap>
          {events.map(event => (
            <Tag key={event} color="blue">{event}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean, record: WebhookSubscription) => (
        <Space>
          {active ? <Badge status="success" text="Active" /> : <Badge status="error" text="Disabled" />}
          {record.failureCount > 0 && (
            <Tooltip title={`${record.failureCount} consecutive failures`}>
              <Tag color="red">{record.failureCount} failures</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Last Triggered',
      dataIndex: 'lastTriggeredAt',
      key: 'lastTriggeredAt',
      render: (date: string) => date ? new Date(date).toLocaleString() : 'Never',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: WebhookSubscription) => (
        <Space>
          <Button type="link" onClick={() => handleTestWebhook(record.id)} icon={<RocketOutlined />}>Test</Button>
          <Button type="link" onClick={() => openEditWebhookModal(record)}>Edit</Button>
          <Popconfirm
            title="Delete this webhook?"
            onConfirm={() => handleDeleteWebhook(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Usage log columns
  const usageColumns = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (date: string) => new Date(date).toLocaleString(),
      width: 180,
    },
    {
      title: 'Endpoint',
      dataIndex: 'endpoint',
      key: 'endpoint',
      render: (endpoint: string) => <code style={{ fontSize: 12 }}>{endpoint}</code>,
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => <Tag>{method}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'statusCode',
      key: 'statusCode',
      render: (code: number) => {
        if (code >= 200 && code < 300) return <Tag color="green">{code}</Tag>;
        if (code >= 400) return <Tag color="red">{code}</Tag>;
        return <Tag>{code}</Tag>;
      },
    },
    {
      title: 'Response Time',
      dataIndex: 'responseTime',
      key: 'responseTime',
      render: (time: number) => <Text type={time > 1000 ? 'danger' : undefined}>{time}ms</Text>,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        <ApiOutlined /> API Open Platform
      </Title>

      {/* New Key/Secret Alerts */}
      {newKeyValue && (
        <Alert
          type="success"
          message="API Key Created"
          description={
            <div>
              <Text>Please copy this key now. You won't be able to see it again:</Text>
              <pre style={{ background: '#f5f5f5', padding: 12, marginTop: 8, borderRadius: 4 }}>
                {newKeyValue}
              </pre>
              <Button size="small" onClick={() => setNewKeyValue(null)}>Dismiss</Button>
            </div>
          }
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setNewKeyValue(null)}
        />
      )}

      {newWebhookSecret && (
        <Alert
          type="success"
          message="Webhook Secret Created"
          description={
            <div>
              <Text>Please copy this secret now. You won't be able to see it again:</Text>
              <pre style={{ background: '#f5f5f5', padding: 12, marginTop: 8, borderRadius: 4 }}>
                {newWebhookSecret}
              </pre>
              <Button size="small" onClick={() => setNewWebhookSecret(null)}>Dismiss</Button>
            </div>
          }
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setNewWebhookSecret(null)}
        />
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab={<span><BarChartOutlined /> Overview</span>} key="overview">
          {/* Stats Cards */}
          {stats && (
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Total Requests (24h)"
                    value={stats.totalRequests}
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Success Rate"
                    value={stats.totalRequests > 0 
                      ? Math.round((stats.successfulRequests / stats.totalRequests) * 100) 
                      : 100}
                    suffix="%"
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Avg Response Time"
                    value={stats.avgResponseTime}
                    suffix="ms"
                    valueStyle={{ color: stats.avgResponseTime > 500 ? '#cf1322' : undefined }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Active Webhooks"
                    value={stats.activeWebhooks}
                    prefix={<WebhookOutlined />}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* Top Endpoints */}
          <Card title="Top Endpoints (24h)" style={{ marginBottom: 24 }}>
            {stats?.topEndpoints && stats.topEndpoints.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {stats.topEndpoints.map((ep, idx) => (
                  <li key={idx}>
                    <Space>
                      <Text code>{ep.endpoint}</Text>
                      <Tag>{ep.count} requests</Tag>
                    </Space>
                  </li>
                ))}
              </ul>
            ) : (
              <Text type="secondary">No API calls in the last 24 hours</Text>
            )}
          </Card>

          {/* Quick Links */}
          <Card title="Quick Links">
            <Space wrap>
              <Button icon={<KeyOutlined />} onClick={() => setActiveTab('keys')}>
                Manage API Keys
              </Button>
              <Button icon={<WebhookOutlined />} onClick={() => setActiveTab('webhooks')}>
                Manage Webhooks
              </Button>
              <Button icon={<BarChartOutlined />} onClick={() => setActiveTab('usage')}>
                View Usage Log
              </Button>
            </Space>
          </Card>
        </TabPane>

        <TabPane tab={<span><KeyOutlined /> API Keys</span>} key="keys">
          <Card
            title="API Keys"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                setEditingKey(null);
                keyForm.resetFields();
                setShowKeyModal(true);
              }}>
                Create API Key
              </Button>
            }
          >
            <Table
              dataSource={apiKeys}
              columns={keyColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab={<span><WebhookOutlined /> Webhooks</span>} key="webhooks">
          <Card
            title="Webhook Subscriptions"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                setEditingWebhook(null);
                webhookForm.resetFields();
                setShowWebhookModal(true);
              }}>
                Create Webhook
              </Button>
            }
          >
            <Alert
              message="Webhook Events"
              description={
                <div>
                  <Text type="secondary">Available events you can subscribe to:</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space wrap>
                      {AVAILABLE_EVENTS.map(event => (
                        <Tag key={event.value} color="blue">{event.label}</Tag>
                      ))}
                    </Space>
                  </div>
                </div>
              }
              style={{ marginBottom: 16 }}
            />
            <Table
              dataSource={webhooks}
              columns={webhookColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab={<span><BarChartOutlined /> Usage Log</span>} key="usage">
          <Card title="API Usage Log">
            <Table
              dataSource={usageLog}
              columns={usageColumns}
              rowKey="id"
              pagination={{ pageSize: 20 }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* API Key Modal */}
      <Modal
        title={editingKey ? 'Edit API Key' : 'Create API Key'}
        open={showKeyModal}
        onCancel={() => {
          setShowKeyModal(false);
          setEditingKey(null);
          keyForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={keyForm}
          layout="vertical"
          onFinish={editingKey ? handleUpdateKey : handleCreateKey}
        >
          <Form.Item
            name="name"
            label="Key Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="My API Key" />
          </Form.Item>

          {!editingKey && (
            <>
              <Form.Item
                name="role"
                label="Role"
                initialValue="developer"
                rules={[{ required: true }]}
              >
                <Select>
                  <Select.Option value="developer">Developer</Select.Option>
                  <Select.Option value="admin">Admin</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="owner"
                label="Owner"
                rules={[{ required: true, message: 'Please enter an owner' }]}
              >
                <Input placeholder="Owner name or ID" />
              </Form.Item>

              <Form.Item
                name="rateLimit"
                label="Rate Limit (requests/minute)"
                initialValue={100}
                rules={[{ required: true }]}
              >
                <Input type="number" min={1} max={10000} />
              </Form.Item>
            </>
          )}

          {editingKey && (
            <Form.Item name="isActive" valuePropName="checked" label="Active">
              <Switch />
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingKey ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => {
                setShowKeyModal(false);
                setEditingKey(null);
                keyForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Webhook Modal */}
      <Modal
        title={editingWebhook ? 'Edit Webhook' : 'Create Webhook Subscription'}
        open={showWebhookModal}
        onCancel={() => {
          setShowWebhookModal(false);
          setEditingWebhook(null);
          webhookForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={webhookForm}
          layout="vertical"
          onFinish={editingWebhook ? handleUpdateWebhook : handleCreateWebhook}
        >
          <Form.Item
            name="name"
            label="Webhook Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="My Webhook" />
          </Form.Item>

          {!editingWebhook && (
            <>
              <Form.Item
                name="url"
                label="Endpoint URL"
                rules={[
                  { required: true, message: 'Please enter a URL' },
                  { type: 'url', message: 'Please enter a valid URL' },
                ]}
              >
                <Input placeholder="https://your-server.com/webhook" />
              </Form.Item>

              <Form.Item
                name="events"
                label="Events to Subscribe"
                rules={[{ required: true, message: 'Please select at least one event' }]}
              >
                <Select mode="multiple" placeholder="Select events">
                  {AVAILABLE_EVENTS.map(event => (
                    <Select.Option key={event.value} value={event.value}>
                      {event.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          )}

          {editingWebhook && (
            <Form.Item name="isActive" valuePropName="checked" label="Active">
              <Switch />
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingWebhook ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => {
                setShowWebhookModal(false);
                setEditingWebhook(null);
                webhookForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ApiPlatformPage;