/**
 * LanguageBadge Component
 * Displays a language label badge
 */

import React from 'react';
import { Tag } from 'antd';
import { LANGUAGE_LABELS, LANGUAGE_COLORS, type Language } from '../lib/languageDetect';

interface LanguageBadgeProps {
  lang: Language;
  size?: 'small' | 'default';
}

export const LanguageBadge: React.FC<LanguageBadgeProps> = ({ lang, size = 'default' }) => {
  const color = LANGUAGE_COLORS[lang] || 'default';
  const label = LANGUAGE_LABELS[lang] || lang;

  return (
    <Tag color={color} style={{ fontSize: size === 'small' ? 10 : 12 }}>
      {label}
    </Tag>
  );
};

export default LanguageBadge;
