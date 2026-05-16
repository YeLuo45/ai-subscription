import { useState, useEffect, Suspense, lazy } from 'react';
import { ConfigProvider, theme } from 'antd';
import { getSettings } from './services/storage';
import { I18nProvider } from './i18n';
import type { ThemeMode } from './types';
import './styles/theme.css';
import './App.css';

// Lazy load non-critical components
const WorkflowListPanel = lazy(() => import('./components/workflow/WorkflowListPanel'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const MCPServerPanel = lazy(() => import('./components/MCPServerPanel'));

// Loading fallback component
const LazyLoadingFallback: React.FC = () => (
  <div style={{ padding: 24, textAlign: 'center' }}>
    <span>Loading...</span>
  </div>
);

function App() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    getSettings().then(settings => {
      const mode: ThemeMode = settings.themeMode || 'light';
      applyTheme(mode);
    });
  }, []);

  function applyTheme(mode: ThemeMode) {
    const dark = mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  // Expose applyTheme globally for settings panel to call
  (window as any).__applyTheme = applyTheme;

  return (
    <I18nProvider>
      <ConfigProvider
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <FeedList />
      </ConfigProvider>
    </I18nProvider>
  );
}

export default App;
