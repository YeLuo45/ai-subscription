import { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, List, Tag, Space, Typography, Segmented } from 'antd';
import { BarChartOutlined, RiseOutlined, FileTextOutlined, TeamOutlined } from '@ant-design/icons';
import { getUserStats, UserStats } from '../services/stats';
import SvgBarChart from '../components/SvgBarChart';

const { Title, Text } = Typography;

export default function Stats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d'>('30d');

  useEffect(() => {
    getUserStats().then(s => {
      setStats(s);
      setLoading(false);
    });
  }, []);

  if (loading || !stats) {
    return <div style={{ padding: 16 }}>加载中...</div>;
  }

  // Filter trend data based on period
  const trendData = period === '7d' 
    ? stats.dailyArticleTrend.slice(-7)
    : stats.dailyArticleTrend;

  // Top feeds by article count
  const topFeeds = [...stats.feedStats]
    .sort((a, b) => b.totalArticles - a.totalArticles)
    .slice(0, 10);

  // Keyword cloud data
  const maxKwCount = stats.topKeywords.length > 0 
    ? Math.max(...Object.values(
        stats.topKeywords.reduce((acc, kw) => ({ ...acc, [kw]: (acc[kw] || 0) + 1 }), {})
      ).length, 1);

  return (
    <div style={{ padding: 16 }}>
      <Title level={4}>📊 数据统计</Title>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic 
              title="订阅源" 
              value={stats.totalSubscriptions} 
              prefix={<TeamOutlined />} 
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic 
              title="文章总数" 
              value={stats.totalArticles} 
              prefix={<FileTextOutlined />} 
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic 
              title="活跃天数" 
              value={stats.activeDays} 
              suffix={`/ ${period === '7d' ? 7 : 30}`}
              prefix={<RiseOutlined />} 
            />
          </Card>
        </Col>
      </Row>

      {/* Daily Trend Chart */}
      <Card 
        title="📈 文章趋势" 
        size="small" 
        style={{ marginBottom: 16 }}
        extra={
          <Segmented 
            size="small"
            value={period} 
            onChange={v => setPeriod(v as '7d' | '30d')}
            options={[{ label: '7天', value: '7d' }, { label: '30天', value: '30d' }]}
          />
        }
      >
        <SvgBarChart 
          data={trendData.map(d => ({ 
            label: d.date, 
            value: d.count 
          }))}
          width={600}
          height={180}
          barColor="#1890ff"
        />
      </Card>

      {/* Top Subscriptions */}
      <Card title="🏆 订阅源活跃排行" size="small" style={{ marginBottom: 16 }}>
        <List
          size="small"
          dataSource={topFeeds}
          renderItem={(feed, idx) => (
            <List.Item>
              <Space style={{ width: '100%' }}>
                <Text strong style={{ width: 24 }}>{idx + 1}</Text>
                <Text style={{ flex: 1 }}>{feed.subscriptionName}</Text>
                <Text type="secondary">{feed.totalArticles} 篇</Text>
                <Tag color={feed.unreadArticles > 0 ? 'blue' : 'default'}>
                  {feed.unreadArticles} 未读
                </Tag>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      {/* Keywords Cloud */}
      <Card title="🔑 热门关键词" size="small">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {stats.topKeywords.slice(0, 20).map((kw, i) => {
            const size = 12 + Math.random() * 10;
            const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'];
            return (
              <Tag 
                key={kw} 
                style={{ fontSize: size, padding: '4px 8px' }}
                color={colors[i % colors.length]}
              >
                {kw}
              </Tag>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
