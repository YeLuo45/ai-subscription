/**
 * EntityCard Component
 * Displays detailed information about a selected entity
 */

import React from 'react';
import { Card, Typography, Space, Tag } from 'antd';
import { UserOutlined, BankOutlined, EnvironmentOutlined, CalendarOutlined, BulbOutlined } from '@ant-design/icons';
import type { Entity, EntityType } from '../types/knowledgeGraph';
import { ENTITY_COLORS } from '../types/knowledgeGraph';

const { Text, Paragraph } = Typography;

interface EntityCardProps {
  entity: Entity;
  relatedEntities?: Entity[];
  onClose?: () => void;
}

const ENTITY_TYPE_CONFIG: Record<EntityType, { label: string; icon: React.ReactNode; color: string }> = {
  person: {
    label: '人物',
    icon: <UserOutlined />,
    color: ENTITY_COLORS.person,
  },
  organization: {
    label: '组织',
    icon: <BankOutlined />,
    color: ENTITY_COLORS.organization,
  },
  location: {
    label: '地点',
    icon: <EnvironmentOutlined />,
    color: ENTITY_COLORS.location,
  },
  event: {
    label: '事件',
    icon: <CalendarOutlined />,
    color: ENTITY_COLORS.event,
  },
  concept: {
    label: '概念',
    icon: <BulbOutlined />,
    color: ENTITY_COLORS.concept,
  },
};

export const EntityCard: React.FC<EntityCardProps> = ({ entity, relatedEntities = [] }) => {
  const config = ENTITY_TYPE_CONFIG[entity.type];

  return (
    <Card
      size="small"
      bordered={true}
      style={{
        width: 260,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header with icon and type */}
      <Space align="start" style={{ marginBottom: 8 }}>
        <Tag
          icon={config.icon}
          color={config.color}
          style={{ margin: 0 }}
        >
          {config.label}
        </Tag>
      </Space>

      {/* Entity name */}
      <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
        {entity.name}
      </Text>

      {/* Description */}
      {entity.description && (
        <Paragraph
          type="secondary"
          style={{ fontSize: 12, marginBottom: 8 }}
          ellipsis={{ rows: 3, expandable: true }}
        >
          {entity.description}
        </Paragraph>
      )}

      {/* Related entities */}
      {relatedEntities.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            相关实体：
          </Text>
          <div style={{ marginTop: 4 }}>
            <Space size={4} wrap>
              {relatedEntities.slice(0, 5).map(related => (
                <Tag
                  key={related.id}
                  color={ENTITY_COLORS[related.type]}
                  style={{ fontSize: 10 }}
                >
                  {related.name}
                </Tag>
              ))}
            </Space>
          </div>
        </div>
      )}
    </Card>
  );
};

export default EntityCard;
