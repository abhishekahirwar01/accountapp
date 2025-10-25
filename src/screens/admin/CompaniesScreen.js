import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BASE_URL } from '../../config';

// Import your custom components
import AdminCompanyForm from '../../components/companies/AdminCompanyForm';
import CompanyCard from '../../components/companies/CompanyCard';

// Custom UI Components
const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const Badge = ({ children, variant = 'secondary', style }) => (
  <View
    style={[
      styles.badge,
      styles[`badge${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
      style,
    ]}
  >
    <Text style={styles.badgeText}>{children}</Text>
  </View>
);

const Button = ({ 
  children,
  onPress,
  variant = 'default',
  size = 'default',
  style,
  disabled,
  icon,
  ...props
}) => (
  <TouchableOpacity
    style={[
      styles.button,
      styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
      styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`],
      disabled && styles.buttonDisabled,
      style,
    ]}
    onPress={onPress}
    disabled={disabled}
    {...props}
  >
    {icon && (
      <Icon
        name={icon}
        size={16}
        color={variant === 'outline' ? '#2563eb' : '#fff'}
        style={styles.buttonIcon}
      />
    )}
    <Text
      style={[
        styles.buttonText,
        styles[
          `buttonText${variant.charAt(0).toUpperCase() + variant.slice(1)}`
        ],
      ]}
    >
      {children}
    </Text>
  </TouchableOpacity>
);

const Dialog = ({ visible, onClose, title, description, children }) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent={true}
    onRequestClose={onClose}
    statusBarTranslucent={true}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.dialogContent}>
        <View style={styles.dialogHeader}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogDescription}>{description}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <View style={styles.dialogBody}>{children}</View>
      </View>
    </View>
  </Modal>
);

const AlertDialog = ({ visible, onClose, title, description, onConfirm }) => (
  <Modal
    visible={visible}
    animationType="fade"
    transparent={true}
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.alertDialogContent}>
        <Text style={styles.alertDialogTitle}>{title}</Text>
        <Text style={styles.alertDialogDescription}>{description}</Text>
        <View style={styles.alertDialogActions}>
          <Button
            variant="outline"
            onPress={onClose}
            style={styles.alertDialogButton}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onPress={onConfirm}
            style={styles.alertDialogButton}
          >
            Continue
          </Button>
        </View>
      </View>
    </View>
  </Modal>
);

// Company List Item Component for list view
const CompanyListItem = ({ company, clientName, onEdit, onDelete }) => {
  return (
    <Card style={styles.listItem}>
      <View style={styles.listItemContent}>
        <View style={styles.listItemMain}>
          <View style={styles.listItemHeader}>
            <Text style={styles.listCompanyName} numberOfLines={1}>
              {company.businessName}
            </Text>
            <Badge>Client</Badge>
          </View>

          <Text style={styles.listBusinessType}>{company.businessType}</Text>

          <View style={styles.listInfoRow}>
            <View style={styles.listInfoItem}>
              <Icon name="account" size={14} color="#6b7280" />
              <Text style={styles.listInfoText} numberOfLines={1}>
                {clientName}
              </Text>
            </View>

            <View style={styles.listInfoItem}>
              <Icon name="phone" size={14} color="#16a34a" />
              <Text style={styles.listInfoText}>{company.mobileNumber}</Text>
            </View>
          </View>

          <View style={styles.listIdentifiers}>
            <View style={styles.listIdentifier}>
              <Icon name="identifier" size={12} color="#7c3aed" />
              <Text style={styles.listIdentifierText} numberOfLines={1}>
                {company.registrationNumber}
              </Text>
            </View>
            <View style={styles.listIdentifier}>
              <Icon name="file-document" size={12} color="#ea580c" />
              <Text style={styles.listIdentifierText} numberOfLines={1}>
                {company.gstin || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.listItemActions}>
          <TouchableOpacity
            style={[styles.listActionButton, styles.editButton]}
            onPress={onEdit}
          >
            <Icon name="pencil" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.listActionButton, styles.deleteButton]}
            onPress={onDelete}
          >
            <Icon name="trash-can" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
};

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
  const [role, setRole] = useState(null);

  // Check if user is master admin
  // useEffect(() => {
  //   const checkRole = async () => {
  //     const userRole = await AsyncStorage.getItem('role');
  //     setRole(userRole);
  //   };
  //   checkRole();
  // }, []);

  // if (role !== "masterAdmin") {
  //   return (
  //     <SafeAreaView style={styles.accessDeniedContainer}>
  //       <View style={styles.accessDeniedContent}>
  //         <Text style={styles.accessDeniedTitle}>Access Denied</Text>
  //         <Text style={styles.accessDeniedDescription}>
  //           You don't have permission to access this page. Only master admins can manage all companies.
  //         </Text>
  //       </View>
  //     </SafeAreaView>
  //   );
  // }

  const fetchAllData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const [companiesRes, clientsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/companies/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/api/clients`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!companiesRes.ok || !clientsRes.ok) {
        const errorData = !companiesRes.ok
          ? await companiesRes.json()
          : await clientsRes.json();
        throw new Error(errorData.message || 'Failed to fetch data.');
      }

      const companiesData = await companiesRes.json();
      const clientsData = await clientsRes.json();

      setCompanies(companiesData.reverse());
      setClients(clientsData);
    } catch (error) {
      Alert.alert(
        'Failed to load data',
        error instanceof Error ? error.message : 'Something went wrong.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAllData();
  };

  const handleAddNew = () => {
    setSelectedCompany(null);
    setIsDialogOpen(true);
  };

  const handleEdit = company => {
    setSelectedCompany(company);
    setIsDialogOpen(true);
  };

  const handleDelete = company => {
    setCompanyToDelete(company);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(
        `${BASE_URL}/api/companies/${companyToDelete._id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete company.');
      }

      Alert.alert(
        'Company Deleted',
        `${companyToDelete.businessName} has been successfully deleted.`,
      );
      fetchAllData();
    } catch (error) {
      Alert.alert(
        'Deletion Failed',
        error instanceof Error ? error.message : 'Something went wrong.',
      );
    } finally {
      setIsAlertOpen(false);
      setCompanyToDelete(null);
    }
  };

  const onFormSubmit = () => {
    setIsDialogOpen(false);
    fetchAllData();
  };

  const getClientInfo = clientIdentifier => {
    if (!clientIdentifier) return { name: 'N/A', email: 'N/A' };

    let clientId;
    if (
      typeof clientIdentifier === 'object' &&
      clientIdentifier !== null &&
      clientIdentifier.contactName
    ) {
      return {
        name: clientIdentifier.contactName,
        email: clientIdentifier.email || 'N/A',
      };
    } else if (
      typeof clientIdentifier === 'object' &&
      clientIdentifier !== null &&
      clientIdentifier._id
    ) {
      clientId = clientIdentifier._id;
    } else {
      clientId = String(clientIdentifier);
    }

    const client = clients.find(c => String(c._id) === clientId);
    return {
      name: client?.contactName || 'N/A',
      email: client?.email || 'N/A',
    };
  };

  const renderEmptyState = () => (
    <Card style={styles.emptyStateCard}>
      <Icon name="office-building" size={48} color="#9ca3af" />
      <Text style={styles.emptyStateTitle}>No Companies Found</Text>
      <Text style={styles.emptyStateDescription}>
        Get started by creating the first company.
      </Text>
      <Button
        onPress={handleAddNew}
        style={styles.emptyStateButton}
        icon="plus-circle"
      >
        Create Company
      </Button>
    </Card>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.title}>Company Management</Text>
        <Text style={styles.subtitle}>
          Manage all companies across all clients.
        </Text>
      </View>

      <View style={styles.headerActions}>
        {/* View mode toggle - hidden on small screens if not needed */}
        {/* <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              viewMode === 'card' && styles.viewToggleButtonActive
            ]}
            onPress={() => setViewMode('card')}
          >
            <Icon 
              name="view-grid" 
              size={16} 
              color={viewMode === 'card' ? '#fff' : '#6b7280'} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              viewMode === 'list' && styles.viewToggleButtonActive
            ]}
            onPress={() => setViewMode('list')}
          >
            <Icon 
              name="view-list" 
              size={16} 
              color={viewMode === 'list' ? '#fff' : '#6b7280'} 
            />
          </TouchableOpacity>
        </View> */}

        <Button onPress={handleAddNew} size="sm" icon="plus-circle">
          Create Company
        </Button>
      </View>
    </View>
  );

  const renderCompanyItem = ({ item: company }) => {
    const clientInfo = getClientInfo(company.selectedClient || company.client);

    if (viewMode === 'card') {
      return (
        <CompanyCard
          company={company}
          clientName={clientInfo.name}
          onEdit={() => handleEdit(company)}
          onDelete={() => handleDelete(company)}
        />
      );
    }

    return (
      <CompanyListItem
        company={company}
        clientName={clientInfo.name}
        onEdit={() => handleEdit(company)}
        onDelete={() => handleDelete(company)}
      />
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading companies...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {companies.length === 0 ? (
          renderEmptyState()
        ) : (
          <View
            style={viewMode === 'card' ? styles.cardGrid : styles.listContainer}
          >
            <FlatList
              data={companies}
              renderItem={renderCompanyItem}
              keyExtractor={item => item._id}
              scrollEnabled={false}
              contentContainerStyle={styles.flatListContent}
              key={viewMode}
            />
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Company Dialog */}
      <Dialog
        visible={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={selectedCompany ? 'Edit Company' : 'Create New Company'}
        description={
          selectedCompany
            ? `Update the details for ${selectedCompany.businessName}.`
            : 'Fill in the form to create a new company for a client.'
        }
      >
        <AdminCompanyForm
          company={selectedCompany || undefined}
          clients={clients}
          onFormSubmit={onFormSubmit}
        />
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        visible={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        title="Are you absolutely sure?"
        description={`This action cannot be undone. This will permanently delete the company and all associated data for ${companyToDelete?.businessName}.`}
        onConfirm={confirmDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  // Access Denied Styles
  accessDeniedContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  accessDeniedContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 400,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  accessDeniedDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // View Toggle Styles
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  viewToggleButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: '#4f46e5',
  },
  cardGrid: {
    padding: 16,
    gap: 16,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  flatListContent: {
    gap: 12,
  },

  // Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  // List Item Styles
  listItem: {
    marginBottom: 12,
  },
  listItemContent: {
    flexDirection: 'row',
    padding: 16,
  },
  listItemMain: {
    flex: 1,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listCompanyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  listBusinessType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  listInfoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  listInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  listInfoText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  listIdentifiers: {
    flexDirection: 'row',
    gap: 12,
  },
  listIdentifier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  listIdentifierText: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'monospace',
    flex: 1,
  },
  listItemActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  listActionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },

  // Badge Styles
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeSecondary: {
    backgroundColor: '#f3f4f6',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },

  // Button Styles
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonDefault: {
    backgroundColor: '#4f46e5',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  buttonDestructive: {
    backgroundColor: '#ef4444',
  },
  buttonSm: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  buttonTextOutline: {
    color: '#374151',
  },
  buttonTextDestructive: {
    color: '#fff',
  },

  // Modal & Dialog Styles - UPDATED FOR FORM DISPLAY
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  dialogContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '95%',
    height: '90%',
    overflow: 'hidden',
  },
  dialogHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  dialogDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  dialogBody: {
    flex: 1,
    backgroundColor: '#fff',
  },
  alertDialogContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  alertDialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  alertDialogDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  alertDialogActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  alertDialogButton: {
    minWidth: 80,
  },

  // Empty State Styles
  emptyStateCard: {
    alignItems: 'center',
    padding: 48,
    margin: 16,
    backgroundColor: '#fff',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
});
