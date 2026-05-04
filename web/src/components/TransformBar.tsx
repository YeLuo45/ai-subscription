/**
 * TransformBar Component
 * Provides format transformation buttons for summary content
 * Transforms: 摘要 -> 推文 / Newsletter / 思维导图
 */

import { useState } from 'react';
import { Button, Space, Typography, Card, Spin, message } from 'antd';
import { FileTextOutlined, TwitterOutlined, MailOutlined, MindOutlined } from '@ant-design/icons';

const { Text } = Typography;

export type TransformFormat = 'summary' | 'tweet' | 'newsletter' | 'mindmap';

interface TransformBarProps {
  summary: string;
  keywords: string[];
  originalArticleLink?: string;
}

interface TransformResult {
  content: string;
  format: TransformFormat;
}

export default function TransformBar({ summary, keywords, originalArticleLink }: TransformBarProps) {
  const [activeFormat, setActiveFormat] = useState<TransformFormat>('summary');
  const [transformedContent, setTransformedContent] = useState<TransformResult | null>(null);
  const [loading, setLoading] = useState(false);

  const formatButtons: { key: TransformFormat; label: string; icon: React.ReactNode }[] = [
    { key: 'summary', label: '摘要', icon: <FileTextOutlined /> },
    { key: 'tweet', label: '推文', icon: <TwitterOutlined /> },
    { key: 'newsletter', label: 'Newsletter', icon: <MailOutlined /> },
    { key: 'mindmap', label: '思维导图', icon: <MindOutlined /> },
  ];

  const handleTransform = async (format: TransformFormat) => {
    if (format === 'summary') {
      setActiveFormat('summary');
      setTransformedContent(null);
      return;
    }

    // If already cached, just switch
    if (transformedContent?.format === format) {
      setActiveFormat(format);
      return;
    }

    setLoading(true);
    setActiveFormat(format);

    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: summary,
          format: format,
          keywords: keywords,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      
      let content = data.content;
      // For tweet format, append source link if provided
      if (format === 'tweet' && originalArticleLink) {
        content = content.replace(/\[来源链接\]$/, `[来源链接](${originalArticleLink})`);
      }

      setTransformedContent({ content, format });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      message.error(`转换失败: ${errorMsg}`);
      setActiveFormat('summary');
      setTransformedContent(null);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (activeFormat === 'summary') {
      return (
        <Card size="small" style={{ marginTop: 16 }}>
          <Text>{summary}</Text>
          {keywords.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Space size={[0, 4]} wrap>
                {keywords.map((kw, idx) => (
                  <span key={idx} style={{ 
                    background: '#f0f0f0', 
                    padding: '2px 8px', 
                    borderRadius: 4, 
                    fontSize: 12,
                    marginRight: 4,
                    marginBottom: 4,
                    display: 'inline-block'
                  }}>
                    #{kw}
                  </span>
                ))}
              </Space>
            </div>
          )}
        </Card>
      );
    }

    if (loading) {
      return (
        <Card size="small" style={{ marginTop: 16, minHeight: 100 }}>
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin />&nbsp;&nbsp;正在转换格式...
          </div>
        </Card>
      );
    }

    if (transformedContent && transformedContent.format === activeFormat) {
      return (
        <Card size="small" style={{ marginTop: 16 }}>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            fontFamily: 'inherit',
            margin: 0,
            fontSize: 14,
            lineHeight: 1.6
          }}>
            {transformedContent.content}
          </pre>
        </Card>
      );
    }

    return null;
  };

  return (
    <div style={{ marginTop: 16 }}>
      <Space size="middle" wrap>
        {formatButtons.map(({ key, label, icon }) => (
          <Button
            key={key}
            type={activeFormat === key ? 'primary' : 'default'}
            icon={icon}
            onClick={() => handleTransform(key)}
            style={activeFormat === key ? { fontWeight: 'bold' } : {}}
          >
            {label}
          </Button>
        ))}
      </Space>
      
      {renderContent()}
    </div>
  );
}
