// In InventorySocketListener.tsx
import { useEffect } from 'react';

const InventorySocketListener = ({
  socket,
  onProductUpdate,
  onServiceUpdate,
  user,
}) => {
  useEffect(() => {
 

    if (!socket) {
      return;
    }

    if (!user) {
      return;
    }

    const userId = user._id || user.id;
    const clientId =
      user.clientId || user.client || user.tenantId || user.tenant || userId;

    // Core joins

    socket.emit('joinRoom', { userId, role: user.role, clientId });

    // ✅ REQUIRED joins
    socket.emit('joinRoom', { room: `user-${userId}` });
    socket.emit('joinRoom', { room: `client-${clientId}` });

    // ✅ CRITICAL: Join all-inventory-updates room for ALL users, admins, and masters
    // This ensures everyone gets inventory updates
    socket.emit('joinRoom', { room: 'all-inventory-updates' });

    if (user.role === 'master') {
      socket.emit('joinRoom', { room: 'all-masters' });
    }

    const handleProductUpdate = data => {
      onProductUpdate();
    };

    const handleServiceUpdate = data => {
      onServiceUpdate();
    };

    socket.on('product-update', handleProductUpdate);
    socket.on('service-update', handleServiceUpdate);

    // Handle reconnection
    const handleConnect = () => {
      socket.emit('joinRoom', { userId, role: user.role, clientId });
      socket.emit('joinRoom', { room: `user-${userId}` });
      socket.emit('joinRoom', { room: `client-${clientId}` });
      socket.emit('joinRoom', { room: 'all-inventory-updates' });

      if (user.role === 'master') {
        socket.emit('joinRoom', { room: 'all-masters' });
      }
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('product-update', handleProductUpdate);
      socket.off('service-update', handleServiceUpdate);
      socket.off('connect', handleConnect);
    };
  }, [socket, user, onProductUpdate, onServiceUpdate]);

  return null;
};

export default InventorySocketListener;
