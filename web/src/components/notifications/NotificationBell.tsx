/**
 * NotificationBell - Bell icon with unread count badge
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getNotificationService } from '../../services/notifications/notification-service';
import { getNotificationBroadcast } from '../../services/notifications/notification-broadcast';
import type { Notification } from '../../services/notifications/notification-service';

interface NotificationBellProps {
  onClick?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onClick }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    try {
      const service = getNotificationService();
      const count = await service.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  }, []);

  useEffect(() => {
    // Load initial count
    loadUnreadCount();

    // Listen for new notifications via broadcast
    const broadcast = getNotificationBroadcast();
    const removeListener = broadcast.addListener((notification: Notification) => {
      // New notification received - update count
      loadUnreadCount();
    });

    // Poll for updates periodically as backup
    const intervalId = setInterval(loadUnreadCount, 5000);

    return () => {
      removeListener();
      clearInterval(intervalId);
    };
  }, [loadUnreadCount]);

  const handleClick = () => {
    setIsOpen(!isOpen);
    onClick?.();
  };

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={handleClick}>
      {/* Bell Icon SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <path
          d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 17.33 5.17 15.67 3.52C14.67 2.42 13.43 1.71 12 1.35V0C12 0 11.99 0 11.97 0C11.03 0 10.33 0.69 10.33 1.61V1.35C8.57 1.71 7.33 2.42 6.33 3.52C4.67 5.17 4 7.93 4 11V16L2 18H22L20 16V16ZM16 16H8V11C8 8.52 8.5 6.07 9.5 4.59C10.22 3.56 11.1 2.87 12.03 2.5H11.97C12.9 2.87 13.78 3.56 14.5 4.59C15.5 6.07 16 8.52 16 11V16Z"
          fill="currentColor"
        />
      </svg>

      {/* Red Badge with unread count */}
      {unreadCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: '#ff4d4f',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 5px',
            boxSizing: 'border-box',
            lineHeight: 1,
          }}
        >
          {displayCount}
        </span>
      )}
    </div>
  );
};