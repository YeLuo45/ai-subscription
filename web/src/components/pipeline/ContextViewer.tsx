/**
 * ContextViewer Component
 * Displays Key-Value list of ContextPool contents
 */

import React from 'react';
import { Descriptions, Tag, Collapse, Typography } from 'antd';
import type { ContextPool } from '../../services/multi-agent/context-pool';

const { Text } = Typography;

interface ContextViewerProps {
  pool: ContextPool;
}

const getValueDisplay = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined) {
    return <Text type="secondary">-</Text>;
  }

  if (typeof value === 'string') {
    return <Text>{value.length > 100 ? value.slice(0, 100) + '...' : value}</Text>;
  }

  if (Array.isArray(value)) {
    return (
      <div>
        {value.slice(0, 5).map((item, idx) => (
          <Tag key={idx} style={{ marginBottom: 4 }}>{String(item)}</Tag>
        ))}
        {value.length > 5 && <Tag>+{value.length - 5} more</Tag>}
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length <= 3) {
      return (
        <div>
          {entries.map(([k, v]) => (
            <div key={k} style={{ marginBottom: 4 }}>
              <Text strong style={{ fontSize: 12 }}>{k}: </Text>
              <Text type="secondary">{String(v).slice(0, 50)}</Text>
            </div>
          ))}
        </div>
      );
    }
    return (
      <Collapse
        size="small"
        items={[{
          key: 'details',
          label: <Text type="secondary">查看详情 ({entries.length} 项)</Text>,
          children: (
            <div>
              {entries.map(([k, v]) => (
                <div key={k} style={{ marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 12 }}>{k}: </Text>
                  <Text type="secondary">{String(v).slice(0, 80)}</Text>
                </div>
              ))}
            </div>
          ),
        }]}
      />
    );
  }

  return <Text>{String(value)}</Text>;
};

export const ContextViewer: React.FC<ContextViewerProps> = ({ pool }) => {
  const contexts = pool.getAllContexts();

  if (contexts.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <Text type="secondary">暂无上下文</Text>
      </div>
    );
  }

  return (
    <div style={{ maxHeight: 400, overflow: 'auto' }}>
      {contexts.map((ctx) => (
        <Descriptions
          key={ctx.id}
          size="small"
          column={1}
          bordered
          style={{ marginBottom: 12 }}
        >
          <Descriptions.Item label="Agent">
            <Tag color="blue">{ctx.agent.role}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>({ctx.agent.id})</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={
              ctx.status === 'completed' ? 'success' :
              ctx.status === 'running' ? 'processing' :
              ctx.status === 'failed' ? 'error' : 'default'
            }>
              {ctx.status}
            </Tag>
          </Descriptions.Item>
          {ctx.score !== undefined && (
            <Descriptions.Item label="Score">
              <Tag color={ctx.score >= 70 ? 'green' : ctx.score >= 50 ? 'orange' : 'red'}>
                {ctx.score}
              </Tag>
            </Descriptions.Item>
          )}
          {ctx.result !== undefined && (
            <Descriptions.Item label="Result">
              {getValueDisplay(ctx.result)}
            </Descriptions.Item>
          )}
          {ctx.error && (
            <Descriptions.Item label="Error">
              <Text type="danger">{ctx.error}</Text>
            </Descriptions.Item>
          )}
          {ctx.duration !== undefined && (
            <Descriptions.Item label="Duration">
              <Text type="secondary">{ctx.duration}ms</Text>
            </Descriptions.Item>
          )}
        </Descriptions>
      ))}
    </div>
  );
};

export default ContextViewer;
