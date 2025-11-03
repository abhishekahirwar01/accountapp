import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getCurrentUser } from '../lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

const PermissionContext = createContext();

export function PermissionProvider({ children }) {
  const [permissions, setPermissions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const showError = message => {
    console.log('Error Message:', message);
    setModalMessage(message);
    setModalVisible(true);
  };

  const fetchPermissions = useCallback(async () => {
    console.log('🔍 fetchPermissions function started');

    try {
      const token = await AsyncStorage.getItem('token');
      console.log('🔑 Token exists:', !!token);

      // 🚫 Skip fetch if no token (user not logged in)
      if (!token) {
        console.log('🚫 No token found — skipping permissions fetch.');
        setIsLoading(false);
        setPermissions(null);
        return;
      }

      const currentUser = await getCurrentUser();
      console.log('👤 Current User:', currentUser);

      if (currentUser?.role !== 'customer') {
        console.log('❌ User is not customer, skipping permission fetch');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      console.log(
        '🌐 Fetching permissions from:',
        `${BASE_URL}/api/clients/my/permissions`,
      );

      const res = await fetch(`${BASE_URL}/api/clients/my/permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('📡 Permissions API Response Status:', res.status);
      console.log('📡 Permissions API Response OK:', res.ok);

      if (!res.ok) {
        if (res.status === 404) {
          console.log(
            '🔍 Permissions endpoint not found, trying client endpoint...',
          );

          const clientRes = await fetch(`${BASE_URL}/api/clients/my`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (clientRes.ok) {
            const clientData = await clientRes.json();
            console.log('✅ Client data received:', clientData);

            setPermissions({
              canCreateUsers: clientData.canCreateUsers,
              canCreateProducts: clientData.canCreateProducts,
              canCreateCustomers: clientData.canCreateCustomers,
              canCreateVendors: clientData.canCreateVendors,
              canSendInvoiceEmail: clientData.canSendInvoiceEmail,
              canSendInvoiceWhatsapp: clientData.canSendInvoiceWhatsapp,
            });
          } else {
            throw new Error(
              `Client API failed with status: ${clientRes.status}`,
            );
          }
        } else {
          const errorText = await res.text();
          console.log('❌ Permissions API error response:', errorText);
          throw new Error(
            `Failed to fetch permissions: ${res.status} - ${errorText}`,
          );
        }
      } else {
        const data = await res.json();
        console.log('✅ Permissions data received:', data);
        setPermissions(data);
      }
    } catch (error) {
      console.log('💥 fetchPermissions error:', error);
      showError(
        error instanceof Error ? error.message : 'An unknown error occurred.',
      );
    } finally {
      console.log('🏁 fetchPermissions completed, setting loading to false');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log(
      '🚀 PermissionProvider mounted — skipping auto-fetch (manual trigger only)',
    );
    setIsLoading(false); // stop loading immediately
  }, []);

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
