/**
 * NotificationPanel - Dropdown notification list with mark-all-read button
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Empty } from 'antd';
import { CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import { getNotificationService, type Notification, type NotificationType } from '../../services/notifications/notification-service';
import { getNotificationBroadcast } from '../../services/notifications/notification-broadcast';
import { getNotificationQueue } from '../../services/notifications/notification-queue';

interface NotificationPanelProps {
  visible: boolean;
  onClose: () => void;
  maxItems?: number;
}

const notificationTypeLabels: Record<NotificationType, string> = {
  article_update: '文章更新',
  subscription: '订阅',
  system: '系统通知',
};

function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  // Less than 1 minute
  if (diff < 60 * 1000) {
    return '刚刚';
  }

  // Less than 1 hour
  if (diff < 60 * 60 * 1000) {
    const mins = Math.floor(diff / (60 * 1000));
    return `${mins}分钟前`;
  }

  // Less than 24 hours
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}小时前`;
  }

  // Less than 7 days
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days}天前`;
  }

  // Otherwise show date
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  visible,
  onClose,
  maxItems = 20,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const service = getNotificationService();
      const all = await service.getNotifications(maxItems);
      setNotifications(all);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [maxItems]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      loadNotifications().finally(() => setLoading(false));
    }
  }, [visible, loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const service = getNotificationService();
      const broadcast = getNotificationBroadcast();
      const queue = getNotificationQueue();

      // Check online status
      if (!navigator.onLine) {
        await queue.queueMarkAsRead(id);
        broadcast.broadcastRead(id);
      } else {
        await service.markAsRead(id);
        broadcast.broadcastRead(id);
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const service = getNotificationService();
      const broadcast = getNotificationBroadcast();
      const queue = getNotificationQueue();

      // Check online status
      if (!navigator.onLine) {
        await queue.queueMarkAllAsRead();
      } else {
        await service.markAllAsRead();
      }

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const service = getNotificationService();

      await service.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!visible) return null;

  return (
    <div
      onClick={handlePanelClick}
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 8,
        width: 320,
        maxHeight: 400,
        overflow: 'auto',
        backgroundColor: '#fff',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>通知</span>
        {notifications.some(n => !n.read) && (
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            onClick={handleMarkAllAsRead}
          >
            全部已读
          </Button>
        )}
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无通知"
          style={{ padding: '24px 0' }}
        />
      ) : (
        <div>
          {notifications.map(notification => (
            <div
              key={notification.id}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
                backgroundColor: notification.read ? 'transparent' : '#f0f7ff',
                cursor: 'pointer',
              }}
              onClick={() => !notification.read && handleMarkAsRead(notification.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: '#fff',
                        backgroundColor:
                          notification.type === 'article_update'
                            ? '#1890ff'
                            : notification.type === 'subscription'
                            ? '#52c41a'
                            : '#722ed1',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {notificationTypeLabels[notification.type]}
                    </span>
                    <span style={{ fontSize: 12, color: '#999' }}>
                      {formatTimestamp(notification.timestamp)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontWeight: notification.read ? 400 : 600,
                      fontSize: 14,
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {notification.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#666',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {notification.body}
                  </div>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(notification.id);
                  }}
                  style={{ color: '#999', flexShrink: 0 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};