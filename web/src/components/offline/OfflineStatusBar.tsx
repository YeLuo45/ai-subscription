/**
 * Offline Status Bar Component
 * Shows online/offline status and pending sync count
 */

import { useState, useEffect, useCallback } from 'react';
import { WifiOutlined, WifiDisconnectOutlined, SyncOutlined } from '@ant-design/icons';
import { Badge, Tooltip } from 'antd';
import { getSyncQueue } from '../../services/sync/sync-queue';
import { isOnline } from '../../services/offline';

interface OfflineStatusBarProps {
  /** Show detailed count on hover */
  showDetails?: boolean;
  /** Auto-update on network change */
  autoUpdate?: boolean;
}

/**
 * OfflineStatusBar shows the current online/offline status
 * and displays pending sync count when offline
 */
export function OfflineStatusBar({ showDetails = true, autoUpdate = true }: OfflineStatusBarProps) {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const updateStatus = useCallback(async () => {
    const syncQueue = getSyncQueue();
    const count = await syncQueue.getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    if (autoUpdate) {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    // Initial status check
    updateStatus();

    // Periodic update when offline
    const interval = setInterval(() => {
      if (!online) {
        updateStatus();
      }
    }, 5000);

    return () => {
      if (autoUpdate) {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
      clearInterval(interval);
    };
  }, [autoUpdate, online, updateStatus]);

  const statusText = online ? '在线' : '离线';
  const StatusIcon = online ? WifiOutlined : WifiDisconnectOutlined;
  const statusColor = online ? '#52c41a' : '#ff4d4f';

  const tooltipContent = showDetails ? (
    <div>
      <div>状态: {statusText}</div>
      {pendingCount > 0 && (
        <div>待同步操作: {pendingCount}</div>
      )}
      {!online && (
        <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
          离线操作将在恢复连接后自动同步
        </div>
      )}
    </div>
  ) : (
    <div>
      状态: {statusText}
      {pendingCount > 0 && ` (${pendingCount} 待同步)`}
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="bottom">
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 4,
          backgroundColor: online ? 'rgba(82, 196, 26, 0.1)' : 'rgba(255, 77, 79, 0.1)',
          border: `1px solid ${statusColor}33`,
          cursor: 'default',
          fontSize: 13,
        }}
      >
        <StatusIcon style={{ color: statusColor }} />
        <span style={{ color: statusColor, fontWeight: 500 }}>{statusText}</span>
        {pendingCount > 0 && !online && (
          <Badge
            count={pendingCount}
            size="small"
            style={{ backgroundColor: '#faad14' }}
          />
        )}
        {isSyncing && (
          <SyncOutlined spin style={{ color: '#1890ff' }} />
        )}
      </div>
    </Tooltip>
  );
}