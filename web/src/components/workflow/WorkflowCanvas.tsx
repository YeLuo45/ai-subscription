/**
 * WorkflowCanvas Component
 * SVG-based visual workflow editor with drag-and-drop nodes
 */
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { WorkflowNode, WorkflowEdge, WorkflowNodeType } from '../services/workflow-canvas/types';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId?: string;
  onNodesChange: (nodes: WorkflowNode[]) => void;
  onEdgesChange: (edges: WorkflowEdge[]) => void;
  onSelectNode: (id: string | undefined) => void;
  onExecute?: (nodeId: string) => void;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 60;
const PORT_RADIUS = 6;

const NODE_COLORS: Record<WorkflowNodeType, string> = {
  trigger: '#1890ff',
  agent: '#52c41a',
  condition: '#faad14',
  action: '#f5222d',
  merge: '#722ed1',
};

const NODE_ICONS: Record<WorkflowNodeType, string> = {
  trigger: '⚡',
  agent: '🤖',
  condition: '⚖️',
  action: '🎯',
  merge: '⊕',
};

export default function WorkflowCanvas({
  nodes,
  edges,
  selectedNodeId,
  onNodesChange,
  onEdgesChange,
  onSelectNode,
  onExecute,
}: WorkflowCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<{
    nodeId: string;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  // Get node center position for edge connection
  const getNodeCenter = useCallback((node: WorkflowNode) => ({
    x: node.x + NODE_WIDTH / 2,
    y: node.y + NODE_HEIGHT / 2,
  }), []);

  // Get output port position
  const getOutputPort = useCallback((node: WorkflowNode, port: 'out' | 'yes' | 'no' = 'out') => {
    const yOffset = port === 'yes' ? NODE_HEIGHT * 0.33 : port === 'no' ? NODE_HEIGHT * 0.66 : node.y + NODE_HEIGHT / 2;
    return {
      x: node.x + NODE_WIDTH,
      y: yOffset,
    };
  }, []);

  // Get input port position
  const getInputPort = useCallback((node: WorkflowNode) => ({
    x: node.x,
    y: node.y + NODE_HEIGHT / 2,
  }), []);

  // Generate SVG path for edge
  const getEdgePath = useCallback((source: WorkflowNode, target: WorkflowNode, sourcePort: 'out' | 'yes' | 'no' = 'out') => {
    const start = getOutputPort(source, sourcePort);
    const end = getInputPort(target);
    const dx = end.x - start.x;
    const controlPoint = Math.abs(dx) / 2;
    return `M ${start.x} ${start.y} C ${start.x + controlPoint} ${start.y}, ${end.x - controlPoint} ${end.y}, ${end.x} ${end.y}`;
  }, [getOutputPort, getInputPort]);

  // Handle mouse down on node (start drag)
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgX = (e.clientX - rect.left) * (800 / rect.width);
    const svgY = (e.clientY - rect.top) * (600 / rect.height);
    setDragState({
      nodeId: node.id,
      startX: node.x,
      startY: node.y,
      offsetX: svgX - node.x,
      offsetY: svgY - node.y,
    });
    onSelectNode(node.id);
  }, [onSelectNode]);

  // Handle mouse move (drag)
  useEffect(() => {
    if (!dragState) return;
    const handleMouseMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg || !dragState) return;
      const rect = svg.getBoundingClientRect();
      const svgX = (e.clientX - rect.left) * (800 / rect.width);
      const svgY = (e.clientY - rect.top) * (600 / rect.height);
      const newX = Math.max(0, Math.min(800 - NODE_WIDTH, svgX - dragState.offsetX));
      const newY = Math.max(0, Math.min(600 - NODE_HEIGHT, svgY - dragState.offsetY));
      onNodesChange(nodes.map(n => n.id === dragState.nodeId ? { ...n, x: newX, y: newY } : n));
    };
    const handleMouseUp = () => setDragState(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, nodes, onNodesChange]);

  // Handle canvas click (deselect)
  const handleCanvasClick = useCallback(() => {
    onSelectNode(undefined);
    setSelectedEdgeId(null);
    setContextMenu(null);
  }, [onSelectNode]);

  // Handle context menu on node
  const handleNodeContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setContextMenu({
      x: (e.clientX - rect.left) * (800 / rect.width),
      y: (e.clientY - rect.top) * (600 / rect.height),
      nodeId,
    });
  }, []);

  // Handle edge click
  const handleEdgeClick = useCallback((e: React.MouseEvent, edgeId: string) => {
    e.stopPropagation();
    setSelectedEdgeId(edgeId);
    onSelectNode(undefined);
  }, [onSelectNode]);

  // Handle add node
  const handleAddNode = useCallback((type: WorkflowNodeType) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
      x: 320,
      y: 280,
      config: {},
    };
    onNodesChange([...nodes, newNode]);
  }, [nodes, onNodesChange]);

  // Handle delete selected node
  const handleDeleteNode = useCallback(() => {
    if (!contextMenu) return;
    const nodeId = contextMenu.nodeId;
    onNodesChange(nodes.filter(n => n.id !== nodeId));
    onEdgesChange(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
    setContextMenu(null);
    if (selectedNodeId === nodeId) onSelectNode(undefined);
  }, [contextMenu, nodes, edges, onNodesChange, onEdgesChange, selectedNodeId, onSelectNode]);

  // Handle execute node
  const handleExecuteNode = useCallback(() => {
    if (!contextMenu || !onExecute) return;
    onExecute(contextMenu.nodeId);
    setContextMenu(null);
  }, [contextMenu, onExecute]);

  // Double click to edit label
  const handleNodeDoubleClick = useCallback((e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    const newLabel = window.prompt('Edit node label:', node.label);
    if (newLabel && newLabel.trim()) {
      onNodesChange(nodes.map(n => n.id === node.id ? { ...n, label: newLabel.trim() } : n));
    }
  }, [nodes, onNodesChange]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#f0f2f5' }}>
      {/* Toolbar */}
      <div style={{
        position: 'absolute', top: 8, left: 8, zIndex: 10,
        display: 'flex', gap: 4, background: 'white', padding: 8, borderRadius: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        {(['trigger', 'agent', 'condition', 'action', 'merge'] as WorkflowNodeType[]).map(type => (
          <button
            key={type}
            onClick={() => handleAddNode(type)}
            style={{
              padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 4,
              background: NODE_COLORS[type], color: 'white', cursor: 'pointer', fontSize: 12
            }}
            title={`Add ${type} node`}
          >
            {NODE_ICONS[type]} {type}
          </button>
        ))}
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox="0 0 800 600"
        style={{ display: 'block', cursor: 'default' }}
        onClick={handleCanvasClick}
      >
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e8e8e8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Edges */}
        {edges.map(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          if (!sourceNode || !targetNode) return null;
          const path = getEdgePath(sourceNode, targetNode, edge.sourcePort);
          const isSelected = selectedEdgeId === edge.id;
          return (
            <g key={edge.id} onClick={(e) => handleEdgeClick(e, edge.id)} style={{ cursor: 'pointer' }}>
              {/* Invisible wider path for easier clicking */}
              <path d={path} fill="none" stroke="transparent" strokeWidth="12" />
              {/* Visible edge */}
              <path
                d={path}
                fill="none"
                stroke={isSelected ? '#1890ff' : '#b1b1b1'}
                strokeWidth={isSelected ? 2 : 1.5}
                markerEnd="url(#arrowhead)"
              />
            </g>
          );
        })}

        {/* Arrow marker */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#b1b1b1" />
          </marker>
        </defs>

        {/* Nodes */}
        {nodes.map(node => {
          const isSelected = selectedNodeId === node.id;
          const isDragging = dragState?.nodeId === node.id;
          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              style={{ cursor: 'move' }}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
              onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
            >
              {/* Node body */}
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                fill={NODE_COLORS[node.type]}
                stroke={isSelected ? '#1890ff' : isDragging ? '#ff4d4f' : 'rgba(0,0,0,0.2)'}
                strokeWidth={isSelected || isDragging ? 2 : 1}
                style={{ filter: isDragging ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : undefined }}
              />
              {/* Icon */}
              <text
                x={14}
                y={NODE_HEIGHT / 2 + 5}
                fill="white"
                fontSize="20"
                fontFamily="sans-serif"
              >
                {NODE_ICONS[node.type]}
              </text>
              {/* Label */}
              <text
                x={NODE_WIDTH / 2}
                y={NODE_HEIGHT / 2 + 5}
                fill="white"
                fontSize="13"
                fontFamily="sans-serif"
                textAnchor="middle"
                fontWeight="500"
              >
                {node.label.length > 14 ? node.label.slice(0, 12) + '…' : node.label}
              </text>
              {/* Type badge */}
              <text
                x={NODE_WIDTH - 12}
                y={18}
                fill="rgba(255,255,255,0.7)"
                fontSize="9"
                fontFamily="sans-serif"
                textAnchor="end"
              >
                {node.type.toUpperCase()}
              </text>
              {/* Input port */}
              <circle
                cx={0}
                cy={NODE_HEIGHT / 2}
                r={PORT_RADIUS}
                fill="white"
                stroke="#b1b1b1"
                strokeWidth={1.5}
                style={{ cursor: 'crosshair' }}
              />
              {/* Output port */}
              <circle
                cx={NODE_WIDTH}
                cy={NODE_HEIGHT / 2}
                r={PORT_RADIUS}
                fill="white"
                stroke="#b1b1b1"
                strokeWidth={1.5}
                style={{ cursor: 'crosshair' }}
              />
            </g>
          );
        })}
      </svg>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'absolute',
            left: contextMenu.x * (svgRef.current?.clientWidth || 800) / 800,
            top: contextMenu.y * (svgRef.current?.clientHeight || 600) / 600,
            background: 'white',
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            padding: 4,
            zIndex: 100,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            onClick={handleDeleteNode}
            style={{ padding: '6px 12px', cursor: 'pointer', color: '#f5222d' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fff1f0'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            🗑 Delete
          </div>
          {onExecute && (
            <div
              onClick={handleExecuteNode}
              style={{ padding: '6px 12px', cursor: 'pointer', color: '#52c41a' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f6ffed'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ▶ Execute
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 8, right: 8, background: 'white',
        padding: '8px 12px', borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: 11
      }}>
        <strong>Node Types:</strong>
        {(['trigger', 'agent', 'condition', 'action', 'merge'] as WorkflowNodeType[]).map(type => (
          <span key={type} style={{ marginLeft: 12, color: NODE_COLORS[type] }}>
            {NODE_ICONS[type]} {type}
          </span>
        ))}
      </div>
    </div>
  );
}