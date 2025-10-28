import React, { useEffect } from 'react';
import { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
const SocketListener = ({ socket, onNotification }) => {
  useEffect(() => {
    console.log('🔊 SocketListener: Setting up notification listener, socket:', !!socket);
    if (!socket) return;

    const handleNotification = (data) => {
      console.log('🔊 SocketListener: New notification received:', data, new Date().toISOString());
      onNotification();
    };

    socket.on('newNotification', handleNotification);
    console.log('🔊 SocketListener: Notification listener attached');

    return () => {
      socket.off('newNotification', handleNotification);
      console.log('🔊 SocketListener: Notification listener removed');
    };
  }, [socket, onNotification]);

  return null;
};

export default SocketListener;