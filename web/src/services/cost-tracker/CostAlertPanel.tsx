// Cost Alert Panel - React component for managing cost alerts

import React, { useState, useEffect, useCallback } from 'react';
import type { CostAlert, AlertNotification, AlertConfig } from '../../../../shared/lib/ai/cost-alert/types';
import { requestNotificationPermission } from '../../../../shared/lib/ai/cost-alert/notifier';

// Access the service via dynamic import
let alertService: any = null;

async function getAlertService() {
  if (!alertService) {
    const module = await import('../../../../shared/lib/ai/cost-alert/alert-service');
    alertService = module.getCostAlertService();
  }
  return alertService;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CostAlertPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'alerts' | 'history' | 'settings'>('alerts');
  const [loading, setLoading] = useState(false);

  // Form state for creating alerts
  const [newAlertName, setNewAlertName] = useState('');
  const [newAlertType, setNewAlertType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [newAlertThreshold, setNewAlertThreshold] = useState(''); // in dollars

  const loadData = useCallback(async () => {
    try {
      const service = await getAlertService();
      const [alertsData, notificationsData, configData] = await Promise.all([
        service.getAlerts(),
        service.getNotifications(50),
        service.getConfig(),
      ]);
      setAlerts(alertsData);
      setNotifications(notificationsData);
      setConfig(configData);
    } catch (error) {
      console.error('[CostAlertPanel] Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
      
      // Listen for panel notifications
      const handleCostAlert = (event: CustomEvent) => {
        setNotifications(prev => [event.detail, ...prev]);
        loadData(); // Refresh alerts status
      };
      
      window.addEventListener('cost-alert', handleCostAlert as EventListener);
      return () => {
        window.removeEventListener('cost-alert', handleCostAlert as EventListener);
      };
    }
  }, [isOpen, loadData]);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertName || !newAlertThreshold) return;

    setLoading(true);
    try {
      const service = await getAlertService();
      const thresholdCents = Math.round(parseFloat(newAlertThreshold) * 100);
      await service.createAlert({
        name: newAlertName,
        type: newAlertType,
        threshold: thresholdCents,
      });
      
      setNewAlertName('');
      setNewAlertThreshold('');
      await loadData();
    } catch (error) {
      console.error('[CostAlertPanel] Failed to create alert:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      const service = await getAlertService();
      await service.deleteAlert(id);
      await loadData();
    } catch (error) {
      console.error('[CostAlertPanel] Failed to delete alert:', error);
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    try {
      const service = await getAlertService();
      await service.markRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('[CostAlertPanel] Failed to mark read:', error);
    }
  };

  const handleClearNotifications = async () => {
    try {
      const service = await getAlertService();
      await service.clearNotifications();
      setNotifications([]);
    } catch (error) {
      console.error('[CostAlertPanel] Failed to clear notifications:', error);
    }
  };

  const handleUpdateConfig = async (updates: Partial<AlertConfig>) => {
    try {
      const service = await getAlertService();
      await service.updateConfig(updates);
      setConfig(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('[CostAlertPanel] Failed to update config:', error);
    }
  };

  const handleRequestPermission = async () => {
    const permission = await requestNotificationPermission();
    handleUpdateConfig({ enableBrowserNotification: permission === 'granted' });
  };

  const formatThreshold = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatPercent = (percent: number) => `${percent.toFixed(1)}%`;
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: CostAlert['status']) => {
    switch (status) {
      case 'normal': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'critical': return '#f44336';
      case 'exceeded': return '#b71c1c';
      default: return '#9e9e9e';
    }
  };

  const getStatusText = (status: CostAlert['status']) => {
    switch (status) {
      case 'normal': return '正常';
      case 'warning': return '警告';
      case 'critical': return '严重';
      case 'exceeded': return '超支';
      default: return status;
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>💰 成本告警</h2>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'alerts' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('alerts')}
          >
            告警规则
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'history' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('history')}
          >
            通知历史
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'settings' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('settings')}
          >
            设置
          </button>
        </div>

        <div style={styles.content}>
          {activeTab === 'alerts' && (
            <>
              {/* Create Alert Form */}
              <form onSubmit={handleCreateAlert} style={styles.form}>
                <input
                  type="text"
                  placeholder="告警名称"
                  value={newAlertName}
                  onChange={e => setNewAlertName(e.target.value)}
                  style={styles.input}
                  required
                />
                <select
                  value={newAlertType}
                  onChange={e => setNewAlertType(e.target.value as any)}
                  style={styles.select}
                >
                  <option value="daily">每日</option>
                  <option value="weekly">每周</option>
                  <option value="monthly">每月</option>
                </select>
                <input
                  type="number"
                  placeholder="阈值 (美元)"
                  value={newAlertThreshold}
                  onChange={e => setNewAlertThreshold(e.target.value)}
                  style={styles.input}
                  step="0.01"
                  min="0"
                  required
                />
                <button type="submit" style={styles.submitBtn} disabled={loading}>
                  {loading ? '创建中...' : '创建告警'}
                </button>
              </form>

              {/* Alert List */}
              <div style={styles.alertList}>
                {alerts.length === 0 ? (
                  <p style={styles.emptyText}>暂无告警规则</p>
                ) : (
                  alerts.map(alert => (
                    <div key={alert.id} style={styles.alertCard}>
                      <div style={styles.alertHeader}>
                        <span style={styles.alertName}>{alert.name}</span>
                        <span style={{ ...styles.statusBadge, backgroundColor: getStatusColor(alert.status) }}>
                          {getStatusText(alert.status)}
                        </span>
                      </div>
                      <div style={styles.alertInfo}>
                        <span>类型: {alert.type === 'daily' ? '每日' : alert.type === 'weekly' ? '每周' : '每月'}</span>
                        <span>阈值: {formatThreshold(alert.threshold)}</span>
                      </div>
                      <div style={styles.progressContainer}>
                        <div style={styles.progressBar}>
                          <div
                            style={{
                              ...styles.progressFill,
                              width: `${Math.min(alert.percent, 100)}%`,
                              backgroundColor: getStatusColor(alert.status),
                            }}
                          />
                        </div>
                        <span style={styles.progressText}>
                          {formatPercent(alert.percent)}
                        </span>
                      </div>
                      <button
                        style={styles.deleteBtn}
                        onClick={() => handleDeleteAlert(alert.id)}
                      >
                        删除
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <div style={styles.notificationList}>
              {notifications.length === 0 ? (
                <p style={styles.emptyText}>暂无通知历史</p>
              ) : (
                <>
                  <button
                    style={styles.clearBtn}
                    onClick={handleClearNotifications}
                  >
                    清空历史
                  </button>
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      style={{
                        ...styles.notifCard,
                        ...(notif.read ? styles.notifRead : {}),
                      }}
                      onClick={() => !notif.read && handleMarkRead(notif.id)}
                    >
                      <div style={styles.notifHeader}>
                        <span style={styles.notifType}>
                          {notif.type === 'warning' ? '⚠️' : notif.type === 'critical' ? '🚨' : '💸'}
                          {' '}
                          {notif.type === 'warning' ? '警告' : notif.type === 'critical' ? '严重' : '超支'}
                        </span>
                        <span style={styles.notifTime}>{formatDate(notif.createdAt)}</span>
                      </div>
                      <p style={styles.notifMessage}>{notif.message}</p>
                      {!notif.read && <span style={styles.unreadDot} />}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'settings' && config && (
            <div style={styles.settingsList}>
              <div style={styles.settingItem}>
                <label style={styles.settingLabel}>
                  <input
                    type="checkbox"
                    checked={config.enableBrowserNotification}
                    onChange={e => handleUpdateConfig({ enableBrowserNotification: e.target.checked })}
                  />
                  启用浏览器通知
                </label>
                {config.enableBrowserNotification && Notification.permission !== 'granted' && (
                  <button style={styles.permissionBtn} onClick={handleRequestPermission}>
                    请求通知权限
                  </button>
                )}
              </div>

              <div style={styles.settingItem}>
                <label style={styles.settingLabel}>
                  <input
                    type="checkbox"
                    checked={config.enablePanelNotification}
                    onChange={e => handleUpdateConfig({ enablePanelNotification: e.target.checked })}
                  />
                  启用面板通知
                </label>
              </div>

              <div style={styles.settingItem}>
                <label style={styles.settingLabel}>
                  警告阈值 (默认 80%)
                  <input
                    type="range"
                    min="50"
                    max="99"
                    value={config.warningPercent}
                    onChange={e => handleUpdateConfig({ warningPercent: parseInt(e.target.value) })}
                    style={styles.slider}
                  />
                  <span>{config.warningPercent}%</span>
                </label>
              </div>

              <div style={styles.settingItem}>
                <label style={styles.settingLabel}>
                  严重阈值 (默认 95%)
                  <input
                    type="range"
                    min="80"
                    max="100"
                    value={config.criticalPercent}
                    onChange={e => handleUpdateConfig({ criticalPercent: parseInt(e.target.value) })}
                    style={styles.slider}
                  />
                  <span>{config.criticalPercent}%</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '480px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #eee',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '0 4px',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #eee',
  },
  tab: {
    flex: 1,
    padding: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#666',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    color: '#1976D2',
    borderBottomColor: '#1976D2',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
  },
  form: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '16px',
  },
  input: {
    flex: '1 1 45%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  select: {
    flex: '1 1 30%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  submitBtn: {
    flex: '1 1 100%',
    padding: '10px',
    backgroundColor: '#1976D2',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: '24px',
  },
  alertCard: {
    padding: '12px',
    border: '1px solid #eee',
    borderRadius: '8px',
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  alertName: {
    fontWeight: 600,
    fontSize: '14px',
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
  },
  alertInfo: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#666',
    marginBottom: '8px',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#eee',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: '12px',
    color: '#666',
    minWidth: '45px',
    textAlign: 'right',
  },
  deleteBtn: {
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    padding: '4px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  notificationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  clearBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginBottom: '8px',
  },
  notifCard: {
    padding: '12px',
    border: '1px solid #eee',
    borderRadius: '8px',
    cursor: 'pointer',
    position: 'relative',
  },
  notifRead: {
    opacity: 0.6,
  },
  notifHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  notifType: {
    fontSize: '13px',
    fontWeight: 600,
  },
  notifTime: {
    fontSize: '12px',
    color: '#999',
  },
  notifMessage: {
    margin: 0,
    fontSize: '13px',
    color: '#666',
  },
  unreadDot: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '8px',
    height: '8px',
    backgroundColor: '#1976D2',
    borderRadius: '50%',
  },
  settingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  settingItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  settingLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  slider: {
    flex: 1,
  },
  permissionBtn: {
    backgroundColor: '#1976D2',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    alignSelf: 'flex-start',
  },
};

export default CostAlertPanel;
