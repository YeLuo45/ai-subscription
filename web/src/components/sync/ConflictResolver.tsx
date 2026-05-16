import React, { useState } from 'react';
import { Modal, List, Radio, Button, Space, Typography, Alert } from 'antd';
import { getSyncEngine } from '../../services/sync';
import type { ConflictRecord } from '../../services/sync/types';

const { Text } = Typography;

interface ConflictResolverProps {
  conflicts: ConflictRecord[];
  onResolved: () => void;
}

export const ConflictResolver: React.FC<ConflictResolverProps> = ({ conflicts, onResolved }) => {
  const [selected, setSelected] = useState<Record<string, 'local' | 'remote'>>({});
  const [resolving, setResolving] = useState(false);

  const handleResolve = async () => {
    const engine = getSyncEngine();
    setResolving(true);
    try {
      for (const [id, choice] of Object.entries(selected)) {
        await engine.resolveConflict(id, choice);
      }
      onResolved();
    } finally {
      setResolving(false);
    }
  };

  return (
    <Modal
      title="⚠️ 同步冲突解决"
      open={conflicts.length > 0}
      onCancel={() => {}}
      footer={[
        <Button key="cancel" onClick={() => {}}>
          稍后解决
        </Button>,
        <Button
          key="resolve"
          type="primary"
          loading={resolving}
          disabled={Object.keys(selected).length !== conflicts.length}
          onClick={handleResolve}
        >
          确认解决 ({Object.keys(selected).length}/{conflicts.length})
        </Button>,
      ]}
    >
      <Alert
        message="检测到数据冲突，请选择保留哪个版本"
        type="warning"
        style={{ marginBottom: 16 }}
      />
      <List
        dataSource={conflicts}
        renderItem={(conflict) => (
          <List.Item key={conflict.id}>
            <div style={{ width: '100%' }}>
              <Text strong>{conflict.entityType}: {conflict.entityId}</Text>
              <Radio.Group
                value={selected[conflict.id]}
                onChange={(e) => setSelected({ ...selected, [conflict.id]: e.target.value })}
                style={{ display: 'flex', marginTop: 8 }}
              >
                <Space direction="vertical" style={{ flex: 1 }}>
                  <Radio value="local">
                    <div>
                      <Text>本地版本</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        修改时间: {new Date(conflict.localUpdatedAt).toLocaleString()}
                      </Text>
                    </div>
                  </Radio>
                  <Radio value="remote">
                    <div>
                      <Text>远程版本</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        修改时间: {new Date(conflict.remoteUpdatedAt).toLocaleString()}
                      </Text>
                    </div>
                  </Radio>
                </Space>
              </Radio.Group>
            </div>
          </List.Item>
        )}
      />
    </Modal>
  );
};

export default ConflictResolver;
