// Analytics Dashboard - Subscription health + Reading trend visualization

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Space, Typography, Segmented, Progress, Badge } from 'antd';
import {
  BarChartOutlined,
  RiseOutlined,
  FileTextOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { getSubscriptionHealth, getReadingTrend, type SubscriptionHealth, type DailyReadingRecord } from '../services/analytics';
import { getUserStats, type UserStats } from '../services/stats';
import TrendChart from './TrendChart';

const { Title, Text } = Typography;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TimePeriod = '7d' | '30d' | '90d';

const AnalyticsDashboard: React.FC<Props> = ({ isOpen, onClose }) => {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<SubscriptionHealth[]>([]);
  const [readingTrend, setReadingTrend] = useState<DailyReadingRecord[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, health, trend] = await Promise.all([
        getUserStats(),
        getSubscriptionHealth(),
        getReadingTrend(period === '7d' ? 7 : period === '30d' ? 30 : 90),
      ]);
      setUserStats(stats);
      setHealthMetrics(health);
      setReadingTrend(trend);
    } catch (error) {
      console.error('[AnalyticsDashboard] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  // Format health score color
  const getHealthColor = (score: number): string => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  // Format health score badge
  const getHealthBadge = (score: number): { color: string; text: string } => {
    if (score >= 80) return { color: 'success', text: '优秀' };
    if (score >= 60) return { color: 'warning', text: '一般' };
    return { color: 'error', text: '需关注' };
  };

  // Health table columns
  const healthColumns = [
    {
      title: '订阅源',
      dataIndex: 'subscriptionName',
      key: 'name',
      render: (name: string, record: SubscriptionHealth) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }} ellipsis={{ tooltip: record.url }}>
            {record.url.length > 40 ? record.url.slice(0, 40) + '...' : record.url}
          </Text>
        </Space>
      ),
    },
    {
      title: '健康分',
      dataIndex: 'healthScore',
      key: 'healthScore',
      width: 100,
      render: (score: number) => {
        const badge = getHealthBadge(score);
        return (
          <Space>
            <Progress
              type="circle"
              percent={score}
              size={40}
              strokeColor={getHealthColor(score)}
              format={() => score}
            />
          </Space>
        );
      },
    },
    {
      title: '更新频率',
      dataIndex: 'updateFrequency',
      key: 'updateFrequency',
      width: 100,
      render: (freq: number) => (
        <Text>{freq > 0 ? `${freq}h` : '-'}</Text>
      ),
    },
    {
      title: '错误率',
      dataIndex: 'errorRate',
      key: 'errorRate',
      width: 90,
      render: (rate: number) => {
        const percent = Math.round(rate * 100);
        const color = rate < 0.1 ? '#52c41a' : rate < 0.3 ? '#faad14' : '#ff4d4f';
        return <Text style={{ color }}>{percent}%</Text>;
      },
    },
    {
      title: '响应时间',
      dataIndex: 'avgResponseTime',
      key: 'avgResponseTime',
      width: 100,
      render: (ms: number) => (
        <Text type="secondary">{ms > 0 ? `${ms}ms` : '-'}</Text>
      ),
    },
    {
      title: '文章数',
      dataIndex: 'totalArticles',
      key: 'totalArticles',
      width: 80,
      render: (count: number) => <Tag>{count}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean) => enabled
        ? <Badge status="success" text="启用" />
        : <Badge status="default" text="停用" />,
    },
  ];

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <Title level={4} style={{ margin: 0 }}>📊 数据分析面板</Title>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Period Selector */}
        <div style={styles.periodBar}>
          <Segmented
            size="small"
            value={period}
            onChange={v => setPeriod(v as TimePeriod)}
            options={[
              { label: '7天', value: '7d' },
              { label: '30天', value: '30d' },
              { label: '90天', value: '90d' },
            ]}
          />
        </div>

        {/* Content */}
        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>加载中...</div>
          ) : (
            <>
              {/* Top Stats Row */}
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Card size="small" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <Statistic
                      title={<span style={{ color: 'white' }}>订阅源</span>}
                      value={userStats?.totalSubscriptions || 0}
                      prefix={<TeamOutlined style={{ color: 'white' }} />}
                      valueStyle={{ color: 'white' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                    <Statistic
                      title={<span style={{ color: 'white' }}>文章总数</span>}
                      value={userStats?.totalArticles || 0}
                      prefix={<FileTextOutlined style={{ color: 'white' }} />}
                      valueStyle={{ color: 'white' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                    <Statistic
                      title={<span style={{ color: 'white' }}>健康订阅源</span>}
                      value={healthMetrics.filter(h => h.healthScore >= 60).length}
                      prefix={<CheckCircleOutlined style={{ color: 'white' }} />}
                      valueStyle={{ color: 'white' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                    <Statistic
                      title={<span style={{ color: 'white' }}>活跃天数</span>}
                      value={userStats?.activeDays || 0}
                      prefix={<FireOutlined style={{ color: 'white' }} />}
                      suffix={`/ ${period === '7d' ? 7 : period === '30d' ? 30 : 90}`}
                      valueStyle={{ color: 'white' }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Reading Trend Chart */}
              <Card
                size="small"
                title="📈 日阅读趋势"
                style={{ marginBottom: 16 }}
                extra={<Text type="secondary">文章数/天</Text>}
              >
                {readingTrend.length > 0 ? (
                  <TrendChart
                    data={readingTrend.map(r => ({ date: r.date, value: r.count }))}
                    width={650}
                    height={180}
                    lineColor="#1890ff"
                    label="Articles"
                  />
                ) : (
                  <div style={styles.emptyChart}>暂无数据</div>
                )}
              </Card>

              {/* Subscription Health Table */}
              <Card
                size="small"
                title={<><ThunderboltOutlined /> 订阅源健康度</>}
                style={{ marginBottom: 16 }}
                extra={<Text type="secondary">基于更新频率、错误率、响应时间</Text>}
              >
                {healthMetrics.length > 0 ? (
                  <Table
                    size="small"
                    columns={healthColumns}
                    dataSource={healthMetrics.map(h => ({ ...h, key: h.subscriptionId }))}
                    pagination={healthMetrics.length > 10 ? { pageSize: 10 } : false}
                    scroll={{ x: 700 }}
                  />
                ) : (
                  <div style={styles.emptyText}>暂无订阅源数据</div>
                )}
              </Card>

              {/* Quick Stats */}
              <Row gutter={[12, 12]}>
                <Col span={8}>
                  <Card size="small" title="⏱️ 平均更新间隔">
                    <Statistic
                      value={healthMetrics.length > 0
                        ? Math.round(healthMetrics.reduce((a, h) => a + h.updateFrequency, 0) / healthMetrics.length * 10) / 10
                        : 0}
                      suffix="小时"
                      prefix={<ClockCircleOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" title="📉 平均错误率">
                    <Statistic
                      value={healthMetrics.length > 0
                        ? Math.round(healthMetrics.reduce((a, h) => a + h.errorRate, 0) / healthMetrics.length * 100)
                        : 0}
                      suffix="%"
                      valueStyle={{ color: healthMetrics.length > 0 && 
                        (healthMetrics.reduce((a, h) => a + h.errorRate, 0) / healthMetrics.length) < 0.1 
                        ? '#52c41a' : '#faad14' }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" title="⚡ 平均响应时间">
                    <Statistic
                      value={healthMetrics.length > 0
                        ? Math.round(healthMetrics.reduce((a, h) => a + h.avgResponseTime, 0) / healthMetrics.length)
                        : 0}
                      suffix="ms"
                      prefix={<ThunderboltOutlined />}
                    />
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '850px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '0 4px',
    lineHeight: 1,
  },
  periodBar: {
    display: 'flex',
    justifyContent: 'center',
    padding: '12px',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: '#fafafa',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
    color: '#999',
  },
  emptyChart: {
    textAlign: 'center',
    padding: '32px',
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    padding: '24px',
    color: '#999',
  },
};

export default AnalyticsDashboard;