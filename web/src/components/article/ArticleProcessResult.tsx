/**
 * ArticleProcessResult Component
 * Displays the result of AI processing pipeline (summary, tags, translation)
 */

import React from 'react';
import { Typography, Tag, Space, Button, Card, Divider } from 'antd';
import { CheckCircleOutlined, CloseOutlined, TranslationOutlined, TagsOutlined, FileTextOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export interface ArticleProcessResult {
  summary: string;
  tags: string[];
  translatedContent?: string;
  processedAt: number;
}

interface ArticleProcessResultProps {
  result: ArticleProcessResult;
  onDismiss?: () => void;
}

export const ArticleProcessResult: React.FC<ArticleProcessResultProps> = ({ result, onDismiss }) => {
  const formattedTime = new Date(result.processedAt).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card
      size="small"
      title={
        <Space>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <span>AI 处理结果</span>
        </Space>
      }
      extra={
        onDismiss && (
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onDismiss}
          />
        )
      }
      style={{ marginTop: 16 }}
    >
      {/* Summary Section */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <FileTextOutlined />
          <Text strong>摘要</Text>
        </Space>
        <Paragraph
          ellipsis={{ rows: 3, expandable: true }}
          style={{ marginTop: 8, marginBottom: 0 }}
        >
          {result.summary}
        </Paragraph>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Tags Section */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <TagsOutlined />
          <Text strong>标签</Text>
        </Space>
        <div style={{ marginTop: 8 }}>
          {result.tags.map((tag, index) => (
            <Tag key={index} color="blue">
              {tag}
            </Tag>
          ))}
          {result.tags.length === 0 && (
            <Text type="secondary">暂无标签</Text>
          )}
        </div>
      </div>

      {/* Translation Section */}
      {result.translatedContent && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <div>
            <Space>
              <TranslationOutlined />
              <Text strong>翻译</Text>
            </Space>
            <Paragraph
              ellipsis={{ rows: 3, expandable: true }}
              style={{ marginTop: 8, marginBottom: 0 }}
            >
              {result.translatedContent}
            </Paragraph>
          </div>
        </>
      )}

      {/* Processed Time */}
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          处理时间: {formattedTime}
        </Text>
      </div>
    </Card>
  );
};

export default ArticleProcessResult;
