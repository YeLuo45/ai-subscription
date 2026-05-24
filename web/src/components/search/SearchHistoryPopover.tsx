/**
 * SearchHistoryPopover - Recent search history from localStorage
 * Zero new dependencies - uses built-in Web APIs + Ant Design
 */

import React from 'react';
import { Button, List, Empty } from 'antd';
import { ClockCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { getSearchService } from '../../services/search/search-service';

interface SearchHistoryPopoverProps {
  /** Callback when a history item is clicked */
  onItemClick: (term: string) => void;
  /** Maximum number of items to display */
  maxItems?: number;
}

/**
 * SearchHistoryPopover shows recent searches from localStorage
 */
export const SearchHistoryPopover: React.FC<SearchHistoryPopoverProps> = ({
  onItemClick,
  maxItems = 10,
}) => {
  const searchService = getSearchService();
  const recentSearches = searchService.getRecentSearches();
  
  // Handle clear all
  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    searchService.clearRecentSearches();
    // Force re-render by calling onItemClick with empty
    window.location.reload();
  };
  
  // Handle item click
  const handleItemClick = (term: string) => {
    onItemClick(term);
  };
  
  if (recentSearches.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <Empty 
          description="No recent searches" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ margin: 0 }}
        />
      </div>
    );
  }
  
  const displaySearches = recentSearches.slice(0, maxItems);
  
  return (
    <div className="search-history-popover" style={{ width: 280 }}>
      <div style={{ 
        padding: '8px 12px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ClockCircleOutlined />
          Recent searches
        </span>
        <Button 
          type="text" 
          size="small" 
          icon={<DeleteOutlined />} 
          onClick={handleClearAll}
          danger
        >
          Clear
        </Button>
      </div>
      
      <List
        size="small"
        dataSource={displaySearches}
        renderItem={(term, index) => (
          <List.Item
            onClick={() => handleItemClick(term)}
            style={{ 
              cursor: 'pointer', 
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.2s',
            }}
            className="history-item"
          >
            <ClockCircleOutlined style={{ color: '#999', fontSize: 12 }} />
            <span style={{ flex: 1 }}>{term}</span>
          </List.Item>
        )}
      />
      
      {/* Add some CSS for hover effect */}
      <style>{`
        .history-item:hover {
          background: #f5f5f5;
        }
      `}</style>
    </div>
  );
};

export default SearchHistoryPopover;