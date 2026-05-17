/**
 * ThemeSwitcher Component
 * Dropdown for switching between light/dark/system themes with localStorage persistence
 * Uses Ant Design theme system + CSS variables for zero new dependencies
 */

import React, { useEffect, useState } from 'react';
import { Select, Space, message } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';
import type { ThemeMode } from '../types';
import { getSettings, saveSettings } from '../services/storage';

const THEME_OPTIONS = [
  { value: 'light', label: '☀️ 亮色' },
  { value: 'dark', label: '🌙 暗色' },
  { value: 'system', label: '💻 跟随系统' },
];

export const ThemeSwitcher: React.FC = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  useEffect(() => {
    // Load saved theme preference
    getSettings().then(settings => {
      setThemeMode(settings.themeMode || 'light');
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
      getSettings().then(settings => {
        if (settings.themeMode === 'system') {
          applyTheme('system', e.matches);
        }
      });
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const applyTheme = (mode: ThemeMode, systemDark?: boolean) => {
    const isDark = mode === 'dark' || (mode === 'system' && (systemDark ?? window.matchMedia('(prefers-color-scheme: dark)').matches));
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    // Expose for other components that need to know theme
    (window as any).__isDarkMode = isDark;
  };

  const handleThemeChange = async (value: ThemeMode) => {
    setThemeMode(value);
    
    // Save to settings
    const settings = await getSettings();
    await saveSettings({
      ...settings,
      themeMode: value,
    });

    // Apply theme
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(value, systemDark);

    // Call global applyTheme if available (for settings panel)
    if ((window as any).__applyTheme) {
      (window as any).__applyTheme(value);
    }

    message.success(`主题已切换为: ${THEME_OPTIONS.find(o => o.value === value)?.label}`);
  };

  return (
    <Space>
      <BgColorsOutlined />
      <Select
        value={themeMode}
        onChange={handleThemeChange}
        options={THEME_OPTIONS}
        style={{ width: 130 }}
        size="small"
        dropdownMatchSelectWidth={false}
      />
    </Space>
  );
};

export default ThemeSwitcher;