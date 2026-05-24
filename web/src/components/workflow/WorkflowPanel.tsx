/**
 * WorkflowPanel Component
 * Sidebar panel for managing workflows
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, List, Modal, Form, Input, Select, Space, Tag, message, Empty, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, EditOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { WorkflowDefinition } from '../services/workflow-canvas/types';
import { getAllWorkflows, saveWorkflow, deleteWorkflow } from '../services/workflow-canvas/storage';
import WorkflowCanvas from './WorkflowCanvas';

interface WorkflowPanelProps {
  onClose?: () => void;
}

export default function WorkflowPanel({ onClose }: WorkflowPanelProps) {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [runningNodeId, setRunningNodeId] = useState<string | null>(null);

  // Current workflow editing state
  const [currentNodes, setCurrentNodes] = useState<WorkflowDefinition['nodes']>([]);
  const [currentEdges, setCurrentEdges] = useState<WorkflowDefinition['edges']>([]);

  // Load workflows on mount
  useEffect(() => {
    getAllWorkflows().then(loaded => {
      setWorkflows(loaded);
      if (loaded.length > 0) {
        setSelectedWorkflowId(loaded[0].id);
        setCurrentNodes(loaded[0].nodes);
        setCurrentEdges(loaded[0].edges);
      }
    });
  }, []);

  // Handle workflow selection
  const handleSelectWorkflow = useCallback((workflow: WorkflowDefinition) => {
    setSelectedWorkflowId(workflow.id);
    setCurrentNodes(workflow.nodes);
    setCurrentEdges(workflow.edges);
    setSelectedNodeId(undefined);
  }, []);

  // Handle save current workflow
  const handleSaveWorkflow = useCallback(async () => {
    if (!selectedWorkflowId) return;
    const existing = workflows.find(w => w.id === selectedWorkflowId);
    const updated: WorkflowDefinition = {
      id: selectedWorkflowId,
      name: existing?.name || 'Untitled',
      nodes: currentNodes,
      edges: currentEdges,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveWorkflow(updated);
    setWorkflows(prev => prev.map(w => w.id === selectedWorkflowId ? updated : w));
    message.success('Workflow saved');
  }, [selectedWorkflowId, workflows, currentNodes, currentEdges]);

  // Handle delete workflow
  const handleDeleteWorkflow = useCallback(async (workflowId: string) => {
    await deleteWorkflow(workflowId);
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    if (selectedWorkflowId === workflowId) {
      const remaining = workflows.filter(w => w.id !== workflowId);
      if (remaining.length > 0) {
        setSelectedWorkflowId(remaining[0].id);
        setCurrentNodes(remaining[0].nodes);
        setCurrentEdges(remaining[0].edges);
      } else {
        setSelectedWorkflowId(null);
        setCurrentNodes([]);
        setCurrentEdges([]);
      }
    }
    message.success('Workflow deleted');
  }, [selectedWorkflowId, workflows]);

  // Handle create new workflow
  const handleCreateWorkflow = useCallback(async () => {
    const newWorkflow: WorkflowDefinition = {
      id: `wf-${Date.now()}`,
      name: `Workflow ${workflows.length + 1}`,
      nodes: [],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveWorkflow(newWorkflow);
    setWorkflows(prev => [...prev, newWorkflow]);
    setSelectedWorkflowId(newWorkflow.id);
    setCurrentNodes([]);
    setCurrentEdges([]);
    message.success('New workflow created');
  }, [workflows.length]);

  // Handle execute node
  const handleExecuteNode = useCallback(async (nodeId: string) => {
    setRunningNodeId(nodeId);
    message.info(`Executing node: ${nodeId}`);
    setTimeout(() => {
      setRunningNodeId(null);
      message.success('Node executed');
    }, 1000);
  }, []);

  // Handle nodes change
  const handleNodesChange = useCallback((nodes: WorkflowDefinition['nodes']) => {
    setCurrentNodes(nodes);
  }, []);

  // Handle edges change
  const handleEdgesChange = useCallback((edges: WorkflowDefinition['edges']) => {
    setCurrentEdges(edges);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f2f5' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', background: 'white', borderBottom: '1px solid #f0f0f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>⚡ Workflow Canvas</span>
        <Space>
          <Button size="small" icon={<PlusOutlined />} onClick={handleCreateWorkflow}>
            New
          </Button>
          <Button size="small" type="primary" icon={<EditOutlined />} onClick={handleSaveWorkflow} disabled={!selectedWorkflowId}>
            Save
          </Button>
        </Space>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Workflow list sidebar */}
        <div style={{
          width: 220, background: 'white', borderRight: '1px solid #f0f0f0',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{ padding: '8px 12px', fontSize: 12, color: '#999', borderBottom: '1px solid #f0f0f0' }}>
            {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {workflows.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No workflows" />
            ) : (
              <List
                size="small"
                dataSource={workflows}
                renderItem={item => (
                  <List.Item
                    key={item.id}
                    actions={[
                      <DeleteOutlined key="delete" onClick={() => handleDeleteWorkflow(item.id)} style={{ color: '#ff4d4f' }} />,
                    ]}
                    style={{
                      cursor: 'pointer',
                      background: selectedWorkflowId === item.id ? '#e6f7ff' : 'transparent',
                      borderRadius: 4,
                      padding: '6px 8px',
                    }}
                    onClick={() => handleSelectWorkflow(item)}
                  >
                    <List.Item.Meta
                      title={<span style={{ fontSize: 13 }}>{item.name}</span>}
                      description={
                        <span style={{ fontSize: 11, color: '#999' }}>
                          {item.nodes.length} nodes · {item.edges.length} edges
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </div>
        </div>

        {/* Canvas area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedWorkflowId ? (
            <>
              <div style={{
                padding: '8px 16px', background: 'white', borderBottom: '1px solid #f0f0f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: 13, color: '#666' }}>
                  {workflows.find(w => w.id === selectedWorkflowId)?.name}
                </span>
                <Space size="middle">
                  <Tag color="blue">{currentNodes.length} nodes</Tag>
                  <Tag color="green">{currentEdges.length} edges</Tag>
                  {runningNodeId && <Tag color="orange">Running: {runningNodeId}</Tag>}
                </Space>
              </div>
              <div style={{ flex: 1 }}>
                <WorkflowCanvas
                  nodes={currentNodes}
                  edges={currentEdges}
                  selectedNodeId={selectedNodeId}
                  onNodesChange={handleNodesChange}
                  onEdgesChange={handleEdgesChange}
                  onSelectNode={setSelectedNodeId}
                  onExecute={handleExecuteNode}
                />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Select a workflow or create new" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}