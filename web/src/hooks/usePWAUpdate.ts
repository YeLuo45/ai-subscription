import { useState, useEffect } from 'react';

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg as ServiceWorkerRegistration);
      });
    }

    const handleUpdateFound = () => {
      console.log('PWA update available');
      setUpdateAvailable(true);
    };

    const handleControllerChange = () => {
      // Reload to get new version
      console.log('PWA controller changed, reload needed');
      setUpdateAvailable(true);
    };

    window.addEventListener('sw-update-available', handleUpdateFound);
    window.addEventListener('sw-controller-change', handleControllerChange);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateFound);
      window.removeEventListener('sw-controller-change', handleControllerChange);
    };
  }, []);

  const applyUpdate = async () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return { updateAvailable, applyUpdate };
}
