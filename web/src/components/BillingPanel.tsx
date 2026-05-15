// Billing Panel - Subscription management, quota display, plan selection
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Progress, Button, Space, Typography, Tag, Divider, message, Modal, List, Alert } from 'antd';
import { 
  DollarOutlined, 
  CheckCircleOutlined, 
  WarningOutlined, 
  CrownOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { PLANS, getPlan, formatPrice } from '../../shared/lib/ai/billing/plans';
import { getQuotaStatus, getCurrentSubscription, setCurrentSubscription } from '../../shared/lib/ai/billing/quota-tracker';
import { getBillingHistory, createOrUpdateBillingRecord } from '../../shared/lib/ai/billing/billing-service';
import type { QuotaStatus, PlanTier, BillingHistoryEntry } from '../../shared/lib/ai/billing/types';

const { Title, Text, Paragraph } = Typography;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PLAN_COLORS: Record<PlanTier, string> = {
  free: '#95a5a6',
  basic: '#3498db',
  pro: '#9b59b6',
  enterprise: '#f39c12',
};

const BillingPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanTier>('free');
  const [billingHistory, setBillingHistory] = useState<BillingHistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'history'>('overview');
  const [changingPlan, setChangingPlan] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [quota, sub, history] = await Promise.all([
        getQuotaStatus(),
        getCurrentSubscription(),
        getBillingHistory(6),
      ]);
      setQuotaStatus(quota);
      setCurrentPlan(sub.plan);
      setBillingHistory(history);
      
      // Ensure current period billing record exists
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      await createOrUpdateBillingRecord(periodStart);
    } catch (error) {
      console.error('[BillingPanel] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleChangePlan = async (planId: PlanTier) => {
    setChangingPlan(true);
    try {
      await setCurrentSubscription({
        plan: planId,
        startDate: Date.now(),
        isActive: true,
      });
      setCurrentPlan(planId);
      message.success(`Switched to ${getPlan(planId).name} plan`);
      loadData();
    } catch (error) {
      message.error('Failed to change plan');
    } finally {
      setChangingPlan(false);
    }
  };

  const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
  };

  const getProgressStatus = (): 'success' | 'normal' | 'exception' => {
    if (!quotaStatus) return 'normal';
    if (quotaStatus.isOverQuota) return 'exception';
    if (quotaStatus.isWarning) return 'normal';
    return 'success';
  };

  const renderOverview = () => (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>Current Plan</Text>
                <Tag color={PLAN_COLORS[currentPlan]} style={{ fontSize: 14, padding: '4px 12px' }}>
                  {getPlan(currentPlan).name}
                </Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary">Monthly Quota</Text>
                <Text>{formatNumber(quotaStatus?.quotaTokens || 0)} tokens</Text>
              </div>
              {quotaStatus && quotaStatus.quotaTokens !== Infinity && (
                <>
                  <Progress 
                    percent={Math.min(100, quotaStatus.usagePercent)} 
                    status={getProgressStatus()}
                    showInfo
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">Used: {formatNumber(quotaStatus.usedTokens)}</Text>
                    <Text type="secondary">Remaining: {formatNumber(quotaStatus.remainingTokens)}</Text>
                  </div>
                </>
              )}
              {quotaStatus?.isOverQuota && (
                <div style={{ color: '#ff4d4f', marginTop: 8 }}>
                  <WarningOutlined /> Quota exceeded. Upgrade to continue using AI services.
                </div>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
      
      {quotaStatus && quotaStatus.isWarning && !quotaStatus.isOverQuota && (
        <Alert type="warning" message={`You've used ${quotaStatus.usagePercent.toFixed(0)}% of your monthly quota`} />
      )}
    </div>
  );

  const renderPlans = () => (
    <Row gutter={[16, 16]}>
      {Object.values(PLANS).map((plan) => (
        <Col span={12} key={plan.id}>
          <Card
            size="small"
            style={{ 
              borderColor: currentPlan === plan.id ? PLAN_COLORS[plan.id] : undefined,
              opacity: currentPlan === plan.id ? 1 : 0.8,
            }}
            title={
              <Space>
                {plan.id === 'enterprise' && <CrownOutlined />}
                <Text strong>{plan.name}</Text>
              </Space>
            }
            actions={[
              currentPlan !== plan.id ? (
                <Button 
                  type="link" 
                  size="small"
                  disabled={changingPlan}
                  onClick={() => handleChangePlan(plan.id)}
                >
                  Switch
                </Button>
              ) : (
                <Text type="secondary" key="current" style={{ fontSize: 12 }}>Current</Text>
              )
            ]}
          >
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <Title level={4} style={{ margin: 0 }}>
                {formatPrice(plan.priceUSD)}
                {plan.priceUSD > 0 && <Text type="secondary" style={{ fontSize: 12 }}>/mo</Text>}
              </Title>
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
              {plan.features.map((f, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <Space size={4}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <Text type="secondary">{f}</Text>
                  </Space>
                </li>
              ))}
            </ul>
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {plan.quotaTokens === Infinity ? 'Unlimited' : `${formatNumber(plan.quotaTokens)} tokens/mo`}
            </Text>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const renderHistory = () => (
    <List
      size="small"
      dataSource={billingHistory}
      locale={{ emptyText: 'No billing history yet' }}
      renderItem={(item) => {
        const plan = getPlan(item.plan);
        const period = new Date(item.periodStart).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        return (
          <List.Item>
            <List.Item.Meta
              avatar={<DollarOutlined style={{ color: PLAN_COLORS[item.plan] }} />}
              title={
                <Space>
                  <Text>{period}</Text>
                  <Tag color={PLAN_COLORS[item.plan]}>{plan.name}</Tag>
                </Space>
              }
              description={
                <Text type="secondary">
                  {formatNumber(item.usage.totalTokens)} tokens · ${item.usage.totalCostUSD.toFixed(2)} · {item.usage.requestCount} requests
                </Text>
              }
            />
          </List.Item>
        );
      }}
    />
  );

  return (
    <div style={{ padding: 16 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button 
          type={activeTab === 'overview' ? 'primary' : 'default'}
          onClick={() => setActiveTab('overview')}
          icon={<ThunderboltOutlined />}
        >
          Overview
        </Button>
        <Button 
          type={activeTab === 'plans' ? 'primary' : 'default'}
          onClick={() => setActiveTab('plans')}
          icon={<CrownOutlined />}
        >
          Plans
        </Button>
        <Button 
          type={activeTab === 'history' ? 'primary' : 'default'}
          onClick={() => setActiveTab('history')}
          icon={<DollarOutlined />}
        >
          History
        </Button>
      </Space>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'plans' && renderPlans()}
          {activeTab === 'history' && renderHistory()}
        </>
      )}
    </div>
  );
};

export default BillingPanel;
