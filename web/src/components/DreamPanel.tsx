/**
 * DreamPanel Component
 * Memory timeline display with context restoration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Timeline, Card, Typography, Space, Button, Modal, Tag, Empty, 
  message, Spin, Tooltip, Popconfirm
} from 'antd';
import { 
  ClockCircleOutlined, EyeOutlined, DeleteOutlined, 
  RestoreOutlined, CloseOutlined, BulbOutlined
} from '@ant-design/icons';
import type { DreamEntry } from '../../../shared/lib/dream-memory/types';
import { DreamManager } from '../../../shared/lib/dream-memory';

const { Title, Text, Paragraph } = Typography;

interface DreamPanelProps {
  visible?: boolean;
  onClose?: () => void;
}

export const DreamPanel: React.FC<DreamPanelProps> = ({ visible = true, onClose }) => {
  const [dreams, setDreams] = useState<DreamEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDream, setSelectedDream] = useState<DreamEntry | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const dreamManager = DreamManager.getInstance();

  const loadDreams = useCallback(async () => {
    setLoading(true);
    try {
      const recentDreams = await dreamManager.getRecentDreams(20);
      setDreams(recentDreams);
      
      const contextSuggestions = await dreamManager.getContextSuggestions();
      setSuggestions(contextSuggestions);
    } catch (err) {
      console.error('Failed to load dreams:', err);
    } finally {
      setLoading(false);
    }
  }, [dreamManager]);

  useEffect(() => {
    if (visible) {
      loadDreams();
    }
  }, [visible, loadDreams]);

  const handleOpenDetail = (dream: DreamEntry) => {
    setSelectedDream(dream);
    setDetailModalOpen(true);
  };

  const handleRestoreContext = (dream: DreamEntry) => {
    // Open article URL in new tab
    if (dream.articleUrl) {
      window.open(dream.articleUrl, '_blank');
      message.success(`Opening: ${dream.title}`);
    } else {
      message.warning('Article URL not available');
    }
  };

  const handleDeleteDream = async (dream: DreamEntry) => {
    try {
      await dreamManager.deleteDream(dream.id);
      message.success('Dream deleted');
      loadDreams();
    } catch (err) {
      message.error('Failed to delete dream');
    }
  };

  const handleClearOld = async () => {
    try {
      await dreamManager.clearOldDreams(30);
      message.success('Old dreams cleared (older than 30 days)');
      loadDreams();
    } catch (err) {
      message.error('Failed to clear old dreams');
    }
  };

  const getSentimentColor = (sentiment: DreamEntry['sentiment']): string => {
    switch (sentiment) {
      case 'positive': return 'green';
      case 'negative': return 'red';
      default: return 'default';
    }
  };

  const getSentimentLabel = (sentiment: DreamEntry['sentiment']): string => {
    switch (sentiment) {
      case 'positive': return '😊 Positive';
      case 'negative': return '😔 Negative';
      default: return '😐 Neutral';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (!visible) return null;

  return (
    <div style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>📚 Reading Memory</Title>
        <Space>
          <Button size="small" onClick={loadDreams} loading={loading}>
            Refresh
          </Button>
          <Popconfirm
            title="Clear dreams older than 30 days?"
            onConfirm={handleClearOld}
            okText="Clear"
            cancelText="Cancel"
          >
            <Button size="small" danger>
              Clear Old
            </Button>
          </Popconfirm>
          {onClose && (
            <Button icon={<CloseOutlined />} onClick={onClose} />
          )}
        </Space>
      </div>

      {/* Context Suggestions */}
      {suggestions.length > 0 && (
        <Card size="small" style={{ marginBottom: 16, background: '#f0f5ff' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong><BulbOutlined /> Context Suggestions</Text>
            {suggestions.slice(0, 3).map((suggestion, idx) => (
              <Text key={idx} type="secondary" style={{ fontSize: 12 }}>
                • {suggestion}
              </Text>
            ))}
          </Space>
        </Card>
      )}

      {/* Timeline */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : dreams.length === 0 ? (
        <Empty description="No reading memories yet. Start reading articles to build your memory!" />
      ) : (
        <Timeline mode="left" items={dreams.map((dream) => ({
          color: getSentimentColor(dream.sentiment) as 'green' | 'red' | 'blue' | 'gray' | 'default',
          dot: <ClockCircleOutlined style={{ fontSize: 14 }} />,
          children: (
            <Card 
              size="small" 
              hoverable
              onClick={() => handleOpenDetail(dream)}
              style={{ marginBottom: 4 }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text strong ellipsis={{ tooltip: dream.title }} style={{ maxWidth: 200 }}>
                    {dream.title}
                  </Text>
                  <Space size="small">
                    <Tooltip title="Restore context">
                      <Button 
                        size="small" 
                        icon={<RestoreOutlined />} 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreContext(dream);
                        }}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="Delete this dream?"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDeleteDream(dream);
                      }}
                      okText="Delete"
                      cancelText="Cancel"
                    >
                      <Button 
                        size="small" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </Space>
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {formatTimestamp(dream.timestamp)}
                  {dream.feedTitle && ` • ${dream.feedTitle}`}
                </Text>
                <Text type="secondary" ellipsis={{ rows: 2 }} style={{ fontSize: 12 }}>
                  {dream.summary}
                </Text>
                <Space size="small" wrap>
                  <Tag color={getSentimentColor(dream.sentiment)}>
                    {getSentimentLabel(dream.sentiment)}
                  </Tag>
                  {dream.tags?.slice(0, 2).map(tag => (
                    <Tag key={tag} size="small">{tag}</Tag>
                  ))}
                </Space>
              </Space>
            </Card>
          ),
        }))} />
      )}

      {/* Dream Detail Modal */}
      <Modal
        title={selectedDream?.title}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            Close
          </Button>,
          <Button 
            key="restore" 
            type="primary" 
            icon={<RestoreOutlined />}
            onClick={() => selectedDream && handleRestoreContext(selectedDream)}
          >
            Open Article
          </Button>,
        ]}
        width={600}
      >
        {selectedDream && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Card size="small" style={{ background: '#fafafa' }}>
              <Paragraph>
                <Text strong>Summary:</Text>
                <br />
                <Text>{selectedDream.summary}</Text>
              </Paragraph>
            </Card>
            
            <div>
              <Text strong>Key Points:</Text>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {selectedDream.keyPoints.map((point, idx) => (
                  <li key={idx}>
                    <Text>{point}</Text>
                  </li>
                ))}
              </ul>
            </div>
            
            <Space wrap>
              <Tag color={getSentimentColor(selectedDream.sentiment)}>
                {getSentimentLabel(selectedDream.sentiment)}
              </Tag>
              {selectedDream.tags?.map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
            
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <ClockCircleOutlined /> {new Date(selectedDream.timestamp).toLocaleString()}
              </Text>
              <br />
              {selectedDream.feedTitle && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Feed: {selectedDream.feedTitle}
                </Text>
              )}
              <br />
              <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: selectedDream.articleUrl }}>
                URL: {selectedDream.articleUrl}
              </Text>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default DreamPanel;