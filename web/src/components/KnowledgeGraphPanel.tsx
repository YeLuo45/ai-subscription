/**
 * KnowledgeGraphPanel Component
 * Modal panel containing knowledge graph visualization with controls
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, Space, Typography, Spin, message, Empty, Tooltip } from 'antd';
import { 
  CloseOutlined, 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  AimOutlined, 
  ReloadOutlined,
  HistoryOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { KnowledgeGraph } from './KnowledgeGraph';
import { EntityCard } from './EntityCard';
import { useKnowledgeGraph } from '../hooks/useKnowledgeGraph';
import type { Entity, KnowledgeGraph } from '../types/knowledgeGraph';

const { Title, Text } = Typography;

interface Article {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  feedId: string;
}

interface KnowledgeGraphPanelProps {
  article: Article | null;
  open: boolean;
  onClose: () => void;
}

export const KnowledgeGraphPanel: React.FC<KnowledgeGraphPanelProps> = ({
  article,
  open,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const {
    loading,
    error,
    graph,
    history,
    extractGraph,
    loadGraph,
    loadHistory,
    deleteGraph,
    regenerateGraph,
  } = useKnowledgeGraph();

  // Update dimensions when container changes
  useEffect(() => {
    if (!open) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(400, rect.width - 40),
          height: Math.max(300, rect.height - 180),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [open]);

  // Load graph when article opens
  useEffect(() => {
    if (open && article) {
      // First try to load cached graph
      loadGraph(article.id).then(cached => {
        if (!cached) {
          // Extract new graph if not cached
          extractGraph(article.id, article.title, article.description);
        }
      });
      loadHistory();
    }
  }, [open, article, loadGraph, extractGraph, loadHistory]);

  // Handle entity click
  const handleEntityClick = useCallback((entity: Entity) => {
    setSelectedEntity(prev => prev?.id === entity.id ? null : entity);
  }, []);

  // Handle zoom controls
  const handleZoomIn = useCallback(() => {
    // This will be handled by the KnowledgeGraph component's internal state
    // For now we just trigger a re-render by force updating
    setDimensions(prev => ({
      ...prev,
      scale: 1.2, // This won't work directly, need to refactor
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    // Placeholder
  }, []);

  const handleResetView = useCallback(() => {
    // Force re-render to reset zoom
    setDimensions(prev => ({ ...prev }));
    setSelectedEntity(null);
  }, []);

  // Handle regenerate
  const handleRegenerate = useCallback(async () => {
    if (!article) return;
    
    message.loading({ content: '正在重新生成知识图谱...', key: 'kg-regenerate' });
    const result = await regenerateGraph(article.id, article.title, article.description);
    if (result) {
      message.success({ content: '知识图谱已重新生成', key: 'kg-regenerate' });
    } else {
      message.error({ content: '生成失败，请重试', key: 'kg-regenerate' });
    }
  }, [article, regenerateGraph]);

  // Handle delete from history
  const handleDeleteFromHistory = useCallback(async (kg: KnowledgeGraph) => {
    await deleteGraph(kg.id);
    message.success('已删除');
  }, [deleteGraph]);

  // Handle select from history
  const handleSelectFromHistory = useCallback((kg: KnowledgeGraph) => {
    setSelectedEntity(null);
    setShowHistory(false);
  }, []);

  // Get related entities for selected entity
  const getRelatedEntities = useCallback((entity: Entity): Entity[] => {
    if (!graph) return [];
    
    const relatedIds = new Set<string>();
    for (const rel of graph.relations) {
      if (rel.sourceId === entity.id) {
        relatedIds.add(rel.targetId);
      } else if (rel.targetId === entity.id) {
        relatedIds.add(rel.sourceId);
      }
    }
    
    return graph.entities.filter(e => relatedIds.has(e.id));
  }, [graph]);

  // Render legend
  const renderLegend = () => (
    <div style={{ 
      display: 'flex', 
      gap: 16, 
      padding: '8px 12px', 
      background: '#f5f5f5', 
      borderRadius: 4,
      flexWrap: 'wrap'
    }}>
      <Space size={12}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ 
            width: 12, 
            height: 12, 
            borderRadius: '50%', 
            background: '#4A90D9', 
            opacity: 0.6 
          }} />
          <Text style={{ fontSize: 11 }}>人物</Text>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ 
            width: 12, 
            height: 12, 
            borderRadius: 2, 
            background: '#52c41a', 
            opacity: 0.6 
          }} />
          <Text style={{ fontSize: 11 }}>组织</Text>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ 
            width: 0, 
            height: 0, 
            borderLeft: '6px solid transparent', 
            borderRight: '6px solid transparent', 
            borderBottom: '10px solid #fa8c16', 
            opacity: 0.6 
          }} />
          <Text style={{ fontSize: 11 }}>地点</Text>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ 
            width: 12, 
            height: 12, 
            borderRadius: '50%', 
            border: '2px dashed #eb2f96',
            background: 'transparent'
          }} />
          <Text style={{ fontSize: 11 }}>事件</Text>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ 
            width: 12, 
            height: 12, 
            background: '#722ed1', 
            opacity: 0.6,
            transform: 'rotate(45deg)'
          }} />
          <Text style={{ fontSize: 11 }}>概念</Text>
        </span>
      </Space>
    </div>
  );

  return (
    <Modal
      title={
        <Space>
          <span>知识图谱</span>
          {article && (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
              - {article.title}
            </Text>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={800}
      footer={null}
      style={{ top: 20 }}
      bodyStyle={{ padding: 0 }}
    >
      {/* Controls bar */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Space>
          <Tooltip title="重新生成">
            <Button 
              icon={<ReloadOutlined />} 
              size="small"
              onClick={handleRegenerate}
              loading={loading}
            />
          </Tooltip>
          <Tooltip title="查看历史">
            <Button 
              icon={<HistoryOutlined />} 
              size="small"
              onClick={() => setShowHistory(!showHistory)}
              type={showHistory ? 'primary' : 'default'}
            />
          </Tooltip>
        </Space>
        
        {graph && (
          <Text type="secondary" style={{ fontSize: 11 }}>
            {graph.entities.length} 个实体, {graph.relations.length} 个关系
          </Text>
        )}
      </div>

      {/* History panel */}
      {showHistory && (
        <div style={{ 
          padding: 12, 
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa',
          maxHeight: 150,
          overflow: 'auto'
        }}>
          {history.length === 0 ? (
            <Empty description="暂无历史记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map(kg => (
                <div 
                  key={kg.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 8px',
                    background: 'white',
                    borderRadius: 4,
                    border: '1px solid #e8e8e8'
                  }}
                >
                  <div>
                    <Text style={{ fontSize: 12 }}>{kg.articleTitle.slice(0, 30)}</Text>
                    <Text type="secondary" style={{ fontSize: 10, marginLeft: 8 }}>
                      {kg.entities.length}实体 {kg.relations.length}关系
                    </Text>
                  </div>
                  <Space size={4}>
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteFromHistory(kg)}
                    />
                  </Space>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {graph && renderLegend()}

      {/* Graph container */}
      <div 
        ref={containerRef}
        style={{ 
          height: 450,
          position: 'relative',
          overflow: 'hidden',
          background: '#fafafa'
        }}
      >
        {loading && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.8)',
            zIndex: 10
          }}>
            <Spin tip="正在提取实体和关系..." />
          </div>
        )}

        {error && (
          <div style={{ 
            padding: 24, 
            textAlign: 'center' 
          }}>
            <Text type="danger">{error}</Text>
          </div>
        )}

        {graph && !error && (
          <KnowledgeGraph
            entities={graph.entities}
            relations={graph.relations}
            width={dimensions.width}
            height={dimensions.height}
            onEntityClick={handleEntityClick}
            selectedEntityId={selectedEntity?.id}
          />
        )}

        {!graph && !loading && !error && (
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}>
            <Empty description="点击重新生成按钮提取知识图谱" />
          </div>
        )}
      </div>

      {/* Entity detail card */}
      {selectedEntity && (
        <div style={{ 
          position: 'absolute',
          bottom: 60,
          right: 24,
          zIndex: 20
        }}>
          <EntityCard
            entity={selectedEntity}
            relatedEntities={getRelatedEntities(selectedEntity)}
            onClose={() => setSelectedEntity(null)}
          />
        </div>
      )}

      {/* Instructions */}
      <div style={{ 
        padding: '8px 16px', 
        borderTop: '1px solid #f0f0f0',
        background: '#fafafa'
      }}>
        <Text type="secondary" style={{ fontSize: 10 }}>
          提示：滚轮缩放 | 拖拽平移 | 点击节点查看详情
        </Text>
      </div>
    </Modal>
  );
};

export default KnowledgeGraphPanel;
