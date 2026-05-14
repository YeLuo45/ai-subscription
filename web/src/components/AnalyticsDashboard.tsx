// Analytics Dashboard - Comprehensive data analysis panel

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Tag, Space, Typography, Segmented, Tooltip, ProgressProps } from 'antd';
import { 
  BarChartOutlined, 
  RiseOutlined, 
  DollarOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  TrophyOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { aggregateRecords, getDailyCosts, getTopExpensiveModels, getTopExpensiveTaskTypes } from '../services/cost-tracker/aggregator';
import { getRecordsByTimeRange, getAllRecords } from '../services/cost-tracker/storage';
import type { CostSummary, CostRecord } from '../services/cost-tracker/types';
import { getUserStats, type UserStats } from '../services/stats';
import SvgBarChart from './SvgBarChart';

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
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [dailyCosts, setDailyCosts] = useState<Record<string, number>>({});
  const [topModels, setTopModels] = useState<Array<{ modelId: string; cost: number }>>([]);
  const [topTaskTypes, setTopTaskTypes] = useState<Array<{ taskType: string; cost: number }>>([]);
  const [recentRecords, setRecentRecords] = useState<CostRecord[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load user stats
      const stats = await getUserStats();
      setUserStats(stats);

      // Calculate time range
      const now = Date.now();
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startTime = now - days * 24 * 60 * 60 * 1000;

      // Load cost records
      const [rangeRecords, allRecords] = await Promise.all([
        getRecordsByTimeRange(startTime, now),
        getAllRecords(),
      ]);

      // Aggregate cost data
      const summary = aggregateRecords(rangeRecords);
      setCostSummary(summary);

      const daily = getDailyCosts(rangeRecords);
      setDailyCosts(daily);

      const topM = getTopExpensiveModels(rangeRecords, 5);
      setTopModels(topM);

      const topT = getTopExpensiveTaskTypes(rangeRecords, 5);
      setTopTaskTypes(topT);

      // Recent 20 records for table
      setRecentRecords(rangeRecords.slice(-20).reverse());
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

  // Prepare chart data
  const chartData = Object.entries(dailyCosts).map(([date, cost]) => ({
    label: date.slice(5), // MM-DD format
    value: cost,
  }));

  // Format currency
  const formatCost = (cents: number) => `$${(cents / 100).toFixed(4)}`;
  const formatCostFull = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Cost progress bar color
  const getCostStatus = (current: number, limit: number): ProgressProps['status'] => {
    const percent = (current / limit) * 100;
    if (percent >= 95) return 'exception';
    if (percent >= 80) return 'active';
    return 'success';
  };

  // Calculate monthly cost for progress
  const monthlyCost = costSummary?.totalCost || 0;
  const costLimit = 10; // $10 limit for demo
  const costPercent = Math.min((monthlyCost / costLimit) * 100, 100);

  // Task type display names
  const taskTypeNames: Record<string, string> = {
    'quick-summary': '快速摘要',
    'standard-summary': '标准摘要',
    'structured-summary': '结构化摘要',
    'translation': '翻译',
    'tag-generation': '标签生成',
    'knowledge-graph': '知识图谱',
    'chat': '对话',
  };

  // Table columns for recent records
  const recordColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (ts: number) => new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      width: 140,
    },
    {
      title: '任务',
      dataIndex: 'taskType',
      key: 'taskType',
      render: (type: string) => taskTypeNames[type] || type,
    },
    {
      title: '模型',
      dataIndex: 'modelId',
      key: 'modelId',
      render: (model: string) => <Tag color="blue">{model}</Tag>,
    },
    {
      title: '费用',
      dataIndex: 'costUSD',
      key: 'costUSD',
      render: (cost: number) => <Text type={cost > 0.01 ? 'danger' : 'secondary'}>${cost.toFixed(4)}</Text>,
    },
    {
      title: '延迟',
      dataIndex: 'latencyMs',
      key: 'latencyMs',
      render: (ms: number) => <Text type="secondary">{ms.toFixed(0)}ms</Text>,
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      render: (success: boolean) => success 
        ? <Tag color="success" icon={<CheckCircleOutlined />}>成功</Tag>
        : <Tag color="error" icon={<ExclamationCircleOutlined />}>失败</Tag>,
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
                      title={<span style={{ color: 'white' }}>AI 费用</span>}
                      value={formatCostFull(monthlyCost * 100)}
                      prefix={<DollarOutlined style={{ color: 'white' }} />}
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

              {/* Cost Budget Progress */}
              <Card size="small" style={{ marginBottom: 16 }}>
                <div style={styles.budgetHeader}>
                  <Text strong>💰 月度预算使用</Text>
                  <Text type="secondary">{formatCostFull(monthlyCost * 100)} / ${costLimit}</Text>
                </div>
                <Progress 
                  percent={costPercent} 
                  status={getCostStatus(monthlyCost * 100, costLimit)} 
                  strokeColor={costPercent >= 95 ? '#ff4d4f' : costPercent >= 80 ? '#faad14' : '#52c41a'}
                />
              </Card>

              {/* Cost Trend Chart */}
              <Card 
                size="small" 
                title="📈 费用趋势" 
                style={{ marginBottom: 16 }}
                extra={<Text type="secondary">单位: 美元</Text>}
              >
                {chartData.length > 0 ? (
                  <SvgBarChart 
                    data={chartData}
                    width={600}
                    height={150}
                    barColor="#722ed1"
                  />
                ) : (
                  <div style={styles.emptyChart}>暂无费用数据</div>
                )}
              </Card>

              {/* Two Column Layout */}
              <Row gutter={[12, 12]}>
                {/* Top Models */}
                <Col span={12}>
                  <Card size="small" title={<><RobotOutlined /> 模型费用排行</>}>
                    {topModels.length > 0 ? (
                      <div style={styles.rankList}>
                        {topModels.map((item, idx) => (
                          <div key={item.modelId} style={styles.rankItem}>
                            <span style={styles.rankBadge}>{idx + 1}</span>
                            <Text style={{ flex: 1 }}>{item.modelId}</Text>
                            <Text type="danger" strong>${item.cost.toFixed(4)}</Text>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={styles.emptyText}>暂无数据</div>
                    )}
                  </Card>
                </Col>

                {/* Top Task Types */}
                <Col span={12}>
                  <Card size="small" title={<><ThunderboltOutlined /> 任务类型费用</>}>
                    {topTaskTypes.length > 0 ? (
                      <div style={styles.rankList}>
                        {topTaskTypes.map((item, idx) => (
                          <div key={item.taskType} style={styles.rankItem}>
                            <span style={styles.rankBadge}>{idx + 1}</span>
                            <Text style={{ flex: 1 }}>{taskTypeNames[item.taskType] || item.taskType}</Text>
                            <Text type="danger" strong>${item.cost.toFixed(4)}</Text>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={styles.emptyText}>暂无数据</div>
                    )}
                  </Card>
                </Col>
              </Row>

              {/* AI Stats Summary */}
              <Card size="small" title="🤖 AI 使用统计" style={{ marginTop: 16 }}>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic 
                      title="总请求数" 
                      value={costSummary?.totalRequests || 0} 
                      prefix={<CheckCircleOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="输入 Token" 
                      value={costSummary?.totalInputTokens || 0} 
                      prefix={<ClockCircleOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="输出 Token" 
                      value={costSummary?.totalOutputTokens || 0} 
                      prefix={<ClockCircleOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="成功率" 
                      value={costSummary?.successRate || 0} 
                      suffix="%"
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ color: (costSummary?.successRate || 0) > 95 ? '#52c41a' : '#faad14' }}
                    />
                  </Col>
                </Row>
              </Card>

              {/* Top Subscriptions */}
              {userStats && userStats.feedStats.length > 0 && (
                <Card 
                  size="small" 
                  title={<><TrophyOutlined /> 热门订阅源</>} 
                  style={{ marginTop: 16 }}
                >
                  <div style={styles.rankList}>
                    {userStats.feedStats
                      .sort((a, b) => b.totalArticles - a.totalArticles)
                      .slice(0, 5)
                      .map((feed, idx) => (
                        <div key={feed.subscriptionId} style={styles.rankItem}>
                          <span style={styles.rankBadge}>{idx + 1}</span>
                          <Text style={{ flex: 1 }}>{feed.subscriptionName}</Text>
                          <Tag color="blue">{feed.totalArticles} 篇</Tag>
                          <Text type="secondary">{feed.avgArticlesPerDay}/天</Text>
                        </div>
                      ))
                    }
                  </div>
                </Card>
              )}

              {/* Recent Cost Records */}
              <Card 
                size="small" 
                title="📋 最近费用记录" 
                style={{ marginTop: 16 }}
                extra={<Text type="secondary">最近 20 条</Text>}
              >
                <Table
                  size="small"
                  columns={recordColumns}
                  dataSource={recentRecords.map(r => ({ ...r, key: r.id }))}
                  pagination={false}
                  scroll={{ x: 600 }}
                />
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Add imports for missing icons
const TeamOutlined = (props: any) => <BarChartOutlined {...props} />;
const FileTextOutlined = (props: any) => <BarChartOutlined {...props} />;

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
    width: '800px',
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
  budgetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
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
  rankList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  rankItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
    borderBottom: '1px solid #f5f5f5',
  },
  rankBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#1890ff',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
  },
};

export default AnalyticsDashboard;
