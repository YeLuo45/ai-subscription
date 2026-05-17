import { useState, useEffect, useRef, useCallback } from 'react';

export interface SearchResult<T> {
  item: T;
  score: number;
  matches?: {
    field: string;
    indices: [number, number][];
  }[];
}

export interface UseGlobalSearchOptions<T> {
  /** Items to search through */
  items: T[];
  /** Function to extract searchable text from an item */
  getSearchableText: (item: T) => string;
  /** Field name for highlighting (default: 'title') */
  searchField?: string;
  /** Minimum characters before search activates (default: 1) */
  minChars?: number;
  /** Maximum results to return (default: 10) */
  maxResults?: number;
  /** Debounce delay in ms (default: 150) */
  debounceMs?: number;
}

/**
 * Fuzzy search implementation for global search optimization
 */
function fuzzyMatch(text: string, pattern: string): { score: number; matches: [number, number][] } | null {
  if (!pattern) return { score: 0, matches: [] };
  
  const lowerText = text.toLowerCase();
  const lowerPattern = pattern.toLowerCase();
  
  let patternIdx = 0;
  let score = 0;
  const matches: [number, number][] = [];
  let lastMatchIndex = -1;
  
  for (let i = 0; i < lowerText.length && patternIdx < lowerPattern.length; i++) {
    if (lowerText[i] === lowerPattern[patternIdx]) {
      if (lastMatchIndex === -1 || i === lastMatchIndex + 1) {
        // Consecutive match bonus
        score += 2;
      } else {
        // Non-consecutive match
        score += 1;
      }
      matches.push([i, i]);
      lastMatchIndex = i;
      patternIdx++;
    }
  }
  
  // All pattern characters must be found
  if (patternIdx !== lowerPattern.length) {
    return null;
  }
  
  // Bonus for matching at start
  if (matches.length > 0 && matches[0][0] === 0) {
    score += 5;
  }
  
  // Bonus for exact match
  if (lowerText === lowerPattern) {
    score += 20;
  }
  
  return { score, matches };
}

/**
 * Hook for optimized global search with keyboard navigation
 */
export function useGlobalSearch<T>({
  items,
  getSearchableText,
  searchField = 'title',
  minChars = 1,
  maxResults = 10,
  debounceMs = 150,
}: UseGlobalSearchOptions<T>) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult<T>[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Perform search with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < minChars) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const scoredResults: SearchResult<T>[] = [];

      for (const item of items) {
        const text = getSearchableText(item);
        const match = fuzzyMatch(text, query);
        
        if (match) {
          scoredResults.push({
            item,
            score: match.score,
            matches: [{ field: searchField, indices: match.matches }],
          });
        }
      }

      // Sort by score descending
      scoredResults.sort((a, b) => b.score - a.score);
      
      setResults(scoredResults.slice(0, maxResults));
      setSelectedIndex(scoredResults.length > 0 ? 0 : -1);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, items, getSearchableText, searchField, minChars, maxResults, debounceMs]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => results.length > 0 ? Math.min(prev + 1, results.length - 1) : -1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        if (results.length > 0 && selectedIndex >= 0) {
          e.preventDefault();
          return results[selectedIndex].item;
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        break;
    }
    return null;
  }, [results, selectedIndex]);

  // Focus input
  const focus = useCallback(() => {
    inputRef.current?.focus();
    setIsOpen(true);
  }, []);

  // Clear search
  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
    setIsOpen(false);
  }, []);

  return {
    query,
    setQuery,
    results,
    selectedIndex,
    setSelectedIndex,
    isOpen,
    setIsOpen,
    inputRef,
    handleKeyDown,
    focus,
    clear,
  };
}

/**
 * Hook for managing keyboard shortcut hints display
 */
export function useShortcutHints(shortcuts: Record<string, string>) {
  const [showHints, setShowHints] = useState(false);

  // Show hints when user presses ?
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === '?' && !e.target) {
        setShowHints(prev => !prev);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return { showHints, setShowHints, shortcuts };
}