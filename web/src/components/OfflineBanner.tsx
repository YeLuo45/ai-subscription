import { useState, useEffect } from 'react';
import { Tag } from 'antd';
import { WifiOutlined } from '@ant-design/icons';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <Tag icon={<WifiOutlined />} color="warning" style={{ marginLeft: 8 }}>
      离线模式
    </Tag>
  );
}
