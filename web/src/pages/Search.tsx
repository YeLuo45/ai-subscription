import { useState, useEffect, useCallback } from 'react';
import { Input, List, Tabs, Empty, Spin, Typography, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { search, SearchResult } from '../services/search';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const typeLabels: Record<string, string> = {
  subscription: '订阅源',
  article: '文章',
  summary: '摘要',
  note: '笔记',
};

const typeColors: Record<string, string> = {
  subscription: 'blue',
  article: 'green',
  summary: 'purple',
  note: 'orange',
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await search(q);
      setResults(res);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const grouped = {
    subscription: results.filter(r => r.type === 'subscription'),
    article: results.filter(r => r.type === 'article'),
    summary: results.filter(r => r.type === 'summary'),
    note: results.filter(r => r.type === 'note'),
  };

  const filtered = activeTab === 'all' 
    ? results 
    : results.filter(r => r.type === activeTab);

  const tabItems = [
    { key: 'all', label: `全部 (${results.length})` },
    { key: 'subscription', label: `订阅源 (${grouped.subscription.length})` },
    { key: 'article', label: `文章 (${grouped.article.length})` },
    { key: 'summary', label: `摘要 (${grouped.summary.length})` },
    { key: 'note', label: `笔记 (${grouped.note.length})` },
  ];

  function handleResultClick(result: SearchResult) {
    // Navigate based on type
    // For now, just scroll to top and show
    if (result.type === 'subscription' && result.url) {
      window.open(result.url, '_blank');
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <Title level={4}>🔍 全局搜索</Title>
      
      <Search
        placeholder="搜索订阅源、文章、摘要、笔记..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        allowClear
        size="large"
        style={{ marginBottom: 16 }}
        prefix={<SearchOutlined />}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : query && filtered.length === 0 ? (
        <Empty description={`未找到"${query}"相关结果`} />
      ) : filtered.length > 0 ? (
        <>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            items={tabItems}
            style={{ marginBottom: 16 }}
          />
          <List
            dataSource={filtered}
            renderItem={(item) => (
              <List.Item 
                key={`${item.type}-${item.id}`}
                onClick={() => handleResultClick(item)}
                style={{ cursor: 'pointer' }}
              >
                <List.Item.Meta
                  title={
                    <span>
                      <Tag color={typeColors[item.type]}>{typeLabels[item.type]}</Tag>
                      <span dangerouslySetInnerHTML={{ __html: item.title }} />
                    </span>
                  }
                  description={
                    <span dangerouslySetInnerHTML={{ __html: item.excerpt }} />
                  }
                />
              </List.Item>
            )}
          />
        </>
      ) : (
        <Empty description="输入关键词开始搜索" />
      )}
    </div>
  );
}
