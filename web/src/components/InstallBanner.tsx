import React, { useState, useEffect } from 'react';
import { Button } from 'antd';

interface InstallBannerProps {
  onInstalled?: () => void;
}

export const InstallBanner: React.FC<InstallBannerProps> = ({ onInstalled }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
      console.log('[PWA] Install prompt captured');
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('[PWA] App installed');
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
      onInstalled?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check display mode change
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setIsVisible(false);
      }
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, [onInstalled]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);
    
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Remember dismissal for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if dismissed, installed, or no prompt available
  if (!isVisible || isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10000,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
        fontSize: 14,
      }}
    >
      <div style={{ flex: 1, marginRight: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>安装 AI 订阅助手</div>
        <div style={{ opacity: 0.9, fontSize: 12 }}>添加到主屏幕，更快访问更好的体验</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          size="small"
          onClick={handleDismiss}
          style={{ 
            background: 'rgba(255,255,255,0.2)', 
            border: 'none', 
            color: '#fff' 
          }}
        >
          稍后
        </Button>
        <Button
          size="small"
          type="primary"
          onClick={handleInstall}
          style={{ 
            background: '#fff', 
            border: 'none', 
            color: '#667eea',
            fontWeight: 600
          }}
        >
          立即安装
        </Button>
      </div>
    </div>
  );
};

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'rejected';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default InstallBanner;