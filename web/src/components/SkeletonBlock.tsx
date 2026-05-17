/**
 * SkeletonBlock Component
 * Pure CSS animated skeleton screens for loading states
 * Zero new dependencies - Pure CSS animation
 */

import React from 'react';

interface SkeletonBlockProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  /** Custom CSS class for variant shapes */
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
}

// Predefined skeleton variants for common loading scenarios
export const SkeletonArticleItem: React.FC = () => (
  <div style={{
    padding: '16px 0',
    borderBottom: '1px solid var(--color-border)',
  }}>
    <div style={{ display: 'flex', gap: 12 }}>
      <SkeletonBlock variant="rectangular" width={80} height={80} borderRadius={4} />
      <div style={{ flex: 1 }}>
        <SkeletonBlock variant="text" width="60%" height={18} style={{ marginBottom: 8 }} />
        <SkeletonBlock variant="text" width="100%" height={14} style={{ marginBottom: 6 }} />
        <SkeletonBlock variant="text" width="40%" height={12} />
      </div>
    </div>
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div style={{
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: 16,
  }}>
    <SkeletonBlock variant="text" width="50%" height={20} style={{ marginBottom: 12 }} />
    <SkeletonBlock variant="text" width="100%" height={14} style={{ marginBottom: 8 }} />
    <SkeletonBlock variant="text" width="80%" height={14} style={{ marginBottom: 16 }} />
    <div style={{ display: 'flex', gap: 8 }}>
      <SkeletonBlock variant="rectangular" width={60} height={24} borderRadius={12} />
      <SkeletonBlock variant="rectangular" width={60} height={24} borderRadius={12} />
    </div>
  </div>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonArticleItem key={i} />
    ))}
  </div>
);

export const SkeletonTableRow: React.FC = () => (
  <div style={{
    display: 'flex',
    gap: 16,
    padding: '12px 0',
    borderBottom: '1px solid var(--color-border)',
    alignItems: 'center',
  }}>
    <SkeletonBlock variant="rectangular" width={40} height={40} borderRadius={4} />
    <SkeletonBlock variant="text" width="25%" height={16} style={{ flex: 1 }} />
    <SkeletonBlock variant="text" width="15%" height={14} />
    <SkeletonBlock variant="text" width="10%" height={14} />
  </div>
);

export const SkeletonFeedList: React.FC = () => (
  <div style={{ padding: '16px 0' }}>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} style={{ marginBottom: 16 }}>
        <SkeletonCard />
      </div>
    ))}
  </div>
);

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 4,
  style,
}) => {
  const getWidth = () => typeof width === 'number' ? `${width}px` : width;
  const getHeight = () => typeof height === 'number' ? `${height}px` : height;
  const getBorderRadius = () => typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius;

  return (
    <div
      className="skeleton-pulse"
      style={{
        width: getWidth(),
        height: getHeight(),
        borderRadius: getBorderRadius(),
        ...style,
      }}
    />
  );
};

export default SkeletonBlock;