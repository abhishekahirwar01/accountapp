import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../../config";

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let newSocket;
    
    const initializeSocket = async () => {
      const token = await AsyncStorage.getItem("token");
      const userData = await AsyncStorage.getItem("user");

      if (!token || !userData) return;

      const user = JSON.parse(userData);
      const userId = user.id || user._id || user.userId || user.userID;
      const clientId = user.clientId || user.clientID || user.client || userId;

      if (!userId) return;

      // Connect to socket server using BASE_URL
      newSocket = io(BASE_URL, {
        auth: { token }
      });

      newSocket.on('connect', () => {
        console.log('🔔 Connected to notification socket', new Date().toISOString());
        setIsConnected(true);

        // Join appropriate room
        if (user.role === 'master') {
          newSocket.emit('joinRoom', { userId, role: user.role, clientId });
          console.log('🔔 Joined master room:', `master-${userId}`);
        } else if (user.role === 'client' || user.role === 'user' || user.role === 'admin') {
          newSocket.emit('joinRoom', { userId, role: user.role, clientId });
          console.log('🔔 Joined rooms:', `user-${userId}`, `client-${clientId}`);
        }
      });

      newSocket.on('disconnect', () => {
        console.log('🔔 Disconnected from notification socket');
        setIsConnected(false);
      });

      setSocket(newSocket);
    };

    initializeSocket();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
        setIsConnected(false);
      }
    };
  }, []);

  return { socket, isConnected };
};