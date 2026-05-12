/**
 * Offline Indicator Component
 * Shows network status and sync state
 */

import React, { useState, useEffect } from 'react';
import { Badge, Space, Typography } from 'antd';
import { SyncOutlined, WifiOutlined, DisconnectOutlined } from '@ant-design/icons';

const { Text } = Typography;

export type IndicatorStatus = 'online' | 'offline' | 'syncing';

interface OfflineIndicatorProps {
  className?: string;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className }) => {
  const [status, setStatus] = useState<IndicatorStatus>('online');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setStatus('syncing');
      // After syncing, set back to online
      setTimeout(() => setStatus('online'), 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus('offline');
    };

    const handleNetworkChange = (e: CustomEvent) => {
      setIsOnline(e.detail.isOnline);
      if (e.detail.isOnline) {
        setStatus('syncing');
        setTimeout(() => setStatus('online'), 1000);
      } else {
        setStatus('offline');
      }
    };

    const handleSyncStart = () => setStatus('syncing');
    const handleSyncComplete = () => setStatus('online');
    const handleSyncError = () => setStatus('online');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('network-status-change', handleNetworkChange as EventListener);
    window.addEventListener('sync-start', handleSyncStart);
    window.addEventListener('sync-complete', handleSyncComplete);
    window.addEventListener('sync-error', handleSyncError);

    // Set initial status
    if (!navigator.onLine) {
      setStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('network-status-change', handleNetworkChange as EventListener);
      window.removeEventListener('sync-start', handleSyncStart);
      window.removeEventListener('sync-complete', handleSyncComplete);
      window.removeEventListener('sync-error', handleSyncError);
    };
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          color: '#52c41a',
          text: '在线',
          icon: <WifiOutlined />,
        };
      case 'offline':
        return {
          color: '#ff4d4f',
          text: '离线模式',
          icon: <DisconnectOutlined />,
        };
      case 'syncing':
        return {
          color: '#1890ff',
          text: '同步中',
          icon: <SyncOutlined spin />,
        };
      default:
        return {
          color: '#d9d9d9',
          text: '未知',
          icon: null,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Space className={className} size="small">
      <Badge color={config.color} />
      {config.icon}
      <Text type="secondary" style={{ fontSize: 12 }}>
        {config.text}
      </Text>
    </Space>
  );
};

export default OfflineIndicator;
