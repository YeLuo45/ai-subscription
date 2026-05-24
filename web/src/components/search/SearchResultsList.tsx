/**
 * SearchResultsList Component - Display search results
 * Zero new dependencies - uses built-in Web APIs + Ant Design
 */

import React from 'react';
import { List, Tag, Empty, Badge } from 'antd';
import { StarOutlined, CheckCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import type { SearchResult } from '../../services/search/search-service';

interface SearchResultsListProps {
  /** Search results to display */
  results: SearchResult[];
  /** Loading state */
  loading?: boolean;
  /** Callback when a result is clicked */
  onResultClick?: (result: SearchResult) => void;
  /** Callback when subscribe button is clicked */
  onSubscribeClick?: (result: SearchResult) => void;
}

/**
 * SearchResultsList displays search results with title, excerpt, tags, date, and subscribed badge
 */
export const SearchResultsList: React.FC<SearchResultsListProps> = ({
  results,
  loading = false,
  onResultClick,
  onSubscribeClick,
}) => {
  // Format date for display
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };
  
  // Render item
  const renderItem = (result: SearchResult) => (
    <List.Item
      onClick={() => onResultClick?.(result)}
      style={{
        cursor: 'pointer',
        padding: '16px',
        borderBottom: '1px solid #f0f0f0',
        transition: 'background 0.2s',
        display: 'block',
      }}
      className="search-result-item"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 500 }}>
          {result.title}
        </h4>
        {result.subscribed && (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Subscribed
          </Tag>
        )}
      </div>
      
      <p style={{ 
        margin: '0 0 12px 0', 
        fontSize: 14, 
        color: '#666',
        lineHeight: 1.5,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {result.excerpt}
      </p>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Tags */}
        {result.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {result.tags.map((tag, index) => (
              <Tag key={index} color="blue" style={{ margin: 0 }}>
                {tag}
              </Tag>
            ))}
          </div>
        )}
        
        {/* Date */}
        {result.date && (
          <span style={{ fontSize: 12, color: '#999', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CalendarOutlined />
            {formatDate(result.date)}
          </span>
        )}
        
        {/* Score indicator */}
        <Badge 
          count={`Score: ${Math.round(result.score * 100)}%`} 
          style={{ 
            fontSize: 10,
            backgroundColor: result.score > 0.5 ? '#52c41a' : '#faad14',
          }}
        />
      </div>
      
      {/* Subscribe button */}
      {!result.subscribed && onSubscribeClick && (
        <div style={{ marginTop: 8 }}>
          <Tag 
            color="cyan" 
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              onSubscribeClick(result);
            }}
            icon={<StarOutlined />}
          >
            Subscribe
          </Tag>
        </div>
      )}
    </List.Item>
  );
  
  // Empty state
  if (!loading && results.length === 0) {
    return (
      <Empty
        description="No search results found"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ padding: 48, background: '#fafafa', borderRadius: 8 }}
      >
        <p style={{ color: '#999' }}>
          Try adjusting your search terms or filters
        </p>
      </Empty>
    );
  }
  
  return (
    <div className="search-results-list" style={{ background: '#fff' }}>
      <List
        loading={loading}
        dataSource={results}
        renderItem={renderItem}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />
      
      {/* Add hover effect */}
      <style>{`
        .search-result-item:hover {
          background: #fafafa;
        }
      `}</style>
    </div>
  );
};

export default SearchResultsList;