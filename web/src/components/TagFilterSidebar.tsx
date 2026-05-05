/**
 * TagFilterSidebar Component
 * Sidebar filter panel for filtering articles by tags
 */

import React, { useState, useEffect } from 'react';
import { Checkbox, Button, Collapse, Empty, Badge } from 'antd';
import { FilterOutlined, ClearOutlined } from '@ant-design/icons';
import type { Tag } from '../types/tag';
import { TAG_TYPE_LABELS } from '../types/tag';
import * as tagService from '../services/tagService';
import { TagFilterItem } from './TagBadge';

interface TagFilterSidebarProps {
  selectedTagIds: string[];
  onTagToggle: (tagId: string) => void;
  onClear: () => void;
}

export const TagFilterSidebar: React.FC<TagFilterSidebarProps> = ({
  selectedTagIds,
  onTagToggle,
  onClear,
}) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTags = async () => {
    setLoading(true);
    try {
      const allTags = await tagService.getAllTags();
      setTags(allTags);
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  // Group tags by type
  const groupedTags = tags.reduce((acc, tag) => {
    if (!acc[tag.type]) acc[tag.type] = [];
    acc[tag.type].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  const collapseItems = Object.entries(TAG_TYPE_LABELS).map(([type, label]) => ({
    key: type,
    label: <span style={{ fontWeight: 500 }}>{label}</span>,
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {groupedTags[type]?.map(tag => (
          <TagFilterItem
            key={tag.id}
            tag={tag}
            selected={selectedTagIds.includes(tag.id)}
            onToggle={onTagToggle}
          />
        ))}
        {(!groupedTags[type] || groupedTags[type].length === 0) && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无标签" style={{ margin: 8 }} />
        )}
      </div>
    ),
  }));

  return (
    <div style={{
      width: 200,
      padding: 12,
      borderRight: '1px solid #f0f0f0',
      height: '100%',
      overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <span style={{ fontWeight: 500 }}>
          <FilterOutlined /> 标签筛选
        </span>
        {selectedTagIds.length > 0 && (
          <Button
            type="text"
            size="small"
            icon={<ClearOutlined />}
            onClick={onClear}
          >
            清除
          </Button>
        )}
      </div>

      {tags.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无标签" />
      ) : (
        <Collapse
          defaultActiveKey={Object.keys(TAG_TYPE_LABELS)}
          ghost
          items={collapseItems}
        />
      )}

      {selectedTagIds.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
          <Badge count={selectedTagIds.length} style={{ marginRight: 8 }} />
          <span style={{ fontSize: 12, color: '#666' }}>
            已选 {selectedTagIds.length} 个标签
          </span>
        </div>
      )}
    </div>
  );
};

export default TagFilterSidebar;
