import { useState, useEffect } from 'react';
import { Badge, Tooltip } from 'antd';
import { realtimeClient, RealtimeStatus } from '../services/realtimeClient';

const statusConfig: Record<RealtimeStatus, { color: string; text: string }> = {
  connected: { color: '#52c41a', text: '实时同步已连接' },
  connecting: { color: '#faad14', text: '实时同步连接中...' },
  disconnected: { color: '#d9d9d9', text: '实时同步未连接' },
};

export default function RealtimeStatus() {
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');

  useEffect(() => {
    realtimeClient.setStatusCallback(setStatus);
    realtimeClient.connect();
    
    return () => {
      realtimeClient.disconnect();
    };
  }, []);

  const config = statusConfig[status];
  
  return (
    <Tooltip title={config.text}>
      <Badge color={config.color} />
    </Tooltip>
  );
}