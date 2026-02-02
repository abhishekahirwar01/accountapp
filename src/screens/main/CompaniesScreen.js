
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompanyForm } from '../../components/companies/CompanyForm';
import {
  PlusCircle,
  Building,
  Edit,
  Trash2,
  User,
  Phone,
  Hash,
  FileText,
  MoreHorizontal,
} from 'lucide-react-native';
import { usePermissions } from '../../contexts/permission-context';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { useCompany } from '../../contexts/company-context';
import { BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLayout from '../../components/layout/AppLayout';

// Memoized Company Card Component
const CompanyCard = React.memo(
  ({ item, permissions, showMenu, onToggleMenu, onEdit, onDelete }) => {
    return (
      <View style={styles.card}>
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <View style={styles.companyInfo}>
            <View style={styles.iconContainer}>
              <Building size={20} color="#007AFF" />
            </View>
            <View style={styles.companyTextContainer}>
              <Text style={styles.businessName} numberOfLines={1}>
                {item.businessName}
              </Text>
              <Text style={styles.businessType} numberOfLines={1}>
                {item.businessType || 'N/A'}
              </Text>
            </View>
          </View>
          {permissions?.canUpdateCompanies && (
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => onToggleMenu(item._id)}
              >
                <MoreHorizontal size={16} color="#666" />
              </TouchableOpacity>

              {/* Dropdown Menu */}
              {showMenu === item._id && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => onEdit(item)}
                  >
                    <Edit size={16} color="#007AFF" />
                    <Text style={styles.menuItemText}>Edit</Text>
                  </TouchableOpacity>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity
                    style={[styles.menuItem, styles.deleteMenuItem]}
                    onPress={() => onDelete(item)}
                  >
                    <Trash2 size={16} color="#FF3B30" />
                    <Text style={[styles.menuItemText, styles.deleteMenuText]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
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
              {item.emailId || 'N/A'}
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
              {item.mobileNumber || 'N/A'}
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
                {item.registrationNumber || 'N/A'}
              </Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>GSTIN</Text>
            {item.gstin ? (
              <View style={[styles.badge, styles.gstBadge]}>
                <FileText size={12} color="#FF9500" />
                <Text
                  style={[styles.badgeText, styles.gstText]}
                  numberOfLines={1}
                >
                  {item.gstin}
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

        {/* Overlay to close menu when clicking outside */}
        {showMenu === item._id && (
          <TouchableOpacity
            style={styles.menuOverlay}
            onPress={() => onToggleMenu(null)}
            activeOpacity={1}
          />
        )}
      </View>
    );
  },
);

CompanyCard.displayName = 'CompanyCard';

const CompaniesScreen = () => {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(null);
  const [clients, setClients] = useState([]);

  const { permissions, refetch, isLoading: isLoadingPerms } = usePermissions();
  const { refetch: refetchUserPermissions } = useUserPermissions();
  const { triggerCompaniesRefresh, refreshTrigger } = useCompany();

  // Use ref to track mounted state
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  
  const fetchCompanies = useCallback(async (signal) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${BASE_URL}/api/companies/my`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal, // Add abort signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch companies.');
      }

      const data = await response.json();
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setCompanies(Array.isArray(data) ? data : data?.data || []);
      }
    } catch (error) {
      if (error.name === 'AbortError') return; // Ignore abort errors
      
      console.error('Error fetching companies:', error);
      if (isMountedRef.current) {
        Alert.alert(
          'Error',
          error.message || 'Failed to load companies. Please try again.',
        );
      }
    }
  }, []);

  //  fetch clients
  const fetchClients = useCallback(async (signal) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${BASE_URL}/api/clients`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        if (isMountedRef.current) {
          setClients(Array.isArray(data) ? data : data?.data || []);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Error fetching clients:', error);
    }
  }, []);

  // Initial data fetch with abort controller
  useEffect(() => {
    const abortController = new AbortController();
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchCompanies(abortController.signal),
          fetchClients(abortController.signal),
        ]);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      abortController.abort();
    };
  }, [fetchCompanies, fetchClients]);

  // Handle refresh trigger
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      const abortController = new AbortController();
      fetchCompanies(abortController.signal);
      return () => abortController.abort();
    }
  }, [refreshTrigger, fetchCompanies]);

  // Orefresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const abortController = new AbortController();
    
    try {
      await Promise.all([
        fetchCompanies(abortController.signal),
        fetchClients(abortController.signal),
        triggerCompaniesRefresh?.(),
        refetch?.(),
        refetchUserPermissions?.(),
      ]);
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }

    return () => abortController.abort();
  }, [
    fetchCompanies,
    fetchClients,
    triggerCompaniesRefresh,
    refetch,
    refetchUserPermissions,
  ]);

  const handleAddNew = useCallback(() => {
    setSelectedCompany(null);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((company) => {
    if (!permissions?.canUpdateCompanies) {
      Alert.alert(
        'Permission Denied',
        "You don't have permission to update companies.",
      );
      return;
    }
    setSelectedCompany(company);
    setIsDialogOpen(true);
    setShowMenu(null);
  }, [permissions?.canUpdateCompanies]);

  const confirmDelete = useCallback(async (company) => {
    if (!company) return;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${BASE_URL}/api/companies/${company._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete company.');
      }

      Alert.alert(
        'Success',
        `${company.businessName} has been deleted successfully.`,
      );

      // Refresh the companies list
      const abortController = new AbortController();
      await fetchCompanies(abortController.signal);
    } catch (error) {
      console.error('Error deleting company:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to delete company. Please try again.',
      );
    }
  }, [fetchCompanies]);

  const handleDelete = useCallback((company) => {
    if (!permissions?.canUpdateCompanies) {
      Alert.alert(
        'Permission Denied',
        "You don't have permission to delete companies.",
      );
      return;
    }
    setShowMenu(null);
    Alert.alert(
      'Delete Company',
      `Are you sure you want to delete ${company.businessName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(company) },
      ],
    );
  }, [permissions?.canUpdateCompanies, confirmDelete]);

  const onFormSubmit = useCallback(() => {
    setIsDialogOpen(false);
    const abortController = new AbortController();
    fetchCompanies(abortController.signal);
  }, [fetchCompanies]);

  const toggleMenu = useCallback((companyId) => {
    setShowMenu(prev => (prev === companyId ? null : companyId));
  }, []);

  // Memoized render functions
  const renderCompanyCard = useCallback(
    ({ item }) => (
      <CompanyCard
        item={item}
        permissions={permissions}
        showMenu={showMenu}
        onToggleMenu={toggleMenu}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    ),
    [permissions, showMenu, toggleMenu, handleEdit, handleDelete],
  );

  const keyExtractor = useCallback((item) => item._id, []);

  const getItemLayout = useCallback(
    (data, index) => ({
      length: 250, // Approximate height of card
      offset: 250 * index,
      index,
    }),
    [],
  );

  const EmptyState = useMemo(
    () => (
      <View style={styles.emptyState}>
        <Building size={48} color="#999" />
        <Text style={styles.emptyTitle}>No Companies Found</Text>
        <Text style={styles.emptyDescription}>
          Get started by adding your first company.
        </Text>
        {permissions?.canCreateCompanies && (
          <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
            <PlusCircle size={16} color="white" />
            <Text style={styles.addButtonText}>Add Company</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [permissions?.canCreateCompanies, handleAddNew],
  );

  // Loading State
  if (isLoading || isLoadingPerms) {
    return (
      <AppLayout>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading companies...</Text>
          </View>
        </SafeAreaView>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Companies</Text>
            <Text style={styles.subtitle}>
              Manage all your business entities
            </Text>
          </View>
          <View style={styles.headerActions}>
            {permissions?.canCreateCompanies && (
              <TouchableOpacity
                style={styles.addCompanyButton}
                onPress={handleAddNew}
              >
                <PlusCircle size={16} color="white" />
                <Text style={styles.addCompanyButtonText}>Add Company</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        {companies.length > 0 ? (
          <View style={styles.content}>
            <FlatList
              data={companies}
              keyExtractor={keyExtractor}
              renderItem={renderCompanyCard}
              getItemLayout={getItemLayout}
              numColumns={1}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={[
                styles.listContent,
                styles.cardListContent,
              ]}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={10}
              windowSize={10}
            />
          </View>
        ) : (
          EmptyState
        )}

        {/* Company Form Modal */}
        <Modal
          visible={isDialogOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsDialogOpen(false)}
        >
          <View style={{ flex: 1 }}>
            <CompanyForm
              company={selectedCompany || undefined}
              clients={clients}
              onFormSubmit={onFormSubmit}
              onCancel={() => setIsDialogOpen(false)}
            />
          </View>
        </Modal>
      </View>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 13,
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
    backgroundColor: '#007AFF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  addCompanyButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  cardListContent: {},
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
    color: '#1a1a1a',
  },
  businessType: {
    fontSize: 12,
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
    top: 35,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 120,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
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
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
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
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 14,
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
    fontSize: 12,
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
    fontSize: 12,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default CompaniesScreen;