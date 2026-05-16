import React from 'react';
import { WifiOutlined, CloudSyncOutlined, SyncOutlined } from '@ant-design/icons';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { usePWAUpdate } from '../hooks/usePWAUpdate';
import { isOnline, getQueuedActionCount, flushOfflineQueue } from '../services/offline';

export const OfflineBanner: React.FC = () => {
  const isOffline = useOfflineStatus();
  const { updateAvailable, applyUpdate } = usePWAUpdate();
  const queuedCount = getQueuedActionCount();

  const handleFlushQueue = async () => {
    if (isOnline()) {
      await flushOfflineQueue();
    }
  };

  if (isOffline) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: '#faad14',
          color: '#000',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 14,
          zIndex: 9999,
        }}
      >
        <WifiOutlined />
        <span>离线模式 - 部分功能可能受限</span>
        {queuedCount > 0 && (
          <span style={{ marginLeft: 8, opacity: 0.8 }}>
            ({queuedCount} 个操作待同步)
          </span>
        )}
      </div>
    );
  }

  if (updateAvailable) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1890ff',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 9999,
          cursor: 'pointer',
        }}
        onClick={applyUpdate}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && applyUpdate()}
      >
        <CloudSyncOutlined />
        <span>发现新版本，点击更新</span>
      </div>
    );
  }

  // Show sync banner if there are queued actions and we're online
  if (queuedCount > 0 && isOnline()) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#52c41a',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 9999,
          cursor: 'pointer',
        }}
        onClick={handleFlushQueue}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleFlushQueue()}
      >
        <SyncOutlined spin={false} />
        <span>有 {queuedCount} 个离线操作待同步，点击同步</span>
      </div>
    );
  }

  return null;
};