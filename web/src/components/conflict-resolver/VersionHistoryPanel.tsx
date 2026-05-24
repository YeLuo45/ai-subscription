/**
 * VersionHistoryPanel Component
 * Displays version timeline for an entity
 */

import React, { useState, useEffect } from 'react';
import { Timeline, Card, Typography, Space, Tag, Button, Modal, Empty, Tooltip, Statistic, Row, Col } from 'antd';
import {
  HistoryOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FieldTimeOutlined,
  BranchesOutlined,
  DiffOutlined
} from '@ant-design/icons';
import type { VersionEntry, DiffResult } from '../../../shared/lib/conflict-resolver/types';
import { getVersionChain, diff, formatVersionChain } from '../../../shared/lib/conflict-resolver/version-history';
import { compareVectorClocks } from '../../../shared/lib/conflict-resolver/detector';

const { Title, Text, Paragraph } = Typography;

interface VersionHistoryPanelProps {
  entityId: string;
  onViewVersion?: (version: VersionEntry) => void;
  onCompareVersions?: (v1: VersionEntry, v2: VersionEntry) => void;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  entityId,
  onViewVersion,
  onCompareVersions
}) => {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionEntry | null>(null);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [compareVersions, setCompareVersions] = useState<[VersionEntry, VersionEntry] | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);

  useEffect(() => {
    if (entityId) {
      loadVersions();
    }
  }, [entityId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const chain = await getVersionChain(entityId);
      setVersions(chain);
    } catch (err) {
      console.error('Failed to load version chain:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = (v1: VersionEntry, v2: VersionEntry) => {
    setCompareVersions([v1, v2]);
    setDiffResult(diff(v1, v2));
    setCompareModalVisible(true);
  };

  const renderVersionDetails = (version: VersionEntry) => {
    const changes = Object.entries(version.changes);
    return (
      <Card size="small" style={{ marginTop: 8 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="User"
                value={version.user}
                prefix={<UserOutlined />}
                valueStyle={{ fontSize: 14 }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Timestamp"
                value={new Date(version.timestamp).toLocaleString()}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ fontSize: 14 }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Version ID"
                value={version.id.substring(0, 8) + '...'}
                valueStyle={{ fontSize: 14 }}
              />
            </Col>
          </Row>

          {version.parent && (
            <Text type="secondary">
              <BranchesOutlined /> Parent: {version.parent.substring(0, 8)}...
            </Text>
          )}

          <Divider style={{ margin: '8px 0' }} />

          <div>
            <Text strong>Changes ({changes.length}):</Text>
            {changes.length === 0 ? (
              <Tag color="default" style={{ marginLeft: 8 }}>No changes</Tag>
            ) : (
              <div style={{ marginTop: 4 }}>
                {changes.map(([key, value]) => (
                  <Tag key={key} style={{ margin: '2px' }}>
                    {key}: <Text code>{JSON.stringify(value).substring(0, 30)}</Text>
                  </Tag>
                ))}
              </div>
            )}
          </div>
        </Space>
      </Card>
    );
  };

  const renderTimeline = () => {
    if (versions.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No version history available"
        />
      );
    }

    // Build timeline items with comparison links
    const items = versions.map((version, index) => {
      const prevVersion = index > 0 ? versions[index - 1] : null;

      return {
        key: version.id,
        color: index === versions.length - 1 ? 'blue' : 'gray',
        dot: index === versions.length - 1 ? <ClockCircleOutlined /> : undefined,
        children: (
          <Card
            size="small"
            style={{
              marginBottom: 8,
              border: index === versions.length - 1 ? '2px solid #1890ff' : '1px solid #f0f0f0'
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                  <Text strong>Version {versions.length - index}</Text>
                  <Tag color={index === versions.length - 1 ? 'blue' : 'default'}>
                    {version.user}
                  </Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {new Date(version.timestamp).toLocaleString()}
                </Text>
              </Space>

              <Space>
                {prevVersion && (
                  <Tooltip title="Compare with previous version">
                    <Button
                      size="small"
                      icon={<DiffOutlined />}
                      onClick={() => handleCompare(prevVersion, version)}
                    >
                      Compare
                    </Button>
                  </Tooltip>
                )}
                <Button
                  size="small"
                  type="text"
                  onClick={() => setSelectedVersion(selectedVersion?.id === version.id ? null : version)}
                >
                  {selectedVersion?.id === version.id ? 'Hide Details' : 'View Details'}
                </Button>
              </Space>

              {selectedVersion?.id === version.id && renderVersionDetails(version)}
            </Space>
          </Card>
        )
      };
    });

    return <Timeline items={items} />;
  };

  const renderCompareModal = () => {
    if (!compareVersions || !diffResult) return null;

    const [v1, v2] = compareVersions;

    return (
      <Modal
        title="Version Comparison"
        open={compareModalVisible}
        onCancel={() => setCompareModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setCompareModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" title="Version 1" extra={<Tag>{v1.id.substring(0, 8)}</Tag>}>
                <Text type="secondary">User: {v1.user}</Text><br />
                <Text type="secondary">Time: {new Date(v1.timestamp).toLocaleString()}</Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="Version 2" extra={<Tag>{v2.id.substring(0, 8)}</Tag>}>
                <Text type="secondary">User: {v2.user}</Text><br />
                <Text type="secondary">Time: {new Date(v2.timestamp).toLocaleString()}</Text>
              </Card>
            </Col>
          </Row>

          <Divider>Changes</Divider>

          {diffResult.hasChanges ? (
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {Object.keys(diffResult.added).length > 0 && (
                <div>
                  <Tag color="green">+ Added</Tag>
                  <div style={{ marginLeft: 8, marginTop: 4 }}>
                    {Object.keys(diffResult.added).map(key => (
                      <div key={key}>
                        <Text strong>{key}:</Text>{' '}
                        <Text code>{JSON.stringify(diffResult.added[key])}</Text>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(diffResult.removed).length > 0 && (
                <div>
                  <Tag color="red">- Removed</Tag>
                  <div style={{ marginLeft: 8, marginTop: 4 }}>
                    {Object.keys(diffResult.removed).map(key => (
                      <div key={key}>
                        <Text strong>{key}:</Text>{' '}
                        <Text code>{JSON.stringify(diffResult.removed[key])}</Text>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(diffResult.modified).length > 0 && (
                <div>
                  <Tag color="orange">~ Modified</Tag>
                  <div style={{ marginLeft: 8, marginTop: 4 }}>
                    {Object.keys(diffResult.modified).map(key => (
                      <div key={key}>
                        <Text strong>{key}:</Text>
                        <div style={{ marginLeft: 8 }}>
                          <Text type="secondary" delete>Old: {JSON.stringify(diffResult.modified[key].old)}</Text>
                          <br />
                          <Text type="secondary">New: {JSON.stringify(diffResult.modified[key].new)}</Text>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Space>
          ) : (
            <Text type="secondary">No differences between versions</Text>
          )}
        </Space>
      </Modal>
    );
  };

  return (
    <Card
      title={
        <Space>
          <HistoryOutlined />
          <span>Version History</span>
        </Space>
      }
      extra={
        <Tag color="blue">
          <FieldTimeOutlined /> {versions.length} versions
        </Tag>
      }
      loading={loading}
    >
      {renderTimeline()}
      {renderCompareModal()}
    </Card>
  );
};

export default VersionHistoryPanel;