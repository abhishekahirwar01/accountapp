import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
  StyleSheet,
} from 'react-native';

import { Card, Button, Dialog, Portal } from 'react-native-paper';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { pickDocument } from '@react-native-documents/picker';

import RNFS from 'react-native-fs';

import RNBlob from 'react-native-blob-util';

import XLSX from 'xlsx';

// ⚠️ NOTE: This function provides a replacement for btoa() which is missing

// on standard React Native environments (non-web). For a robust production app,

// you might install the 'base-64' package and use 'import { encode as base64Encode } from "base-64";'

const binaryToBase64 = binary => {
  // Simple polyfill logic to handle binary string to base64 conversion

  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  // Fallback for React Native (requires some environment setup like Buffer polyfill

  // or a dedicated base-64 library for full reliability across all versions).

  // Using Buffer if available, or basic implementation.

  try {
    return Buffer.from(binary, 'binary').toString('base64');
  } catch (e) {
    // If Buffer is not available, try to use a simple replacement logic

    return global.btoa ? global.btoa(binary) : null;
  }
};

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

  const [downloadFileName, setDownloadFileName] = useState('');

  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);

  // Platform detection

  const isWeb = Platform.OS === 'web';

  const isMobile = Platform.OS !== 'web';

  // Function to initiate download with name change

  const initiateDownload = () => {
    const baseFileName =
      templateFileName || `inventory_template_${activeTab}.xlsx`;

    setDownloadFileName(baseFileName);

    setIsDownloadDialogOpen(true);
  };

  // Function to confirm and execute download with custom filename

  const confirmDownload = async () => {
    setIsDownloadDialogOpen(false);

    if (!downloadFileName.trim()) {
      Alert.alert('Error', 'Please enter a filename');

      return;
    }

    try {
      console.log('📥 Starting template download for tab:', activeTab);

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

      const base64 = binaryToBase64(wbout);

      if (!base64) {
        console.error('❌ Base64 encoding failed');

        Alert.alert(
          'Error',

          'Base64 encoding failed. Missing required polyfill or library.',
        );

        return;
      }

      console.log('✅ Base64 encoded successfully');

      const fileName = downloadFileName.endsWith('.xlsx')
        ? downloadFileName
        : `${downloadFileName}.xlsx`;

      const downloadPath = RNFS.DownloadDirectoryPath;

      console.log('📍 Download path:', downloadPath);

      console.log('📝 File name:', fileName);

      try {
        await RNFS.mkdir(downloadPath);

        console.log('✅ Download directory ready');
      } catch (mkdirErr) {
        console.warn(
          '⚠️ Could not create download directory (may already exist):',

          mkdirErr?.message,
        );
      }

      // Helper function to find unique filename by checking for duplicates

      const getUniqueFilePath = async (dir, baseFile) => {
        const pathExtension = baseFile.split('.');

        const ext = pathExtension.pop();

        const nameWithoutExt = pathExtension.join('.');

        let filePath = `${dir}/${baseFile}`;

        let counter = 1;

        while (await RNFS.exists(filePath)) {
          const newFileName = `${nameWithoutExt} (${counter}).${ext}`;

          filePath = `${dir}/${newFileName}`;

          counter++;
        }

        return { filePath, fileName: filePath.split('/').pop() };
      };

      const { filePath, fileName: finalFileName } = await getUniqueFilePath(
        downloadPath,

        fileName,
      );

      console.log('🔗 Final file path:', filePath);

      console.log('📝 Final file name:', finalFileName);

      await RNFS.writeFile(filePath, base64, 'base64');

      console.log('✅ File written successfully');

      const fileExists = await RNFS.exists(filePath);

      if (fileExists) {
        console.log('✅ File verified to exist at:', filePath);

        Alert.alert('Success', `Template downloaded: ${finalFileName}`);
      } else {
        console.error('❌ File was written but not found afterward');

        Alert.alert('Success', `Template downloaded successfully.`);
      }
    } catch (error) {
      console.error('❌ Template download error:', error);

      Alert.alert(
        'Error',

        'Failed to download template. See console for details.',
      );
    }
  };

  // Function to handle file import

  const handleImportFile = async () => {
    try {
      // NOTE: For document-picker flows on Android 13+, runtime storage permissions

      // are not required and often ignored. The document picker returns a content://

      // URI which RNFS cannot read directly. We'll convert the URI to a readable

      // path using react-native-blob-util (RNBlob) and then read the file. Do not

      // request runtime storage permissions here.

      // Resolve document-picker function dynamically to handle variations

      // between different installed packages / versions (some export `pickDocument`,

      // others export `pick`, `default`, or named APIs). This makes the code

      // more robust and avoids a crash if the library's export shape differs.

      let res = null;

      try {
        let pickerModule = null;

        try {
          pickerModule = require('@react-native-documents/picker');
        } catch (e) {
          // module may not be available or named differently

          try {
            pickerModule = require('react-native-document-picker');
          } catch (e2) {
            pickerModule = null;
          }
        }

        if (!pickerModule) {
          throw new Error(
            'Document picker module not found. Please install @react-native-documents/picker or react-native-document-picker',
          );
        }

        const pickFn =
          pickerModule.pickDocument ||
          pickerModule.pick ||
          pickerModule.pickSingle ||
          pickerModule.pickMultiple ||
          pickerModule.default?.pickDocument ||
          pickerModule.default?.pick ||
          pickerModule.default;

        if (typeof pickFn !== 'function') {
          throw new Error(
            'No compatible pick function found on document picker module',
          );
        }

        // Call the resolved picker function

        res = await pickFn({
          type: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx

            'application/vnd.ms-excel', // .xls
          ],

          allowMultiSelection: false,
        });
      } catch (pickerErr) {
        // If user cancelled the picker, just return silently

        const msg = pickerErr?.message || pickerErr;

        if (
          pickerErr?.code === 'DOCUMENT_PICKER_CANCELED' ||
          /cancel/i.test(String(msg))
        ) {
          console.log('Document picker canceled by user.');

          return;
        }

        console.error('Document picker error:', pickerErr);

        Alert.alert(
          'Picker Error',

          'Could not open document picker. Please ensure a compatible picker library is installed (see console).',
        );

        return;
      }

      if (res && res.length > 0) {
        const file = res[0];

        setImportFile(file);

        // Read file content. Document picker returns content:// URIs which RNFS

        // cannot always read directly. Use RNBlob to stat the URI and get a

        // readable path, then use RNFS to read that path as base64. Provide

        // fallbacks to try multiple methods.

        let fileContent = null;

        try {
          // Try to stat the URI to get a real path

          const stat = await RNBlob.fs.stat(file.uri);

          const realPath =
            stat?.path ||
            stat?.filePath ||
            (stat?.path || '').replace('raw:', '');

          if (realPath) {
            fileContent = await RNFS.readFile(realPath, 'base64');
          } else {
            // If stat didn't return a usable path, try RNBlob readFile

            fileContent = await RNBlob.fs.readFile(file.uri, 'base64');
          }
        } catch (errStat) {
          try {
            // Fallback: try RNFS.readFile directly on the URI

            fileContent = await RNFS.readFile(file.uri, 'base64');
          } catch (errFs) {
            try {
              // Final fallback: use RNBlob to read the content

              fileContent = await RNBlob.fs.readFile(file.uri, 'base64');
            } catch (errBlob) {
              console.error(
                'Failed to read file via stat/RNFS/RNBlob',

                errStat,

                errFs,

                errBlob,
              );

              Alert.alert(
                'Error',

                'Failed to read selected file. Try a different picker or check device settings.',
              );

              return;
            }
          }
        }

        // Convert base64 back to binary string for XLSX library

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

              `Missing columns: ${missingColumns.join(
                ', ',
              )}. Please use the template.`,
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

          'Failed to import Excel file. Please check the file format or console for details.',
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
                onPress={initiateDownload}
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
                        {Math.round(importFile.size / 1024)} KB (
                        {importPreview.length} rows)
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.previewActions,

                      isMobile && styles.mobilePreviewActions,
                    ]}
                  >
                    <Button
                      mode="contained"
                      onPress={handleConfirmImport}
                      disabled={isImporting || importPreview.length === 0}
                      style={styles.confirmButton}
                      icon={isImporting ? 'loading' : 'check'}
                      loading={isImporting}
                    >
                      {isImporting
                        ? 'Importing...'
                        : `Confirm Import (${importPreview.length} Items)`}
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

      {/* Rename/Save As Dialog */}

      <Portal>
        <Dialog
          visible={isDownloadDialogOpen}
          onDismiss={() => setIsDownloadDialogOpen(false)}
        >
          <Dialog.Title>Save As</Dialog.Title>

          <Dialog.Content>
            <Text style={{ marginBottom: 12, color: '#666' }}>
              Enter a filename for the template:
            </Text>

            <TextInput
              style={[
                styles.input,

                {
                  borderWidth: 1,

                  borderColor: '#ddd',

                  borderRadius: 8,

                  padding: 12,

                  fontSize: 14,
                },
              ]}
              placeholder="e.g., my_template"
              value={downloadFileName}
              onChangeText={setDownloadFileName}
              autoFocus
            />

            <Text style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              (.xlsx extension will be added automatically)
            </Text>
          </Dialog.Content>

          <Dialog.Actions>
            <Button onPress={() => setIsDownloadDialogOpen(false)}>
              Cancel
            </Button>

            <Button mode="contained" onPress={confirmDownload}>
              Download
            </Button>
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

    borderWidth: 1,

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
    marginTop: 8,
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
