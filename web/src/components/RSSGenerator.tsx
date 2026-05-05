/**
 * RSSGenerator Component
 * Generate RSS 2.0 and Atom 1.0 feeds from public lists
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Space, message, Tag, Descriptions, Empty, Select, Alert } from 'antd';
import { DownloadOutlined, CopyOutlined, LinkOutlined } from '@ant-design/icons';
import type { PublicList, RSSItem, FeedInfo } from '../types/publicList';
import * as publicListDB from '../db/publicListDB';
import * as rssService from '../services/rssService';

// Mock articles for demo - in production these would come from actual feed data
interface Article {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  feedId: string;
  author?: string;
  categories?: string[];
  aiSummary?: string;
}

const MOCK_ARTICLES: Article[] = [
  {
    id: 'art1',
    title: 'AI 技术最新发展趋势',
    description: '探讨人工智能在各行业的最新应用和技术突破，包括大语言模型、计算机视觉和机器人技术的进展。',
    link: 'https://example.com/ai-trends',
    pubDate: '2024-01-15T10:30:00Z',
    feedId: 'feed1',
    author: '科技观察员',
    categories: ['科技', '人工智能'],
    aiSummary: '本文深入分析了2024年AI技术的三大趋势：大模型轻量化、多模态融合以及边缘计算落地。专家预测，到2025年，超过50%的企业将采用小型语言模型来降低成本。',
  },
  {
    id: 'art2',
    title: 'React 19 新特性解析',
    description: '深入了解 React 19 的新特性和改进，包括 Server Components、Actions 和新的 Hooks。',
    link: 'https://example.com/react19',
    pubDate: '2024-01-14T15:20:00Z',
    feedId: 'feed2',
    author: '前端开发者的博客',
    categories: ['前端', 'React'],
    aiSummary: 'React 19 引入了革命性的 Server Components，允许组件在服务器端渲染并流式传输到客户端。Actions API 简化了表单处理和数据提交，use() Hook 则解决了长期存在的 promise 地狱问题。',
  },
  {
    id: 'art3',
    title: '金融市场周报',
    description: '本周金融市场动态和投资策略分析，包括股市、债市和外汇市场的表现。',
    link: 'https://example.com/finance',
    pubDate: '2024-01-13T09:00:00Z',
    feedId: 'feed3',
    author: '财经分析师',
    categories: ['财经', '投资'],
    aiSummary: '本周全球股市整体上涨，美联储加息预期降温导致科技股反弹。A股市场成交量放大，北向资金净流入超200亿元。债券市场方面，10年期国债收益率小幅下行。',
  },
  {
    id: 'art4',
    title: '量子计算突破',
    description: 'IBM 发布新一代量子处理器，量子比特数达到 1000 个。',
    link: 'https://example.com/quantum',
    pubDate: '2024-01-12T14:00:00Z',
    feedId: 'feed1',
    author: '科研前沿',
    categories: ['科技', '量子计算'],
    aiSummary: 'IBM 发布的 Condor 处理器拥有 1121 个超导量子比特，是目前世界上最大的量子处理器。这一突破将加速量子纠错算法的研究，预计 5-10 年内可实现实用量子计算。',
  },
];

const MOCK_FEEDS: FeedInfo[] = [
  { id: 'feed1', title: '科技资讯', url: 'https://tech.example.com', description: '科技行业新闻' },
  { id: 'feed2', title: '前端开发', url: 'https://dev.example.com', description: '前端技术文章' },
  { id: 'feed3', title: '财经分析', url: 'https://finance.example.com', description: '金融市场分析' },
];

interface RSSGeneratorProps {
  list?: PublicList | null;
}

export const RSSGenerator: React.FC<RSSGeneratorProps> = ({ list }) => {
  const [currentList, setCurrentList] = useState<PublicList | null>(list || null);
  const [selectedFormat, setSelectedFormat] = useState<'rss2' | 'atom'>('rss2');
  const [previewContent, setPreviewContent] = useState<string>('');
  const [shareableUrl, setShareableUrl] = useState<string>('');

  useEffect(() => {
    if (list) {
      setCurrentList(list);
    }
  }, [list]);

  // Get articles for the selected feeds
  const getArticlesForList = (publicList: PublicList): Article[] => {
    if (!publicList.feedIds || publicList.feedIds.length === 0) {
      return [];
    }
    return MOCK_ARTICLES.filter(art => publicList.feedIds.includes(art.feedId));
  };

  // Convert articles to RSS items
  const articlesToRSSItems = (articles: Article[]): RSSItem[] => {
    return articles.map(art => ({
      title: art.title,
      link: art.link,
      description: art.aiSummary || art.description,
      pubDate: art.pubDate,
      author: art.author,
      categories: art.categories,
      guid: `urn:sha256:${btoa(art.id).slice(0, 22)}`,
    }));
  };

  const generateFeedInfo = (publicList: PublicList): FeedInfo => {
    const includedFeeds = MOCK_FEEDS.filter(f => publicList.feedIds.includes(f.id));
    const feedTitles = includedFeeds.map(f => f.title).join(', ');
    return {
      id: publicList.id,
      title: publicList.name,
      url: `${window.location.origin}/public/${publicList.id}`,
      description: `${publicList.description || '公开列表'} - 包含: ${feedTitles}`,
    };
  };

  const handleGenerate = () => {
    if (!currentList) {
      message.warning('请先选择一个公开列表');
      return;
    }

    const articles = getArticlesForList(currentList);
    if (articles.length === 0) {
      message.warning('此列表没有包含任何文章');
      return;
    }

    const feedInfo = generateFeedInfo(currentList);
    const items = articlesToRSSItems(articles);

    const xml = selectedFormat === 'rss2'
      ? rssService.generateRSS2(feedInfo, items)
      : rssService.generateAtom1(feedInfo, items);

    setPreviewContent(xml);
    
    // Generate shareable blob URL
    const url = rssService.generateShareableURL(feedInfo, items, selectedFormat);
    setShareableUrl(url);

    message.success(`已生成 ${selectedFormat === 'rss2' ? 'RSS 2.0' : 'Atom 1.0'} 格式`);
  };

  const handleDownload = () => {
    if (!currentList) {
      message.warning('请先选择一个公开列表');
      return;
    }

    const articles = getArticlesForList(currentList);
    if (articles.length === 0) {
      message.warning('此列表没有包含任何文章');
      return;
    }

    const feedInfo = generateFeedInfo(currentList);
    const items = articlesToRSSItems(articles);

    if (selectedFormat === 'rss2') {
      rssService.downloadRSS2(feedInfo, items);
    } else {
      rssService.downloadAtom1(feedInfo, items);
    }
  };

  const handleCopyLink = async () => {
    if (!shareableUrl) {
      handleGenerate();
    }
    
    try {
      await rssService.copyToClipboard(shareableUrl);
      message.success('链接已复制到剪贴板');
    } catch {
      message.error('复制失败');
    }
  };

  const articles = currentList ? getArticlesForList(currentList) : [];

  return (
    <div style={{ maxWidth: 900 }}>
      <Card title="RSS/Atom 生成器" size="small">
        {!currentList ? (
          <Empty description="请先在公开列表中选择一个列表" />
        ) : (
          <>
            <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="列表名称">{currentList.name}</Descriptions.Item>
              <Descriptions.Item label="包含订阅源">{currentList.feedIds.length} 个</Descriptions.Item>
              <Descriptions.Item label="文章数量">
                <Tag color="blue">{articles.length} 篇</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Space style={{ marginBottom: 16 }}>
              <Select
                value={selectedFormat}
                onChange={setSelectedFormat}
                options={[
                  { value: 'rss2', label: 'RSS 2.0' },
                  { value: 'atom', label: 'Atom 1.0' },
                ]}
                style={{ width: 120 }}
              />
              <Button type="primary" onClick={handleGenerate}>
                生成 Feed
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleDownload} disabled={!previewContent}>
                下载 XML
              </Button>
              <Button icon={<CopyOutlined />} onClick={handleCopyLink}>
                复制链接
              </Button>
            </Space>

            {currentList.feedIds.length === 0 && (
              <Alert
                message="此列表没有选择任何订阅源"
                description="请编辑列表并选择要包含的订阅源"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {previewContent && (
              <div>
                <h4>预览 ({selectedFormat === 'rss2' ? 'RSS 2.0' : 'Atom 1.0'})</h4>
                <div
                  style={{
                    maxHeight: 400,
                    overflow: 'auto',
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {previewContent}
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default RSSGenerator;
