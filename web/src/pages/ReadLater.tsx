import { useState, useEffect, useMemo } from 'react';
import { List, Button, Space, Typography, Tag, Card, message, Empty } from 'antd';
import { BookOutlined, DeleteOutlined, EyeOutlined, EyeNoneOutlined } from '@ant-design/icons';
import { getReadLaterArticles, updateArticle, getSubscriptions } from '../services/storage';
import type { Article, Subscription } from '../types';

const { Text, Title } = Typography;

export default function ReadLater() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const subMap = useMemo(() => new Map(subscriptions.map(s => [s.id, s])), [subscriptions]);

  useEffect(() => {
    async function load() {
      const [arts, subs] = await Promise.all([
        getReadLaterArticles(),
        getSubscriptions(),
      ]);
      setArticles(arts);
      setSubscriptions(subs);
      setLoading(false);
    }
    load();
  }, []);

  async function handleRemove(article: Article) {
    await updateArticle({ ...article, isReadLater: false, readLaterAt: undefined });
    setArticles(prev => prev.filter(a => a.id !== article.id));
    message.success('已从稍后读移除');
  }

  async function handleToggleRead(article: Article) {
    const updated = { ...article, isRead: !article.isRead };
    await updateArticle(updated);
    setArticles(prev => prev.map(a => a.id === updated.id ? updated : a));
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <BookOutlined /> 稍后读
        </Title>
        <Text type="secondary">共 {articles.length} 篇</Text>
      </div>

      {articles.length === 0 ? (
        <Empty description="暂无稍后读内容" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={articles}
          renderItem={(article) => {
            const sub = subMap.get(article.subscriptionId);
            return (
              <Card 
                size="small" 
                style={{ marginBottom: 12 }}
                actions={[
                  <Button 
                    key="read" 
                    size="small" 
                    icon={article.isRead ? <EyeNoneOutlined /> : <EyeOutlined />} 
                    onClick={() => handleToggleRead(article)}
                  >
                    {article.isRead ? '标记未读' : '标记已读'}
                  </Button>,
                  <Button 
                    key="remove" 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={() => handleRemove(article)}
                  >
                    移除
                  </Button>,
                  <Button 
                    key="open" 
                    size="small" 
                    onClick={() => window.open(article.link, '_blank')}
                  >
                    打开原文
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text delete={article.isRead}>{article.title}</Text>
                      {article.isRead && <Tag color="default">已读</Tag>}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {sub?.name || '未知订阅源'} · {new Date(article.pubDate).toLocaleDateString('zh-CN')}
                      </Text>
                      {article.description && (
                        <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ rows: 2 }}>
                          {article.description}
                        </Text>
                      )}
                      {article.readLaterAt && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          加入于 {new Date(article.readLaterAt).toLocaleString('zh-CN')}
                        </Text>
                      )}
                    </Space>
                  }
                />
              </Card>
            );
          }}
        />
      )}
    </div>
  );
}