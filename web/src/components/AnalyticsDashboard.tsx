// Analytics Dashboard - Data visualization with reading trends, health dashboard, and reading time stats
// Integrates: ReadingTrendChart, HealthDashboard, ReadingTimeStats

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Space, Typography, Segmented } from 'antd';
import {
  BarChartOutlined,
  RiseOutlined,
  FileTextOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { getSubscriptionHealth, getDailyReadingStats, getReadingTimeStats, calculateHealthScore, type SubscriptionHealth } from '../services/analytics';
import { getUserStats, type UserStats } from '../services/stats';
import ReadingTrendChart from './ReadingTrendChart';
import HealthDashboard from './HealthDashboard';
import ReadingTimeStats from './ReadingTimeStats';

const { Title, Text } = Typography;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TimePeriod = '7d' | '30d' | '90d';

const AnalyticsDashboard: React.FC<Props> = ({ isOpen, onClose }) => {
  const [period, setPeriod] = useState<TimePeriod>('7d');
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<SubscriptionHealth[]>([]);
  const [readingStats, setReadingStats] = useState<{
    dailyData: Array<{ date: string; value: number }>;
    weeklyData: Array<{ week: string; daily: number[] }>;
    averageReadingTime: number;
    totalReadArticles: number;
  }>({
    dailyData: [],
    weeklyData: [],
    averageReadingTime: 0,
    totalReadArticles: 0,
  });
  const [healthScore, setHealthScore] = useState(50);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, health, dailyStats, timeStats] = await Promise.all([
        getUserStats(),
        getSubscriptionHealth(),
        getDailyReadingStats(),
        getReadingTimeStats(),
      ]);
      
      setUserStats(stats);
      setHealthMetrics(health);
      setReadingStats({
        dailyData: dailyStats.map(d => ({ date: d.date, value: d.count })),
        weeklyData: timeStats.weeklyData,
        averageReadingTime: timeStats.averageReadingTime,
        totalReadArticles: timeStats.totalReadArticles,
      });
      
      // Calculate overall health score
      const score = calculateHealthScore();
      setHealthScore(score > 0 ? score : 50);
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

              {/* Reading Trend Chart - 7 day line chart */}
              <Card
                size="small"
                title="📈 阅读趋势（7天）"
                style={{ marginBottom: 16 }}
                extra={<Text type="secondary">文章数/天</Text>}
              >
                {readingStats.dailyData.length > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <ReadingTrendChart
                      data={readingStats.dailyData}
                      width={650}
                      height={180}
                      lineColor="#1890ff"
                      label="Articles"
                    />
                  </div>
                ) : (
                  <div style={styles.emptyChart}>暂无数据</div>
                )}
              </Card>

              {/* Health Dashboard + Reading Time Stats Row */}
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {/* Health Dashboard - Ring Chart */}
                <Col span={8}>
                  <Card
                    size="small"
                    title="❤️ 健康度仪表盘"
                    extra={<Text type="secondary">综合评分</Text>}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                      <HealthDashboard
                        score={healthScore}
                        size={150}
                        strokeWidth={12}
                        label="Health"
                      />
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <Space direction="vertical" size={4}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          基于阅读频率、订阅活跃度、文章完成率
                        </Text>
                      </Space>
                    </div>
                  </Card>
                </Col>
                
                {/* Reading Time Stats - Heatmap */}
                <Col span={16}>
                  <Card
                    size="small"
                    title="⏱️ 阅读时间统计"
                    extra={
                      <Space>
                        <Text type="secondary">日均: {readingStats.averageReadingTime}min</Text>
                        <Text type="secondary">已读: {readingStats.totalReadArticles}篇</Text>
                      </Space>
                    }
                  >
                    {readingStats.weeklyData.length > 0 ? (
                      <ReadingTimeStats
                        weeklyData={readingStats.weeklyData}
                        size={520}
                        cellSize={36}
                        cellGap={4}
                      />
                    ) : (
                      <div style={styles.emptyChart}>暂无数据</div>
                    )}
                  </Card>
                </Col>
              </Row>

              {/* Quick Stats Row */}
              <Row gutter={[12, 12]}>
                <Col span={6}>
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
                <Col span={6}>
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
                <Col span={6}>
                  <Card size="small" title="⚡ 平均响应时间">
                    <Statistic
                      value={healthMetrics.length > 0
                        ? Math.round(healthMetrics.reduce((a, h) => a + h.avgResponseTime, 0) / healthMetrics.length)
                        : 0}
                      suffix="ms"
                      prefix={<BarChartOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" title="📈 阅读趋势">
                    <Statistic
                      value={readingStats.dailyData.length > 0 
                        ? Math.round(readingStats.dailyData.reduce((a, d) => a + d.value, 0) / readingStats.dailyData.length * 10) / 10
                        : 0}
                      suffix="篇/天"
                      prefix={<RiseOutlined />}
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
    width: '900px',
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
};

export default AnalyticsDashboard;