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
} from 'lucide-react-native';
import { VendorForm } from '../vendors/VendorForm';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { capitalizeWords } from '../../lib/utils';
import { BASE_URL } from '../../config';

export function VendorSettings() {
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const vendorsPerPage = 10;

  // Permission checks
  const { permissions: userCaps } = useUserPermissions();
  const [role, setRole] = useState(null);
  const isCustomer = role === 'customer';
  const canShowVendors = !!userCaps?.canShowVendors || isCustomer;
  const canCreateVendors = !!userCaps?.canCreateVendors || isCustomer;

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

  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch vendors.');
      const data = await res.json();
      setVendors(Array.isArray(data) ? data : data.vendors || []);
      setCurrentPage(1);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load vendors',
        text2: error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchVendors();
    setRefreshing(false);
  }, [fetchVendors]);

  const handleOpenForm = (vendor = null) => {
    setSelectedVendor(vendor);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = vendor => {
    setVendorToDelete(vendor);
    setIsAlertOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchVendors();
    const action = selectedVendor ? 'updated' : 'created';
    Toast.show({
      type: 'success',
      text1: `Vendor ${action} successfully`,
      text2: `The vendor details have been ${action}.`,
    });
  };

  const handleDeleteVendor = async () => {
    if (!vendorToDelete) return;
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/vendors/${vendorToDelete._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to delete vendor.');

      Toast.show({
        type: 'success',
        text1: 'Vendor Deleted',
        text2: 'The vendor has been successfully removed.',
      });

      fetchVendors();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setIsAlertOpen(false);
      setVendorToDelete(null);
    }
  };

  // Excel Import Functions
  const handleImportClick = () => {
    setIsImportDialogOpen(true);
  };

  const pickFileForImport = async () => {
    // Resolve pick function dynamically to support multiple export shapes
    let pickFn = null;

    if (DocumentPicker) {
      if (typeof DocumentPicker.pick === 'function')
        pickFn = DocumentPicker.pick;
      else if (typeof DocumentPicker.pickDocument === 'function')
        pickFn = DocumentPicker.pickDocument;
      else if (typeof DocumentPicker.default === 'function')
        pickFn = DocumentPicker.default;
    }

    if (!pickFn) {
      try {
        const pickerModule = require('@react-native-documents/picker');
        pickFn =
          pickerModule.pick ||
          pickerModule.pickDocument ||
          pickerModule.pickSingle ||
          pickerModule.pickMultiple ||
          pickerModule.default?.pick ||
          pickerModule.default?.pickDocument ||
          pickerModule.default;
      } catch (e) {
        try {
          const pickerModule2 = require('react-native-document-picker');
          pickFn =
            pickerModule2.pick ||
            pickerModule2.pickDocument ||
            pickerModule2.pickSingle ||
            pickerModule2.pickMultiple ||
            pickerModule2.default;
        } catch (e2) {
          pickFn = null;
        }
      }
    }

    if (!pickFn || typeof pickFn !== 'function') {
      console.error('Document picker pick function not found', DocumentPicker);
      Alert.alert(
        'Import Unavailable',
        'Document picker native module is not available or not linked. Install @react-native-documents/picker (or react-native-document-picker) and rebuild the app.',
      );
      return;
    }

    try {
      const res = await pickFn({
        type: [
          DocumentPicker?.types?.xlsx ||
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          DocumentPicker?.types?.xls || 'application/vnd.ms-excel',
          DocumentPicker?.types?.csv || 'text/csv',
        ],
        allowMultiSelection: false,
      });

      const result = Array.isArray(res) ? res[0] : res;

      if (!result || !result.uri) {
        Toast.show({
          type: 'error',
          text1: 'Import Failed',
          text2: 'No file selected.',
        });
        return;
      }

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
      const msg = err?.message || err;
      if (
        err?.code === 'DOCUMENT_PICKER_CANCELED' ||
        /cancel/i.test(String(msg))
      ) {
        // user cancelled - ignore
        return;
      }

      console.error('Picker Error:', err);
      Toast.show({
        type: 'error',
        text1: 'Import Failed',
        text2: err?.message || 'Failed to select file.',
      });
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

      const response = await fetch(`${BASE_URL}/api/vendors/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to import vendors');
      }

      let description = `Successfully imported ${data.importedCount} out of ${data.totalCount} vendors.`;

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

      // Fallback alert in case Toast is not visible
      try {
        if (data.importedCount > 0) {
          Alert.alert('Import Completed', description);
        }
      } catch (e) {}

      setIsImportDialogOpen(false);
      fetchVendors();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);

      // If server returned a file-format instruction like "Please upload a CSV file",
      // show a friendly, actionable message to the user instead of the raw server text.
      if (
        /csv/i.test(errMsg) &&
        /(please upload|upload a|only support|invalid file)/i.test(errMsg)
      ) {
        const userMessage = 'Invalid file format. Please upload a CSV.';
        Toast.show({
          type: 'error',
          text1: 'Invalid file format',
          text2: userMessage,
        });
        try {
          Alert.alert('Invalid file format', userMessage);
        } catch (e) {}
      } else {
        Toast.show({
          type: 'error',
          text1: 'Import Failed',
          text2: errMsg || 'Failed to import vendors',
        });
      }
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    // Define CSV headers
    const headers = [
      'Vendor Name',
      'Contact Number',
      'Email',
      'Address',
      'City',
      'State',
      'GSTIN',
      'GST Registration Type',
      'PAN',
      'TDS Applicable',
      'TDS Section',
    ];

    // Define sample data rows
    const sampleRows = [
      [
        'ABC Suppliers',
        '9876543210',
        'contact@abc.com',
        '123 Main Street',
        'Mumbai',
        'Maharashtra',
        '22AAAAA0000A1Z5',
        'Regular',
        'AAAAA0000A',
        'Yes',
        '194C',
      ],
      [
        'XYZ Traders',
        '9876543211',
        'xyz@traders.com',
        '456 Trade Avenue',
        'Delhi',
        'Delhi',
        '07ABCDE1234F1Z5',
        'Composition',
        'ABCDE1234F',
        'No',
        '',
      ],
      [
        'Local Vendor',
        '9876543212',
        'local@vendor.com',
        '789 Local Road',
        'Chennai',
        'Tamil Nadu',
        '',
        'Unregistered',
        '',
        'No',
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
    XLSX.utils.book_append_sheet(wb, ws, 'Vendor Template');

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    // Save to device
    const filePath = `${RNFS.DownloadDirectoryPath}/vendor_import_template.xlsx`;

    RNFS.writeFile(filePath, excelBuffer, 'base64')
      .then(() => {
        Toast.show({
          type: 'success',
          text1: 'Template Downloaded',
          text2: 'Excel template has been downloaded to your device.',
        });
        try {
          Alert.alert(
            'Template Downloaded',
            'Excel template has been downloaded to your device.',
          );
        } catch (e) {}
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
  const indexOfLastVendor = currentPage * vendorsPerPage;
  const indexOfFirstVendor = indexOfLastVendor - vendorsPerPage;
  const currentVendors = vendors.slice(indexOfFirstVendor, indexOfLastVendor);
  const totalPages = Math.ceil(vendors.length / vendorsPerPage);

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
    <View style={styles.container}>
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
                <Text style={styles.title}>Manage Vendors</Text>
                <Text style={styles.subtitle}>
                  A list of all your vendors and suppliers.
                </Text>
              </View>

              {canCreateVendors && (
                <View style={styles.headerButtons}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => handleOpenForm()}
                  >
                    <PlusCircle size={20} color="#fff" />
                    <Text style={styles.buttonText}>Add Vendor</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.outlineButton}
                    onPress={handleImportClick}
                  >
                    <Upload size={20} color="#3b82f6" />
                    <Text style={styles.outlineButtonText}>Import Vendors</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Main Content */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading vendors...</Text>
              </View>
            ) : !canShowVendors && !canCreateVendors ? (
              <View style={styles.restrictedContainer}>
                <Building size={48} color="#9ca3af" />
                <Text style={styles.restrictedTitle}>Access Restricted</Text>
                <Text style={styles.restrictedText}>
                  You don't have permission to view or manage vendors.
                </Text>
              </View>
            ) : vendors.length > 0 && canShowVendors ? (
              <>
                {/* Vendor List */}
                <View style={styles.vendorList}>
                  {currentVendors.map(vendor => (
                    <View key={vendor._id} style={styles.vendorCard}>
                      {/* Vendor Header */}
                      <View style={styles.vendorHeader}>
                        <View style={styles.vendorInfo}>
                          <Text style={styles.vendorName}>
                            {capitalizeWords(vendor.vendorName)}
                          </Text>
                          <View style={styles.vendorTags}>
                            <View style={styles.gstTag}>
                              <Text style={styles.gstTagText}>
                                {vendor.gstRegistrationType}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.tdsTag,
                                vendor.isTDSApplicable
                                  ? styles.tdsApplicable
                                  : styles.tdsNotApplicable,
                              ]}
                            >
                              {vendor.isTDSApplicable ? (
                                <Check size={12} color="#fff" />
                              ) : (
                                <X size={12} color="#fff" />
                              )}
                              <Text style={styles.tdsTagText}>
                                TDS{' '}
                                {vendor.isTDSApplicable
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
                                onPress: () => handleOpenForm(vendor),
                              },
                              {
                                text: 'Delete',
                                onPress: () => handleOpenDeleteDialog(vendor),
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
                      {(vendor.contactNumber || vendor.email) && (
                        <View style={styles.contactSection}>
                          {vendor.contactNumber && (
                            <View style={styles.contactItem}>
                              <Phone size={16} color="#3b82f6" />
                              <Text style={styles.contactText}>
                                {vendor.contactNumber}
                              </Text>
                            </View>
                          )}
                          {vendor.email && (
                            <View style={styles.contactItem}>
                              <Mail size={16} color="#8b5cf6" />
                              <Text style={styles.contactText}>
                                {vendor.email}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Address */}
                      {(vendor.address || vendor.city || vendor.state) && (
                        <View style={styles.addressSection}>
                          <MapPin size={16} color="#10b981" />
                          <View style={styles.addressTextContainer}>
                            {vendor.address && (
                              <Text style={styles.addressText}>
                                {vendor.address}
                              </Text>
                            )}
                            {(vendor.city || vendor.state) && (
                              <Text style={styles.locationText}>
                                {[vendor.city, vendor.state]
                                  .filter(Boolean)
                                  .join(', ')}
                              </Text>
                            )}
                          </View>
                        </View>
                      )}

                      {/* Tax Information */}
                      {(vendor.gstin || vendor.pan) && (
                        <View style={styles.taxSection}>
                          <Text style={styles.sectionTitle}>
                            Tax Information
                          </Text>
                          {vendor.gstin && (
                            <View style={styles.taxItem}>
                              <FileText size={16} color="#6b7280" />
                              <Text style={styles.taxLabel}>GSTIN:</Text>
                              <Text style={styles.taxValue}>
                                {vendor.gstin}
                              </Text>
                            </View>
                          )}
                          {vendor.pan && (
                            <View style={styles.taxItem}>
                              <Hash size={16} color="#6b7280" />
                              <Text style={styles.taxLabel}>PAN:</Text>
                              <Text style={styles.taxValue}>{vendor.pan}</Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* TDS Section */}
                      {vendor.isTDSApplicable && vendor.tdsSection && (
                        <View style={styles.tdsSection}>
                          <Percent size={16} color="#10b981" />
                          <Text style={styles.tdsSectionText}>
                            TDS Section: {vendor.tdsSection}
                          </Text>
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
            ) : vendors.length > 0 && !canShowVendors && canCreateVendors ? (
              <View style={styles.blurredContainer}>
                <Building size={48} color="#9ca3af" />
                <Text style={styles.restrictedTitle}>Vendor Management</Text>
                <Text style={styles.restrictedText}>
                  You can create vendors, but viewing existing vendor details
                  requires additional permissions.
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Building size={48} color="#9ca3af" />
                <Text style={styles.emptyTitle}>No Vendors Found</Text>
                <Text style={styles.emptyText}>
                  Get started by adding your first vendor.
                </Text>
                {canCreateVendors && (
                  <View style={styles.emptyButtons}>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() => handleOpenForm()}
                    >
                      <PlusCircle size={20} color="#fff" />
                      <Text style={styles.buttonText}>Add Vendor</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.outlineButton}
                      onPress={handleImportClick}
                    >
                      <Upload size={20} color="#3b82f6" />
                      <Text style={styles.outlineButtonText}>
                        Import Vendors
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Vendor Form Modal */}
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
                {selectedVendor ? 'Edit Vendor' : 'Create New Vendor'}
              </Text>
              <Text style={styles.modalDescription}>
                {selectedVendor
                  ? 'Update the details for this vendor.'
                  : 'Fill in the form to add a new vendor.'}
              </Text>
            </View>
            <ScrollView style={styles.modalContent}>
              <VendorForm
                vendor={selectedVendor || undefined}
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
            <Text style={styles.importModalTitle}>Import Vendors</Text>
            <Text style={styles.importModalDescription}>
              Upload an Excel or CSV file containing vendor data.
            </Text>

            <TouchableOpacity
              style={styles.importBox}
              onPress={pickFileForImport}
              disabled={isImporting}
            >
              <Upload size={32} color="#9ca3af" />
              <Text style={styles.importBoxText}>Tap to select file</Text>
            </TouchableOpacity>

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
                <Text style={styles.importingText}>Importing vendors...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Alert */}
      <Modal visible={isAlertOpen} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.alertModalContainer}>
            <Text style={styles.alertModalTitle}>Delete Vendor</Text>
            <Text style={styles.alertModalDescription}>
              Are you sure you want to delete this vendor? This action cannot be
              undone.
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
                onPress={handleDeleteVendor}
              >
                <Text style={styles.alertDeleteButtonText}>Delete</Text>
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
    padding: 10,
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
  vendorList: {
    gap: 16,
  },
  vendorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  vendorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  vendorTags: {
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
  tdsSectionText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '500',
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
