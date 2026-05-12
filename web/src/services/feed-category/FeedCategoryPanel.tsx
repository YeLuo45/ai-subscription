/**
 * Feed Category Panel
 * React component for managing feed categories and tag library
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getFeedCategoryService, type FeedCategory, type TagLibrary, type TagRecommendation } from '../../../../shared/lib/ai/feed-category';

interface FeedCategoryPanelProps {
  feedId?: string;
  onTagApply?: (articleId: string, tags: string[]) => void;
}

export const FeedCategoryPanel: React.FC<FeedCategoryPanelProps> = ({ feedId, onTagApply }) => {
  const service = getFeedCategoryService();

  const [feedCategories, setFeedCategories] = useState<FeedCategory[]>([]);
  const [tagLibrary, setTagLibrary] = useState<TagLibrary[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<string>(feedId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [categories, tags] = await Promise.all([
        service.getAllFeedCategories(),
        service.getTagLibrary(),
      ]);
      setFeedCategories(categories);
      setTagLibrary(tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Merge tags
  const handleMergeTags = async (sourceTag: string, targetTag: string) => {
    try {
      setLoading(true);
      await service.mergeTags(sourceTag, targetTag);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge tags');
    } finally {
      setLoading(false);
    }
  };

  // Batch tag application
  const handleBatchTagApply = async (articleIds: string[], tags: string[]) => {
    for (const articleId of articleIds) {
      await service.applyTags(articleId, tags);
      onTagApply?.(articleId, tags);
    }
  };

  return (
    <div className="feed-category-panel">
      <style>{`
        .feed-category-panel {
          padding: 16px;
          max-width: 900px;
          margin: 0 auto;
        }
        .panel-section {
          margin-bottom: 24px;
          background: #fff;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #333;
        }
        .category-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .category-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 6px;
        }
        .category-info {
          flex: 1;
        }
        .category-title {
          font-weight: 500;
          color: #333;
        }
        .category-tags {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }
        .category-tag {
          font-size: 12px;
          padding: 2px 8px;
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 4px;
        }
        .confidence {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }
        .tag-library {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tag-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .tag-item:hover {
          background: #e0e0e0;
        }
        .tag-name {
          font-weight: 500;
        }
        .tag-count {
          font-size: 12px;
          color: #666;
        }
        .merge-controls {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding: 12px;
          background: #fff3e0;
          border-radius: 6px;
        }
        .merge-controls select {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .merge-controls button {
          padding: 6px 16px;
          background: #ff9800;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .merge-controls button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .loading {
          text-align: center;
          padding: 20px;
          color: #666;
        }
        .error {
          color: #d32f2f;
          padding: 12px;
          background: #ffebee;
          border-radius: 4px;
          margin-bottom: 12px;
        }
        .batch-controls {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
        }
        .batch-controls input {
          flex: 1;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .batch-controls button {
          padding: 8px 16px;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #999;
        }
      `}</style>

      <h2>订阅源智能分类</h2>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <>
          {/* Feed Categories Section */}
          <div className="panel-section">
            <h3 className="section-title">订阅源分类列表</h3>
            {feedCategories.length === 0 ? (
              <div className="empty-state">
                暂无订阅源分类数据
              </div>
            ) : (
              <div className="category-list">
                {feedCategories.map((fc) => (
                  <div key={fc.id} className="category-item">
                    <div className="category-info">
                      <div className="category-title">{fc.feedTitle}</div>
                      <div className="category-tags">
                        {fc.categories.map((cat) => (
                          <span key={cat} className="category-tag">{cat}</span>
                        ))}
                      </div>
                      <div className="confidence">
                        置信度: {(fc.confidence * 100).toFixed(1)}% | 
                        分析时间: {new Date(fc.analyzedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tag Library Section */}
          <div className="panel-section">
            <h3 className="section-title">标签库管理</h3>
            {tagLibrary.length === 0 ? (
              <div className="empty-state">
                暂无标签数据
              </div>
            ) : (
              <div className="tag-library">
                {tagLibrary.map((tag) => (
                  <div key={tag.id} className="tag-item">
                    <span className="tag-name">{tag.name}</span>
                    <span className="tag-count">({tag.articleCount})</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tag Merge Controls */}
            {tagLibrary.length >= 2 && (
              <div className="merge-controls">
                <span>合并标签:</span>
                <select id="source-tag">
                  <option value="">选择源标签</option>
                  {tagLibrary.map((tag) => (
                    <option key={tag.id} value={tag.name}>{tag.name}</option>
                  ))}
                </select>
                <span>→</span>
                <select id="target-tag">
                  <option value="">选择目标标签</option>
                  {tagLibrary.map((tag) => (
                    <option key={tag.id} value={tag.name}>{tag.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const source = (document.getElementById('source-tag') as HTMLSelectElement).value;
                    const target = (document.getElementById('target-tag') as HTMLSelectElement).value;
                    if (source && target) {
                      handleMergeTags(source, target);
                    }
                  }}
                >
                  合并
                </button>
              </div>
            )}
          </div>

          {/* Batch Tag Application Section */}
          <div className="panel-section">
            <h3 className="section-title">批量打标</h3>
            <div className="batch-controls">
              <input
                type="text"
                placeholder="输入文章ID，多个用逗号分隔"
                id="article-ids"
              />
              <select id="batch-tags">
                <option value="">选择标签</option>
                {tagLibrary.map((tag) => (
                  <option key={tag.id} value={tag.name}>{tag.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const idsInput = (document.getElementById('article-ids') as HTMLInputElement).value;
                  const tagName = (document.getElementById('batch-tags') as HTMLSelectElement).value;
                  if (idsInput && tagName) {
                    const articleIds = idsInput.split(',').map(id => id.trim()).filter(Boolean);
                    handleBatchTagApply(articleIds, [tagName]);
                  }
                }}
              >
                应用标签
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FeedCategoryPanel;
