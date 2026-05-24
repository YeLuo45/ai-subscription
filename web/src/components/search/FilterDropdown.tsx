/**
 * FilterDropdown Component - Multi-criteria filtering UI
 * Zero new dependencies - uses built-in Web APIs + Ant Design
 */

import React, { useState } from 'react';
import { Select, DatePicker, Switch, Button, Tag, Space } from 'antd';
import { FilterOutlined, ClearOutlined } from '@ant-design/icons';
import type { FilterOptions } from '../../services/search/search-service';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface FilterDropdownProps {
  /** Current filters */
  filters: FilterOptions;
  /** Callback when filters change */
  onChange: (filters: FilterOptions) => void;
  /** Available categories */
  categories?: string[];
  /** Available tags */
  availableTags?: string[];
  /** Show clear button */
  showClearButton?: boolean;
}

/**
 * FilterDropdown with multi-select for tags, date range, category, and subscribed toggle
 */
export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  filters,
  onChange,
  categories = [],
  availableTags = [],
  showClearButton = true,
}) => {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);
  
  // Handle date range change
  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    const newFilters = { ...localFilters };
    if (dates && dates[0] && dates[1]) {
      newFilters.dateRange = {
        start: dates[0].format('YYYY-MM-DD'),
        end: dates[1].format('YYYY-MM-DD'),
      };
    } else {
      delete newFilters.dateRange;
    }
    setLocalFilters(newFilters);
    onChange(newFilters);
  };
  
  // Handle category change
  const handleCategoryChange = (value: string | undefined) => {
    const newFilters = { ...localFilters };
    if (value) {
      newFilters.category = value;
    } else {
      delete newFilters.category;
    }
    setLocalFilters(newFilters);
    onChange(newFilters);
  };
  
  // Handle tags change (multi-select)
  const handleTagsChange = (values: string[]) => {
    const newFilters = { ...localFilters };
    if (values.length > 0) {
      newFilters.tags = values;
    } else {
      delete newFilters.tags;
    }
    setLocalFilters(newFilters);
    onChange(newFilters);
  };
  
  // Handle subscribed toggle
  const handleSubscribedChange = (checked: boolean) => {
    const newFilters = { ...localFilters };
    newFilters.subscribed = checked;
    setLocalFilters(newFilters);
    onChange(newFilters);
  };
  
  // Clear all filters
  const handleClear = () => {
    const emptyFilters: FilterOptions = {};
    setLocalFilters(emptyFilters);
    onChange(emptyFilters);
  };
  
  // Check if any filters are active
  const hasActiveFilters = (): boolean => {
    return !!(
      localFilters.dateRange ||
      localFilters.category ||
      (localFilters.tags && localFilters.tags.length > 0) ||
      localFilters.subscribed !== undefined
    );
  };
  
  return (
    <div 
      className="filter-dropdown-container"
      style={{
        padding: 16,
        background: '#fafafa',
        borderRadius: 8,
        border: '1px solid #d9d9d9',
      }}
    >
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <FilterOutlined />
        <span style={{ fontWeight: 500 }}>Filters</span>
        {showClearButton && hasActiveFilters() && (
          <Button 
            type="text" 
            size="small" 
            icon={<ClearOutlined />} 
            onClick={handleClear}
            style={{ marginLeft: 'auto' }}
          >
            Clear all
          </Button>
        )}
      </div>
      
      {/* Date Range */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#666' }}>
          Date Range
        </label>
        <RangePicker
          value={
            localFilters.dateRange
              ? [
                  localFilters.dateRange.start ? undefined : undefined,
                  localFilters.dateRange.end ? undefined : undefined,
                ] as unknown as [Dayjs | null, Dayjs | null]
              : null
          }
          onChange={handleDateRangeChange}
          style={{ width: '100%' }}
          placeholder={['Start date', 'End date']}
        />
      </div>
      
      {/* Category */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#666' }}>
          Category
        </label>
        <Select
          value={localFilters.category}
          onChange={handleCategoryChange}
          placeholder="Select category"
          allowClear
          style={{ width: '100%' }}
          options={categories.map(cat => ({ value: cat, label: cat }))}
        />
      </div>
      
      {/* Tags */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#666' }}>
          Tags (AND logic)
        </label>
        <Select
          mode="multiple"
          value={localFilters.tags || []}
          onChange={handleTagsChange}
          placeholder="Select tags"
          allowClear
          style={{ width: '100%' }}
          options={availableTags.map(tag => ({ value: tag, label: tag }))}
        />
      </div>
      
      {/* Subscribed Toggle */}
      <div style={{ marginBottom: 8 }}>
        <Space>
          <span style={{ fontSize: 12, color: '#666' }}>Subscribed only</span>
          <Switch
            checked={localFilters.subscribed === true}
            onChange={(checked) => handleSubscribedChange(checked)}
            size="small"
          />
        </Space>
      </div>
      
      {/* Active filter summary */}
      {hasActiveFilters() && (
        <div style={{ marginTop: 8 }}>
          <Space size={[4, 4]} wrap>
            {localFilters.dateRange && (
              <Tag color="blue">
                {localFilters.dateRange.start} to {localFilters.dateRange.end}
              </Tag>
            )}
            {localFilters.category && (
              <Tag color="green">{localFilters.category}</Tag>
            )}
            {localFilters.tags?.map(tag => (
              <Tag key={tag} color="purple">{tag}</Tag>
            ))}
            {localFilters.subscribed && (
              <Tag color="cyan">Subscribed</Tag>
            )}
          </Space>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;