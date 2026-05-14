import { useEffect } from 'react';

export function useServiceWorkerMessage(onMessage: (data: unknown) => void) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      console.log('[App] SW message received:', event.data);
      onMessage(event.data);
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [onMessage]);
}
