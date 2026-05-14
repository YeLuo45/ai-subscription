import React from 'react';
import { WifiOutlined, CloudSyncOutlined } from '@ant-design/icons';
import { useOfflineStatus, usePWAUpdate } from '../hooks/useOfflineStatus';
import { usePWAUpdate as usePWAUpdateHook } from '../hooks/usePWAUpdate';

export const OfflineIndicator: React.FC = () => {
  const isOffline = useOfflineStatus();
  const { updateAvailable, applyUpdate } = usePWAUpdateHook();

  if (isOffline) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#faad14',
          color: '#000',
          padding: '8px 16px',
          borderRadius: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 9999,
        }}
      >
        <WifiOutlined />
        <span>离线模式 - 部分功能可能受限</span>
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

  return null;
};
