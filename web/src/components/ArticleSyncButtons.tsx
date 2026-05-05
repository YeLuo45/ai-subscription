/**
 * ArticleSyncButtons Component
 * Save article to Readwise/Instapaper buttons
 */

import React, { useState, useEffect } from 'react';
import { Button, Dropdown, message, Tooltip } from 'antd';
import { CloudUploadOutlined, LoadingOutlined } from '@ant-design/icons';
import * as syncService from '../services/syncService';
import type { Article } from '../services/syncService';

interface ArticleSyncButtonsProps {
  article: Article;
}

type SaveStatus = 'idle' | 'saving_readwise' | 'saving_instapaper' | 'success' | 'failed';

export const ArticleSyncButtons: React.FC<ArticleSyncButtonsProps> = ({ article }) => {
  const [rwConnected, setRwConnected] = useState(false);
  const [ipConnected, setIpConnected] = useState(false);
  const [rwSaving, setRwSaving] = useState(false);
  const [ipSaving, setIpSaving] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    const checkConnections = async () => {
      const status = await syncService.getSyncStatus();
      setRwConnected(status.readwise.connected);
      setIpConnected(status.instapaper.connected);
    };
    checkConnections();
  }, []);

  const handleSaveToReadwise = async () => {
    const token = await syncService.getReadwiseConfig();
    if (!token) {
      message.warning('请先在设置中配置 Readwise API Token');
      return;
    }

    setRwSaving(true);
    setStatus('saving_readwise');

    const result = await syncService.saveToReadwise(article, token, article.readTime);

    setRwSaving(false);
    if (result.success) {
      setStatus('success');
      message.success('已保存到 Readwise');
    } else {
      setStatus('failed');
      message.error(`保存失败: ${result.error}`);
    }

    setTimeout(() => setStatus('idle'), 3000);
  };

  const handleSaveToInstapaper = async () => {
    const config = await syncService.getInstapaperConfig();
    if (!config) {
      message.warning('请先在设置中配置 Instapaper');
      return;
    }

    setIpSaving(true);
    setStatus('saving_instapaper');

    const result = await syncService.saveToInstapaper(article, config as { username: string; password: string } | { token: string });

    setIpSaving(false);
    if (result.success) {
      setStatus('success');
      message.success('已保存到 Instapaper');
    } else {
      setStatus('failed');
      message.error(`保存失败: ${result.error}`);
    }

    setTimeout(() => setStatus('idle'), 3000);
  };

  const items = [
    {
      key: 'readwise',
      label: (
        <Button
          type="text"
          icon={rwSaving ? <LoadingOutlined /> : <CloudUploadOutlined />}
          onClick={handleSaveToReadwise}
          disabled={!rwConnected || rwSaving}
          style={{ width: '100%', textAlign: 'left' }}
        >
          保存到 Readwise {rwConnected ? '' : '(未配置)'}
        </Button>
      ),
      disabled: !rwConnected,
    },
    {
      key: 'instapaper',
      label: (
        <Button
          type="text"
          icon={ipSaving ? <LoadingOutlined /> : <CloudUploadOutlined />}
          onClick={handleSaveToInstapaper}
          disabled={!ipConnected || ipSaving}
          style={{ width: '100%', textAlign: 'left' }}
        >
          保存到 Instapaper {ipConnected ? '' : '(未配置)'}
        </Button>
      ),
      disabled: !ipConnected,
    },
  ];

  const isLoading = rwSaving || ipSaving;

  return (
    <Dropdown menu={{ items }} trigger={['click']} disabled={isLoading}>
      <Tooltip title="同步到其他服务">
        <Button
          icon={isLoading ? <LoadingOutlined /> : <CloudUploadOutlined />}
          loading={isLoading}
        >
          同步
        </Button>
      </Tooltip>
    </Dropdown>
  );
};

export default ArticleSyncButtons;
