/**
 * MessageFlow Component
 * Displays a timeline of agent messages showing sender → recipient, type, payload summary
 */

import React from 'react';
import { Timeline, Tag, Typography } from 'antd';
import type { AgentMessage } from '../../services/multi-agent/types';

const { Text } = Typography;

interface MessageFlowProps {
  messages: AgentMessage[];
}

const getMessageTypeColor = (type: string): string => {
  switch (type) {
    case 'extraction_result':
      return 'blue';
    case 'summary_result':
      return 'cyan';
    case 'tag_result':
      return 'green';
    case 'translation_result':
      return 'purple';
    case 'critic_result':
      return 'orange';
    case 'task_assigned':
      return 'gold';
    case 'task_completed':
      return 'lime';
    case 'agent_status':
      return 'geekblue';
    case 'error':
      return 'red';
    default:
      return 'default';
  }
};

const getPayloadSummary = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') {
    return String(payload ?? '');
  }

  const p = payload as Record<string, unknown>;

  if (p.title) return `Title: ${String(p.title).slice(0, 30)}...`;
  if (p.summary) return `Summary: ${String(p.summary).slice(0, 30)}...`;
  if (p.keyPoints) return `Key points: ${(p.keyPoints as unknown[]).length} items`;
  if (p.tags) return `Tags: ${(p.tags as unknown[]).length} items`;
  if (p.translatedTitle) return `Translated: ${String(p.translatedTitle).slice(0, 20)}...`;
  if (p.score !== undefined) return `Score: ${p.score}`;
  if (p.feedback) return `Feedback: ${String(p.feedback).slice(0, 30)}...`;

  return JSON.stringify(p).slice(0, 40) + '...';
};

export const MessageFlow: React.FC<MessageFlowProps> = ({ messages }) => {
  if (messages.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <Text type="secondary">暂无消息</Text>
      </div>
    );
  }

  const items = messages.slice(-20).reverse().map((msg) => ({
    key: msg.id,
    color: getMessageTypeColor(msg.type),
    children: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Tag color="blue">{msg.source.role}</Tag>
          <Text>→</Text>
          {msg.target ? (
            <Tag color="purple">{msg.target.role}</Tag>
          ) : (
            <Text type="secondary">广播</Text>
          )}
          <Tag color={getMessageTypeColor(msg.type)}>{msg.type}</Tag>
        </div>
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {getPayloadSummary(msg.payload)}
          </Text>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {new Date(msg.timestamp).toLocaleTimeString()}
          </Text>
        </div>
      </div>
    ),
  }));

  return (
    <div style={{ maxHeight: 400, overflow: 'auto' }}>
      <Timeline items={items} />
    </div>
  );
};

export default MessageFlow;
