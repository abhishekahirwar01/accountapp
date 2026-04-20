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
  PermissionsAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pick } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import * as XLSX from 'xlsx';
import Toast from 'react-native-toast-message';
import {
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
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { usePermissions } from '../../contexts/permission-context';
import { capitalizeWords } from '../../lib/utils';
import { BASE_URL } from '../../config';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

export function VendorSettings() {
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const vendorsPerPage = 10;

  // Permission checks
  const { permissions: userCaps, isAllowed } = useUserPermissions();
  const { permissions: accountPerms } = usePermissions();
  const [userRole, setUserRole] = useState(null);

  const navigation = useNavigation();

  useEffect(() => {
    const init = async () => {
      const role = await AsyncStorage.getItem('role');
      setUserRole(role);
      await fetchCompanies();
      await fetchVendors();
      setInitialLoadComplete(true);
    };
    init();
  }, []);

  // Refresh data when coming back from VendorForm
  useFocusEffect(
    useCallback(() => {
      if (!initialLoadComplete) return;
      fetchVendors();
    }, [initialLoadComplete]),
  );

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
      console.error('fetchCompanies error:', err);
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

  // Navigate to VendorForm (same pattern as UsersScreen)
  const handleOpenForm = useCallback(
    (vendor = null) => {
      navigation.navigate('VendorForm', {
        vendor: vendor || null,
        companies,
      });
    },
    [navigation, companies],
  );

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

  // Calculate pagination
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
    handleOpenForm(vendor);
  };

  // Check if vendor exists by name
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
      const fileContent = await RNFS.readFile(fileUri, 'base64');
      if (!fileContent) throw new Error('Failed to read file content');

      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      let jsonData = [];

      if (isExcel) {
        const workbook = XLSX.read(fileContent, { type: 'base64' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet);
      } else {
        const textContent = atob(fileContent);
        const lines = textContent
          .split('\n')
          .filter(line => line.trim() !== '');
        if (lines.length === 0) throw new Error('CSV file is empty');
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
      return jsonData;
    } catch (error) {
      throw new Error(`Failed to parse file: ${error.message}`);
    }
  };

  const transformVendorData = data => {
    return data.map((row, index) => {
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
        _originalIndex: index + 2,
      };
    });
  };

  const filterExistingVendors = vendorsData => {
    const newVendors = [];
    const existingVendors = [];
    for (const vendor of vendorsData) {
      const existsByName = checkVendorExistsByName(vendor.vendorName);
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

  const importVendorsSequentially = async vendorsData => {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found');
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
        }
      } catch (error) {
        failed.push({
          vendor: vendor.vendorName || `Row ${vendor._originalIndex}`,
          error: error.message,
          type: 'failed',
        });
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return failed;
  };

  const pickFileForImport = async () => {
    try {
      const result = await pick({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
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
      await handleFileImport(file);
    } catch (error) {
      if (
        error.code === 'DOCUMENT_PICKER_CANCELED' ||
        error.message?.includes('cancel')
      )
        return;
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
      const parsedData = await parseFile(file.uri, file.name);
      if (parsedData.length === 0) throw new Error('No data found in file');
      const vendorsData = transformVendorData(parsedData);
      Toast.show({ type: 'info', text1: 'Checking for duplicate vendors...' });
      const { newVendors, existingVendors } =
        filterExistingVendors(vendorsData);
      setSkippedItems(existingVendors);
      if (newVendors.length === 0) {
        setImportStatus('skipped');
        Toast.show({
          type: 'info',
          text1: 'No New Vendors',
          text2: 'All vendors already exist.',
        });
        setIsImporting(false);
        return;
      }
      setImportProgress({ current: 0, total: newVendors.length });
      const failed = await importVendorsSequentially(newVendors);
      if (failed.length === 0 && newVendors.length > 0) {
        setImportStatus('success');
        Toast.show({
          type: 'success',
          text1: 'Import Successful',
          text2: `Imported ${newVendors.length} vendors.`,
        });
        await fetchVendors();
        setTimeout(() => {
          setIsImportModalOpen(false);
          setImportStatus(null);
        }, 3000);
      } else if (newVendors.length - failed.length > 0) {
        setImportStatus('partial');
        setFailedItems(failed);
        Toast.show({ type: 'success', text1: 'Partial Success' });
        await fetchVendors();
      } else {
        setImportStatus('failed');
        setFailedItems(failed);
        Toast.show({ type: 'error', text1: 'Import Failed' });
      }
    } catch (error) {
      setImportStatus('failed');
      Toast.show({
        type: 'error',
        text1: 'Import Failed',
        text2: error.message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = async () => {
    setIsDownloading(true);
    try {
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
      const note = [
        ['IMPORTANT NOTES:', '', '', '', '', '', '', '', '', '', '', ''],
        [
          '1. vendorName is REQUIRED and should be unique',
          '', '', '', '', '', '', '', '', '', '', '', '',
        ],
        [
          '2. Vendors with duplicate names will be skipped automatically',
          '', '', '', '', '', '', '', '', '', '', '', '',
        ],
        [
          '3. For TDS Applicable, use "Yes"/"No" or "true"/"false"',
          '', '', '', '', '', '', '', '', '', '', '', '',
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
      const ws = XLSX.utils.aoa_to_sheet([...note, ...sampleData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vendor Template');
      const excelBuffer = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileName = `vendor_import_template_${Date.now()}.xlsx`;
      let filePath = '';
      if (Platform.OS === 'android') {
        if (Platform.Version < 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permission Denied', 'Storage permission is required.');
            setIsDownloading(false);
            return;
          }
        }
        filePath = `${RNFS.ExternalStorageDirectoryPath}/Download/${fileName}`;
      } else {
        filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      }
      await RNFS.writeFile(filePath, excelBuffer, 'base64');
      if (Platform.OS === 'android') {
        try {
          await RNFS.scanFile(filePath);
        } catch (scanErr) {
          console.warn('scanFile failed', scanErr);
        }
      }
      Alert.alert(
        'Download Successful',
        `File saved to: ${
          Platform.OS === 'android' ? 'Downloads Folder' : 'Documents'
        }\n\nName: ${fileName}`,
        [
          { text: 'OK' },
          {
            text: 'Open File',
            onPress: () => {
              const fileUri =
                Platform.OS === 'ios' ? `file://${filePath}` : filePath;
              FileViewer.open(fileUri).catch(() =>
                Toast.show({
                  type: 'info',
                  text1: 'File saved',
                  text2: filePath,
                }),
              );
            },
          },
        ],
      );
      Toast.show({
        type: 'success',
        text1: 'Downloaded',
        text2: 'Template saved to Downloads folder',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Download Failed',
        text2: error.message,
      });
    } finally {
      setIsDownloading(false);
    }
  };

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
        message: 'Some vendors imported successfully.',
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
        {skippedItems.length > 0 && (
          <View style={styles.skippedItemsContainer}>
            <Text style={styles.skippedItemsTitle}>
              Skipped ({skippedItems.length}):
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
        {failedItems.length > 0 && (
          <View style={styles.failedItemsContainer}>
            <Text style={styles.failedItemsTitle}>
              Failed ({failedItems.length}):
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
      </View>
      <View style={styles.detailsSection}>
        {item.contactNumber ? (
          <View style={styles.detailItem}>
            <View style={styles.iconCircle}>
              <Phone size={13} color="#3b82f6" />
            </View>
            <Text style={styles.detailText}>{item.contactNumber}</Text>
          </View>
        ) : null}
        {item.email ? (
          <View style={styles.detailItem}>
            <View style={styles.iconCircle}>
              <Mail size={13} color="#8b5cf6" />
            </View>
            <Text style={styles.detailText}>{item.email}</Text>
          </View>
        ) : null}
        {item.address ? (
          <View style={styles.detailItem}>
            <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
              <MapPin size={13} color="#10b981" />
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
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => handleEditVendor(item)}
        >
          <Edit2 size={14} color="#ffffff" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteVendor(item)}
        >
          <Trash2 size={14} color="#ef4444" />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoadingCompanies)
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading...</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.navTitle}>Manage Vendors</Text>
          <Text style={styles.navSub}>
            A list of all your vendors and suppliers.
          </Text>
          {canCreateVendors && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.mainActionBtn}
                onPress={() => handleOpenForm()}
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
            contentContainerStyle={{ paddingBottom: 100 }}
            scrollEnabled={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            ListEmptyComponent={
              <View style={styles.emptyView}>
                <Building size={48} color="#cbd5e1" />
                <Text style={styles.emptyText}>
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
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f1f5f9',
  },
  restrictedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
  contactButtons: { marginTop: 8 },
  setupCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
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
    marginBottom: 20,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: 'white', fontWeight: '600', fontSize: 15 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  navTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
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
  mainActionText: { color: 'white', fontWeight: '600', fontSize: 13 },
  secondaryActionBtn: {
    backgroundColor: 'white',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    flex: 1,
  },
  secondaryActionText: { color: '#334155', fontWeight: '600', fontSize: 13 },
  searchContainer: {
    paddingHorizontal: 16,
    backgroundColor: 'white',
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b', paddingVertical: 0 },
  clearSearchBtn: { padding: 4 },
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
  clearSearchEmptyText: { color: 'white', fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vendorName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  regBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  regBadgeText: { color: '#2563eb', fontSize: 10, fontWeight: '600' },
  tdsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  bgTdsOn: { backgroundColor: '#f0fdf4' },
  bgTdsOff: { backgroundColor: '#fef2f2' },
  textTdsOn: { color: '#166534' },
  textTdsOff: { color: '#991b1b' },
  tdsBadgeText: { fontSize: 10, fontWeight: '600' },
  moreBtn: { padding: 6 },
  dropdown: {
    position: 'absolute',
    top: 24,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10,
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
    paddingHorizontal: 14,
    gap: 10,
  },
  dropdownItemText: { fontSize: 14, fontWeight: '500', color: '#334155' },
  dropdownItemTextDanger: { color: '#ef4444' },
  dropdownDivider: { height: 1, backgroundColor: '#f1f5f9' },
  detailsSection: { marginTop: 14, gap: 10 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: { fontSize: 13, color: '#334155' },
  subDetailText: { fontSize: 11, color: '#64748b' },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#8b77ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 6,
  },
  editBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 6,
  },
  deleteBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
  footerPagination: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 4,
  },
  nextBtn: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  pageNavText: { fontWeight: '600', fontSize: 13, color: '#1e293b' },
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
  importModalTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  importModalContent: { paddingHorizontal: 20, paddingVertical: 16 },
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
  featureInfoText: { fontSize: 13, color: '#1e40af', flex: 1, lineHeight: 18 },
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
    fontSize: 15,
    color: '#334155',
    marginTop: 12,
    marginBottom: 6,
    fontWeight: '500',
  },
  uploadSubText: { fontSize: 13, color: '#64748b' },
  downloadTemplateBtn: {
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingVertical: 10,
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
    marginBottom: 16,
  },
  requirementsContainer: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  requirementItem: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    marginLeft: 6,
  },
  emptyView: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 15,
  },
  blurEffect: { opacity: 0.5 },
  importLoadingContainer: { alignItems: 'center', padding: 30 },
  importLoadingText: {
    fontSize: 15,
    color: '#334155',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  processingNote: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 3 },
  progressPercentage: { fontSize: 13, color: '#64748b', marginTop: 8 },
  importStatusContainer: { alignItems: 'center', padding: 20 },
  importStatusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  importStatusMessage: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  skippedItemsContainer: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 12,
  },
  skippedItemsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 6,
  },
  skippedList: { maxHeight: 80 },
  skippedItem: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 2,
  },
  failedItemsContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 12,
  },
  failedItemsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 6,
  },
  failedList: { maxHeight: 80 },
  failedItem: {
    fontSize: 12,
    color: '#991b1b',
    marginBottom: 2,
  },
  autoCloseMessage: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 12,
  },
  closeImportBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  closeImportBtnText: { color: 'white', fontWeight: '600', fontSize: 15 },
});
