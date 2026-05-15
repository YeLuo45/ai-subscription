// Schedule History - displays execution history of scheduled jobs
import React, { useState, useEffect, useCallback } from 'react';
import { Card, List, Tag, Space, Typography, Select, Spin, Empty, Button, Tooltip } from 'antd';
import { 
  HistoryOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  MinusCircleOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { getScheduleHistory, deleteOldRecords } from '../services/scheduler/schedule-history';
import type { ScheduleRecord } from '../services/scheduler/types';

const { Text, Paragraph } = Typography;

const STATUS_CONFIG: Record<ScheduleRecord['status'], { color: string; icon: React.ReactNode; label: string }> = {
  success: { color: 'green', icon: <CheckCircleOutlined />, label: 'Success' },
  failed: { color: 'red', icon: <CloseCircleOutlined />, label: 'Failed' },
  skipped: { color: 'orange', icon: <MinusCircleOutlined />, label: 'Skipped' },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ScheduleHistory: React.FC<Props> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ScheduleRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<ScheduleRecord['status'] | 'all'>('all');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const history = await getScheduleHistory(100, statusFilter === 'all' ? undefined : statusFilter);
      setRecords(history);
    } catch (error) {
      console.error('[ScheduleHistory] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  const handleCleanup = async () => {
    try {
      await deleteOldRecords();
      loadHistory();
    } catch (error) {
      console.error('[ScheduleHistory] Cleanup failed:', error);
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderRecord = (record: ScheduleRecord) => {
    const config = STATUS_CONFIG[record.status];
    
    return (
      <List.Item
        key={record.id}
        style={{ padding: '12px 0' }}
        actions={[
          <Tooltip title={`Duration: ${formatDuration(record.durationMs)}`}>
            <ClockCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        ]}
      >
        <List.Item.Meta
          avatar={
            <Space style={{ fontSize: 18 }}>
              {config.icon}
            </Space>
          }
          title={
            <Space>
              <Text code style={{ fontSize: 11 }}>{record.jobId}</Text>
              <Tag color={config.color}>{config.label}</Tag>
              {record.articlesProcessed > 0 && (
                <Text type="secondary">
                  {record.articlesProcessed} articles · {record.tokensUsed.toLocaleString()} tokens
                </Text>
              )}
            </Space>
          }
          description={
            <Space direction="vertical" size={0}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatDate(record.executedAt)}
              </Text>
              {record.error && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  {record.error}
                </Text>
              )}
            </Space>
          }
        />
      </List.Item>
    );
  };

  return (
    <div style={{ padding: 16 }}>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <HistoryOutlined />
          <Text strong>Schedule History</Text>
        </Space>
        <Space>
          <Select
            size="small"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'success', label: 'Success' },
              { value: 'failed', label: 'Failed' },
              { value: 'skipped', label: 'Skipped' },
            ]}
            style={{ width: 100 }}
          />
          <Button 
            size="small" 
            icon={<DeleteOutlined />}
            onClick={handleCleanup}
          >
            Cleanup
          </Button>
        </Space>
      </Space>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : records.length === 0 ? (
        <Empty description="No schedule history yet" />
      ) : (
        <List
          size="small"
          dataSource={records}
          renderItem={renderRecord}
        />
      )}
    </div>
  );
};

export default ScheduleHistory;
