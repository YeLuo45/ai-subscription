/**
 * 订阅源管理页面
 */
import React, { useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space, Tag,
  Popconfirm, Card, Row, Col, message, Typography, Badge,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Subscription, PRESET_SUBSCRIPTIONS } from '../types';

const { Title } = Typography;

interface SubscriptionsPageProps {
  subscriptions: Subscription[];
  onAdd: (sub: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onFetch: (sub: Subscription) => Promise<void>;
  onFetchAll: () => void;
  loading: boolean;
}

export const SubscriptionsPage: React.FC<SubscriptionsPageProps> = ({
  subscriptions,
  onAdd,
  onDelete,
  onToggle,
  onFetch,
  onFetchAll,
  loading,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleAdd = () => {
    form.validateFields().then(values => {
      onAdd({
        name: values.name,
        url: values.url,
        type: values.type || 'rss',
        category: values.category || '未分类',
        enabled: true,
        aiSummaryEnabled: true,
        fetchIntervalMinutes: values.fetchIntervalMinutes || 60,
      });
      setIsModalOpen(false);
      form.resetFields();
    });
  };

  const handleAddPreset = (preset: typeof PRESET_SUBSCRIPTIONS[0]) => {
    const exists = subscriptions.find(s => s.url === preset.url);
    if (exists) {
      message.warning('该订阅源已存在');
      return;
    }
    onAdd({
      name: preset.name,
      url: preset.url,
      type: preset.type,
      category: preset.category,
      enabled: true,
      aiSummaryEnabled: true,
      fetchIntervalMinutes: 60,
    });
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Subscription) => (
        <Space>
          {name}
          {!record.enabled && <Tag color="default">已禁用</Tag>}
        </Space>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => <Tag color="blue">{t.toUpperCase()}</Tag>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: Subscription) => (
        <Space size="small">
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => onFetch(record)}
            loading={loading}
          >
            抓取
          </Button>
          <Button
            size="small"
            type="link"
            onClick={() => onToggle(record.id, !record.enabled)}
          >
            {record.enabled ? '禁用' : '启用'}
          </Button>
          <Popconfirm
            title="确定删除该订阅源？"
            onConfirm={() => onDelete(record.id)}
            okText="删除"
            cancelText="取消"
          >
            <Button size="small" danger type="link">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>订阅源管理</Title>
        <Space>
          <Button onClick={onFetchAll} loading={loading}>
            全部抓取
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            添加订阅源
          </Button>
        </Space>
      </div>

      {/* 预设订阅源 */}
      <Title level={5}>预设订阅源</Title>
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        {PRESET_SUBSCRIPTIONS.map((preset) => {
          const exists = subscriptions.some(s => s.url === preset.url);
          return (
            <Col key={preset.url} xs={24} sm={12} md={8} lg={6}>
              <Card size="small" hoverable={!exists}>
                <div style={{ fontWeight: 500 }}>{preset.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                  {preset.category} · {preset.type.toUpperCase()}
                </div>
                <Button
                  size="small"
                  type={exists ? 'default' : 'primary'}
                  disabled={exists}
                  onClick={() => handleAddPreset(preset)}
                >
                  {exists ? '已添加' : '添加'}
                </Button>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* 订阅源列表 */}
      <Title level={5}>我的订阅源 ({subscriptions.length})</Title>
      <Table
        dataSource={subscriptions}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: '暂无订阅源，请从上方预设列表添加' }}
      />

      {/* 添加订阅源弹窗 */}
      <Modal
        title="添加订阅源"
        open={isModalOpen}
        onOk={handleAdd}
        onCancel={() => setIsModalOpen(false)}
        okText="添加"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入订阅源名称' }]}
          >
            <Input placeholder="例如：我的科技博客" />
          </Form.Item>
          <Form.Item
            name="url"
            label="URL"
            rules={[
              { required: true, message: '请输入订阅源 URL' },
              { type: 'url', message: '请输入有效的 URL' },
            ]}
          >
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
          <Form.Item
            name="fetchIntervalMinutes"
            label="抓取间隔（分钟）"
            initialValue={60}
          >
            <Input type="number" min={5} max={1440} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
