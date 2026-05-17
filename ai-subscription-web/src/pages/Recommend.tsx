/**
 * 智能推荐页面 - 个性化推荐 + 相似文章推荐
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Tabs, Tag, Space, Typography, Button, Empty,
  List, Tooltip, Badge, Spin, message,
} from 'antd';
import {
  LikeOutlined, FireOutlined, ClockCircleOutlined,
  RobotOutlined, LinkOutlined, EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ContentItem } from '../types';
import {
  getPersonalizedRecommendations,
  getHybridRecommendations,
  getTrendingRecommendations,
  findSimilarArticles,
  updateUserPreferences,
  loadUserPreferences,
  RecommendedItem,
  SimilarItem,
} from '../services/recommendationService';

const { Title, Text, Paragraph } = Typography;

interface RecommendPageProps {
  /** 所有内容（各订阅源内容集合） */
  allContents: Record<string, ContentItem[]>;
  /** 订阅源列表（用于显示来源） */
  subscriptions: Array<{ id: string; name: string; category: string }>;
  /** 导航到摘要页面 */
  onNavigateToSummary: () => void;
  /** 选中内容跳转摘要 */
  onSelectContent: (content: ContentItem) => void;
}

type RecommendationType = 'personalized' | 'hybrid' | 'trending';

const REASON_LABELS: Record<RecommendedItem['reason'], { text: string; color: string }> = {
  personalized: { text: '个性推荐', color: 'purple' },
  trending: { text: '热门', color: 'red' },
  fresh: { text: '新鲜', color: 'cyan' },
};

const SIMILAR_REASON_TEXT: Record<string, string> = {
  keyword: '关键词匹配',
  category: '同源内容',
};

export const RecommendPage: React.FC<RecommendPageProps> = ({
  allContents,
  subscriptions,
  onNavigateToSummary,
  onSelectContent,
}) => {
  const [activeTab, setActiveTab] = useState<RecommendationType>('personalized');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [similarArticles, setSimilarArticles] = useState<SimilarItem[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // 用户偏好
  const prefs = useMemo(() => loadUserPreferences(), []);

  // 扁平化所有内容
  const allItems = useMemo(() => {
    return Object.values(allContents).flat();
  }, [allContents]);

  // 各推荐列表
  const recommendations = useMemo(() => {
    if (allItems.length === 0) return [];
    switch (activeTab) {
      case 'personalized':
        return getPersonalizedRecommendations(allContents, { maxItems: 30, minScore: 0.1 });
      case 'hybrid':
        return getHybridRecommendations(allContents, { maxItems: 30 });
      case 'trending':
        return getTrendingRecommendations(allContents, { maxItems: 30 });
      default:
        return [];
    }
  }, [activeTab, allContents, allItems.length]);

  // 订阅源名称映射
  const getSubName = (subId: string) => {
    return subscriptions.find(s => s.id === subId)?.name || '未知';
  };

  // 处理推荐项点击
  const handleItemClick = (item: ContentItem) => {
    setSelectedItem(item);
    // 记录阅读
    updateUserPreferences(item, 'read');
    setLoadingSimilar(true);
    // 异步加载相似文章
    setTimeout(() => {
      const similar = findSimilarArticles(item, allContents, { maxItems: 8, minSimilarity: 0.15 });
      setSimilarArticles(similar);
      setLoadingSimilar(false);
    }, 100);
  };

  // 生成摘要
  const handleSummarize = (item: ContentItem) => {
    updateUserPreferences(item, 'summarize');
    onSelectContent(item);
    onNavigateToSummary();
  };

  // 渲染推荐列表项
  const renderRecommendationItem = (recItem: RecommendedItem) => {
    const plainDesc = recItem.description?.replace(/<[^>]+>/g, '').slice(0, 150) || '';
    const reasonInfo = REASON_LABELS[recItem.reason];
    const isRead = prefs.readHistory.includes(recItem.id);

    return (
      <Card
        key={recItem.id}
        size="small"
        hoverable
        style={{ marginBottom: 8, borderRadius: 6 }}
        bodyStyle={{ padding: 12 }}
        onClick={() => handleItemClick(recItem)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Space>
              <Text strong style={{ fontSize: 14 }}>{recItem.title}</Text>
              {isRead && <Tag color="default" style={{ fontSize: 10 }}>已读</Tag>}
              <Tooltip title={reasonInfo.text}>
                <Tag color={reasonInfo.color} style={{ fontSize: 10 }}>{reasonInfo.text}</Tag>
              </Tooltip>
            </Space>
            <div style={{ marginTop: 4 }}>
              <Space size={4}>
                <Tag style={{ fontSize: 11 }}>{getSubName(recItem.subscriptionId)}</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {dayjs(recItem.pubDate).fromNow()}
                </Text>
                {recItem.summary && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    📋 已摘要
                  </Text>
                )}
              </Space>
            </div>
            {plainDesc && (
              <Paragraph
                type="secondary"
                style={{ fontSize: 12, marginTop: 4, marginBottom: 0, lineHeight: 1.5 }}
                ellipsis={{ rows: 2, expandable: false }}
              >
                {plainDesc}
              </Paragraph>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8 }}>
            <Button
              size="small"
              icon={<RobotOutlined />}
              onClick={(e) => { e.stopPropagation(); handleSummarize(recItem); }}
            >
              摘要
            </Button>
            {recItem.link && (
              <a
                href={recItem.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: 11, textAlign: 'center' }}
              >
                原文
              </a>
            )}
          </div>
        </div>
        {/* 关键词展示 */}
        {recItem.keywords && recItem.keywords.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <Space size={4} wrap>
              {recItem.keywords.slice(0, 5).map(kw => (
                <Tag key={kw} style={{ fontSize: 10 }}>{kw}</Tag>
              ))}
            </Space>
          </div>
        )}
      </Card>
    );
  };

  // 渲染相似文章
  const renderSimilarItem = (simItem: SimilarItem) => {
    const plainDesc = simItem.item.description?.replace(/<[^>]+>/g, '').slice(0, 100) || '';
    return (
      <Card
        key={simItem.item.id}
        size="small"
        style={{ marginBottom: 6, borderRadius: 6 }}
        bodyStyle={{ padding: 10 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <a
              href={simItem.item.link || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ fontWeight: 500, fontSize: 13 }}
            >
              {simItem.item.title}
            </a>
            <div style={{ marginTop: 2 }}>
              <Space size={4}>
                <Tag style={{ fontSize: 10 }}>{getSubName(simItem.item.subscriptionId)}</Tag>
                <Text type="secondary" style={{ fontSize: 10 }}>
                  {dayjs(simItem.item.pubDate).fromNow()}
                </Text>
              </Space>
            </div>
            {simItem.matchedKeywords.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <Space size={2} wrap>
                  {simItem.matchedKeywords.slice(0, 4).map(kw => (
                    <Tag key={kw} color="blue" style={{ fontSize: 10 }}>{kw}</Tag>
                  ))}
                </Space>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', marginLeft: 8 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              相似度
            </Text>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1677ff' }}>
              {Math.round(simItem.similarity * 100)}%
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (allItems.length === 0) {
    return (
      <div>
        <Title level={4}>🧠 智能推荐</Title>
        <Empty
          description="暂无推荐内容，请先抓取订阅源获取内容"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div>
      <Title level={4}>🧠 智能推荐</Title>

      <Tabs
        activeKey={activeTab}
        onChange={key => { setActiveTab(key as RecommendationType); setSelectedItem(null); }}
        items={[
          {
            key: 'personalized',
            label: (
              <span><LikeOutlined /> 个性化推荐</span>
            ),
          },
          {
            key: 'hybrid',
            label: (
              <span><FireOutlined /> 混合推荐</span>
            ),
          },
          {
            key: 'trending',
            label: (
              <span><ClockCircleOutlined /> 热门新鲜</span>
            ),
          },
        ]}
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'flex', gap: 16 }}>
        {/* 左侧：推荐列表 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              共 {recommendations.length} 条推荐
            </Text>
          </div>
          <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            {recommendations.map(renderRecommendationItem)}
          </div>
        </div>

        {/* 右侧：选中项详情 + 相似文章 */}
        {selectedItem && (
          <div style={{ width: 320, flexShrink: 0 }}>
            <Card
              title="📄 选中内容"
              size="small"
              extra={
                <Button size="small" icon={<RobotOutlined />} onClick={() => handleSummarize(selectedItem)}>
                  生成摘要
                </Button>
              }
              style={{ marginBottom: 12 }}
              bodyStyle={{ padding: 12 }}
            >
              <div style={{ marginBottom: 8 }}>
                <Text strong>{selectedItem.title}</Text>
              </div>
              <Space size={4} style={{ marginBottom: 8 }}>
                <Tag style={{ fontSize: 11 }}>{getSubName(selectedItem.subscriptionId)}</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {dayjs(selectedItem.pubDate).format('YYYY-MM-DD HH:mm')}
                </Text>
              </Space>
              {selectedItem.summary && (
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>已摘要：</Text>
                  <Text style={{ fontSize: 12 }}>{selectedItem.summary.slice(0, 80)}...</Text>
                </div>
              )}
              <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                {selectedItem.description?.replace(/<[^>]+>/g, '').slice(0, 100)}...
              </div>
            </Card>

            <Card
              title="🔗 相似文章"
              size="small"
              style={{ maxHeight: 300, overflowY: 'auto' }}
              bodyStyle={{ padding: 8 }}
            >
              {loadingSimilar ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin size="small" />
                </div>
              ) : similarArticles.length > 0 ? (
                similarArticles.map(renderSimilarItem)
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>暂无相似文章</Text>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};