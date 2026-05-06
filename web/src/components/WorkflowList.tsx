/**
 * Workflow List Component
 * Displays all workflow rules with enable/disable toggle and edit/delete actions
 */

import React, { useState, useEffect } from 'react';
import {
  Table,
  Switch,
  Button,
  Space,
  Popconfirm,
  message,
  Tag,
  Card,
  Empty,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { WorkflowRule } from '../types/workflow';
import { TRIGGER_LABELS, ACTION_LABELS } from '../types/workflow';
import * as workflowDB from '../db/workflowDB';
import { WorkflowEditor } from './WorkflowEditor';
import { WorkflowLogs } from './WorkflowLogs';

export const WorkflowList: React.FC = () => {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const allRules = await workflowDB.getAllRules();
      setRules(allRules);
    } catch (err) {
      console.error('Failed to load workflow rules:', err);
      message.error('加载规则失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (rule: WorkflowRule, checked: boolean) => {
    try {
      await workflowDB.updateRule({ ...rule, enabled: checked });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: checked } : r));
      message.success(checked ? '规则已启用' : '规则已禁用');
    } catch (err) {
      message.error('更新失败');
    }
  };

  const handleEdit = (rule: WorkflowRule) => {
    setEditingRule(rule);
    setEditorOpen(true);
  };

  const handleDelete = async (rule: WorkflowRule) => {
    try {
      await workflowDB.deleteRule(rule.id);
      setRules(prev => prev.filter(r => r.id !== rule.id));
      message.success('规则已删除');
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleSave = async (rule: Omit<WorkflowRule, 'id' | 'createdAt'> | WorkflowRule) => {
    try {
      if ('id' in rule && rule.id) {
        // Update existing rule
        await workflowDB.updateRule(rule);
        setRules(prev => prev.map(r => r.id === rule.id ? rule : r));
        message.success('规则已更新');
      } else {
        // Create new rule
        const saved = await workflowDB.saveRule(rule);
        setRules(prev => [saved, ...prev]);
        message.success('规则已创建');
      }
      setEditorOpen(false);
      setEditingRule(null);
    } catch (err) {
      message.error('保存失败');
    }
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setEditingRule(null);
  };

  const columns: ColumnsType<WorkflowRule> = [
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean, record) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleEnabled(record, checked)}
          size="small"
        />
      ),
    },
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <span style={{ fontWeight: record.enabled ? 500 : 400, color: record.enabled ? undefined : '#999' }}>
          {name}
        </span>
      ),
    },
    {
      title: '触发类型',
      dataIndex: ['trigger', 'type'],
      key: 'triggerType',
      width: 150,
      render: (type: WorkflowRule['trigger']['type']) => {
        const colors: Record<string, string> = {
          article_added: 'blue',
          keyword_detected: 'green',
          sentiment_match: 'purple',
          source_match: 'orange',
        };
        return <Tag color={colors[type] || 'default'}>{TRIGGER_LABELS[type]}</Tag>;
      },
    },
    {
      title: '触发条件',
      key: 'triggerCondition',
      width: 200,
      render: (_, record) => {
        const { trigger } = record;
        switch (trigger.type) {
          case 'keyword_detected':
            return trigger.keywords?.join(', ') || '-';
          case 'sentiment_match':
            return trigger.sentiment?.join(', ') || '-';
          case 'source_match':
            return trigger.sources?.join(', ') || '-';
          default:
            return '-';
        }
      },
    },
    {
      title: '动作',
      dataIndex: 'actions',
      key: 'actions',
      render: (actions: WorkflowRule['actions']) => (
        <Space size={4} wrap>
          {actions.map((action, idx) => (
            <Tag key={idx} color="cyan" style={{ marginRight: 4 }}>
              {ACTION_LABELS[action.type]}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确定删除此规则?"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Card
        title="自动化工作流"
        extra={
          <Space>
            <Button
              icon={<HistoryOutlined />}
              size="small"
              onClick={() => setLogsOpen(true)}
            >
              执行日志
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingRule(null);
                setEditorOpen(true);
              }}
            >
              新建规则
            </Button>
          </Space>
        }
        size="small"
      >
        {rules.length === 0 && !loading ? (
          <Empty description="暂无工作流规则" style={{ padding: 40 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditorOpen(true)}>
              创建第一条规则
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={rules}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={false}
            style={{ marginTop: 8 }}
          />
        )}
      </Card>

      <WorkflowEditor
        open={editorOpen}
        rule={editingRule}
        onClose={handleCloseEditor}
        onSave={handleSave}
      />

      <WorkflowLogs
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
      />
    </div>
  );
};
