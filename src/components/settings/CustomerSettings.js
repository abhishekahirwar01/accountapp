import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DocumentPicker from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import * as XLSX from 'xlsx';
import Toast from 'react-native-toast-message';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  PlusCircle,
  Building,
  Check,
  X,
  FileText,
  Hash,
  Phone,
  Mail,
  MapPin,
  Percent,
  Upload,
  ChevronLeft,
  ChevronRight,
  Download,
  User,
} from 'lucide-react-native';
import { CustomerForm } from '../customers/CustomerForm';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { capitalizeWords } from '../../lib/utils';
import { BASE_URL } from '../../config';

export function CustomerSettings() {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const customersPerPage = 10;

  // Permission checks
  const { permissions: userCaps } = useUserPermissions();
  const [role, setRole] = useState(null);
  const isCustomerRole = role === 'customer';
  const canShowCustomers = !!userCaps?.canShowCustomers || isCustomerRole;
  const canCreateCustomers = !!userCaps?.canCreateCustomers || isCustomerRole;

  useEffect(() => {
    // Get role from AsyncStorage
    const getRole = async () => {
      try {
        const storedRole = await AsyncStorage.getItem('role');
        setRole(storedRole);
      } catch (error) {
        console.error('Error getting role:', error);
      }
    };
    getRole();
  }, []);

  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch companies.');
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : data.companies || []);
    } catch (err) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load companies',
      });
    } finally {
      setIsLoadingCompanies(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/parties`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch customers.');
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : data.parties || []);
      setCurrentPage(1);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load customers',
        text2: error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  }, [fetchCustomers]);

  const handleOpenForm = (customer = null) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = customer => {
    setCustomerToDelete(customer);
    setIsAlertOpen(true);
  };

  const handleFormSuccess = customer => {
    setIsFormOpen(false);
    fetchCustomers();
    const action = selectedCustomer ? 'updated' : 'created';
    Toast.show({
      type: 'success',
      text1: `Customer ${action} successfully`,
      text2: `${customer.name}'s details have been ${action}.`,
    });
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(
        `${BASE_URL}/api/parties/${customerToDelete._id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) throw new Error('Failed to delete customer.');

      Toast.show({
        type: 'success',
        text1: 'Customer Deleted',
        text2: 'The customer has been successfully removed.',
      });

      fetchCustomers();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsAlertOpen(false);
      setCustomerToDelete(null);
    }
  };

  // Excel Import Functions
  const handleImportClick = () => {
    setIsImportDialogOpen(true);
  };

  const pickFileForImport = async () => {
    try {
      const [result] = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.xlsx,
          DocumentPicker.types.xls,
          DocumentPicker.types.csv,
        ],
      });

      if (result.size && result.size > 10 * 1024 * 1024) {
        Toast.show({
          type: 'error',
          text1: 'File too large',
          text2: 'Please select a file smaller than 10MB.',
        });
        return;
      }

      await handleFileUpload(result);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('Picker Error:', err);
        Toast.show({
          type: 'error',
          text1: 'Import Failed',
          text2: 'Failed to select file.',
        });
      }
    }
  };

  const handleFileUpload = async file => {
    if (!file) return;

    setIsImporting(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name,
      });

      const response = await fetch(`${BASE_URL}/api/parties/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to import customers');
      }

      let description = `Successfully imported ${data.importedCount} out of ${data.totalCount} customers.`;

      if (data.errors && data.errors.length > 0) {
        description += ` ${data.errors.length} records had errors.`;
        if (data.errors.length <= 3) {
          description += ` Errors: ${data.errors.join('; ')}`;
        }
      }

      Toast.show({
        type: data.importedCount > 0 ? 'success' : 'error',
        text1:
          data.importedCount > 0
            ? 'Import Completed'
            : 'Import Completed with Issues',
        text2: description,
      });

      setIsImportDialogOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('Import error:', error);
      Toast.show({
        type: 'error',
        text1: 'Import Failed',
        text2:
          error instanceof Error ? error.message : 'Failed to import customers',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    // Define CSV headers matching the web version
    const headers = [
      'name',
      'contactNumber',
      'email',
      'address',
      'city',
      'state',
      'pincode',
      'gstin',
      'gstRegistrationType',
      'pan',
      'isTDSApplicable',
      'tdsRate',
      'tdsSection',
    ];

    // Define sample data rows matching the web version
    const sampleRows = [
      [
        'ABC Enterprises',
        '9876543210',
        'abc@example.com',
        '123 Business Street',
        'Mumbai',
        'Maharashtra',
        '400001',
        '27ABCDE1234F1Z5',
        'Regular',
        'ABCDE1234F',
        'false',
        '0',
        '',
      ],
      [
        'Dr. Sharma Clinic',
        '9876543211',
        'sharma@clinic.com',
        '456 Health Avenue',
        'Delhi',
        'Delhi',
        '110001',
        '',
        'Unregistered',
        'FGHIJ5678K',
        'true',
        '10',
        '194J',
      ],
      [
        'Small Business',
        '9876543213',
        'business@example.com',
        '789 Trade Lane',
        'Chennai',
        'Tamil Nadu',
        '600001',
        '33COMP1234C1Z2',
        'Composition',
        'COMP1234C',
        'false',
        '0',
        '',
      ],
      [
        'Overseas Client',
        '9876543214',
        'overseas@client.com',
        '123 International Road',
        'New York',
        'New York',
        '10001',
        '',
        'Overseas',
        '',
        'false',
        '0',
        '',
      ],
      [
        'Local Consumer',
        '9876543215',
        'consumer@example.com',
        '456 Local Street',
        'Mumbai',
        'Maharashtra',
        '400001',
        '',
        'Consumer',
        '',
        'false',
        '0',
        '',
      ],
    ];

    // Build CSV content with proper formatting
    const buildCSVRow = row => {
      return row
        .map(field => {
          // Escape fields that contain commas, quotes, or newlines
          if (
            field.includes(',') ||
            field.includes('"') ||
            field.includes('\n')
          ) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        })
        .join(',');
    };

    let csvContent = buildCSVRow(headers) + '\r\n';
    csvContent += sampleRows.map(buildCSVRow).join('\r\n');

    // Create Excel workbook using xlsx library
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Template');

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    // Save to device
    const filePath = `${RNFS.DownloadDirectoryPath}/customer_import_template.xlsx`;

    RNFS.writeFile(filePath, excelBuffer, 'base64')
      .then(() => {
        Toast.show({
          type: 'success',
          text1: 'Template Downloaded',
          text2: 'Excel template has been downloaded to your device.',
        });
      })
      .catch(error => {
        console.error('Download error:', error);
        Toast.show({
          type: 'error',
          text1: 'Download Failed',
          text2:
            error instanceof Error
              ? error.message
              : 'Failed to download template.',
        });
      });
  };

  // Pagination Logic
  const indexOfLastCustomer = currentPage * customersPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage;
  const currentCustomers = customers.slice(
    indexOfFirstCustomer,
    indexOfLastCustomer,
  );
  const totalPages = Math.ceil(customers.length / customersPerPage);

  // Loading state
  if (isLoadingCompanies) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading companies...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {companies.length === 0 ? (
          <View style={styles.noCompanyContainer}>
            <View style={styles.card}>
              <View style={styles.cardContent}>
                <View style={styles.companyIconContainer}>
                  <Building size={48} color="#3b82f6" />
                </View>
                <Text style={styles.companyTitle}>Company Setup Required</Text>
                <Text style={styles.companyDescription}>
                  Contact us to enable your company account and access all
                  features.
                </Text>
                <View style={styles.contactButtons}>
                  <TouchableOpacity
                    style={styles.phoneButton}
                    onPress={() => Linking.openURL('tel:+91-8989773689')}
                  >
                    <Phone size={20} color="#fff" />
                    <Text style={styles.buttonText}>+91-8989773689</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.emailButton}
                    onPress={() =>
                      Linking.openURL('mailto:support@company.com')
                    }
                  >
                    <Mail size={20} color="#3b82f6" />
                    <Text style={styles.emailButtonText}>Email Us</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>Manage Customers</Text>
                <Text style={styles.subtitle}>
                  A list of all your customers.
                </Text>
              </View>

              {canCreateCustomers && (
                <View style={styles.headerButtons}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => handleOpenForm()}
                  >
                    <PlusCircle size={20} color="#fff" />
                    <Text style={styles.buttonText}>Add Customer</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.outlineButton}
                    onPress={handleImportClick}
                  >
                    <Upload size={20} color="#3b82f6" />
                    <Text style={styles.outlineButtonText}>
                      Import Customers
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Main Content */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading customers...</Text>
              </View>
            ) : !canShowCustomers && !canCreateCustomers ? (
              <View style={styles.restrictedContainer}>
                <User size={48} color="#9ca3af" />
                <Text style={styles.restrictedTitle}>Access Restricted</Text>
                <Text style={styles.restrictedText}>
                  You don't have permission to view or manage customers.
                </Text>
              </View>
            ) : customers.length > 0 && canShowCustomers ? (
              <>
                {/* Customer List */}
                <View style={styles.customerList}>
                  {currentCustomers.map(customer => (
                    <View key={customer._id} style={styles.customerCard}>
                      {/* Customer Header */}
                      <View style={styles.customerHeader}>
                        <View style={styles.customerInfo}>
                          <Text style={styles.customerName}>
                            {capitalizeWords(customer.name)}
                          </Text>
                          <View style={styles.customerTags}>
                            <View style={styles.gstTag}>
                              <Text style={styles.gstTagText}>
                                {customer.gstRegistrationType || 'N/A'}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.tdsTag,
                                customer.isTDSApplicable
                                  ? styles.tdsApplicable
                                  : styles.tdsNotApplicable,
                              ]}
                            >
                              {customer.isTDSApplicable ? (
                                <Check size={12} color="#fff" />
                              ) : (
                                <X size={12} color="#fff" />
                              )}
                              <Text style={styles.tdsTagText}>
                                TDS{' '}
                                {customer.isTDSApplicable
                                  ? 'Applicable'
                                  : 'Not Applicable'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Actions Menu */}
                        <TouchableOpacity
                          style={styles.menuButton}
                          onPress={() => {
                            Alert.alert('Actions', 'Choose an action', [
                              {
                                text: 'Edit',
                                onPress: () => handleOpenForm(customer),
                              },
                              {
                                text: 'Delete',
                                onPress: () => handleOpenDeleteDialog(customer),
                                style: 'destructive',
                              },
                              { text: 'Cancel', style: 'cancel' },
                            ]);
                          }}
                        >
                          <MoreHorizontal size={20} color="#6b7280" />
                        </TouchableOpacity>
                      </View>

                      {/* Contact Info */}
                      {(customer.contactNumber || customer.email) && (
                        <View style={styles.contactSection}>
                          {customer.contactNumber && (
                            <View style={styles.contactItem}>
                              <Phone size={16} color="#3b82f6" />
                              <Text style={styles.contactText}>
                                {customer.contactNumber}
                              </Text>
                            </View>
                          )}
                          {customer.email && (
                            <View style={styles.contactItem}>
                              <Mail size={16} color="#8b5cf6" />
                              <Text style={styles.contactText}>
                                {customer.email}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Address */}
                      {(customer.address ||
                        customer.city ||
                        customer.state ||
                        customer.pincode) && (
                        <View style={styles.addressSection}>
                          <MapPin size={16} color="#10b981" />
                          <View style={styles.addressTextContainer}>
                            {customer.address && (
                              <Text style={styles.addressText}>
                                {customer.address}
                              </Text>
                            )}
                            {(customer.city ||
                              customer.state ||
                              customer.pincode) && (
                              <Text style={styles.locationText}>
                                {[
                                  customer.city,
                                  customer.state,
                                  customer.pincode,
                                ]
                                  .filter(Boolean)
                                  .join(', ')}
                              </Text>
                            )}
                          </View>
                        </View>
                      )}

                      {/* Tax Information */}
                      {(customer.gstin || customer.pan) && (
                        <View style={styles.taxSection}>
                          <Text style={styles.sectionTitle}>
                            Tax Information
                          </Text>
                          {customer.gstin && (
                            <View style={styles.taxItem}>
                              <FileText size={16} color="#6b7280" />
                              <Text style={styles.taxLabel}>GSTIN:</Text>
                              <Text style={styles.taxValue}>
                                {customer.gstin}
                              </Text>
                            </View>
                          )}
                          {customer.pan && (
                            <View style={styles.taxItem}>
                              <Hash size={16} color="#6b7280" />
                              <Text style={styles.taxLabel}>PAN:</Text>
                              <Text style={styles.taxValue}>
                                {customer.pan}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* TDS Section */}
                      {customer.isTDSApplicable && customer.tdsSection && (
                        <View style={styles.tdsSection}>
                          <Percent size={16} color="#10b981" />
                          <View style={styles.tdsInfo}>
                            <Text style={styles.tdsSectionText}>
                              Section: {customer.tdsSection}
                            </Text>
                            {customer.tdsRate && (
                              <Text style={styles.tdsRateText}>
                                Rate: {customer.tdsRate}%
                              </Text>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </View>

                {/* Pagination */}
                {totalPages > 1 && (
                  <View style={styles.pagination}>
                    <TouchableOpacity
                      style={[
                        styles.pageButton,
                        currentPage === 1 && styles.pageButtonDisabled,
                      ]}
                      onPress={() =>
                        setCurrentPage(prev => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft
                        size={20}
                        color={currentPage === 1 ? '#9ca3af' : '#3b82f6'}
                      />
                      <Text
                        style={[
                          styles.pageButtonText,
                          currentPage === 1 && styles.pageButtonTextDisabled,
                        ]}
                      >
                        Previous
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.pageInfo}>
                      Page {currentPage} of {totalPages}
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.pageButton,
                        currentPage === totalPages && styles.pageButtonDisabled,
                      ]}
                      onPress={() =>
                        setCurrentPage(prev => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      <Text
                        style={[
                          styles.pageButtonText,
                          currentPage === totalPages &&
                            styles.pageButtonTextDisabled,
                        ]}
                      >
                        Next
                      </Text>
                      <ChevronRight
                        size={20}
                        color={
                          currentPage === totalPages ? '#9ca3af' : '#3b82f6'
                        }
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : customers.length > 0 &&
              !canShowCustomers &&
              canCreateCustomers ? (
              <View style={styles.blurredContainer}>
                <User size={48} color="#9ca3af" />
                <Text style={styles.restrictedTitle}>Customer Management</Text>
                <Text style={styles.restrictedText}>
                  You can create customers, but viewing existing customer
                  details requires additional permissions.
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <User size={48} color="#9ca3af" />
                <Text style={styles.emptyTitle}>No Customers Found</Text>
                <Text style={styles.emptyText}>
                  Get started by adding your first customer.
                </Text>
                {canCreateCustomers && (
                  <View style={styles.emptyButtons}>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => handleOpenForm()}
                    >
                      <PlusCircle size={20} color="#fff" />
                      <Text style={styles.buttonText}>Add Customer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.outlineButton}
                      onPress={downloadTemplate}
                    >
                      <Download size={20} color="#3b82f6" />
                      <Text style={styles.outlineButtonText}>
                        Download Template
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.outlineButton}
                      onPress={handleImportClick}
                    >
                      <Upload size={20} color="#3b82f6" />
                      <Text style={styles.outlineButtonText}>
                        Import Customers
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Customer Form Modal */}
      <Modal
        visible={isFormOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFormOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedCustomer ? 'Edit Customer' : 'Create New Customer'}
              </Text>
              <Text style={styles.modalDescription}>
                {selectedCustomer
                  ? 'Update the details for this customer.'
                  : 'Fill in the form to add a new customer.'}
              </Text>
            </View>
            <ScrollView style={styles.modalContent}>
              <CustomerForm
                customer={selectedCustomer || undefined}
                onSuccess={handleFormSuccess}
                onCancel={() => setIsFormOpen(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Import Dialog Modal */}
      <Modal
        visible={isImportDialogOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsImportDialogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.importModalContainer}>
            <Text style={styles.importModalTitle}>Import Customers</Text>
            <Text style={styles.importModalDescription}>
              Upload an Excel or CSV file containing customer data. Make sure
              the file follows the template format.
            </Text>

            <TouchableOpacity
              style={styles.importBox}
              onPress={pickFileForImport}
              disabled={isImporting}
            >
              <Upload size={32} color="#9ca3af" />
              <Text style={styles.importBoxText}>Tap to select file</Text>
              <Text style={styles.importBoxSubtext}>
                Supports .xlsx, .xls, .csv files
              </Text>
            </TouchableOpacity>

            <View style={styles.importInfo}>
              <Text style={styles.importInfoTitle}>File Requirements:</Text>
              <Text style={styles.importInfoText}>• Required field: name</Text>
              <Text style={styles.importInfoText}>
                • Optional fields: contactNumber, email, address, city, state,
                pincode, gstin, gstRegistrationType, pan, isTDSApplicable,
                tdsRate, tdsSection
              </Text>
              <Text style={styles.importInfoText}>
                • GST Registration Type: Regular, Composition, Unregistered,
                Consumer, Overseas, Special Economic Zone, Unknown
              </Text>
              <Text style={styles.importInfoText}>
                • isTDSApplicable: true, false, 1, 0
              </Text>
            </View>

            <TouchableOpacity
              style={styles.templateButton}
              onPress={downloadTemplate}
            >
              <Download size={20} color="#3b82f6" />
              <Text style={styles.templateButtonText}>Download Template</Text>
            </TouchableOpacity>

            <View style={styles.importModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsImportDialogOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {isImporting && (
              <View style={styles.importingOverlay}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.importingText}>Importing customers...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Alert */}
      <Modal visible={isAlertOpen} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.alertModalContainer}>
            <Text style={styles.alertModalTitle}>Delete Customer</Text>
            <Text style={styles.alertModalDescription}>
              Are you sure you want to delete this customer? This action cannot
              be undone.
            </Text>
            <View style={styles.alertModalButtons}>
              <TouchableOpacity
                style={styles.alertCancelButton}
                onPress={() => setIsAlertOpen(false)}
              >
                <Text style={styles.alertCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.alertDeleteButton}
                onPress={handleDeleteCustomer}
              >
                <Text style={styles.alertDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  noCompanyContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    alignItems: 'center',
  },
  companyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  companyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  phoneButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emailButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  emailButtonText: {
    color: '#3b82f6',
    fontWeight: '500',
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerText: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    minWidth: 120,
  },
  outlineButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    minWidth: 140,
  },
  outlineButtonText: {
    color: '#3b82f6',
    fontWeight: '500',
    fontSize: 14,
  },
  restrictedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 20,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  restrictedText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  customerList: {
    gap: 16,
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  customerTags: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  gstTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  gstTagText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  tdsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tdsApplicable: {
    backgroundColor: '#10b981',
  },
  tdsNotApplicable: {
    backgroundColor: '#ef4444',
  },
  tdsTagText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  menuButton: {
    padding: 4,
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
  contactText: {
    fontSize: 14,
    color: '#4b5563',
  },
  addressSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
  },
  taxSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  taxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  taxLabel: {
    fontSize: 12,
    color: '#6b7280',
    minWidth: 40,
  },
  taxValue: {
    fontSize: 12,
    color: '#4b5563',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tdsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 6,
  },
  tdsInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tdsSectionText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '500',
  },
  tdsRateText: {
    fontSize: 12,
    color: '#065f46',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  pageButtonTextDisabled: {
    color: '#9ca3af',
  },
  pageInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  blurredContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalContent: {
    maxHeight: Dimensions.get('window').height * 0.7,
  },
  importModalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  importModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  importModalDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  importBox: {
    width: '100%',
    padding: 32,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  importBoxText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4b5563',
    marginTop: 8,
    marginBottom: 4,
  },
  importBoxSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  importInfo: {
    width: '100%',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  importInfoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  importInfoText: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 16,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    marginBottom: 24,
  },
  templateButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  importModalButtons: {
    width: '100%',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  importingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  importingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4b5563',
  },
  alertModalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
  },
  alertModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  alertModalDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  alertModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  alertCancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  alertCancelButtonText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  alertDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  alertDeleteButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});
