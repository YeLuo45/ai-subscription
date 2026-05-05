/**
 * FeedDiscoveryPanel - RSS/Atom 自动发现面板
 * 提供 URL 输入、自动发现、多选订阅功能
 */
import React, { useState } from 'react';
import type { CheckboxChangeEvent } from 'antd';
import {
  Card,
  Input,
  Button,
  List,
  Checkbox,
  Tag,
  Space,
  Typography,
  Spin,
  Alert,
  Empty,
  message,
} from 'antd';
import { SearchOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { discoverFeeds, DiscoveredFeed } from '../utils/feedDiscovery';

const { Text } = Typography;

interface FeedDiscoveryPanelProps {
  onAdd: (feed: {
    name: string;
    url: string;
    type: 'rss' | 'atom';
    category: string;
    enabled: boolean;
    aiSummaryEnabled: boolean;
    fetchIntervalMinutes: number;
  }) => void;
}

export const FeedDiscoveryPanel: React.FC<FeedDiscoveryPanelProps> = ({ onAdd }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [discoveredFeeds, setDiscoveredFeeds] = useState<DiscoveredFeed[]>([]);
  const [selectedFeeds, setSelectedFeeds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleDiscover = async () => {
    if (!url.trim()) {
      message.warning('请输入网站 URL');
      return;
    }

    setLoading(true);
    setError('');
    setDiscoveredFeeds([]);
    setSelectedFeeds([]);
    setHasSearched(true);

    try {
      const feeds = await discoverFeeds(url);
      setDiscoveredFeeds(feeds);

      if (feeds.length === 0) {
        setError('未发现任何 RSS/Atom 订阅源，请确认 URL 是否正确');
      } else {
        message.success(`发现 ${feeds.length} 个订阅源`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`发现失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: CheckboxChangeEvent) => {
    if (e.target.checked) {
      setSelectedFeeds(discoveredFeeds.map((f) => f.url));
    } else {
      setSelectedFeeds([]);
    }
  };

  const handleSelectFeed = (feedUrl: string, checked: boolean) => {
    setSelectedFeeds((prev) =>
      checked ? [...prev, feedUrl] : prev.filter((url) => url !== feedUrl)
    );
  };

  const handleBatchSubscribe = () => {
    const selected = discoveredFeeds.filter((f) => selectedFeeds.includes(f.url));
    if (selected.length === 0) {
      message.warning('请先选择要订阅的源');
      return;
    }

    selected.forEach((feed) => {
      onAdd({
        name: feed.title || feed.url,
        url: feed.url,
        type: feed.type,
        category: '未分类',
        enabled: true,
        aiSummaryEnabled: true,
        fetchIntervalMinutes: 60,
      });
    });

    message.success(`已添加 ${selected.length} 个订阅源`);
    setSelectedFeeds([]);
    setDiscoveredFeeds([]);
    setUrl('');
    setHasSearched(false);
  };

  const allSelected =
    discoveredFeeds.length > 0 && selectedFeeds.length === discoveredFeeds.length;

  return (
    <Card
      title="自动发现订阅源"
      extra={
        <Button icon={<SearchOutlined />} type="primary" onClick={handleDiscover} loading={loading}>
          发现
        </Button>
      }
      style={{ marginBottom: 16 }}
    >
      {/* URL 输入 */}
      <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
        <Input
          placeholder="输入网站 URL，例如: https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPressEnter={handleDiscover}
          disabled={loading}
          size="large"
        />
        <Button
          icon={<SyncOutlined />}
          onClick={handleDiscover}
          loading={loading}
          size="large"
        >
          发现
        </Button>
      </Space.Compact>

      {/* 说明 */}
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        输入网站地址，系统将自动探测常见的 RSS/Atom 订阅路径，并尝试解析 HTML 中的 link 标签来发现订阅源。
      </Text>

      {/* 加载状态 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="正在探测订阅源..." />
        </div>
      )}

      {/* 错误提示 */}
      {error && !loading && (
        <Alert
          message="未发现订阅源"
          description={error}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 发现结果 */}
      {!loading && discoveredFeeds.length > 0 && (
        <>
          {/* 全选 + 批量订阅 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Checkbox
              checked={allSelected}
              indeterminate={selectedFeeds.length > 0 && !allSelected}
              onChange={handleSelectAll}
            >
              <Text strong>全选 ({discoveredFeeds.length})</Text>
            </Checkbox>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={selectedFeeds.length === 0}
              onClick={handleBatchSubscribe}
            >
              批量订阅 ({selectedFeeds.length})
            </Button>
          </div>

          {/* 结果列表 */}
          <List
            size="small"
            bordered
            dataSource={discoveredFeeds}
            renderItem={(feed) => (
              <List.Item
                key={feed.url}
                style={{ padding: '8px 12px' }}
                actions={[
                  <Tag key="type" color={feed.type === 'atom' ? 'green' : 'blue'}>
                    {feed.type.toUpperCase()}
                  </Tag>,
                ]}
              >
                <Checkbox
                  checked={selectedFeeds.includes(feed.url)}
                  onChange={(e) => handleSelectFeed(feed.url, e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{feed.title}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#888',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {feed.url}
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                    {feed.detectedFrom}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </>
      )}

      {/* 空状态 */}
      {!loading && hasSearched && discoveredFeeds.length === 0 && !error && (
        <Empty description="未在指定网站发现 RSS/Atom 订阅源" />
      )}
    </Card>
  );
};
