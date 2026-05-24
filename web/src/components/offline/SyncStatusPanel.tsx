/**
 * Sync Status Panel Component
 * Shows sync status, history, and provides manual sync controls
 */

import { useState, useEffect, useCallback } from 'react';
import { SyncOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Button, Card, List, Space, Tag, Typography, Empty, Tooltip } from 'antd';
import { getIncrementalSync } from '../../services/sync/incremental-sync';
import { getSyncQueue, type SyncOperation } from '../../services/sync/sync-queue';
import { isOnline } from '../../services/offline';

const { Text, Title } = Typography;

interface SyncHistoryItem {
  id: string;
  timestamp: number;
  type: 'success' | 'failed' | 'pending';
  message: string;
}

/**
 * SyncStatusPanel shows detailed sync status and history
 */
export function SyncStatusPanel() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [pendingOps, setPendingOps] = useState<SyncOperation[]>([]);
  const [history, setHistory] = useState<SyncHistoryItem[]>([]);

  const loadStatus = useCallback(async () => {
    const sync = getIncrementalSync();
    const status = await sync.getStatus();
    setLastSync(status.lastSync);
    setIsSyncing(status.isSyncing);

    const queue = getSyncQueue();
    const pending = await queue.getPending();
    setPendingOps(pending);
  }, []);

  useEffect(() => {
    loadStatus();

    const interval = setInterval(loadStatus, 3000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const handleManualSync = async () => {
    if (!isOnline()) {
      return;
    }

    setIsSyncing(true);
    try {
      const sync = getIncrementalSync();
      const result = await sync.sync();

      // Add to history
      const historyItem: SyncHistoryItem = {
        id: `sync_${Date.now()}`,
        timestamp: Date.now(),
        type: result.success ? 'success' : 'failed',
        message: result.success
          ? `成功同步 ${result.pushed} 个推送，${result.pulled} 个拉取`
          : `同步失败: ${result.errors.join(', ')}`,
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 50));

      await loadStatus();
    } catch (error) {
      console.error('[SyncStatusPanel] Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (type: SyncHistoryItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    }
  };

  const getStatusTag = (op: SyncOperation) => {
    const colors: Record<string, string> = {
      create: 'blue',
      update: 'green',
      delete: 'red',
    };
    return <Tag color={colors[op.operation] || 'default'}>{op.operation}</Tag>;
  };

  return (
    <Card
      title={
        <Space>
          <SyncOutlined />
          <span>同步状态</span>
        </Space>
      }
      extra={
        <Tooltip title={!isOnline() ? '离线状态无法同步' : isSyncing ? '同步中...' : '手动同步'}>
          <Button
            type="primary"
            icon={<SyncOutlined spin={isSyncing} />}
            onClick={handleManualSync}
            disabled={!isOnline() || isSyncing}
            loading={isSyncing}
          >
            手动同步
          </Button>
        </Tooltip>
      }
      style={{ width: '100%', maxWidth: 500 }}
    >
      {/* Status Summary */}
      <div style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">网络状态:</Text>
            <Tag color={isOnline() ? 'green' : 'red'}>
              {isOnline() ? '在线' : '离线'}
            </Tag>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">上次同步:</Text>
            <Text>{lastSync ? formatTime(lastSync) : '从未同步'}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">待同步操作:</Text>
            <Text strong type={pendingOps.length > 0 ? 'warning' : undefined}>
              {pendingOps.length}
            </Text>
          </div>
        </Space>
      </div>

      {/* Pending Operations */}
      {pendingOps.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Title level={5} style={{ marginBottom: 8 }}>待同步操作</Title>
          <List
            size="small"
            dataSource={pendingOps.slice(0, 10)}
            locale={{ emptyText: '无待同步操作' }}
            renderItem={(op) => (
              <List.Item style={{ padding: '8px 0' }}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      {getStatusTag(op)}
                      <Text type="secondary">{op.entityType}</Text>
                      <Text code style={{ fontSize: 12 }}>{op.entityId.slice(0, 8)}...</Text>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatTime(op.timestamp)}
                    </Text>
                  </div>
                  {op.lastError && (
                    <Text type="danger" style={{ fontSize: 12 }}>
                      {op.lastError}
                    </Text>
                  )}
                </Space>
              </List.Item>
            )}
          />
        </div>
      )}

      {/* Sync History */}
      <div>
        <Title level={5} style={{ marginBottom: 8 }}>同步历史</Title>
        {history.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无同步历史" />
        ) : (
          <List
            size="small"
            dataSource={history}
            locale={{ emptyText: '暂无同步历史' }}
            renderItem={(item) => (
              <List.Item style={{ padding: '8px 0' }}>
                <Space>
                  {getStatusIcon(item.type)}
                  <Text style={{ fontSize: 13 }}>{item.message}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatTime(item.timestamp)}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        )}
      </div>
    </Card>
  );
}