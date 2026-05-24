/**
 * VersionHistoryPanel Component
 * Sidebar version list showing workflow version history
 */

import React, { useState, useEffect } from 'react';
import { List, Typography, Tag, Tooltip, Button, Empty, Space } from 'antd';
import { HistoryOutlined, RollbackOutlined, DeleteOutlined } from '@ant-design/icons';
import type { WorkflowSnapshot } from '../../services/workflow-persistence/types';

const { Text, Title } = Typography;

interface VersionHistoryPanelProps {
  workflowId: string;
  versions: WorkflowSnapshot[];
  currentVersionNumber?: number;
  onSelectVersion?: (version: WorkflowSnapshot) => void;
  onRestoreVersion?: (version: WorkflowSnapshot) => void;
  onDeleteVersion?: (versionId: string) => void;
  loading?: boolean;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  workflowId,
  versions,
  currentVersionNumber,
  onSelectVersion,
  onRestoreVersion,
  onDeleteVersion,
  loading = false,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(null);
  }, [workflowId]);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 30) return `${days} 天前`;
    return formatDate(timestamp);
  };

  const handleSelect = (version: WorkflowSnapshot) => {
    setSelectedId(version.id);
    onSelectVersion?.(version);
  };

  const handleRestore = (version: WorkflowSnapshot, e: React.MouseEvent) => {
    e.stopPropagation();
    onRestoreVersion?.(version);
  };

  const handleDelete = (versionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteVersion?.(versionId);
  };

  const renderVersionItem = (version: WorkflowSnapshot) => {
    const isSelected = selectedId === version.id;
    const isCurrent = currentVersionNumber === version.version_number;
    const isLatest = versions[0]?.id === version.id;

    return (
      <List.Item
        key={version.id}
        onClick={() => handleSelect(version)}
        style={{
          cursor: 'pointer',
          padding: '12px 16px',
          background: isSelected ? '#f0f5ff' : 'transparent',
          borderLeft: isSelected ? '3px solid #1677ff' : '3px solid transparent',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ width: '100%' }}>
          <Space style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={5} style={{ margin: 0 }}>
              v{version.version_number}
            </Title>
            <Space>
              {isCurrent && <Tag color="blue">当前版本</Tag>}
              {isLatest && !isCurrent && <Tag color="green">最新</Tag>}
            </Space>
          </Space>

          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            {formatRelativeTime(version.created_at)}
          </Text>

          <Space style={{ marginTop: 8 }} size={4}>
            <Tag>{version.node_count} 节点</Tag>
            <Tag>{version.edge_count} 边</Tag>
          </Space>

          <div style={{ marginTop: 8 }}>
            <Space>
              <Tooltip title="恢复到此版本">
                <Button
                  type="text"
                  size="small"
                  icon={<RollbackOutlined />}
                  onClick={(e) => handleRestore(version, e)}
                  disabled={isCurrent}
                >
                  恢复
                </Button>
              </Tooltip>
              {!isLatest && (
                <Tooltip title="删除此版本">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => handleDelete(version.id, e)}
                  />
                </Tooltip>
              )}
            </Space>
          </div>
        </div>
      </List.Item>
    );
  };

  if (!workflowId) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Empty description="请先选择一个工作流" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <HistoryOutlined />
          版本历史
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {versions.length} 个版本
        </Text>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {versions.length === 0 ? (
          <Empty
            description="暂无版本记录"
            style={{ marginTop: 48 }}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={versions}
            renderItem={renderVersionItem}
            loading={loading}
            size="small"
          />
        )}
      </div>
    </div>
  );
};

export default VersionHistoryPanel;