/**
 * AgentNodeCard Component
 * Displays an agent's status with badge and optional critic score
 */

import React from 'react';
import { Card, Badge, Tag, Typography } from 'antd';
import type { AgentStatus } from '../../services/multi-agent/types';

const { Text } = Typography;

interface AgentNodeCardProps {
  agentId: string;
  agentName: string;
  status: AgentStatus;
  criticScore?: number;
}

const getStatusColor = (status: AgentStatus): string => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'running':
      return 'processing';
    case 'failed':
      return 'error';
    case 'pending':
    case 'idle':
    default:
      return 'default';
  }
};

const getStatusText = (status: AgentStatus): string => {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'running':
      return '运行中';
    case 'failed':
      return '失败';
    case 'pending':
      return '等待中';
    case 'idle':
    default:
      return '空闲';
  }
};

const getScoreColor = (score?: number): string => {
  if (score === undefined) return '';
  if (score >= 70) return 'green';
  if (score >= 50) return 'orange';
  return 'red';
};

export const AgentNodeCard: React.FC<AgentNodeCardProps> = ({
  agentId,
  agentName,
  status,
  criticScore,
}) => {
  return (
    <Card size="small" className="agent-node-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge status={getStatusColor(status)} />
        <Text strong>{agentName}</Text>
      </div>
      <div style={{ marginTop: 8 }}>
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      </div>
      {criticScore !== undefined && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>评分: </Text>
          <Tag color={getScoreColor(criticScore)}>{criticScore}</Tag>
        </div>
      )}
    </Card>
  );
};

export default AgentNodeCard;
