import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  // SafeAreaView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config'; // Make sure BASE_URL is defined here
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// --- Permissions Configuration (Shared with Backend) ---
const ALL_CAPS = [
  'canCreateInventory',
  'canCreateCustomers',
  'canCreateVendors',
  'canCreateCompanies',
  'canUpdateCompanies',
  'canSendInvoiceEmail',
  'canSendInvoiceWhatsapp',
  'canCreateSaleEntries',
  'canCreatePurchaseEntries',
  'canCreateJournalEntries',
  'canCreateReceiptEntries',
  'canCreatePaymentEntries',
  'canShowCustomers',
  'canShowVendors',
];

const CAP_LABELS = {
  canCreateInventory: 'Create Inventory',
  canCreateCustomers: 'Create Customers',
  canCreateVendors: 'Create Vendors',
  canCreateCompanies: 'Create Companies',
  canUpdateCompanies: 'Update Companies',
  canSendInvoiceEmail: 'Send Invoice via Email',
  canSendInvoiceWhatsapp: 'Send Invoice via WhatsApp',
  canCreateSaleEntries: 'Create Sales',
  canCreatePurchaseEntries: 'Create Purchase',
  canCreateJournalEntries: 'Create Journal',
  canCreateReceiptEntries: 'Create Receipt',
  canCreatePaymentEntries: 'Create Payment',
  canShowCustomers: 'Show Customers',
  canShowVendors: 'Show Vendors',
};

const PRIMARY_CAPS = [
  'canCreateSaleEntries',
  'canCreatePurchaseEntries',
  'canCreateReceiptEntries',
  'canCreatePaymentEntries',
  'canCreateJournalEntries',
];

const DEPENDENCIES = {
  canCreateSaleEntries: [
    'canCreateInventory',
    'canCreateCustomers',
    'canShowCustomers',
  ],
  canCreatePurchaseEntries: [
    'canCreateVendors',
    'canCreateInventory',
    'canShowVendors',
  ],
};

const DEP_VALUES = Object.values(DEPENDENCIES).flat();
const DEP_KEYS = Array.from(new Set(DEP_VALUES));
const VISIBLE_KEYS = [...PRIMARY_CAPS, ...DEP_KEYS];

function ManageUserPermissionsDialog({ open, onClose, user }) {
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // --- API Fetch Logic ---
  const fetchPermissions = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/user-permissions/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const init = {};
        ALL_CAPS.forEach(k => (init[k] = data[k] === true));
        setOverrides(init);
      } else if (res.status === 404) {
        const emptyState = {};
        ALL_CAPS.forEach(k => (emptyState[k] = false));
        setOverrides(emptyState);
      } else {
        throw new Error('Failed to fetch permissions');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not load permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchPermissions();
  }, [open, user?._id]);

  // --- Permission Handlers ---
  const togglePrimary = k => {
    setOverrides(prev => {
      const next = { ...prev };
      const nextVal = !prev[k];
      next[k] = nextVal;
      const deps = DEPENDENCIES[k] || [];
      deps.forEach(d => (next[d] = nextVal));
      return next;
    });
  };

  const togglePermission = k => {
    setOverrides(prev => ({ ...prev, [k]: !prev[k] }));
  };

  const setAllVisible = val => {
    setOverrides(prev => {
      const next = { ...prev };
      VISIBLE_KEYS.forEach(k => (next[k] = val));
      return next;
    });
  };

  // --- Save Logic ---
  const savePermissions = async () => {
    setSaveLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const body = { ...overrides };

      // Enforce hidden rules (Web parity)
      body.canSendInvoiceEmail = false;
      body.canSendInvoiceWhatsapp = false;

      const res = await fetch(`${BASE_URL}/api/user-permissions/${user._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Update failed');

      Alert.alert('Success', 'Permissions updated successfully');
      onClose();
    } catch (e) {
      Alert.alert('Save Failed', e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Permissions: {user?.userName || 'User'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loaderText}>Loading Permissions...</Text>
            </View>
          ) : (
            <>
              <View style={styles.bulkActions}>
                <TouchableOpacity
                  onPress={() => setAllVisible(false)}
                  style={styles.bulkBtn}
                >
                  <Text style={styles.bulkBtnTextRed}>Deny All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAllVisible(true)}
                  style={styles.bulkBtn}
                >
                  <Text style={styles.bulkBtnTextBlue}>Allow All</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scrollArea}>
                <View style={styles.grid}>
                  {PRIMARY_CAPS.map(k => {
                    const isAllowed = overrides[k] === true;
                    const deps = DEPENDENCIES[k] || [];

                    return (
                      <View key={k} style={styles.card}>
                        <View
                          style={[
                            styles.primaryRow,
                            isAllowed && styles.primaryRowActive,
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.primaryLabel}>
                              {CAP_LABELS[k]}
                            </Text>
                            <Text
                              style={[
                                styles.statusTag,
                                { color: isAllowed ? '#10b981' : '#ef4444' },
                              ]}
                            >
                              {isAllowed ? 'ENABLED' : 'DISABLED'}
                            </Text>
                          </View>
                          <Switch
                            value={isAllowed}
                            onValueChange={() => togglePrimary(k)}
                            trackColor={{ false: '#e2e8f0', true: '#bfdbfe' }}
                            thumbColor={isAllowed ? '#2563eb' : '#f1f5f9'}
                          />
                        </View>

                        {isAllowed && deps.length > 0 && (
                          <View style={styles.depBox}>
                            {deps.map(d => (
                              <View key={d} style={styles.depRow}>
                                <Text style={styles.depLabel}>
                                  {CAP_LABELS[d]}
                                </Text>
                                <Switch
                                  value={overrides[d] === true}
                                  onValueChange={() => togglePermission(d)}
                                  scaleX={0.8}
                                  scaleY={0.8} // Slightly smaller for deps
                                />
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={savePermissions}
              disabled={saveLoading}
              style={[styles.saveBtn, saveLoading && { opacity: 0.7 }]}
            >
              {saveLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 15,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', flex: 1 },
  closeBtn: { padding: 4 },
  loaderBox: { padding: 40, alignItems: 'center' },
  loaderText: { marginTop: 12, color: '#64748b' },
  bulkActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    backgroundColor: '#f8fafc',
  },
  bulkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  bulkBtnTextRed: { color: '#ef4444', fontWeight: '600', fontSize: 12 },
  bulkBtnTextBlue: { color: '#2563eb', fontWeight: '600', fontSize: 12 },
  scrollArea: { padding: 12 },
  grid: { gap: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  primaryRowActive: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  primaryLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  statusTag: { fontSize: 10, fontWeight: '800', marginTop: 2 },
  depBox: { padding: 8, backgroundColor: '#fbfcfd' },
  depRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  depLabel: { fontSize: 13, color: '#475569' },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center' },
  cancelText: { color: '#64748b', fontWeight: '600' },
  saveBtn: {
    flex: 2,
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default ManageUserPermissionsDialog;
