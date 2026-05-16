// RecommendationPanel - Main panel showing subscription recommendations
import { useState, useEffect } from 'react';
import { 
  List, 
  Button, 
  Space, 
  Typography, 
  Tag, 
  Card, 
  message, 
  Tabs, 
  Empty,
  Spin,
  Badge,
  Tooltip 
} from 'antd';
import { 
  PlusOutlined, 
  CloseOutlined, 
  FireOutlined, 
  AppstoreOutlined,
  LikeOutlined,
  TeamOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { 
  RecommendationType, 
  SubscriptionRecommendation,
  ArticleRecommendation 
} from '../../services/recommendation-engine/types';
import { 
  getRecommendations, 
  getArticleRecommendations,
  getInterestProfile 
} from '../../services/recommendation-engine';
import { saveSubscription } from '../../services/storage';
import InterestProfileCard from './InterestProfileCard';

const { Title, Text, Paragraph } = Typography;

const RECOMMENDATION_TABS = [
  { key: 'similar', label: '🎯 内容相似', icon: <LikeOutlined /> },
  { key: 'category', label: '📁 同类目', icon: <AppstoreOutlined /> },
  { key: 'trending', label: '🔥 趋势热门', icon: <FireOutlined /> },
  { key: 'similar-users', label: '👥 同好多订', icon: <TeamOutlined /> },
] as const;

export default function RecommendationPanel() {
  const [subRecs, setSubRecs] = useState<SubscriptionRecommendation[]>([]);
  const [articleRecs, setArticleRecs] = useState<ArticleRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RecommendationType>('similar');
  const [dismissedUrls, setDismissedUrls] = useState<Set<string>>(new Set());
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [activeTab]);

  async function loadRecommendations() {
    setLoading(true);
    try {
      const [subs, arts] = await Promise.all([
        getRecommendations(activeTab, 20),
        getArticleRecommendations(activeTab, 30),
      ]);
      // Filter out dismissed
      setSubRecs(subs.filter(r => !dismissedUrls.has(r.subscription.url)));
      setArticleRecs(arts.filter(r => !dismissedUrls.has(r.article.link)));
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      message.error('加载推荐失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(rec: SubscriptionRecommendation) {
    try {
      await saveSubscription({
        name: rec.subscription.name,
        url: rec.subscription.url,
        type: rec.subscription.type,
        category: rec.subscription.category,
        enabled: true,
        aiSummaryEnabled: true,
        fetchIntervalMinutes: 60,
      });
      message.success(`已订阅 ${rec.subscription.name}`);
      setSubRecs(prev => prev.filter(r => r.subscription.url !== rec.subscription.url));
    } catch (err) {
      message.error('订阅失败');
    }
  }

  function handleDismiss(item: SubscriptionRecommendation | ArticleRecommendation) {
    const url = 'url' in item.subscription ? item.subscription.url : item.article.link;
    setDismissedUrls(prev => new Set([...prev, url]));
    if ('url' in item.subscription) {
      setSubRecs(prev => prev.filter(r => r.subscription.url !== url));
    } else {
      setArticleRecs(prev => prev.filter(r => r.article.link !== url));
    }
  }

  function getTypeTagColor(type: RecommendationType): string {
    switch (type) {
      case 'similar': return 'blue';
      case 'category': return 'green';
      case 'trending': return 'red';
      case 'similar-users': return 'purple';
      default: return 'default';
    }
  }

  function getTypeTagText(type: RecommendationType): string {
    switch (type) {
      case 'similar': return '内容相似';
      case 'category': return '同分类';
      case 'trending': return '趋势热门';
      case 'similar-users': return '同好多订';
      default: return type;
    }
  }

  const tabItems = RECOMMENDATION_TABS.map(tab => ({
    key: tab.key,
    label: (
      <span>
        {tab.icon} {tab.label}
      </span>
    ),
  }));

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>🎯 为你推荐</Title>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
            基于你的阅读历史和兴趣标签精选
          </Paragraph>
        </div>
        <Space>
          <Button 
            type="text" 
            icon={<ReloadOutlined spin={loading} />} 
            onClick={loadRecommendations}
            disabled={loading}
          >
            刷新
          </Button>
          <Button 
            type="text" 
            onClick={() => setShowProfile(!showProfile)}
          >
            {showProfile ? '隐藏' : '查看'}兴趣画像
          </Button>
        </Space>
      </div>

      {showProfile && (
        <div style={{ marginBottom: 16 }}>
          <InterestProfileCard />
        </div>
      )}

      <Tabs 
        activeKey={activeTab} 
        onChange={(key) => setActiveTab(key as RecommendationType)} 
        items={tabItems}
        style={{ marginBottom: 16 }}
      />

      {activeTab === 'subscriptions' ? (
        <Empty description="请从上方选择推荐类型" />
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">正在分析你的兴趣...</Text>
          </div>
        </div>
      ) : (
        <List
          dataSource={subRecs}
          renderItem={(rec) => (
            <Card 
              size="small" 
              style={{ marginBottom: 12 }}
              actions={[
                <Button 
                  key="subscribe" 
                  type="primary" 
                  size="small" 
                  icon={<PlusOutlined />} 
                  onClick={() => handleSubscribe(rec)}
                >
                  订阅
                </Button>,
                <Button 
                  key="dismiss" 
                  type="text" 
                  size="small" 
                  icon={<CloseOutlined />} 
                  onClick={() => handleDismiss(rec)}
                >
                  不感兴趣
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{rec.subscription.name}</Text>
                    <Tag color={getTypeTagColor(rec.type)}>
                      {getTypeTagText(rec.type)}
                    </Tag>
                    {rec.subscription.category && (
                      <Tag>{rec.subscription.category}</Tag>
                    )}
                    {rec.score >= 5 && (
                      <Badge count="高度匹配" style={{ backgroundColor: '#52c41a' }} />
                    )}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{rec.reason}</Text>
                    {rec.matchedKeywords.length > 0 && (
                      <Space size={[0, 4]} style={{ marginTop: 4 }}>
                        {rec.matchedKeywords.map(kw => (
                          <Tag key={kw} style={{ marginBottom: 2 }}>{kw}</Tag>
                        ))}
                      </Space>
                    )}
                  </Space>
                }
              />
            </Card>
          )}
          locale={{
            emptyText: subRecs.length === 0 ? (
              <Empty description="暂无推荐，试着添加更多订阅源吧" />
            ) : undefined,
          }}
        />
      )}
    </div>
  );
}
