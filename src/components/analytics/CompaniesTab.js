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
  Building,
  User,
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
        'Delete Company',
        `Are you sure you want to delete ${company.businessName}? This action cannot be undone.`,
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
      <View style={[styles.card, { zIndex: isThisMenuOpen ? 2000 : 1 }]}>
        {/* Overlay to close menu when clicking outside */}
        {isThisMenuOpen && (
          <Pressable
            style={styles.cardOverlay}
            onPress={() => setShowActionsMenu(null)}
          />
        )}

        {/* Header Section */}
        <View style={styles.cardHeader}>
          <View style={styles.companyInfo}>
            <View style={styles.iconContainer}>
              <Building size={17} color="#a090fc" />
            </View>
            <View style={styles.companyTextContainer}>
              <Text style={styles.businessName} numberOfLines={1}>
                {company.businessName}
              </Text>
              <Text style={styles.businessType} numberOfLines={1}>
                {company.businessType || 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() =>
                setShowActionsMenu(isThisMenuOpen ? null : company._id)
              }
            >
              <MoreHorizontal size={16} color="#666" />
            </TouchableOpacity>

            {/* Dropdown Menu */}
            {isThisMenuOpen && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleEdit(company)}
                >
                  <Edit size={16} color="#007AFF" />
                  <Text style={styles.menuItemText}>Edit</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={[styles.menuItem, styles.deleteMenuItem]}
                  onPress={() => handleDelete(company)}
                >
                  <Trash2 size={16} color="#FF3B30" />
                  <Text style={[styles.menuItemText, styles.deleteMenuText]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <View style={styles.contactItem}>
            <View
              style={[
                styles.contactIcon,
                { backgroundColor: 'rgba(0, 122, 255, 0.1)' },
              ]}
            >
              <User size={12} color="#007AFF" />
            </View>
            <Text style={styles.contactText} numberOfLines={1}>
              {company.emailId || 'N/A'}
            </Text>
          </View>
          <View style={styles.contactItem}>
            <View
              style={[
                styles.contactIcon,
                { backgroundColor: 'rgba(52, 199, 89, 0.1)' },
              ]}
            >
              <Phone size={12} color="#34C759" />
            </View>
            <Text style={styles.contactText} numberOfLines={1}>
              {company.mobileNumber || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Registration & GST Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Registration No.</Text>
            <View style={styles.badge}>
              <Hash size={12} color="#666" />
              <Text style={styles.badgeText} numberOfLines={1}>
                {company.registrationNumber || 'N/A'}
              </Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>GSTIN</Text>
            {company.gstin ? (
              <View style={[styles.badge, styles.gstBadge]}>
                <FileText size={12} color="#FF9500" />
                <Text
                  style={[styles.badgeText, styles.gstText]}
                  numberOfLines={1}
                >
                  {company.gstin}
                </Text>
              </View>
            ) : (
              <Text style={styles.naText}>N/A</Text>
            )}
          </View>
        </View>

        {/* Status Indicator */}
        <View style={styles.cardFooter}>
          <View style={styles.statusIndicator}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Companies</Text>
          <Text style={styles.subtitle}>
            Companies managed by {selectedClient?.contactName || 'Admin'}.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addCompanyButton}
            onPress={handleAddNew}
          >
            <Plus size={16} color="white" strokeWidth={3} />
            <Text style={styles.addCompanyButtonText}>Add Company</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={companies}
        renderItem={renderCompanyCard}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            {isCompaniesLoading ? (
              <>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading companies...</Text>
              </>
            ) : (
              <>
                <Building size={48} color="#999" />
                <Text style={styles.emptyTitle}>No Companies Found</Text>
                <Text style={styles.emptyDescription}>
                  Get started by adding your first company.
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddButton}
                  onPress={handleAddNew}
                >
                  <Plus size={16} color="white" />
                  <Text style={styles.emptyAddButtonText}>Add Company</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      />

      {/* Company Form Modal */}
      <Modal
        visible={isFormOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsFormOpen(false)}
      >
        <View style={{ flex: 1 }}>
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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  cardOverlay: {
    position: 'absolute',
    top: -SCREEN_HEIGHT,
    left: -SCREEN_WIDTH,
    width: SCREEN_WIDTH * 2,
    height: SCREEN_HEIGHT * 2,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 10,
    paddingTop: 4,
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 9,
  },
  addCompanyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b77ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    elevation: 4,
    shadowColor: '#8b77ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  addCompanyButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },
  listContent: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  companyTextContainer: {
    flex: 1,
  },
  iconContainer: {
    padding: 8,
    backgroundColor: '#e9e5fd7c',
    borderRadius: 8,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    color: '#1a1a1a',
  },
  businessType: {
    fontSize: 10,
    color: '#666',
  },
  menuContainer: {
    position: 'relative',
  },
  menuButton: {
    padding: 8,
    borderRadius: 4,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 22,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 80,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
  },
  menuItemText: {
    fontSize: 12,
    color: '#333',
  },
  deleteMenuItem: {},
  deleteMenuText: {
    color: '#FF3B30',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 8,
  },
  contactSection: {
    gap: 8,
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactIcon: {
    padding: 4,
    borderRadius: 4,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  detailsSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  badgeText: {
    fontSize: 10,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  gstBadge: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  gstText: {
    color: '#FF9500',
  },
  naText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  statusText: {
    fontSize: 10,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#1a1a1a',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  emptyAddButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
});

export default CompaniesTab;