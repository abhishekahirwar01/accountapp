import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Pressable,
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
  PlusCircle,
  X,
} from 'lucide-react-native';
import AdminCompanyForm from '../companies/AdminCompanyForm';
import { BASE_URL } from '../../config';

export function CompaniesTab({ selectedClientId, selectedClient }) {
  const [companies, setCompanies] = useState([]);
  const [clients, setClients] = useState([]);
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(null);

  // Use refs to prevent memory leaks
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const getAuthToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found.');
      }
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      throw new Error('Authentication token not found.');
    }
  };

  const fetchCompaniesAndClients = useCallback(async clientId => {
    if (!clientId || !isMountedRef.current) return;

    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

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

      // Check if component is still mounted
      if (!isMountedRef.current) return;

      if (!companiesRes.ok || !clientsRes.ok) {
        throw new Error('Failed to fetch data.');
      }

      const companiesData = await companiesRes.json();
      const clientsData = await clientsRes.json();

      // Safe state updates
      if (isMountedRef.current) {
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        setClients(Array.isArray(clientsData) ? clientsData : []);
      }
    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }

      console.error('Error fetching data:', error);
      if (isMountedRef.current) {
        Alert.alert(
          'Failed to load data',
          error.message || 'Something went wrong.',
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsCompaniesLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchCompaniesAndClients(selectedClientId);
    } else {
      // Reset companies if no client selected
      setCompanies([]);
    }
  }, [selectedClientId, fetchCompaniesAndClients]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCompaniesAndClients(selectedClientId);
  }, [selectedClientId, fetchCompaniesAndClients]);

  const handleAddNew = useCallback(() => {
    setSelectedCompany(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback(company => {
    setSelectedCompany(company);
    setIsFormOpen(true);
    setShowActionsMenu(null);
  }, []);

  const handleDelete = useCallback(company => {
    setCompanyToDelete(company);
    setIsAlertOpen(true);
    setShowActionsMenu(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!companyToDelete) return;

    try {
      const token = await getAuthToken();
      const res = await fetch(
        `${BASE_URL}/api/companies/${companyToDelete._id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete company.');
      }

      if (isMountedRef.current) {
        Alert.alert(
          'Company Deleted',
          `${companyToDelete.businessName} has been successfully deleted.`,
        );

        // Refresh the companies list
        fetchCompaniesAndClients(selectedClientId);
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      if (isMountedRef.current) {
        Alert.alert(
          'Deletion Failed',
          error.message || 'Something went wrong.',
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsAlertOpen(false);
        setCompanyToDelete(null);
      }
    }
  }, [companyToDelete, selectedClientId, fetchCompaniesAndClients]);

  const onFormSubmit = useCallback(() => {
    setIsFormOpen(false);
    setSelectedCompany(null);
    // Refresh the companies list after form submission
    fetchCompaniesAndClients(selectedClientId);
  }, [selectedClientId, fetchCompaniesAndClients]);

  const closeActionsMenu = useCallback(() => {
    if (showActionsMenu) {
      setShowActionsMenu(null);
    }
  }, [showActionsMenu]);

  const handleModalClose = useCallback(() => {
    setIsFormOpen(false);
    setSelectedCompany(null);
  }, []);

  const handleAlertClose = useCallback(() => {
    setIsAlertOpen(false);
    setCompanyToDelete(null);
  }, []);

  // Safe data rendering functions
  const getSafeCompanyName = company => {
    return company?.businessName || 'Unnamed Company';
  };

  const getSafeBusinessType = company => {
    return company?.businessType || 'N/A';
  };

  const getSafeMobileNumber = company => {
    return company?.mobileNumber || 'N/A';
  };

  const getSafeEmail = company => {
    return company?.emailId || 'N/A';
  };

  const getSafeRegistrationNumber = company => {
    return company?.registrationNumber || 'N/A';
  };

  const getSafeGSTIN = company => {
    return company?.gstin || 'N/A';
  };

  const renderCompanyCard = useCallback(
    ({ item: company }) => (
      <View style={styles.companyCard}>
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName} numberOfLines={2}>
              {getSafeCompanyName(company)}
            </Text>
            <Text style={styles.businessType}>
              {getSafeBusinessType(company)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() =>
              setShowActionsMenu(
                showActionsMenu === company._id ? null : company._id,
              )
            }
          >
            <MoreHorizontal size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Actions Menu */}
        {showActionsMenu === company._id && (
          <View style={styles.actionsMenu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleEdit(company)}
            >
              <Edit size={16} color="#3b82f6" />
              <Text style={styles.menuText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleDelete(company)}
            >
              <Trash2 size={16} color="#ef4444" />
              <Text style={[styles.menuText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <View style={styles.contactItem}>
            <View style={styles.contactLabel}>
              <Phone size={16} color="#666" />
              <Text style={styles.labelText}>Phone:</Text>
            </View>
            <Text style={styles.contactValue} numberOfLines={1}>
              {getSafeMobileNumber(company)}
            </Text>
          </View>

          <View style={styles.contactItem}>
            <View style={styles.contactLabel}>
              <Mail size={16} color="#666" />
              <Text style={styles.labelText}>Email:</Text>
            </View>
            <Text style={styles.contactValue} numberOfLines={1}>
              {getSafeEmail(company)}
            </Text>
          </View>
        </View>

        {/* Identifiers */}
        <View style={styles.identifiersSection}>
          <View style={styles.identifierItem}>
            <View style={styles.identifierLabel}>
              <Hash size={16} color="#666" />
              <Text style={styles.labelText}>Reg No:</Text>
            </View>
            <View style={[styles.tag, styles.blueTag]}>
              <Text style={styles.tagText} numberOfLines={1}>
                {getSafeRegistrationNumber(company)}
              </Text>
            </View>
          </View>

          <View style={styles.identifierItem}>
            <View style={styles.identifierLabel}>
              <FileText size={16} color="#666" />
              <Text style={styles.labelText}>GSTIN:</Text>
            </View>
            <View style={[styles.tag, styles.greenTag]}>
              <Text style={styles.tagText} numberOfLines={1}>
                {getSafeGSTIN(company)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    ),
    [showActionsMenu, handleEdit, handleDelete],
  );

  const keyExtractor = useCallback(
    item => item._id || Math.random().toString(),
    [],
  );

  const ListEmptyComponent = useCallback(
    () => (
      <View style={[styles.emptyState, styles.listEmptyContainer]}>
        {isCompaniesLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading companies...</Text>
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No companies found for this client.
          </Text>
        )}
      </View>
    ),
    [isCompaniesLoading],
  );

  return (
    <View style={styles.container}>
      {/* 1. FIXED HEADER VIEW */}
      <View style={styles.fixedHeader}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Companies</Text>
            <Text style={styles.description}>
              Companies managed by {selectedClient?.contactName || 'Client'}.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleAddNew}
            disabled={isCompaniesLoading}
          >
            <PlusCircle size={20} color="#fff" />
            <Text style={styles.createButtonText}>Create Company</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. OVERLAY for Action Menu */}
      {showActionsMenu && (
        <Pressable style={styles.overlay} onPress={closeActionsMenu} />
      )}

      {/* 3. SCROLLABLE FLATLIST */}
      <FlatList
        data={companies}
        renderItem={renderCompanyCard}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.companiesList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={<View style={styles.spacer} />}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
      />

      {/* Modals */}
      <Modal
        visible={isFormOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTextContainer}>
              <Text style={styles.modalTitle}>
                {selectedCompany ? 'Edit Company' : 'Create New Company'}
              </Text>
              <Text style={styles.modalDescription}>
                {selectedCompany
                  ? `Update the details for ${getSafeCompanyName(
                      selectedCompany,
                    )}.`
                  : `Fill in the form to create a new company for ${
                      selectedClient?.contactName || 'the client'
                    }.`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleModalClose}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <AdminCompanyForm
            company={selectedCompany || undefined}
            clients={clients}
            onFormSubmit={onFormSubmit}
            onClose={handleModalClose}
          />
        </View>
      </Modal>

      <Modal
        visible={isAlertOpen}
        transparent
        animationType="fade"
        onRequestClose={handleAlertClose}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Are you absolutely sure?</Text>
            <Text style={styles.alertDescription}>
              This action cannot be undone. This will permanently delete the
              company and all associated data for{' '}
              {companyToDelete
                ? getSafeCompanyName(companyToDelete)
                : 'this company'}
              .
            </Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={[styles.alertButton, styles.cancelButton]}
                onPress={handleAlertClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertButton, styles.confirmButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  fixedHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    zIndex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 9,
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  companiesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
  },
  listEmptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  companyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyInfo: {
    flex: 1,
    marginRight: 8,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  businessType: {
    fontSize: 14,
    color: '#6b7280',
  },
  menuButton: {
    padding: 4,
  },
  actionsMenu: {
    position: 'absolute',
    top: 40,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
    minWidth: 120,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  menuText: {
    fontSize: 14,
    color: '#374151',
  },
  deleteText: {
    color: '#ef4444',
  },
  contactSection: {
    gap: 8,
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 80,
  },
  labelText: {
    fontSize: 14,
    color: '#6b7280',
  },
  contactValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
  },
  identifiersSection: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  identifierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  identifierLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 80,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flex: 1,
  },
  blueTag: {
    backgroundColor: '#dbeafe',
  },
  greenTag: {
    backgroundColor: '#dcfce7',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  spacer: {
    height: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  alertDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  alertButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  confirmButton: {
    backgroundColor: '#ef4444',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default CompaniesTab;
