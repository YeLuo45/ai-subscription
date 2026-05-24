/**
 * SVG Canvas Renderer for Workflow
 * Pure SVG implementation without third-party libraries
 */

import type { WorkflowNode, WorkflowEdge, WorkflowNodeType, NodeVisualConfig, NODE_VISUAL_CONFIGS } from './types';
import { NODE_VISUAL_CONFIGS as configs } from './types';

// ============================================================
// Constants
// ============================================================

const NODE_WIDTH = 140;
const NODE_HEIGHT = 70;
const PORT_RADIUS = 6;
const ARROW_SIZE = 8;

// ============================================================
// Bezier Curve Path Generation
// ============================================================

export function generateBezierPath(
  x1: number, y1: number,
  x2: number, y2: number,
  sourcePort: string = 'out'
): string {
  const dx = Math.abs(x2 - x1);
  const controlOffset = Math.max(50, dx * 0.4);

  // Source is left, target is right
  if (x1 < x2) {
    const cx1 = x1 + controlOffset;
    const cx2 = x2 - controlOffset;
    return `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
  }
  
  // Source is right, target is left
  if (x1 > x2) {
    const cx1 = x1 - controlOffset;
    const cx2 = x2 + controlOffset;
    return `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
  }
  
  // Vertical alignment
  const cy = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
}

// ============================================================
// Arrow Marker Definition
// ============================================================

export function generateArrowMarker(id: string, color: string): string {
  return `
    <marker id="${id}" markerWidth="10" markerHeight="10" 
            refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="${color}" />
    </marker>
  `;
}

// ============================================================
// Port Positions
// ============================================================

export interface PortPosition {
  x: number;
  y: number;
}

export function getNodePortPositions(node: WorkflowNode): {
  input: PortPosition;
  outputs: { port: string; x: number; y: number }[];
} {
  const visual = configs[node.type];
  const w = visual?.width || NODE_WIDTH;
  const h = visual?.height || NODE_HEIGHT;
  
  const centerX = node.x + w / 2;
  const centerY = node.y + h / 2;
  
  return {
    input: { x: node.x, y: centerY },
    outputs: [
      { port: 'out', x: node.x + w, y: centerY },
      ...(node.type === 'condition' ? [
        { port: 'yes', x: node.x + w, y: node.y + h * 0.3 },
        { port: 'no', x: node.x + w, y: node.y + h * 0.7 },
      ] : []),
    ],
  };
}

// ============================================================
// Node SVG Rendering
// ============================================================

function renderNodeIcon(type: WorkflowNodeType): string {
  const icons: Record<WorkflowNodeType, string> = {
    trigger: '⚡',
    agent: '🤖',
    condition: '🔀',
    action: '🎯',
    merge: '⊕',
  };
  return icons[type];
}

function renderNodeRect(node: WorkflowNode): string {
  const visual = configs[node.type];
  const w = visual?.width || NODE_WIDTH;
  const h = visual?.height || NODE_HEIGHT;
  const r = 8; // border radius

  return `
    <rect 
      x="${node.x}" y="${node.y}" 
      width="${w}" height="${h}" 
      rx="${r}" ry="${r}"
      fill="${visual?.color || '#1890ff'}"
      stroke="#fff"
      stroke-width="2"
      class="workflow-node"
      data-node-id="${node.id}"
    />
  `;
}

function renderNodeLabel(node: WorkflowNode): string {
  const visual = configs[node.type];
  const w = visual?.width || NODE_WIDTH;
  const h = visual?.height || NODE_HEIGHT;
  const icon = renderNodeIcon(node.type);
  
  const centerX = node.x + w / 2;
  const iconY = node.y + h * 0.35;
  const labelY = node.y + h * 0.7;

  return `
    <text 
      x="${centerX}" y="${iconY}" 
      text-anchor="middle" 
      fill="${visual?.labelColor || '#fff'}"
      font-size="20"
      class="workflow-node-icon"
    >${icon}</text>
    <text 
      x="${centerX}" y="${labelY}" 
      text-anchor="middle" 
      fill="${visual?.labelColor || '#fff'}"
      font-size="12"
      font-weight="500"
      class="workflow-node-label"
    >${escapeXml(node.label)}</text>
  `;
}

function renderPorts(node: WorkflowNode): string {
  const ports = getNodePortPositions(node);
  let svg = '';

  // Input port
  svg += `
    <circle 
      cx="${ports.input.x}" cy="${ports.input.y}" 
      r="${PORT_RADIUS}" 
      fill="#fff" 
      stroke="#1890ff" 
      stroke-width="2"
      class="workflow-port workflow-port-input"
      data-node-id="${node.id}"
      data-port="in"
    />
  `;

  // Output ports
  for (const output of ports.outputs) {
    const portColor = output.port === 'yes' ? '#52c41a' : output.port === 'no' ? '#f5222d' : '#1890ff';
    svg += `
      <circle 
        cx="${output.x}" cy="${output.y}" 
        r="${PORT_RADIUS}" 
        fill="#fff" 
        stroke="${portColor}" 
        stroke-width="2"
        class="workflow-port workflow-port-output"
        data-node-id="${node.id}"
        data-port="${output.port}"
      />
    `;
  }

  return svg;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderNode(node: WorkflowNode): string {
  return `
    <g class="workflow-node-group" data-node-id="${node.id}">
      ${renderNodeRect(node)}
      ${renderNodeLabel(node)}
      ${renderPorts(node)}
    </g>
  `;
}

// ============================================================
// Edge SVG Rendering
// ============================================================

export function renderEdge(edge: WorkflowEdge, nodes: WorkflowNode[]): string {
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);

  if (!sourceNode || !targetNode) return '';

  const sourcePorts = getNodePortPositions(sourceNode);
  const targetPorts = getNodePortPositions(targetNode);

  const sourcePort = sourcePorts.outputs.find(p => p.port === edge.sourcePort) || sourcePorts.outputs[0];
  const targetPort = targetPorts.input;

  const path = generateBezierPath(
    sourcePort.x, sourcePort.y,
    targetPort.x, targetPort.y,
    edge.sourcePort
  );

  const markerId = `arrow-${edge.id}`;
  const color = edge.sourcePort === 'yes' ? '#52c41a' : edge.sourcePort === 'no' ? '#f5222d' : '#1890ff';

  return `
    <g class="workflow-edge-group" data-edge-id="${edge.id}">
      <path
        d="${path}"
        fill="none"
        stroke="${color}"
        stroke-width="2"
        marker-end="url(#${markerId})"
        class="workflow-edge"
      />
    </g>
  `;
}

// ============================================================
// Full Canvas Rendering
// ============================================================

export interface CanvasRenderOptions {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId?: string;
  width?: number;
  height?: number;
  showGrid?: boolean;
}

export function renderCanvas(options: CanvasRenderOptions): string {
  const {
    nodes,
    edges,
    selectedNodeId,
    width = 800,
    height = 600,
    showGrid = true,
  } = options;

  const gridPattern = showGrid ? `
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e8e8e8" stroke-width="0.5"/>
      </pattern>
      ${edges.map(e => generateArrowMarker(`arrow-${e.id}`, '#1890ff')).join('')}
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  ` : '';

  const edgesSvg = edges.map(edge => renderEdge(edge, nodes)).join('');
  const nodesSvg = nodes.map(node => renderNode(node)).join('');

  const selectionHighlight = selectedNodeId ? `
    <rect 
      x="${nodes.find(n => n.id === selectedNodeId)?.x ?? 0 - 4}" 
      y="${nodes.find(n => n.id === selectedNodeId)?.y ?? 0 - 4}" 
      width="${(configs[nodes.find(n => n.id === selectedNodeId)?.type ?? 'agent']?.width || NODE_WIDTH) + 8}" 
      height="${(configs[nodes.find(n => n.id === selectedNodeId)?.type ?? 'agent']?.height || NODE_HEIGHT) + 8}" 
      fill="none" 
      stroke="#1890ff" 
      stroke-width="2" 
      stroke-dasharray="5,3"
      rx="12"
    />
  ` : '';

  return `
    <svg 
      class="workflow-canvas"
      width="${width}"
      height="${height}"
      style="background: #fafafa; cursor: grab;"
    >
      ${gridPattern}
      <g class="workflow-edges-layer">
        ${edgesSvg}
      </g>
      <g class="workflow-nodes-layer">
        ${selectionHighlight}
        ${nodesSvg}
      </g>
    </svg>
  `;
}

// ============================================================
// Get Node at Position
// ============================================================

export function getNodeAtPosition(
  x: number, 
  y: number, 
  nodes: WorkflowNode[]
): WorkflowNode | null {
  // Check in reverse order (top-most first)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const visual = configs[node.type];
    const w = visual?.width || NODE_WIDTH;
    const h = visual?.height || NODE_HEIGHT;

    if (x >= node.x && x <= node.x + w && y >= node.y && y <= node.y + h) {
      return node;
    }
  }
  return null;
}

// ============================================================
// Get Port at Position
// ============================================================

export interface PortInfo {
  nodeId: string;
  port: string;
  x: number;
  y: number;
}

export function getPortAtPosition(
  x: number,
  y: number,
  nodes: WorkflowNode[]
): PortInfo | null {
  const tolerance = PORT_RADIUS + 4;

  for (const node of nodes) {
    const ports = getNodePortPositions(node);

    // Check input port
    if (Math.abs(x - ports.input.x) < tolerance && Math.abs(y - ports.input.y) < tolerance) {
      return { nodeId: node.id, port: 'in', x: ports.input.x, y: ports.input.y };
    }

    // Check output ports
    for (const output of ports.outputs) {
      if (Math.abs(x - output.x) < tolerance && Math.abs(y - output.y) < tolerance) {
        return { nodeId: node.id, port: output.port, x: output.x, y: output.y };
      }
    }
  }

  return null;
}