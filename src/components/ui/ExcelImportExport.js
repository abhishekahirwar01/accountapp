import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
  StyleSheet,
} from 'react-native';
import { Card, Button, Dialog, Portal, Paragraph } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { pickDocument } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import XLSX from 'xlsx';

const ExcelImportExport = ({
  templateData,
  templateFileName,
  onImportSuccess,
  expectedColumns,
  transformImportData,
  activeTab,
}) => {
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Platform detection
  const isWeb = Platform.OS === 'web';
  const isMobile = Platform.OS !== 'web';

  // Function to download an empty Excel template
  const handleDownloadTemplate = async () => {
    try {
      const templateDataToUse = templateData || [
        activeTab === 'products'
          ? {
              'Item Name': 'Sample Product',
              Stock: '100',
              Unit: 'Piece',
              HSN: '8471',
            }
          : {
              'Service Name': 'Sample Service',
              Description: 'Service description',
              SAC: '998314',
            },
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateDataToUse);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

      const wbout = XLSX.write(workbook, { type: 'binary', bookType: 'xlsx' });
      const base64 = btoa(wbout);
      const fileName =
        templateFileName || `inventory_template_${activeTab}.xlsx`;
      const filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, base64, 'base64');
      Alert.alert(
        'Success',
        `Template downloaded to Downloads folder as ${fileName}`,
      );
    } catch (error) {
      console.error('Template download error:', error);
      Alert.alert('Error', 'Failed to download template');
    }
  };

  // Function to handle file import
  const handleImportFile = async () => {
    try {
      // Request storage permission for Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission Required',
            message:
              'This app needs access to your storage to import Excel files',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission Denied',
            'Storage permission is required to import files',
          );
          return;
        }
      }

      const res = await pickDocument({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        allowMultiSelection: false,
      });

      if (res && res.length > 0) {
        const file = res[0];
        setImportFile(file);

        // Read file content
        const fileContent = await RNFS.readFile(file.uri, 'base64');

        // Convert to binary string
        const binaryString = atob(fileContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Parse Excel file
        const workbook = XLSX.read(bytes, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        // Validate columns
        if (json.length > 0) {
          const firstRow = json[0];
          const fileColumns = Object.keys(firstRow);

          const missingColumns = expectedColumns.filter(
            col => !fileColumns.includes(col),
          );

          if (missingColumns.length > 0) {
            Alert.alert(
              'Invalid file format',
              `Missing columns: ${missingColumns.join(', ')}`,
            );
            setImportFile(null);
            return;
          }
        }

        // Transform data if needed
        const processedData = transformImportData
          ? transformImportData(json)
          : json;
        setImportPreview(processedData);
      }
    } catch (error) {
      if (error.code !== 'DOCUMENT_PICKER_CANCELED') {
        console.error('Import error:', error);
        Alert.alert(
          'Error',
          'Failed to import Excel file. Please check the file format.',
        );
      }
    }
  };

  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;

    setIsImporting(true);
    try {
      // Simulate API call with hardcoded data
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert(
        'Success',
        `${importPreview.length} items imported successfully!`,
      );

      if (onImportSuccess) {
        onImportSuccess(importPreview);
      }

      setImportFile(null);
      setImportPreview([]);
      setIsDialogOpen(false);
    } catch (error) {
      Alert.alert('Import Failed', error.message || 'Something went wrong.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancelImport = () => {
    setImportFile(null);
    setImportPreview([]);
  };

  return (
    <View>
      {/* Desktop View - Buttons (Only show on Web) */}
      {isWeb && (
        <View style={styles.desktopContainer}>
          <Button
            mode="outlined"
            onPress={handleDownloadTemplate}
            style={styles.button}
            icon="download"
          >
            Template
          </Button>

          <Button
            mode="outlined"
            onPress={() => setIsDialogOpen(true)}
            style={styles.button}
            icon="upload"
          >
            Import
          </Button>
        </View>
      )}

      {/* Mobile View - Icon Button (Only show on Mobile) */}
      {isMobile && (
        <View style={styles.mobileContainer}>
          <Button
            mode="outlined"
            onPress={() => setIsDialogOpen(true)}
            style={styles.mobileButton}
            compact
          >
            <Icon name="upload" size={16} />
          </Button>
        </View>
      )}

      {/* Import Dialog */}
      <Portal>
        <Dialog
          visible={isDialogOpen}
          onDismiss={() => setIsDialogOpen(false)}
          style={[styles.dialog, isWeb && styles.desktopDialog]}
        >
          <Dialog.Title>Import/Export</Dialog.Title>
          <Dialog.Content>
            {/* Download Template Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Download Template</Text>
              <Button
                mode="outlined"
                onPress={handleDownloadTemplate}
                style={styles.fullWidthButton}
                icon="download"
              >
                Download Excel Template
              </Button>
              <Text style={styles.helperText}>
                Download the template file to fill in your data
              </Text>
            </View>

            {/* Import Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Import Data</Text>
              <Button
                mode="outlined"
                onPress={handleImportFile}
                style={styles.fullWidthButton}
                icon="file-import"
              >
                Choose Excel File
              </Button>
            </View>

            {/* File Preview */}
            {importFile && (
              <Card style={styles.previewCard}>
                <Card.Content>
                  <View style={styles.fileInfo}>
                    <Icon name="file-document" size={24} color="#10B981" />
                    <View style={styles.fileDetails}>
                      <Text style={styles.fileName}>{importFile.name}</Text>
                      <Text style={styles.fileSize}>
                        {Math.round(importFile.size / 1024)} KB
                      </Text>
                    </View>
                  </View>

                  <View style={[
                    styles.previewActions,
                    isMobile && styles.mobilePreviewActions
                  ]}>
                    <Button
                      mode="contained"
                      onPress={handleConfirmImport}
                      disabled={isImporting}
                      style={styles.confirmButton}
                      icon={isImporting ? 'loading' : 'check'}
                    >
                      {isImporting ? 'Importing...' : 'Confirm Import'}
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={handleCancelImport}
                      disabled={isImporting}
                      icon="close"
                    >
                      Cancel
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsDialogOpen(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  desktopContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  mobileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    marginLeft: 4,
    minWidth: 100,
  },
  mobileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 8,
  },
  desktopDialog: {
    maxWidth: 500,
    alignSelf: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
  },
  fullWidthButton: {
    width: '100%',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  previewCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    marginTop: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fileDetails: {
    marginLeft: 8,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#065F46',
  },
  fileSize: {
    fontSize: 12,
    color: '#047857',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  mobilePreviewActions: {
    flexDirection: 'column',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#10B981',
  },
});

export default ExcelImportExport;