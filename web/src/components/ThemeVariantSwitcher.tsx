/**
 * ThemeVariantSwitcher — 主题变体切换器
 *
 * Dropdown with preview swatches for 6 themes.
 */

import React from 'react';
import { Dropdown, Tooltip, Button } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';
import { useThemeVariant } from '../hooks/useThemeVariant';
import { THEME_VARIANTS, THEME_VARIANT_ORDER } from '../styles/themeRegistry';
import type { ThemeVariant } from '../types';

export const ThemeVariantSwitcher: React.FC = () => {
  const { variant, setVariant, available } = useThemeVariant();

  const swatch = (id: ThemeVariant) => {
    const p = THEME_VARIANTS[id];
    if (!p) return null;
    return (
      <div
        key={id}
        onClick={() => setVariant(id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
          background: variant === id ? 'var(--color-bg-secondary)' : 'transparent',
        }}
      >
        <div style={{ display: 'flex', gap: 2 }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, background: p.cssVars['--color-bg'] }} />
          <div style={{ width: 16, height: 16, borderRadius: 4, background: p.cssVars['--color-primary'] }} />
          <div style={{ width: 16, height: 16, borderRadius: 4, background: p.cssVars['--color-text'] }} />
          <div style={{ width: 16, height: 16, borderRadius: 4, background: p.cssVars['--color-card-header'] }} />
        </div>
        <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{p.label}</span>
        {variant === id && <span style={{ marginLeft: 'auto', color: 'var(--color-primary)' }}>✓</span>}
      </div>
    );
  };

  return (
    <Tooltip title="切换主题">
      <Dropdown
        placement="bottomRight"
        menu={{
          items: THEME_VARIANT_ORDER.map(id => ({
            key: id,
            label: swatch(id),
          })),
        }}
      >
        <Button type="text" icon={<BgColorsOutlined />} />
      </Dropdown>
    </Tooltip>
  );
};

export default ThemeVariantSwitcher;
