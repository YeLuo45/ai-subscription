import { useState, useEffect } from 'react';
import { List, Button, Space, Typography, Tag, Card, message, Tabs, Empty } from 'antd';
import { PlusOutlined, CloseOutlined, StarOutlined, FileTextOutlined } from '@ant-design/icons';
import { 
  recommendSubscriptions, 
  recommendArticles, 
  SubscriptionRecommendation,
  ArticleRecommendation,
} from '../services/recommendationEngine';
import { saveSubscription } from '../services/storage';

const { Title, Text, Paragraph } = Typography;

export default function Recommendations() {
  const [subRecs, setSubRecs] = useState<SubscriptionRecommendation[]>([]);
  const [articleRecs, setArticleRecs] = useState<ArticleRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [dismissedUrls, setDismissedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRecommendations();
  }, []);

  async function loadRecommendations() {
    setLoading(true);
    try {
      const [subs, arts] = await Promise.all([
        recommendSubscriptions(20),
        recommendArticles(30),
      ]);
      // Filter out dismissed
      setSubRecs(subs.filter(r => !dismissedUrls.has(r.subscription.url)));
      setArticleRecs(arts.filter(r => !dismissedUrls.has(r.article.link)));
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

  const tabItems = [
    { key: 'subscriptions', label: `订阅源推荐 (${subRecs.length})` },
    { key: 'articles', label: `文章推荐 (${articleRecs.length})` },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Title level={4}>🎯 为你推荐</Title>
      <Paragraph type="secondary">基于你的阅读历史和兴趣标签精选</Paragraph>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        items={tabItems}
        style={{ marginBottom: 16 }}
      />

      {activeTab === 'subscriptions' && (
        subRecs.length === 0 ? (
          <Empty description="暂无推荐，试着添加更多订阅源吧" />
        ) : (
          <List
            loading={loading}
            dataSource={subRecs}
            renderItem={(rec) => (
              <Card 
                size="small" 
                style={{ marginBottom: 12 }}
                actions={[
                  <Button key="subscribe" type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleSubscribe(rec)}>
                    订阅
                  </Button>,
                  <Button key="dismiss" type="text" size="small" icon={<CloseOutlined />} onClick={() => handleDismiss(rec)}>
                    不感兴趣
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{rec.subscription.name}</Text>
                      <Tag color="blue">{rec.subscription.category}</Tag>
                      {rec.score >= 5 && <Tag color="green">高度匹配</Tag>}
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
          />
        )
      )}

      {activeTab === 'articles' && (
        articleRecs.length === 0 ? (
          <Empty description="暂无推荐文章" />
        ) : (
          <List
            loading={loading}
            dataSource={articleRecs}
            renderItem={(rec) => (
              <Card 
                size="small" 
                style={{ marginBottom: 12 }}
                actions={[
                  <Button key="open" size="small" onClick={() => window.open(rec.article.link, '_blank')}>
                    打开原文
                  </Button>,
                  <Button key="dismiss" type="text" size="small" icon={<CloseOutlined />} onClick={() => handleDismiss(rec)}>
                    不感兴趣
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={<Text delete={rec.article.isRead}>{rec.article.title}</Text>}
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{rec.article.description?.slice(0, 100)}...</Text>
                      {rec.matchedKeywords.length > 0 && (
                        <Space size={[0, 4]} style={{ marginTop: 4 }}>
                          {rec.matchedKeywords.map(kw => (
                            <Tag key={kw} color="purple" style={{ marginBottom: 2 }}>{kw}</Tag>
                          ))}
                        </Space>
                      )}
                    </Space>
                  }
                />
              </Card>
            )}
          />
        )
      )}
    </div>
  );
}
