/**
 * MCP Client Panel Component
 * UI for connecting to external MCP servers (GitHub, Jira, Figma)
 * and viewing available tools
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, Button, Switch, Space, List, Typography, Alert, Spin, Divider, Tag, Popconfirm, message, Dropdown, Empty, Select, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, DownOutlined, CloudOutlined, SettingOutlined, DisconnectOutlined } from '@ant-design/icons';
import type { MCPServerConfig, MCPTool, MCPClientState } from '../services/mcp/types';
import { getMCPServerRegistry } from '../services/mcp/registry';
import type { GitHubRepoInfo, GitHubSearchResult } from '../services/mcp/adapters/github-adapter';
import { createGitHubAdapter, DEFAULT_GITHUB_MCP_URL } from '../services/mcp/adapters/github-adapter';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface MCPClientFormData {
  serverType: 'github' | 'jira' | 'figma' | 'custom';
  name: string;
  url: string;
  authToken: string;
  enabled: boolean;
}

interface ServerStatus {
  serverId: string;
  state: MCPClientState;
  error?: string;
  availableTools: MCPTool[];
}

export default function MCPClientPanel() {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [form] = Form.useForm<MCPClientFormData>();
  const [loading, setLoading] = useState(false);
  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());
  const [serverStatuses, setServerStatuses] = useState<Record<string, ServerStatus>>({});
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const registry = getMCPServerRegistry();

  useEffect(() => {
    loadServers();
  }, []);

  async function loadServers() {
    try {
      const list = registry.getServers();
      setServers(list);
      
      // Load status for each server
      const statuses: Record<string, ServerStatus> = {};
      for (const server of list) {
        const status = registry.getServerStatus(server.id);
        statuses[server.id] = {
          serverId: server.id,
          state: status?.state || 'disconnected',
          error: status?.error,
          availableTools: status?.availableTools || [],
        };
      }
      setServerStatuses(statuses);
    } catch (err) {
      console.error('Failed to load servers:', err);
    }
  }

  async function handleAddServer(values: MCPClientFormData) {
    try {
      setLoading(true);
      
      // Determine actual URL based on server type
      let actualUrl = values.url;
      let actualName = values.name;
      
      if (values.serverType === 'github' && !values.url) {
        actualUrl = DEFAULT_GITHUB_MCP_URL;
        actualName = actualName || 'GitHub MCP';
      } else if (values.serverType === 'jira') {
        actualUrl = actualUrl || 'https://your-jira.atlassian.com/jsonrpc';
        actualName = actualName || 'Jira MCP';
      } else if (values.serverType === 'figma') {
        actualUrl = actualUrl || 'https://your-figma.com/jsonrpc';
        actualName = actualName || 'Figma MCP';
      }

      const config: MCPServerConfig = {
        id: `mcp-client-${Date.now()}`,
        name: actualName,
        command: values.serverType, // Store server type in command field
        args: [],
        env: {},
        authToken: values.authToken || undefined,
        enabled: values.enabled,
      };

      await registry.addServer(config);
      await loadServers();
      form.resetFields();
      message.success('MCP Client 服务器已添加');
    } catch (err: any) {
      message.error(`添加失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteServer(id: string) {
    try {
      await registry.removeServer(id);
      await loadServers();
      message.success('已删除');
    } catch (err: any) {
      message.error(`删除失败: ${err.message}`);
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    try {
      await registry.updateServer(id, { enabled });
      await loadServers();
    } catch (err: any) {
      message.error(`更新失败: ${err.message}`);
    }
  }

  async function handleConnect(server: MCPServerConfig) {
    try {
      setConnectingIds(prev => new Set(prev).add(server.id));
      
      // For HTTP-based servers, use HTTP transport directly
      if (server.command === 'github') {
        const adapter = createGitHubAdapter({
          url: DEFAULT_GITHUB_MCP_URL,
          authToken: server.authToken,
        });
        await adapter.connect();
        
        setServerStatuses(prev => ({
          ...prev,
          [server.id]: {
            serverId: server.id,
            state: 'connected',
            availableTools: adapter.getTools(),
          },
        }));
        message.success(`已连接到 ${server.name}`);
      } else {
        // Use registry for other server types
        await registry.connectServer(server.id);
        await loadServers();
        message.success(`已连接到 ${server.name}`);
      }
    } catch (err: any) {
      message.error(`连接失败: ${err.message}`);
      setServerStatuses(prev => ({
        ...prev,
        [server.id]: {
          serverId: server.id,
          state: 'error',
          error: err.message,
          availableTools: [],
        },
      }));
    } finally {
      setConnectingIds(prev => {
        const next = new Set(prev);
        next.delete(server.id);
        return next;
      });
    }
  }

  async function handleDisconnect(server: MCPServerConfig) {
    try {
      await registry.disconnectServer(server.id);
      setServerStatuses(prev => ({
        ...prev,
        [server.id]: {
          serverId: server.id,
          state: 'disconnected',
          availableTools: [],
        },
      }));
      message.success(`已断开 ${server.name}`);
    } catch (err: any) {
      message.error(`断开失败: ${err.message}`);
    }
  }

  async function handleTestConnection(server: MCPServerConfig) {
    try {
      setConnectingIds(prev => new Set(prev).add(server.id));
      
      // Simulate test by attempting to connect
      await registry.testConnection(server.id);
      
      message.success('连接测试成功');
    } catch (err: any) {
      message.error(`连接测试失败: ${err.message}`);
    } finally {
      setConnectingIds(prev => {
        const next = new Set(prev);
        next.delete(server.id);
        return next;
      });
    }
  }

  function getStatusIcon(state: MCPClientState) {
    switch (state) {
      case 'connected':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'connecting':
        return <Spin size="small" />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <CloseCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  }

  function getStatusText(state: MCPClientState): string {
    switch (state) {
      case 'connected':
        return '已连接';
      case 'connecting':
        return '连接中...';
      case 'error':
        return '错误';
      default:
        return '未连接';
    }
  }

  function handleServerTypeChange(serverType: string) {
    // Auto-fill URL when server type changes
    if (serverType === 'github') {
      form.setFieldsValue({ url: DEFAULT_GITHUB_MCP_URL });
    }
  }

  // Predefined server types for dropdown
  const serverTypeOptions = [
    { type: 'github', name: 'GitHub', url: DEFAULT_GITHUB_MCP_URL, description: '搜索仓库和获取仓库信息' },
    { type: 'jira', name: 'Jira', url: 'https://your-jira.atlassian.com/jsonrpc', description: '项目管理工具' },
    { type: 'figma', name: 'Figma', url: 'https://your-figma.com/jsonrpc', description: '设计协作工具' },
    { type: 'custom', name: '自定义', url: '', description: '连接其他 MCP Server' },
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <Card 
        title="MCP Client 配置" 
        size="small"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadServers} size="small">刷新</Button>
          </Space>
        }
      >
        <Alert
          message="MCP Client 允许连接到外部 MCP 服务器（GitHub、Jira、Figma）"
          description="使用客户端模式连接到提供 HTTP 传输的 MCP 服务器。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form form={form} layout="vertical" onFinish={handleAddServer} initialValues={{ serverType: 'github', enabled: true }}>
          <Form.Item name="serverType" label="服务器类型" rules={[{ required: true }]}>
            <Select placeholder="选择服务器类型" onChange={handleServerTypeChange}>
              {serverTypeOptions.map(opt => (
                <Option key={opt.type} value={opt.type}>
                  <Space>
                    <span>{opt.name}</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>{opt.description}</Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="name" label="服务器名称" rules={[{ required: true }]}>
            <Input placeholder="My GitHub MCP" />
          </Form.Item>
          <Form.Item name="url" label="服务器 URL">
            <Input placeholder="https://mcp.github.com/jsonrpc" />
          </Form.Item>
          <Form.Item 
            name="authToken" 
            label="认证 Token" 
            extra="GitHub Personal Access Token 或其他认证 Token"
          >
            <Input.Password placeholder="Bearer token or API key" />
          </Form.Item>
          <Form.Item name="enabled" valuePropName="checked" label="启用">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<PlusOutlined />}>
              添加服务器
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="已配置的服务器" size="small" style={{ marginTop: 16 }}>
        {servers.length === 0 ? (
          <Empty description="暂无配置的服务器" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={servers}
            renderItem={(server) => {
              const status = serverStatuses[server.id] || { state: 'disconnected' as MCPClientState, availableTools: [] };
              const isConnecting = connectingIds.has(server.id);
              
              return (
                <List.Item
                  key={server.id}
                  actions={[
                    status.state === 'connected' ? (
                      <Button 
                        key="disconnect" 
                        size="small" 
                        icon={<DisconnectOutlined />}
                        onClick={() => handleDisconnect(server)}
                        danger
                      >
                        断开
                      </Button>
                    ) : (
                      <Button 
                        key="connect" 
                        size="small" 
                        icon={isConnecting ? <Spin size="small" /> : <CloudOutlined />}
                        onClick={() => handleConnect(server)}
                        disabled={isConnecting}
                      >
                        连接
                      </Button>
                    ),
                    <Button 
                      key="test" 
                      size="small" 
                      icon={<ApiOutlined />}
                      onClick={() => handleTestConnection(server)}
                      disabled={isConnecting}
                    >
                      测试
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="确认删除此服务器？"
                      onConfirm={() => handleDeleteServer(server.id)}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        {server.name}
                        {getStatusIcon(status.state)}
                        <Text type="secondary">{getStatusText(status.state)}</Text>
                        <Tag color={server.enabled ? 'green' : 'default'}>
                          {server.enabled ? '已启用' : '已禁用'}
                        </Tag>
                        <Tag color="blue">{server.command}</Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {server.command === 'github' ? DEFAULT_GITHUB_MCP_URL : server.command}
                        </Text>
                        {status.error && (
                          <div style={{ marginTop: 4 }}>
                            <Text type="danger" style={{ fontSize: 12 }}>{status.error}</Text>
                          </div>
                        )}
                        {status.availableTools.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <Text strong>可用工具 ({status.availableTools.length}):</Text>
                            <div style={{ marginTop: 4 }}>
                              {status.availableTools.map(tool => (
                                <Tag key={tool.name} style={{ marginBottom: 4 }} title={tool.description}>
                                  {tool.name}
                                </Tag>
                              ))}
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>工具详情:</Text>
                              <div style={{ marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                                {status.availableTools.map(tool => (
                                  <div key={tool.name} style={{ marginBottom: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                                    <Text strong style={{ fontSize: 12 }}>{tool.name}</Text>
                                    <Paragraph type="secondary" style={{ fontSize: 11, marginBottom: 4 }}>
                                      {tool.description}
                                    </Paragraph>
                                    {tool.inputSchema && Object.keys(tool.inputSchema).length > 0 && (
                                      <Text type="secondary" style={{ fontSize: 10 }} code>
                                        {JSON.stringify(tool.inputSchema)}
                                      </Text>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    }
                  />
                  <Switch 
                    checked={server.enabled} 
                    onChange={(checked) => handleToggle(server.id, checked)} 
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>

      <Card title="快速开始" size="small" style={{ marginTop: 16 }}>
        <Paragraph type="secondary">
          1. 选择服务器类型（GitHub、Jira、Figma 或自定义）<br/>
          2. 填写服务器名称和认证 Token<br/>
          3. 点击"连接"按钮建立连接<br/>
          4. 连接成功后可在 AI 分析中使用 MCP 工具
        </Paragraph>
        <Divider />
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div>
            <Text strong>GitHub MCP</Text>
            <Tag color="green" style={{ marginLeft: 8 }}>推荐</Tag>
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
              提供搜索仓库和获取仓库信息功能。需要在 GitHub 设置生成 Personal Access Token。
            </Paragraph>
          </div>
        </Space>
      </Card>
    </div>
  );
}