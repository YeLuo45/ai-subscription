import { useState, useEffect } from 'react';

export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also listen to custom network status event from SW
    const handleNetworkChange = (e: CustomEvent) => {
      setIsOffline(!e.detail.online);
    };
    window.addEventListener('network-status-change', handleNetworkChange as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('network-status-change', handleNetworkChange as EventListener);
    };
  }, []);

  return isOffline;
}
