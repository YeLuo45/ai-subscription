/**
 * SearchBar Component - Advanced search input with autocomplete
 * Zero new dependencies - uses built-in Web APIs + Ant Design
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input, List, Tag, Empty } from 'antd';
import { SearchOutlined, ClockCircleOutlined, ClearOutlined } from '@ant-design/icons';
import { getSearchService, type FilterOptions } from '../../services/search/search-service';
import SearchHistoryPopover from './SearchHistoryPopover';

interface SearchBarProps {
  /** Callback when search is submitted */
  onSearch?: (query: string, filters?: FilterOptions) => void;
  /** Initial query value */
  initialQuery?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Show filter button */
  showFilterButton?: boolean;
  /** Current filters to display in UI */
  activeFilters?: FilterOptions;
  /** Callback to show filter dropdown */
  onFilterClick?: () => void;
}

interface Suggestion {
  text: string;
  type: 'suggestion' | 'history';
}

/**
 * SearchBar with debounced autocomplete and history support
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  initialQuery = '',
  placeholder = 'Search articles...',
  showFilterButton = false,
  activeFilters,
  onFilterClick,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchService = getSearchService();
  
  // Load suggestions with debounce
  const loadSuggestions = useCallback(async (prefix: string) => {
    if (prefix.length < 2) {
      setSuggestions([]);
      return;
    }
    
    try {
      const results = await searchService.getSuggestions(prefix);
      const suggestionItems: Suggestion[] = results.map(text => ({
        text,
        type: 'suggestion',
      }));
      setSuggestions(suggestionItems);
    } catch {
      setSuggestions([]);
    }
  }, [searchService]);
  
  // Debounced suggestion loading
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => {
        loadSuggestions(query);
      }, 300);
    } else {
      setSuggestions([]);
    }
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, loadSuggestions]);
  
  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowDropdown(true);
    setShowHistory(false);
  };
  
  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
    if (query.length === 0) {
      setShowHistory(true);
    }
  };
  
  // Handle blur
  const handleBlur = () => {
    setIsFocused(false);
    // Delay hide to allow click on dropdown items
    setTimeout(() => {
      setShowDropdown(false);
      setShowHistory(false);
    }, 200);
  };
  
  // Handle search submit
  const handleSubmit = () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      searchService.addRecentSearch(trimmedQuery);
      onSearch?.(trimmedQuery, activeFilters);
    }
    setShowDropdown(false);
    setShowHistory(false);
  };
  
  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setShowHistory(false);
    }
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (text: string) => {
    setQuery(text);
    searchService.addRecentSearch(text);
    onSearch?.(text, activeFilters);
    setShowDropdown(false);
    setShowHistory(false);
  };
  
  // Handle history item click
  const handleHistoryClick = (term: string) => {
    setQuery(term);
    onSearch?.(term, activeFilters);
    setShowDropdown(false);
    setShowHistory(false);
  };
  
  // Clear query
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  };
  
  // Get active filter count
  const getActiveFilterCount = (): number => {
    let count = 0;
    if (activeFilters?.dateRange) count++;
    if (activeFilters?.category) count++;
    if (activeFilters?.tags?.length) count++;
    if (activeFilters?.subscribed !== undefined) count++;
    return count;
  };
  
  const activeFilterCount = getActiveFilterCount();
  
  return (
    <div className="search-bar-container" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          prefix={<SearchOutlined style={{ color: '#999' }} />}
          suffix={
            query ? (
              <ClearOutlined 
                onClick={handleClear} 
                style={{ cursor: 'pointer', color: '#999' }} 
              />
            ) : null
          }
          style={{ flex: 1 }}
          allowClear={false}
        />
        
        {showFilterButton && (
          <Tag 
            onClick={onFilterClick}
            style={{ 
              cursor: 'pointer', 
              margin: '0 8px',
              background: activeFilterCount > 0 ? '#1890ff' : undefined,
              color: activeFilterCount > 0 ? '#fff' : undefined,
            }}
          >
            Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </Tag>
        )}
      </div>
      
      {/* Dropdown with suggestions or history */}
      {showDropdown && isFocused && (
        <div 
          className="search-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: showFilterButton ? 80 : 0,
            zIndex: 1000,
            background: '#fff',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            maxHeight: 300,
            overflow: 'auto',
          }}
        >
          {showHistory && query.length === 0 && (
            <SearchHistoryPopover onItemClick={handleHistoryClick} />
          )}
          
          {suggestions.length > 0 && (
            <List
              size="small"
              dataSource={suggestions}
              renderItem={(item) => (
                <List.Item 
                  onClick={() => handleSuggestionClick(item.text)}
                  style={{ 
                    cursor: 'pointer', 
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <SearchOutlined style={{ color: '#999', fontSize: 12 }} />
                  <span>{item.text}</span>
                  {item.type === 'history' && (
                    <ClockCircleOutlined style={{ color: '#999', fontSize: 12, marginLeft: 'auto' }} />
                  )}
                </List.Item>
              )}
            />
          )}
          
          {suggestions.length === 0 && !showHistory && query.length >= 2 && (
            <Empty 
              description="No suggestions" 
              style={{ padding: 16, margin: 0 }}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;