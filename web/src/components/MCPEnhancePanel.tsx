/**
 * MCP Enhancement Settings Panel
 * 
 * UI component for configuring MCP tool enhancement settings.
 * Provides toggles for GitHub and Brave Search enhancement.
 */

import React, { useState, useEffect } from 'react';
import {
  getMCPEnhanceConfig,
  saveMCPEnhanceConfig,
  updateMCPEnhanceConfig,
  type MCPEnhanceConfig,
} from '../services/mcp/ai-adapter';

interface MCPEnhancePanelProps {
  onClose?: () => void;
}

export const MCPEnhancePanel: React.FC<MCPEnhancePanelProps> = ({ onClose }) => {
  const [config, setConfig] = useState<MCPEnhanceConfig>(getMCPEnhanceConfig);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Refresh config when component mounts
    setConfig(getMCPEnhanceConfig());
  }, []);

  const handleToggle = (
    key: 'github' | 'braveSearch',
    field: 'enabled' | 'maxResults',
    value: boolean | number
  ) => {
    const current = getMCPEnhanceConfig();
    const newValue = field === 'enabled' 
      ? !current[key].enabled
      : value;
    
    const updated = updateMCPEnhanceConfig(key, { [field]: newValue } as any);
    setConfig(updated);
  };

  const handleMaxResultsChange = (key: 'github' | 'braveSearch', value: number) => {
    const updated = updateMCPEnhanceConfig(key, { maxResults: value });
    setConfig(updated);
  };

  return (
    <div className="mcp-enhance-panel" style={styles.container}>
      <div style={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={styles.titleRow}>
          <span style={styles.icon}>🔧</span>
          <h3 style={styles.title}>MCP 增强设置</h3>
          <span style={styles.badge}>
            {config.github.enabled || config.braveSearch.enabled ? '已启用' : '已禁用'}
          </span>
        </div>
        <button 
          style={styles.expandButton}
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {isExpanded && (
        <div style={styles.content}>
          {/* GitHub Enhancement */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <label style={styles.toggle}>
                <input
                  type="checkbox"
                  checked={config.github.enabled}
                  onChange={() => handleToggle('github', 'enabled', !config.github.enabled)}
                  style={styles.checkbox}
                />
                <span style={styles.labelText}>GitHub 仓库增强</span>
              </label>
            </div>
            <p style={styles.description}>
              自动检测文章中的 GitHub 链接，获取仓库信息（stars、forks、描述等）
            </p>
            {config.github.enabled && (
              <div style={styles.subOption}>
                <label style={styles.smallLabel}>
                  最大结果数:
                  <select
                    value={config.github.maxResults}
                    onChange={(e) => handleMaxResultsChange('github', Number(e.target.value))}
                    style={styles.select}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          {/* Brave Search Enhancement */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <label style={styles.toggle}>
                <input
                  type="checkbox"
                  checked={config.braveSearch.enabled}
                  onChange={() => handleToggle('braveSearch', 'enabled', !config.braveSearch.enabled)}
                  style={styles.checkbox}
                />
                <span style={styles.labelText}>Brave Search 补充搜索</span>
              </label>
            </div>
            <p style={styles.description}>
              技术/行业文章自动触发搜索，获取相关背景信息作为分析上下文
            </p>
            {config.braveSearch.enabled && (
              <div style={styles.subOption}>
                <label style={styles.smallLabel}>
                  最大结果数:
                  <select
                    value={config.braveSearch.maxResults}
                    onChange={(e) => handleMaxResultsChange('braveSearch', Number(e.target.value))}
                    style={styles.select}
                  >
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div style={styles.infoBox}>
            <p style={styles.infoText}>
              💡 MCP 增强功能会在 AI 分析文章时自动调用外部工具获取额外上下文，
              从而生成更准确、更有价值的摘要和推荐。
            </p>
          </div>

          {/* Close Button */}
          {onClose && (
            <button style={styles.closeButton} onClick={onClose}>
              关闭
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    marginBottom: '12px',
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    backgroundColor: '#f5f5f5',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    fontSize: '18px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
  },
  badge: {
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: '#4CAF50',
    color: '#fff',
  },
  expandButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#666',
  },
  content: {
    padding: '16px',
  },
  section: {
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #eee',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  labelText: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#333',
  },
  description: {
    margin: '8px 0 0 26px',
    fontSize: '13px',
    color: '#666',
    lineHeight: 1.4,
  },
  subOption: {
    marginTop: '12px',
    marginLeft: '26px',
  },
  smallLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#555',
  },
  select: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '13px',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  infoBox: {
    backgroundColor: '#f0f7ff',
    padding: '12px',
    borderRadius: '6px',
    marginTop: '12px',
  },
  infoText: {
    margin: 0,
    fontSize: '13px',
    color: '#555',
    lineHeight: 1.5,
  },
  closeButton: {
    marginTop: '16px',
    width: '100%',
    padding: '10px',
    backgroundColor: '#2196F3',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default MCPEnhancePanel;