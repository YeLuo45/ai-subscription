/**
 * LanguageSwitcher Component
 * Dropdown for switching between zh/en languages with localStorage persistence
 */

import React from 'react';
import { Select, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useI18n } from '../i18n';

const LANGUAGE_OPTIONS = [
  { value: 'zh', label: '简体中文' },
  { value: 'en', label: 'English' },
];

export const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale } = useI18n();

  return (
    <Space>
      <GlobalOutlined />
      <Select
        value={locale}
        onChange={(value) => setLocale(value as 'zh' | 'en')}
        options={LANGUAGE_OPTIONS}
        style={{ width: 120 }}
        size="small"
      />
    </Space>
  );
};

export default LanguageSwitcher;