import { useState, useEffect, useMemo } from 'react';
import { Input, Tabs, Empty, Spin, Space, Typography } from 'antd';
import { SearchOutlined, StarOutlined, FileTextOutlined } from '@ant-design/icons';
import SummaryCard from '../components/SummaryCard';
import { getSummaries, updateSummary, deleteSummary, getSubscriptions, getArticles } from '../services/storage';
import type { Summary, Subscription, Article } from '../types';

const { Text } = Typography;

export default function SummaryHistory() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [sums, subs, arts] = await Promise.all([
        getSummaries(),
        getSubscriptions(),
        getArticles(),
      ]);
      setSummaries(sums.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setSubscriptions(subs);
      setArticles(arts);
      setLoading(false);
    }
    load();
  }, []);

  const subMap = useMemo(() => new Map(subscriptions.map(s => [s.id, s.name])), [subscriptions]);
  const articleMap = useMemo(() => new Map(articles.map(a => [a.id, a.title])), [articles]);

  // All unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    summaries.forEach(s => s.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [summaries]);

  // Search filter
  const filteredSummaries = useMemo(() => {
    let result = summaries;
    
    // Tab filter
    if (activeTab === 'starred') {
      result = result.filter(s => s.isStarred);
    }
    
    // Tag filter
    if (selectedTag) {
      result = result.filter(s => s.tags.includes(selectedTag));
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.content.toLowerCase().includes(q) ||
        s.keywords.some(k => k.toLowerCase().includes(q)) ||
        (articleMap.get(s.articleId) || '').toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [summaries, activeTab, selectedTag, searchQuery, articleMap]);

  async function handleUpdate(updated: Summary) {
    await updateSummary(updated);
    setSummaries(prev => prev.map(s => s.id === updated.id ? updated : s));
  }

  async function handleDelete(id: string) {
    await deleteSummary(id);
    setSummaries(prev => prev.filter(s => s.id !== id));
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>;

  const tabItems = [
    { key: 'all', label: `全部 (${summaries.length})` },
    { key: 'starred', label: `已收藏 (${summaries.filter(s => s.isStarred).length})` },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <Input 
          prefix={<SearchOutlined />}
          placeholder="搜索摘要内容、关键词..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          allowClear
        />
      </div>

      {allTags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Space size={[0, 4]} wrap>
            <Text type="secondary" style={{ marginRight: 8 }}>标签:</Text>
            {selectedTag && (
              <Text 
                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setSelectedTag(null)}
              >
                全部
              </Text>
            )}
            {allTags.map(tag => (
              <Text
                key={tag}
                style={{ 
                  cursor: 'pointer', 
                  color: selectedTag === tag ? '#1890ff' : undefined,
                  fontWeight: selectedTag === tag ? 'bold' : undefined,
                  marginLeft: selectedTag ? 8 : 0,
                }}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                #{tag}
              </Text>
            ))}
          </Space>
        </div>
      )}

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        items={tabItems}
        style={{ marginBottom: 16 }}
      />

      {filteredSummaries.length === 0 ? (
        <Empty description={searchQuery ? '未找到匹配的摘要' : '暂无摘要历史'} />
      ) : (
        filteredSummaries.map(summary => (
          <SummaryCard
            key={summary.id}
            summary={summary}
            subscriptionName={subMap.get(summary.subscriptionId) || '未知订阅源'}
            articleTitle={articleMap.get(summary.articleId) || '未知文章'}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))
      )}
    </div>
  );
}