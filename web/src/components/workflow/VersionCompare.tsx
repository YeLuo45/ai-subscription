/**
 * VersionCompare Component
 * Side-by-side diff modal comparing two workflow versions
 */

import React, { useState, useMemo } from 'react';
import { Modal, Tabs, Typography, Tag, Space, Descriptions } from 'antd';
import { DiffOutlined, PlusOutlined, MinusOutlined, EditOutlined } from '@ant-design/icons';
import { compareSnapshots } from '../../services/workflow-persistence/snapshot-diff';
import type { WorkflowSnapshot } from '../../services/workflow-persistence/types';

const { Title, Text, Paragraph } = Typography;

interface VersionCompareProps {
  visible: boolean;
  versionA: WorkflowSnapshot | null;
  versionB: WorkflowSnapshot | null;
  onClose: () => void;
}

type DiffTab = 'nodes' | 'edges';

export const VersionCompare: React.FC<VersionCompareProps> = ({
  visible,
  versionA,
  versionB,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<DiffTab>('nodes');

  const diff = useMemo(() => {
    if (!versionA || !versionB) return null;
    return compareSnapshots(versionA.snapshot, versionB.snapshot);
  }, [versionA, versionB]);

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const renderDiffSection = (
    title: string,
    added: string[],
    removed: string[],
    modified: string[]
  ) => {
    return (
      <div>
        <Title level={5} style={{ marginTop: 16 }}>
          {title}
        </Title>

        {added.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <Space>
              <PlusOutlined style={{ color: '#52c41a' }} />
              <Text strong>新增 ({added.length})</Text>
            </Space>
            <div style={{ marginTop: 4, paddingLeft: 20 }}>
              {added.map(id => (
                <Tag key={id} color="success" style={{ margin: 2 }}>
                  {id}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {removed.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <Space>
              <MinusOutlined style={{ color: '#ff4d4f' }} />
              <Text strong>删除 ({removed.length})</Text>
            </Space>
            <div style={{ marginTop: 4, paddingLeft: 20 }}>
              {removed.map(id => (
                <Tag key={id} color="error" style={{ margin: 2 }}>
                  {id}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {modified.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <Space>
              <EditOutlined style={{ color: '#1677ff' }} />
              <Text strong>修改 ({modified.length})</Text>
            </Space>
            <div style={{ marginTop: 4, paddingLeft: 20 }}>
              {modified.map(id => (
                <Tag key={id} color="processing" style={{ margin: 2 }}>
                  {id}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {added.length === 0 && removed.length === 0 && modified.length === 0 && (
          <Text type="secondary">无变化</Text>
        )}
      </div>
    );
  };

  if (!versionA || !versionB) {
    return null;
  }

  const nodeChanges =
    (diff?.added.nodes.length || 0) +
    (diff?.removed.nodes.length || 0) +
    (diff?.modified.nodes.length || 0);
  const edgeChanges =
    (diff?.added.edges.length || 0) +
    (diff?.removed.edges.length || 0) +
    (diff?.modified.edges.length || 0);

  return (
    <Modal
      title={
        <Space>
          <DiffOutlined />
          <span>版本对比</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      bodyStyle={{ maxHeight: 600, overflow: 'auto' }}
    >
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="版本">
          v{versionA.version_number}
        </Descriptions.Item>
        <Descriptions.Item label="对比版本">
          v{versionB.version_number}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {formatDate(versionA.created_at)}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {formatDate(versionB.created_at)}
        </Descriptions.Item>
        <Descriptions.Item label="节点数">
          {versionA.node_count}
        </Descriptions.Item>
        <Descriptions.Item label="节点数">
          {versionB.node_count}
        </Descriptions.Item>
        <Descriptions.Item label="边数">
          {versionA.edge_count}
        </Descriptions.Item>
        <Descriptions.Item label="边数">
          {versionB.edge_count}
        </Descriptions.Item>
      </Descriptions>

      <Tabs
        activeKey={activeTab}
        onChange={key => setActiveTab(key as DiffTab)}
        style={{ marginTop: 16 }}
        items={[
          {
            key: 'nodes',
            label: (
              <Space>
                节点
                {nodeChanges > 0 && (
                  <Tag color="blue">{nodeChanges}</Tag>
                )}
              </Space>
            ),
            children: diff
              ? renderDiffSection(
                  '节点变化',
                  diff.added.nodes,
                  diff.removed.nodes,
                  diff.modified.nodes
                )
              : null,
          },
          {
            key: 'edges',
            label: (
              <Space>
                边
                {edgeChanges > 0 && (
                  <Tag color="blue">{edgeChanges}</Tag>
                )}
              </Space>
            ),
            children: diff
              ? renderDiffSection(
                  '边变化',
                  diff.added.edges,
                  diff.removed.edges,
                  diff.modified.edges
                )
              : null,
          },
        ]}
      />
    </Modal>
  );
};

export default VersionCompare;