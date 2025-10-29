import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getCurrentUser } from "../lib/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from "../config";  

const PermissionContext = createContext();

export function PermissionProvider({ children }) {
  const [permissions, setPermissions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const showError = (message) => {
    setModalMessage(message);
    setModalVisible(true);
  };

  const fetchPermissions = useCallback(async () => {
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== 'customer') {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found.");
      
      const res = await fetch(`${BASE_URL}/api/clients/my/permissions`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 404) {
          const clientRes = await fetch(`${BASE_URL}/api/clients/my`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const clientData = await clientRes.json();
          setPermissions({
            canCreateUsers: clientData.canCreateUsers,
            canCreateProducts: clientData.canCreateProducts,
            canCreateCustomers: clientData.canCreateCustomers,
            canCreateVendors: clientData.canCreateVendors,
            canCreateCompanies: clientData.canCreateCompanies,
            canCreateInventory: clientData.canCreateInventory,
            canUpdateCompanies: clientData.canUpdateCompanies,
            canSendInvoiceEmail: clientData.canSendInvoiceEmail,
            canSendInvoiceWhatsapp: clientData.canSendInvoiceWhatsapp,
            maxCompanies: clientData.maxCompanies,       
            maxUsers: clientData.maxUsers,
            maxInventories: clientData.maxInventories
          });
        } else {
          throw new Error('Failed to fetch permissions');
        }
      } else {
        const data = await res.json();
        setPermissions(data);
      }

    } catch (error) {
      showError(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const value = { permissions, isLoading, refetch: fetchPermissions };

  return (
    <PermissionContext.Provider value={value}>
      {children}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBox: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});