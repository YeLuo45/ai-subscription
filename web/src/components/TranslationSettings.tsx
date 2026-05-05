/**
 * TranslationSettings Component
 * Settings for translation target language, service, and cache management
 */

import React, { useState, useEffect } from 'react';
import { Card, Form, Select, Button, Space, Tag, Alert, message, Popconfirm } from 'antd';
import { TranslationOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { LANGUAGE_LABELS, type Language } from '../lib/languageDetect';
import * as translationDB from '../db/translationDB';
import type { TranslationSettings as TranslationSettingsType } from '../db/translationDB';

const TRANSLATION_SERVICE_OPTIONS = [
  { value: 'gemini', label: 'Google Gemini Flash' },
  { value: 'deepl', label: 'DeepL' },
];

const TARGET_LANGUAGE_OPTIONS = Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const TranslationSettings: React.FC = () => {
  const [settings, setSettings] = useState<TranslationSettingsType>({
    targetLanguage: 'ZH',
    translationService: 'gemini',
  });
  const [cacheStats, setCacheStats] = useState<{ total: number; expired: number; active: number }>({
    total: 0,
    expired: 0,
    active: 0,
  });
  const [loading, setLoading] = useState(false);

  // Load settings and cache stats on mount
  useEffect(() => {
    loadSettings();
    loadCacheStats();
  }, []);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('translation_settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  };

  const loadCacheStats = async () => {
    const stats = await translationDB.getTranslationCacheStats();
    setCacheStats(stats);
  };

  const handleSaveSettings = (values: { targetLanguage: Language; translationService: 'gemini' | 'deepl' }) => {
    const newSettings: TranslationSettingsType = {
      targetLanguage: values.targetLanguage,
      translationService: values.translationService,
    };
    localStorage.setItem('translation_settings', JSON.stringify(newSettings));
    setSettings(newSettings);
    message.success('翻译设置已保存');
  };

  const handleClearExpired = async () => {
    setLoading(true);
    try {
      const deleted = await translationDB.clearExpiredTranslations();
      message.success(`已清除 ${deleted} 条过期翻译缓存`);
      loadCacheStats();
    } catch (err) {
      message.error('清除缓存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    setLoading(true);
    try {
      await translationDB.clearAllTranslations();
      message.success('已清除所有翻译缓存');
      loadCacheStats();
    } catch (err) {
      message.error('清除缓存失败');
    } finally {
      setLoading(false);
    }
  };

  const formatDaysRemaining = (expiresAt: number): string => {
    const now = Date.now();
    const remaining = expiresAt - now;
    const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
    return days > 0 ? `${days} 天后过期` : '已过期';
  };

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Translation Settings */}
      <Card 
        title={<Space><TranslationOutlined /> 翻译设置</Space>}
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Form
          layout="vertical"
          initialValues={settings}
          onFinish={handleSaveSettings}
        >
          <Form.Item
            label="目标语言"
            name="targetLanguage"
            rules={[{ required: true, message: '请选择目标语言' }]}
          >
            <Select
              placeholder="选择目标语言"
              options={TARGET_LANGUAGE_OPTIONS}
              style={{ width: 200 }}
            />
          </Form.Item>

          <Form.Item
            label="翻译服务"
            name="translationService"
            rules={[{ required: true, message: '请选择翻译服务' }]}
          >
            <Select
              placeholder="选择翻译服务"
              options={TRANSLATION_SERVICE_OPTIONS}
              style={{ width: 200 }}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Cache Management */}
      <Card 
        title={<Space><TranslationOutlined /> 翻译缓存</Space>}
        size="small"
        extra={
          <Tag color={cacheStats.active > 0 ? 'green' : 'default'}>
            {cacheStats.active} 条有效
          </Tag>
        }
      >
        {cacheStats.total > 0 && (
          <Alert
            message={`缓存统计: 共 ${cacheStats.total} 条，其中 ${cacheStats.expired} 条已过期，${cacheStats.active} 条有效`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {cacheStats.total === 0 && (
          <Alert
            message="暂无翻译缓存"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Space>
          <Popconfirm
            title="确定要清除所有过期缓存吗？"
            onConfirm={handleClearExpired}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              icon={<ReloadOutlined />} 
              loading={loading}
              disabled={cacheStats.expired === 0}
            >
              清除过期缓存 ({cacheStats.expired})
            </Button>
          </Popconfirm>

          <Popconfirm
            title="确定要清除所有翻译缓存吗？此操作不可恢复。"
            onConfirm={handleClearAll}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              danger 
              icon={<DeleteOutlined />}
              loading={loading}
              disabled={cacheStats.total === 0}
            >
              清除所有缓存
            </Button>
          </Popconfirm>
        </Space>

        <div style={{ marginTop: 16, color: '#666', fontSize: 12 }}>
          <p>翻译缓存有效期为 7 天，过期后自动清除。</p>
          <p>支持 Google Gemini Flash 和 DeepL 翻译服务。</p>
        </div>
      </Card>
    </div>
  );
};

export default TranslationSettings;
