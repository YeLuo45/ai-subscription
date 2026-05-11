/**
 * Push Queue Panel
 * React component for managing aggregated push notifications
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AggregationService } from '../../../../shared/lib/ai/push-queue/aggregation-service';
import { getDefaultStorageAdapter } from '../../../../shared/lib/ai/push-queue/storage-adapter';
import type { AggregatedPush, CreateAggregationParams } from '../../../../shared/lib/ai/push-queue/types';

export const PushQueuePanel: React.FC = () => {
  const [pushes, setPushes] = useState<AggregatedPush[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for creating new aggregation
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [articleIds, setArticleIds] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  
  // Reschedule modal
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newScheduleTime, setNewScheduleTime] = useState('');
  
  const [aggregationService, setAggregationService] = useState<AggregationService | null>(null);

  // Initialize service
  useEffect(() => {
    getDefaultStorageAdapter().then(adapter => {
      setAggregationService(new AggregationService(adapter));
    }).catch(err => {
      setError(`Failed to initialize storage: ${err.message}`);
      setLoading(false);
    });
  }, []);

  // Load pushes
  const loadPushes = useCallback(async () => {
    if (!aggregationService) return;
    try {
      const allPushes = await aggregationService.getAll();
      // Sort by scheduledAt, pending first
      const sorted = allPushes.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return a.scheduledAt - b.scheduledAt;
      });
      setPushes(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pushes');
    } finally {
      setLoading(false);
    }
  }, [aggregationService]);

  useEffect(() => {
    if (aggregationService) {
      loadPushes();
      // Poll for updates every 5 seconds
      const interval = setInterval(loadPushes, 5000);
      return () => clearInterval(interval);
    }
  }, [aggregationService, loadPushes]);

  // Create aggregation
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aggregationService) return;
    
    try {
      const params: CreateAggregationParams = {
        title,
        summary,
        articleIds: articleIds.split('\n').map(id => id.trim()).filter(Boolean),
        scheduledAt: new Date(scheduledAt).getTime(),
      };
      await aggregationService.createAggregation(params);
      setTitle('');
      setSummary('');
      setArticleIds('');
      setScheduledAt('');
      loadPushes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create aggregation');
    }
  };

  // Cancel push
  const handleCancel = async (id: string) => {
    if (!aggregationService) return;
    try {
      await aggregationService.cancel(id);
      loadPushes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
    }
  };

  // Trigger now
  const handleTriggerNow = async (id: string) => {
    if (!aggregationService) return;
    try {
      // Mark as sent immediately for demo purposes
      // In real implementation, would trigger actual push sending
      await aggregationService.markSent(id);
      loadPushes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger');
    }
  };

  // Reschedule
  const handleReschedule = async () => {
    if (!aggregationService || !rescheduleId) return;
    try {
      await aggregationService.reschedule(rescheduleId, new Date(newScheduleTime).getTime());
      setRescheduleId(null);
      setNewScheduleTime('');
      loadPushes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule');
    }
  };

  // Delete push
  const handleDelete = async (id: string) => {
    if (!aggregationService) return;
    if (!confirm('Delete this push record?')) return;
    try {
      await aggregationService.delete(id);
      loadPushes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status: AggregatedPush['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
    };
    return `<span class="${colors[status]} px-2 py-1 rounded text-xs">${status}</span>`;
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="push-queue-panel p-4">
      <h2 className="text-xl font-bold mb-4">Push Queue Management</h2>
      
      {/* Create Form */}
      <form onSubmit={handleCreate} className="mb-6 p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">Create New Aggregation</h3>
        <div className="grid gap-3">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="border p-2 rounded"
            required
          />
          <textarea
            placeholder="Summary"
            value={summary}
            onChange={e => setSummary(e.target.value)}
            className="border p-2 rounded"
            rows={2}
          />
          <textarea
            placeholder="Article IDs (one per line)"
            value={articleIds}
            onChange={e => setArticleIds(e.target.value)}
            className="border p-2 rounded"
            rows={3}
          />
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="border p-2 rounded"
            required
          />
          <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
            Create Aggregation
          </button>
        </div>
      </form>

      {/* Push List */}
      <div className="space-y-3">
        <h3 className="font-semibold">Pending Aggregations ({pushes.filter(p => p.status === 'pending').length})</h3>
        
        {pushes.length === 0 ? (
          <p className="text-gray-500">No push records</p>
        ) : (
          pushes.map(push => (
            <div key={push.id} className="border p-3 rounded bg-white">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium">{push.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{push.summary}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    <span>Scheduled: {formatTime(push.scheduledAt)}</span>
                    <span className="mx-2">|</span>
                    <span>Articles: {push.articleIds.length}</span>
                    <span className="mx-2">|</span>
                    <span>Retries: {push.retryCount}</span>
                  </div>
                  <div 
                    className="mt-2"
                    dangerouslySetInnerHTML={{ __html: getStatusBadge(push.status) }}
                  />
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  {push.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleTriggerNow(push.id)}
                        className="text-green-600 hover:underline text-sm"
                      >
                        Send Now
                      </button>
                      <button
                        onClick={() => {
                          setRescheduleId(push.id);
                          setNewScheduleTime(new Date(push.scheduledAt).toISOString().slice(0, 16));
                        }}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleCancel(push.id)}
                        className="text-yellow-600 hover:underline text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(push.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <h3 className="font-semibold mb-3">Reschedule Push</h3>
            <input
              type="datetime-local"
              value={newScheduleTime}
              onChange={e => setNewScheduleTime(e.target.value)}
              className="border p-2 rounded mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={handleReschedule}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Confirm
              </button>
              <button
                onClick={() => setRescheduleId(null)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PushQueuePanel;
