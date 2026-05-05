import { useEffect } from 'react';

interface KeyboardHandlers {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardHandlers) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Build key combination string
      const parts: string[] = [];
      if (e.metaKey || e.ctrlKey) parts.push('Cmd');
      if (e.shiftKey) parts.push('Shift');
      if (e.key !== 'Control' && e.key !== 'Meta' && e.key !== 'Shift') {
        parts.push(e.key);
      }
      const combo = parts.join('+');

      if (handlers[combo]) {
        e.preventDefault();
        handlers[combo]();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
