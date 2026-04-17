/**
 * AI 摘要页面
 */
import React, { useState } from 'react';
import {
  Card, Button, Typography, Tag, Space, Spin, Alert, Empty, Select,
} from 'antd';
import { RobotOutlined, CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ContentItem } from '../types';

const { Title, Text, Paragraph } = Typography;

interface SummaryPageProps {
  content: ContentItem | null;
  onGenerateSummary: (item: ContentItem, length: 'short' | 'medium' | 'long') => Promise<{
    summary: string;
    keywords: string[];
    modelUsed?: string;
  }>;
}

export const SummaryPage: React.FC<SummaryPageProps> = ({
  content,
  onGenerateSummary,
}) => {
  const [summaryResult, setSummaryResult] = useState<{
    summary: string;
    keywords: string[];
    modelUsed: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryLength, setSummaryLength] = useState<'short' | 'medium' | 'long'>('medium');

  const handleGenerate = async () => {
    if (!content) return;
    setLoading(true);
    setError(null);
    try {
      const result = await onGenerateSummary(content, summaryLength);
      setSummaryResult({
        ...result,
        modelUsed: result.modelUsed || 'AI',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '摘要生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (summaryResult) {
      const text = `${summaryResult.summary}\n\n关键词：${summaryResult.keywords.join(', ')}`;
      navigator.clipboard.writeText(text).then(() => {
        // silent success
      });
    }
  };

  if (!content) {
    return (
      <div>
        <Title level={4}>🤖 AI 摘要</Title>
        <Empty
          description="请先在内容列表中选择一篇文章，然后点击「AI 摘要」生成内容摘要"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div>
      <Title level={4}>🤖 AI 摘要</Title>

      {/* 原文信息 */}
      <Card
        title={content.title}
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(content.pubDate).format('YYYY-MM-DD HH:mm')}
          </Text>
        }
      >
        <Paragraph
          type="secondary"
          ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}
        >
          {content.description?.replace(/<[^>]+>/g, '')}
        </Paragraph>
        {content.link && (
          <a href={content.link} target="_blank" rel="noopener noreferrer">
            查看原文 ↗
          </a>
        )}
      </Card>

      {/* 控制区 */}
      <Space style={{ marginBottom: 16 }}>
        <Select
          value={summaryLength}
          onChange={setSummaryLength}
          style={{ width: 120 }}
          options={[
            { value: 'short', label: '短摘要' },
            { value: 'medium', label: '中等摘要' },
            { value: 'long', label: '完整摘要' },
          ]}
        />
        <Button
          type="primary"
          icon={<RobotOutlined />}
          onClick={handleGenerate}
          loading={loading}
          disabled={!content.description}
        >
          {loading ? '生成中...' : '生成 AI 摘要'}
        </Button>
      </Space>

      {error && (
        <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
      )}

      {/* 摘要结果 */}
      {summaryResult && (
        <Card
          title="📋 摘要结果"
          extra={
            <Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                由 {summaryResult.modelUsed} 生成
              </Text>
              <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>
                复制
              </Button>
            </Space>
          }
        >
          <div style={{ marginBottom: 16 }}>
            <Text strong>摘要：</Text>
            <Paragraph style={{ marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
              {summaryResult.summary}
            </Paragraph>
          </div>

          {summaryResult.keywords.length > 0 && (
            <div>
              <Text strong>🔑 关键词：</Text>
              <Space wrap style={{ marginTop: 8 }}>
                {summaryResult.keywords.map((kw, i) => (
                  <Tag key={i} color="blue">{kw}</Tag>
                ))}
              </Space>
            </div>
          )}
        </Card>
      )}

      {/* 加载状态 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" tip="AI 正在生成摘要，请稍候..." />
        </div>
      )}
    </div>
  );
};
