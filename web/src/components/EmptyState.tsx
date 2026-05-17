/**
 * EmptyState Component
 * Universal empty state display with CSS/SVG illustrations
 * Covers: no subscriptions, no articles, no workflows, no search results, offline
 * Zero new dependencies - Pure CSS/SVG illustrations
 */

import React from 'react';
import { Button, Space } from 'antd';
import { PlusOutlined, SyncOutlined, SearchOutlined, WifiOutlined, ApiOutlined } from '@ant-design/icons';

export type EmptyStateType = 
  | 'no-subscriptions'    // No subscription sources
  | 'no-articles'        // No articles / sync needed
  | 'no-workflows'       // No workflows created
  | 'no-results'         // Search returned nothing
  | 'offline'            // Offline with no cache
  | 'generic';           // Generic empty state

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
}

// CSS-based illustrations (no image dependencies)
const EmptyIllustrations: Record<EmptyStateType, React.FC> = {
  'no-subscriptions': () => (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* RSS/Feed icon */}
      <circle cx="60" cy="60" r="50" fill="var(--color-bg-secondary)" stroke="var(--color-border)" strokeWidth="2"/>
      <path d="M30 50C30 40 40 30 50 30C60 30 70 40 70 50C70 60 60 70 50 70" stroke="var(--color-text-muted)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <circle cx="35" cy="75" r="4" fill="var(--color-primary)"/>
      <circle cx="50" cy="82" r="4" fill="var(--color-primary)"/>
      <circle cx="65" cy="78" r="4" fill="var(--color-primary)"/>
    </svg>
  ),
  'no-articles': () => (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Document/sync icon */}
      <circle cx="60" cy="60" r="50" fill="var(--color-bg-secondary)" stroke="var(--color-border)" strokeWidth="2"/>
      <rect x="35" y="30" width="50" height="60" rx="4" fill="var(--color-card)" stroke="var(--color-text-muted)" strokeWidth="2"/>
      <line x1="45" y1="45" x2="75" y2="45" stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="45" y1="55" x2="75" y2="55" stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="45" y1="65" x2="60" y2="65" stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round"/>
      <SyncOutlined style={{ fontSize: 24, color: 'var(--color-primary)', position: 'absolute', right: 25, bottom: 25 }} />
    </svg>
  ),
  'no-workflows': () => (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Workflow/pipeline icon */}
      <circle cx="60" cy="60" r="50" fill="var(--color-bg-secondary)" stroke="var(--color-border)" strokeWidth="2"/>
      <circle cx="40" cy="50" r="10" fill="var(--color-primary)" opacity="0.8"/>
      <circle cx="60" cy="70" r="10" fill="var(--color-primary)" opacity="0.6"/>
      <circle cx="80" cy="50" r="10" fill="var(--color-primary)" opacity="0.8"/>
      <line x1="50" y1="50" x2="70" y2="65" stroke="var(--color-text-muted)" strokeWidth="2"/>
      <line x1="60" y1="60" x2="40" y2="55" stroke="var(--color-text-muted)" strokeWidth="2"/>
      <line x1="70" y1="65" x2="80" y2="55" stroke="var(--color-text-muted)" strokeWidth="2"/>
    </svg>
  ),
  'no-results': () => (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Search icon */}
      <circle cx="60" cy="60" r="50" fill="var(--color-bg-secondary)" stroke="var(--color-border)" strokeWidth="2"/>
      <circle cx="52" cy="52" r="20" fill="none" stroke="var(--color-text-muted)" strokeWidth="3"/>
      <line x1="66" y1="66" x2="85" y2="85" stroke="var(--color-text-muted)" strokeWidth="3" strokeLinecap="round"/>
      <line x1="44" y1="48" x2="60" y2="64" stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  'offline': () => (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* WiFi/offline icon */}
      <circle cx="60" cy="60" r="50" fill="var(--color-bg-secondary)" stroke="var(--color-border)" strokeWidth="2"/>
      <path d="M30 45C30 45 45 30 60 30C75 30 90 45 90 45" stroke="var(--color-text-muted)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M38 55C38 55 48 45 60 45C72 45 82 55 82 55" stroke="var(--color-text-muted)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <circle cx="60" cy="65" r="8" fill="var(--color-error)"/>
      <line x1="48" y1="85" x2="72" y2="85" stroke="var(--color-error)" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  ),
  'generic': () => (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Generic inbox icon */}
      <circle cx="60" cy="60" r="50" fill="var(--color-bg-secondary)" stroke="var(--color-border)" strokeWidth="2"/>
      <rect x="30" y="35" width="60" height="45" rx="4" fill="var(--color-card)" stroke="var(--color-text-muted)" strokeWidth="2"/>
      <path d="M30 50L45 65L60 50L75 65L90 50" stroke="var(--color-border)" strokeWidth="2" fill="none"/>
    </svg>
  ),
};

const DEFAULT_CONTENT: Record<EmptyStateType, { title: string; description: string; actionText?: string }> = {
  'no-subscriptions': {
    title: '暂无订阅源',
    description: '添加你感兴趣的 RSS 订阅源，开始构建你的信息流',
    actionText: '添加订阅源',
  },
  'no-articles': {
    title: '暂无文章',
    description: '点击同步获取最新内容，或检查网络连接',
    actionText: '立即同步',
  },
  'no-workflows': {
    title: '暂无工作流',
    description: '创建自动化工作流，提升信息处理效率',
    actionText: '创建工作流',
  },
  'no-results': {
    title: '搜索无结果',
    description: '换个关键词试试，或检查拼写是否正确',
  },
  'offline': {
    title: '当前处于离线状态',
    description: '请检查网络连接，联网后自动恢复',
    actionText: '重试',
  },
  'generic': {
    title: '暂无内容',
    description: '这里还没有内容',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'generic',
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
}) => {
  const Illustration = EmptyIllustrations[type];
  const defaults = DEFAULT_CONTENT[type];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      minHeight: 300,
    }}>
      {/* CSS/SVG Illustration */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Illustration />
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: 18,
        fontWeight: 600,
        color: 'var(--color-text)',
        marginBottom: 8,
      }}>
        {title ?? defaults.title}
      </h3>

      {/* Description */}
      <p style={{
        fontSize: 14,
        color: 'var(--color-text-secondary)',
        marginBottom: 24,
        maxWidth: 320,
        lineHeight: 1.6,
      }}>
        {description ?? defaults.description}
      </p>

      {/* Actions */}
      {(actionText || secondaryActionText) && (
        <Space size="middle">
          {actionText && (
            <Button type="primary" icon={type === 'no-subscriptions' ? <PlusOutlined /> : type === 'no-articles' ? <SyncOutlined /> : undefined} onClick={onAction}>
              {actionText}
            </Button>
          )}
          {secondaryActionText && (
            <Button onClick={onSecondaryAction}>
              {secondaryActionText}
            </Button>
          )}
        </Space>
      )}
    </div>
  );
};

export default EmptyState;