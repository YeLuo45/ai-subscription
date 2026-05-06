/**
 * Workflow Logs Component
 * Drawer for viewing workflow execution logs
 */

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Table,
  Tag,
  Space,
  Button,
  Card,
  Empty,
  Spin,
  Popconfirm,
  message,
} from 'antd';
import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { WorkflowLogEntry } from '../types/workflow';
import { ACTION_LABELS } from '../types/workflow';
import * as workflowDB from '../db/workflowDB';

interface WorkflowLogsProps {
  open: boolean;
  onClose: () => void;
}

export const WorkflowLogs: React.FC<WorkflowLogsProps> = ({ open, onClose }) => {
  const [logs, setLogs] = useState<WorkflowLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const allLogs = await workflowDB.getAllLogs(100);
      setLogs(allLogs);
    } catch (err) {
      console.error('Failed to load workflow logs:', err);
      message.error('加载日志失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await workflowDB.clearLogs();
      setLogs([]);
      message.success('日志已清空');
    } catch (err) {
      message.error('清空失败');
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const columns: ColumnsType<WorkflowLogEntry> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (ts: number) => formatTime(ts),
    },
    {
      title: '规则',
      dataIndex: 'ruleName',
      key: 'ruleName',
      width: 150,
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: '文章',
      dataIndex: 'articleTitle',
      key: 'articleTitle',
      ellipsis: true,
      render: (title: string) => (
        <span style={{ color: '#666' }} title={title}>
          {title.length > 30 ? title.slice(0, 30) + '...' : title}
        </span>
      ),
    },
    {
      title: '动作',
      dataIndex: 'actionType',
      key: 'actionType',
      width: 120,
      render: (type: string) => {
        const label = ACTION_LABELS[type as keyof typeof ACTION_LABELS] || type;
        return <Tag color="blue">{label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      width: 80,
      render: (success: boolean) => (
        <Tag color={success ? 'green' : 'red'}>
          {success ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '错误信息',
      dataIndex: 'error',
      key: 'error',
      width: 150,
      render: (error?: string) => (
        <span style={{ color: error ? '#f5222d' : undefined, fontSize: 12 }}>
          {error || '-'}
        </span>
      ),
    },
  ];

  return (
    <Drawer
      title="工作流执行日志"
      placement="right"
      width={900}
      open={open}
      onClose={onClose}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadLogs} size="small">
            刷新
          </Button>
          <Popconfirm
            title="确定清空所有日志?"
            onConfirm={handleClearLogs}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<DeleteOutlined />} size="small" danger>
              清空
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      <Card size="small" bodyStyle={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : logs.length === 0 ? (
          <Empty description="暂无执行日志" style={{ padding: 40 }} />
        ) : (
          <Table
            columns={columns}
            dataSource={logs}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 20,
              showSizeChanger: false,
            }}
            scroll={{ y: 500 }}
          />
        )}
      </Card>
    </Drawer>
  );
};
