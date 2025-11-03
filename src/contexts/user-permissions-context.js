import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { BASE_URL } from '../config';

const ALL_ALLOWED = {
  canCreateInventory: true,
  canCreateCustomers: true,
  canCreateVendors: true,
  canCreateCompanies: true,
  canUpdateCompanies: true,
  canSendInvoiceEmail: true,
  canSendInvoiceWhatsapp: true,
  canCreateSaleEntries: true,
  canCreatePurchaseEntries: true,
  canCreateJournalEntries: true,
  canCreateReceiptEntries: true,
  canCreatePaymentEntries: true,
};

const UserPermissionsContext = createContext();

function getRoleFromToken(token) {
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    console.log('🔐 Decoded token role:', decoded.role || decoded.userRole);
    return (
      (decoded.role || decoded.userRole || decoded.r || '').toLowerCase() ||
      null
    );
  } catch (error) {
    console.log('❌ JWT decode error:', error);
    return null;
  }
}

export function UserPermissionsProvider({ children }) {
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchPermissions = useCallback(async () => {
    console.log('🔄 Fetching permissions...');
    setIsLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('token');

      // ✅ Skip fetch completely if user is logged out
      if (!token) {
        console.log('🚫 No token found — skipping permissions fetch.');
        setPermissions(null);
        setRole(null);
        setIsLoading(false);
        setShowModal(false);
        return;
      }

      console.log('🔐 Token found:', !!token);
      const currentRole = getRoleFromToken(token);
      console.log('👤 Current role:', currentRole);
      setRole(currentRole);

      // ✅ Non-user roles shortcut
      if (
        currentRole &&
        currentRole !== 'user' &&
        currentRole !== 'admin' &&
        currentRole !== 'manager'
      ) {
        console.log(
          '✅ Non-user role detected, applying ALL_ALLOWED permissions',
        );
        setPermissions(ALL_ALLOWED);
        setIsLoading(false);
        return;
      }

      console.log('🌐 Fetching permissions from API...');
      const res = await fetch(`${BASE_URL}/api/user-permissions/me/effective`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || `Failed to fetch permissions: ${res.status}`,
        );
      }

      const data = await res.json();
      console.log('✅ Permissions API response:', data);

      setPermissions({
        canCreateInventory: data.canCreateInventory,
        canCreateCustomers: data.canCreateCustomers,
        canCreateVendors: data.canCreateVendors,
        canCreateCompanies: data.canCreateCompanies,
        canUpdateCompanies: data.canUpdateCompanies,
        canSendInvoiceEmail: data.canSendInvoiceEmail,
        canSendInvoiceWhatsapp: data.canSendInvoiceWhatsapp,
        canCreateSaleEntries: data.canCreateSaleEntries,
        canCreatePurchaseEntries: data.canCreatePurchaseEntries,
        canCreateJournalEntries: data.canCreateJournalEntries,
        canCreateReceiptEntries: data.canCreateReceiptEntries,
        canCreatePaymentEntries: data.canCreatePaymentEntries,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.log('❌ Permissions fetch error:', msg);

      // ✅ Only show modal if user *is logged in*
      if (await AsyncStorage.getItem('token')) {
        setError(msg);
        setShowModal(true);
      }

      // Fallback permissions to avoid app crash
      setPermissions(ALL_ALLOWED);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const isAllowed = useCallback(
    key => {
      if (role && role !== 'user' && role !== 'admin' && role !== 'manager')
        return true;
      return Boolean(permissions?.[key]);
    },
    [role, permissions],
  );

  const value = useMemo(
    () => ({
      role,
      permissions,
      isLoading,
      error,
      isAllowed,
      refetch: fetchPermissions,
    }),
    [role, permissions, isLoading, error, isAllowed, fetchPermissions],
  );

  return (
    <UserPermissionsContext.Provider value={value}>
      {children}

      {/* 🔔 Error Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Permissions Error</Text>
            <Text style={styles.modalMessage}>{error}</Text>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </UserPermissionsContext.Provider>
  );
}

export function useUserPermissions() {
  const ctx = useContext(UserPermissionsContext);
  if (!ctx)
    throw new Error(
      'useUserPermissions must be used within a UserPermissionsProvider',
    );
  return ctx;
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '80%',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'red',
  },
  modalMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
  },
  closeButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
