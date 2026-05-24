/**
 * ConflictResolver Component
 * Three-way merge UI: Local vs Remote vs Merged Result
 */

import React, { useState, useMemo } from 'react';
import { Modal, Radio, Space, Typography, Card, Tag, Divider, Button, Alert } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  SaveOutlined
} from '@ant-design/icons';
import type { VersionEntry, MergeStrategy, MergeResult, ConflictRecord } from '../../../shared/lib/conflict-resolver/types';
import { detectConflict, canAutoMerge, autoMerge, manualMerge, keepLocal, keepRemote } from '../../../shared/lib/conflict-resolver';
import { diff } from '../../../shared/lib/conflict-resolver/version-history';

const { Title, Text, Paragraph } = Typography;

interface ConflictResolverProps {
  open: boolean;
  conflict: ConflictRecord | null;
  onResolve: (result: MergeResult) => void;
  onCancel: () => void;
}

export const ConflictResolver: React.FC<ConflictResolverProps> = ({
  open,
  conflict,
  onResolve,
  onCancel
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<MergeStrategy>('auto-merge');
  const [manualChanges, setManualChanges] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  const detectionResult = useMemo(() => {
    if (!conflict) return null;
    return detectConflict(conflict.localVersion, conflict.remoteVersion);
  }, [conflict]);

  const diffResult = useMemo(() => {
    if (!conflict) return null;
    return diff(conflict.localVersion, conflict.remoteVersion);
  }, [conflict]);

  const autoMergePossible = useMemo(() => {
    if (!conflict) return false;
    return canAutoMerge(conflict.localVersion, conflict.remoteVersion);
  }, [conflict]);

  const handleResolve = () => {
    if (!conflict) return;
    setError(null);

    let result: MergeResult;

    switch (selectedStrategy) {
      case 'keep-local':
        result = keepLocal(conflict.localVersion);
        break;
      case 'keep-remote':
        result = keepRemote(conflict.remoteVersion);
        break;
      case 'auto-merge':
        result = autoMerge(conflict.localVersion, conflict.remoteVersion);
        break;
      case 'manual':
        result = manualMerge(
          conflict.localVersion,
          conflict.remoteVersion,
          Object.keys(manualChanges).length > 0 ? manualChanges : conflict.localVersion.changes
        );
        break;
      default:
        result = { success: false, mergedVersion: null, strategy: selectedStrategy, conflicts: ['Unknown strategy'] };
    }

    if (!result.success) {
      setError(result.conflicts.join(', '));
      return;
    }

    onResolve(result);
  };

  const renderVersionCard = (version: VersionEntry, label: string, color: string) => {
    const changes = Object.entries(version.changes);
    return (
      <Card
        size="small"
        title={<Text strong style={{ color }}>{label}</Text>}
        extra={<Tag color={color}>{new Date(version.timestamp).toLocaleString()}</Tag>}
        style={{ height: '100%' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Text type="secondary" small>User: {version.user}</Text>
          <Divider style={{ margin: '8px 0' }} />
          {changes.length === 0 ? (
            <Text type="secondary">No changes</Text>
          ) : (
            changes.map(([key, value]) => (
              <div key={key}>
                <Text strong style={{ fontSize: 12 }}>{key}:</Text>{' '}
                <Text code style={{ fontSize: 12 }}>{JSON.stringify(value)}</Text>
              </div>
            ))
          )}
        </Space>
      </Card>
    );
  };

  const renderDiff = () => {
    if (!diffResult) return null;
    const { added, removed, modified } = diffResult;

    return (
      <Card size="small" title="Changes Summary" style={{ marginTop: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {Object.keys(added).length > 0 && (
            <div>
              <Tag color="green">+ Added</Tag>
              {Object.keys(added).map(key => (
                <Tag key={key} style={{ marginLeft: 4 }}>{key}</Tag>
              ))}
            </div>
          )}
          {Object.keys(removed).length > 0 && (
            <div>
              <Tag color="red">- Removed</Tag>
              {Object.keys(removed).map(key => (
                <Tag key={key} style={{ marginLeft: 4 }}>{key}</Tag>
              ))}
            </div>
          )}
          {Object.keys(modified).length > 0 && (
            <div>
              <Tag color="orange">~ Modified</Tag>
              {Object.keys(modified).map(key => (
                <Tag key={key} style={{ marginLeft: 4 }}>{key}</Tag>
              ))}
            </div>
          )}
        </Space>
      </Card>
    );
  };

  if (!conflict) return null;

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          <span>Conflict Detected</span>
        </Space>
      }
      open={open}
      width={900}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="resolve"
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleResolve}
          disabled={selectedStrategy === 'manual' && Object.keys(manualChanges).length === 0}
        >
          Resolve Conflict
        </Button>
      ]}
      onCancel={onCancel}
      maskClosable={false}
    >
      <Alert
        message="Concurrent modifications detected"
        description={`Entity "${conflict.entityId}" has conflicting changes on local and remote versions. Choose a resolution strategy below.`}
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {renderVersionCard(conflict.localVersion, 'Local Version', '#1890ff')}
        {renderVersionCard(conflict.remoteVersion, 'Remote Version', '#52c41a')}
      </div>

      {renderDiff()}

      <Divider>Resolution Strategy</Divider>

      <Radio.Group
        value={selectedStrategy}
        onChange={e => setSelectedStrategy(e.target.value)}
        style={{ width: '100%' }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Radio value="keep-local" style={{ width: '100%' }}>
            <Card size="small" style={{ width: '100%', marginTop: 8 }}>
              <Space>
                <CheckCircleOutlined style={{ color: '#1890ff' }} />
                <Text strong>Keep Local</Text>
              </Space>
              <Paragraph type="secondary" style={{ marginBottom: 0, marginLeft: 24 }}>
                Discard remote changes and keep local version
              </Paragraph>
            </Card>
          </Radio>

          <Radio value="keep-remote" style={{ width: '100%' }}>
            <Card size="small" style={{ width: '100%', marginTop: 8 }}>
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text strong>Keep Remote</Text>
              </Space>
              <Paragraph type="secondary" style={{ marginBottom: 0, marginLeft: 24 }}>
                Discard local changes and keep remote version
              </Paragraph>
            </Card>
          </Radio>

          <Radio value="auto-merge" style={{ width: '100%' }} disabled={!autoMergePossible}>
            <Card size="small" style={{ width: '100%', marginTop: 8 }}>
              <Space>
                <CheckCircleOutlined style={{ color: '#faad14' }} />
                <Text strong>Auto Merge</Text>
                {!autoMergePossible && <Tag color="red">Conflicts in same fields</Tag>}
              </Space>
              <Paragraph type="secondary" style={{ marginBottom: 0, marginLeft: 24 }}>
                Automatically merge when no overlapping changes
              </Paragraph>
            </Card>
          </Radio>

          <Radio value="manual" style={{ width: '100%' }}>
            <Card size="small" style={{ width: '100%', marginTop: 8 }}>
              <Space>
                <EditOutlined style={{ color: '#722ed1' }} />
                <Text strong>Manual Merge</Text>
              </Space>
              <Paragraph type="secondary" style={{ marginBottom: 0, marginLeft: 24 }}>
                Review and manually resolve each conflict
              </Paragraph>
            </Card>
          </Radio>
        </Space>
      </Radio.Group>

      {error && (
        <Alert
          message="Merge Failed"
          description={error}
          type="error"
          showIcon
          icon={<CloseCircleOutlined />}
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  );
};

export default ConflictResolver;