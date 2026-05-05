/**
 * KnowledgeGraph Component
 * Renders a knowledge graph using SVG with zoom/pan/click interactions
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Entity, Relation, EntityType } from '../types/knowledgeGraph';
import { ENTITY_COLORS } from '../types/knowledgeGraph';

interface KnowledgeGraphProps {
  entities: Entity[];
  relations: Relation[];
  width: number;
  height: number;
  onEntityClick?: (entity: Entity) => void;
  selectedEntityId?: string | null;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  entity: Entity;
}

interface EdgeLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
  label: string;
  sourceId: string;
  targetId: string;
}

const NODE_RADIUS = 30;
const CHAR_WIDTH = 7;

function calculateTextWidth(text: string): number {
  return text.length * CHAR_WIDTH + 16;
}

// Simple force-directed layout
function applyForceLayout(
  nodes: NodePosition[],
  edges: EdgeLine[],
  width: number,
  height: number,
  iterations: number = 100
): NodePosition[] {
  const nodesCopy = nodes.map(n => ({ ...n }));
  const edgesCopy = edges.map(e => ({ ...e }));

  const centerX = width / 2;
  const centerY = height / 2;
  const repulsionStrength = 5000;
  const attractionStrength = 0.05;
  const damping = 0.85;

  for (let iter = 0; iter < iterations; iter++) {
    // Apply repulsion between all nodes
    for (let i = 0; i < nodesCopy.length; i++) {
      for (let j = i + 1; j < nodesCopy.length; j++) {
        const dx = nodesCopy[j].x - nodesCopy[i].x;
        const dy = nodesCopy[j].y - nodesCopy[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsionStrength / (dist * dist);
        
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        nodesCopy[i].vx -= fx;
        nodesCopy[i].vy -= fy;
        nodesCopy[j].vx += fx;
        nodesCopy[j].vy += fy;
      }
    }

    // Apply attraction along edges
    for (const edge of edgesCopy) {
      const source = nodesCopy.find(n => n.id === edge.sourceId);
      const target = nodesCopy.find(n => n.id === edge.targetId);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 150) * attractionStrength;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    // Center gravity
    for (const node of nodesCopy) {
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      node.vx += dx * 0.01;
      node.vy += dy * 0.01;
    }

    // Update positions
    for (const node of nodesCopy) {
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;

      // Keep within bounds with padding
      const padding = NODE_RADIUS + 20;
      node.x = Math.max(padding, Math.min(width - padding, node.x));
      node.y = Math.max(padding, Math.min(height - padding, node.y));
    }
  }

  return nodesCopy;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  entities,
  relations,
  width,
  height,
  onEntityClick,
  selectedEntityId,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [layoutNodes, setLayoutNodes] = useState<NodePosition[]>([]);

  // Initialize positions and run force layout
  useEffect(() => {
    if (entities.length === 0) return;

    // Initialize nodes at random positions around center
    const centerX = width / 2;
    const centerY = height / 2;
    const initialNodes: NodePosition[] = entities.map((entity, i) => {
      const angle = (2 * Math.PI * i) / entities.length;
      const radius = Math.min(width, height) / 4;
      return {
        id: entity.id,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        entity,
      };
    });

    // Create edge map for layout
    const edges: EdgeLine[] = relations.map(rel => ({
      id: rel.id,
      sourceId: rel.sourceId,
      targetId: rel.targetId,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      midX: 0,
      midY: 0,
      label: rel.label,
    }));

    // Run force layout
    const layoutedNodes = applyForceLayout(initialNodes, edges, width, height, 150);
    setLayoutNodes(layoutedNodes);
  }, [entities, relations, width, height]);

  // Build node map for edge rendering
  const nodeMap = useMemo(() => {
    const map = new Map<string, NodePosition>();
    for (const node of layoutNodes) {
      map.set(node.id, node);
    }
    return map;
  }, [layoutNodes]);

  // Calculate edges
  const edges: EdgeLine[] = useMemo(() => {
    const result: EdgeLine[] = [];
    for (const rel of relations) {
      const source = nodeMap.get(rel.sourceId);
      const target = nodeMap.get(rel.targetId);
      if (source && target) {
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        result.push({
          id: rel.id,
          x1: source.x,
          y1: source.y,
          x2: target.x,
          y2: target.y,
          midX,
          midY,
          label: rel.label,
          sourceId: rel.sourceId,
          targetId: rel.targetId,
        });
      }
    }
    return result;
  }, [relations, nodeMap]);

  // Check if edge is connected to hovered/selected entity
  const isEdgeHighlighted = useCallback((edge: EdgeLine) => {
    const highlightId = hoveredEntityId || selectedEntityId;
    if (!highlightId) return false;
    return edge.sourceId === highlightId || edge.targetId === highlightId;
  }, [hoveredEntityId, selectedEntityId]);

  // Handle mouse wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, transform.scale * delta));
    
    // Zoom toward mouse position
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
      const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
      
      setTransform({ x: newX, y: newY, scale: newScale });
    }
  }, [transform]);

  // Handle mouse down for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }, [transform]);

  // Handle mouse move for panning
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  }, [isDragging, dragStart]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle entity click
  const handleEntityClick = useCallback((entity: Entity) => {
    onEntityClick?.(entity);
  }, [onEntityClick]);

  // Handle entity hover
  const handleEntityHover = useCallback((entityId: string | null) => {
    setHoveredEntityId(entityId);
  }, []);

  // Render node shape based on entity type
  const renderNodeShape = (entity: Entity, x: number, y: number, isHighlighted: boolean) => {
    const color = ENTITY_COLORS[entity.type];
    const size = NODE_RADIUS;
    const strokeWidth = isHighlighted ? 3 : 1.5;

    switch (entity.type) {
      case 'person':
        return (
          <circle
            cx={x}
            cy={y}
            r={size}
            fill={color}
            fillOpacity={0.2}
            stroke={color}
            strokeWidth={strokeWidth}
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
          />
        );
      case 'organization':
        return (
          <rect
            x={x - size}
            y={y - size}
            width={size * 2}
            height={size * 2}
            rx={4}
            fill={color}
            fillOpacity={0.2}
            stroke={color}
            strokeWidth={strokeWidth}
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
          />
        );
      case 'location':
        // Triangle pointing up
        const triSize = size * 1.2;
        return (
          <polygon
            points={`${x},${y - triSize} ${x - triSize * 0.866},${y + triSize * 0.5} ${x + triSize * 0.866},${y + triSize * 0.5}`}
            fill={color}
            fillOpacity={0.2}
            stroke={color}
            strokeWidth={strokeWidth}
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
          />
        );
      case 'event':
        return (
          <circle
            cx={x}
            cy={y}
            r={size}
            fill={color}
            fillOpacity={0.3}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray="5,3"
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
          />
        );
      case 'concept':
        // Diamond
        const diaSize = size * 1.1;
        return (
          <polygon
            points={`${x},${y - diaSize} ${x + diaSize},${y} ${x},${y + diaSize} ${x - diaSize},${y}`}
            fill={color}
            fillOpacity={0.2}
            stroke={color}
            strokeWidth={strokeWidth}
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
          />
        );
      default:
        return (
          <circle
            cx={x}
            cy={y}
            r={size}
            fill={color}
            fillOpacity={0.2}
            stroke={color}
            strokeWidth={strokeWidth}
            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
          />
        );
    }
  };

  // Render entity label
  const renderEntityLabel = (entity: Entity, x: number, y: number) => {
    const textWidth = calculateTextWidth(entity.name);
    const labelY = y + NODE_RADIUS + 16;
    const isHighlighted = hoveredEntityId === entity.id || selectedEntityId === entity.id;
    
    return (
      <g>
        {/* Background for label */}
        <rect
          x={x - textWidth / 2}
          y={labelY - 10}
          width={textWidth}
          height={16}
          rx={3}
          fill="white"
          fillOpacity={0.8}
        />
        {/* Entity name */}
        <text
          x={x}
          y={labelY}
          textAnchor="middle"
          fontSize={11}
          fill="#333"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {entity.name}
        </text>
        {/* Entity type badge */}
        <text
          x={x}
          y={labelY + 12}
          textAnchor="middle"
          fontSize={9}
          fill="#888"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {entity.type === 'person' ? '人物' :
           entity.type === 'organization' ? '组织' :
           entity.type === 'location' ? '地点' :
           entity.type === 'event' ? '事件' : '概念'}
        </text>
      </g>
    );
  };

  // Calculate arrow marker for edges
  const renderArrowMarker = () => (
    <defs>
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto"
      >
        <polygon
          points="0 0, 10 3.5, 0 7"
          fill="#666"
        />
      </marker>
      <marker
        id="arrowhead-highlighted"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto"
      >
        <polygon
          points="0 0, 10 3.5, 0 7"
          fill="#1890ff"
        />
      </marker>
    </defs>
  );

  if (entities.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        No entities found
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ background: '#fafafa', cursor: isDragging ? 'grabbing' : 'grab' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {renderArrowMarker()}
      
      <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
        {/* Render edges */}
        {edges.map(edge => {
          const highlighted = isEdgeHighlighted(edge);
          return (
            <g key={edge.id}>
              {/* Edge line */}
              <line
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                stroke={highlighted ? '#1890ff' : '#999'}
                strokeWidth={highlighted ? 2 : 1}
                markerEnd={highlighted ? 'url(#arrowhead-highlighted)' : 'url(#arrowhead)'}
                opacity={highlighted ? 1 : 0.6}
                style={{ transition: 'all 0.2s' }}
              />
              {/* Edge label */}
              {edge.label && (
                <g>
                  <rect
                    x={edge.midX - calculateTextWidth(edge.label) / 2}
                    y={edge.midY - 8}
                    width={calculateTextWidth(edge.label)}
                    height={16}
                    rx={3}
                    fill="white"
                    fillOpacity={0.9}
                  />
                  <text
                    x={edge.midX}
                    y={edge.midY + 4}
                    textAnchor="middle"
                    fontSize={10}
                    fill={highlighted ? '#1890ff' : '#666'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {edge.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Render nodes */}
        {layoutNodes.map(node => {
          const { entity, x, y } = node;
          const isHighlighted = hoveredEntityId === entity.id || selectedEntityId === entity.id;
          const isHovered = hoveredEntityId === entity.id;
          
          return (
            <g
              key={entity.id}
              onClick={() => handleEntityClick(entity)}
              onMouseEnter={() => handleEntityHover(entity.id)}
              onMouseLeave={() => handleEntityHover(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Highlight ring */}
              {isHighlighted && (
                <circle
                  cx={x}
                  cy={y}
                  r={NODE_RADIUS + 6}
                  fill="none"
                  stroke={ENTITY_COLORS[entity.type]}
                  strokeWidth={2}
                  strokeDasharray="4,2"
                  opacity={0.5}
                />
              )}
              
              {/* Node shape */}
              {renderNodeShape(entity, x, y, isHighlighted)}
              
              {/* Entity label */}
              {renderEntityLabel(entity, x, y)}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export default KnowledgeGraph;
