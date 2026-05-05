/**
 * TagManager Component
 * Tag management panel for Settings - rename/merge/delete/color
 */

import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Popconfirm, message, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, MergeOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Tag } from '../types/tag';
import { TAG_COLORS, TAG_TYPE_LABELS, createTag } from '../types/tag';
import * as tagService from '../services/tagService';
import { saveTag } from '../db/indexeddb';

export const TagManager: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [form] = Form.useForm();
  const [mergeForm] = Form.useForm();

  const loadTags = async () => {
    setLoading(true);
    try {
      const allTags = await tagService.getAllTags();
      setTags(allTags);
    } catch (err) {
      message.error('加载标签失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  const handleRename = async (tagId: string, newName: string) => {
    try {
      await tagService.renameTag(tagId, newName);
      message.success('重命名成功');
      loadTags();
    } catch {
      message.error('重命名失败');
    }
  };

  const handleColorChange = async (tagId: string, color: string) => {
    try {
      await tagService.updateTagColor(tagId, color);
      message.success('颜色更新成功');
      loadTags();
    } catch {
      message.error('颜色更新失败');
    }
  };

  const handleDelete = async (tagId: string) => {
    try {
      await tagService.deleteTagById(tagId);
      message.success('删除成功');
      loadTags();
    } catch {
      message.error('删除失败');
    }
  };

  const handleMerge = async (sourceId: string, targetId: string) => {
    try {
      await tagService.mergeTags(sourceId, targetId);
      message.success('合并成功');
      setMergeModalOpen(false);
      loadTags();
    } catch {
      message.error('合并失败');
    }
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    form.setFieldsValue({ name: tag.name, color: tag.color });
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingTag) {
        if (values.name !== editingTag.name) {
          await handleRename(editingTag.id, values.name);
        }
        if (values.color !== editingTag.color) {
          await handleColorChange(editingTag.id, values.color);
        }
      }
      setEditModalOpen(false);
      setEditingTag(null);
    } catch (err) {
      console.error(err);
    }
  };

  const columns: ColumnsType<Tag> = [
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      width: 80,
      render: (color: string, record: Tag) => (
        <Select
          value={color}
          onChange={(val) => handleColorChange(record.id, val)}
          style={{ width: 60 }}
          disabled={loading}
        >
          {TAG_COLORS.map(c => (
            <Select.Option key={c} value={c}>
              <div style={{
                width: 16,
                height: 16,
                borderRadius: 2,
                backgroundColor: c,
              }} />
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Tag) => (
        <span style={{ color: record.color, fontWeight: 500 }}>{name}</span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: Tag['type']) => TAG_TYPE_LABELS[type],
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Tag) => (
        <>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title="确定删除此标签？"
            description="删除后将取消所有关联"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3>标签管理</h3>
        <Button
          type="primary"
          icon={<MergeOutlined />}
          onClick={() => setMergeModalOpen(true)}
          disabled={tags.length < 2}
        >
          合并标签
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={tags}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
      />

      <Divider />

      <h4>快速添加标签</h4>
      <TagCreateForm onSuccess={loadTags} />

      {/* Edit Modal */}
      <Modal
        title="编辑标签"
        open={editModalOpen}
        onOk={handleEditSave}
        onCancel={() => setEditModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="标签名称"
            rules={[{ required: true, message: '请输入标签名称' }]}
          >
            <Input placeholder="请输入标签名称" maxLength={10} />
          </Form.Item>
          <Form.Item name="color" label="标签颜色">
            <Select>
              {TAG_COLORS.map(c => (
                <Select.Option key={c} value={c}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: 2,
                      backgroundColor: c,
                    }} />
                    <span>{c}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Merge Modal */}
      <Modal
        title="合并标签"
        open={mergeModalOpen}
        onCancel={() => setMergeModalOpen(false)}
        footer={null}
      >
        <p style={{ marginBottom: 16 }}>选择要合并的两个标签，源标签将被合并到目标标签中。</p>
        <Form
          form={mergeForm}
          layout="vertical"
          onFinish={async (values) => {
            await handleMerge(values.sourceTagId, values.targetTagId);
            mergeForm.resetFields();
          }}
        >
          <Form.Item
            name="sourceTagId"
            label="源标签（将被删除）"
            rules={[{ required: true, message: '请选择源标签' }]}
          >
            <Select placeholder="选择源标签">
              {tags.map(t => (
                <Select.Option key={t.id} value={t.id}>
                  <span style={{ color: t.color }}>{t.name}</span>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="targetTagId"
            label="目标标签（保留）"
            rules={[{ required: true, message: '请选择目标标签' }]}
          >
            <Select placeholder="选择目标标签">
              {tags.map(t => (
                <Select.Option key={t.id} value={t.id}>
                  <span style={{ color: t.color }}>{t.name}</span>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            确认合并
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

interface TagCreateFormProps {
  onSuccess: () => void;
}

const TagCreateForm: React.FC<TagCreateFormProps> = ({ onSuccess }) => {
  const [form] = Form.useForm();

  const handleSubmit = async (values: { name: string; color: string; type: Tag['type'] }) => {
    try {
      const tag = createTag(values);
      await saveTag(tag);
      message.success('标签创建成功');
      form.resetFields();
      onSuccess();
    } catch (err) {
      message.error('创建失败');
    }
  };

  return (
    <Form form={form} layout="inline" onFinish={handleSubmit}>
      <Form.Item name="name" rules={[{ required: true, message: '请输入名称' }]}>
        <Input placeholder="标签名称" style={{ width: 120 }} maxLength={10} />
      </Form.Item>
      <Form.Item name="type" initialValue="topic">
        <Select style={{ width: 80 }}>
          {Object.entries(TAG_TYPE_LABELS).map(([key, label]) => (
            <Select.Option key={key} value={key}>{label}</Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="color" initialValue={TAG_COLORS[0]}>
        <Select style={{ width: 80 }}>
          {TAG_COLORS.map(c => (
            <Select.Option key={c} value={c}>
              <div style={{ width: 16, height: 16, borderRadius: 2, backgroundColor: c }} />
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
          添加
        </Button>
      </Form.Item>
    </Form>
  );
};

export default TagManager;
