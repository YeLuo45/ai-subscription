/**
 * TagBadge Component
 * Displays a tag with color indicator
 */

import React from 'react';
import { Tag } from 'antd';
import type { Tag as TagType } from '../types/tag';

interface TagBadgeProps {
  tag: TagType;
  closable?: boolean;
  onClose?: () => void;
  onClick?: () => void;
  checked?: boolean;
  onCheckChange?: (checked: boolean) => void;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  closable = false,
  onClose,
  onClick,
  checked,
  onCheckChange,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }
    if (onCheckChange) {
      onCheckChange(!checked);
    }
  };

  return (
    <Tag
      color={tag.color}
      closable={closable}
      onClose={onClose}
      onClick={handleClick}
      style={{ cursor: onClick || onCheckChange ? 'pointer' : 'default' }}
    >
      {tag.name}
    </Tag>
  );
};

interface TagFilterItemProps {
  tag: TagType;
  count?: number;
  selected: boolean;
  onToggle: (tagId: string) => void;
}

export const TagFilterItem: React.FC<TagFilterItemProps> = ({
  tag,
  count,
  selected,
  onToggle,
}) => {
  return (
    <div
      onClick={() => onToggle(tag.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 8px',
        cursor: 'pointer',
        borderRadius: 4,
        backgroundColor: selected ? `${tag.color}20` : 'transparent',
        border: `1px solid ${selected ? tag.color : 'transparent'}`,
        transition: 'all 0.2s',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: tag.color,
        }}
      />
      <span style={{ flex: 1, fontSize: 13 }}>{tag.name}</span>
      {count !== undefined && (
        <span style={{ fontSize: 11, color: '#999' }}>{count}</span>
      )}
    </div>
  );
};

export default TagBadge;
