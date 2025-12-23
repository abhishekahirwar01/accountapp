'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Pressable,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Phone,
  Hash,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
  Mail,
  Plus,
  X,
} from 'lucide-react-native';
import AdminCompanyForm from '../companies/AdminCompanyForm';
import { BASE_URL } from '../../config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function CompaniesTab({ selectedClientId, selectedClient }) {
  const [companies, setCompanies] = useState([]);
  const [clients, setClients] = useState([]);
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(null);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const getAuthToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');
      return token;
    } catch (error) {
      throw new Error('Authentication token not found.');
    }
  };

  const fetchCompaniesAndClients = useCallback(async clientId => {
    if (!clientId || !isMountedRef.current) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsCompaniesLoading(true);
    try {
      const token = await getAuthToken();
      const [companiesRes, clientsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/companies/by-client/${clientId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal,
        }),
        fetch(`${BASE_URL}/api/clients`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal,
        }),
      ]);

      if (!isMountedRef.current) return;
      if (!companiesRes.ok || !clientsRes.ok)
        throw new Error('Failed to fetch data.');

      const companiesData = await companiesRes.json();
      const clientsData = await clientsRes.json();

      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (error) {
      if (error.name === 'AbortError') return;
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      if (isMountedRef.current) {
        setIsCompaniesLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedClientId) fetchCompaniesAndClients(selectedClientId);
    else setCompanies([]);
  }, [selectedClientId, fetchCompaniesAndClients]);

  const confirmDelete = useCallback(
    async (companyId, businessName) => {
      try {
        const token = await getAuthToken();
        const res = await fetch(`${BASE_URL}/api/companies/${companyId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to delete company.');
        }

        if (isMountedRef.current) {
          Alert.alert('Success', `${businessName} has been deleted.`);
          fetchCompaniesAndClients(selectedClientId);
        }
      } catch (error) {
        Alert.alert('Deletion Failed', error.message);
      }
    },
    [selectedClientId, fetchCompaniesAndClients],
  );

  const handleDelete = useCallback(
    company => {
      setShowActionsMenu(null);
      Alert.alert(
        'Are you sure?',
        `This will permanently delete ${company.businessName}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => confirmDelete(company._id, company.businessName),
          },
        ],
      );
    },
    [confirmDelete],
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompaniesAndClients(selectedClientId);
  };

  const handleAddNew = () => {
    setSelectedCompany(null);
    setIsFormOpen(true);
  };

  const handleEdit = company => {
    setSelectedCompany(company);
    setIsFormOpen(true);
    setShowActionsMenu(null);
  };

  const onFormSubmit = () => {
    setIsFormOpen(false);
    fetchCompaniesAndClients(selectedClientId);
  };

  const renderCompanyCard = ({ item: company }) => {
    const isThisMenuOpen = showActionsMenu === company._id;

    return (
      <View style={[styles.companyCard, { zIndex: isThisMenuOpen ? 2000 : 1 }]}>
        {isThisMenuOpen && (
          <Pressable
            style={styles.cardOverlay}
            onPress={() => setShowActionsMenu(null)}
          />
        )}

        <View style={styles.cardHeader}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{company.businessName}</Text>
            <Text style={styles.businessType}>{company.businessType}</Text>
          </View>

          <View style={{ zIndex: 3000 }}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() =>
                setShowActionsMenu(isThisMenuOpen ? null : company._id)
              }
            >
              <MoreHorizontal size={22} color="#9ca3af" />
            </TouchableOpacity>

            {isThisMenuOpen && (
              <View style={styles.localActionsMenu}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleEdit(company)}
                >
                  <Edit size={16} color="#3b82f6" />
                  <Text style={styles.menuText}>Edit</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleDelete(company)}
                >
                  <Trash2 size={16} color="#ef4444" />
                  <Text style={[styles.menuText, { color: '#ef4444' }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Contact Info with Labels */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Phone size={14} color="#9ca3af" />
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.infoValue}>
              {company.mobileNumber || 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Mail size={14} color="#9ca3af" />
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.infoValue}>{company.emailId || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Identifiers with Labels and Tags */}
        <View style={styles.idSection}>
          <View style={styles.idRow}>
            <Hash size={14} color="#9ca3af" />
            <Text style={styles.label}>Reg No:</Text>
            <View style={[styles.tag, styles.blueTag]}>
              <Text style={styles.tagTextBlue}>
                {company.registrationNumber}
              </Text>
            </View>
          </View>
          <View style={styles.idRow}>
            <FileText size={14} color="#9ca3af" />
            <Text style={styles.label}>GSTIN:</Text>
            <View style={[styles.tag, styles.greenTag]}>
              <Text style={styles.tagTextGreen}>{company.gstin || 'N/A'}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.fixedHeader}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Companies</Text>
            <Text style={styles.description}>
              Companies managed by {selectedClient?.contactName || 'Admin'}.
            </Text>
          </View>
          <TouchableOpacity style={styles.createButton} onPress={handleAddNew}>
            <View style={styles.iconCircle}>
              <Plus size={14} color="#0085ff" strokeWidth={3} />
            </View>
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={companies}
        renderItem={renderCompanyCard}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.companiesList}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.loaderContainer}>
            {isCompaniesLoading ? (
              <ActivityIndicator color="#0085ff" />
            ) : (
              <Text>No companies found.</Text>
            )}
          </View>
        )}
      />

      <Modal
        visible={isFormOpen}
        animationType="slide"
        onRequestClose={() => setIsFormOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedCompany ? 'Edit' : 'New'} Company
            </Text>
            <TouchableOpacity onPress={() => setIsFormOpen(false)}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <AdminCompanyForm
            company={selectedCompany}
            clients={clients}
            onFormSubmit={onFormSubmit}
            onClose={() => setIsFormOpen(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  cardOverlay: {
    position: 'absolute',
    top: -SCREEN_HEIGHT,
    left: -SCREEN_WIDTH,
    width: SCREEN_WIDTH * 2,
    height: SCREEN_HEIGHT * 2,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  fixedHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    zIndex: 5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  description: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  createButton: {
    backgroundColor: '#0085ff',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    elevation: 2,
  },
  iconCircle: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 2,
  },
  createButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  companiesList: { padding: 16 },
  companyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  companyName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  businessType: { fontSize: 14, color: '#9ca3af', marginTop: 2 },
  menuButton: { padding: 4 },

  infoSection: { gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 14, color: '#9ca3af', width: 65 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1f2937' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },

  idSection: { gap: 12 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  blueTag: { backgroundColor: '#eff6ff' },
  greenTag: { backgroundColor: '#f0fdf4' },
  tagTextBlue: { fontSize: 13, fontWeight: '700', color: '#3b82f6' },
  tagTextGreen: { fontSize: 13, fontWeight: '700', color: '#22c55e' },

  localActionsMenu: {
    position: 'absolute',
    top: 35,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 3000,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  menuDivider: { height: 1, backgroundColor: '#f1f5f9' },
  menuText: { fontSize: 14, color: '#334155', fontWeight: '500' },

  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  loaderContainer: { padding: 50, alignItems: 'center' },
});

export default CompaniesTab;
