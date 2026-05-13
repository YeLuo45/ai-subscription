/**
 * Agent Registration Panel Component
 * UI for registering, editing, testing custom agents
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  message,
  Card,
  Typography,
  Divider,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getAgentRegistry, type CustomAgentDefinition } from '../../services/multi-agent/agent-registry';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface AgentFormData {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  executeCode: string;
  validateCode?: string;
}

const CAPABILITY_OPTIONS = [
  { value: 'summarization', label: 'Summarization' },
  { value: 'translation', label: 'Translation' },
  { value: 'extraction', label: 'Extraction' },
  { value: 'tagging', label: 'Tagging' },
  { value: 'criticism', label: 'Criticism' },
  { value: 'custom', label: 'Custom' },
];

export const AgentRegistrationPanel: React.FC = () => {
  const [agents, setAgents] = useState<CustomAgentDefinition[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAgent, setEditingAgent] = useState<CustomAgentDefinition | null>(null);
  const [form] = Form.useForm<AgentFormData>();
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState<string>('');
  const [testLoading, setTestLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    const registry = getAgentRegistry();
    await registry.loadFromStorage();
    setAgents(registry.listAgents());
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleCreate = () => {
    setEditingAgent(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (agent: CustomAgentDefinition) => {
    setEditingAgent(agent);
    form.setFieldsValue({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      capabilities: agent.capabilities,
      executeCode: agent.executeCode,
      validateCode: agent.validateCode || '',
    });
    setModalVisible(true);
  };

  const handleDelete = async (agentId: string) => {
    const registry = getAgentRegistry();
    registry.unregister(agentId);
    await registry.saveToStorage();
    await loadAgents();
    message.success('Agent deleted');
  };

  const handleSubmit = async (values: AgentFormData) => {
    const registry = getAgentRegistry();

    const agentDef: CustomAgentDefinition = {
      id: values.id,
      name: values.name,
      description: values.description,
      capabilities: values.capabilities,
      executeCode: values.executeCode,
      validateCode: values.validateCode || undefined,
    };

    registry.register(agentDef);
    await registry.saveToStorage();
    await loadAgents();

    setModalVisible(false);
    message.success(editingAgent ? 'Agent updated' : 'Agent registered');
  };

  const handleTest = async () => {
    if (!selectedAgentId || !testInput.trim()) {
      message.warning('Select an agent and enter test input');
      return;
    }

    setTestLoading(true);
    setTestOutput('');

    try {
      const registry = getAgentRegistry();
      const input = JSON.parse(testInput);
      const result = await registry.execute(selectedAgentId, input);
      setTestOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setTestOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTestLoading(false);
    }
  };

  const columns: ColumnsType<CustomAgentDefinition> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space>
          <CodeOutlined />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => <Text code>{id}</Text>,
    },
    {
      title: 'Capabilities',
      dataIndex: 'capabilities',
      key: 'capabilities',
      render: (caps: string[]) => (
        <>
          {caps.map(cap => (
            <Tag key={cap} color="blue">{cap}</Tag>
          ))}
        </>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: CustomAgentDefinition) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => setSelectedAgentId(record.id)}
            title="Select for testing"
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Title level={5}>Custom Agent Registration</Title>
          <Text type="secondary">
            Register custom agents with JavaScript code for dynamic execution in the pipeline.
          </Text>
        </div>

        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Register Agent
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={agents}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: 'No custom agents registered yet' }}
        />

        <Divider />

        <div>
          <Title level={5}>Test Custom Agent</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Select
              placeholder="Select agent to test"
              style={{ width: 300 }}
              value={selectedAgentId}
              onChange={setSelectedAgentId}
              options={agents.map(a => ({ value: a.id, label: a.name }))}
            />
            <TextArea
              placeholder='Enter test input as JSON, e.g., {"text": "Hello world"}'
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              rows={4}
              style={{ fontFamily: 'monospace' }}
            />
            <Button
              type="default"
              icon={<PlayCircleOutlined />}
              onClick={handleTest}
              loading={testLoading}
            >
              Run Agent
            </Button>
            {testOutput && (
              <Card size="small" style={{ background: '#f5f5f5' }}>
                <Text strong>Output:</Text>
                <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
                  {testOutput}
                </pre>
              </Card>
            )}
          </Space>
        </div>
      </Space>

      <Modal
        title={editingAgent ? 'Edit Agent' : 'Register New Agent'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        <Alert
          message="Code Execution"
          description="The execute code is run with eval(). Only use trusted code."
          type="warning"
          style={{ marginBottom: 16 }}
        />
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="id"
            label="Agent ID"
            rules={[
              { required: true, message: 'Enter unique agent ID' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: 'Only alphanumeric, - and _ allowed' },
            ]}
          >
            <Input placeholder="e.g., my-custom-agent" disabled={!!editingAgent} />
          </Form.Item>

          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Enter agent name' }]}
          >
            <Input placeholder="e.g., My Custom Agent" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Enter description' }]}
          >
            <Input.TextArea placeholder="Describe what this agent does..." rows={2} />
          </Form.Item>

          <Form.Item
            name="capabilities"
            label="Capabilities"
            rules={[{ required: true, message: 'Select at least one capability' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select capabilities"
              options={CAPABILITY_OPTIONS}
            />
          </Form.Item>

          <Form.Item
            name="executeCode"
            label="Execute Function Body"
            rules={[{ required: true, message: 'Enter execute function code' }]}
            extra="The function body that receives `input` and returns a Promise. Example: return `Hello ${input.text}`;"
          >
            <TextArea
              placeholder={`// Example:
const result = { processed: true, data: input };
return result;`}
              rows={8}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item
            name="validateCode"
            label="Validation Function (Optional)"
            extra="Function body that receives `input` and returns boolean"
          >
            <TextArea
              placeholder={`// Example:
return typeof input.text === 'string';`}
              rows={3}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingAgent ? 'Update' : 'Register'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AgentRegistrationPanel;
