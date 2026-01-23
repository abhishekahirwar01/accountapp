import { useEffect } from 'react';

const CompanySocketListener = ({ socket, onCompanyUpdate, user }) => {
  useEffect(() => {
    if (!socket) {
      return;
    }
    if (!user) {
      return;
    }

    const userId = user._id;
    const clientId = user.clientId || user.client || userId;

    // Core joins

    socket.emit('joinRoom', { userId, role: user.role, clientId });

    // ✅ REQUIRED joins
    socket.emit('joinRoom', { room: `user-${userId}` });
    socket.emit('joinRoom', { room: `client-${clientId}` });

    if (user.role === 'master') {
      socket.emit('joinRoom', { room: 'all-masters' });
    }

    const handleCompanyUpdate = data => {
      onCompanyUpdate();
    };

    const handleUserUpdate = data => {
      // Only refresh if this is a company assignment update
      if (data.action === 'company-assignment-update') {
        onCompanyUpdate();
      }
    };

    socket.on('company-update', handleCompanyUpdate);
    socket.on('user-update', handleUserUpdate);

    // Handle reconnection
    const handleConnect = () => {
      socket.emit('joinRoom', { userId, role: user.role, clientId });
      socket.emit('joinRoom', { room: `user-${userId}` });
      socket.emit('joinRoom', { room: `client-${clientId}` });
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('company-update', handleCompanyUpdate);
      socket.off('user-update', handleUserUpdate);
      socket.off('connect', handleConnect);
    };
  }, [socket, user, onCompanyUpdate]);

  return null;
};

export default CompanySocketListener;
