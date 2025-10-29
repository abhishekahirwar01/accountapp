import React, { createContext, useState, useContext, useCallback, useEffect, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../config";

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
  canShowCustomers: true,
  canShowVendors: true,
};

const UserPermissionsContext = createContext();

function getRoleFromToken(token) {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(base64));
    return (json.role || json.userRole || json.r || "").toLowerCase() || null;
  } catch {
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

    const token = await AsyncStorage.getItem("token");
    const currentRole = getRoleFromToken(token);
    setRole(currentRole);

    try {
      if (!token) throw new Error("Authentication token not found.");

      const res = await fetch(`${BASE_URL}/api/user-permissions/me/effective`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to fetch permissions");
      }

      const data = await res.json();
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
        canShowCustomers: data.canShowCustomers,
        canShowVendors: data.canShowVendors,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      setShowModal(true); // 🔥 show error modal
      setPermissions(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const isAllowed = useCallback(
    (key) => {
      if (role && role !== "user" && role !== "admin" && role !== "manager") return true;
      return Boolean(permissions?.[key]);
    },
    [role, permissions]
  );

  const value = useMemo(
    () => ({ role, permissions, isLoading, error, isAllowed, refetch: fetchPermissions }),
    [role, permissions, isLoading, error, isAllowed, fetchPermissions]
  );

  return (
    <UserPermissionsContext.Provider value={value}>
      {children}

      {/* 🔔 Error Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalMessage}>{error}</Text>

            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
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
  if (!ctx) throw new Error("useUserPermissions must be used within a UserPermissionsProvider");
  return ctx;
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "80%",
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "red",
  },
  modalMessage: {
    fontSize: 16,
    color: "#333",
    marginBottom: 15,
  },
  closeButton: {
    alignSelf: "flex-end",
    backgroundColor: "#007bff",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
