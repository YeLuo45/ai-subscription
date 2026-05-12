/**
 * Feed Recommend Panel
 * React component for displaying personalized feed recommendations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  getFeedRecommendService, 
  type UserInterestProfile, 
  type FeedRecommendation 
} from '../../../../../shared/lib/ai/feed-recommend';

interface FeedRecommendPanelProps {
  userId?: string;
  onSubscribe?: (feedUrl: string) => void;
}

export const FeedRecommendPanel: React.FC<FeedRecommendPanelProps> = ({ 
  userId,
  onSubscribe 
}) => {
  const service = getFeedRecommendService(userId);

  const [profile, setProfile] = useState<UserInterestProfile | null>(null);
  const [recommendations, setRecommendations] = useState<FeedRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileData, recs] = await Promise.all([
        service.getInterestProfile(),
        service.getRecommendations(),
      ]);
      setProfile(profileData);
      setRecommendations(recs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh recommendations
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const recs = await service.refreshRecommendations();
      setRecommendations(recs);
      
      // Also update profile
      const updatedProfile = await service.getInterestProfile();
      setProfile(updatedProfile);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh recommendations');
    } finally {
      setRefreshing(false);
    }
  };

  // Subscribe to a feed
  const handleSubscribe = async (feedUrl: string) => {
    try {
      await service.subscribeToFeed(feedUrl);
      onSubscribe?.(feedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
    }
  };

  return (
    <div className="feed-recommend-panel">
      <style>{`
        .feed-recommend-panel {
          padding: 16px;
          max-width: 900px;
          margin: 0 auto;
        }
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .panel-title {
          font-size: 20px;
          font-weight: 600;
          color: #333;
          margin: 0;
        }
        .refresh-btn {
          padding: 8px 16px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }
        .refresh-btn:hover {
          background: #1976d2;
        }
        .refresh-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
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
        .interest-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .interest-tag {
          padding: 6px 12px;
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 16px;
          font-size: 13px;
        }
        .interest-tag.primary {
          background: #2196f3;
          color: white;
        }
        .interest-vector {
          font-size: 12px;
          color: #666;
          margin-top: 8px;
        }
        .vector-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 4px 0;
        }
        .vector-label {
          width: 80px;
          font-size: 12px;
          color: #666;
        }
        .vector-fill {
          height: 8px;
          background: #2196f3;
          border-radius: 4px;
          transition: width 0.3s;
        }
        .vector-value {
          width: 40px;
          font-size: 11px;
          color: #999;
          text-align: right;
        }
        .recommend-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .recommend-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
          transition: border-color 0.2s;
        }
        .recommend-item:hover {
          border-color: #2196f3;
        }
        .recommend-info {
          flex: 1;
        }
        .recommend-title {
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }
        .recommend-reason {
          font-size: 13px;
          color: #666;
          margin-bottom: 8px;
        }
        .recommend-categories {
          display: flex;
          gap: 6px;
        }
        .category-tag {
          font-size: 11px;
          padding: 2px 8px;
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 4px;
        }
        .recommend-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 12px;
          background: #fff;
          border-radius: 6px;
          border: 1px solid #e9ecef;
          margin-left: 12px;
        }
        .score-value {
          font-size: 20px;
          font-weight: 700;
          color: #2196f3;
        }
        .score-label {
          font-size: 10px;
          color: #999;
          text-transform: uppercase;
        }
        .subscribe-btn {
          padding: 8px 16px;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          margin-top: 8px;
          transition: background 0.2s;
        }
        .subscribe-btn:hover {
          background: #388e3c;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e0e0e0;
          border-top-color: #2196f3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .error {
          color: #d32f2f;
          padding: 12px;
          background: #ffebee;
          border-radius: 4px;
          margin-bottom: 12px;
        }
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #999;
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .last-updated {
          font-size: 12px;
          color: #999;
          margin-top: 8px;
        }
      `}</style>

      <div className="panel-header">
        <h2 className="panel-title">智能订阅推荐</h2>
        <button 
          className="refresh-btn" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? '刷新中...' : '刷新推荐'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          加载中...
        </div>
      ) : (
        <>
          {/* User Interest Profile Section */}
          <div className="panel-section">
            <h3 className="section-title">你的兴趣画像</h3>
            {profile ? (
              <>
                <div className="interest-tags">
                  {profile.topCategories.slice(0, 5).map((cat, idx) => (
                    <span 
                      key={cat} 
                      className={`interest-tag ${idx === 0 ? 'primary' : ''}`}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
                
                {profile.topKeywords.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div className="interest-tags">
                      {profile.topKeywords.slice(0, 8).map(kw => (
                        <span key={kw} className="interest-tag" style={{ background: '#f3e5f5', color: '#7b1fa2' }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="interest-vector">
                  <div style={{ marginBottom: '8px', fontWeight: 500 }}>兴趣强度</div>
                  {profile.topCategories.slice(0, 5).map(cat => {
                    const intensity = Math.round((profile.interestVector[cat] || 0) * 100);
                    return (
                      <div key={cat} className="vector-bar">
                        <span className="vector-label">{cat}</span>
                        <div className="vector-fill" style={{ width: `${intensity}%` }}></div>
                        <span className="vector-value">{intensity}%</span>
                      </div>
                    );
                  })}
                </div>

                <div className="last-updated">
                  最后更新: {new Date(profile.updatedAt).toLocaleString()}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                暂无阅读历史<br/>
                <small>开始阅读文章后将自动分析你的兴趣</small>
              </div>
            )}
          </div>

          {/* Recommendations Section */}
          <div className="panel-section">
            <h3 className="section-title">为你推荐</h3>
            {recommendations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                暂无推荐<br/>
                <small>阅读更多内容后我们将为你推荐相关订阅源</small>
              </div>
            ) : (
              <div className="recommend-list">
                {recommendations.map(rec => (
                  <div key={rec.id} className="recommend-item">
                    <div className="recommend-info">
                      <div className="recommend-title">{rec.feedTitle}</div>
                      <div className="recommend-reason">{rec.reason}</div>
                      <div className="recommend-categories">
                        {rec.categories.slice(0, 3).map(cat => (
                          <span key={cat} className="category-tag">{cat}</span>
                        ))}
                      </div>
                      <button 
                        className="subscribe-btn"
                        onClick={() => handleSubscribe(rec.feedUrl)}
                      >
                        订阅
                      </button>
                    </div>
                    <div className="recommend-score">
                      <span className="score-value">
                        {Math.round(rec.similarityScore * 100)}
                      </span>
                      <span className="score-label">匹配度</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FeedRecommendPanel;
