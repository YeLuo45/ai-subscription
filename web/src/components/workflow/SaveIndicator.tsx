/**
 * SaveIndicator Component
 * Shows editor save status (Saved/Saving/Unsaved)
 */

import React from 'react';
import { Typography, Space, Tooltip, Badge } from 'antd';
import { CheckCircleFilled, LoadingOutlined, EditFilled, CloseCircleFilled } from '@ant-design/icons';
import type { SaveIndicatorState } from '../../services/workflow-persistence/types';

const { Text } = Typography;

interface SaveIndicatorProps {
  state: SaveIndicatorState;
  lastSavedAt?: number | null;
  compact?: boolean;
}

const statusConfig: Record<
  SaveIndicatorState,
  { color: string; icon: React.ReactNode; text: string; tooltip: string }
> = {
  saved: {
    color: '#52c41a',
    icon: <CheckCircleFilled />,
    text: '已保存',
    tooltip: '所有更改已保存',
  },
  saving: {
    color: '#1677ff',
    icon: <LoadingOutlined />,
    text: '保存中...',
    tooltip: '正在保存更改',
  },
  unsaved: {
    color: '#faad14',
    icon: <EditFilled />,
    text: '未保存',
    tooltip: '有未保存的更改',
  },
  error: {
    color: '#ff4d4f',
    icon: <CloseCircleFilled />,
    text: '保存失败',
    tooltip: '保存失败，请重试',
  },
};

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({
  state,
  lastSavedAt,
  compact = false,
}) => {
  const config = statusConfig[state];

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const renderContent = () => {
    if (compact) {
      return (
        <Tooltip title={config.tooltip}>
          <Badge
            status={state === 'saved' ? 'success' : state === 'error' ? 'error' : 'processing'}
            text={<Text style={{ color: config.color, fontSize: 12 }}>{config.text}</Text>}
          />
        </Tooltip>
      );
    }

    return (
      <Tooltip title={config.tooltip}>
        <Space size={4} style={{ cursor: 'default' }}>
          <span style={{ color: config.color }}>{config.icon}</span>
          <Text style={{ color: config.color, fontSize: 13 }}>{config.text}</Text>
          {state === 'saved' && lastSavedAt && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatTime(lastSavedAt)}
            </Text>
          )}
        </Space>
      </Tooltip>
    );
  };

  return <div>{renderContent()}</div>;
};

export default SaveIndicator;