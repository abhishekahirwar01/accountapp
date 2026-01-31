import { useEffect, useState, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';

let socketInstance = null;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(
    socketInstance?.connected || false,
  );
  const isJoined = useRef(false);

  const joinRooms = useCallback(async socket => {
    if (isJoined.current) return;
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const userId = user.id || user._id || user.userId;
      const clientId = user.clientId || userId;

      if (!userId) return;

      // Backend expects these two specifically
      socket.emit('IDENTIFY', { userId, clientId });
      socket.emit('joinRoom', { userId, role: user.role, clientId });

      isJoined.current = true;
    } catch (error) {
      console.error('❌ [Socket] Join Error:', error);
    }
  }, []);

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(BASE_URL, {
        path: '/socket.io/',
        transports: ['websocket'],
        reconnection: true,
        forceNew: false,
        multiplex: true,
      });
    }

    const onConnect = () => {
      console.log('✅ [Socket] Connected');
      setIsConnected(true);
      joinRooms(socketInstance);
    };

    const onDisconnect = () => {
      console.log('❌ [Socket] Disconnected');
      setIsConnected(false);
      isJoined.current = false;
    };

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);

    if (socketInstance.connected && !isJoined.current) onConnect();

    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
    };
  }, [joinRooms]);

  return { socket: socketInstance, isConnected };
};

/**
 * Account Level Listener (Backend uses PERMISSION_UPDATE)
 */
export const usePermissionSocket = onPermissionUpdate => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handler = payload => {
      // Backend sends data inside { type, data }
      if (payload?.type === 'PERMISSION_UPDATE') {
        onPermissionUpdate(payload.data);
      }
    };

    socket.on('PERMISSION_UPDATE', handler);
    return () => socket.off('PERMISSION_UPDATE', handler);
  }, [socket, onPermissionUpdate]);
};

/**
 * User Level Listener (Backend also uses PERMISSION_UPDATE for users)
 */
export const useUserPermissionSocket = onUserUpdate => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handler = payload => {
      // Backend controller line 86: { type: 'USER_PERMISSION_UPDATE', data: doc }
      if (payload?.type === 'USER_PERMISSION_UPDATE') {
        onUserUpdate(payload.data);
      }
    };

    // YAHAN GALTI THI: Backend direct USER_PERMISSION_UPDATE nahi bhejta
    // Wo PERMISSION_UPDATE bhejta hai aur andar type batata hai
    socket.on('PERMISSION_UPDATE', handler);

    // Backup: Agar backend kabhi direct bhej de
    socket.on('USER_PERMISSION_UPDATE', onUserUpdate);

    return () => {
      socket.off('PERMISSION_UPDATE', handler);
      socket.off('USER_PERMISSION_UPDATE', onUserUpdate);
    };
  }, [socket, onUserUpdate]);
};
