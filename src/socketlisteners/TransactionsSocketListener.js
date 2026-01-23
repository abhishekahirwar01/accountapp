/**
 * TransactionsSocketListener - Real-time updates for transaction pages
 * Listens for CRUD operations on sales, purchases, receipts, payments, journals, and proforma invoices
 */

import { useEffect } from 'react';

const TransactionsSocketListener = ({ socket, onTransactionUpdate, user }) => {
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

    // ✅ CRITICAL: Join all-transactions-updates room for ALL users, admins, and masters
    // This ensures everyone gets transaction updates
    socket.emit('joinRoom', { room: 'all-transactions-updates' });

    if (user.role === 'master') {
      socket.emit('joinRoom', { room: 'all-masters' });
    }

    const handleTransactionUpdate = data => {
      // Only trigger refresh if the update is relevant to this user
      // Check if it's a global update or for this client
      const isRelevantUpdate =
        !data.clientId || data.clientId === clientId || user.role === 'master';

      if (isRelevantUpdate) {
        // Trigger refresh for any transaction update
        onTransactionUpdate();
      } else {
      }
    };

    // Listen for all transaction types
    socket.on('sales-update', handleTransactionUpdate);
    socket.on('purchase-update', handleTransactionUpdate);
    socket.on('receipt-update', handleTransactionUpdate);
    socket.on('payment-update', handleTransactionUpdate);
    socket.on('journal-update', handleTransactionUpdate);
    socket.on('proforma-update', handleTransactionUpdate);
    socket.on('transaction-update', handleTransactionUpdate); // Generic fallback

    // Handle reconnection
    const handleConnect = () => {
      socket.emit('joinRoom', { userId, role: user.role, clientId });
      socket.emit('joinRoom', { room: `user-${userId}` });
      socket.emit('joinRoom', { room: `client-${clientId}` });
      socket.emit('joinRoom', { room: 'all-transactions-updates' });

      if (user.role === 'master') {
        socket.emit('joinRoom', { room: 'all-masters' });
      }
    };

    socket.on('connect', handleConnect);

    return () => {
      // Clean up all listeners
      socket.off('sales-update', handleTransactionUpdate);
      socket.off('purchase-update', handleTransactionUpdate);
      socket.off('receipt-update', handleTransactionUpdate);
      socket.off('payment-update', handleTransactionUpdate);
      socket.off('journal-update', handleTransactionUpdate);
      socket.off('proforma-update', handleTransactionUpdate);
      socket.off('transaction-update', handleTransactionUpdate);
      socket.off('connect', handleConnect);
    };
  }, [socket, user, onTransactionUpdate]);

  return null;
};

export default TransactionsSocketListener;
