// CompaniesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
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
  List,
  LayoutGrid,
  User,
  Phone,
  Hash,
  FileText,
  MoreHorizontal,
} from 'lucide-react-native';

// Hardcoded permissions - replace with your actual permission logic
const usePermissions = () => {
  // Always return the same structure - don't conditionally call hooks
  const [permissions] = useState({
    canCreateUsers: true,
    canCreateProducts: true,
    canCreateCustomers: true,
    canCreateVendors: true,
    canCreateCompanies: true,
    canCreateInventory: true,
    canUpdateCompanies: true,
    canSendInvoiceEmail: true,
    canSendInvoiceWhatsapp: true,
    maxCompanies: 10,
    maxUsers: 5,
    maxInventories: 20,
  });

  const [isLoading] = useState(false);

  const refetch = React.useCallback(() => {
    console.log('Refetch permissions');
  }, []);

  return {
    permissions,
    isLoading,
    refetch,
  };
};

// Hardcoded clients data
const hardcodedClients = [
  { _id: '1', contactName: 'John Doe', email: 'john@example.com' },
  { _id: '2', contactName: 'Jane Smith', email: 'jane@example.com' },
  { _id: '3', contactName: 'Mike Johnson', email: 'mike@example.com' },
];

const CompaniesScreen = () => {
  // All hooks must be called in the same order every time
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('card');
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(null); // Track which company's menu is open

  // Custom hook must be called unconditionally at the top level
  const { permissions } = usePermissions();

  // Mock data since we're not connecting to backend
  const mockCompanies = [
    {
      _id: '1',
      businessName: 'Tech Solutions Inc',
      businessType: 'Technology',
      emailId: 'contact@techsolutions.com',
      mobileNumber: '+1-555-0123',
      registrationNumber: 'REG001',
      gstin: 'GSTIN001',
    },
    {
      _id: '2',
      businessName: 'Global Trading Co',
      businessType: 'Trading',
      emailId: 'info@globaltrading.com',
      mobileNumber: '+1-555-0124',
      registrationNumber: 'REG002',
      gstin: 'GSTIN002',
    },
    {
      _id: '3',
      businessName: 'Retail Ventures Ltd',
      businessType: 'Retail',
      emailId: 'support@retailventures.com',
      mobileNumber: '+1-555-0125',
      registrationNumber: 'REG003',
      gstin: null,
    },
  ];

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCompanies(mockCompanies);
    } catch (error) {
      Alert.alert('Error', 'Failed to load companies');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompanies();
  };

  const handleAddNew = () => {
    setSelectedCompany(null);
    setIsDialogOpen(true);
  };

  const handleEdit = company => {
    if (!permissions?.canUpdateCompanies) {
      Alert.alert(
        'Permission Denied',
        "You don't have permission to update companies.",
      );
      return;
    }
    setSelectedCompany(company);
    setIsDialogOpen(true);
    setShowMenu(null); // Close menu
  };

  const handleDelete = company => {
    if (!permissions?.canUpdateCompanies) {
      Alert.alert(
        'Permission Denied',
        "You don't have permission to delete companies.",
      );
      return;
    }
    setCompanyToDelete(company);
    setShowMenu(null); // Close menu
    Alert.alert(
      'Delete Company',
      `Are you sure you want to delete ${company.businessName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ],
    );
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;
    try {
      // Simulate delete operation
      await new Promise(resolve => setTimeout(resolve, 500));
      setCompanies(prev =>
        prev.filter(company => company._id !== companyToDelete._id),
      );
      Alert.alert(
        'Success',
        `${companyToDelete.businessName} has been deleted successfully.`,
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to delete company');
    } finally {
      setCompanyToDelete(null);
    }
  };

  const onFormSubmit = () => {
    setIsDialogOpen(false);
    fetchCompanies();
  };

  const toggleMenu = companyId => {
    setShowMenu(showMenu === companyId ? null : companyId);
  };

  const renderCompanyCard = ({ item }) => (
    <View style={styles.card}>
      {/* Header Section */}
      <View style={styles.cardHeader}>
        <View style={styles.companyInfo}>
          <View style={styles.iconContainer}>
            <Building size={20} color="#007AFF" />
          </View>
          <View>
            <Text style={styles.businessName}>{item.businessName}</Text>
            <Text style={styles.businessType}>{item.businessType}</Text>
          </View>
        </View>
        {permissions?.canUpdateCompanies && (
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => toggleMenu(item._id)}
            >
              <MoreHorizontal size={16} color="#666" />
            </TouchableOpacity>

            {/* Dropdown Menu */}
            {showMenu === item._id && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleEdit(item)}
                >
                  <Edit size={16} color="#007AFF" />
                  <Text style={styles.menuItemText}>Edit</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={[styles.menuItem, styles.deleteMenuItem]}
                  onPress={() => handleDelete(item)}
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
          <Text style={styles.contactText}>{item.emailId}</Text>
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
          <Text style={styles.contactText}>{item.mobileNumber}</Text>
        </View>
      </View>

      {/* Registration & GST Details */}
      <View style={styles.detailsSection}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Registration No.</Text>
          <View style={styles.badge}>
            <Hash size={12} color="#666" />
            <Text style={styles.badgeText}>{item.registrationNumber}</Text>
          </View>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>GSTIN</Text>
          {item.gstin ? (
            <View style={[styles.badge, styles.gstBadge]}>
              <FileText size={12} color="#FF9500" />
              <Text style={[styles.badgeText, styles.gstText]}>
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
          onPress={() => setShowMenu(null)}
        />
      )}
    </View>
  );

  const renderCompanyRow = ({ item }) => (
    <View style={styles.tableRow}>
      <View style={styles.tableCell}>
        <View style={styles.companyInfo}>
          <View style={styles.iconContainer}>
            <Building size={20} color="#007AFF" />
          </View>
          <View>
            <Text style={styles.businessName}>{item.businessName}</Text>
            <Text style={styles.businessType}>{item.businessType}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tableCell}>
        <View style={styles.contactItem}>
          <View
            style={[
              styles.contactIcon,
              { backgroundColor: 'rgba(0, 122, 255, 0.1)' },
            ]}
          >
            <User size={12} color="#007AFF" />
          </View>
          <Text style={styles.contactText}>{item.emailId}</Text>
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
          <Text style={styles.contactText}>{item.mobileNumber}</Text>
        </View>
      </View>

      <View style={styles.tableCell}>
        <View style={styles.badge}>
          <Hash size={12} color="#666" />
          <Text style={styles.badgeText}>{item.registrationNumber}</Text>
        </View>
      </View>

      <View style={styles.tableCell}>
        {item.gstin ? (
          <View style={[styles.badge, styles.gstBadge]}>
            <FileText size={12} color="#FF9500" />
            <Text style={[styles.badgeText, styles.gstText]}>{item.gstin}</Text>
          </View>
        ) : (
          <Text style={styles.naText}>N/A</Text>
        )}
      </View>

      {permissions?.canUpdateCompanies && (
        <View style={[styles.tableCell, styles.actionsCell]}>
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => toggleMenu(item._id)}
            >
              <MoreHorizontal size={16} color="#666" />
            </TouchableOpacity>

            {/* Dropdown Menu for Table View */}
            {showMenu === item._id && (
              <View style={[styles.dropdownMenu, styles.tableDropdownMenu]}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleEdit(item)}
                >
                  <Edit size={16} color="#007AFF" />
                  <Text style={styles.menuItemText}>Edit</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={[styles.menuItem, styles.deleteMenuItem]}
                  onPress={() => handleDelete(item)}
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
      )}

      {/* Overlay to close menu when clicking outside (for table view) */}
      {showMenu === item._id && (
        <TouchableOpacity
          style={styles.menuOverlay}
          onPress={() => setShowMenu(null)}
        />
      )}
    </View>
  );

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Company</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Contact</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Reg No.</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>GSTIN</Text>
      </View>
      {permissions?.canUpdateCompanies && (
        <View style={styles.tableHeaderCell}>
          <Text style={styles.tableHeaderText}>Actions</Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
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
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Companies</Text>
            <Text style={styles.subtitle}>
              Manage all your business entities in one place.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  viewMode === 'card' && styles.toggleButtonActive,
                ]}
                onPress={() => setViewMode('card')}
              >
                <LayoutGrid
                  size={16}
                  color={viewMode === 'card' ? 'white' : '#666'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  viewMode === 'list' && styles.toggleButtonActive,
                ]}
                onPress={() => setViewMode('list')}
              >
                <List
                  size={16}
                  color={viewMode === 'list' ? 'white' : '#666'}
                />
              </TouchableOpacity>
            </View>
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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading companies...</Text>
          </View>
        ) : companies.length > 0 ? (
          <View style={styles.content}>
            {viewMode === 'list' && renderTableHeader()}
            <FlatList
              data={companies}
              key={viewMode}
              keyExtractor={item => item._id}
              renderItem={
                viewMode === 'card' ? renderCompanyCard : renderCompanyRow
              }
              numColumns={viewMode === 'card' ? 1 : undefined}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={[
                styles.listContent,
                viewMode === 'card' && styles.cardListContent,
              ]}
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : (
          renderEmptyState()
        )}

        {/* Company Form Modal */}
        <Modal
          visible={isDialogOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsDialogOpen(false)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedCompany ? 'Edit Company' : 'Add New Company'}
                </Text>
                <Text style={styles.modalDescription}>
                  {selectedCompany
                    ? `Update the details for ${selectedCompany.businessName}.`
                    : 'Fill in the form below to add a new company.'}
                </Text>
              </View>
              <ScrollView style={styles.modalContent}>
                <CompanyForm
                  company={selectedCompany || undefined}
                  clients={hardcodedClients}
                  onFormSubmit={onFormSubmit}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  addCompanyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addCompanyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
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
  cardListContent: {
    gap: 12,
  },
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
  tableDropdownMenu: {
    top: 35,
    right: 0,
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
  deleteMenuItem: {
    // Additional styles for delete item if needed
  },
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
  },
  badgeText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
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
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableHeaderCell: {
    flex: 1,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
    position: 'relative',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 4,
  },
  actionsCell: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  actionButton: {
    padding: 8,
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
  },
  modalContent: {
    flex: 1,
  },
});

export default CompaniesScreen;
