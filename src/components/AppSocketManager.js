/**
 * AppSocketManager - Manages all socket listeners for real-time updates
 * This component is invisible (returns null) but sets up all socket event listeners
 *
 * Similar to web's approach of mounting listeners in AppLayout
 * But in React Native, we mount it in App.jsx to persist across navigation
 */

import React from 'react';
import CompanySocketListener from '../socketlisteners/CompanySocketListener';
import InventorySocketListener from '../socketlisteners/InventorySocketListener';
import TransactionsSocketListener from '../socketlisteners/TransactionsSocketListener';
import { useCompany } from '../contexts/company-context';

/**
 * AppSocketManager - Container for all socket listeners
 *
 * Connects socket events to context callbacks:
 * - Company updates → trigger companies refresh
 * - Inventory updates → trigger inventory refresh
 * - Transaction updates → trigger transactions refresh
 */
const AppSocketManager = ({ socket, user }) => {
  const { triggerCompaniesRefresh } = useCompany();

  /**
   * Callback for company updates
   * Triggers refresh in CompanySwitcher and any company-dependent screens
   */
  const handleCompanyUpdate = () => {
    console.log(
      '🔔 AppSocketManager: Company update received, triggering refresh',
    );
    triggerCompaniesRefresh();
  };

  /**
   * Callback for product updates
   * Can trigger refresh in InventoryScreen
   * For now, we emit custom event that screens can listen to
   */
  const handleProductUpdate = () => {
    console.log('🔔 AppSocketManager: Product update received');
    // Emit event that InventoryScreen listens to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('product-updated'));
    }
  };

  /**
   * Callback for service updates
   * Can trigger refresh in InventoryScreen
   */
  const handleServiceUpdate = () => {
    console.log('🔔 AppSocketManager: Service update received');
    // Emit event that InventoryScreen listens to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('service-updated'));
    }
  };

  /**
   * Callback for transaction updates
   * Can trigger refresh in TransactionsScreen
   */
  const handleTransactionUpdate = () => {
    console.log('🔔 AppSocketManager: Transaction update received');
    // Emit event that TransactionsScreen listens to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('transaction-updated'));
    }
  };

  // If no socket or user, don't render listeners
  if (!socket || !user) {
    console.log(
      '⚠️ AppSocketManager: Waiting for socket and user',
      !!socket,
      !!user,
    );
    return null;
  }

  return (
    <>
      {/* Company listener - updates company selections */}
      <CompanySocketListener
        socket={socket}
        onCompanyUpdate={handleCompanyUpdate}
        user={user}
      />

      {/* Inventory listeners - updates products and services */}
      <InventorySocketListener
        socket={socket}
        onProductUpdate={handleProductUpdate}
        onServiceUpdate={handleServiceUpdate}
        user={user}
      />

      {/* Transactions listener - updates sales, purchases, etc */}
      <TransactionsSocketListener
        socket={socket}
        onTransactionUpdate={handleTransactionUpdate}
        user={user}
      />
    </>
  );
};

export default AppSocketManager;
