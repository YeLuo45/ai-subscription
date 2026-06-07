/**
 * usePersonalization Hook
 * Applies personalization settings (theme, layout, widgets) to the application
 *
 * FIX: This hook now also re-applies on settings change and the bug where the
 * hook was never called by FeedList is documented.
 */

import { useEffect, useRef } from 'react';
import type { PersonalizationSettings, WidgetConfig, WidgetId } from '../types';
import { adjustColor } from '../utils/color';

const DENSITY_MAP = {
  compact: {
    padding: '8px',
    marginBottom: '8px',
    fontSize: '12px',
  },
  comfortable: {
    padding: '16px',
    marginBottom: '12px',
    fontSize: '14px',
  },
  spacious: {
    padding: '24px',
    marginBottom: '16px',
    fontSize: '16px',
  },
};

export function usePersonalization(settings: PersonalizationSettings | undefined) {
  const initialized = useRef(false);

  // Apply theme customization
  useEffect(() => {
    if (!settings?.theme || !settings.enabled) {
      // No personalization, but still reset
      if (initialized.current) {
        // Don't reset; let themeVariant handle base theme
      }
      return;
    }

    const { primaryColor, borderRadius, fontSize, accentGradient } = settings.theme;
    const root = document.documentElement;

    // Apply primary color (overrides theme variant primary)
    root.style.setProperty('--color-primary', primaryColor);
    root.style.setProperty('--color-primary-hover', adjustColor(primaryColor, -10));
    root.style.setProperty('--color-primary-active', adjustColor(primaryColor, -15));

    // Apply border radius
    root.style.setProperty('--border-radius', `${borderRadius}px`);
    root.style.setProperty('--border-radius-sm', `${Math.max(2, borderRadius - 4)}px`);
    root.style.setProperty('--border-radius-lg', `${borderRadius + 4}px`);

    // Apply font size
    const fontSizeMap = { small: '12px', medium: '14px', large: '16px' };
    root.style.setProperty('--font-size', fontSizeMap[fontSize]);
    root.style.fontSize = fontSizeMap[fontSize];

    // Apply accent gradient
    if (accentGradient) {
      root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, 20)})`);
    } else {
      root.style.setProperty('--gradient-primary', primaryColor);
    }
  }, [settings?.theme.primaryColor, settings?.theme.borderRadius, settings?.theme.fontSize, settings?.theme.accentGradient, settings?.enabled]);

  // Apply layout customization
  useEffect(() => {
    if (!settings?.layout || !settings.enabled) return;

    const { sidebarWidth, contentMaxWidth, headerHeight } = settings.layout;
    const root = document.documentElement;

    root.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    root.style.setProperty('--content-max-width', `${contentMaxWidth}px`);
    root.style.setProperty('--header-height', `${headerHeight}px`);

    // Apply density
    const density = settings.theme?.density || 'comfortable';
    const densityStyles = DENSITY_MAP[density];
    root.style.setProperty('--density-padding', densityStyles.padding);
    root.style.setProperty('--density-margin', densityStyles.marginBottom);
  }, [settings?.layout.sidebarWidth, settings?.layout.contentMaxWidth, settings?.layout.headerHeight, settings?.theme.density, settings?.enabled]);

  // Apply sidebar position
  useEffect(() => {
    if (!settings?.theme || !settings.enabled) return;

    const { sidebarPosition, sidebarCollapsed } = settings.theme;
    const body = document.body;

    // Remove existing classes
    body.classList.remove('sidebar-left', 'sidebar-right', 'sidebar-collapsed');

    // Apply sidebar position
    body.classList.add(`sidebar-${sidebarPosition}`);
    if (sidebarCollapsed) {
      body.classList.add('sidebar-collapsed');
    }
  }, [settings?.theme.sidebarPosition, settings?.theme.sidebarCollapsed, settings?.enabled]);

  // Mark initialized
  useEffect(() => {
    initialized.current = true;
  }, []);

  return {
    isEnabled: settings?.enabled ?? false,
  };
}

// Helper moved to ../utils/color.ts

// Get enabled widgets sorted by order
export function getEnabledWidgets(widgets: WidgetConfig[]): WidgetConfig[] {
  return widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order);
}

// Widget component registry
export const WIDGET_REGISTRY: Record<WidgetId, React.FC<{ config: WidgetConfig }>> = {
  'weather': ({ config }) => (
    <div className="widget widget-weather" data-size={config.size || 'medium'}>
      <div className="widget-title">天气</div>
      <div className="widget-content">天气信息加载中...</div>
    </div>
  ),
  'quick-actions': ({ config }) => (
    <div className="widget widget-quick-actions" data-size={config.size || 'medium'}>
      <div className="widget-title">快捷操作</div>
      <div className="widget-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="widget-btn">➕ 添加订阅</button>
          <button className="widget-btn">🔄 刷新全部</button>
          <button className="widget-btn">⚙️ 设置</button>
        </div>
      </div>
    </div>
  ),
  'reading-progress': ({ config }) => (
    <div className="widget widget-reading-progress" data-size={config.size || 'medium'}>
      <div className="widget-title">阅读进度</div>
      <div className="widget-content">
        <div className="progress-stat">
          <span>今日已读</span>
          <span className="progress-value">0 / 10</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '0%' }} />
        </div>
      </div>
    </div>
  ),
  'trending-topics': ({ config }) => (
    <div className="widget widget-trending" data-size={config.size || 'medium'}>
      <div className="widget-title">热门话题</div>
      <div className="widget-content">
        <div className="trending-list">
          <span className="trending-tag">AI</span>
          <span className="trending-tag">机器学习</span>
          <span className="trending-tag">Web开发</span>
        </div>
      </div>
    </div>
  ),
  'ai-insights': ({ config }) => (
    <div className="widget widget-ai-insights" data-size={config.size || 'medium'}>
      <div className="widget-title">🤖 AI 洞察</div>
      <div className="widget-content">
        <div className="insight-item">
          <span className="insight-icon">💡</span>
          <span className="insight-text">您关注的 AI 领域有 5 篇新文章</span>
        </div>
      </div>
    </div>
  ),
  'subscription-stats': ({ config }) => (
    <div className="widget widget-stats" data-size={config.size || 'medium'}>
      <div className="widget-title">订阅统计</div>
      <div className="widget-content">
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-value">0</span>
            <span className="stat-label">订阅源</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">0</span>
            <span className="stat-label">文章</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">0</span>
            <span className="stat-label">未读</span>
          </div>
        </div>
      </div>
    </div>
  ),
};
