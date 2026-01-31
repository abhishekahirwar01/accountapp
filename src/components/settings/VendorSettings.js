import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pick } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import * as XLSX from 'xlsx';
import Toast from 'react-native-toast-message';
import {
  MoreHorizontal,
  PlusCircle,
  Building,
  User,
  Check,
  X,
  Phone,
  Mail,
  MapPin,
  Upload,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Trash2,
  AlertCircle,
  Info,
  Search,
} from 'lucide-react-native';

import { VendorForm } from '../vendors/VendorForm';
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

export function VendorSettings() {
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const [failedItems, setFailedItems] = useState([]);
  const [skippedItems, setSkippedItems] = useState([]);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const vendorsPerPage = 10;

  // Permission checks
  const { permissions: userCaps, isAllowed } = useUserPermissions();
  const { permissions: accountPerms } = usePermissions();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const init = async () => {
      const role = await AsyncStorage.getItem('role');
      setUserRole(role);
      await fetchCompanies();
      await fetchVendors();
    };
    init();
  }, []);

  const isCustomer = userRole === 'customer';

  const accountAllowsShow = accountPerms?.canShowVendors !== false;
  const accountAllowsCreate = accountPerms?.canCreateVendors !== false;
  const userAllowsShow = isAllowed
    ? isAllowed('canShowVendors') || isCustomer
    : userCaps?.canShowVendors !== false;
  const userAllowsCreate = isAllowed
    ? isAllowed('canCreateVendors')
    : !!userCaps?.canCreateVendors;

  const canShowVendors = accountAllowsShow && userAllowsShow;
  const canCreateVendors = accountAllowsCreate && userAllowsCreate;

  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : data.companies || []);
    } catch (err) {
    } finally {
      setIsLoadingCompanies(false);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVendors(Array.isArray(data) ? data : data.vendors || []);
      setCurrentPage(1);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to load vendors' });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Filter vendors based on search term
  const filteredVendors = React.useMemo(() => {
    let data = vendors;
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(
        v =>
          v.vendorName?.toLowerCase().includes(lowerTerm) ||
          v.contactNumber?.includes(lowerTerm) ||
          v.email?.toLowerCase().includes(lowerTerm),
      );
    }
    return data;
  }, [vendors, searchTerm]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Calculate pagination based on filtered results
  const indexOfLastVendor = currentPage * vendorsPerPage;
  const indexOfFirstVendor = indexOfLastVendor - vendorsPerPage;
  const currentVendors = filteredVendors.slice(
    indexOfFirstVendor,
    indexOfLastVendor,
  );
  const totalPages = Math.ceil(filteredVendors.length / vendorsPerPage);

  const handleDeleteVendor = async vendor => {
    setOpenDropdownId(null);
    Alert.alert(
      'Delete Vendor',
      `Are you sure you want to delete ${vendor.vendorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const res = await fetch(`${BASE_URL}/api/vendors/${vendor._id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                Toast.show({ type: 'success', text1: 'Vendor Deleted' });
                fetchVendors();
              }
            } catch (error) {
              Toast.show({ type: 'error', text1: 'Delete failed' });
            }
          },
        },
      ],
    );
  };

  const handleEditVendor = vendor => {
    setOpenDropdownId(null);
    setSelectedVendor(vendor);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchVendors();
    Toast.show({
      type: 'success',
      text1: selectedVendor
        ? 'Vendor updated successfully'
        : 'Vendor created successfully',
    });
    setSelectedVendor(null);
  };

  // Check if vendor exists by name (case insensitive)
  const checkVendorExistsByName = vendorName => {
    if (!vendorName || !vendors.length) return false;

    const normalizedVendorName = vendorName.trim().toLowerCase();
    return vendors.some(
      vendor =>
        vendor.vendorName?.trim().toLowerCase() === normalizedVendorName,
    );
  };

  // Check if vendor exists by GSTIN
  const checkVendorExistsByGSTIN = gstin => {
    if (!gstin || !vendors.length) return false;

    const normalizedGSTIN = gstin.trim().toUpperCase();
    return vendors.some(
      vendor => vendor.gstin?.trim().toUpperCase() === normalizedGSTIN,
    );
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
      throw new Error(`Failed to parse file: ${error.message}`);
    }
  };

  // Transform CSV/Excel data to match vendor schema
  const transformVendorData = data => {
    return data.map((row, index) => {
      // Normalize and clean data
      const vendorName = (
        row.vendorName ||
        row['Vendor Name'] ||
        row['vendor name'] ||
        ''
      ).trim();
      const contactNumber = (
        row.contactNumber ||
        row['Contact Number'] ||
        row['contact number'] ||
        row.phone ||
        ''
      ).trim();
      const gstin = (row.gstin || row.GSTIN || row.gst || '')
        .toUpperCase()
        .trim();

      return {
        vendorName,
        contactNumber,
        email: (row.email || row.Email || '').trim().toLowerCase(),
        address: (row.address || row.Address || '').trim(),
        city: (row.city || row.City || '').trim(),
        state: (row.state || row.State || '').trim(),
        gstin,
        gstRegistrationType: (
          row.gstRegistrationType ||
          row['GST Registration Type'] ||
          'Regular'
        ).trim(),
        pan: (row.pan || row.PAN || '').toUpperCase().trim(),
        isTDSApplicable:
          row.isTDSApplicable === 'true' ||
          row.isTDSApplicable === true ||
          row['TDS Applicable'] === 'true' ||
          (row.isTDSApplicable || '').toString().toLowerCase() === 'yes' ||
          (row.isTDSApplicable || '').toString().toLowerCase() === 'y',
        tdsRate: parseFloat(row.tdsRate || row['TDS Rate'] || 0),
        tdsSection: (row.tdsSection || row['TDS Section'] || '').trim(),
        // Add reference for tracking
        _originalIndex: index + 2, // Excel row number (header is row 1)
      };
    });
  };

  // Filter out existing vendors
  const filterExistingVendors = vendorsData => {
    const newVendors = [];
    const existingVendors = [];

    for (const vendor of vendorsData) {
      // Check by vendor name (case insensitive)
      const existsByName = checkVendorExistsByName(vendor.vendorName);

      // Check by GSTIN if available
      const existsByGSTIN = vendor.gstin
        ? checkVendorExistsByGSTIN(vendor.gstin)
        : false;

      if (existsByName || existsByGSTIN) {
        existingVendors.push({
          vendor: vendor.vendorName || `Row ${vendor._originalIndex}`,
          reason: existsByName
            ? 'Vendor name already exists'
            : 'GSTIN already exists',
          type: 'skipped',
        });
      } else {
        newVendors.push(vendor);
      }
    }

    return { newVendors, existingVendors };
  };

  // Import vendors one by one
  const importVendorsSequentially = async vendorsData => {
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      throw new Error('Authentication token not found');
    }

    const failed = [];
    const endpoint = `${BASE_URL}/api/vendors`;

    for (let i = 0; i < vendorsData.length; i++) {
      const vendor = vendorsData[i];
      setImportProgress({ current: i + 1, total: vendorsData.length });

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(vendor),
        });

        const responseData = await response.json();

        if (!response.ok) {
          failed.push({
            vendor: vendor.vendorName || `Row ${vendor._originalIndex}`,
            error: responseData.message || `Status: ${response.status}`,
            type: 'failed',
          });
        } else {
          console.log(
            `Successfully imported vendor ${i + 1}:`,
            vendor.vendorName,
          );
        }
      } catch (error) {
        failed.push({
          vendor: vendor.vendorName || `Row ${vendor._originalIndex}`,
          error: error.message,
          type: 'failed',
        });
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return failed;
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

      // Process the file
      await handleFileImport(file);
    } catch (error) {
      if (
        error.code === 'DOCUMENT_PICKER_CANCELED' ||
        error.message?.includes('cancel')
      ) {
        return;
      }

      Toast.show({
        type: 'error',
        text1: 'Import Failed',
        text2: error?.message || 'Failed to select file.',
      });
    }
  };

  const handleFileImport = async file => {
    setIsImporting(true);
    setImportStatus(null);
    setFailedItems([]);
    setSkippedItems([]);
    setImportProgress({ current: 0, total: 0 });

    try {
      // Parse the file
      const parsedData = await parseFile(file.uri, file.name);

      if (parsedData.length === 0) {
        throw new Error('No data found in file');
      }

      // Transform data
      const vendorsData = transformVendorData(parsedData);

      console.log('Transformed vendors data:', vendorsData);

      // Step 1: Check for existing vendors locally
      Toast.show({
        type: 'info',
        text1: 'Checking for duplicate vendors...',
      });

      const { newVendors, existingVendors } =
        filterExistingVendors(vendorsData);

      // Store skipped items
      setSkippedItems(existingVendors);

      // If all vendors already exist
      if (newVendors.length === 0) {
        setImportStatus('skipped');
        Toast.show({
          type: 'info',
          text1: 'No New Vendors',
          text2: 'All vendors in the file already exist in the system.',
        });
        setIsImporting(false);
        return;
      }

      // Step 2: Import only new vendors
      setImportProgress({ current: 0, total: newVendors.length });

      Toast.show({
        type: 'info',
        text1: 'Importing new vendors...',
        text2: `Found ${existingVendors.length} existing, ${newVendors.length} new vendors to import`,
      });

      const failed = await importVendorsSequentially(newVendors);

      // Update status
      if (failed.length === 0 && newVendors.length > 0) {
        setImportStatus('success');
        Toast.show({
          type: 'success',
          text1: 'Import Successful',
          text2: `Successfully imported ${newVendors.length} new vendors. ${existingVendors.length} vendors already existed.`,
        });

        // Refresh vendor list
        await fetchVendors();

        // Close modal after delay
        setTimeout(() => {
          setIsImportModalOpen(false);
          setImportStatus(null);
        }, 3000);
      } else if (newVendors.length - failed.length > 0) {
        setImportStatus('partial');
        setFailedItems(failed);

        Toast.show({
          type: 'success',
          text1: 'Partial Success',
          text2: `${newVendors.length - failed.length} imported, ${
            existingVendors.length
          } already existed, ${failed.length} failed.`,
        });

        // Refresh vendor list for successful imports
        await fetchVendors();
      } else {
        setImportStatus('failed');
        setFailedItems(failed);
        Toast.show({
          type: 'error',
          text1: 'Import Failed',
          text2: 'Failed to import any new vendors.',
        });
      }
    } catch (error) {
      setImportStatus('failed');
      Toast.show({
        type: 'error',
        text1: 'Import Failed',
        text2: error.message || 'Failed to import vendors.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = async () => {
    setIsDownloading(true);

    try {
      // Create sample vendor data
      const headers = [
        'vendorName',
        'contactNumber',
        'email',
        'address',
        'city',
        'state',
        'gstin',
        'gstRegistrationType',
        'pan',
        'isTDSApplicable',
        'tdsRate',
        'tdsSection',
      ];

      // Add note about duplicate prevention
      const note = [
        ['IMPORTANT NOTES:', '', '', '', '', '', '', '', '', '', '', ''],
        [
          '1. vendorName is REQUIRED and should be unique',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ],
        [
          '2. Vendors with duplicate names will be skipped automatically',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ],
        [
          '3. For TDS Applicable, use "Yes"/"No" or "true"/"false"',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ],
        ['', '', '', '', '', '', '', '', '', '', '', ''],
        headers,
      ];

      const sampleData = [
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
          '2',
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
          '0',
          '',
        ],
        [
          'LMN Enterprises',
          '9876543212',
          'info@lmn.com',
          '789 Business Park',
          'Bangalore',
          'Karnataka',
          '',
          'Unregistered',
          '',
          'false',
          '0',
          '',
        ],
      ];

      // Create workbook
      const ws = XLSX.utils.aoa_to_sheet([...note, ...sampleData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vendor Template');

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      // Save to downloads (match CustomerSettings behaviour)
      const fileName = `vendor_import_template_${Date.now()}.xlsx`;

      // Determine Path Based On Platform
      let filePath = '';
      if (Platform.OS === 'android') {
        // Path to the public Downloads folder
        filePath = `${RNFS.ExternalStorageDirectoryPath}/Download/${fileName}`;
      } else {
        filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      }

      await RNFS.writeFile(filePath, excelBuffer, 'base64');

      // Ensure the file appears in Android file manager immediately
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
      Toast.show({
        type: 'error',
        text1: 'Download Failed',
        text2: error.message || 'Failed to download template.',
      });
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
        message: 'All new vendors imported successfully.',
      },
      partial: {
        icon: AlertCircle,
        color: '#f59e0b',
        title: 'Partial Success',
        message: `Some vendors imported successfully.`,
      },
      failed: {
        icon: X,
        color: '#ef4444',
        title: 'Import Failed',
        message: 'Failed to import vendors.',
      },
      skipped: {
        icon: Info,
        color: '#3b82f6',
        title: 'No New Vendors',
        message: 'All vendors in the file already exist in the system.',
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

        {/* Show existing/skipped vendors */}
        {skippedItems.length > 0 && (
          <View style={styles.skippedItemsContainer}>
            <Text style={styles.skippedItemsTitle}>
              <Info size={14} color="#856404" /> Skipped ({skippedItems.length}
              ):
            </Text>
            <ScrollView style={styles.skippedList} nestedScrollEnabled={true}>
              {skippedItems.slice(0, 5).map((item, index) => (
                <Text key={index} style={styles.skippedItem}>
                  • {item.vendor} ({item.reason})
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
                  • {item.vendor}: {item.error}
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
            setIsImportModalOpen(false);
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

  const renderVendor = ({ item }) => (
    <View style={[styles.card, !canShowVendors && styles.blurEffect]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.vendorName}>
            {capitalizeWords(item.vendorName)}
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.regBadge}>
              <Text style={styles.regBadgeText}>
                {item.gstRegistrationType || 'Unregistered'}
              </Text>
            </View>
            <View
              style={[
                styles.tdsBadge,
                item.isTDSApplicable ? styles.bgTdsOn : styles.bgTdsOff,
              ]}
            >
              {item.isTDSApplicable ? (
                <Check size={10} color="#166534" />
              ) : (
                <X size={10} color="#991b1b" />
              )}
              <Text
                style={[
                  styles.tdsBadgeText,
                  item.isTDSApplicable ? styles.textTdsOn : styles.textTdsOff,
                ]}
              >
                TDS{' '}
                {item.isTDSApplicable
                  ? item.tdsSection || 'Applicable'
                  : 'Not Applicable'}
              </Text>
            </View>
          </View>
        </View>
        <View>
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => {
              setOpenDropdownId(openDropdownId === item._id ? null : item._id);
            }}
          >
            <MoreHorizontal size={20} color="#64748b" />
          </TouchableOpacity>

          {openDropdownId === item._id && (
            <View style={styles.dropdown}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleEditVendor(item)}
              >
                <Edit2 size={16} color="#3b82f6" />
                <Text style={styles.dropdownItemText}>Edit</Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleDeleteVendor(item)}
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

      <View style={styles.detailsSection}>
        {item.contactNumber ? (
          <View style={styles.detailItem}>
            <View style={styles.iconCircle}>
              <Phone size={14} color="#3b82f6" />
            </View>
            <Text style={styles.detailText}>{item.contactNumber}</Text>
          </View>
        ) : null}

        {item.email ? (
          <View style={styles.detailItem}>
            <View style={styles.iconCircle}>
              <Mail size={14} color="#8b5cf6" />
            </View>
            <Text style={styles.detailText}>{item.email}</Text>
          </View>
        ) : null}

        {item.address ? (
          <View style={styles.detailItem}>
            <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
              <MapPin size={14} color="#10b981" />
            </View>
            <View>
              <Text style={styles.detailText}>{item.address}</Text>
              <Text style={styles.subDetailText}>
                {item.city}, {item.state}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (isLoadingCompanies)
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );

  if (companies.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.setupCard}>
          <View style={styles.iconCircleLarge}>
            <Building size={48} color="#3b82f6" />
          </View>
          <Text style={styles.setupTitle}>Company Setup Required</Text>
          <Text style={styles.setupSub}>
            Contact us to enable your company account and access all features.
          </Text>
          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => Linking.openURL('tel:+918989773689')}
            >
              <Phone size={18} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.btnText}>+91-8989773689</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // If user cannot show vendors AND cannot create vendors, show access restricted
  if (!canShowVendors && !canCreateVendors) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.restrictedContainer}>
          <User size={48} color="#9ca3af" />
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedText}>
            You don't have permission to view or manage vendors.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={() => setOpenDropdownId(null)}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.navTitle}>Manage Vendors</Text>
          <Text style={styles.navSub}>
            A list of all your vendors and suppliers.
          </Text>

          {canCreateVendors && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.mainActionBtn}
                onPress={() => {
                  setSelectedVendor(null);
                  setIsFormOpen(true);
                }}
              >
                <PlusCircle
                  size={18}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.mainActionText}>Add Vendor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => setIsImportModalOpen(true)}
                disabled={isImporting}
              >
                {isImporting ? (
                  <ActivityIndicator size="small" color="#1e293b" />
                ) : (
                  <Upload
                    size={18}
                    color="#1e293b"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text style={styles.secondaryActionText}>Import Vendors</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Search size={18} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search vendors by name, phone or email..."
              placeholderTextColor="#94a3b8"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchBtn}
                onPress={() => setSearchTerm('')}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.vendorCount}>
            Showing {filteredVendors.length} vendor
            {filteredVendors.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {vendors.length > 0 && !canShowVendors && canCreateVendors ? (
          <View style={styles.centerContainer}>
            <View style={styles.restrictedContainer}>
              <Building size={48} color="#9ca3af" />
              <Text style={styles.restrictedTitle}>Vendor Management</Text>
              <Text style={styles.restrictedText}>
                You can create vendors, but viewing existing vendor details
                requires additional permissions.
              </Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={currentVendors}
            renderItem={renderVendor}
            keyExtractor={item => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={fetchVendors}
              />
            }
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 100,
            }}
            scrollEnabled={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            ListEmptyComponent={
              <View style={styles.emptyView}>
                <Building size={48} color="#cbd5e1" />
                <Text style={{ color: '#64748b', marginTop: 10 }}>
                  {searchTerm
                    ? 'No vendors match your search'
                    : 'No vendors found'}
                </Text>
                {searchTerm && (
                  <TouchableOpacity
                    style={styles.clearSearchEmptyBtn}
                    onPress={() => setSearchTerm('')}
                  >
                    <Text style={styles.clearSearchEmptyText}>
                      Clear search
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}

        {filteredVendors.length > 0 && canShowVendors && (
          <View style={styles.footerPagination}>
            <TouchableOpacity
              disabled={currentPage === 1}
              onPress={() => setCurrentPage(p => p - 1)}
              style={[styles.pageNavBtn, currentPage === 1 && { opacity: 0.4 }]}
            >
              <ChevronLeft size={20} color="#1e293b" />
              <Text style={styles.pageNavText}>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={currentPage >= totalPages}
              onPress={() => setCurrentPage(p => p + 1)}
              style={[
                styles.pageNavBtn,
                styles.nextBtn,
                currentPage >= totalPages && { opacity: 0.4 },
              ]}
            >
              <Text style={[styles.pageNavText, { color: 'white' }]}>Next</Text>
              <ChevronRight size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Vendor Form Modal */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="md:max-w-2xl max-w-sm grid-rows-[auto,1fr,auto] max-h-[90vh] p-0">
            <DialogHeader className="p-6">
              <DialogTitle>
                {selectedVendor ? 'Edit Vendor' : 'Create New Vendor'}
              </DialogTitle>
              <DialogDescription>
                {selectedVendor
                  ? 'Update the details for this vendor.'
                  : 'Fill in the form to add a new vendor.'}
              </DialogDescription>
            </DialogHeader>
            <VendorForm
              vendor={selectedVendor || undefined}
              onSuccess={handleFormSuccess}
            />
          </DialogContent>
        </Dialog>

        {/* Import Modal */}
        <Modal
          visible={isImportModalOpen}
          animationType="fade"
          transparent={true}
          onRequestClose={() => !isImporting && setIsImportModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.importModalContainer}>
              <View style={styles.importModalHeader}>
                <Text style={styles.importModalTitle}>
                  {importStatus ? 'Import Status' : 'Import Vendors'}
                </Text>
                <TouchableOpacity
                  onPress={() => !isImporting && setIsImportModalOpen(false)}
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
                      ? `Processing ${importProgress.current} of ${importProgress.total} vendors...`
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
                    Checking for duplicate vendors...
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
                    Upload a CSV or Excel file containing vendor data.
                  </Text>

                  <View style={styles.featureInfo}>
                    <Info size={16} color="#3b82f6" />
                    <Text style={styles.featureInfoText}>
                      Duplicate vendors (by name) will be automatically skipped
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
                      • vendorName is REQUIRED (must be unique)
                    </Text>
                    <Text style={styles.requirementItem}>
                      • Vendors with duplicate names will be skipped
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

        <Toast />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  restrictedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  iconCircleLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactButtons: {
    width: '100%',
  },
  setupCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  setupSub: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  navSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  actionRow: {
    marginTop: 16,
    gap: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  mainActionBtn: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    flex: 1,
  },
  mainActionText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  secondaryActionBtn: {
    backgroundColor: 'white',
    borderHorizontal: 1,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    flex: 1,
  },
  secondaryActionText: { color: '#1e293b', fontWeight: '600', fontSize: 15 },
  // Search Styles
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  vendorCount: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  clearSearchEmptyBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  clearSearchEmptyText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    paddingBottom: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vendorName: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  regBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  regBadgeText: { color: '#2563eb', fontSize: 11, fontWeight: '700' },
  tdsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  bgTdsOn: { backgroundColor: '#f0fdf4' },
  bgTdsOff: { backgroundColor: '#fef2f2' },
  textTdsOn: { color: '#166534' },
  textTdsOff: { color: '#991b1b' },
  tdsBadgeText: { fontSize: 11, fontWeight: '700' },
  moreBtn: {
    padding: 8,
    borderRadius: 8,
  },
  dropdown: {
    position: 'absolute',
    top: 22,
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
  detailsSection: { marginTop: 16, gap: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  subDetailText: { fontSize: 12, color: '#64748b' },
  footerPagination: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  nextBtn: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  pageNavText: { fontWeight: '700', fontSize: 14, color: '#1e293b' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },

  // Form Modal Styles
  formModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    maxHeight: '90%',
    width: '100%',
    overflow: 'hidden',
  },
  formModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  formModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  formModalContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  // Import Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  emptyView: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  blurEffect: {
    opacity: 0.5,
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
});
