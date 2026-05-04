/**
 * MindMapViewer Component
 * Pure React + SVG mind map visualizer (no external libraries)
 * 
 * Features:
 * - Parse markdown to tree using markdownToTree
 * - Render SVG with nodes (rounded rects) and bezier curve connectors
 * - Root node centered, children spread horizontally
 * - Each node clickable to collapse/expand children
 * - Mouse wheel to zoom (scale transform on SVG group)
 * - Click and drag to pan (translate transform)
 * - Export PNG button
 * - Default zoom to fit all nodes in viewport
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { markdownToTree, TreeRoot, TreeNode } from '../utils/markdownToTree';
import { Button, Card } from 'antd';

interface MindMapViewerProps {
  content: string; // markdown string
}

interface LayoutNode {
  node: TreeNode;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  level: number;
  childNodes: LayoutNode[];
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 40;
const LEVEL_GAP_X = 220;
const LEVEL_GAP_Y = 60;
const ROOT_WIDTH = 200;
const ROOT_HEIGHT = 50;
const SVG_PADDING = 50;

export default function MindMapViewer({ content }: MindMapViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tree, setTree] = useState<TreeRoot | null>(null);
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [svgSize, setSvgSize] = useState({ width: 800, height: 600 });

  // Parse markdown on content change
  useEffect(() => {
    const parsed = markdownToTree(content);
    setTree(parsed);
  }, [content]);

  // Calculate layout when tree changes
  useEffect(() => {
    if (!tree) return;

    const calculateNodeSize = (label: string, isRoot: boolean) => {
      const fontSize = isRoot ? 16 : 14;
      const charsPerLine = isRoot ? 20 : 18;
      const lines = Math.ceil(label.length / charsPerLine);
      return {
        width: Math.max(isRoot ? ROOT_WIDTH : NODE_WIDTH, label.length * (isRoot ? 9 : 8) + 20),
        height: Math.max(isRoot ? ROOT_HEIGHT : NODE_HEIGHT, lines * (fontSize + 4) + 12)
      };
    };

    const layoutNode = (
      node: TreeNode | { root: string; children: TreeNode[] },
      level: number,
      x: number,
      y: number,
      isRoot = false
    ): LayoutNode => {
      const label = isRoot ? (node as { root: string }).root : (node as TreeNode).label;
      const children = isRoot 
        ? (node as TreeRoot).children 
        : (node as TreeNode).children;
      
      const size = calculateNodeSize(label, isRoot);
      
      // For non-root nodes, arrange children horizontally
      const childNodes: LayoutNode[] = [];
      let totalChildHeight = 0;
      
      if (children.length > 0) {
        children.forEach((child, idx) => {
          const childLayout = layoutNode(child, level + 1, x + LEVEL_GAP_X, y + totalChildHeight);
          childNodes.push(childLayout);
          totalChildHeight += childLayout.height + LEVEL_GAP_Y;
        });
        totalChildHeight -= LEVEL_GAP_Y; // Remove last gap
      }

      return {
        node: isRoot ? { label, children } as TreeNode : node as TreeNode,
        x,
        y: y + (totalChildHeight > 0 ? 0 : 0),
        width: size.width,
        height: size.height,
        collapsed: false,
        level,
        childNodes
      };
    };

    // Start layout from center
    const startY = 100;
    const rootLayout = layoutNode(tree, 0, svgSize.width / 2 - ROOT_WIDTH / 2, startY, true);
    
    // Flatten layout for rendering
    const flattenLayout = (ln: LayoutNode): LayoutNode[] => {
      const result = [ln];
      if (!ln.collapsed) {
        ln.childNodes.forEach(child => {
          result.push(...flattenLayout(child));
        });
      }
      return result;
    };

    const allNodes = flattenLayout(rootLayout);
    setLayoutNodes(allNodes);

    // Calculate bounding box and set initial transform to fit
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    allNodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const contentWidth = maxX - minX + SVG_PADDING * 2;
    const contentHeight = maxY - minY + SVG_PADDING * 2;
    const scale = Math.min(
      svgSize.width / contentWidth,
      svgSize.height / contentHeight,
      1.5
    );
    const centerX = (svgSize.width - contentWidth * scale) / 2;
    const centerY = (svgSize.height - contentHeight * scale) / 2;

    setTransform({
      x: centerX - minX * scale + SVG_PADDING * scale,
      y: centerY - minY * scale + SVG_PADDING * scale,
      scale
    });
  }, [tree, svgSize]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setSvgSize({
          width: containerRef.current.clientWidth,
          height: Math.max(400, containerRef.current.clientHeight)
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle node collapse
  const toggleCollapse = useCallback((nodeX: number, nodeY: number) => {
    setLayoutNodes(prev => prev.map(n => {
      if (n.x === nodeX && n.y === nodeY) {
        return { ...n, collapsed: !n.collapsed };
      }
      return n;
    }));
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.2, Math.min(3, prev.scale * delta))
    }));
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform.x, transform.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }));
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Export PNG
  const exportPNG = useCallback(() => {
    if (!svgRef.current) return;
    
    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = svg.clientWidth * 2;
      canvas.height = svg.clientHeight * 2;
      ctx?.scale(2, 2);
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap.png';
        a.click();
        URL.revokeObjectURL(url);
      });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  }, []);

  // Generate bezier curve path between parent and child
  const getConnectionPath = (parent: LayoutNode, child: LayoutNode) => {
    const startX = parent.x + parent.width;
    const startY = parent.y + parent.height / 2;
    const endX = child.x;
    const endY = child.y + child.height / 2;
    const cpOffset = (endX - startX) * 0.5;
    
    return `M ${startX} ${startY} C ${startX + cpOffset} ${startY}, ${endX - cpOffset} ${endY}, ${endX} ${endY}`;
  };

  // Render node
  const renderNode = (ln: LayoutNode) => {
    const isRoot = ln.level === 0;
    const hasChildren = ln.childNodes.length > 0;
    
    return (
      <g key={`${ln.x}-${ln.y}`}>
        {/* Node rectangle */}
        <rect
          x={ln.x}
          y={ln.y}
          width={ln.width}
          height={ln.height}
          rx={8}
          ry={8}
          fill={isRoot ? '#e6f7ff' : '#f5f5f5'}
          stroke={isRoot ? '#1890ff' : '#40a9ff'}
          strokeWidth={isRoot ? 2 : 1}
          style={{ cursor: hasChildren ? 'pointer' : 'default' }}
          onClick={() => hasChildren && toggleCollapse(ln.x, ln.y)}
        />
        
        {/* Node label */}
        <text
          x={ln.x + ln.width / 2}
          y={ln.y + ln.height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={isRoot ? '#1890ff' : '#333'}
          fontSize={isRoot ? 16 : 14}
          fontWeight={isRoot ? 'bold' : 'normal'}
        >
          {ln.label.length > 20 ? ln.label.substring(0, 18) + '...' : ln.label}
        </text>
        
        {/* Collapse indicator */}
        {hasChildren && (
          <text
            x={ln.x + ln.width - 12}
            y={ln.y + ln.height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#888"
            fontSize={12}
            style={{ pointerEvents: 'none' }}
          >
            {ln.collapsed ? '+' : '-'}
          </text>
        )}
        
        {/* Connection lines */}
        {!ln.collapsed && ln.childNodes.map((child, idx) => {
          // Find the actual child in layoutNodes for accurate positioning
          const actualChild = layoutNodes.find(
            c => c.x === child.x && c.y === child.y
          );
          if (!actualChild) return null;
          return (
            <path
              key={`line-${idx}`}
              d={getConnectionPath(ln, actualChild)}
              fill="none"
              stroke="#40a9ff"
              strokeWidth={1.5}
              opacity={0.7}
            />
          );
        })}
      </g>
    );
  };

  if (!tree) {
    return (
      <Card size="small" style={{ marginTop: 16 }}>
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{content}</pre>
      </Card>
    );
  }

  return (
    <Card 
      size="small" 
      style={{ marginTop: 16 }} 
      title="思维导图"
      extra={
        <Button size="small" onClick={exportPNG}>
          导出 PNG
        </Button>
      }
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 500,
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          background: '#fafafa',
          borderRadius: 4
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width={svgSize.width}
          height={svgSize.height}
          style={{ display: 'block' }}
        >
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            {layoutNodes.map(renderNode)}
          </g>
        </svg>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: '#888', textAlign: 'center' }}>
        滚轮缩放 | 拖拽平移 | 点击节点折叠/展开
      </div>
    </Card>
  );
}
