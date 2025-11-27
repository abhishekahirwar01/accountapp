import React, { useEffect } from 'react';
import { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
const SocketListener = ({ socket, onNotification }) => {
  useEffect(() => {
    if (!socket) return;

    const handleNotification = data => {
      onNotification();
    };

    socket.on('newNotification', handleNotification);

    return () => {
      socket.off('newNotification', handleNotification);
    };
  }, [socket, onNotification]);

  return null;
};

export default SocketListener;
