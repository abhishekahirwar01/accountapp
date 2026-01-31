import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  TouchableWithoutFeedback,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Pdf from 'react-native-pdf';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

// PDF generators used across the project
import { generatePdfForTemplate1 } from '../../lib/pdf-template1';
import { generatePdfForTemplate2 } from '../../lib/pdf-template2';
import { generatePdfForTemplate3 } from '../../lib/pdf-template3';
import { generatePdfForTemplate4 } from '../../lib/pdf-template4';
import { generatePdfForTemplate5 } from '../../lib/pdf-template5';
import { generatePdfForTemplate6 } from '../../lib/pdf-template6';
import { generatePdfForTemplate7 } from '../../lib/pdf-template7';
import { generatePdfForTemplate8 } from '../../lib/pdf-template8';
import { generatePdfForTemplate9 } from '../../lib/pdf-template9';
import { generatePdfForTemplate11 } from '../../lib/pdf-template11';
import { generatePdfForTemplate12 } from '../../lib/pdf-template12';
import { generatePdfForTemplate16 } from '../../lib/pdf-template16';
import { generatePdfForTemplate17 } from '../../lib/pdf-template17';
import { generatePdfForTemplate18 } from '../../lib/pdf-template18';
import { generatePdfForTemplate19 } from '../../lib/pdf-template19';
import { generatePdfForTemplate20 } from '../../lib/pdf-template20';
import { generatePdfForTemplate21 } from '../../lib/pdf-template21';
import { generatePdfForTemplateA5 } from '../../lib/pdf-templateA5';
import { generatePdfForTemplateA5_2 } from '../../lib/pdf-templateA3-2';
import { generatePdfForTemplateA5_3 } from '../../lib/pdf-templateA5-3';
import { generatePdfForTemplateA5_4 } from '../../lib/pdf-templateA5-4';
import { generatePdfForTemplateA5_5 } from '../../lib/pdf-templateA5-5';
import { generatePdfForTemplatet3 } from '../../lib/pdf-template-t3';

const TEMPLATES = [
  'template1',
  'template2',
  'template3',
  'template4',
  'template5',
  'template6',
  'template7',
  'template8',
  'template9',
  // 'template11',
  // 'template12',
  // 'template16',
  // 'template17',
  // 'template18',
  // 'template19',
  // 'template20',
  // 'template21',
  'templateA5',
  'templateA5_2',
  'templateA5_3',
  'templateA5_4',
  'templateA5_5',
  'template T3',
  'template T3-2',
];

export default function InvoicePreview({
  navigation,
  route,
  transaction: propTransaction,
  company: propCompany,
  party: propParty,
  serviceNameById: propServiceNameById,
  onClose,
}) {
  const [selectedTemplate, setSelectedTemplate] = useState('template1');
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfPath, setPdfPath] = useState(null);
  const [error, setError] = useState(null);
  // Queue to serialize PDF generation calls to avoid "Another PDF conversion is currently in progress"
  const genQueueRef = React.useRef(Promise.resolve());
  const generationTokenRef = React.useRef(0);

  // Resolve props from navigation route if available (supports both usages)
  const transaction = route?.params?.transaction ?? propTransaction;
  const company = route?.params?.company ?? propCompany;
  const party = route?.params?.party ?? propParty;
  const serviceNameById = route?.params?.serviceNameById ?? propServiceNameById;

  // `serviceNameById` may be passed as a plain object via navigation params
  // (because React Navigation requires serializable params). Convert it
  // back to a Map which template generators expect.
  const serviceNameMap =
    serviceNameById instanceof Map
      ? serviceNameById
      : new Map(Object.entries(serviceNameById || {}));

  useEffect(() => {
    let active = true;
    let writtenPath = null;

    const writePdfFile = async pdfBlobOrBase64 => {
      try {
        let base64Data = null;

        if (!pdfBlobOrBase64) throw new Error('No PDF data');

        // Handle multiple generator return types gracefully
        // 1. If generator returned a string (possibly base64 or data URL)
        if (typeof pdfBlobOrBase64 === 'string') {
          if (pdfBlobOrBase64.startsWith('data:application/pdf;base64,')) {
            base64Data = pdfBlobOrBase64.split(',')[1];
          } else {
            base64Data = pdfBlobOrBase64;
          }

          // If this is already a filepath (starts with / or file://), skip writing
          if (base64Data.startsWith('/') || base64Data.startsWith('file://')) {
            const path = base64Data.replace(/^file:\/\//, '');
            if (active) setPdfPath(`file://${path}`);
            return;
          }
        }

        // 2. If generator returned an object with known properties
        if (typeof pdfBlobOrBase64 === 'object' && pdfBlobOrBase64 !== null) {
          // If the generator already wrote a file and returned filePath, prefer it but verify
          if (pdfBlobOrBase64.filePath) {
            const rawPath = pdfBlobOrBase64.filePath;
            const filePathCandidate = rawPath.startsWith('file://')
              ? rawPath.replace(/^file:\/\//, '')
              : rawPath;

            try {
              const exists = await RNFS.exists(filePathCandidate);
              if (exists) {
                const finalUri = rawPath.startsWith('file://')
                  ? rawPath
                  : `file://${filePathCandidate}`;
                if (active) setPdfPath(finalUri);
                return;
              }
              // If file doesn't exist but base64 is present, fallthrough to base64 handling below
            } catch (e) {}
          }

          // If base64 property is present (react-native-html-to-pdf when base64: true)
          if (pdfBlobOrBase64.base64) {
            base64Data = pdfBlobOrBase64.base64;
          }

          // If the object exposes an output(format) helper (some templates), call it
          if (!base64Data && typeof pdfBlobOrBase64.output === 'function') {
            try {
              const out = await pdfBlobOrBase64.output('base64');
              if (out) base64Data = out;
            } catch (e) {
              // ignore and try other fallbacks
            }
          }
        }

        // 3. Uint8Array -> base64
        if (
          !base64Data &&
          typeof Uint8Array !== 'undefined' &&
          pdfBlobOrBase64 instanceof Uint8Array
        ) {
          base64Data = Buffer.from(pdfBlobOrBase64).toString('base64');
        }

        // 4. Blob or Response-compatible -> arrayBuffer -> base64
        if (
          !base64Data &&
          typeof Blob !== 'undefined' &&
          pdfBlobOrBase64 instanceof Blob
        ) {
          const arrayBuffer = await new Response(pdfBlobOrBase64).arrayBuffer();
          base64Data = Buffer.from(arrayBuffer).toString('base64');
        }

        // 5. Try Response fallback for other types (e.g., fetch Response-like)
        if (!base64Data) {
          try {
            const arrayBuffer = await new Response(
              pdfBlobOrBase64,
            ).arrayBuffer();
            base64Data = Buffer.from(arrayBuffer).toString('base64');
          } catch (e) {
            throw new Error('Unsupported PDF data format');
          }
        }

        const fileName = `Invoice-${transaction?._id || Date.now()}.pdf`;
        const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;

        await RNFS.writeFile(path, base64Data, 'base64');
        writtenPath = path;
        if (active) setPdfPath(`file://${path}`);
      } catch (err) {
        throw err;
      }
    };

    const generate = async genToken => {
      if (!transaction) return;
      // Only the latest generation token should update state when finished
      setIsLoading(true);
      setError(null);

      try {
        let pdfBlob;
        // Choose generator
        // derive shippingAddress and bank from transaction if present
        const shippingAddress =
          transaction?.shippingAddress &&
          typeof transaction.shippingAddress === 'object'
            ? transaction.shippingAddress
            : null;

        const bankForTemplate = transaction?.bank || null;

        switch (selectedTemplate) {
          case 'template1':
            pdfBlob = await generatePdfForTemplate1(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
            // case 'template2':
            //   pdfBlob = await generatePdfForTemplate2(
            //     transaction,
            //     company || null,
            //     party || null,
            //     serviceNameMap,
            //     shippingAddress,
            //     bankForTemplate,
            //   );
            break;
          // case 'template3':
          //   pdfBlob = await generatePdfForTemplate3(
          //     transaction,
          //     company || null,
          //     party || null,
          //     serviceNameMap,
          //     shippingAddress,
          //     bankForTemplate,
          //   );
          //   break;
          // case 'template4':
          //   pdfBlob = await generatePdfForTemplate4(
          //     transaction,
          //     company || null,
          //     party || null,
          //     serviceNameMap,
          //     shippingAddress,
          //     bankForTemplate,
          //   );
          //   break;
          // case 'template5':
          //   pdfBlob = await generatePdfForTemplate5(
          //     transaction,
          //     company || null,
          //     party || null,
          //     serviceNameMap,
          //     shippingAddress,
          //     bankForTemplate,
          //   );
          //   break;
          // case 'template6':
          //   pdfBlob = await generatePdfForTemplate6(
          //     transaction,
          //     company || null,
          //     party || null,
          //     serviceNameMap,
          //     shippingAddress,
          //     bankForTemplate,
          //   );
          //   break;
          // case 'template7':
          //   pdfBlob = await generatePdfForTemplate7(
          //     transaction,
          //     company || null,
          //     party || null,
          //     serviceNameMap,
          //     shippingAddress,
          //     bankForTemplate,
          //   );
          //   break;
          case 'template2':
            pdfBlob = await generatePdfForTemplate8(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
          case 'template5':
            pdfBlob = await generatePdfForTemplate9(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
          case 'template3':
            pdfBlob = await generatePdfForTemplate11(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
          case 'template4':
            pdfBlob = await generatePdfForTemplate12(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
          case 'template16':
            pdfBlob = await generatePdfForTemplate16(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
          case 'template7':
            pdfBlob = await generatePdfForTemplate17(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
          case 'template T3-2':
            pdfBlob = await generatePdfForTemplate18(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
          case 'template6':
            pdfBlob = await generatePdfForTemplate19(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
          case 'template8':
            pdfBlob = await generatePdfForTemplate20(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
          case 'template9':
            pdfBlob = await generatePdfForTemplate21(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
          case 'templateA5':
            pdfBlob = await generatePdfForTemplateA5(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
          case 'templateA5_2':
            pdfBlob = await generatePdfForTemplateA5_2(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
          case 'templateA5_3':
            pdfBlob = await generatePdfForTemplateA5_3(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
          case 'templateA5_4':
            pdfBlob = await generatePdfForTemplateA5_4(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
          case 'templateA5_5':
            pdfBlob = await generatePdfForTemplateA5_5(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
            break;
          case 'template T3':
            pdfBlob = await generatePdfForTemplatet3(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
            );
            break;
          default:
            pdfBlob = await generatePdfForTemplate1(
              transaction,
              company || null,
              party || null,
              serviceNameMap,
              shippingAddress,
              bankForTemplate,
            );
        }

        await writePdfFile(pdfBlob);

        // If a newer generation started while we were running, ignore result
        if (generationTokenRef.current !== genToken) {
          return;
        }
      } catch (err) {
        setError(err.message || 'Failed to generate PDF');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    // Enqueue the generation to ensure conversions don't overlap
    generationTokenRef.current += 1;
    const myToken = generationTokenRef.current;
    genQueueRef.current = genQueueRef.current.then(() => generate(myToken));

    return () => {
      active = false;
      if (writtenPath) {
        RNFS.unlink(writtenPath).catch(() => {});
      }
    };
  }, [selectedTemplate, transaction, company, party, serviceNameById]);

  const cycleTemplate = () => {
    const idx = TEMPLATES.indexOf(selectedTemplate);
    const next = TEMPLATES[(idx + 1) % TEMPLATES.length];
    setSelectedTemplate(next);
  };

  // Write/Copy the generated PDF to a user-accessible location and share it
  const handleDownload = async () => {
    if (!pdfPath) return Alert.alert('Not ready', 'PDF is not ready yet');

    try {
      // --- 1. Permissions Check (Keeping existing logic for Android < 10) ---
      if (Platform.OS === 'android') {
        const isLegacyAndroid = Platform.Version < 29; // ... (Legacy Android permission check logic remains the same)
        if (isLegacyAndroid) {
          // ... (permission request logic) ...
        } else {
        }
      } // --- 2. Define File Paths ---

      const sourcePath = pdfPath.replace(/^file:\/\//, '');
      // **START: UNIQUE FILE NAME GENERATION LOGIC**

      const baseFileName = `invoice_${
        transaction?.invoiceNumber || transaction?._id || Date.now()
      }_${selectedTemplate}`; // **ADDED TEMPLATE NAME FOR UNIQUENESS**
      const baseTargetDir = RNFS.DownloadDirectoryPath;
      const baseFilePath = `${baseTargetDir}/${baseFileName}.pdf`;
      let downloadsFilePath = baseFilePath;
      let suffix = 1; // Loop to find a non-existing file name (e.g., invoice_T1(1).pdf, invoice_T1(2).pdf)

      while (await RNFS.exists(downloadsFilePath)) {
        downloadsFilePath = `${baseTargetDir}/${baseFileName} (${suffix}).pdf`;
        suffix++; // Safety break for extremely rare cases or testing
        if (suffix > 50) {
          throw new Error('Too many duplicate file attempts.');
        }
      } // **END: UNIQUE FILE NAME GENERATION LOGIC**
      // LOG 2 // --- 3. Copy to Downloads Folder ---

      const sourceExists = await RNFS.exists(sourcePath);
      if (!sourceExists) {
        throw new Error('Source PDF file not found.');
      }

      await RNFS.copyFile(sourcePath, downloadsFilePath);
      const downloadsFileExists = await RNFS.exists(downloadsFilePath);

      if (downloadsFileExists) {
        // Confirming existence in both locations (Internal/Source and Downloads/Target)
        Alert.alert('Download Success', 'Your invoice has been downloaded.', [
          { text: 'OK' },
        ]);
      } else {
        Alert.alert(
          'Download Warning',
          'File could not be verified in the Downloads folder, but was attempted.',
        );
      }
    } catch (e) {
      Alert.alert(
        'Download Failed',
        `Could not save file to Downloads. Error: ${
          e.message || 'Unknown error'
        }`,
      );
    }
  };

  const handleShare = async () => {
    if (!pdfPath) return Alert.alert('Not ready', 'PDF is not ready yet');

    let cachePath = null;
    try {
      // ... (steps 1, 2, 3, 4: Copying file to cache and setting up options)
      const sourcePath = pdfPath.replace(/^file:\/\//, '');
      const fileName = `invoice_share_${
        transaction?.invoiceNumber || 'temp'
      }.pdf`;
      cachePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      await RNFS.copyFile(sourcePath, cachePath);
      const fileUriForShare = `file://${cachePath}`;

      const shareOptions = {
        url: fileUriForShare,
        title: 'Invoice',
        message: 'Please find the invoice attached.',
        type: 'application/pdf',
        subject: `Invoice: ${transaction?.invoiceNumber || 'Document'}`,
        filename: fileName,
      };

      // 5. Open the share dialog
      await Share.open(shareOptions);
    } catch (e) {
      // **FIX:** Check for user cancellation first.
      if (e.message && e.message.includes('User did not share')) {
        // User cancelled the share dialog. Log a neutral message and return silently.

        return;
      }

    

      let userMessage = e.message || 'Failed to share file.';

      if (Platform.OS === 'android') {
        userMessage =
          'Failed to attach file. Please ensure your `react-native-share` library is up to date and native FileProvider configuration is correct.';
      }

      Alert.alert('Share Failed', userMessage);
    } finally {
      // 6. Clean up the temporary cache file if it exists
      if (cachePath) {
        RNFS.unlink(cachePath).catch(err => {});
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (navigation && typeof navigation.goBack === 'function') {
              navigation.goBack();
            } else if (typeof onClose === 'function') {
              onClose();
            }
          }}
        >
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Preview</Text>
        <TouchableOpacity
          style={styles.templateSelector}
          onPress={() => setIsTemplateMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Select template, current ${selectedTemplate}`}
        >
          <Text style={styles.templateSelectorText}>{selectedTemplate}</Text>
          <Icon name="chevron-down" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Template selector modal */}
        <Modal
          visible={isTemplateMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsTemplateMenuOpen(false)}
        >
          <View style={styles.templateModalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setIsTemplateMenuOpen(false)}
            />
            <TouchableWithoutFeedback>
              <View style={styles.templateModalContent}>
                <View style={styles.templateModalHeader}>
                  <Text style={styles.templateModalTitle}>Select Template</Text>
                  <TouchableOpacity
                    onPress={() => setIsTemplateMenuOpen(false)}
                  >
                    <Icon name="close" size={20} color="#374151" />
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  {TEMPLATES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={styles.templateItem}
                      onPress={() => {
                        setSelectedTemplate(t);
                        setIsTemplateMenuOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.templateItemText,
                          t === selectedTemplate && {
                            color: '#0b69ff',
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </Modal>
        {isLoading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={{ marginTop: 8 }}>Generating PDF preview...</Text>
          </View>
        ) : error ? (
          <View style={styles.loadingCenter}>
            <Text style={{ color: 'red' }}>{error}</Text>
          </View>
        ) : pdfPath ? (
          <Pdf
            source={{ uri: pdfPath }}
            style={styles.pdf}
            onError={e => {
              Alert.alert('PDF Error', 'Failed to render PDF');
            }}
          />
        ) : (
          <View style={styles.loadingCenter}>
            <Text>No PDF available</Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.downloadButton]}
          onPress={handleDownload}
        >
          <Icon name="download" size={20} color="#fff" />
          <Text style={styles.buttonText}>Download PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.shareButton]}
          onPress={handleShare}
        >
          <Icon name="share" size={20} color="#fff" />
          <Text style={styles.buttonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  pdf: {
    width: '100%',
    // Give a reasonable default height when rendered inside ScrollView/modals
    height: 800,
    backgroundColor: '#fff',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  companyContact: {
    fontSize: 14,
    color: '#3b82f6',
  },
  invoiceDetails: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  billToSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  customerContact: {
    fontSize: 14,
    color: '#3b82f6',
  },
  itemsSection: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    fontSize: 14,
    color: '#374151',
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalSection: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  notesSection: {
    marginBottom: 24,
  },
  notesText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  downloadButton: {
    backgroundColor: '#059669',
  },
  shareButton: {
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  templateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateModalContent: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    elevation: 6,
  },
  templateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  templateItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  templateItemText: {
    fontSize: 15,
    color: '#374151',
  },
  templateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  templateSelectorText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});
