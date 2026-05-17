/**
 * Advanced Explorer Page
 * AI Agent Orchestration + Custom Workflow Canvas + Visual Pipeline Design
 */

import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import {
  Layout,
  Card,
  Tabs,
  Button,
  Space,
  Typography,
  Tag,
  Table,
  Switch,
  Modal,
  Form,
  Input,
  Select,
  message,
  Empty,
  Spin,
  Tooltip,
  Drawer,
  List,
  Avatar,
  Badge,
  Progress,
  Divider,
  Alert,
} from 'antd';
import {
  ExperimentOutlined,
  RobotOutlined,
  NodeIndexOutlined,
  ApiOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  SyncOutlined,
  SettingOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PipelineDashboard } from '../components/pipeline/PipelineDashboard';
import { PipelineUI } from '../components/pipeline/PipelineUI';
import { WorkflowListPanel } from '../components/workflow/WorkflowListPanel';

// ============================================================
// Types
// ============================================================

interface Agent {
  id: string;
  name: string;
  role: 'coordinator' | 'extractor' | 'summarizer' | 'tagger' | 'translator' | 'critic' | 'custom';
  status: 'idle' | 'pending' | 'running' | 'completed' | 'failed';
  score?: number;
  lastRun?: number;
  config: Record<string, any>;
}

interface PipelineNode {
  id: string;
  type: 'agent' | 'condition' | 'action' | 'merge' | 'router';
  label: string;
  position: { x: number; y: number };
  config: Record<string, any>;
}

interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface ExplorerWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  enabled: boolean;
  createdAt: number;
}

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

// ============================================================
// Sub-Components
// ============================================================

// Agent Registry Panel
const AgentRegistryPanel: React.FC<{
  agents: Agent[];
  onSelect: (agent: Agent) => void;
  onConfigure: (agent: Agent) => void;
}> = ({ agents, onSelect, onConfigure }) => {
  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'processing';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getRoleColor = (role: Agent['role']) => {
    const colors: Record<string, string> = {
      coordinator: 'purple',
      extractor: 'blue',
      summarizer: 'cyan',
      tagger: 'green',
      translator: 'orange',
      critic: 'red',
      custom: 'default',
    };
    return colors[role] || 'default';
  };

  const columns: ColumnsType<Agent> = [
    {
      title: 'Agent',
      key: 'name',
      render: (_, record) => (
        <Space>
          <Avatar
            size="small"
            icon={<RobotOutlined />}
            style={{ backgroundColor: getRoleColor(record.role) === 'default' ? '#999' : undefined }}
          />
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Tag color={getRoleColor(record.role)} style={{ marginTop: 4 }}>{record.role}</Tag>
          </div>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Agent['status']) => (
        <Badge status={getStatusColor(status)} text={status} />
      ),
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (score?: number) => score !== undefined ? (
        <Tag color={score >= 70 ? 'green' : score >= 50 ? 'orange' : 'red'}>{score}</Tag>
      ) : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Run Agent">
            <Button
              type="text"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => onSelect(record)}
              disabled={record.status === 'running'}
            />
          </Tooltip>
          <Tooltip title="Configure">
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => onConfigure(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card size="small" title="Agent Registry">
      <Table
        columns={columns}
        dataSource={agents}
        rowKey="id"
        size="small"
        pagination={false}
        style={{ maxHeight: 400, overflow: 'auto' }}
      />
    </Card>
  );
};

// Workflow Canvas Component
const WorkflowCanvas: React.FC<{
  workflow: ExplorerWorkflow;
  onUpdate: (workflow: ExplorerWorkflow) => void;
}> = ({ workflow, onUpdate }) => {
  const [selectedNode, setSelectedNode] = useState<PipelineNode | null>(null);

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Deselect on canvas click
    if (e.target === e.currentTarget) {
      setSelectedNode(null);
    }
  };

  const renderNode = (node: PipelineNode) => {
    const getNodeStyle = () => {
      switch (node.type) {
        case 'agent':
          return { background: '#1890ff', borderRadius: 8 };
        case 'condition':
          return { background: '#faad14', borderRadius: 4 };
        case 'action':
          return { background: '#52c41a', borderRadius: 8 };
        case 'merge':
          return { background: '#722ed1', borderRadius: 50 };
        case 'router':
          return { background: '#eb2f96', borderRadius: 4 };
        default:
          return { background: '#999', borderRadius: 8 };
      }
    };

    return (
      <div
        key={node.id}
        style={{
          position: 'absolute',
          left: node.position.x,
          top: node.position.y,
          padding: '12px 16px',
          minWidth: 120,
          color: 'white',
          cursor: 'move',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          ...getNodeStyle(),
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNode(node);
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 13 }}>{node.label}</div>
        <div style={{ fontSize: 11, opacity: 0.8 }}>{node.type}</div>
      </div>
    );
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <NodeIndexOutlined />
          <span>Workflow Canvas</span>
          <Tag>{workflow.nodes.length} nodes</Tag>
        </Space>
      }
      extra={
        <Space>
          <Button size="small" icon={<PlusOutlined />}>Add Node</Button>
          <Button size="small" icon={<ApiOutlined />}>Auto Layout</Button>
        </Space>
      }
      style={{ height: '100%' }}
    >
      <div
        style={{
          height: 400,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: 8,
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={handleCanvasClick}
      >
        {/* Grid Pattern */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.1,
          }}
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Nodes */}
        {workflow.nodes.map(renderNode)}

        {/* Empty State */}
        {workflow.nodes.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <Empty description="Drag agents here to build workflow" />
          </div>
        )}

        {/* Selected Node Panel */}
        {selectedNode && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              background: 'rgba(0,0,0,0.8)',
              borderRadius: 8,
              padding: 16,
              minWidth: 240,
            }}
          >
            <Text strong style={{ color: 'white' }}>Node: {selectedNode.label}</Text>
            <div style={{ marginTop: 8 }}>
              <Tag>{selectedNode.type}</Tag>
            </div>
            <div style={{ marginTop: 8 }}>
              <Button size="small" icon={<EditOutlined />}>Edit</Button>
              <Button size="small" danger icon={<DeleteOutlined />} style={{ marginLeft: 8 }}>Delete</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

// Pipeline Visualizer
const PipelineVisualizer: React.FC<{
  articleId?: string;
  onProcess?: (articleId: string) => AsyncGenerator<any, void, unknown>;
}> = ({ articleId, onProcess }) => {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <Card
      size="small"
      title={
        <Space>
          <NodeIndexOutlined />
          <span>Pipeline Visualizer</span>
        </Space>
      }
      extra={
        <Button size="small" onClick={() => setShowDashboard(true)}>
          Open Dashboard
        </Button>
      }
    >
      <Tabs
        items={[
          {
            key: 'flow',
            label: 'Flow View',
            children: (
              <div style={{ padding: 20, textAlign: 'center', background: '#f5f5f5', borderRadius: 8 }}>
                <Text type="secondary">Select an article to visualize its processing pipeline</Text>
                <div style={{ marginTop: 16 }}>
                  <Input.Search
                    placeholder="Enter article ID"
                    enterButton="Load"
                    style={{ width: 300 }}
                  />
                </div>
              </div>
            ),
          },
          {
            key: 'stages',
            label: 'Stage Output',
            children: (
              <PipelineUI articleId={articleId} onProcess={onProcess} />
            ),
          },
        ]}
      />

      <PipelineDashboard open={showDashboard} onClose={() => setShowDashboard(false)} />
    </Card>
  );
};

// Execution History
const ExecutionHistory: React.FC<{
  workflowId: string;
}> = ({ workflowId }) => {
  // Placeholder - would integrate with workflowDB
  const executions = [];

  const columns: ColumnsType<any> = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (ts: number) => new Date(ts).toLocaleString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'green' : status === 'failed' ? 'red' : 'blue'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (ms?: number) => ms ? `${ms}ms` : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Button type="text" size="small" icon={<CheckCircleOutlined />} />
      ),
    },
  ];

  return (
    <Card size="small" title="Execution History">
      {executions.length === 0 ? (
        <Empty description="No executions yet" />
      ) : (
        <Table columns={columns} dataSource={executions} rowKey="id" size="small" />
      )}
    </Card>
  );
};

// ============================================================
// Main Component
// ============================================================

const DEFAULT_AGENTS: Agent[] = [
  { id: 'coordinator', name: 'Coordinator', role: 'coordinator', status: 'idle', config: { timeout: 30000 } },
  { id: 'extractor', name: 'Extractor', role: 'extractor', status: 'idle', config: { model: 'auto' } },
  { id: 'summarizer', name: 'Summarizer', role: 'summarizer', status: 'idle', config: { length: 'medium' } },
  { id: 'tagger', name: 'Tagger', role: 'tagger', status: 'idle', config: { maxTags: 5 } },
  { id: 'translator', name: 'Translator', role: 'translator', status: 'idle', config: { targetLang: 'zh' } },
  { id: 'critic', name: 'Critic', role: 'critic', status: 'idle', config: { threshold: 50 } },
];

const DEFAULT_WORKFLOW: ExplorerWorkflow = {
  id: 'wf_default',
  name: 'Article Processing Pipeline',
  description: 'Default multi-agent pipeline for article processing',
  nodes: [
    { id: 'n1', type: 'agent', label: 'Coordinator', position: { x: 200, y: 20 }, config: {} },
    { id: 'n2', type: 'agent', label: 'Extractor', position: { x: 50, y: 120 }, config: {} },
    { id: 'n3', type: 'agent', label: 'Summarizer', position: { x: 200, y: 120 }, config: {} },
    { id: 'n4', type: 'agent', label: 'Tagger', position: { x: 350, y: 120 }, config: {} },
    { id: 'n5', type: 'merge', label: 'Merge', position: { x: 200, y: 220 }, config: {} },
    { id: 'n6', type: 'agent', label: 'Critic', position: { x: 200, y: 320 }, config: {} },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', label: 'start' },
    { id: 'e2', source: 'n1', target: 'n3', label: 'start' },
    { id: 'e3', source: 'n1', target: 'n4', label: 'start' },
    { id: 'e4', source: 'n2', target: 'n5' },
    { id: 'e5', source: 'n3', target: 'n5' },
    { id: 'e6', source: 'n4', target: 'n5' },
    { id: 'e7', source: 'n5', target: 'n6', label: 'evaluate' },
  ],
  enabled: true,
  createdAt: Date.now(),
};

export default function Explorer() {
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [workflow, setWorkflow] = useState<ExplorerWorkflow>(DEFAULT_WORKFLOW);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [agentForm] = Form.useForm();

  // Handle agent selection (run)
  const handleAgentSelect = useCallback((agent: Agent) => {
    setAgents(prev => prev.map(a =>
      a.id === agent.id ? { ...a, status: 'running' as const } : a
    ));

    // Simulate agent run
    setTimeout(() => {
      setAgents(prev => prev.map(a =>
        a.id === agent.id ? {
          ...a,
          status: 'completed' as const,
          score: Math.floor(Math.random() * 30) + 70,
          lastRun: Date.now()
        } : a
      ));
      message.success(`Agent ${agent.name} completed successfully`);
    }, 2000);
  }, []);

  // Handle agent configuration
  const handleAgentConfigure = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
    agentForm.setFieldsValue({
      name: agent.name,
      role: agent.role,
      ...agent.config,
    });
    setConfigDrawerOpen(true);
  }, [agentForm]);

  // Save agent configuration
  const handleSaveAgentConfig = useCallback(async () => {
    try {
      const values = await agentForm.validateFields();
      if (!selectedAgent) return;

      const updatedAgent: Agent = {
        ...selectedAgent,
        name: values.name,
        role: values.role,
        config: {
          model: values.model,
          timeout: values.timeout,
          length: values.length,
          maxTags: values.maxTags,
          targetLang: values.targetLang,
          threshold: values.threshold,
        },
      };

      setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
      setConfigDrawerOpen(false);
      message.success('Agent configuration saved');
    } catch (err) {
      message.error('Please check form values');
    }
  }, [agentForm, selectedAgent]);

  // Handle workflow update
  const handleWorkflowUpdate = useCallback((updatedWorkflow: ExplorerWorkflow) => {
    setWorkflow(updatedWorkflow);
    message.info('Workflow updated');
  }, []);

  // Tab items
  const tabItems = [
    {
      key: 'agents',
      label: (
        <Badge count={agents.filter(a => a.status === 'running').length} offset={[10, 0]}>
          <Space><RobotOutlined /> Agents</Space>
        </Badge>
      ),
      children: (
        <AgentRegistryPanel
          agents={agents}
          onSelect={handleAgentSelect}
          onConfigure={handleAgentConfigure}
        />
      ),
    },
    {
      key: 'canvas',
      label: (
        <Space><NodeIndexOutlined /> Canvas</Space>
      ),
      children: (
        <WorkflowCanvas workflow={workflow} onUpdate={handleWorkflowUpdate} />
      ),
    },
    {
      key: 'pipeline',
      label: (
        <Space><ApiOutlined /> Pipeline</Space>
      ),
      children: (
        <PipelineVisualizer />
      ),
    },
    {
      key: 'workflow',
      label: (
        <Space><ExperimentOutlined /> Workflows</Space>
      ),
      children: (
        <WorkflowListPanel
          onCreateNew={() => message.info('Create workflow dialog would open')}
          onEditWorkflow={(wf) => message.info(`Edit workflow: ${wf.name}`)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Card
        title={
          <Space>
            <ExperimentOutlined style={{ color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0 }}>Advanced Exploration</Title>
            <Tag color="blue">AI Agent Orchestration</Tag>
            <Tag color="green">Custom Workflow</Tag>
            <Tag color="purple">Visual Pipeline</Tag>
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Sync agents with server">
              <Button icon={<SyncOutlined />} />
            </Tooltip>
            <Button type="primary" icon={<PlayCircleOutlined />}>
              Run Pipeline
            </Button>
          </Space>
        }
      >
        <Alert
          message="AI Agent Orchestration + Custom Workflow Canvas + Visual Pipeline Design"
          description="Build complex multi-agent pipelines with visual workflow editor, monitor agent execution in real-time, and evaluate results with AI-powered critic."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Tabs items={tabItems} defaultActiveKey="agents" />

        {/* Agent Configuration Drawer */}
        <Drawer
          title={`Configure: ${selectedAgent?.name || 'Agent'}`}
          placement="right"
          width={400}
          open={configDrawerOpen}
          onClose={() => setConfigDrawerOpen(false)}
          extra={
            <Button type="primary" onClick={handleSaveAgentConfig}>
              Save Configuration
            </Button>
          }
        >
          <Form form={agentForm} layout="vertical">
            <Form.Item name="name" label="Agent Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>

            <Form.Item name="role" label="Role" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="coordinator">Coordinator</Select.Option>
                <Select.Option value="extractor">Extractor</Select.Option>
                <Select.Option value="summarizer">Summarizer</Select.Option>
                <Select.Option value="tagger">Tagger</Select.Option>
                <Select.Option value="translator">Translator</Select.Option>
                <Select.Option value="critic">Critic</Select.Option>
                <Select.Option value="custom">Custom</Select.Option>
              </Select>
            </Form.Item>

            <Divider>Configuration</Divider>

            <Form.Item name="model" label="Model (for Extractor)">
              <Select allowClear>
                <Select.Option value="auto">Auto-select</Select.Option>
                <Select.Option value="gpt-4">GPT-4</Select.Option>
                <Select.Option value="claude-3">Claude-3</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="timeout" label="Timeout (ms)">
              <Input type="number" />
            </Form.Item>

            <Form.Item name="length" label="Summary Length (for Summarizer)">
              <Select>
                <Select.Option value="short">Short</Select.Option>
                <Select.Option value="medium">Medium</Select.Option>
                <Select.Option value="long">Long</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="maxTags" label="Max Tags (for Tagger)">
              <Input type="number" min={1} max={20} />
            </Form.Item>

            <Form.Item name="targetLang" label="Target Language (for Translator)">
              <Select>
                <Select.Option value="zh">Chinese</Select.Option>
                <Select.Option value="en">English</Select.Option>
                <Select.Option value="ja">Japanese</Select.Option>
                <Select.Option value="ko">Korean</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="threshold" label="Score Threshold (for Critic)">
              <Input type="number" min={0} max={100} />
            </Form.Item>
          </Form>
        </Drawer>
      </Card>
    </div>
  );
}