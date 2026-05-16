import React from 'react';
import { SyncOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CloudOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Badge, Tooltip } from 'antd';

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'conflict' | 'error';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  lastSyncTime?: Date;
  pendingCount?: number;
  onClick?: () => void;
}

const statusConfig: Record<SyncStatus, { color: string; icon: React.ReactNode; text: string }> = {
  synced: { color: '#52c41a', icon: <CheckCircleOutlined />, text: '已同步' },
  pending: { color: '#faad14', icon: <SyncOutlined spin />, text: '同步中...' },
  offline: { color: '#8c8c8c', icon: <CloudOutlined />, text: '离线' },
  conflict: { color: '#ff4d4f', icon: <ExclamationCircleOutlined />, text: '冲突' },
  error: { color: '#ff4d4f', icon: <CloseCircleOutlined />, text: '同步错误' },
};

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  status,
  lastSyncTime,
  pendingCount = 0,
  onClick,
}) => {
  const config = statusConfig[status];
  const timeStr = lastSyncTime ? lastSyncTime.toLocaleTimeString() : '';

  return (
    <Tooltip
      title={
        <div>
          <div>{config.text}</div>
          {timeStr && <div style={{ fontSize: 11, opacity: 0.7 }}>上次同步: {timeStr}</div>}
          {pendingCount > 0 && <div style={{ fontSize: 11, opacity: 0.7 }}>待同步: {pendingCount} 项</div>}
        </div>
      }
    >
      <Badge color={config.color} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
        <span style={{ color: config.color, fontSize: 16 }}>{config.icon}</span>
      </Badge>
    </Tooltip>
  );
};

export default SyncStatusIndicator;
