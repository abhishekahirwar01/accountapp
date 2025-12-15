// BankSettings.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Dimensions,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  PlusCircle,
  Package,
  Mail,
  MapPin,
  Phone,
  User,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
  Building,
  AlertCircle,
  Check,
  X,
  Search,
  FileText,
  CreditCard,
  Smartphone,
  Globe,
  FileUp,
  FileDown,
} from 'lucide-react-native';
import BankDetailsForm from '../bankdetails/BankDetailForm';
import { capitalizeWords } from '../../lib/utils';
import { BASE_URL } from '../../config';

const { width, height } = Dimensions.get('window');

const BankSettings = () => {
  const [bankDetails, setBankDetails] = useState([]);
  const [filteredBankDetails, setFilteredBankDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedBankDetail, setSelectedBankDetail] = useState(null);
  const [bankDetailToDelete, setBankDetailToDelete] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedBankDetailForDetails, setSelectedBankDetailForDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const scrollViewRef = useRef(null);

  // Function to get user's company ID from token
  const getUserCompanyId = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return null;

      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.companyId || null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Fetch bank details
  const fetchBankDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'Authentication token not found.',
        });
        return;
      }

      const response = await fetch(`${BASE_URL}/api/bank-details`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bank details.');
      }

      const data = await response.json();
      const allBankDetails = data.data || data || [];

      // Get user's company ID and filter bank details
      const userCompanyId = await getUserCompanyId();

      if (userCompanyId) {
        // Filter bank details to show only those from the user's company
        const userBankDetails = allBankDetails.filter(
          (detail) => detail.company === userCompanyId
        );
        setBankDetails(userBankDetails);
        setFilteredBankDetails(userBankDetails);
      } else {
        // If no company ID found, show all (fallback)
        setBankDetails(allBankDetails);
        setFilteredBankDetails(allBankDetails);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load bank details',
        text2: error.message || 'Something went wrong.',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBankDetails();
  }, [fetchBankDetails]);

  useEffect(() => {
    fetchBankDetails();
  }, [fetchBankDetails]);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBankDetails(bankDetails);
    } else {
      const filtered = bankDetails.filter(bank =>
        bank.bankName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bank.accountNo?.includes(searchQuery) ||
        bank.managerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bank.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bank.branchAddress?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBankDetails(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, bankDetails]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredBankDetails.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredBankDetails.slice(startIndex, endIndex);

  // Open form for creating or editing a bank detail
  const handleOpenForm = (bankDetail = null) => {
    setSelectedBankDetail(bankDetail);
    setIsFormOpen(true);
  };

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (bankDetail) => {
    setBankDetailToDelete(bankDetail);
    setIsAlertOpen(true);
  };

  // Open full details modal
  const handleOpenDetailsModal = (bankDetail) => {
    setSelectedBankDetailForDetails(bankDetail);
    setIsDetailsModalOpen(true);
  };

  // Form submission success handler
  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchBankDetails();
    const action = selectedBankDetail ? 'updated' : 'created';
    Toast.show({
      type: 'success',
      text1: `Bank Detail ${action} successfully`,
      text2: `The bank detail has been ${action}.`,
    });
    setSelectedBankDetail(null);
  };

  // Delete bank detail
  const handleDeleteBankDetail = async () => {
    if (!bankDetailToDelete) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'Authentication token not found.',
        });
        return;
      }

      const response = await fetch(
        `${BASE_URL}/api/bank-details/${bankDetailToDelete._id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete bank detail.');
      }

      Toast.show({
        type: 'success',
        text1: 'Bank Detail Deleted',
        text2: 'The bank detail has been successfully removed.',
      });

      fetchBankDetails();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: error.message || 'Something went wrong.',
      });
    } finally {
      setIsAlertOpen(false);
      setBankDetailToDelete(null);
    }
  };

  // Render bank detail card for mobile
  const renderBankDetailCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{capitalizeWords(item.bankName)}</Text>
          <Text style={styles.cardSubtitle}>Account: {item.accountNo}</Text>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => handleOpenDetailsModal(item)}
        >
          <MoreHorizontal size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardContent}>
        {/* Manager Name (commented out) */}
        {/* <View style={styles.infoRow}>
          <User size={16} color="#3B82F6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Manager</Text>
            <Text style={styles.infoValue}>{capitalizeWords(item.managerName)}</Text>
          </View>
        </View> */}

        {/* Contact Number (commented out) */}
        {/* {item.contactNumber && (
          <View style={styles.infoRow}>
            <Phone size={16} color="#10B981" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Contact</Text>
              <Text style={styles.infoValue}>{item.contactNumber}</Text>
            </View>
          </View>
        )} */}

        {/* Email (commented out) */}
        {/* {item.email && (
          <View style={styles.infoRow}>
            <Mail size={16} color="#8B5CF6" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{item.email}</Text>
            </View>
          </View>
        )} */}

        {/* Branch Address */}
        {item.branchAddress && (
          <View style={styles.infoRow}>
            <MapPin size={16} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Branch Address</Text>
              <Text style={styles.infoValue}>{item.branchAddress}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => handleOpenDetailsModal(item)}
          >
            <Package size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleOpenForm(item)}
          >
            <Edit size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleOpenDeleteDialog(item)}
          >
            <Trash2 size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Render table row for desktop/tablet
  const renderTableRow = (item) => (
    <View style={styles.tableRow} key={item._id}>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>{capitalizeWords(item.bankName)}</Text>
      </View>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>{item.accountNo}</Text>
      </View>
      {/* <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>{capitalizeWords(item.managerName)}</Text>
      </View>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>{item.contactNumber}</Text>
      </View>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>{item.email || 'N/A'}</Text>
      </View> */}
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>{item.branchAddress || 'N/A'}</Text>
      </View>
      <View style={[styles.tableCell, styles.actionsCell]}>
        <TouchableOpacity
          style={[styles.iconButton, styles.viewButtonSmall]}
          onPress={() => handleOpenDetailsModal(item)}
        >
          <Package size={16} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, styles.editButtonSmall]}
          onPress={() => handleOpenForm(item)}
        >
          <Edit size={16} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, styles.deleteButtonSmall]}
          onPress={() => handleOpenDeleteDialog(item)}
        >
          <Trash2 size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading bank details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Manage Bank Details</Text>
            <Text style={styles.subtitle}>
              A list of all your bank details.
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleOpenForm()}
          >
            <PlusCircle size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Bank Details</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search bank details..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <X size={16} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bank Details List */}
        {filteredBankDetails.length > 0 ? (
          <>
            {/* Desktop/Tablet Table View */}
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <View style={styles.tableHeaderCell}>
                  <Text style={styles.tableHeaderText}>Bank Name</Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={styles.tableHeaderText}>Account Number</Text>
                </View>
                {/* <View style={styles.tableHeaderCell}>
                  <Text style={styles.tableHeaderText}>Manager Name</Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={styles.tableHeaderText}>Contact Number</Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={styles.tableHeaderText}>Email</Text>
                </View> */}
                <View style={styles.tableHeaderCell}>
                  <Text style={styles.tableHeaderText}>Branch Address</Text>
                </View>
                <View style={[styles.tableHeaderCell, styles.actionsHeaderCell]}>
                  <Text style={styles.tableHeaderText}>Actions</Text>
                </View>
              </View>
              
              {currentItems.map((item) => renderTableRow(item))}
            </View>

            {/* Mobile Card View */}
            <View style={styles.mobileContainer}>
              <FlatList
                data={currentItems}
                renderItem={renderBankDetailCard}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.cardList}
              />
            </View>

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={20} color={currentPage === 1 ? "#9CA3AF" : "#374151"} />
                  <Text style={[styles.paginationText, currentPage === 1 && styles.paginationTextDisabled]}>
                    Previous
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.pageInfo}>
                  <Text style={styles.pageInfoText}>
                    Page {currentPage} of {totalPages}
                  </Text>
                  <Text style={styles.pageInfoSubText}>
                    ({filteredBankDetails.length} total items)
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <Text style={[styles.paginationText, currentPage === totalPages && styles.paginationTextDisabled]}>
                    Next
                  </Text>
                  <ChevronRight size={20} color={currentPage === totalPages ? "#9CA3AF" : "#374151"} />
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Package size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No Bank Details Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery.trim() ? 
                'No bank details match your search. Try different keywords.' :
                'Get started by adding your first bank detail.'}
            </Text>
            {!searchQuery.trim() && (
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => handleOpenForm()}
              >
                <PlusCircle size={20} color="#FFFFFF" />
                <Text style={styles.emptyStateButtonText}>Add Bank Details</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bank Detail Form Modal */}
      <Modal
        visible={isFormOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setIsFormOpen(false);
          setSelectedBankDetail(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedBankDetail ? 'Edit Bank Detail' : 'Create New Bank Detail'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setIsFormOpen(false);
                setSelectedBankDetail(null);
              }}
            >
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          
          <BankDetailsForm
            bankDetail={selectedBankDetail || undefined}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setIsFormOpen(false);
              setSelectedBankDetail(null);
            }}
          />
        </View>
      </Modal>

      {/* Full Details Modal */}
      <Modal
        visible={isDetailsModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsDetailsModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Bank Details - {selectedBankDetailForDetails ? capitalizeWords(selectedBankDetailForDetails.bankName) : ''}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsDetailsModalOpen(false)}
            >
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          
          {selectedBankDetailForDetails && (
            <ScrollView style={styles.detailsContent}>
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Bank Name</Text>
                  <Text style={styles.detailValue}>{capitalizeWords(selectedBankDetailForDetails.bankName)}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Account Number</Text>
                  <Text style={styles.detailValue}>{selectedBankDetailForDetails.accountNo}</Text>
                </View>
                
                {/* <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Manager Name</Text>
                  <Text style={styles.detailValue}>{capitalizeWords(selectedBankDetailForDetails.managerName)}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Contact Number</Text>
                  <Text style={styles.detailValue}>{selectedBankDetailForDetails.contactNumber}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selectedBankDetailForDetails.email || 'N/A'}</Text>
                </View> */}
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>City</Text>
                  <Text style={styles.detailValue}>{selectedBankDetailForDetails.city}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>IFSC Code</Text>
                  <Text style={styles.detailValue}>{selectedBankDetailForDetails.ifscCode || 'N/A'}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Branch Address</Text>
                  <Text style={styles.detailValue}>{selectedBankDetailForDetails.branchAddress || 'N/A'}</Text>
                </View>
              </View>

              {/* UPI Details Section */}
              {selectedBankDetailForDetails.upiDetails && (
                <View style={styles.upiSection}>
                  <Text style={styles.sectionTitle}>UPI Details</Text>
                  <View style={styles.upiGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>UPI ID</Text>
                      <Text style={styles.detailValue}>{selectedBankDetailForDetails.upiDetails.upiId || 'N/A'}</Text>
                    </View>
                    
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>UPI Name</Text>
                      <Text style={styles.detailValue}>{selectedBankDetailForDetails.upiDetails.upiName || 'N/A'}</Text>
                    </View>
                    
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>UPI Mobile</Text>
                      <Text style={styles.detailValue}>{selectedBankDetailForDetails.upiDetails.upiMobile || 'N/A'}</Text>
                    </View>
                  </View>
                </View>
              )}
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.editModalButton]}
                  onPress={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenForm(selectedBankDetailForDetails);
                  }}
                >
                  <Edit size={20} color="#FFFFFF" />
                  <Text style={styles.modalActionButtonText}>Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.deleteModalButton]}
                  onPress={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenDeleteDialog(selectedBankDetailForDetails);
                  }}
                >
                  <Trash2 size={20} color="#FFFFFF" />
                  <Text style={styles.modalActionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Delete Confirmation Alert */}
      <Modal
        visible={isAlertOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAlertOpen(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertContent}>
            <View style={styles.alertHeader}>
              <AlertCircle size={24} color="#EF4444" />
              <Text style={styles.alertTitle}>Are you absolutely sure?</Text>
            </View>
            
            <Text style={styles.alertMessage}>
              This action cannot be undone. This will permanently delete the bank detail.
            </Text>
            
            <View style={styles.alertActions}>
              <TouchableOpacity
                style={[styles.alertButton, styles.cancelAlertButton]}
                onPress={() => setIsAlertOpen(false)}
              >
                <Text style={styles.cancelAlertButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.alertButton, styles.confirmAlertButton]}
                onPress={handleDeleteBankDetail}
              >
                <Text style={styles.confirmAlertButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  tableContainer: {
    display: Platform.OS === 'web' ? 'flex' : 'none',
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    minWidth: 120,
  },
  actionsHeaderCell: {
    flex: 0.6,
    minWidth: 180,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    minHeight: 60,
  },
  tableCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    minWidth: 120,
  },
  actionsCell: {
    flex: 0.6,
    flexDirection: 'row',
    gap: 8,
    minWidth: 180,
  },
  tableCellText: {
    fontSize: 14,
    color: '#374151',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButtonSmall: {
    backgroundColor: '#3B82F6',
  },
  editButtonSmall: {
    backgroundColor: '#10B981',
  },
  deleteButtonSmall: {
    backgroundColor: '#EF4444',
  },
  mobileContainer: {
    display: Platform.OS === 'web' ? 'none' : 'flex',
    padding: 16,
  },
  cardList: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  moreButton: {
    padding: 4,
  },
  cardContent: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  viewButton: {
    backgroundColor: '#3B82F6',
  },
  editButton: {
    backgroundColor: '#10B981',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 8,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  paginationTextDisabled: {
    color: '#9CA3AF',
  },
  pageInfo: {
    alignItems: 'center',
  },
  pageInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  pageInfoSubText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  detailsContent: {
    flex: 1,
    padding: 16,
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  upiSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  upiGrid: {
    gap: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    marginBottom: 16,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  modalActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editModalButton: {
    backgroundColor: '#10B981',
  },
  deleteModalButton: {
    backgroundColor: '#EF4444',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  alertMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 12,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelAlertButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelAlertButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmAlertButton: {
    backgroundColor: '#EF4444',
  },
  confirmAlertButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BankSettings;