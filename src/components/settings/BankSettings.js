// BankSettings.js 
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Eye,
  Building2,
} from 'lucide-react-native';
import BankDetailsForm from '../bankdetails/BankDetailForm';
import { capitalizeWords } from '../../lib/utils';
import { BASE_URL } from '../../config';

const { width, height } = Dimensions.get('window');

// Memoized components
const DropdownMenu = React.memo(({ item, onViewDetails, onEdit, onDelete }) => (
  <View style={styles.dropdownMenu}>
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => onViewDetails(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.dropdownIconContainer, { backgroundColor: '#EFF6FF' }]}>
        <Eye size={16} color="#3B82F6" />
      </View>
      <Text style={styles.dropdownItemText}>View Details</Text>
    </TouchableOpacity>
    
    <View style={styles.dropdownDivider} />
    
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => onEdit(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.dropdownIconContainer, { backgroundColor: '#ECFDF5' }]}>
        <Edit size={16} color="#10B981" />
      </View>
      <Text style={styles.dropdownItemText}>Edit</Text>
    </TouchableOpacity>
    
    <View style={styles.dropdownDivider} />
    
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => onDelete(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.dropdownIconContainer, { backgroundColor: '#FEF2F2' }]}>
        <Trash2 size={16} color="#EF4444" />
      </View>
      <Text style={[styles.dropdownItemText, styles.dropdownItemTextDanger]}>Delete</Text>
    </TouchableOpacity>
  </View>
));

const BankDetailCard = React.memo(({ item, dropdownVisible, onToggleDropdown, onViewDetails, onEdit, onDelete }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardTitleRow}>
        <View style={styles.bankIconContainer}>
          <Building2 size={22} color="#3B82F6" />
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{capitalizeWords(item.bankName)}</Text>
          <View style={styles.accountBadge}>
            <Text style={styles.accountBadgeText}>Account: {item.accountNo}</Text>
          </View>
        </View>
      </View>
      <View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => onToggleDropdown(item._id)}
          activeOpacity={0.7}
        >
          <MoreHorizontal size={22} color="#6B7280" />
        </TouchableOpacity>
        
        {dropdownVisible === item._id && (
          <View style={styles.dropdownContainer}>
            <DropdownMenu
              item={item}
              onViewDetails={onViewDetails}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </View>
        )}
      </View>
    </View>

    <View style={styles.cardContent}>
      {item.branchAddress && (
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <MapPin size={16} color="#8B5CF6" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Branch Address</Text>
            <Text style={styles.infoValue}>{item.branchAddress}</Text>
          </View>
        </View>
      )}

      {item.city && (
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Building size={16} color="#F59E0B" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>City</Text>
            <Text style={styles.infoValue}>{item.city}</Text>
          </View>
        </View>
      )}

      {item.ifscCode && (
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <CreditCard size={16} color="#EC4899" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>IFSC Code</Text>
            <Text style={styles.infoValue}>{item.ifscCode}</Text>
          </View>
        </View>
      )}
    </View>
  </View>
));

const TableRow = React.memo(({ item, index, dropdownVisible, onToggleDropdown, onViewDetails, onEdit, onDelete }) => (
  <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
    <View style={styles.tableCell}>
      <View style={styles.tableCellContent}>
        <View style={styles.tableBankIcon}>
          <Building2 size={18} color="#3B82F6" />
        </View>
        <Text style={styles.tableCellText}>{capitalizeWords(item.bankName)}</Text>
      </View>
    </View>
    <View style={styles.tableCell}>
      <View style={styles.accountNumberBadge}>
        <Text style={styles.accountNumberText}>{item.accountNo}</Text>
      </View>
    </View>
    <View style={styles.tableCell}>
      <Text style={styles.tableCellText} numberOfLines={2}>{item.branchAddress || 'N/A'}</Text>
    </View>
    <View style={[styles.tableCell, styles.actionsCell]}>
      <View>
        <TouchableOpacity
          style={styles.tableMoreButton}
          onPress={() => onToggleDropdown(item._id)}
          activeOpacity={0.7}
        >
          <MoreHorizontal size={20} color="#6B7280" />
        </TouchableOpacity>
        
        {dropdownVisible === item._id && (
          <View style={styles.tableDropdownContainer}>
            <DropdownMenu
              item={item}
              onViewDetails={onViewDetails}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </View>
        )}
      </View>
    </View>
  </View>
));

const BankSettings = () => {
  const [bankDetails, setBankDetails] = useState([]);
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
  const [dropdownVisible, setDropdownVisible] = useState(null);
  const scrollViewRef = useRef(null);
  
  // Cache for user company ID
  const userCompanyIdRef = useRef(null);

  
  const getUserCompanyId = useCallback(async () => {
    if (userCompanyIdRef.current !== null) {
      return userCompanyIdRef.current;
    }
    
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return null;

      const payload = JSON.parse(atob(token.split('.')[1]));
      const companyId = payload.companyId || null;
      userCompanyIdRef.current = companyId;
      return companyId;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }, []);

  
  const fetchBankDetails = useCallback(async () => {
    const controller = new AbortController();
    setIsLoading(true);
    
    try {
      const [token, userCompanyId] = await Promise.all([
        AsyncStorage.getItem('token'),
        getUserCompanyId()
      ]);
      
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
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bank details.');
      }

      const data = await response.json();
      const allBankDetails = data.data || data || [];

      // Filter on client side if needed
      const filteredData = userCompanyId 
        ? allBankDetails.filter(detail => detail.company === userCompanyId)
        : allBankDetails;

      setBankDetails(filteredData);
    } catch (error) {
      if (error.name !== 'AbortError') {
        Toast.show({
          type: 'error',
          text1: 'Failed to load bank details',
          text2: error.message || 'Something went wrong.',
        });
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
    
    return () => controller.abort();
  }, [getUserCompanyId]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBankDetails();
  }, [fetchBankDetails]);

  useEffect(() => {
    fetchBankDetails();
  }, [fetchBankDetails]);

  
  const filteredBankDetails = useMemo(() => {
    if (searchQuery.trim() === '') {
      return bankDetails;
    }
    
    const lowerQuery = searchQuery.toLowerCase();
    return bankDetails.filter(bank =>
      bank.bankName?.toLowerCase().includes(lowerQuery) ||
      bank.accountNo?.includes(searchQuery) ||
      bank.managerName?.toLowerCase().includes(lowerQuery) ||
      bank.city?.toLowerCase().includes(lowerQuery) ||
      bank.branchAddress?.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, bankDetails]);

  
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredBankDetails.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredBankDetails.slice(startIndex, endIndex);
    
    return { totalPages, startIndex, endIndex, currentItems };
  }, [filteredBankDetails, currentPage, itemsPerPage]);

  const { totalPages, startIndex, endIndex, currentItems } = paginationData;

  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  
  const handleOpenForm = useCallback((bankDetail = null) => {
    setSelectedBankDetail(bankDetail);
    setIsFormOpen(true);
    setDropdownVisible(null);
  }, []);

  const handleOpenDeleteDialog = useCallback((bankDetail) => {
    setBankDetailToDelete(bankDetail);
    setIsAlertOpen(true);
    setDropdownVisible(null);
  }, []);

  const handleOpenDetailsModal = useCallback((bankDetail) => {
    setSelectedBankDetailForDetails(bankDetail);
    setIsDetailsModalOpen(true);
    setDropdownVisible(null);
  }, []);

  const toggleDropdown = useCallback((id) => {
    setDropdownVisible(prev => prev === id ? null : id);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setIsFormOpen(false);
    fetchBankDetails();
    const action = selectedBankDetail ? 'updated' : 'created';
    Toast.show({
      type: 'success',
      text1: `Bank Detail ${action} successfully`,
      text2: `The bank detail has been ${action}.`,
    });
    setSelectedBankDetail(null);
  }, [selectedBankDetail, fetchBankDetails]);

  const handleDeleteBankDetail = useCallback(async () => {
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
  }, [bankDetailToDelete, fetchBankDetails]);

  
  const renderBankDetailCard = useCallback(({ item }) => (
    <BankDetailCard
      item={item}
      dropdownVisible={dropdownVisible}
      onToggleDropdown={toggleDropdown}
      onViewDetails={handleOpenDetailsModal}
      onEdit={handleOpenForm}
      onDelete={handleOpenDeleteDialog}
    />
  ), [dropdownVisible, toggleDropdown, handleOpenDetailsModal, handleOpenForm, handleOpenDeleteDialog]);

  const renderTableRow = useCallback((item, index) => (
    <TableRow
      key={item._id}
      item={item}
      index={index}
      dropdownVisible={dropdownVisible}
      onToggleDropdown={toggleDropdown}
      onViewDetails={handleOpenDetailsModal}
      onEdit={handleOpenForm}
      onDelete={handleOpenDeleteDialog}
    />
  ), [dropdownVisible, toggleDropdown, handleOpenDetailsModal, handleOpenForm, handleOpenDeleteDialog]);

  const keyExtractor = useCallback((item) => item._id, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading bank details...</Text>
          <Text style={styles.loadingSubtext}>Please wait a moment</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      activeOpacity={1} 
      style={styles.container}
      onPress={() => setDropdownVisible(null)}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerIcon}>
              <Building2 size={24} color="#3B82F6" />
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Manage Bank Details</Text>
              <Text style={styles.subtitle}>
                Manage and organize all your banking information
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleOpenForm()}
            activeOpacity={0.8}
          >
            <View style={styles.addButtonIconContainer}>
              <PlusCircle size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.addButtonText}>Add New Bank</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by bank name, account number, city..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
                activeOpacity={0.7}
              >
                <View style={styles.clearButtonInner}>
                  <X size={14} color="#6B7280" />
                </View>
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
                  <Text style={styles.tableHeaderText}>BANK NAME</Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={styles.tableHeaderText}>ACCOUNT NUMBER</Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={styles.tableHeaderText}>BRANCH ADDRESS</Text>
                </View>
                <View style={[styles.tableHeaderCell, styles.actionsHeaderCell]}>
                  <Text style={styles.tableHeaderText}>ACTIONS</Text>
                </View>
              </View>
              
              {currentItems.map(renderTableRow)}
            </View>

            {/* Mobile Card View */}
            <View style={styles.mobileContainer}>
              <FlatList
                data={currentItems}
                renderItem={renderBankDetailCard}
                keyExtractor={keyExtractor}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.cardList}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                windowSize={10}
                initialNumToRender={10}
              />
            </View>

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={18} color={currentPage === 1 ? "#9CA3AF" : "#374151"} />
                  <Text style={[styles.paginationText, currentPage === 1 && styles.paginationTextDisabled]}>
                    Previous
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.pageInfo}>
                  <View style={styles.pageNumberContainer}>
                    <Text style={styles.pageInfoText}>
                      {currentPage} / {totalPages}
                    </Text>
                  </View>
                  <Text style={styles.pageInfoSubText}>
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredBankDetails.length)} of {filteredBankDetails.length}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.paginationText, currentPage === totalPages && styles.paginationTextDisabled]}>
                    Next
                  </Text>
                  <ChevronRight size={18} color={currentPage === totalPages ? "#9CA3AF" : "#374151"} />
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Package size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyStateTitle}>
              {searchQuery.trim() ? 'No Results Found' : 'No Bank Details Yet'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery.trim() ? 
                'Try adjusting your search criteria or clear the filters to see all bank details.' :
                'Get started by adding your first bank account details to manage your financial information.'}
            </Text>
            {!searchQuery.trim() && (
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => handleOpenForm()}
                activeOpacity={0.8}
              >
                <PlusCircle size={20} color="#FFFFFF" />
                <Text style={styles.emptyStateButtonText}>Add Your First Bank</Text>
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
            <View style={styles.modalHeaderContent}>
              <View style={styles.modalIconContainer}>
                <Building2 size={24} color="#3B82F6" />
              </View>
              <Text style={styles.modalTitle}>
                {selectedBankDetail ? 'Edit Bank Detail' : 'Add New Bank Detail'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setIsFormOpen(false);
                setSelectedBankDetail(null);
              }}
              activeOpacity={0.7}
            >
              <X size={24} color="#6B7280" />
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
            <View style={styles.modalHeaderContent}>
              <View style={styles.modalIconContainer}>
                <Eye size={24} color="#3B82F6" />
              </View>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedBankDetailForDetails ? capitalizeWords(selectedBankDetailForDetails.bankName) : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsDetailsModalOpen(false)}
              activeOpacity={0.7}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          {selectedBankDetailForDetails && (
            <ScrollView style={styles.detailsContent}>
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItemCard}>
                    <View style={styles.detailItemHeader}>
                      <View style={[styles.detailItemIcon, { backgroundColor: '#EFF6FF' }]}>
                        <Building2 size={20} color="#3B82F6" />
                      </View>
                      <Text style={styles.detailLabel}>Bank Name</Text>
                    </View>
                    <Text style={styles.detailValue}>{capitalizeWords(selectedBankDetailForDetails.bankName)}</Text>
                  </View>
                  
                  <View style={styles.detailItemCard}>
                    <View style={styles.detailItemHeader}>
                      <View style={[styles.detailItemIcon, { backgroundColor: '#FEF3C7' }]}>
                        <CreditCard size={20} color="#F59E0B" />
                      </View>
                      <Text style={styles.detailLabel}>Account Number</Text>
                    </View>
                    <Text style={styles.detailValue}>{selectedBankDetailForDetails.accountNo}</Text>
                  </View>
                  
                  <View style={styles.detailItemCard}>
                    <View style={styles.detailItemHeader}>
                      <View style={[styles.detailItemIcon, { backgroundColor: '#FEF2F2' }]}>
                        <Building size={20} color="#EF4444" />
                      </View>
                      <Text style={styles.detailLabel}>City</Text>
                    </View>
                    <Text style={styles.detailValue}>{selectedBankDetailForDetails.city}</Text>
                  </View>
                  
                  <View style={styles.detailItemCard}>
                    <View style={styles.detailItemHeader}>
                      <View style={[styles.detailItemIcon, { backgroundColor: '#F3E8FF' }]}>
                        <FileText size={20} color="#8B5CF6" />
                      </View>
                      <Text style={styles.detailLabel}>IFSC Code</Text>
                    </View>
                    <Text style={styles.detailValue}>{selectedBankDetailForDetails.ifscCode || 'N/A'}</Text>
                  </View>
                  
                  <View style={[styles.detailItemCard, styles.detailItemCardFull]}>
                    <View style={styles.detailItemHeader}>
                      <View style={[styles.detailItemIcon, { backgroundColor: '#ECFDF5' }]}>
                        <MapPin size={20} color="#10B981" />
                      </View>
                      <Text style={styles.detailLabel}>Branch Address</Text>
                    </View>
                    <Text style={styles.detailValue}>{selectedBankDetailForDetails.branchAddress || 'N/A'}</Text>
                  </View>
                </View>
              </View>

              {/* UPI Details Section */}
              {selectedBankDetailForDetails.upiDetails && (
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>UPI Details</Text>
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItemCard}>
                      <View style={styles.detailItemHeader}>
                        <View style={[styles.detailItemIcon, { backgroundColor: '#FCE7F3' }]}>
                          <Smartphone size={20} color="#EC4899" />
                        </View>
                        <Text style={styles.detailLabel}>UPI ID</Text>
                      </View>
                      <Text style={styles.detailValue}>{selectedBankDetailForDetails.upiDetails.upiId || 'N/A'}</Text>
                    </View>
                    
                    <View style={styles.detailItemCard}>
                      <View style={styles.detailItemHeader}>
                        <View style={[styles.detailItemIcon, { backgroundColor: '#DBEAFE' }]}>
                          <User size={20} color="#3B82F6" />
                        </View>
                        <Text style={styles.detailLabel}>UPI Name</Text>
                      </View>
                      <Text style={styles.detailValue}>{selectedBankDetailForDetails.upiDetails.upiName || 'N/A'}</Text>
                    </View>
                    
                    <View style={styles.detailItemCard}>
                      <View style={styles.detailItemHeader}>
                        <View style={[styles.detailItemIcon, { backgroundColor: '#DBEAFE' }]}>
                          <Phone size={20} color="#0EA5E9" />
                        </View>
                        <Text style={styles.detailLabel}>UPI Mobile</Text>
                      </View>
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
                  activeOpacity={0.8}
                >
                  <Edit size={20} color="#FFFFFF" />
                  <Text style={styles.modalActionButtonText}>Edit Details</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.deleteModalButton]}
                  onPress={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenDeleteDialog(selectedBankDetailForDetails);
                  }}
                  activeOpacity={0.8}
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
            <View style={styles.alertIconContainer}>
              <View style={styles.alertIcon}>
                <AlertCircle size={32} color="#EF4444" />
              </View>
            </View>
            
            <Text style={styles.alertTitle}>Delete Bank Detail?</Text>
            <Text style={styles.alertMessage}>
              This action cannot be undone. The bank detail will be permanently removed from your records.
            </Text>
            
            <View style={styles.alertActions}>
              <TouchableOpacity
                style={[styles.alertButton, styles.cancelAlertButton]}
                onPress={() => setIsAlertOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelAlertButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.alertButton, styles.confirmAlertButton]}
                onPress={handleDeleteBankDetail}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmAlertButtonText}>Yes, Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#374151',
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
  },
  header: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 10,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonIconContainer: {
    marginRight: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  searchContainer: {
    // paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 12,
    color: '#111827',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonInner: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 6,
  },
  tableContainer: {
    display: Platform.OS === 'web' ? 'flex' : 'none',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    // marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 4,
  },
  tableHeaderCell: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    minWidth: 140,
  },
  actionsHeaderCell: {
    flex: 0.4,
    minWidth: 100,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    textAlign: 'left',
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    minHeight: 72,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tableRowEven: {
    backgroundColor: '#FAFAFA',
  },
  tableCell: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
    minWidth: 140,
  },
  actionsCell: {
    flex: 0.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  tableCellContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableBankIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tableCellText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    flex: 1,
  },
  accountNumberBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  accountNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  tableMoreButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableDropdownContainer: {
    position: 'absolute',
    top: 48,
    right: 0,
    zIndex: 1000,
  },
  mobileContainer: {
    display: Platform.OS === 'web' ? 'none' : 'flex',
    // padding: 16,
  },
  cardList: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  bankIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  accountBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  accountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 0.2,
  },
  moreButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownContainer: {
    position: 'absolute',
    top: 48,
    right: 0,
    zIndex: 1000,
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    minWidth: 200,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  dropdownItemTextDanger: {
    color: '#EF4444',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  cardContent: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    lineHeight: 20,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  paginationButtonDisabled: {
    opacity: 0.4,
    backgroundColor: '#F9FAFB',
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  paginationTextDisabled: {
    color: '#9CA3AF',
  },
  pageInfo: {
    alignItems: 'center',
  },
  pageNumberContainer: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 6,
  },
  pageInfoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3B82F6',
  },
  pageInfoSubText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    minHeight: 400,
  },
  emptyStateIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  detailsContent: {
    flex: 1,
  },
  detailsSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItemCard: {
    width: '48%',
    backgroundColor: '#FAFAFA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  detailItemCardFull: {
    width: '100%',
  },
  detailItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  detailValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  editModalButton: {
    backgroundColor: '#10B981',
  },
  deleteModalButton: {
    backgroundColor: '#EF4444',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  alertIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  alertIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  alertMessage: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 28,
    textAlign: 'center',
  },
  alertActions: {
    flexDirection: 'row',
    gap: 12,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelAlertButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelAlertButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmAlertButton: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmAlertButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default BankSettings; 