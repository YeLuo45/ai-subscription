/**
 * PublicListEditor Component
 * Create and edit public lists for RSS/Atom sharing
 */

import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, List, Checkbox, Space, Popconfirm, message, Empty, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { PublicList, FeedInfo } from '../types/publicList';
import { createPublicList } from '../types/publicList';
import * as publicListDB from '../db/publicListDB';

interface PublicListEditorProps {
  onSelectList?: (list: PublicList) => void;
  availableFeeds?: FeedInfo[];
}

export const PublicListEditor: React.FC<PublicListEditorProps> = ({
  onSelectList,
  availableFeeds = [],
}) => {
  const [lists, setLists] = useState<PublicList[]>([]);
  const [editingList, setEditingList] = useState<PublicList | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

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

  const handleCreate = async (values: { name: string; description: string; feedIds: string[] }) => {
    setLoading(true);
    try {
      const newList = createPublicList({
        name: values.name,
        description: values.description || '',
        feedIds: values.feedIds || [],
      });
      await publicListDB.savePublicList(newList);
      message.success('公开列表已创建');
      await loadLists();
      setEditingList(null);
      form.resetFields();
    } catch (err) {
      message.error('创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (values: { name: string; description: string; feedIds: string[] }) => {
    if (!editingList) return;
    setLoading(true);
    try {
      await publicListDB.updatePublicList(editingList.id, {
        name: values.name,
        description: values.description || '',
        feedIds: values.feedIds || [],
      });
      message.success('公开列表已更新');
      await loadLists();
      setEditingList(null);
      form.resetFields();
    } catch (err) {
      message.error('更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (listId: string) => {
    try {
      await publicListDB.deletePublicList(listId);
      message.success('已删除');
      await loadLists();
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleEdit = (list: PublicList) => {
    setEditingList(list);
    form.setFieldsValue({
      name: list.name,
      description: list.description,
      feedIds: list.feedIds,
    });
  };

  const handleCancel = () => {
    setEditingList(null);
    form.resetFields();
  };

  return (
    <div style={{ maxWidth: 800 }}>
      {/* List of existing public lists */}
      <Card 
        title="我的公开列表" 
        size="small" 
        style={{ marginBottom: 16 }}
        extra={
          !editingList && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setEditingList({} as PublicList)}
            >
              新建列表
            </Button>
          )
        }
      >
        {lists.length === 0 ? (
          <Empty description="暂无公开列表" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            size="small"
            dataSource={lists}
            renderItem={(list) => (
              <List.Item
                actions={[
                  <Button 
                    key="edit" 
                    type="link" 
                    icon={<EditOutlined />} 
                    onClick={() => handleEdit(list)}
                  >
                    编辑
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title="确认删除此列表？"
                    onConfirm={() => handleDelete(list.id)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <Button type="link" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={list.name}
                  description={
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <span>{list.description || '无描述'}</span>
                      <Space size="small">
                        <Tag>{list.feedIds.length} 个订阅源</Tag>
                        <span style={{ color: '#999', fontSize: 12 }}>
                          更新于 {new Date(list.updatedAt).toLocaleDateString('zh-CN')}
                        </span>
                      </Space>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* Create/Edit Form */}
      {(editingList !== null || form.getFieldValue('name')) && (
        <Card title={editingList?.id ? '编辑公开列表' : '新建公开列表'} size="small">
          <Form
            form={form}
            layout="vertical"
            onFinish={editingList?.id ? handleUpdate : handleCreate}
            initialValues={{
              name: '',
              description: '',
              feedIds: [],
            }}
          >
            <Form.Item
              label="列表名称"
              name="name"
              rules={[{ required: true, message: '请输入列表名称' }]}
            >
              <Input placeholder="如：科技资讯汇总" />
            </Form.Item>

            <Form.Item
              label="列表描述"
              name="description"
            >
              <Input.TextArea placeholder="描述此列表的用途（可选）" rows={2} />
            </Form.Item>

            <Form.Item
              label="选择订阅源"
              name="feedIds"
              extra="选择要包含在此公开列表中的订阅源"
            >
              <Checkbox.Group style={{ width: '100%' }}>
                {availableFeeds.length === 0 ? (
                  <Empty description="暂无可用订阅源，请先添加订阅源" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {availableFeeds.map((feed) => (
                      <div key={feed.id} style={{ marginBottom: 8 }}>
                        <Checkbox value={feed.id}>
                          <span style={{ fontWeight: 500 }}>{feed.title}</span>
                          {feed.description && (
                            <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>
                              {feed.description}
                            </span>
                          )}
                        </Checkbox>
                      </div>
                    ))}
                  </div>
                )}
              </Checkbox.Group>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {editingList?.id ? '保存修改' : '创建列表'}
                </Button>
                <Button onClick={handleCancel}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}
    </div>
  );
};

export default PublicListEditor;
