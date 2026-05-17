/**
 * LanguageSwitcher Component
 * Dropdown for switching between zh/en languages with localStorage persistence
 */

import React from 'react';
import { Select, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useI18n } from '../i18n';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '简体中文' },
  { value: 'th', label: 'ภาษาไทย' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
];

export const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale } = useI18n();

  return (
    <Space>
      <GlobalOutlined />
      <Select
        value={locale}
        onChange={(value) => setLocale(value as 'en' | 'zh' | 'th' | 'vi' | 'id' | 'de' | 'fr' | 'es')}
        options={LANGUAGE_OPTIONS}
        style={{ width: 120 }}
        size="small"
      />
    </Space>
  );
};

export default LanguageSwitcher;