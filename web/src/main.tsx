/**
 * AI Subscription App - Main Entry
 * React 18 + Vite 5 + Ant Design
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, Layout, Menu, Tabs, Button } from 'antd';
import { SettingOutlined, FileTextOutlined, LinkOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';

import { I18nProvider, useI18n } from './i18n';
import { FeedList } from './components/FeedList';
import { Settings } from './components/Settings';
import { TagManager } from './components/TagManager';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OfflineBanner } from './components/OfflineBanner';
import { InstallBanner } from './components/InstallBanner';
import { flushOfflineQueue, isOnline } from './services/offline';
import { useEffect } from 'react';

const { Header, Sider, Content } = Layout;

type ViewType = 'feeds' | 'settings' | 'tags';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('feeds');
  const { t, locale } = useI18n();

  // Flush offline queue when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      if (isOnline()) {
        await flushOfflineQueue();
      }
    };
    
    window.addEventListener('online', handleOnline);
    
    // Check immediately in case we're already online
    if (isOnline()) {
      flushOfflineQueue();
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'feeds':
        return <FeedList />;
      case 'settings':
        return <Settings />;
      case 'tags':
        return <TagManager />;
      default:
        return <FeedList />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
        <div style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginRight: 32 }}>
          AI Subscription
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={['feeds']}
          items={[
            { key: 'feeds', icon: <LinkOutlined />, label: t('sidebar.feeds'), onClick: () => setCurrentView('feeds') },
            { key: 'settings', icon: <SettingOutlined />, label: t('sidebar.settings'), onClick: () => setCurrentView('settings') },
          ]}
          style={{ background: 'transparent', flex: 1 }}
        />
      </Header>
      <Content>
        {renderContent()}
        <OfflineBanner />
        <InstallBanner />
      </Content>
    </Layout>
  );
};

const App: React.FC = () => {
  const { locale } = useI18n();

  return (
    <ConfigProvider locale={locale === 'zh' ? zhCN : enUS}>
      <AppContent />
    </ConfigProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);