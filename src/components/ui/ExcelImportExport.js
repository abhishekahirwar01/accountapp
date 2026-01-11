import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Card, Button, Dialog, Portal } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { pick } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import XLSX from 'xlsx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { BASE_URL } from '../../config';
import { useToast } from '../../components/hooks/useToast';

const ExcelImportExport = ({
  templateData,
  templateFileName,
  onImportSuccess,
  expectedColumns,
  transformImportData,
  activeTab,
}) => {
  const { toast } = useToast();
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [importStatus, setImportStatus] = useState(''); // 'success', 'partial', 'failed'
  const [failedItems, setFailedItems] = useState([]);

  // Download template function - Fixed for Android permissions
  const handleDownloadTemplate = async () => {
    try {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

      const fileName = templateFileName || 'template.xlsx';

      if (Platform.OS === 'web') {
        const blob = new Blob([wbout], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Show success Alert
        Alert.alert('Download Success', 'Template downloaded successfully!', [
          { text: 'OK', style: 'default' },
        ]);
      } else {
        // Android/iOS - Fixed download path for better compatibility
        let filePath = '';
        let successMessage = '';

        if (Platform.OS === 'android') {
          // Use ExternalDirectoryPath instead of ExternalStorageDirectoryPath
          filePath = `${RNFS.ExternalDirectoryPath}/${fileName}`;
          successMessage = `File saved to App Files\n\nName: ${fileName}`;
        } else {
          // iOS
          filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
          successMessage = `File saved to Documents\n\nName: ${fileName}`;
        }

        await RNFS.writeFile(filePath, wbout, 'base64');

        // For Android, try to copy to Downloads folder if possible
        if (Platform.OS === 'android') {
          try {
            // Try multiple possible Download paths
            const downloadPaths = [
              `${RNFS.ExternalStorageDirectoryPath}/Download/${fileName}`,
              `${RNFS.DownloadDirectoryPath}/${fileName}`,
              `/storage/emulated/0/Download/${fileName}`,
            ];

            for (const downloadPath of downloadPaths) {
              try {
                await RNFS.copyFile(filePath, downloadPath);
                await RNFS.scanFile(downloadPath);
                filePath = downloadPath;
                successMessage = `File saved to Downloads\n\nName: ${fileName}`;
                break;
              } catch (copyErr) {
                // Continue trying other paths
                continue;
              }
            }
          } catch (err) {
            console.log('Could not copy to Downloads, using app storage:', err);
            // Keep using app storage if download folder copy fails
          }
        }

        // Scan the file to make it appear in file manager
        await RNFS.scanFile(filePath);

        // Show success Alert for mobile
        Alert.alert('Download Success', successMessage, [
          { text: 'OK', style: 'default' },
        ]);
      }
    } catch (error) {
      console.error('Download error:', error);

      // Show failure Alert
      Alert.alert(
        'Download Failed',
        error.message || 'Failed to download template',
        [{ text: 'OK', style: 'cancel' }],
      );
    }
  };

  // Handle file import
  const handleImportFile = async () => {
    setErrorMessage('');
    setImportStatus('');
    setFailedItems([]);

    try {
      const result = await pick({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/octet-stream',
        ],
        allowMultiSelection: false,
      });

      if (result && result.length > 0) {
        const file = result[0];
        setImportFile(file);

        // Read file content
        let fileContent;
        let fileUri = file.uri;

        if (Platform.OS === 'android' && fileUri.startsWith('content://')) {
          const destPath = `${RNFS.TemporaryDirectoryPath}/${file.name}`;
          await RNFS.copyFile(fileUri, destPath);
          fileUri = destPath;
        }

        fileContent = await RNFS.readFile(fileUri, 'base64');

        if (!fileContent) {
          throw new Error('Failed to read file content');
        }

        // Parse Excel
        const workbook = XLSX.read(fileContent, { type: 'base64' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        // Validate columns
        if (expectedColumns && json.length > 0) {
          const firstRow = json[0];
          const fileColumns = Object.keys(firstRow);
          const missingColumns = expectedColumns.filter(
            col => !fileColumns.includes(col),
          );

          if (missingColumns.length > 0) {
            setErrorMessage(`Missing columns: ${missingColumns.join(', ')}`);
            setImportFile(null);
            return;
          }
        }

        // Transform data
        const processedData = transformImportData
          ? transformImportData(json)
          : json;

        setImportPreview(processedData);
        setErrorMessage(''); // Clear any previous error

        toast({
          title: 'File Ready',
          description: `${processedData.length} items loaded successfully.`,
        });
      }
    } catch (error) {
      if (
        error.code === 'DOCUMENT_PICKER_CANCELED' ||
        error.message?.includes('cancel')
      ) {
        return;
      }
      console.error('Import error:', error);
      setErrorMessage(
        'Failed to read Excel file. Please check the file format.',
      );
    }
  };

  // Import items one by one
  const importItemsSequentially = async items => {
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      throw new Error('Authentication token not found');
    }

    const failed = [];
    const endpoint =
      activeTab === 'products'
        ? `${BASE_URL}/api/products`
        : `${BASE_URL}/api/services`;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setImportProgress({ current: i + 1, total: items.length });

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(item),
        });

        const responseData = await response.json();

        if (!response.ok) {
          failed.push({
            item: item.name || item.serviceName || `Item ${i + 1}`,
            error: responseData.message || `Status: ${response.status}`,
            data: item,
          });
        }
      } catch (error) {
        failed.push({
          item: item.name || item.serviceName || `Item ${i + 1}`,
          error: error.message,
          data: item,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return failed;
  };

  // Handle actual import to backend
  const handleConfirmImport = async () => {
    if (importPreview.length === 0) {
      setErrorMessage('Please select a file first');
      return;
    }

    setIsImporting(true);
    setErrorMessage('');
    setImportStatus('');
    setFailedItems([]);

    try {
      const failedItems = await importItemsSequentially(importPreview);
      setFailedItems(failedItems);

      if (failedItems.length === 0) {
        setImportStatus('success');

        // Wait a moment to show success message
        setTimeout(() => {
          // Clear state and close dialog
          setImportFile(null);
          setImportPreview([]);
          setIsDialogOpen(false);
          setImportStatus('');

          // Refresh data
          if (onImportSuccess) {
            onImportSuccess();
          }

          // Show success alert
          Alert.alert(
            'Import Successful',
            `All ${importPreview.length} ${activeTab} imported successfully.`,
            [{ text: 'OK', style: 'default' }],
          );
        }, 1500);
      } else {
        const successCount = importPreview.length - failedItems.length;

        if (failedItems.length === importPreview.length) {
          setImportStatus('failed');
          setErrorMessage(
            'All items failed to import. Please check your data.',
          );

          Alert.alert(
            'Import Failed',
            'All items failed to import. Please check your data.',
            [{ text: 'OK', style: 'cancel' }],
          );
        } else {
          setImportStatus('partial');
          setErrorMessage(
            `${successCount} items imported, ${failedItems.length} failed.`,
          );

          Alert.alert(
            'Partial Success',
            `${successCount} items imported, ${failedItems.length} failed.`,
            [{ text: 'OK', style: 'default' }],
          );
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus('failed');
      setErrorMessage(error.message || 'Failed to import data');

      Alert.alert('Import Failed', error.message || 'Failed to import data', [
        { text: 'OK', style: 'cancel' },
      ]);
    } finally {
      setIsImporting(false);
    }
  };

  // Reset import state
  const handleClearImport = () => {
    setImportFile(null);
    setImportPreview([]);
    setErrorMessage('');
    setImportStatus('');
    setFailedItems([]);
  };

  // Close dialog handler
  const handleCloseDialog = () => {
    if (!isImporting) {
      setIsDialogOpen(false);
      handleClearImport();
    }
  };

  // Get status color and icon
  const getStatusInfo = () => {
    switch (importStatus) {
      case 'success':
        return {
          color: '#28a745',
          icon: 'check-circle',
          title: 'Import Successful!',
          message: `All ${importPreview.length} ${activeTab} imported successfully.`,
        };
      case 'partial':
        return {
          color: '#fd7e14',
          icon: 'alert-circle',
          title: 'Partial Success',
          message: errorMessage,
        };
      case 'failed':
        return {
          color: '#dc3545',
          icon: 'close-circle',
          title: 'Import Failed',
          message: errorMessage,
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View>
      {/* Import/Export Button */}
      <TouchableOpacity
        style={styles.importButton}
        onPress={() => setIsDialogOpen(true)}
      >
        <Icon name="upload" size={20} color="#007AFF" />
        <Text style={styles.buttonText}>Import/Export</Text>
      </TouchableOpacity>

      {/* Import Dialog */}
      <Portal>
        <Dialog
          visible={isDialogOpen}
          onDismiss={handleCloseDialog}
          style={styles.dialog}
        >
          {/* Header Container: Title and Close button aligned in one row */}
          <View style={styles.dialogHeader}>
            <Dialog.Title style={styles.dialogTitle}>
              {isImporting
                ? 'Importing...'
                : statusInfo
                ? statusInfo.title
                : 'Import/Export Excel'}
            </Dialog.Title>

            <TouchableOpacity
              style={styles.dialogCloseButton}
              onPress={handleCloseDialog}
              accessibilityLabel="Close import dialog"
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Dialog.Content style={styles.dialogContent}>
            {isImporting ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>
                  Importing {importProgress.current} of {importProgress.total}{' '}
                  {activeTab}...
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          (importProgress.current / importProgress.total) * 100
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
              </View>
            ) : statusInfo ? (
              <View style={styles.statusContainer}>
                <Icon
                  name={statusInfo.icon}
                  size={48}
                  color={statusInfo.color}
                />
                <Text style={[styles.statusTitle, { color: statusInfo.color }]}>
                  {statusInfo.title}
                </Text>
                <Text style={styles.statusMessage}>{statusInfo.message}</Text>

                {/* Show failed items for partial/failed imports */}
                {failedItems.length > 0 && (
                  <View style={styles.failedItemsContainer}>
                    <Text style={styles.failedItemsTitle}>Failed Items:</Text>
                    {failedItems.slice(0, 3).map((item, index) => (
                      <Text key={index} style={styles.failedItem}>
                        • {item.item}: {item.error}
                      </Text>
                    ))}
                    {failedItems.length > 3 && (
                      <Text style={styles.failedItem}>
                        ... and {failedItems.length - 3} more
                      </Text>
                    )}
                  </View>
                )}

                {/* Auto-close message for success */}
                {importStatus === 'success' && (
                  <Text style={styles.autoCloseMessage}>
                    Dialog will close automatically...
                  </Text>
                )}
              </View>
            ) : (
              <>
                {/* Error Message Display */}
                {errorMessage ? (
                  <View style={styles.errorContainer}>
                    <Icon name="alert-circle" size={20} color="#dc3545" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                {/* Download Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📥 Download Template</Text>
                  <Button
                    mode="contained"
                    onPress={handleDownloadTemplate}
                    style={styles.actionButton}
                    icon="download"
                  >
                    Download Template
                  </Button>
                  <Text style={styles.downloadHelper}>
                    Download the template file to fill in your data
                  </Text>
                </View>

                <View style={styles.divider} />

                {/* Import Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📤 Import Data</Text>
                  <Button
                    mode="outlined"
                    onPress={handleImportFile}
                    style={styles.actionButton}
                    icon="file-upload"
                  >
                    Choose Excel File
                  </Button>
                </View>

                {/* File Preview */}
                {importFile && (
                  <Card style={styles.previewCard}>
                    <Card.Content>
                      <View style={styles.fileInfo}>
                        <Icon name="file-excel" size={32} color="#21A366" />
                        <View style={styles.fileDetails}>
                          <Text style={styles.fileName} numberOfLines={1}>
                            {importFile.name}
                          </Text>
                          <Text style={styles.fileSize}>
                            📊 {importPreview.length} items ready
                          </Text>
                        </View>
                      </View>

                      <View style={styles.previewActions}>
                        <Button
                          mode="contained"
                          onPress={handleConfirmImport}
                          disabled={importPreview.length === 0}
                          style={[styles.actionButton, styles.confirmButton]}
                          contentStyle={styles.buttonContent}
                        >
                          Import {importPreview.length} {activeTab}
                        </Button>

                        <Button
                          mode="outlined"
                          onPress={handleClearImport}
                          style={[styles.actionButton, styles.clearButton]}
                          icon="close"
                        >
                          Clear
                        </Button>
                      </View>
                    </Card.Content>
                  </Card>
                )}
              </>
            )}
          </Dialog.Content>

          <Dialog.Actions style={styles.dialogActions}>
            {importStatus && importStatus !== 'success' && (
              <Button onPress={handleClearImport} textColor="#666">
                Try Again
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    minHeight: 44,
  },
  buttonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  dialog: {
    borderRadius: 12,
    backgroundColor: '#fff',
    maxHeight: '80%',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 40,
    marginTop: 10,
  },
  dialogContent: {
    paddingHorizontal: 26,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    position: 'relative',
  },
  dialogCloseButton: {
    position: 'absolute',
    top: 0,
    right: 15,
    zIndex: 10,
    padding: 4,
  },
  dialogActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  actionButton: {
    width: '100%',
    marginVertical: 4,
  },
  downloadHelper: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  previewCard: {
    marginTop: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  fileSize: {
    fontSize: 13,
    color: '#28a745',
    marginTop: 2,
  },
  previewActions: {
    gap: 8,
  },
  buttonContent: {
    height: 44,
  },
  confirmButton: {
    backgroundColor: '#28a745',
  },
  clearButton: {
    borderColor: '#dc3545',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee',
    borderWidth: 1,
    borderColor: '#f5c6cb',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  statusContainer: {
    alignItems: 'center',
    padding: 20,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  statusMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  failedItemsContainer: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
    width: '100%',
  },
  failedItemsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  failedItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  autoCloseMessage: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 12,
  },
});

export default ExcelImportExport;
