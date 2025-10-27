import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  ToastAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Checkbox, Button } from 'react-native-paper';
import RNPickerSelect from 'react-native-picker-select';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import XLSX from 'xlsx';
import { BASE_URL } from '../../config';
import Share from 'react-native-share';
import FileViewer from 'react-native-file-viewer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ExportTransaction = ({
  selectedClientId,
  companyMap = new Map(),
  defaultCompanyId = null,
}) => {
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState('ALL');
  const [types, setTypes] = useState({
    sales: true,
    purchases: true,
    receipts: true,
    payments: true,
    journals: true,
  });
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [useDateRange, setUseDateRange] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clients, setClients] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [exportedFilePath, setExportedFilePath] = useState(null);

  const allTypes = ['sales', 'purchases', 'receipts', 'payments', 'journals'];

  useEffect(() => {
    setCompanyId(defaultCompanyId || 'ALL');
  }, [defaultCompanyId]);

  const getAuthToken = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('No auth token');
    return token;
  };

  const fetchClients = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${BASE_URL}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setClients(data);
    } catch {
      Alert.alert('Error', 'Failed to fetch clients');
    }
  };

  useEffect(() => {
    if (open) fetchClients();
  }, [open]);

  const toggleAll = checked => {
    const next = {};
    allTypes.forEach(t => (next[t] = checked));
    setTypes(next);
  };

  const formatDate = date => (date ? date.toISOString().split('T')[0] : '');

  const getDownloadPath = fileName => {
    if (Platform.OS === 'android')
      return `${RNFS.DownloadDirectoryPath}/${fileName}`;
    return `${RNFS.DocumentDirectoryPath}/${fileName}`;
  };

  const shareFile = async filePath => {
    try {
      const shareOptions = {
        title: 'Share Excel File',
        message: 'Here is the exported transaction data 📊',
        url: `file://${filePath}`,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      await Share.open(shareOptions);
    } catch (err) {
      console.log('Share cancelled or failed:', err);
    }
  };

  const openFile = async filePath => {
    try {
      if (!filePath) {
        Alert.alert('Error', 'No file found to open. Please export the file again.');
        return;
      }

      const exists = await RNFS.exists(filePath);
      if (!exists) {
        Alert.alert(
          'File Not Found',
          'The exported file could not be found. Please export the transactions again.',
          [{ text: 'OK', onPress: () => setShowSuccessModal(false) }]
        );
        return;
      }

      // Check if file is readable
      const fileInfo = await RNFS.stat(filePath);
      if (fileInfo.size === 0) {
        Alert.alert(
          'File Error',
          'The exported file is empty or corrupted. Please try exporting again.',
          [{ text: 'OK', onPress: () => setShowSuccessModal(false) }]
        );
        return;
      }

      await FileViewer.open(filePath, { 
        showOpenWithDialog: true,
        showAppsSuggestions: true,
        displayName: 'Transactions Export'
      });

    } catch (error) {
      console.error('Open file error:', error);
      
      // Handle specific error cases
      if (error.message.includes('No app associated') || error.message.includes('mime type')) {
        Alert.alert(
          'No App Found',
          `No application found to open Excel files.\n\nPlease install a spreadsheet app like:\n• Microsoft Excel\n• Google Sheets\n• WPS Office\n\nAfter installing, try opening the file again.`,
          [
            { text: 'OK', style: 'cancel' },
            { 
              text: 'Share Instead', 
              onPress: () => shareFile(filePath)
            }
          ]
        );
      } else if (error.message.includes('permission') || error.message.includes('Permission')) {
        Alert.alert(
          'Permission Denied',
          'Unable to open file due to permission issues. Please check app permissions or try sharing the file instead.',
          [
            { text: 'OK', style: 'cancel' },
            { 
              text: 'Share File', 
              onPress: () => shareFile(filePath)
            }
          ]
        );
      } else {
        Alert.alert(
          'Cannot Open File',
          `Unable to open the file. You can:\n\n1. Find it in your Downloads folder\n2. Open it with a spreadsheet app\n3. Share it to another device\n\nFile location: ${filePath}`,
          [
            { text: 'OK', style: 'cancel' },
            { 
              text: 'Share File', 
              onPress: () => shareFile(filePath)
            },
            {
              text: 'View in Folder',
              onPress: async () => {
                try {
                  const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
                  await FileViewer.open(dirPath);
                } catch (dirError) {
                  Alert.alert(
                    'Info',
                    `File saved to:\n${filePath}\n\nYou can find it in your Downloads folder.`
                  );
                }
              }
            }
          ]
        );
      }
    }
  };

  const exportToExcel = async () => {
    try {
      setBusy(true);
      const chosen = allTypes.filter(t => types[t]);
      if (!chosen.length) {
        Alert.alert('Error', 'Choose at least one transaction type.');
        return;
      }

      const wb = XLSX.utils.book_new();
      const headers = [
        'party',
        'date',
        'amount',
        'description',
        'invoice type',
        'company',
        'gstin',
        'client',
      ];

      // Dummy sheet data for demonstration
      const ws = XLSX.utils.aoa_to_sheet([
        headers,
        [
          'Sample Party',
          '2025-10-27',
          '1000',
          'Test',
          'Sales',
          'DemoCo',
          '22AAAA',
          'Client1',
        ],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileName = `transactions_${formatDate(new Date())}.xlsx`;
      const filePath = getDownloadPath(fileName);
      await RNFS.writeFile(filePath, wbout, 'base64');

      setExportedFilePath(filePath);
      setShowSuccessModal(true);

      if (Platform.OS === 'android') {
        ToastAndroid.show('✅ File saved to Downloads!', ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  const onFromDateChange = (event, selectedDate) => {
    setShowFromDatePicker(false);
    if (selectedDate) setDateRange(prev => ({ ...prev, from: selectedDate }));
  };

  const onToDateChange = (event, selectedDate) => {
    setShowToDatePicker(false);
    if (selectedDate) setDateRange(prev => ({ ...prev, to: selectedDate }));
  };

  const companyOptions = [
    { label: 'All companies', value: 'ALL' },
    ...Array.from(companyMap.entries()).map(([id, name]) => ({
      label: name,
      value: id,
    })),
  ];

  return (
    <View>
      <Button
        mode="outlined"
        onPress={() => setOpen(true)}
        icon="download"
        style={styles.exportButton}
      >
        Export
      </Button>

      {/* Export Settings Modal */}
      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeIcon}
              onPress={() => setOpen(false)}
            >
              <Icon name="close" size={22} color="#333" />
            </TouchableOpacity>

            <ScrollView>
              <Text style={styles.modalTitle}>Export Transactions</Text>

              {/* Company Picker */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Company</Text>
                <RNPickerSelect
                  onValueChange={setCompanyId}
                  items={companyOptions}
                  value={companyId}
                  placeholder={{}}
                  style={pickerSelectStyles}
                />
              </View>

              {/* Date Range */}
              <View style={styles.section}>
                <View style={styles.checkboxRow}>
                  <Checkbox
                    status={useDateRange ? 'checked' : 'unchecked'}
                    onPress={() => setUseDateRange(!useDateRange)}
                  />
                  <Text style={styles.checkboxLabel}>Use Date Range</Text>
                </View>

                {useDateRange && (
                  <View style={styles.dateRangeContainer}>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowFromDatePicker(true)}
                    >
                      <Text>
                        From:{' '}
                        {dateRange.from
                          ? formatDate(dateRange.from)
                          : 'Select'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowToDatePicker(true)}
                    >
                      <Text>
                        To:{' '}
                        {dateRange.to ? formatDate(dateRange.to) : 'Select'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Transaction Types */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Transaction Types</Text>
                <View style={styles.checkboxRow}>
                  <Checkbox
                    status={
                      allTypes.every(t => types[t]) ? 'checked' : 'unchecked'
                    }
                    onPress={() => toggleAll(!allTypes.every(t => types[t]))}
                  />
                  <Text style={styles.checkboxLabel}>Select All</Text>
                </View>
                {allTypes.map(t => (
                  <View key={t} style={styles.checkboxRow}>
                    <Checkbox
                      status={types[t] ? 'checked' : 'unchecked'}
                      onPress={() =>
                        setTypes(prev => ({ ...prev, [t]: !prev[t] }))
                      }
                    />
                    <Text>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.modalFooter}>
                <Button onPress={() => setOpen(false)}>Cancel</Button>
                <Button
                  mode="contained"
                  onPress={exportToExcel}
                  loading={busy}
                  disabled={busy}
                >
                  Export XLSX
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Date pickers */}
        {showFromDatePicker && (
          <DateTimePicker
            value={dateRange.from || new Date()}
            mode="date"
            display="default"
            onChange={onFromDateChange}
          />
        )}
        {showToDatePicker && (
          <DateTimePicker
            value={dateRange.to || new Date()}
            mode="date"
            display="default"
            onChange={onToDateChange}
          />
        )}
      </Modal>

      {/* ✅ Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successBox}>
            <TouchableOpacity
              style={styles.closeIconTop}
              onPress={() => setShowSuccessModal(false)}
            >
              <Icon name="close" size={22} color="#000" />
            </TouchableOpacity>

            <Icon name="check-circle" size={48} color="#28a745" style={styles.successIcon} />
            <Text style={styles.successTitle}>Export Successful!</Text>
            <Text style={styles.successSubtitle}>
              Your Excel file has been saved to Downloads
            </Text>

            <View style={styles.iconRow}>
              <TouchableOpacity
                style={styles.iconContainer}
                onPress={() => shareFile(exportedFilePath)}
              >
                <Icon name="share-variant" size={36} color="#007AFF" />
                <Text style={styles.iconLabel}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconContainer}
                onPress={() => openFile(exportedFilePath)}
              >
                <Icon name="file-excel" size={36} color="#28a745" />
                <Text style={styles.iconLabel}>Open</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconContainer}
                onPress={async () => {
                  try {
                    const dirPath = Platform.OS === 'android' 
                      ? RNFS.DownloadDirectoryPath 
                      : RNFS.DocumentDirectoryPath;
                    await FileViewer.open(dirPath);
                  } catch (error) {
                    Alert.alert(
                      'Info',
                      `File saved to:\n${exportedFilePath}`
                    );
                  }
                }}
              >
                <Icon name="folder-open" size={36} color="#FF9500" />
                <Text style={styles.iconLabel}>View Folder</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.helpText}>
              Having trouble opening? Install a spreadsheet app like Excel or Google Sheets.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  exportButton: { margin: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    margin: 20,
    position: 'relative',
  },
  closeIcon: { position: 'absolute', right: 10, top: 10, zIndex: 10 },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
  section: { marginVertical: 12 },
  sectionTitle: { fontWeight: '600', marginBottom: 6 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  checkboxLabel: { marginLeft: 8 },
  dateRangeContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBox: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 10,
    alignItems: 'center',
    width: '80%',
    position: 'relative',
  },
  closeIconTop: { position: 'absolute', top: 10, right: 10 },
  successTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    fontSize: 14,
  },
  successIcon: {
    marginBottom: 10,
  },
  iconRow: { 
    flexDirection: 'row', 
    justifyContent: 'center',
    marginBottom: 15,
  },
  iconContainer: { 
    alignItems: 'center', 
    marginHorizontal: 15,
    padding: 10,
  },
  iconLabel: { 
    marginTop: 5, 
    fontSize: 12,
    textAlign: 'center',
  },
  helpText: {
    marginTop: 10,
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});

const pickerSelectStyles = {
  inputIOS: { 
    fontSize: 16, 
    paddingVertical: 10, 
    color: 'black',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
  },
  inputAndroid: { 
    fontSize: 16, 
    paddingVertical: 10, 
    color: 'black',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
  },
};

export default ExportTransaction;