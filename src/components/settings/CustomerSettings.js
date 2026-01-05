import React, { useState, useEffect, useCallback } from 'react';
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
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pick } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import * as XLSX from 'xlsx';
import Toast from 'react-native-toast-message';
import {
  MoreHorizontal,
  PlusCircle,
  Building,
  Check,
  X,
  FileText,
  Hash,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Percent,
  Upload,
  ChevronLeft,
  ChevronRight,
  Download,
  User,
  AlertCircle,
  Info,
} from 'lucide-react-native';
import { CustomerForm } from '../customers/CustomerForm';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { usePermissions } from '../../contexts/permission-context';
import { capitalizeWords } from '../../lib/utils';
import { BASE_URL } from '../../config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/Dialog';

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
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Import states
  const [importStatus, setImportStatus] = useState(null);
  const [failedItems, setFailedItems] = useState([]);
  const [skippedItems, setSkippedItems] = useState([]);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const [isDownloading, setIsDownloading] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const customersPerPage = 10;

  // Permission checks
  const { permissions: userCaps, isAllowed } = useUserPermissions();
  const { permissions: accountPerms } = usePermissions();
  const [role, setRole] = useState(null);

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

  const isCustomer = role === 'customer';

  // Logic matched to VendorSettings - combine account and user permissions
  const accountAllowsShow = accountPerms?.canShowCustomers !== false;
  const accountAllowsCreate = accountPerms?.canCreateCustomers !== false;
  const userAllowsShow = isAllowed
    ? isAllowed('canShowCustomers') || isCustomer
    : userCaps?.canShowCustomers !== false;
  const userAllowsCreate = isAllowed
    ? isAllowed('canCreateCustomers')
    : !!userCaps?.canCreateCustomers;

  const canShowCustomers = accountAllowsShow && userAllowsShow;
  const canCreateCustomers = accountAllowsCreate && userAllowsCreate;

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

  const handleEditCustomer = customer => {
    setOpenDropdownId(null);
    handleOpenForm(customer);
  };

  const handleDeleteCustomerFromDropdown = customer => {
    setOpenDropdownId(null);
    handleOpenDeleteDialog(customer);
  };

  // ==================== IMPORT FUNCTIONS ====================

  const handleImportClick = () => {
    setIsImportDialogOpen(true);
  };

  const pickFileForImport = async () => {
    try {
      const result = await pick({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
          'text/csv', // CSV
        ],
        allowMultiSelection: false,
      });

      const file = Array.isArray(result) ? result[0] : result;

      if (!file || !file.uri) {
        Toast.show({
          type: 'error',
          text1: 'Import Failed',
          text2: 'No file selected.',
        });
        return;
      }

      // Check file size (10MB limit)
      if (file.size && file.size > 10 * 1024 * 1024) {
        Toast.show({
          type: 'error',
          text1: 'File too large',
          text2: 'Please select a file smaller than 10MB.',
        });
        return;
      }

      // Process the file
      await handleFileImport(file);
    } catch (error) {
      if (
        error.code === 'DOCUMENT_PICKER_CANCELED' ||
        error.message?.includes('cancel')
      ) {
        return;
      }
      console.error('Picker Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Import Failed',
        text2: error?.message || 'Failed to select file.',
      });
    }
  };

  // Parse Excel/CSV file
  const parseFile = async (fileUri, fileName) => {
    try {
      // Read file content
      const fileContent = await RNFS.readFile(fileUri, 'base64');

      if (!fileContent) {
        throw new Error('Failed to read file content');
      }

      // Determine file type
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

      let jsonData = [];

      if (isExcel) {
        // Parse Excel file
        const workbook = XLSX.read(fileContent, { type: 'base64' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet);
      } else {
        // Parse CSV file
        const textContent = atob(fileContent);
        const lines = textContent
          .split('\n')
          .filter(line => line.trim() !== '');

        if (lines.length === 0) {
          throw new Error('CSV file is empty');
        }

        const headers = lines[0]
          .split(',')
          .map(h => h.trim().replace(/"/g, ''));

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i]
            .split(',')
            .map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          jsonData.push(row);
        }
      }

      console.log('Parsed data:', jsonData);
      return jsonData;
    } catch (error) {
      console.error('Parse error:', error);
      throw new Error(`Failed to parse file: ${error.message}`);
    }
  };

  // Transform CSV/Excel data to match customer schema

  const transformCustomerData = data => {
    return data.map((row, index) => {
      // Normalize and clean data
      // Convert to string first before calling trim
      const name = String(
        row.name || row['Customer Name'] || row['customer name'] || '',
      ).trim();
      const contactNumber = String(
        row.contactNumber ||
          row['Contact Number'] ||
          row['contact number'] ||
          row.phone ||
          '',
      ).trim();
      const gstin = String(row.gstin || row.GSTIN || row.gst || '')
        .toUpperCase()
        .trim();

      return {
        name,
        contactNumber,
        email: String(row.email || row.Email || '')
          .trim()
          .toLowerCase(),
        address: String(row.address || row.Address || '').trim(),
        city: String(row.city || row.City || '').trim(),
        state: String(row.state || row.State || '').trim(),
        pincode: String(row.pincode || row.Pincode || row.pin || '').trim(),
        gstin,
        gstRegistrationType: String(
          row.gstRegistrationType || row['GST Registration Type'] || 'Regular',
        ).trim(),
        pan: String(row.pan || row.PAN || '')
          .toUpperCase()
          .trim(),
        isTDSApplicable:
          row.isTDSApplicable === 'true' ||
          row.isTDSApplicable === true ||
          row['TDS Applicable'] === 'true' ||
          String(row.isTDSApplicable || '').toLowerCase() === 'yes' ||
          String(row.isTDSApplicable || '').toLowerCase() === 'y',
        tdsRate: parseFloat(row.tdsRate || row['TDS Rate'] || 0),
        tdsSection: String(row.tdsSection || row['TDS Section'] || '').trim(),
        // Add reference for tracking
        _originalIndex: index + 2, // Excel row number (header is row 1)
      };
    });
  };

  // Check if customer exists by name (case insensitive)
  const checkCustomerExistsByName = customerName => {
    if (!customerName || !customers.length) return false;

    const normalizedCustomerName = customerName.trim().toLowerCase();
    return customers.some(
      customer =>
        customer.name?.trim().toLowerCase() === normalizedCustomerName,
    );
  };

  // Filter out existing customers
  const filterExistingCustomers = customersData => {
    const newCustomers = [];
    const existingCustomers = [];

    for (const customer of customersData) {
      // Check by customer name (case insensitive)
      const existsByName = checkCustomerExistsByName(customer.name);

      if (existsByName) {
        existingCustomers.push({
          customer: customer.name || `Row ${customer._originalIndex}`,
          reason: 'Customer name already exists',
          type: 'skipped',
        });
      } else {
        newCustomers.push(customer);
      }
    }

    return { newCustomers, existingCustomers };
  };

  // Import customers one by one
  const importCustomersSequentially = async customersData => {
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      throw new Error('Authentication token not found');
    }

    const failed = [];
    const endpoint = `${BASE_URL}/api/parties`;

    for (let i = 0; i < customersData.length; i++) {
      const customer = customersData[i];
      setImportProgress({ current: i + 1, total: customersData.length });

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(customer),
        });

        const responseData = await response.json();

        if (!response.ok) {
          failed.push({
            customer: customer.name || `Row ${customer._originalIndex}`,
            error: responseData.message || `Status: ${response.status}`,
            type: 'failed',
          });
          console.error(`Failed to import customer ${i + 1}:`, responseData);
        } else {
          console.log(
            `Successfully imported customer ${i + 1}:`,
            customer.name,
          );
        }
      } catch (error) {
        failed.push({
          customer: customer.name || `Row ${customer._originalIndex}`,
          error: error.message,
          type: 'failed',
        });
        console.error(`Error importing customer ${i + 1}:`, error);
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return failed;
  };

  const handleFileImport = async file => {
    setIsImporting(true);
    setImportStatus(null);
    setFailedItems([]);
    setSkippedItems([]);
    setImportProgress({ current: 0, total: 0 });

    try {
      console.log('Processing file:', file.name);

      // Parse the file
      const parsedData = await parseFile(file.uri, file.name);

      if (parsedData.length === 0) {
        throw new Error('No data found in file');
      }

      // Transform data
      const customersData = transformCustomerData(parsedData);

      console.log('Transformed customers data:', customersData);

      // Step 1: Check for existing customers locally
      Toast.show({
        type: 'info',
        text1: 'Checking for duplicate customers...',
      });

      const { newCustomers, existingCustomers } =
        filterExistingCustomers(customersData);

      // Store skipped items
      setSkippedItems(existingCustomers);

      // If all customers already exist
      if (newCustomers.length === 0) {
        setImportStatus('skipped');
        Toast.show({
          type: 'info',
          text1: 'No New Customers',
          text2: 'All customers in the file already exist in the system.',
        });
        setIsImporting(false);
        return;
      }

      // Step 2: Import only new customers
      setImportProgress({ current: 0, total: newCustomers.length });

      Toast.show({
        type: 'info',
        text1: 'Importing new customers...',
        text2: `Found ${existingCustomers.length} existing, ${newCustomers.length} new customers to import`,
      });

      const failed = await importCustomersSequentially(newCustomers);

      // Update status
      if (failed.length === 0 && newCustomers.length > 0) {
        setImportStatus('success');
        Toast.show({
          type: 'success',
          text1: 'Import Successful',
          text2: `Successfully imported ${newCustomers.length} new customers. ${existingCustomers.length} customers already existed.`,
        });

        // Refresh customer list
        await fetchCustomers();

        // Close modal after delay
        setTimeout(() => {
          setIsImportDialogOpen(false);
          setImportStatus(null);
        }, 3000);
      } else if (newCustomers.length - failed.length > 0) {
        setImportStatus('partial');
        setFailedItems(failed);

        Toast.show({
          type: 'success',
          text1: 'Partial Success',
          text2: `${newCustomers.length - failed.length} imported, ${
            existingCustomers.length
          } already existed, ${failed.length} failed.`,
        });

        // Refresh customer list for successful imports
        await fetchCustomers();
      } else {
        setImportStatus('failed');
        setFailedItems(failed);
        Toast.show({
          type: 'error',
          text1: 'Import Failed',
          text2: 'Failed to import any new customers.',
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus('failed');
      Toast.show({
        type: 'error',
        text1: 'Import Failed',
        text2: error.message || 'Failed to import customers.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = async () => {
    setIsDownloading(true);
    try {
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
      const note = [
        ['IMPORTANT NOTES:', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['1. name is REQUIRED and should be unique'],
        ['2. Customers with duplicate names will be skipped automatically'],
        ['3. For TDS Applicable, use "Yes"/"No" or "true"/"false"'],
        ['', '', '', '', '', '', '', '', '', '', '', '', ''],
        headers,
      ];

      const sampleData = [
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
      ];

      const ws = XLSX.utils.aoa_to_sheet([...note, ...sampleData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customer Template');
      const excelBuffer = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      const fileName = `customer_template_${Date.now()}.xlsx`;

      // Determine Path Based on Platform
      let filePath = '';
      if (Platform.OS === 'android') {
        // Path to the public Downloads folder
        filePath = `${RNFS.ExternalStorageDirectoryPath}/Download/${fileName}`;
      } else {
        filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      }

      await RNFS.writeFile(filePath, excelBuffer, 'base64');

      // CRITICAL STEP: Scan file so it appears in Media/File Manager immediately
      if (Platform.OS === 'android') {
        await RNFS.scanFile(filePath);
      }

      Alert.alert(
        'Download Successful',
        `File saved to: ${
          Platform.OS === 'android' ? 'Downloads Folder' : 'Documents'
        }\n\nName: ${fileName}`,
        [{ text: 'OK' }],
      );

      Toast.show({
        type: 'success',
        text1: 'Downloaded',
        text2: 'Template saved to Downloads folder',
      });
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert(
        'Error',
        'Could not save file. Please check storage permissions.',
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // Render import status screen
  const renderImportStatus = () => {
    if (!importStatus) return null;

    const statusConfig = {
      success: {
        icon: Check,
        color: '#10b981',
        title: 'Import Successful!',
        message: 'All new customers imported successfully.',
      },
      partial: {
        icon: AlertCircle,
        color: '#f59e0b',
        title: 'Partial Success',
        message: `Some customers imported successfully.`,
      },
      failed: {
        icon: X,
        color: '#ef4444',
        title: 'Import Failed',
        message: 'Failed to import customers.',
      },
      skipped: {
        icon: Info,
        color: '#3b82f6',
        title: 'No New Customers',
        message: 'All customers in the file already exist in the system.',
      },
    };

    const config = statusConfig[importStatus];
    const IconComponent = config.icon;

    return (
      <View style={styles.importStatusContainer}>
        <IconComponent size={48} color={config.color} />
        <Text style={[styles.importStatusTitle, { color: config.color }]}>
          {config.title}
        </Text>
        <Text style={styles.importStatusMessage}>{config.message}</Text>

        {/* Show existing/skipped customers */}
        {skippedItems.length > 0 && (
          <View style={styles.skippedItemsContainer}>
            <Text style={styles.skippedItemsTitle}>
              <Info size={14} color="#856404" /> Skipped ({skippedItems.length}
              ):
            </Text>
            <ScrollView style={styles.skippedList} nestedScrollEnabled={true}>
              {skippedItems.slice(0, 5).map((item, index) => (
                <Text key={index} style={styles.skippedItem}>
                  • {item.customer} ({item.reason})
                </Text>
              ))}
              {skippedItems.length > 5 && (
                <Text style={styles.skippedItem}>
                  ... and {skippedItems.length - 5} more
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* Show failed items */}
        {failedItems.length > 0 && (
          <View style={styles.failedItemsContainer}>
            <Text style={styles.failedItemsTitle}>
              <AlertCircle size={14} color="#dc3545" /> Failed (
              {failedItems.length}):
            </Text>
            <ScrollView style={styles.failedList} nestedScrollEnabled={true}>
              {failedItems.slice(0, 5).map((item, index) => (
                <Text key={index} style={styles.failedItem}>
                  • {item.customer}: {item.error}
                </Text>
              ))}
              {failedItems.length > 5 && (
                <Text style={styles.failedItem}>
                  ... and {failedItems.length - 5} more
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        {importStatus === 'success' && (
          <Text style={styles.autoCloseMessage}>Closing in 3 seconds...</Text>
        )}

        <TouchableOpacity
          style={[styles.closeImportBtn, { backgroundColor: config.color }]}
          onPress={() => {
            setIsImportDialogOpen(false);
            setImportStatus(null);
            setSkippedItems([]);
            setFailedItems([]);
          }}
        >
          <Text style={styles.closeImportBtnText}>
            {importStatus === 'success' ? 'Done' : 'Close'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ==================== END IMPORT FUNCTIONS ====================

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
    <TouchableWithoutFeedback onPress={() => setOpenDropdownId(null)}>
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
                  <Text style={styles.companyTitle}>
                    Company Setup Required
                  </Text>
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
                          <View>
                            <TouchableOpacity
                              style={styles.menuButton}
                              onPress={() => {
                                setOpenDropdownId(
                                  openDropdownId === customer._id
                                    ? null
                                    : customer._id,
                                );
                              }}
                            >
                              <MoreHorizontal size={20} color="#6b7280" />
                            </TouchableOpacity>

                            {openDropdownId === customer._id && (
                              <View style={styles.dropdown}>
                                <TouchableOpacity
                                  style={styles.dropdownItem}
                                  onPress={() => handleEditCustomer(customer)}
                                >
                                  <Edit2 size={16} color="#3b82f6" />
                                  <Text style={styles.dropdownItemText}>
                                    Edit
                                  </Text>
                                </TouchableOpacity>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity
                                  style={styles.dropdownItem}
                                  onPress={() =>
                                    handleDeleteCustomerFromDropdown(customer)
                                  }
                                >
                                  <Trash2 size={16} color="#ef4444" />
                                  <Text
                                    style={[
                                      styles.dropdownItemText,
                                      styles.dropdownItemTextDanger,
                                    ]}
                                  >
                                    Delete
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
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
                          currentPage === totalPages &&
                            styles.pageButtonDisabled,
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
                  <Text style={styles.restrictedTitle}>
                    Customer Management
                  </Text>
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
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="md:max-w-2xl max-w-sm grid-rows-[auto,1fr,auto] max-h-[90vh] p-0">
            <DialogHeader className="p-6">
              <DialogTitle>
                {selectedCustomer ? 'Edit Customer' : 'Create New Customer'}
              </DialogTitle>
              <DialogDescription>
                {selectedCustomer
                  ? 'Update the details for this customer.'
                  : 'Fill in the form to add a new customer.'}
              </DialogDescription>
            </DialogHeader>
            <CustomerForm
              customer={selectedCustomer || undefined}
              onSuccess={handleFormSuccess}
            />
          </DialogContent>
        </Dialog>

        {/* Import Dialog Modal */}
        <Modal
          visible={isImportDialogOpen}
          animationType="fade"
          transparent={true}
          onRequestClose={() => !isImporting && setIsImportDialogOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.importModalContainer}>
              <View style={styles.importModalHeader}>
                <Text style={styles.importModalTitle}>
                  {importStatus ? 'Import Status' : 'Import Customers'}
                </Text>
                <TouchableOpacity
                  onPress={() => !isImporting && setIsImportDialogOpen(false)}
                  disabled={isImporting}
                >
                  <X size={24} color="black" />
                </TouchableOpacity>
              </View>

              {isImporting ? (
                <View style={styles.importLoadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.importLoadingText}>
                    {importProgress.current <= importProgress.total
                      ? `Processing ${importProgress.current} of ${importProgress.total} customers...`
                      : 'Processing file...'}
                  </Text>
                  {importProgress.total > 0 && (
                    <>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${
                                (importProgress.current /
                                  importProgress.total) *
                                100
                              }%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressPercentage}>
                        {Math.round(
                          (importProgress.current / importProgress.total) * 100,
                        )}
                        %
                      </Text>
                    </>
                  )}
                  <Text style={styles.processingNote}>
                    Checking for duplicate customers...
                  </Text>
                </View>
              ) : importStatus ? (
                renderImportStatus()
              ) : (
                <ScrollView
                  style={styles.importModalContent}
                  scrollEnabled={true}
                >
                  <Text style={styles.importDescription}>
                    Upload a CSV or Excel file containing customer data.
                  </Text>

                  <View style={styles.featureInfo}>
                    <Info size={16} color="#3b82f6" />
                    <Text style={styles.featureInfoText}>
                      Duplicate customers (by name) will be automatically
                      skipped
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.uploadBox}
                    onPress={pickFileForImport}
                    disabled={isImporting}
                  >
                    <Upload size={40} color="#94a3b8" />
                    <Text style={styles.uploadText}>
                      Tap to select file (CSV or Excel)
                    </Text>
                    <Text style={styles.uploadSubText}>
                      Supports .xlsx, .xls, .csv files
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.downloadTemplateBtn}
                    onPress={downloadTemplate}
                    disabled={isImporting || isDownloading}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color="#3b82f6" />
                    ) : (
                      <>
                        <Download
                          size={18}
                          color="#3b82f6"
                          style={{ marginRight: 8 }}
                        />
                        <Text style={styles.downloadTemplateBtnText}>
                          Download Template
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.templateHint}>
                    Download the template file to ensure proper formatting.
                  </Text>

                  <View style={styles.requirementsContainer}>
                    <Text style={styles.requirementsTitle}>
                      Important Notes:
                    </Text>
                    <Text style={styles.requirementItem}>
                      • name is REQUIRED (must be unique)
                    </Text>
                    <Text style={styles.requirementItem}>
                      • Customers with duplicate names will be skipped
                    </Text>
                    <Text style={styles.requirementItem}>
                      • For TDS Applicable, use "Yes"/"No" or "true"/"false"
                    </Text>
                  </View>
                </ScrollView>
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
                Are you sure you want to delete this customer? This action
                cannot be undone.
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
      </View>
    </TouchableWithoutFeedback>
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
    paddingBottom: 20,
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
    padding: 8,
    borderRadius: 8,
  },
  dropdown: {
    position: 'absolute',
    top: 24,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    minWidth: 100,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  dropdownItemTextDanger: {
    color: '#ef4444',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
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
  importModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    maxHeight: '85%',
    width: '100%',
    overflow: 'hidden',
  },
  importModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  importModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  importLoadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  importLoadingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  processingNote: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  importModalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  importDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  featureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  featureInfoText: {
    fontSize: 13,
    color: '#1e40af',
    flex: 1,
    lineHeight: 18,
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f8fafc',
  },
  uploadText: {
    fontSize: 16,
    color: '#334155',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  uploadSubText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  downloadTemplateBtn: {
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  downloadTemplateBtnText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  templateHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  requirementsContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  requirementItem: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
    marginLeft: 8,
  },
  importStatusContainer: {
    alignItems: 'center',
    padding: 24,
    maxHeight: '70vh',
  },
  importStatusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  importStatusMessage: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  skippedItemsContainer: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    width: '100%',
    marginBottom: 12,
  },
  skippedItemsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skippedList: {
    maxHeight: 100,
  },
  skippedItem: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
    paddingLeft: 4,
  },
  failedItemsContainer: {
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#f5c6cb',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    width: '100%',
    marginBottom: 12,
  },
  failedItemsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#721c24',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  failedList: {
    maxHeight: 100,
  },
  failedItem: {
    fontSize: 12,
    color: '#721c24',
    marginBottom: 4,
    paddingLeft: 4,
  },
  autoCloseMessage: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 16,
  },
  closeImportBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  closeImportBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
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
