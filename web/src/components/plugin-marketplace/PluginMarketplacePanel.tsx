// Plugin Marketplace Panel - UI for browsing and installing plugins from GitHub
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Input, 
  Tag, 
  Spin, 
  message,
  Modal,
  Tooltip,
  Space,
  Badge,
  Empty,
  Descriptions,
  Typography,
  Divider,
} from 'antd';
import {
  DownloadOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  InboxOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { MarketplacePlugin, PluginManifest, PluginDefinition } from '../../services/plugin-registry/types';
import { 
  fetchMarketplacePlugins, 
  searchPlugins,
  getPluginRegistry,
  verifyEd25519Signature,
  isEd25519Supported,
} from '../../services/plugin-registry';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

interface PluginMarketplacePanelProps {
  /** Callback when a plugin is installed */
  onPluginInstalled?: (pluginId: string) => void;
  /** Callback when a plugin is uninstalled */
  onPluginUninstalled?: (pluginId: string) => void;
}

export const PluginMarketplacePanel: React.FC<PluginMarketplacePanelProps> = ({
  onPluginInstalled,
  onPluginUninstalled,
}) => {
  const [loading, setLoading] = useState(false);
  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState<MarketplacePlugin | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installedPlugins, setInstalledPlugins] = useState<Set<string>>(new Set());
  const [enabledPlugins, setEnabledPlugins] = useState<Set<string>>(new Set());

  const registry = getPluginRegistry();

  // Load installed plugins on mount
  useEffect(() => {
    const loadInstalled = async () => {
      try {
        await registry.initialize();
        const allPlugins = registry.getAllPlugins();
        setInstalledPlugins(new Set(allPlugins.map(p => p.manifest.id)));
        setEnabledPlugins(new Set(allPlugins.filter(p => p.status === 'enabled').map(p => p.manifest.id)));
      } catch (err) {
        console.error('Failed to initialize registry:', err);
      }
    };
    loadInstalled();

    // Listen for plugin events
    const removeListener = registry.addEventListener((event) => {
      if (event.type === 'plugin:installed') {
        setInstalledPlugins(prev => new Set([...prev, event.pluginId]));
      } else if (event.type === 'plugin:uninstalled') {
        setInstalledPlugins(prev => {
          const next = new Set(prev);
          next.delete(event.pluginId);
          return next;
        });
      } else if (event.type === 'plugin:enabled') {
        setEnabledPlugins(prev => new Set([...prev, event.pluginId]));
      } else if (event.type === 'plugin:disabled') {
        setEnabledPlugins(prev => {
          const next = new Set(prev);
          next.delete(event.pluginId);
          return next;
        });
      }
    });

    return removeListener;
  }, []);

  // Fetch marketplace plugins
  const loadPlugins = useCallback(async () => {
    setLoading(true);
    try {
      const marketplacePlugins = await fetchMarketplacePlugins();
      setPlugins(marketplacePlugins);
    } catch (err) {
      console.error('Failed to load marketplace:', err);
      message.error('Failed to load plugin marketplace');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  // Filter plugins by search
  const filteredPlugins = searchQuery 
    ? searchPlugins(plugins, searchQuery)
    : plugins;

  // Handle plugin installation
  const handleInstall = async (plugin: MarketplacePlugin) => {
    if (!isEd25519Supported()) {
      message.warning('Your browser does not support Ed25519 signature verification');
      return;
    }

    setInstalling(true);
    try {
      // Verify signature if present
      if (plugin.manifest.publicKey && plugin.manifest.signature) {
        const manifestStr = JSON.stringify({ ...plugin.manifest, signature: undefined });
        const result = await verifyEd25519Signature(
          plugin.manifest.signature,
          manifestStr,
          plugin.manifest.publicKey
        );
        
        if (!result.valid) {
          message.error(`Signature verification failed: ${result.error}`);
          setInstalling(false);
          return;
        }
        message.success('Plugin signature verified');
      }

      await registry.install(plugin.manifest);
      message.success(`Installed ${plugin.manifest.name}`);
      onPluginInstalled?.(plugin.manifest.id);
    } catch (err) {
      console.error('Install failed:', err);
      message.error(`Install failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setInstalling(false);
    }
  };

  // Handle plugin uninstallation
  const handleUninstall = async (pluginId: string) => {
    Modal.confirm({
      title: 'Uninstall Plugin',
      content: 'Are you sure you want to uninstall this plugin? This action cannot be undone.',
      okText: 'Uninstall',
      okType: 'danger',
      onOk: async () => {
        try {
          await registry.uninstall(pluginId);
          message.success('Plugin uninstalled');
          onPluginUninstalled?.(pluginId);
        } catch (err) {
          console.error('Uninstall failed:', err);
          message.error(`Uninstall failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      },
    });
  };

  // Handle enable/disable toggle
  const handleToggleEnabled = async (pluginId: string) => {
    try {
      if (enabledPlugins.has(pluginId)) {
        await registry.disable(pluginId);
        message.success('Plugin disabled');
      } else {
        await registry.enable(pluginId);
        message.success('Plugin enabled');
      }
    } catch (err) {
      console.error('Toggle failed:', err);
      message.error(`${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Open detail modal
  const showPluginDetail = (plugin: MarketplacePlugin) => {
    setSelectedPlugin(plugin);
    setDetailModalVisible(true);
  };

  // Render plugin card
  const renderPluginCard = (plugin: MarketplacePlugin) => {
    const isInstalled = installedPlugins.has(plugin.manifest.id);
    const isEnabled = enabledPlugins.has(plugin.manifest.id);
    const isBuiltIn = plugin.manifest.builtIn;

    return (
      <Card
        key={plugin.manifest.id}
        size="small"
        className="plugin-card"
        actions={[
          isInstalled ? (
            <Tooltip key="manage" title={isBuiltIn ? "Built-in plugin" : "Manage plugin"}>
              <Button 
                type="text" 
                size="small"
                onClick={() => showPluginDetail(plugin)}
              >
                Manage
              </Button>
            </Tooltip>
          ) : (
            <Tooltip key="install" title={plugin.manifest.signature ? "Install (signature will be verified)" : "Install"}>
              <Button 
                type="text" 
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleInstall(plugin)}
                loading={installing}
              >
                Install
              </Button>
            </Tooltip>
          ),
        ]}
      >
        <Card.Meta
          title={
            <Space>
              <span>{plugin.manifest.name}</span>
              {plugin.manifest.signature && (
                <Tooltip title="Cryptographically signed">
                  <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
                </Tooltip>
              )}
              {isInstalled && (
                <Tag color={isEnabled ? 'green' : 'default'}>
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </Tag>
              )}
              {isBuiltIn && <Tag color="blue">Built-in</Tag>}
            </Space>
          }
          description={
            <div>
              <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 4 }}>
                {plugin.manifest.description}
              </Paragraph>
              <Space size="small">
                <Tag>{plugin.category}</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  v{plugin.manifest.version}
                </Text>
                {plugin.manifest.author && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    by {plugin.manifest.author}
                  </Text>
                )}
              </Space>
            </div>
          }
        />
      </Card>
    );
  };

  return (
    <div className="plugin-marketplace-panel" style={{ padding: 16 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          <InboxOutlined /> Plugin Marketplace
        </Title>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={loadPlugins}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      <Search
        placeholder="Search plugins..."
        prefix={<SearchOutlined />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ marginBottom: 16 }}
        allowClear
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading marketplace...</div>
        </div>
      ) : filteredPlugins.length === 0 ? (
        <Empty 
          description={searchQuery ? "No plugins match your search" : "No plugins available in marketplace"} 
        />
      ) : (
        <List
          grid={{ gutter: 12, xs: 1, sm: 2, md: 2, lg: 3 }}
          dataSource={filteredPlugins}
          renderItem={renderPluginCard}
        />
      )}

      {/* Plugin Detail Modal */}
      <Modal
        title={selectedPlugin?.manifest.name}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedPlugin && (
          <div>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Version">{selectedPlugin.manifest.version}</Descriptions.Item>
              <Descriptions.Item label="Author">{selectedPlugin.manifest.author}</Descriptions.Item>
              <Descriptions.Item label="Category">{selectedPlugin.category}</Descriptions.Item>
              <Descriptions.Item label="ID">{selectedPlugin.manifest.id}</Descriptions.Item>
            </Descriptions>

            <Paragraph>
              <strong>Description:</strong><br />
              {selectedPlugin.manifest.description}
            </Paragraph>

            {selectedPlugin.manifest.signature && (
              <div style={{ marginBottom: 16 }}>
                <Badge status="success" text="Cryptographically signed" />
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  This plugin includes an Ed25519 signature for integrity verification
                </Text>
              </div>
            )}

            {selectedPlugin.manifest.dependencies && Object.keys(selectedPlugin.manifest.dependencies).length > 0 && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <div>
                  <Text strong>Dependencies:</Text>
                  <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    {Object.entries(selectedPlugin.manifest.dependencies).map(([dep, version]) => (
                      <li key={dep}>{dep}@{version}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {selectedPlugin.manifest.permissions && selectedPlugin.manifest.permissions.length > 0 && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <div>
                  <Text strong>Permissions:</Text>
                  <div style={{ marginTop: 8 }}>
                    {selectedPlugin.manifest.permissions.map(perm => (
                      <Tag key={perm}>{perm}</Tag>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Divider style={{ margin: '16px 0' }} />

            <Space>
              {installedPlugins.has(selectedPlugin.manifest.id) ? (
                <>
                  <Button
                    type={enabledPlugins.has(selectedPlugin.manifest.id) ? 'default' : 'primary'}
                    icon={enabledPlugins.has(selectedPlugin.manifest.id) ? <StopOutlined /> : <CheckCircleOutlined />}
                    onClick={() => handleToggleEnabled(selectedPlugin.manifest.id)}
                  >
                    {enabledPlugins.has(selectedPlugin.manifest.id) ? 'Disable' : 'Enable'}
                  </Button>
                  {!selectedPlugin.manifest.builtIn && (
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        setDetailModalVisible(false);
                        handleUninstall(selectedPlugin.manifest.id);
                      }}
                    >
                      Uninstall
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    setDetailModalVisible(false);
                    handleInstall(selectedPlugin);
                  }}
                  loading={installing}
                >
                  Install Plugin
                </Button>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PluginMarketplacePanel;
