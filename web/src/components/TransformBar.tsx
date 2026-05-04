/**
 * TransformBar Component
 * Provides format transformation buttons for summary content
 * Transforms: 摘要 -> 推文 / Newsletter / 思维导图 / 幻灯片
 */

import { useState, useEffect } from 'react';
import { Button, Space, Typography, Card, Spin, message, Dropdown } from 'antd';
import { FileTextOutlined, TwitterOutlined, MailOutlined, MindOutlined, ExportOutlined, CaretDownOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import MindMapViewer from './MindMapViewer';
import SlidesViewer from './SlidesViewer';
import SharePanel from './SharePanel';

const { Text } = Typography;

export type TransformFormat = 'summary' | 'tweet' | 'newsletter' | 'mindmap' | 'slides';

interface TransformBarProps {
  summary: string;
  keywords: string[];
  originalArticleLink?: string;
}

interface TransformResult {
  content: string;
  slides?: { title: string; content: string }[];
  format: TransformFormat;
}

// Check if content looks like a markdown tree (for mindmap)
const isMarkdownTree = (content: string): boolean => {
  return content.includes('# ') && (content.includes('## ') || content.includes('### '));
};

export default function TransformBar({ summary, keywords, originalArticleLink }: TransformBarProps) {
  const [activeFormat, setActiveFormat] = useState<TransformFormat>('summary');
  const [transformedContent, setTransformedContent] = useState<TransformResult | null>(null);
  const [loading, setLoading] = useState(false);

  const formatButtons: { key: TransformFormat; label: string; icon: React.ReactNode }[] = [
    { key: 'summary', label: '摘要', icon: <FileTextOutlined /> },
    { key: 'tweet', label: '推文', icon: <TwitterOutlined /> },
    { key: 'newsletter', label: 'Newsletter', icon: <MailOutlined /> },
    { key: 'mindmap', label: '思维导图', icon: <MindOutlined /> },
    { key: 'slides', label: '幻灯片', icon: <span style={{ fontSize: 12 }}>◫</span> },
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
      
      // For tweet format, append source link if provided
      let content = data.content;
      if (format === 'tweet' && originalArticleLink && content) {
        content = content.replace(/\[来源链接\]$/, `[来源链接](${originalArticleLink})`);
      }

      setTransformedContent({ content, slides: data.slides, format });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      message.error(`转换失败: ${errorMsg}`);
      setActiveFormat('summary');
      setTransformedContent(null);
    } finally {
      setLoading(false);
    }
  };

  // Export handlers
  const handleExportPDF = () => {
    window.print();
  };

  const handleExportPNG = () => {
    if (activeFormat === 'mindmap') {
      const svg = document.querySelector('.mindmap-svg') as SVGElement;
      if (svg) {
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          canvas.width = svg.clientWidth * 2;
          canvas.height = svg.clientHeight * 2;
          ctx?.scale(2, 2);
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.create.createElement('a');
            a.href = url;
            a.download = 'mindmap.png';
            a.click();
            URL.revokeObjectURL(url);
          });
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
      }
    }
  };

  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'pdf',
      label: '导出 PDF',
      icon: <ExportOutlined />,
      onClick: handleExportPDF,
    },
  ];

  // Add PNG export for mindmap
  if (activeFormat === 'mindmap' && transformedContent?.content) {
    exportMenuItems.push({
      key: 'png',
      label: '导出 PNG',
      icon: <ExportOutlined />,
      onClick: () => {
        // Find the SVG element inside MindMapViewer
        const svg = document.querySelector('svg');
        if (!svg) return;
        
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          canvas.width = svg.clientWidth * 2;
          canvas.height = svg.clientHeight * 2;
          ctx?.scale(2, 2);
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mindmap.png';
            a.click();
            URL.revokeObjectURL(url);
          });
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
      },
    });
  }

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
      // Render MindMapViewer for mindmap format
      if (activeFormat === 'mindmap' && transformedContent.content && isMarkdownTree(transformedContent.content)) {
        return <MindMapViewer content={transformedContent.content} />;
      }

      // Render SlidesViewer for slides format
      if (activeFormat === 'slides' && transformedContent.slides) {
        return <SlidesViewer slides={transformedContent.slides} />;
      }

      // Default text rendering
      return (
        <Card 
          size="small" 
          style={{ marginTop: 16 }}
          extra={
            <Dropdown menu={{ items: exportMenuItems }} trigger={['click']}>
              <Button size="small" icon={<ExportOutlined />} type="text">
                导出 <CaretDownOutlined />
              </Button>
            </Dropdown>
          }
        >
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
          {transformedContent.content && (
            <SharePanel 
              content={transformedContent.content} 
              title={formatButtons.find(f => f.key === activeFormat)?.label} 
            />
          )}
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
