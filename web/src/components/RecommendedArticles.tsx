// Recommended Articles - Personalized recommendations display
import React, { useState, useEffect, useCallback } from 'react';
import { Card, List, Tag, Space, Typography, Spin, Empty, Button, Tooltip } from 'antd';
import { 
  LikeOutlined, 
  TeamOutlined, 
  FireOutlined, 
  ClockCircleOutlined,
  SparklesOutlined,
} from '@ant-design/icons';
import { getHybridRecommendations, buildInterestProfile, registerUserProfile, getInterestSuggestions, type UserInterestProfile, type RecommendationItem } from '../services/recommendation-engine';

const { Text, Paragraph } = Typography;

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  content: <LikeOutlined style={{ color: '#1890ff' }} />,
  collaborative: <TeamOutlined style={{ color: '#722ed1' }} />,
  popularity: <FireOutlined style={{ color: '#fa541c' }} />,
  'cold-start': <SparklesOutlined style={{ color: '#52c49a' }} />,
};

const SOURCE_LABELS: Record<string, string> = {
  content: 'Content Match',
  collaborative: 'Similar Users',
  popularity: 'Trending',
  'cold-start': 'New User',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userBehaviors?: Array<{articleId: string; type: string; timestamp: number; scrollDepth?: number; timeSpentMs?: number}>;
}

const RecommendedArticles: React.FC<Props> = ({ isOpen, onClose, userId = 'default-user', userBehaviors = [] }) => {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [profile, setProfile] = useState<UserInterestProfile | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ topic: string; reason: string }>>([]);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      // Build and register user profile
      const userProfile = buildInterestProfile(
        userId,
        userBehaviors as any,
        [] // bookmarkedArticles
      );
      registerUserProfile(userProfile);
      setProfile(userProfile);

      // Get interest expansion suggestions
      const interestSuggs = getInterestSuggestions(userProfile.interestVector);
      setSuggestions(interestSuggs);

      // Get recommendations
      const readArticleIds = userBehaviors
        .filter(b => b.type === 'read' || b.type === 'complete')
        .map(b => b.articleId);

      const recs = await getHybridRecommendations(userProfile, readArticleIds, 10);
      setRecommendations(recs);
    } catch (error) {
      console.error('[RecommendedArticles] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, userBehaviors]);

  useEffect(() => {
    if (isOpen) {
      loadRecommendations();
    }
  }, [isOpen, loadRecommendations]);

  const renderRecommendationItem = (item: RecommendationItem) => (
    <List.Item
      key={item.articleId}
      style={{ padding: '12px 0' }}
      extra={
        <Space direction="vertical" size={4} style={{ minWidth: 100 }}>
          <Text strong style={{ color: '#52c41a' }}>
            {(item.score * 100).toFixed(0)}%
          </Text>
          <Tooltip title={`Source: ${SOURCE_LABELS[item.source]}`}>
            {SOURCE_ICONS[item.source] || <ClockCircleOutlined />}
          </Tooltip>
        </Space>
      }
    >
      <List.Item.Meta
        title={
          <Space>
            <Text ellipsis style={{ maxWidth: 300 }}>
              {item.articleTitle}
            </Text>
          </Space>
        }
        description={
          <Space direction="vertical" size={4}>
            <Space size={4}>
              {item.reasons.slice(0, 2).map((reason, i) => (
                <Tag key={i} color={getReasonColor(reason)} style={{ marginRight: 4 }}>
                  {reason}
                </Tag>
              ))}
            </Space>
            {item.matchedInterests.length > 0 && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                Topics: {item.matchedInterests.join(', ')}
              </Text>
            )}
          </Space>
        }
      />
    </List.Item>
  );

  return (
    <div style={{ padding: 16 }}>
      <Space style={{ marginBottom: 16 }}>
        <SparklesOutlined style={{ color: '#722ed1' }} />
        <Text strong>Recommended For You</Text>
      </Space>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : recommendations.length === 0 ? (
        <Empty description="Not enough data for recommendations yet" />
      ) : (
        <>
          <List
            size="small"
            dataSource={recommendations}
            renderItem={renderRecommendationItem}
            locale={{ emptyText: 'No recommendations yet' }}
          />

          {suggestions.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Interest Suggestions
              </Text>
              <Space size={[8, 8]} wrap>
                {suggestions.map(({ topic, reason }) => (
                  <Tag
                    key={topic}
                    color="blue"
                    style={{ cursor: 'pointer' }}
                    title={reason}
                  >
                    {topic}
                  </Tag>
                ))}
              </Space>
            </div>
          )}
        </>
      )}
    </div>
  );
};

function getReasonColor(reason: string): string {
  if (reason.toLowerCase().includes('match')) return 'blue';
  if (reason.toLowerCase().includes('similar')) return 'purple';
  if (reason.toLowerCase().includes('trend')) return 'orange';
  if (reason.toLowerCase().includes('recent')) return 'green';
  return 'default';
}

export default RecommendedArticles;
