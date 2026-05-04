import { useState } from 'react';
import { Card, Tag, Button, Space, Typography, Input, Popover } from 'antd';
import { StarOutlined, StarFilled, DeleteOutlined, ExpandOutlined, CompressOutlined } from '@ant-design/icons';
import type { Summary } from '../types';

const { Text } = Typography;

interface SummaryCardProps {
  summary: Summary;
  subscriptionName: string;
  articleTitle: string;
  onUpdate: (summary: Summary) => void;
  onDelete: (id: string) => void;
}

export default function SummaryCard({ summary, subscriptionName, articleTitle, onUpdate, onDelete }: SummaryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');

  function toggleStar() {
    onUpdate({ ...summary, isStarred: !summary.isStarred });
  }

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !summary.tags.includes(trimmed)) {
      onUpdate({ ...summary, tags: [...summary.tags, trimmed] });
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    onUpdate({ ...summary, tags: summary.tags.filter(t => t !== tag) });
  }

  const content = summary.content.length > 300 && !expanded
    ? summary.content.slice(0, 300) + '...'
    : summary.content;

  return (
    <Card 
      size="small" 
      style={{ marginBottom: 12 }}
      actions={[
        <Button key="star" type="text" icon={summary.isStarred ? <StarFilled /> : <StarOutlined />} onClick={toggleStar}>
          {summary.isStarred ? '已收藏' : '收藏'}
        </Button>,
        <Button key="expand" type="text" icon={expanded ? <CompressOutlined /> : <ExpandOutlined />} onClick={() => setExpanded(!expanded)}>
          {expanded ? '收起' : '展开'}
        </Button>,
        <Button key="delete" type="text" danger icon={<DeleteOutlined />} onClick={() => onDelete(summary.id)}>
          删除
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 8 }}>
        <Space>
          <Text strong>{subscriptionName}</Text>
          <Text type="secondary">·</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{articleTitle}</Text>
        </Space>
      </div>
      
      <Text style={{ display: 'block', marginBottom: 8 }}>{content}</Text>
      
      {summary.keywords.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <Space size={[0, 4]} wrap>
            {summary.keywords.map((kw, idx) => (
              <Tag key={idx} style={{ marginBottom: 4 }}>#{kw}</Tag>
            ))}
          </Space>
        </div>
      )}
      
      {/* Tags Section */}
      <div style={{ marginTop: 8 }}>
        <Popover 
          trigger="click" 
          open={editingTags} 
          onOpenChange={setEditingTags}
          content={
            <div style={{ minWidth: 200 }}>
              <Input 
                size="small" 
                placeholder="输入标签后回车" 
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onPressEnter={() => addTag(tagInput)}
              />
              <div style={{ marginTop: 8 }}>
                <Space size={[0, 4]} wrap>
                  {summary.tags.map(tag => (
                    <Tag 
                      key={tag} 
                      closable 
                      onClose={() => removeTag(tag)}
                      style={{ marginBottom: 4 }}
                    >
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>
          }
        >
          <Button size="small" type="text">+ 标签</Button>
        </Popover>
      </div>
      
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
        {new Date(summary.createdAt).toLocaleString('zh-CN')}
      </Text>
    </Card>
  );
}