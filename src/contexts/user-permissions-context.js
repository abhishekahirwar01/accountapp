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

/** * Web code ke saath sync kiya gaya:
 * canCreateProducts, canShowCustomers, canShowVendors add kiye gaye hain.
 */
const ALL_ALLOWED = {
  canCreateInventory: true,
  canCreateCustomers: true,
  canCreateVendors: true,
  canCreateProducts: true,
  canCreateCompanies: true,
  canUpdateCompanies: true,
  canSendInvoiceEmail: true,
  canSendInvoiceWhatsapp: true,
  canCreateSaleEntries: true,
  canCreatePurchaseEntries: true,
  canCreateJournalEntries: true,
  canCreateReceiptEntries: true,
  canCreatePaymentEntries: true,
  canShowCustomers: true,
  canShowVendors: true,
};

const UserPermissionsContext = createContext();

function getRoleFromToken(token) {
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    return (
      (decoded.role || decoded.userRole || decoded.r || '').toLowerCase() ||
      null
    );
  } catch (error) {
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
    setIsLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setPermissions(null);
        setRole(null);
        setIsLoading(false);
        setShowModal(false);
        return;
      }

      const currentRole = getRoleFromToken(token);
      setRole(currentRole);

      // Web logic sync: Agar role special roles mein nahi hai, toh bypass karein
      // Hum sirf 'user', 'client', aur 'customer' ke liye API hit karte hain
      const restrictedRoles = ['user', 'client', 'customer'];
      if (currentRole && !restrictedRoles.includes(currentRole)) {
        setPermissions(ALL_ALLOWED);
        setIsLoading(false);
        return;
      }

      // Dynamic API Selection (Web ke logic ki tarah)
      const isClientOrCustomer =
        currentRole === 'client' || currentRole === 'customer';
      const apiUrl = isClientOrCustomer
        ? `${BASE_URL}/api/clients/my/permissions`
        : `${BASE_URL}/api/user-permissions/me/effective`;

      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || `Failed to fetch permissions: ${res.status}`,
        );
      }

      const data = await res.json();

      // Permissions mapping with Default Values (?? true logic)
      setPermissions({
        canCreateInventory: data.canCreateInventory,
        canCreateCustomers: data.canCreateCustomers,
        canCreateVendors: data.canCreateVendors,
        canCreateProducts: data.canCreateProducts, // New
        canCreateCompanies: data.canCreateCompanies,
        canUpdateCompanies: data.canUpdateCompanies,
        canSendInvoiceEmail: data.canSendInvoiceEmail,
        canSendInvoiceWhatsapp: data.canSendInvoiceWhatsapp,
        canCreateSaleEntries: data.canCreateSaleEntries ?? true,
        canCreatePurchaseEntries: data.canCreatePurchaseEntries ?? true,
        canCreateJournalEntries: data.canCreateJournalEntries ?? true,
        canCreateReceiptEntries: data.canCreateReceiptEntries ?? true,
        canCreatePaymentEntries: data.canCreatePaymentEntries ?? true,
        canShowCustomers: data.canShowCustomers ?? true, // New
        canShowVendors: data.canShowVendors ?? true, // New
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      if (await AsyncStorage.getItem('token')) {
        setError(msg);
        setShowModal(true);
      }
      // App crash na ho isliye fallback
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
      // Admin/Manager/Master bypass logic
      const restrictedRoles = ['user', 'client', 'customer'];
      if (role && !restrictedRoles.includes(role)) return true;

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
