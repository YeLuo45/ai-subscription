/**
 * MCP Server Panel Component
 * UI for managing MCP server connections and viewing available tools
 */

import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Switch, Space, List, Typography, Alert, Spin, Divider, Tag, Popconfirm, message, Dropdown, Empty } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, DownOutlined, HistoryOutlined } from '@ant-design/icons';
import { getMCPServerRegistry, type MCPServerConfig, type MCPTool, MCPTEMPLATES, type MCPServerTemplate } from '../services/mcp';
import { getToolCallRecords, clearHistory, type MCPToolCallRecord } from '../services/mcp/history';

const { Title, Text, Paragraph } = Typography;

interface MCPServerFormData {
  name: string;
  command: string;
  args: string;
  env: string;
  enabled: boolean;
}

export default function MCPServerPanel() {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [form] = Form.useForm<MCPServerFormData>();
  const [loading, setLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [toolsMap, setToolsMap] = useState<Record<string, MCPTool[]>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<MCPToolCallRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const registry = getMCPServerRegistry();

  useEffect(() => {
    loadServers();
  }, []);

  async function loadServers() {
    try {
      const list = registry.getServers();
      setServers(list);
    } catch (err) {
      console.error('Failed to load servers:', err);
    }
  }

  async function handleAddServer(values: MCPServerFormData) {
    try {
      setLoading(true);
      const config: MCPServerConfig = {
        id: `mcp-${Date.now()}`,
        name: values.name,
        command: values.command,
        args: values.args ? values.args.split(' ').filter(Boolean) : [],
        env: parseEnvVariables(values.env),
        enabled: values.enabled,
      };
      await registry.addServer(config);
      await loadServers();
      form.resetFields();
      message.success('MCP 服务器已添加');
    } catch (err: any) {
      message.error(`添加失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function parseEnvVariables(envStr: string): Record<string, string> {
    if (!envStr) return {};
    try {
      // Try JSON parsing first
      return JSON.parse(envStr);
    } catch {
      // Fallback to simple key=value parsing
      const result: Record<string, string> = {};
      const lines = envStr.split('\n').filter(Boolean);
      for (const line of lines) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          result[key.trim()] = valueParts.join('=').trim();
        }
      }
      return result;
    }
  }

  function formatEnvForDisplay(env: Record<string, string>): string {
    const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`);
    return lines.join('\n');
  }

  async function handleDeleteServer(id: string) {
    try {
      await registry.removeServer(id);
      await loadServers();
      const newToolsMap = { ...toolsMap };
      delete newToolsMap[id];
      setToolsMap(newToolsMap);
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

  async function handleTestConnection(server: MCPServerConfig) {
    try {
      setTestingId(server.id);
      const tools = await registry.testConnection(server.id);
      setToolsMap(prev => ({ ...prev, [server.id]: tools }));
      message.success(`连接成功，发现 ${tools.length} 个工具`);
    } catch (err: any) {
      message.error(`连接失败: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  }

  function handleTemplateSelect(template: MCPServerTemplate) {
    form.setFieldsValue({
      name: template.name,
      command: template.command,
      args: template.args.join(' '),
      env: formatEnvForDisplay(template.env),
      enabled: true,
    });
    message.success(`已选择 ${template.name} 模板`);
  }

  async function loadHistory() {
    try {
      setHistoryLoading(true);
      const records = await getToolCallRecords({ limit: 100 });
      setHistoryRecords(records);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleShowHistory() {
    setShowHistory(true);
    await loadHistory();
  }

  async function handleClearHistory() {
    try {
      await clearHistory();
      setHistoryRecords([]);
      message.success('历史记录已清除');
    } catch (err: any) {
      message.error(`清除失败: ${err.message}`);
    }
  }

  const templateMenuItems = MCPTEMPLATES.map(template => ({
    key: template.id,
    label: (
      <Space>
        <span>{template.name}</span>
        <Text type="secondary" style={{ fontSize: 12 }}>{template.description}</Text>
      </Space>
    ),
    onClick: () => handleTemplateSelect(template),
  }));

  return (
    <div style={{ maxWidth: 900 }}>
      <Card 
        title="MCP 服务器配置" 
        size="small"
        extra={
          <Space>
            <Button 
              icon={<HistoryOutlined />} 
              onClick={handleShowHistory}
              size="small"
            >
              调用历史
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadServers} size="small">刷新</Button>
          </Space>
        }
      >
        <Alert
          message="MCP (Model Context Protocol) 允许 AI 连接到外部工具服务器"
          description="使用模板快速添加，或手动配置服务器。环境变量支持 ${VAR_NAME} 占位符格式。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form form={form} layout="vertical" onFinish={handleAddServer} initialValues={{ enabled: true }}>
          <Form.Item name="name" label="服务器名称" rules={[{ required: true }]}>
            <Input placeholder="GitHub MCP Server" />
          </Form.Item>
          <Form.Item name="command" label="命令" rules={[{ required: true }]}>
            <Input placeholder="npx" />
          </Form.Item>
          <Form.Item name="args" label="参数">
            <Input placeholder="-y @anthropic/mcp-server-github" />
          </Form.Item>
          <Form.Item 
            name="env" 
            label="环境变量" 
            extra="支持 JSON 格式或每行 KEY=VALUE 格式。使用 ${VAR_NAME} 表示需要用户配置的占位符"
          >
            <Input.TextArea placeholder='{"GITHUB_TOKEN": "${GITHUB_TOKEN}"}' rows={3} />
          </Form.Item>
          <Form.Item name="enabled" valuePropName="checked" label="启用">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<PlusOutlined />}>
                添加服务器
              </Button>
              <Dropdown menu={{ items: templateMenuItems }} trigger={['click']}>
                <Button icon={<DownOutlined />}>
                  从模板添加
                </Button>
              </Dropdown>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title="已配置的服务器" size="small" style={{ marginTop: 16 }}>
        {servers.length === 0 ? (
          <Empty description="暂无配置的服务器" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={servers}
            renderItem={(server) => (
              <List.Item
                key={server.id}
                actions={[
                  <Button 
                    key="test" 
                    size="small" 
                    icon={server.id === testingId ? <Spin size="small" /> : <ApiOutlined />}
                    onClick={() => handleTestConnection(server)}
                    disabled={testingId !== null}
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
                      <Tag color={server.enabled ? 'green' : 'default'}>
                        {server.enabled ? '已启用' : '已禁用'}
                      </Tag>
                      {server.lastError && (
                        <Tag color="red">错误</Tag>
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {server.command} {server.args?.join(' ')}
                      </Text>
                      {Object.keys(server.env || {}).length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>环境变量:</Text>
                          <div style={{ marginTop: 2 }}>
                            {Object.entries(server.env).map(([key, value]) => (
                              <Tag key={key} style={{ fontSize: 11 }}>{key}: {value}</Tag>
                            ))}
                          </div>
                        </div>
                      )}
                      {toolsMap[server.id] && toolsMap[server.id].length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <Text strong>可用工具 ({toolsMap[server.id].length}):</Text>
                          <div style={{ marginTop: 4 }}>
                            {toolsMap[server.id].map(tool => (
                              <Tag key={tool.name} style={{ marginBottom: 4 }} title={tool.description}>
                                {tool.name}
                              </Tag>
                            ))}
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>工具详情:</Text>
                            <div style={{ marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                              {toolsMap[server.id].map(tool => (
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
            )}
          />
        )}
      </Card>

      <Card title="快速模板" size="small" style={{ marginTop: 16 }}>
        <Text type="secondary">点击模板自动填充上方表单：</Text>
        <Divider />
        <Space wrap size="small">
          {MCPTEMPLATES.map(template => (
            <Tag 
              key={template.id} 
              color="blue" 
              style={{ padding: '4px 12px', cursor: 'pointer' }}
              onClick={() => handleTemplateSelect(template)}
            >
              {template.name}
            </Tag>
          ))}
        </Space>
        <Divider />
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {MCPTEMPLATES.map(template => (
            <Card key={template.id} size="small" style={{ background: '#fafafa' }}>
              <Space>
                <Text strong>{template.name}</Text>
                <Tag color="geekblue">{template.command} {template.args.join(' ')}</Tag>
              </Space>
              <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0, marginTop: 4 }}>
                {template.description}
              </Paragraph>
              {Object.keys(template.env).length > 0 && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  环境变量: {Object.entries(template.env).map(([k, v]) => `${k}=${v}`).join(', ')}
                </Text>
              )}
            </Card>
          ))}
        </Space>
      </Card>

      {/* History Panel Modal */}
      {showHistory && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.5)', 
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Card 
            title="MCP 工具调用历史" 
            size="small"
            style={{ width: 800, maxHeight: '80vh', overflow: 'auto' }}
            extra={
              <Space>
                <Button size="small" onClick={loadHistory} icon={<ReloadOutlined />}>刷新</Button>
                <Popconfirm
                  title="确认清除所有历史记录？"
                  onConfirm={handleClearHistory}
                >
                  <Button size="small" danger>清除</Button>
                </Popconfirm>
                <Button size="small" onClick={() => setShowHistory(false)}>关闭</Button>
              </Space>
            }
          >
            {historyLoading ? (
              <Spin />
            ) : historyRecords.length === 0 ? (
              <Empty description="暂无调用历史" />
            ) : (
              <List
                dataSource={historyRecords}
                renderItem={(record) => (
                  <List.Item key={record.id}>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Tag>{record.serverName}</Tag>
                          <Tag color="green">{record.toolName}</Tag>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {new Date(record.timestamp).toLocaleString()}
                          </Text>
                          {record.duration && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              ({record.duration}ms)
                            </Text>
                          )}
                        </Space>
                      }
                      description={
                        <div>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            参数: {JSON.stringify(record.arguments)}
                          </Text>
                          <Paragraph 
                            type="secondary" 
                            style={{ fontSize: 11, marginTop: 4, marginBottom: 0 }}
                            ellipsis={{ rows: 2, expandable: true }}
                          >
                            结果: {JSON.stringify(record.result)}
                          </Paragraph>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}