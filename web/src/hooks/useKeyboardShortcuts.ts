import { useEffect, useCallback, useRef, useState } from 'react';

export interface KeyboardHandlers {
  [key: string]: (e: KeyboardEvent) => void;
}

export interface UseKeyboardShortcutsOptions {
  handlers: KeyboardHandlers;
  /** Whether the shortcuts should be active (default: true) */
  enabled?: boolean;
  /** Stop propagation of handled events (default: true) */
  stopPropagation?: boolean;
  /** Prevent default behavior (default: true) */
  preventDefault?: boolean;
}

/**
 * Enhanced keyboard shortcuts hook with better key combination handling
 * Supports: Cmd/Ctrl+Key, Shift+Key, Alt+Key, and combinations
 */
export function useKeyboardShortcuts({
  handlers,
  enabled = true,
  stopPropagation = true,
  preventDefault = true,
}: UseKeyboardShortcutsOptions) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input/textarea (unless it's a global shortcut)
      const target = e.target as HTMLElement;
      const isEditable = target.tagName === 'INPUT' || 
                        target.tagName === 'TEXTAREA' || 
                        target.isContentEditable;
      
      // Build key combination string
      const parts: string[] = [];
      if (e.metaKey || e.ctrlKey) parts.push('Cmd');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      
      // Add the main key (ignore modifiers alone)
      const key = e.key;
      if (key !== 'Control' && key !== 'Meta' && key !== 'Alt' && key !== 'Shift') {
        parts.push(key.length === 1 ? key.toUpperCase() : key);
      }
      
      const combo = parts.join('+');
      const handler = handlersRef.current[combo];

      if (handler) {
        // Allow some shortcuts even when typing (global shortcuts)
        const isGlobalShortcut = combo.includes('Escape') || combo === 'Cmd+K';
        
        if (isEditable && !isGlobalShortcut) {
          return; // Don't handle shortcuts while typing
        }

        if (stopPropagation) {
          e.stopPropagation();
        }
        if (preventDefault) {
          e.preventDefault();
        }
        handler(e);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, stopPropagation, preventDefault]);
}

/**
 * Hook for arrow key navigation in lists
 */
export function useListKeyboardNavigation<T>({
  items,
  onSelect,
  onOpen,
  enabled = true,
}: {
  items: T[];
  onSelect?: (item: T, index: number) => void;
  onOpen?: (item: T, index: number) => void;
  enabled?: boolean;
}) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || items.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          e.preventDefault();
          const item = items[focusedIndex];
          if (onOpen) {
            onOpen(item, focusedIndex);
          } else if (onSelect) {
            onSelect(item, focusedIndex);
          }
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
    }
  }, [enabled, items, focusedIndex, onSelect, onOpen]);

  // Reset focus when items change
  useEffect(() => {
    if (focusedIndex >= items.length) {
      setFocusedIndex(-1);
    }
  }, [items, focusedIndex]);

  // Attach keyboard listener to container
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return {
    containerRef,
    focusedIndex,
    setFocusedIndex,
  };
}

/**
 * Hook for global search shortcut (Cmd/Ctrl+K)
 */
export function useGlobalSearchShortcut(onActivate: () => void) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onActivate();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onActivate]);
}

/**
 * Shortcut hints for display
 */
export const SHORTCUT_HINTS = {
  search: '⌘K',
  newItem: '⌘N',
  theme: '⌘⇧T',
  escape: 'Esc',
  navigateUp: '↑',
  navigateDown: '↓',
  open: 'Enter',
} as const;

export type ShortcutKey = keyof typeof SHORTCUT_HINTS;