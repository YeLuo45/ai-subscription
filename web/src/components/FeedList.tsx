/**
 * FeedList Component
 * Main feed list view with tag filtering sidebar
 */

import React, { useState, useEffect, useCallback } from 'react';
import { List, Card, Typography, Space, Button, Spin, Empty, Modal, Form, Input, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { TagFilterSidebar } from './TagFilterSidebar';
import { TagBadge } from './TagBadge';
import * as tagService from '../services/tagService';
import type { Tag } from '../types/tag';

const { Title, Text } = Typography;

interface Article {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  feedId: string;
}

interface Feed {
  id: string;
  title: string;
  description?: string;
  url: string;
}

// Mock data for demonstration
const MOCK_ARTICLES: Article[] = [
  {
    id: 'art1',
    title: 'AI 技术最新发展趋势',
    description: '探讨人工智能在各行业的最新应用和技术突破',
    link: 'https://example.com/ai-trends',
    pubDate: '2024-01-15',
    feedId: 'feed1',
  },
  {
    id: 'art2',
    title: 'React 19 新特性解析',
    description: '深入了解 React 19 的新特性和改进',
    link: 'https://example.com/react19',
    pubDate: '2024-01-14',
    feedId: 'feed2',
  },
  {
    id: 'art3',
    title: '金融市场周报',
    description: '本周金融市场动态和投资策略分析',
    link: 'https://example.com/finance',
    pubDate: '2024-01-13',
    feedId: 'feed3',
  },
];

const MOCK_FEEDS: Feed[] = [
  { id: 'feed1', title: '科技资讯', description: '科技行业新闻', url: 'https://tech.example.com/rss' },
  { id: 'feed2', title: '前端开发', description: '前端技术文章', url: 'https://dev.example.com/rss' },
  { id: 'feed3', title: '财经分析', description: '金融市场分析', url: 'https://finance.example.com/rss' },
];

export const FeedList: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>(MOCK_ARTICLES);
  const [feeds] = useState<Feed[]>(MOCK_FEEDS);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>(MOCK_ARTICLES);
  const [loading, setLoading] = useState(false);
  const [addFeedModalOpen, setAddFeedModalOpen] = useState(false);
  const [articleTags, setArticleTags] = useState<Record<string, Tag[]>>({});
  const [form] = Form.useForm();

  // Load saved filter state
  useEffect(() => {
    const loadFilterState = async () => {
      try {
        const saved = await tagService.getSelectedTags();
        setSelectedTagIds(saved);
      } catch (err) {
        console.error('Failed to load filter state:', err);
      }
    };
    loadFilterState();
  }, []);

  // Load tags for all articles
  useEffect(() => {
    const loadArticleTags = async () => {
      const tagsMap: Record<string, Tag[]> = {};
      for (const article of articles) {
        try {
          tagsMap[article.id] = await tagService.getTagsForArticle(article.id);
        } catch {
          tagsMap[article.id] = [];
        }
      }
      setArticleTags(tagsMap);
    };
    loadArticleTags();
  }, [articles]);

  // Filter articles by selected tags (OR logic)
  useEffect(() => {
    if (selectedTagIds.length === 0) {
      setFilteredArticles(articles);
      return;
    }

    const filterArticles = async () => {
      const filtered: Article[] = [];
      for (const article of articles) {
        const tags = articleTags[article.id] || [];
        const articleTagIds = tags.map(t => t.id);
        // OR logic: show if article has ANY of the selected tags
        if (selectedTagIds.some(tagId => articleTagIds.includes(tagId))) {
          filtered.push(article);
        }
      }
      setFilteredArticles(filtered);
    };
    filterArticles();
  }, [selectedTagIds, articles, articleTags]);

  const handleTagToggle = useCallback(async (tagId: string) => {
    setSelectedTagIds(prev => {
      const newIds = prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId];
      
      // Persist filter state
      tagService.saveSelectedTags(newIds).catch(console.error);
      return newIds;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedTagIds([]);
    tagService.saveSelectedTags([]).catch(console.error);
  }, []);

  const handleAddFeed = async (values: { title: string; url: string; description?: string }) => {
    setLoading(true);
    try {
      // Generate AI tags for the new feed
      const newTags = await tagService.generateFeedTags(
        values.title,
        values.description || '',
      );

      // In a real app, you would save the feed to DB here
      const newFeed: Feed = {
        id: `feed_${Date.now()}`,
        title: values.title,
        description: values.description,
        url: values.url,
      };

      // Add tags to feed
      for (const tag of newTags) {
        await tagService.addTagToFeed(newFeed.id, tag.id, 'ai');
      }

      message.success(`订阅源已添加，已自动生成 ${newTags.length} 个标签`);
      setAddFeedModalOpen(false);
      form.resetFields();
    } catch (err) {
      message.error('添加订阅源失败');
    } finally {
      setLoading(false);
    }
  };

  const getTagsForArticle = (articleId: string): Tag[] => {
    return articleTags[articleId] || [];
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Tag Filter Sidebar */}
      <TagFilterSidebar
        selectedTagIds={selectedTagIds}
        onTagToggle={handleTagToggle}
        onClear={handleClearFilters}
      />

      {/* Main Content */}
      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>文章列表</Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddFeedModalOpen(true)}
            >
              添加订阅源
            </Button>
          </Space>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : filteredArticles.length === 0 ? (
          <Empty
            description={selectedTagIds.length > 0 ? '没有符合筛选条件的文章' : '暂无文章'}
          />
        ) : (
          <List
            itemLayout="vertical"
            dataSource={filteredArticles}
            renderItem={(article) => {
              const tags = getTagsForArticle(article.id);
              return (
                <List.Item
                  extra={
                    <Button
                      type="link"
                      href={article.link}
                      target="_blank"
                    >
                      查看原文
                    </Button>
                  }
                >
                  <List.Item.Meta
                    title={<a href={article.link} target="_blank" rel="noopener noreferrer">{article.title}</a>}
                    description={
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text type="secondary">{article.pubDate}</Text>
                        <Text ellipsis={{ rows: 2 }}>{article.description}</Text>
                        {tags.length > 0 && (
                          <Space size="small" wrap>
                            {tags.map(tag => (
                              <TagBadge key={tag.id} tag={tag} />
                            ))}
                          </Space>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </div>

      {/* Add Feed Modal */}
      <Modal
        title="添加订阅源"
        open={addFeedModalOpen}
        onCancel={() => setAddFeedModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddFeed}>
          <Form.Item
            name="title"
            label="订阅源标题"
            rules={[{ required: true, message: '请输入订阅源标题' }]}
          >
            <Input placeholder="如：科技资讯" />
          </Form.Item>
          <Form.Item
            name="url"
            label="RSS 地址"
            rules={[
              { required: true, message: '请输入 RSS 地址' },
              { type: 'url', message: '请输入有效的 URL' },
            ]}
          >
            <Input placeholder="https://example.com/rss.xml" />
          </Form.Item>
          <Form.Item name="description" label="描述（可选）">
            <Input.TextArea placeholder="订阅源描述，用于 AI 生成标签" rows={3} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              添加并生成标签
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FeedList;
