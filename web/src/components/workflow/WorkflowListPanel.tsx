/**
 * Workflow List Panel Component
 * Displays workflow list with enable/disable toggle and management actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Switch,
  Button,
  Space,
  Popconfirm,
  message,
  Tag,
  Empty,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Workflow, WorkflowExecutionLog } from '../services/workflow/types';
import { WorkflowEngine } from '../services/workflow/engine';
import { formatCronDescription, getNextRunTime, parseCronExpression } from '../services/workflow/scheduler';
import { TRIGGER_LABELS, ACTION_LABELS } from '../services/workflow/types';

const { Text } = Typography;

interface WorkflowListPanelProps {
  onCreateNew?: () => void;
  onEditWorkflow?: (workflow: Workflow) => void;
}

export const WorkflowListPanel: React.FC<WorkflowListPanelProps> = ({
  onCreateNew,
  onEditWorkflow,
}) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Initialize engine and load workflows
  useEffect(() => {
    const init = async () => {
      try {
        const engine = WorkflowEngine.getInstance();
        await engine.initialize();
        setWorkflows(engine.getWorkflows());
        setInitialized(true);
      } catch (err) {
        console.error('[WorkflowListPanel] Failed to initialize:', err);
        message.error('初始化工作流引擎失败');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Reload workflows periodically
  useEffect(() => {
    if (!initialized) return;
    
    const interval = setInterval(() => {
      const engine = WorkflowEngine.getInstance();
      setWorkflows(engine.getWorkflows());
    }, 5000);
    
    return () => clearInterval(interval);
  }, [initialized]);

  const handleToggleEnabled = useCallback(async (workflow: Workflow, checked: boolean) => {
    try {
      const engine = WorkflowEngine.getInstance();
      await engine.toggleWorkflow(workflow.id, checked);
      setWorkflows(prev => prev.map(w => w.id === workflow.id ? { ...w, enabled: checked } : w));
      message.success(checked ? '工作流已启用' : '工作流已禁用');
    } catch (err) {
      message.error('更新失败');
    }
  }, []);

  const handleDelete = useCallback(async (workflow: Workflow) => {
    try {
      const engine = WorkflowEngine.getInstance();
      await engine.deleteWorkflow(workflow.id);
      setWorkflows(prev => prev.filter(w => w.id !== workflow.id));
      message.success('工作流已删除');
    } catch (err) {
      message.error('删除失败');
    }
  }, []);

  const handleManualTrigger = useCallback(async (workflow: Workflow) => {
    try {
      const engine = WorkflowEngine.getInstance();
      const result = await engine.triggerWorkflow(workflow.id, {
        articleId: '',
        title: '手动触发',
        description: `Manual trigger at ${new Date().toLocaleString()}`,
      });
      
      if (result.success) {
        message.success('工作流已执行');
      } else {
        message.error(`执行失败: ${result.error}`);
      }
    } catch (err) {
      message.error('执行失败');
    }
  }, []);

  const getTriggerDescription = (workflow: Workflow): string => {
    const trigger = workflow.triggers[0];
    if (!trigger) return '-';
    
    switch (trigger.type) {
      case 'article-matched':
        if (trigger.conditions?.keyword) {
          return `关键词: ${trigger.conditions.keyword}`;
        }
        if (trigger.conditions?.feedId) {
          return `订阅源: ${trigger.conditions.feedId}`;
        }
        return '文章入库';
      case 'scheduled':
        return formatCronDescription(trigger.cron || '');
      case 'webhook-received':
        return `端点: ${trigger.endpoint}`;
      case 'manual':
        return '手动触发';
      default:
        return TRIGGER_LABELS[trigger.type as keyof typeof TRIGGER_LABELS] || trigger.type;
    }
  };

  const getNextRunDisplay = (workflow: Workflow): React.ReactNode => {
    const trigger = workflow.triggers[0];
    if (trigger?.type !== 'scheduled' || !workflow.enabled) return '-';
    
    const nextRun = getNextRunTime(workflow.id);
    if (!nextRun) return '未安排';
    
    return (
      <Space size="small">
        <ClockCircleOutlined style={{ color: '#1890ff' }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          {nextRun.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </Space>
    );
  };

  const columns: ColumnsType<Workflow> = [
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
      title: '工作流名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong={record.enabled} style={{ color: record.enabled ? undefined : '#999' }}>
            {name}
          </Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '触发类型',
      key: 'trigger',
      width: 120,
      render: (_, record) => {
        const trigger = record.triggers[0];
        const colors: Record<string, string> = {
          'article-matched': 'blue',
          'scheduled': 'green',
          'webhook-received': 'purple',
          'manual': 'orange',
        };
        return (
          <Tag color={colors[trigger?.type] || 'default'}>
            {TRIGGER_LABELS[trigger?.type as keyof typeof TRIGGER_LABELS] || trigger?.type || 'unknown'}
          </Tag>
        );
      },
    },
    {
      title: '触发条件',
      key: 'triggerCondition',
      width: 180,
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {getTriggerDescription(record)}
        </Text>
      ),
    },
    {
      title: '下次执行',
      key: 'nextRun',
      width: 140,
      render: (_, record) => getNextRunDisplay(record),
    },
    {
      title: '动作',
      dataIndex: 'actions',
      key: 'actions',
      render: (actions: Workflow['actions']) => (
        <Space size={2} wrap>
          {actions.slice(0, 3).map((action, idx) => (
            <Tag key={idx} color="cyan" style={{ marginRight: 0 }}>
              {ACTION_LABELS[action.type]}
            </Tag>
          ))}
          {actions.length > 3 && (
            <Tag style={{ marginLeft: 0 }}>+{actions.length - 3}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="手动触发">
            <Button
              type="text"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleManualTrigger(record)}
              disabled={!record.enabled}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEditWorkflow?.(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除此工作流?"
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <Card
        title="高级工作流自动化"
        extra={
          <Space>
            <Button
              icon={<HistoryOutlined />}
              size="small"
              onClick={() => {
                // TODO: Open workflow logs panel
                message.info('日志功能开发中');
              }}
            >
              执行日志
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onCreateNew}
            >
              新建工作流
            </Button>
          </Space>
        }
        size="small"
      >
        {workflows.length === 0 ? (
          <Empty description="暂无工作流规则" style={{ padding: 40 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreateNew}>
              创建第一个工作流
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={workflows}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
            }}
            style={{ marginTop: 8 }}
          />
        )}
      </Card>

      {/* Workflow Statistics */}
      {workflows.length > 0 && (
        <Card size="small" style={{ marginTop: 16 }}>
          <Space size="large">
            <Text>
              <Text strong>{workflows.filter(w => w.enabled).length}</Text> 个启用
            </Text>
            <Text>
              <Text strong>{workflows.filter(w => !w.enabled).length}</Text> 个禁用
            </Text>
            <Text>
              <Text strong>{workflows.filter(w => w.triggers.some(t => t.type === 'scheduled')).length}</Text> 个定时任务
            </Text>
          </Space>
        </Card>
      )}
    </div>
  );
};