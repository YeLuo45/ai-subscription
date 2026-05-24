/**
 * PluginManagerPanel - UI for managing plugins
 * Lists plugins, enables/disables them, shows status
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  List,
  Switch,
  Tag,
  Typography,
  Space,
  Tooltip,
  Badge,
  Card,
  Descriptions,
  Alert,
} from 'antd';
import {
  RobotOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { PluginManifest, PluginHook } from '../../../../shared/lib/event-bus/plugins/types';
import { getPluginRegistry, initializeBuiltinPlugins } from '../../../../shared/lib/event-bus/plugins';

const { Title, Text } = Typography;

interface PluginManagerPanelProps {
  visible: boolean;
  onClose: () => void;
}

interface PluginItem extends PluginHook {
  manifest: PluginManifest;
}

const PluginManagerPanel: React.FC<PluginManagerPanelProps> = ({ visible, onClose }) => {
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Load plugins when panel opens
  useEffect(() => {
    if (visible) {
      loadPlugins();
    }
  }, [visible]);

  const loadPlugins = () => {
    setLoading(true);
    try {
      // Initialize builtin plugins if not already
      initializeBuiltinPlugins();
      
      const registry = getPluginRegistry();
      const allPlugins = registry.getPlugins();
      setPlugins(allPlugins.map(p => ({ ...p })));
    } catch (error) {
      console.error('[PluginManagerPanel] Failed to load plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (pluginId: string, enabled: boolean) => {
    const registry = getPluginRegistry();
    
    if (enabled) {
      registry.enable(pluginId);
    } else {
      registry.disable(pluginId);
    }
    
    // Refresh plugins list
    loadPlugins();
  };

  const getPluginIcon = (plugin: PluginItem) => {
    if (plugin.manifest.builtin) {
      return <RobotOutlined style={{ color: '#1890ff' }} />;
    }
    return <SettingOutlined />;
  };

  const getHookTags = (hooks: string[]) => {
    return hooks.map((hook, index) => (
      <Tag key={index} color="blue">{hook}</Tag>
    ));
  };

  const renderPluginItem = (plugin: PluginItem) => {
    const isBuiltin = plugin.manifest.builtin;
    
    return (
      <Card
        size="small"
        style={{ marginBottom: 12 }}
        actions={[
          <Switch
            key="switch"
            checked={plugin.enabled}
            onChange={(checked) => handleToggle(plugin.manifest.id, checked)}
            disabled={isBuiltin}
            checkedChildren={<CheckCircleOutlined />}
            unCheckedChildren={<CloseCircleOutlined />}
          />,
        ]}
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Name">
            <Space>
              {getPluginIcon(plugin)}
              <Text strong>{plugin.manifest.name}</Text>
              {isBuiltin && <Tag color="green">Built-in</Tag>}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Version">
            {plugin.manifest.version}
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            {plugin.manifest.description}
          </Descriptions.Item>
          <Descriptions.Item label="Author">
            {plugin.manifest.author || 'Unknown'}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Badge
              status={plugin.enabled ? 'success' : 'default'}
              text={plugin.enabled ? 'Enabled' : 'Disabled'}
            />
          </Descriptions.Item>
          <Descriptions.Item label="Hooks" span={2}>
            {getHookTags(plugin.manifest.hooks)}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    );
  };

  return (
    <Modal
      title="Plugin Manager"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={720}
      bodyStyle={{ maxHeight: '60vh', overflowY: 'auto' }}
    >
      <Alert
        message="Plugin System"
        description="Plugins extend the functionality of the application. Built-in plugins cannot be disabled."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <List
        loading={loading}
        dataSource={plugins}
        renderItem={renderPluginItem}
        locale={{ emptyText: 'No plugins available' }}
      />
    </Modal>
  );
};

export default PluginManagerPanel;