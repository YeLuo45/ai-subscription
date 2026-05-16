// InterestProfileCard - Displays user's interest profile (topKeywords, topCategories)
import { useState, useEffect } from 'react';
import { Card, Tag, Typography, Space, Spin, Progress, Empty } from 'antd';
import { 
  UserOutlined, 
  TagOutlined, 
  AppstoreOutlined,
  FeedOutlined,
} from '@ant-design/icons';
import { getInterestProfile } from '../../services/recommendation-engine';
import type { InterestProfile } from '../../services/recommendation-engine/types';

const { Title, Text } = Typography;

export default function InterestProfileCard() {
  const [profile, setProfile] = useState<InterestProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const p = await getInterestProfile();
      setProfile(p);
    } catch (error) {
      console.error('Failed to load interest profile:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card size="small">
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spin />正在分析兴趣...
        </div>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card size="small">
        <Empty description="暂无兴趣数据，请先添加订阅源" />
      </Card>
    );
  }

  return (
    <Card 
      size="small" 
      title={
        <Space>
          <UserOutlined />
          <span>你的兴趣画像</span>
        </Space>
      }
      style={{ background: '#fafafa' }}
    >
      {/* Top Keywords */}
      <div style={{ marginBottom: 16 }}>
        <Space align="start" style={{ marginBottom: 8 }}>
          <TagOutlined />
          <Text strong style={{ fontSize: 13 }}>关键词</Text>
        </Space>
        {profile.topKeywords.length > 0 ? (
          <div>
            {profile.topKeywords.slice(0, 10).map(({ keyword, weight }) => (
              <Tag 
                key={keyword} 
                style={{ 
                  marginBottom: 4,
                  opacity: 0.5 + weight * 0.5, // Visual weight based on score
                }}
              >
                {keyword} ({(weight * 100).toFixed(0)}%)
              </Tag>
            ))}
            {profile.topKeywords.length > 10 && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                ...还有 {profile.topKeywords.length - 10} 个
              </Text>
            )}
          </div>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>暂无关键词数据</Text>
        )}
      </div>

      {/* Top Categories */}
      <div style={{ marginBottom: 16 }}>
        <Space align="start" style={{ marginBottom: 8 }}>
          <AppstoreOutlined />
          <Text strong style={{ fontSize: 13 }}>订阅分类</Text>
        </Space>
        {profile.topCategories.length > 0 ? (
          <Space size={[4, 4]} wrap>
            {profile.topCategories.map(cat => (
              <Tag key={cat} color="blue">{cat}</Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>暂无分类数据</Text>
        )}
      </div>

      {/* Top Feeds */}
      <div>
        <Space align="start" style={{ marginBottom: 8 }}>
          <FeedOutlined />
          <Text strong style={{ fontSize: 13 }}>活跃订阅</Text>
        </Space>
        {profile.topFeeds.length > 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {profile.topFeeds.length} 个高频阅读订阅源
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>暂无阅读数据</Text>
        )}
      </div>

      {/* Last Updated */}
      <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          分析时间: {new Date(profile.updatedAt).toLocaleString()}
        </Text>
      </div>
    </Card>
  );
}
