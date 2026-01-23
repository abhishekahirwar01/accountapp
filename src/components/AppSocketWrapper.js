/**
 * AppSocketWrapper - Wraps socket initialization and management
 * This component uses the useSocket hook and passes socket + user to AppSocketManager
 *
 * Placed between App and the providers to ensure hooks work correctly
 */

import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from './hooks/useSocket';
import AppSocketManager from './AppSocketManager';

const AppSocketWrapper = ({ children }) => {
  const { socket, isConnected } = useSocket();
  const [user, setUser] = useState(null);

  // Get user from AsyncStorage
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          console.log('📱 AppSocketWrapper: User loaded:', {
            userId: parsedUser._id,
            role: parsedUser.role,
          });
        }
      } catch (error) {
        console.error('❌ AppSocketWrapper: Error loading user:', error);
      }
    };

    fetchUser();
  }, []);

  return (
    <>
      {/* Mount socket listeners - invisible component that handles socket events */}
      {socket && user && <AppSocketManager socket={socket} user={user} />}

      {/* Debug logging */}
      {!socket &&
        console.log('⚠️ AppSocketWrapper: Socket not initialized yet')}
      {!user && console.log('⚠️ AppSocketWrapper: User not loaded yet')}

      {children}
    </>
  );
};

export default AppSocketWrapper;
