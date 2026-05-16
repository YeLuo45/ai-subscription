/**
 * MCP Server Panel Component
 * UI for managing MCP server connections and viewing available tools
 */

import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Switch, Space, List, Typography, Alert, Spin, Divider, Tag, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, ApiOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { getMCPServerRegistry, type MCPServerConfig, type MCPTool } from '../services/mcp';

const { Title, Text } = Typography;

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

  const registry = getMCPServerRegistry();

  useEffect(() => {
    loadServers();
  }, []);

  async function loadServers() {
    try {
      const list = await registry.listServers();
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
        env: values.env ? JSON.parse(values.env) : {},
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
      const client = await registry.connect(server.id);
      const tools = await client.listTools();
      setToolsMap(prev => ({ ...prev, [server.id]: tools }));
      message.success(`连接成功，发现 ${tools.length} 个工具`);
    } catch (err: any) {
      message.error(`连接失败: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <Card 
        title="MCP 服务器配置" 
        size="small"
        extra={<Button icon={<ReloadOutlined />} onClick={loadServers}>刷新</Button>}
      >
        <Alert
          message="MCP (Model Context Protocol) 允许 AI 连接到外部工具服务器"
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
            <Input placeholder="-y @anthropic/mcp-server-github --token xxx" />
          </Form.Item>
          <Form.Item name="env" label="环境变量 (JSON)">
            <Input.TextArea placeholder='{"GITHUB_TOKEN": "xxx"}' rows={2} />
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
          <Text type="secondary">暂无配置的服务器</Text>
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
                      <Text type="secondary" style={{ fontFamily: 'monospace' }}>
                        {server.command} {server.args?.join(' ')}
                      </Text>
                      {toolsMap[server.id] && (
                        <div style={{ marginTop: 8 }}>
                          <Text strong>可用工具:</Text>
                          <div style={{ marginTop: 4 }}>
                            {toolsMap[server.id].map(tool => (
                              <Tag key={tool.name} style={{ marginBottom: 4 }}>
                                {tool.name}
                              </Tag>
                            ))}
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
        <Text type="secondary">常用 MCP 服务器配置示例：</Text>
        <Divider />
        <Space wrap>
          <Tag color="blue">GitHub</Tag>
          <Tag>npx -y @anthropic/mcp-server-github --token $GITHUB_TOKEN</Tag>
        </Space>
        <div style={{ marginTop: 8 }}>
          <Space wrap>
            <Tag color="green">Filesystem</Tag>
            <Tag>npx -y @anthropic/mcp-server-filesystem --allowed-directory /path</Tag>
          </Space>
        </div>
        <div style={{ marginTop: 8 }}>
          <Space wrap>
            <Tag color="orange">Slack</Tag>
            <Tag>npx -y @anthropic/mcp-server-slack --token $SLACK_TOKEN</Tag>
          </Space>
        </div>
      </Card>
    </div>
  );
}
