/**
 * 内容列表页面
 */
import React, { useState } from 'react';
import {
  List, Button, Typography, Tag, Space, Badge,
} from 'antd';
import { RobotOutlined, LinkOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Subscription, ContentItem } from '../types';

const { Title, Text } = Typography;

interface ContentListPageProps {
  subscriptions: Subscription[];
  contents: Record<string, ContentItem[]>;
  onSelectContent: (content: ContentItem) => void;
  onNavigateToSummary: () => void;
}

export const ContentListPage: React.FC<ContentListPageProps> = ({
  subscriptions,
  contents,
  onSelectContent,
  onNavigateToSummary,
}) => {
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  const allContents = Object.values(contents).flat()
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  const displayContents = selectedSubId
    ? (contents[selectedSubId] || [])
    : allContents;

  const getSubName = (id: string) => subscriptions.find(s => s.id === id)?.name || '未知';

  return (
    <div>
      <Title level={4}>内容列表</Title>

      {/* 订阅源筛选 */}
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Badge count={allContents.length} style={{ backgroundColor: '#1677ff' }}>
            <Button
              type={selectedSubId === null ? 'primary' : 'default'}
              onClick={() => setSelectedSubId(null)}
            >
              全部
            </Button>
          </Badge>
          {subscriptions.map(sub => (
            <Badge key={sub.id} count={contents[sub.id]?.length || 0}>
              <Button
                type={selectedSubId === sub.id ? 'primary' : 'default'}
                onClick={() => setSelectedSubId(sub.id)}
                disabled={!sub.enabled}
              >
                {sub.name}
              </Button>
            </Badge>
          ))}
        </Space>
      </div>

      {/* 内容列表 */}
      <List
        itemLayout="vertical"
        dataSource={displayContents}
        locale={{ emptyText: '暂无内容，请先抓取订阅源' }}
        renderItem={(item) => {
          const plainDesc = item.description?.replace(/<[^>]+>/g, '').slice(0, 200) || '';
          return (
            <List.Item
              key={item.id}
              actions={[
                <Button
                  key="summary"
                  type="link"
                  icon={<RobotOutlined />}
                  onClick={() => {
                    onSelectContent(item);
                    onNavigateToSummary();
                  }}
                >
                  AI 摘要
                </Button>,
                item.link ? (
                  <a
                    key="open"
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <LinkOutlined /> 原文
                  </a>
                ) : null,
              ].filter(Boolean)}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <a href={item.link || '#'} target="_blank" rel="noopener noreferrer">
                      {item.title}
                    </a>
                    {item.isRead && <Tag color="default">已读</Tag>}
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space>
                      <Tag>{getSubName(item.subscriptionId)}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(item.pubDate).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    </Space>
                    {item.summary && (
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {item.summary.slice(0, 100)}...
                      </Text>
                    )}
                  </Space>
                }
              />
              <div style={{ color: '#666', fontSize: 13, lineHeight: 1.6 }}>
                {plainDesc}
                {item.description && item.description.length > 200 ? '...' : ''}
              </div>
            </List.Item>
          );
        }}
      />
    </div>
  );
};
