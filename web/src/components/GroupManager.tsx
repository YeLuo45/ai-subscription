import { useState, useEffect } from 'react';
import { List, Button, Input, Space, Typography, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined } from '@ant-design/icons';
import { getGroups, saveGroup, deleteGroup, updateGroup, getSubscriptions } from '../services/storage';
import type { SubscriptionGroup, Subscription } from '../types';

const { Text, Title } = Typography;

export default function GroupManager() {
  const [groups, setGroups] = useState<SubscriptionGroup[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [gs, ss] = await Promise.all([getGroups(), getSubscriptions()]);
    setGroups(gs);
    setSubscriptions(ss);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newGroupName.trim()) return;
    const maxOrder = groups.length > 0 ? Math.max(...groups.map(g => g.order)) : -1;
    await saveGroup({ name: newGroupName.trim(), order: maxOrder + 1, collapsed: false });
    setNewGroupName('');
    message.success('分组已创建');
    load();
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    const group = groups.find(g => g.id === id);
    if (!group) return;
    await updateGroup({ ...group, name: editingName.trim() });
    setEditingId(null);
    message.success('分组已重命名');
    load();
  }

  async function handleDelete(id: string) {
    await deleteGroup(id);
    message.success('分组已删除，订阅源已移至未分组');
    load();
  }

  function getGroupSubCount(groupId: string) {
    return subscriptions.filter(s => s.groupId === groupId).length;
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={5} style={{ marginBottom: 16 }}>
        <FolderOutlined /> 订阅源分组
      </Title>

      {/* Create new group */}
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="新分组名称"
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
          onPressEnter={handleCreate}
          style={{ width: 200 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建分组
        </Button>
      </Space>

      {/* Group list */}
      <List
        loading={loading}
        dataSource={groups}
        locale={{ emptyText: '暂无分组' }}
        renderItem={(group) => (
          <List.Item
            key={group.id}
            actions={[
              <Button
                key="edit"
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingId(group.id);
                  setEditingName(group.name);
                }}
              />,
              <Popconfirm
                key="delete"
                title="删除分组？"
                description="分组内的订阅源将移至未分组"
                onConfirm={() => handleDelete(group.id)}
                okText="删除"
                cancelText="取消"
              >
                <Button type="text" danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>,
            ]}
          >
            {editingId === group.id ? (
              <Space>
                <Input
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onPressEnter={() => handleRename(group.id)}
                  style={{ width: 150 }}
                  autoFocus
                />
                <Button size="small" type="primary" onClick={() => handleRename(group.id)}>确定</Button>
                <Button size="small" onClick={() => setEditingId(null)}>取消</Button>
              </Space>
            ) : (
              <Space>
                <Text strong>{group.name}</Text>
                <Text type="secondary">({getGroupSubCount(group.id)} 个订阅源)</Text>
              </Space>
            )}
          </List.Item>
        )}
      />
    </div>
  );
}
