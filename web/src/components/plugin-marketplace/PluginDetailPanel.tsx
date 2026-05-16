// Plugin Detail Panel - Enhanced detail view with versions, downloads, ratings
import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Typography,
  Divider,
  Table,
  Rate,
  message,
  Tooltip,
  Badge,
} from 'antd';
import {
  DownloadOutlined,
  HistoryOutlined,
  StarOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { MarketplacePlugin, PluginVersion } from '../../services/plugin-registry/types';

const { Title, Text, Paragraph } = Typography;

interface PluginDetailPanelProps {
  /** The plugin to display */
  plugin: MarketplacePlugin;
  /** Whether the plugin is installed */
  isInstalled?: boolean;
  /** Whether the plugin is enabled */
  isEnabled?: boolean;
  /** Callback when enable/disable is toggled */
  onToggleEnabled?: (pluginId: string) => void;
  /** Callback when uninstall is clicked */
  onUninstall?: (pluginId: string) => void;
  /** API URL for backend integration */
  apiUrl?: string;
  /** API Key for authenticated actions */
  apiKey?: string;
}

interface VersionInfo {
  version: string;
  createdAt: string;
  changelog?: string;
  downloads: number;
}

export const PluginDetailPanel: React.FC<PluginDetailPanelProps> = ({
  plugin,
  isInstalled = false,
  isEnabled = false,
  onToggleEnabled,
  onUninstall,
  apiUrl = '/api',
  apiKey,
}) => {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRating, setUserRating] = useState(0);

  // Load version history if backend is available
  useEffect(() => {
    if (apiKey && plugin.manifest.sourceUrl) {
      loadVersionHistory();
    }
  }, [apiKey, plugin.manifest.sourceUrl]);

  const loadVersionHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/plugins/${plugin.manifest.id}/versions`, {
        headers: apiKey ? { 'X-API-Key': apiKey } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
      }
    } catch (error) {
      console.error('Failed to load version history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (value: number) => {
    if (!apiKey) {
      message.warning('API key required to submit rating');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/plugins/${plugin.manifest.id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ rating: value }),
      });

      if (response.ok) {
        setUserRating(value);
        message.success('Thank you for your rating!');
      } else {
        throw new Error('Failed to submit rating');
      }
    } catch (error) {
      console.error('Rating failed:', error);
      message.error('Failed to submit rating');
    }
  };

  const handleDownload = async () => {
    if (!apiKey) {
      message.warning('API key required to download');
      return;
    }

    try {
      const response = await fetch(
        `${apiUrl}/upload/${plugin.manifest.id}/${plugin.manifest.version}`,
        {
          headers: apiKey ? { 'X-API-Key': apiKey } : {},
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${plugin.manifest.id}-${plugin.manifest.version}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Increment download count
        await fetch(`${apiUrl}/plugins/${plugin.manifest.id}/download`, {
          method: 'POST',
          headers: apiKey ? { 'X-API-Key': apiKey } : {},
        });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download failed:', error);
      message.error('Failed to download plugin');
    }
  };

  const versionColumns = [
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      render: (version: string) => <Tag color="blue">{version}</Tag>,
    },
    {
      title: 'Release Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Downloads',
      dataIndex: 'downloads',
      key: 'downloads',
      render: (count: number) => count.toLocaleString(),
    },
    {
      title: 'Changelog',
      dataIndex: 'changelog',
      key: 'changelog',
      render: (changelog?: string) => changelog || '-',
    },
  ];

  return (
    <Card className="plugin-detail-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={4} style={{ marginBottom: 8 }}>
            {plugin.manifest.name}
            {plugin.manifest.signature && (
              <Tooltip title="Cryptographically signed">
                <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 8 }} />
              </Tooltip>
            )}
          </Title>
          <Space size="middle">
            <Text type="secondary">by {plugin.manifest.author}</Text>
            <Tag color="blue">{plugin.category}</Tag>
            {isInstalled && (
              <Badge status={isEnabled ? 'success' : 'default'} text={isEnabled ? 'Enabled' : 'Disabled'} />
            )}
          </Space>
        </div>
        
        <Space>
          {isInstalled ? (
            <>
              <Button
                icon={isEnabled ? <StopOutlined /> : <CheckCircleOutlined />}
                onClick={() => onToggleEnabled?.(plugin.manifest.id)}
              >
                {isEnabled ? 'Disable' : 'Enable'}
              </Button>
              {!plugin.manifest.builtIn && (
                <Button
                  danger
                  onClick={() => onUninstall?.(plugin.manifest.id)}
                >
                  Uninstall
                </Button>
              )}
            </>
          ) : (
            <Button type="primary" icon={<DownloadOutlined />}>
              Install
            </Button>
          )}
        </Space>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Version">{plugin.manifest.version}</Descriptions.Item>
        <Descriptions.Item label="Plugin ID">{plugin.manifest.id}</Descriptions.Item>
        <Descriptions.Item label="Downloads">
          <Space>
            <DownloadOutlined />
            {plugin.downloadCount.toLocaleString()}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Rating">
          <Space>
            <StarOutlined style={{ color: '#faad14' }} />
            {plugin.rating.toFixed(1)}
          </Space>
        </Descriptions.Item>
      </Descriptions>

      <Paragraph>
        <strong>Description:</strong>
        <br />
        {plugin.manifest.description}
      </Paragraph>

      {/* Version History */}
      <Divider style={{ margin: '16px 0' }} />
      <div style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 8 }}>
          <HistoryOutlined />
          <Text strong>Version History</Text>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={loadVersionHistory}
            loading={loading}
          />
        </Space>
        
        {versions.length > 0 ? (
          <Table
            columns={versionColumns}
            dataSource={versions}
            rowKey="version"
            size="small"
            pagination={false}
            style={{ marginTop: 8 }}
          />
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {loading ? 'Loading version history...' : 'Version history not available'}
          </Text>
        )}
      </div>

      {/* Permissions */}
      {plugin.manifest.permissions && plugin.manifest.permissions.length > 0 && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <div>
            <Text strong>Permissions:</Text>
            <div style={{ marginTop: 8 }}>
              {plugin.manifest.permissions.map(perm => (
                <Tag key={perm} color="orange">{perm}</Tag>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Dependencies */}
      {plugin.manifest.dependencies && Object.keys(plugin.manifest.dependencies).length > 0 && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <div>
            <Text strong>Dependencies:</Text>
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              {Object.entries(plugin.manifest.dependencies).map(([dep, version]) => (
                <li key={dep}>
                  <Text code>{dep}</Text>@{version}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Rate Plugin */}
      <Divider style={{ margin: '16px 0' }} />
      <div>
        <Text strong>Rate this plugin:</Text>
        <div style={{ marginTop: 8 }}>
          <Rate
            value={userRating}
            onChange={handleRate}
            disabled={!apiKey}
          />
          {!apiKey && (
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
              (Configure API key to rate)
            </Text>
          )}
        </div>
      </div>

      {/* Source Link */}
      {plugin.manifest.sourceUrl && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            <EyeOutlined /> Source: <a href={plugin.manifest.sourceUrl} target="_blank" rel="noopener noreferrer">{plugin.manifest.sourceUrl}</a>
          </Text>
        </>
      )}
    </Card>
  );
};

export default PluginDetailPanel;