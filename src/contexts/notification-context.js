// contexts/notification-context.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from '../components/hooks/useSocket';
import { BASE_URL } from '../config';

const NotificationContext = createContext(undefined);

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket } = useSocket();

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) {
      return;
    }

    // Listen for new notifications
    const handleNewNotification = () => {
      setUnreadCount(prev => prev + 1);
    };

    // Listen for bulk notification updates (when fetching initial count)
    const handleNotificationCount = count => {
      setUnreadCount(count);
    };

    // Set up event listeners
    socket.on('newNotification', handleNewNotification);
    socket.on('notificationCount', handleNotificationCount);

    // Request initial count when component mounts
    socket.emit('getNotificationCount');

    // Cleanup
    return () => {
      socket.off('newNotification', handleNewNotification);
      socket.off('notificationCount', handleNotificationCount);
    };
  }, [socket]);

  const incrementUnreadCount = () => {
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = () => {
    setUnreadCount(0);

    // Emit socket event to mark notifications as read on the server
    if (socket) {
      socket.emit('markNotificationsRead');
    }
  };

  // Handle socket connection status changes
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      socket.emit('getNotificationCount');
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket]);

  const value = {
    unreadCount,
    setUnreadCount,
    incrementUnreadCount,
    markAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);

  if (context === undefined) {
    throw new Error(
      'useNotification must be used within a NotificationProvider',
    );
  }

  return context;
}
