import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  RefreshControl,
  FlatList,
  StyleSheet,
  Modal,
  Dimensions,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import {
  Plus,
  Building,
  Edit,
  Trash2,
  List,
  Grid,
  User,
  Phone,
  Hash,
  FileText,
  MoreHorizontal,
  X,
  Mail,
  CheckCircle,
} from 'lucide-react-native';
import DetailedCompanyForm from '../../components/companies/CompanyForm';
import { usePermissions } from '../../contexts/permission-context';

const { width: screenWidth } = Dimensions.get('window');

// Main CompaniesScreen Component
export default function CompaniesScreen() {
  const baseURL = 'https://accountapp-backend-shardaassociates.onrender.com';
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('card');
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedCompanyForMenu, setSelectedCompanyForMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState([]); // Add clients state
  const { permissions } = usePermissions();

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'Please login again.',
        });
        return;
      }

      const response = await fetch(`${baseURL}/api/companies/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch companies.');
      }

      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error('Fetch companies error:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load companies',
        text2: error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Add fetchClients function
  const fetchClients = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      // Only fetch clients if user has permission to assign companies to clients
      const response = await fetch(`${baseURL}/api/clients`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Fetch clients error:', error);
      // Don't show error for clients fetch as it's not critical
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchCompanies();
    fetchClients(); // Fetch clients on component mount
  }, [fetchCompanies]);

  const handleAddNew = () => {
    console.log('Opening company form');
    if (!permissions?.canCreateCompanies) {
      Toast.show({
        type: 'error',
        text1: 'Permission denied',
        text2: "You don't have permission to create companies.",
      });
      return;
    }
    setSelectedCompany(null);
    setIsDialogOpen(true);
  };
  const handleEdit = company => {
    if (!permissions?.canUpdateCompanies) {
      Toast.show({
        type: 'error',
        text1: 'Permission denied',
        text2: "You don't have permission to update companies.",
      });
      return;
    }
    setSelectedCompany(company);
    setIsDialogOpen(true);
  };

  const handleDelete = company => {
    if (!permissions?.canUpdateCompanies) {
      Toast.show({
        type: 'error',
        text1: 'Permission denied',
        text2: "You don't have permission to delete companies.",
      });
      return;
    }
    setCompanyToDelete(company);
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
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'Please login again.',
        });
        return;
      }

      const response = await fetch(
        `${baseURL}/api/companies/${companyToDelete._id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete company.');
      }

      Toast.show({
        type: 'success',
        text1: 'Company Deleted',
        text2: `${companyToDelete.businessName} has been successfully deleted.`,
      });

      // Refresh the companies list
      fetchCompanies();
    } catch (error) {
      console.error('Delete company error:', error);
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setCompanyToDelete(null);
    }
  };

  const onFormSubmit = () => {
    setIsDialogOpen(false);
    setSelectedCompany(null);
    fetchCompanies();
  };
  const ActionMenu = ({ visible, onClose, onEdit, onDelete, position }) => {
    if (!visible) return null;

    const menuWidth = 100;

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View
            style={[
              styles.menuDropdown,
              {
                position: 'absolute',
                top: position?.y - 55 || 0,
                left: position?.x ? position.x - menuWidth + 36 : 0, // Align to right edge of button
              },
            ]}
          >
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                onClose();
                onEdit();
              }}
            >
              <Edit size={18} color="#1e40af" />
              <Text style={[styles.dropdownItemText, { color: '#1e40af' }]}>
                Edit
              </Text>
            </TouchableOpacity>

            <View style={styles.dropdownDivider} />

            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                onClose();
                onDelete();
              }}
            >
              <Trash2 size={18} color="#dc2626" />
              <Text style={[styles.dropdownItemText, { color: '#dc2626' }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };
  const renderCompanyCard = ({ item: company }) => (
    <View style={styles.cardContainer}>
      {/* Remove TouchableOpacity wrapping the card, just use View */}
      <View style={styles.card}>
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <View style={styles.companyInfo}>
            <View style={styles.iconContainer}>
              <Building size={22} color="#1e40af" />
            </View>
            <View style={styles.companyText}>
              <Text style={styles.companyName} numberOfLines={1}>
                {company.businessName}
              </Text>
              <Text style={styles.businessType} numberOfLines={1}>
                {company.businessType}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={event => {
              const target = event.currentTarget;
              target.measure((fx, fy, width, height, px, py) => {
                setMenuPosition({
                  x: px,
                  y: py + height + 5, // Add 5px gap below the button
                });
                setSelectedCompanyForMenu(company);
                setMenuVisible(true);
              });
            }}
          >
            <MoreHorizontal size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Rest of the card content remains the same */}
        <View style={styles.divider} />

        <View style={styles.contactSection}>
          <View style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <Mail size={16} color="#6b7280" />
            </View>
            <Text style={styles.contactText} numberOfLines={1}>
              {company.emailId}
            </Text>
          </View>
          <View style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <Phone size={16} color="#6b7280" />
            </View>
            <Text style={styles.contactText} numberOfLines={1}>
              {company.mobileNumber}
            </Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Registration No.</Text>
            <View style={styles.detailValueContainer}>
              <Hash size={14} color="#6b7280" style={styles.detailIcon} />
              <Text style={styles.detailValue} numberOfLines={1}>
                {company.registrationNumber}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>GSTIN</Text>
            <View style={styles.detailValueContainer}>
              <FileText size={14} color="#6b7280" style={styles.detailIcon} />
              {company.gstin ? (
                <Text style={styles.detailValue} numberOfLines={1}>
                  {company.gstin}
                </Text>
              ) : (
                <Text style={styles.naText}>N/A</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.statusSection}>
          <View style={styles.statusIndicator}>
            <CheckCircle size={14} color="#10b981" />
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Building size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No Companies Found</Text>
      <Text style={styles.emptyDescription}>
        Get started by adding your first company to manage your business
        entities.
      </Text>
      {permissions?.canCreateCompanies && (
        <TouchableOpacity style={styles.emptyAddButton} onPress={handleAddNew}>
          <Plus size={18} color="white" />
          <Text style={styles.emptyAddButtonText}>Add Company</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading companies...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Companies</Text>
          <Text style={styles.subtitle}>
            Manage all your business entities in one place
          </Text>
        </View>
        {permissions?.canCreateCompanies && (
          <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
            <Plus size={18} color="white" />

            <Text style={styles.addButtonText}>Add Company</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <FlatList
        data={companies}
        renderItem={renderCompanyCard}
        keyExtractor={item => item._id}
        numColumns={1}
        contentContainerStyle={[
          styles.listContent,
          companies.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1e40af']}
            tintColor="#1e40af"
          />
        }
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
        style={styles.flatList}
      />

      {/* Company Form Modal */}
      <Modal
        visible={isDialogOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsDialogOpen(false)}
      >
        <DetailedCompanyForm
          company={selectedCompany || undefined}
          onFormSubmit={onFormSubmit}
          onCancel={() => setIsDialogOpen(false)}
        />
      </Modal>

      {/* Action Menu Modal */}
      <ActionMenu
        visible={menuVisible}
        onClose={() => {
          setMenuVisible(false);
          setSelectedCompanyForMenu(null);
        }}
        onEdit={() => handleEdit(selectedCompanyForMenu)}
        onDelete={() => handleDelete(selectedCompanyForMenu)}
        position={menuPosition}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e40af',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  flatList: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyListContent: {
    justifyContent: 'center',
    flex: 1,
  },
  // Card View Styles
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  iconContainer: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginRight: 12,
  },
  companyText: {
    flex: 1,
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
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 16,
  },
  contactSection: {
    gap: 12,
    marginBottom: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactIcon: {
    width: 20,
    alignItems: 'center',
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  detailsSection: {
    gap: 12,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailIcon: {
    marginRight: 8,
  },
  detailValue: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
    fontFamily: 'monospace',
  },
  naText: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dcfce7',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e40af',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyAddButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#1f2937',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  submitButton: {
    backgroundColor: '#1e40af',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  // Add these to your existing styles
  // Replace the menu styles with these
  menuOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuDropdown: {
    backgroundColor: 'white',
    borderRadius: 8,
    width: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
  },
  menuButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
});
