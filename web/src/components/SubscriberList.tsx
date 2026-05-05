/**
 * SubscriberList Component
 * Displays and manages email subscribers
 */

import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm, message, Card } from 'antd';
import { UserAddOutlined, DeleteOutlined, PauseCircleOutlined, PlayCircleOutlined, MailOutlined } from '@ant-design/icons';
import type { Subscriber, SubscriptionType, SubscriberStatus } from '../types/emailSubscription';
import * as emailService from '../services/emailService';

const { Option } = Select;

export const SubscriberList: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    setLoading(true);
    try {
      const subs = await emailService.getSubscribers();
      setSubscribers(subs);
    } catch (error) {
      message.error('加载订阅者失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSubscriber(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (subscriber: Subscriber) => {
    setEditingSubscriber(subscriber);
    form.setFieldsValue({
      email: subscriber.email,
      name: subscriber.name,
      subscriptionType: subscriber.subscriptionType,
      customTags: subscriber.customTags,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await emailService.permanentlyDeleteSubscriber(id);
      message.success('订阅者已删除');
      loadSubscribers();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleUnsubscribe = async (id: string) => {
    try {
      await emailService.removeSubscriber(id);
      message.success('订阅者已退订');
      loadSubscribers();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handlePause = async (id: string) => {
    try {
      await emailService.pauseSubscriber(id);
      message.success('订阅已暂停');
      loadSubscribers();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await emailService.resumeSubscriber(id);
      message.success('订阅已恢复');
      loadSubscribers();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleSubmit = async (values: { email: string; name?: string; subscriptionType: SubscriptionType; customTags?: string[] }) => {
    try {
      if (editingSubscriber) {
        await emailService.updateSubscriber(editingSubscriber.id, {
          name: values.name,
          subscriptionType: values.subscriptionType,
          customTags: values.customTags,
        });
        message.success('订阅者已更新');
      } else {
        await emailService.createSubscriber(
          values.email,
          values.name,
          values.subscriptionType,
          values.customTags
        );
        message.success('订阅者已添加');
      }
      setModalVisible(false);
      loadSubscribers();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const statusColors: Record<SubscriberStatus, string> = {
    active: 'green',
    paused: 'orange',
    unsubscribed: 'red',
  };

  const typeLabels: Record<SubscriptionType, string> = {
    daily: '每日精选',
    weekly: '每周精选',
    custom: '自定义标签',
  };

  const columns = [
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (email: string, record: Subscriber) => (
        <Space>
          <MailOutlined />
          <span>{email}</span>
          {record.name && <span style={{ color: '#999' }}>({record.name})</span>}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: SubscriberStatus) => (
        <Tag color={statusColors[status]}>
          {status === 'active' ? '活跃' : status === 'paused' ? '暂停' : '已退订'}
        </Tag>
      ),
    },
    {
      title: '订阅类型',
      dataIndex: 'subscriptionType',
      key: 'subscriptionType',
      render: (type: SubscriptionType, record: Subscriber) => (
        <span>
          {typeLabels[type]}
          {type === 'custom' && record.customTags && record.customTags.length > 0 && (
            <span style={{ color: '#999', marginLeft: 4 }}>
              [{record.customTags.join(', ')}]
            </span>
          )}
        </span>
      ),
    },
    {
      title: '订阅时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: number) => new Date(createdAt).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Subscriber) => (
        <Space size="small">
          {record.status === 'active' && (
            <>
              <Button 
                type="link" 
                size="small" 
                icon={<PauseCircleOutlined />}
                onClick={() => handlePause(record.id)}
              >
                暂停
              </Button>
              <Button 
                type="link" 
                size="small" 
                danger 
                icon={<DeleteOutlined />}
                onClick={() => handleUnsubscribe(record.id)}
              >
                退订
              </Button>
            </>
          )}
          {record.status === 'paused' && (
            <Button 
              type="link" 
              size="small" 
              icon={<PlayCircleOutlined />}
              onClick={() => handleResume(record.id)}
            >
              恢复
            </Button>
          )}
          {record.status !== 'unsubscribed' && (
            <Button 
              type="link" 
              size="small" 
              danger 
              onClick={() => handleDelete(record.id)}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card 
      title="订阅者列表" 
      size="small"
      extra={
        <Button type="primary" icon={<UserAddOutlined />} onClick={handleAdd}>
          添加订阅者
        </Button>
      }
    >
      <Table
        dataSource={subscribers}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="small"
      />

      <Modal
        title={editingSubscriber ? '编辑订阅者' : '添加订阅者'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            subscriptionType: 'daily',
          }}
        >
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱地址" disabled={!!editingSubscriber} />
          </Form.Item>

          <Form.Item label="名称" name="name">
            <Input placeholder="可选：订阅者名称" />
          </Form.Item>

          <Form.Item
            label="订阅类型"
            name="subscriptionType"
            rules={[{ required: true, message: '请选择订阅类型' }]}
          >
            <Select>
              <Option value="daily">每日精选</Option>
              <Option value="weekly">每周精选</Option>
              <Option value="custom">自定义标签</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="自定义标签"
            name="customTags"
            extra="多个标签用逗号分隔"
          >
            <Input placeholder="如: 科技,AI,前端" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingSubscriber ? '保存' : '添加'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SubscriberList;
