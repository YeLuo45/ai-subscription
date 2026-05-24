/**
 * Memory Panel Component
 * Displays memory history and interest vectors
 */

import React, { useState, useEffect } from 'react';
import { Card, Tabs, List, Tag, Typography, Space, Progress, Empty, Statistic, Row, Col, Timeline, Switch, Button } from 'antd';
import { 
  HistoryOutlined, 
  BulbOutlined, 
  SettingOutlined, 
  ClockCircleOutlined,
  ReadOutlined,
  StarOutlined,
  FireOutlined
} from '@ant-design/icons';
import { getMemoryService, type RecentMemoryItem, type EpisodeMemoryItem, type UserInterestVector } from '../services/memory';

const { Title, Text } = Typography;

export const MemoryPanel: React.FC = () => {
  const [recentReads, setRecentReads] = useState<RecentMemoryItem[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeMemoryItem[]>([]);
  const [interestVector, setInterestVector] = useState<UserInterestVector | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoDecay, setAutoDecay] = useState(true);

  const memoryService = getMemoryService();

  useEffect(() => {
    loadMemoryData();
  }, []);

  // Listen for memory events
  useEffect(() => {
    const handleMemoryEvent = () => {
      loadMemoryData();
    };
    window.addEventListener('memory-event', handleMemoryEvent);
    return () => window.removeEventListener('memory-event', handleMemoryEvent);
  }, []);

  const loadMemoryData = async () => {
    setLoading(true);
    try {
      const [recent, eps, vector] = await Promise.all([
        memoryService.getRecentReads(20),
        memoryService.getEpisodes(50),
        memoryService.getInterestVector(),
      ]);
      setRecentReads(recent);
      setEpisodes(eps);
      setInterestVector(vector);
    } catch (error) {
      console.error('Failed to load memory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDecay = async () => {
    if (!interestVector) return;
    
    const lastUpdate = new Date(interestVector.lastUpdate);
    const now = new Date();
    const weeksSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (7 * 24 * 60 * 60 * 1000);
    
    if (weeksSinceUpdate >= 1) {
      await memoryService.applyDecay(weeksSinceUpdate);
      await loadMemoryData();
    }
  };

  const getTopTags = () => {
    if (!interestVector) return [];
    return Object.entries(interestVector.tagWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  };

  const getTopAuthors = () => {
    if (!interestVector) return [];
    return Object.entries(interestVector.authorAffinity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const renderRecentReads = () => (
    <List
      loading={loading}
      dataSource={recentReads}
      locale={{ emptyText: <Empty description="暂无阅读记录" /> }}
      renderItem={(item) => (
        <List.Item>
          <List.Item.Meta
            title={<Text ellipsis>{item.articleTitle}</Text>}
            description={
              <Space direction="vertical" size="small">
                <Text type="secondary">{item.feedTitle}</Text>
                <Space wrap>
                  {item.tags.slice(0, 3).map(tag => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                  <Text type="secondary">
                    <ClockCircleOutlined /> {new Date(item.readAt).toLocaleDateString()}
                  </Text>
                </Space>
                <Progress 
                  percent={Math.round(item.progress * 100)} 
                  size="small"
                  showInfo={false}
                />
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );

  const renderEpisodes = () => (
    <List
      loading={loading}
      dataSource={episodes}
      locale={{ emptyText: <Empty description="暂无阅读片段" /> }}
      renderItem={(episode) => (
        <List.Item>
          <List.Item.Meta
            title={<Text ellipsis>{episode.articleTitle}</Text>}
            description={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text ellipsis={{ rows: 2 }}>{episode.summary}</Text>
                <Space>
                  {[...Array(episode.rating)].map((_, i) => (
                    <StarOutlined key={i} style={{ color: '#faad14' }} />
                  ))}
                  <Text type="secondary">{episode.feedTitle}</Text>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  创建于: {new Date(episode.createdAt).toLocaleDateString()}
                </Text>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );

  const renderInterestVector = () => {
    if (!interestVector) return <Empty description="暂无兴趣数据" />;
    
    const topTags = getTopTags();
    const topAuthors = getTopAuthors();
    
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card size="small" title={<><FireOutlined /> 热度标签</>}>
          <Space wrap>
            {topTags.length > 0 ? topTags.map(([tag, weight]) => (
              <Tag key={tag} color={weight > 0.7 ? 'red' : weight > 0.4 ? 'orange' : 'default'}>
                {tag} ({Math.round(weight * 100)}%)
              </Tag>
            )) : <Text type="secondary">暂无标签</Text>}
          </Space>
        </Card>
        
        <Card size="small" title={<><BulbOutlined /> 作者偏好</>}>
          <Space direction="vertical">
            {topAuthors.length > 0 ? topAuthors.map(([author, affinity]) => (
              <Space key={author}>
                <Text>{author}</Text>
                <Progress 
                  percent={Math.round(affinity * 100)} 
                  size="small" 
                  style={{ width: 100 }}
                  showInfo={false}
                />
              </Space>
            )) : <Text type="secondary">暂无作者数据</Text>}
          </Space>
        </Card>
        
        <Row gutter={16}>
          <Col span={8}>
            <Statistic 
              title="总阅读数" 
              value={interestVector.totalReads} 
              prefix={<ReadOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="兴趣标签" 
              value={Object.keys(interestVector.tagWeights).length} 
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="关注作者" 
              value={Object.keys(interestVector.authorAffinity).length} 
            />
          </Col>
        </Row>
      </Space>
    );
  };

  const renderSettings = () => (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card size="small">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Text strong>自动衰减</Text>
            <br />
            <Text type="secondary">每周自动降低权重（遗忘机制）</Text>
          </div>
          <Switch 
            checked={autoDecay} 
            onChange={setAutoDecay}
          />
        </Space>
      </Card>
      
      <Card size="small" title="手动操作">
        <Space direction="vertical">
          <Text type="secondary">手动应用衰减因子到兴趣向量</Text>
          <Button onClick={handleApplyDecay}>应用衰减</Button>
        </Space>
      </Card>
      
      <Timeline
        items={[
          {
            color: 'blue',
            children: 'L0: 工作记忆 - 当前会话上下文',
          },
          {
            color: 'blue',
            children: 'L1: 最近记忆 - 最近20条阅读记录',
          },
          {
            color: 'green',
            children: 'L2: 情景记忆 - 文章阅读片段（30天）',
          },
          {
            color: 'orange',
            children: 'L3: 语义记忆 - 兴趣向量（永久）',
          },
          {
            color: 'red',
            children: 'L4: 程序记忆 - 操作习惯（永久）',
          },
        ]}
      />
    </Space>
  );

  const items = [
    {
      key: 'recent',
      label: <span><HistoryOutlined /> 最近阅读</span>,
      children: renderRecentReads(),
    },
    {
      key: 'episodes',
      label: <span><ReadOutlined /> 阅读片段</span>,
      children: renderEpisodes(),
    },
    {
      key: 'interests',
      label: <span><BulbOutlined /> 兴趣向量</span>,
      children: renderInterestVector(),
    },
    {
      key: 'settings',
      label: <span><SettingOutlined /> 设置</span>,
      children: renderSettings(),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Title level={4}>记忆管理</Title>
      <Tabs items={items} />
    </div>
  );
};

export default MemoryPanel;