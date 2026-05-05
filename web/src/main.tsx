/**
 * AI Subscription App - Main Entry
 * React 18 + Vite 5 + Ant Design
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, Layout, Menu, Tabs, Button } from 'antd';
import { SettingOutlined, FileTextOutlined, LinkOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';

import { FeedList } from './components/FeedList';
import { Settings } from './components/Settings';
import { TagManager } from './components/TagManager';

const { Header, Sider, Content } = Layout;

type ViewType = 'feeds' | 'settings' | 'tags';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('feeds');

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
    <ConfigProvider locale={zhCN}>
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
              { key: 'feeds', icon: <LinkOutlined />, label: '订阅源', onClick: () => setCurrentView('feeds') },
              { key: 'settings', icon: <SettingOutlined />, label: '设置', onClick: () => setCurrentView('settings') },
            ]}
            style={{ background: 'transparent', flex: 1 }}
          />
        </Header>
        <Content>
          {renderContent()}
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
