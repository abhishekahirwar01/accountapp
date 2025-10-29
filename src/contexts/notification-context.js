// contexts/notification-context.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from '../components/hooks/useSocket';
import { BASE_URL } from "../config";

const NotificationContext = createContext(undefined);

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket } = useSocket();

  console.log('🔔 NotificationProvider mounted - Socket:', socket ? 'Connected' : 'Disconnected');
  console.log('🔔 Initial unreadCount:', unreadCount);

  // Listen for real-time notifications
  useEffect(() => {
    console.log('🔔 useEffect setup - Socket available:', !!socket);
    
    if (!socket) {
      console.log('🔔 No socket available, skipping event listeners');
      return;
    }

    // Listen for new notifications
    const handleNewNotification = () => {
      console.log('🔔 newNotification event received');
      setUnreadCount(prev => {
        const newCount = prev + 1;
        console.log('🔔 Incrementing count:', prev, '→', newCount);
        return newCount;
      });
    };

    // Listen for bulk notification updates (when fetching initial count)
    const handleNotificationCount = (count) => {
      console.log('🔔 notificationCount event received with count:', count);
      setUnreadCount(count);
    };

    // Set up event listeners
    socket.on('newNotification', handleNewNotification);
    socket.on('notificationCount', handleNotificationCount);

    // Request initial count when component mounts
    console.log('🔔 Requesting initial notification count...');
    socket.emit('getNotificationCount');

    // Log all socket events for debugging
    socket.onAny((eventName, ...args) => {
      if (eventName !== 'notificationCount' && eventName !== 'newNotification') {
        console.log('🔔 Other socket event:', eventName, args);
      }
    });

    console.log('🔔 Event listeners registered: newNotification, notificationCount');

    // Cleanup
    return () => {
      console.log('🔔 Cleaning up event listeners');
      socket.off('newNotification', handleNewNotification);
      socket.off('notificationCount', handleNotificationCount);
      socket.offAny();
    };
  }, [socket]);

  const incrementUnreadCount = () => {
    console.log('🔔 Manual increment called');
    setUnreadCount(prev => {
      const newCount = prev + 1;
      console.log('🔔 Manual increment:', prev, '→', newCount);
      return newCount;
    });
  };

  const markAsRead = () => {
    console.log('🔔 markAsRead called, resetting count from', unreadCount, 'to 0');
    setUnreadCount(0);
    
    // You might want to emit a socket event to mark notifications as read on the server
    if (socket) {
      console.log('🔔 Emitting markNotificationsRead to server');
      socket.emit('markNotificationsRead');
    } else {
      console.log('🔔 No socket available for markNotificationsRead');
    }
  };

  // Log when unreadCount changes
  useEffect(() => {
    console.log('🔔 unreadCount updated:', unreadCount);
  }, [unreadCount]);

  // Log socket connection status changes
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log('🔔 Socket connected - requesting notification count');
      socket.emit('getNotificationCount');
    };

    const handleDisconnect = () => {
      console.log('🔔 Socket disconnected');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  const value = {
    unreadCount,
    setUnreadCount: (count) => {
      console.log('🔔 setUnreadCount called:', count);
      setUnreadCount(count);
    },
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
    throw new Error('useNotification must be used within a NotificationProvider');
  }

  console.log('🔔 useNotification hook called, unreadCount:', context.unreadCount);
  
  return context;
}