import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Pdf from 'react-native-pdf';
import {
  Save,
  Loader2,
  Eye,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import RNFS from 'react-native-fs';

// EXACT TEMPLATE IMPORTS PRESERVED
import { generatePdfForTemplate1 } from '../../lib/pdf-template1';
import { generatePdfForTemplate8 } from '../../lib/pdf-template8';
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
import { generatePdfForTemplatet3 } from '../../lib/pdf-template-t3';
import { generatePdfForTemplate3 } from '../../lib/pdf-template3';
import { generatePdfForTemplateA5_5 } from '../../lib/pdf-templateA5-5';

import { BASE_URL } from '../../config';

// ===== GLOBAL PDF QUEUE SYSTEM =====
// Prevents "Another PDF conversion in progress" errors by serializing PDF generation
const pdfQueue = [];
let isProcessingQueue = false;

const addToPdfQueue = fn => {
  return new Promise((resolve, reject) => {
    pdfQueue.push({ fn, resolve, reject });
    processPdfQueue();
  });
};

const processPdfQueue = async () => {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  try {
    while (pdfQueue.length > 0) {
      const { fn, resolve, reject } = pdfQueue.shift();
      try {
        const res = await fn();
        resolve(res);
      } catch (err) {
        reject(err);
      }
      // Extended delay between conversions to prevent native PDF engine conflicts
      await new Promise(r => setTimeout(r, 1500));
    }
  } finally {
    isProcessingQueue = false;
  }
};
// ===== END GLOBAL PDF QUEUE SYSTEM =====

// EXACT TEMPLATE OPTIONS MAPPING
const templateOptions = [
  {
    value: 'template1',
    label: 'Template 1',
    color: '#3b82f6',
    paperSize: 'A4',
  },
  {
    value: 'template8',
    label: 'Template 2',
    color: '#a855f7',
    paperSize: 'A4',
  },
  {
    value: 'template11',
    label: 'Template 3',
    color: '#1f2937',
    paperSize: 'A4',
  },
  {
    value: 'template12',
    label: 'Template 4',
    color: '#22c55e',
    paperSize: 'A4',
  },
  {
    value: 'template16',
    label: 'Template 5',
    color: '#d97706',
    paperSize: 'A4',
  },
  {
    value: 'template17',
    label: 'Template 6',
    color: '#4f46e5',
    paperSize: 'A4',
  },
  {
    value: 'template19',
    label: 'Template 7',
    color: '#0d9488',
    paperSize: 'A4',
  },
  {
    value: 'template20',
    label: 'Template 8',
    color: '#4f46e5',
    paperSize: 'A4',
  },
  {
    value: 'template21',
    label: 'Template 9',
    color: '#0d9488',
    paperSize: 'A4',
  },
  {
    value: 'templateA5',
    label: 'Template A5',
    color: '#ec4899',
    paperSize: 'A5 Landscape',
  },
  {
    value: 'templateA5_2',
    label: 'Template A5-2',
    color: '#22c55e',
    paperSize: 'A5',
  },
  {
    value: 'templateA5_3',
    label: 'Template A5-3',
    color: '#f97316',
    paperSize: 'A5',
  },
  {
    value: 'templateA5_4',
    label: 'TemplateA5-4',
    color: '#06b6d4',
    paperSize: 'A5 Landscape',
  },
  {
    value: 'templateA5_5',
    label: 'TemplateA5-5',
    color: '#06b6d4',
    paperSize: 'A5 Landscape',
  },
  {
    value: 'template-t3',
    label: 'Template T3',
    color: '#84cc16',
    paperSize: 'Thermal Invoice',
  },
  {
    value: 'template18',
    label: 'Template T3-2',
    color: '#f43f5e',
    paperSize: 'Thermal Invoice',
  },
];

export default function TemplateSettings() {
  const [selectedTemplate, setSelectedTemplate] = useState('template1');
  const [fetchedTemplate, setFetchedTemplate] = useState('template1');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const lastPdfFileRef = useRef(null);

  // Enriched dummy data to match real data structure for robust preview
  const dummyCompany = {
    businessName: 'Demo Company',
    companyName: 'Demo Company',
    address: '123 Tech Lane, Silicon Valley',
    City: 'Techville',
    addressState: 'California',
    Country: 'USA',
    Pincode: '94043',
    gstin: '27ABCDE1234F1Z0',
    mobileNumber: '9876543210',
    Telephone: '022-23456789',
    email: 'contact@democompany.com',
    logo: '/static/images/default-logo.png',
  };
  const dummyParty = {
    name: 'Valued Client',
    address: '456 Client Avenue',
    city: 'Client City',
    state: 'California',
    pincode: '90210',
    contactNumber: '1234567890',
    gstin: '27XYZGH5678I2Z0',
    pan: 'ABCDE1234F',
  };
  const dummyTransaction = {
    invoiceNumber: 'INV-001',
    date: new Date().toISOString(),
    products: [
      {
        name: 'Sample Item',
        quantity: 1,
        pricePerUnit: 100,
        gstPercentage: 18,
        lineTax: 18,
        lineTotal: 118,
        amount: 100,
      },
    ],
    services: [],
  };
  const dummyServiceNames = new Map();
  const dummyBank = {
    bankName: 'Demo Bank',
    accountNumber: '123456789',
    ifscCode: 'DEMO0000001',
  };
  const dummyClient = {
    clientUsername: 'demo',
    clientName: 'Demo Client',
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Sync with your logic to generate preview when selection changes
  useEffect(() => {
    generatePreview();
  }, [selectedTemplate]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        `${BASE_URL}/api/settings/default-template`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        const template = data.defaultTemplate || 'template1';
        setSelectedTemplate(template);
        setFetchedTemplate(template);
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Load Error', text2: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate PDF using available template generators (mapping preserved).
  const generateAndSavePdf = async templateKey => {
    try {
      let pdfResult;
      switch (templateKey) {
        case 'template1':
          pdfResult = await generatePdfForTemplate1(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
            dummyBank,
          );
          break;
        case 'template8':
          pdfResult = await generatePdfForTemplate8(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
            dummyBank,
          );
          break;
        case 'template11':
          pdfResult = await generatePdfForTemplate11(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
            undefined,
            dummyBank,
          );
          break;
        case 'template12':
          pdfResult = await generatePdfForTemplate12(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
            dummyBank,
          );
          break;
        case 'template16':
          pdfResult = await generatePdfForTemplate16(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
          );
          break;
        case 'template17':
          pdfResult = await generatePdfForTemplate17(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
            dummyBank,
          );
          break;
        case 'template18':
          pdfResult = await generatePdfForTemplate18(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyBank,
          );
          break;
        case 'template19':
          pdfResult = await generatePdfForTemplate19(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
            dummyBank,
          );
          break;
        case 'template20':
          pdfResult = await generatePdfForTemplate20(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
            dummyBank,
          );
          break;
        case 'template21':
          pdfResult = await generatePdfForTemplate21(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
            dummyBank,
          );
          break;
        case 'templateA5':
          pdfResult = await generatePdfForTemplateA5(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
            dummyBank,
            dummyClient,
          );
          break;
        case 'templateA5_2':
          pdfResult = await generatePdfForTemplateA5_2(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
            dummyBank,
            dummyClient,
          );
          break;
        case 'templateA5_3':
          pdfResult = await generatePdfForTemplateA5_3(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
            dummyBank,
            dummyClient,
          );
          break;
        case 'templateA5_4':
          pdfResult = await generatePdfForTemplateA5_4(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
            dummyBank,
            dummyClient,
          );
          break;
        case 'templateA5_5':
          pdfResult = await generatePdfForTemplateA5_5(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
            dummyBank,
            dummyClient,
          );
          break;
        case 'template-t3':
          pdfResult = await generatePdfForTemplatet3(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            null, // shippingAddress (not applicable for thermal)
            dummyBank,
          );
          break;
        case 'template3':
          pdfResult = await generatePdfForTemplate3(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
          );
          break;
        default:
          pdfResult = await generatePdfForTemplate1(
            dummyTransaction,
            dummyCompany,
            dummyParty,
            dummyServiceNames,
            null,
            dummyBank,
          );
      }

      // Normalize return formats: handle filePath, output('filePath'), base64 or string
      if (pdfResult == null)
        throw new Error('PDF generator returned empty result');

      let finalPath = null;
      let base64 = null;

      if (typeof pdfResult === 'object') {
        if (pdfResult.filePath) finalPath = pdfResult.filePath;
        if (pdfResult.base64) base64 = pdfResult.base64;
        if (!finalPath && typeof pdfResult.output === 'function') {
          try {
            const outPath = pdfResult.output('filePath');
            if (outPath) finalPath = outPath;
          } catch (e) {
            // ignore
          }
          try {
            const outBase = pdfResult.output('base64');
            if (outBase) base64 = outBase;
          } catch (e) {
            // ignore
          }
        }
      } else if (typeof pdfResult === 'string') {
        finalPath = pdfResult.trim();
      }

      // Prefer base64 if available (more reliable for preview rendering)
      let uri;

      // ✅ VALIDATE base64 before using
      if (base64 && typeof base64 === 'string' && base64.trim().length > 0) {
        // Check if base64 looks valid (should start with PDF magic bytes in base64: JVBERi)
        if (
          base64.startsWith('JVBERi') ||
          base64.startsWith('iVBORw') ||
          base64.trim().length > 100
        ) {
          uri = `data:application/pdf;base64,${base64}`;
        } else {
          console.warn(
            '[PDF Debug] base64 looks invalid (unexpected format). Trying file path instead.',
          );
          base64 = null;
        }
      }

      if (!uri && finalPath) {
        uri = finalPath.startsWith('file://')
          ? finalPath
          : `file://${finalPath}`;
      }

      console.log(
        '[PDF Debug] template=',
        templateKey,
        'finalPath=',
        finalPath,
        'hasBase64=',
        !!base64,
        'base64Sample=',
        base64?.substring(0, 50),
        'uri=',
        uri,
      );

      if (!uri) throw new Error('No valid uri returned from PDF generator');

      const fileName = finalPath
        ? finalPath.split('/').pop()
        : `${templateKey}.pdf`;

      // Helper: wait until file exists and has non-zero size
      const ensureFileAvailable = async path => {
        if (!path) return false;
        const raw = path.startsWith('file://')
          ? path.replace('file://', '')
          : path;
        const maxAttempts = 10;
        for (let i = 0; i < maxAttempts; i++) {
          try {
            const exists = await RNFS.exists(raw);
            if (exists) {
              try {
                const st = await RNFS.stat(raw);
                if (st && st.size && Number(st.size) > 0) return true;
              } catch (e) {
                return true; // some platforms may not return size reliably
              }
            }
          } catch (e) {
            // ignore and retry
          }
          await new Promise(r => setTimeout(r, 300));
        }
        return false;
      };

      // Helper: copy to app DocumentDirectory (consistent with InvoicePreview) and return new path or null
      const copyToDocumentDir = async (sourcePath, name) => {
        try {
          if (!sourcePath) return null;
          const raw = sourcePath.startsWith('file://')
            ? sourcePath.replace('file://', '')
            : sourcePath;
          const dest = `${RNFS.DocumentDirectoryPath}/${name}`;
          const destExists = await RNFS.exists(dest);
          if (destExists) {
            try {
              await RNFS.unlink(dest);
            } catch (e) {}
          }
          await RNFS.copyFile(raw, dest);
          console.log('[PDF Debug] copied to', dest);
          return `file://${dest}`;
        } catch (e) {
          console.warn('[PDF Debug] cache copy failed', e?.message || e);
          return null;
        }
      };

      // Try to ensure file is available and proactively copy to cache for stable rendering
      if (finalPath) {
        try {
          await ensureFileAvailable(finalPath);
          const cacheUri = await copyToDocumentDir(finalPath, fileName);
          if (cacheUri) uri = cacheUri;
          else {
            // as a last resort try reading base64 so we can fallback later
            try {
              const raw = finalPath.startsWith('file://')
                ? finalPath.replace('file://', '')
                : finalPath;
              const b64 = await RNFS.readFile(raw, 'base64');
              if (b64) base64 = b64;
            } catch (e) {}
          }
        } catch (e) {
          // ignore and continue
        }
      }

      if (!uri && base64) {
        uri = `data:application/pdf;base64,${base64}`;
      }

      return { uri, fileName, filePath: finalPath, base64 };
    } catch (error) {
      console.error('PDF generation error for', templateKey, error);
      throw error;
    }
  };

  const generatePreview = async () => {
    setIsGeneratingPreview(true);
    setPdfUri(null);
    try {
      const pdfFile = await addToPdfQueue(() =>
        generateAndSavePdf(selectedTemplate),
      );
      lastPdfFileRef.current = pdfFile;
      setPdfUri(pdfFile.uri);
    } catch (error) {
      console.error('Preview generation failed:', error);
      Toast.show({
        type: 'error',
        text1: 'Preview Failed',
        text2: error.message || 'Unable to generate preview',
      });
      setPdfUri(null);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Attempt fallback if Pdf component fails to render (copy to DocumentDirectory or base64)
  const handlePdfError = async err => {
    console.warn('[PDF Error] on preview', err);
    const pdfFile = lastPdfFileRef.current;
    if (!pdfFile) return;
    // If we already have base64, use it
    if (pdfFile.base64) {
      setPdfUri(`data:application/pdf;base64,${pdfFile.base64}`);
      return;
    }
    // Try copying again to DocumentDirectory and switch uri
    try {
      if (pdfFile.filePath) {
        const raw = pdfFile.filePath.startsWith('file://')
          ? pdfFile.filePath.replace('file://', '')
          : pdfFile.filePath;
        const docDest = `${RNFS.DocumentDirectoryPath}/${pdfFile.fileName}`;
        try {
          const exists = await RNFS.exists(docDest);
          if (exists) await RNFS.unlink(docDest);
        } catch (e) {}
        await RNFS.copyFile(raw, docDest);
        console.log('[PDF Debug] fallback copied to', docDest);
        setPdfUri(`file://${docDest}`);
        return;
      }
    } catch (e) {
      console.warn('[PDF Error] copy fallback failed', e?.message || e);
    }
    // Final fallback: try to read base64 and set data uri
    try {
      if (pdfFile.filePath) {
        const raw = pdfFile.filePath.startsWith('file://')
          ? pdfFile.filePath.replace('file://', '')
          : pdfFile.filePath;
        const b64 = await RNFS.readFile(raw, 'base64');
        if (b64) setPdfUri(`data:application/pdf;base64,${b64}`);
      }
    } catch (e) {
      console.warn('[PDF Error] base64 fallback failed', e?.message || e);
      Toast.show({
        type: 'error',
        text1: 'Preview Error',
        text2: 'Unable to render preview',
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        `${BASE_URL}/api/settings/default-template`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ defaultTemplate: selectedTemplate }),
        },
      );
      if (response.ok) {
        setFetchedTemplate(selectedTemplate);
        Toast.show({ type: 'success', text1: 'Updated Successfully' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Save Failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const hasUnsavedChanges = selectedTemplate !== fetchedTemplate;
  const currentTemplate =
    templateOptions.find(t => t.value === selectedTemplate) ||
    templateOptions[0];

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* SETTINGS CARD */}
        <View style={styles.card}>
          <Text style={styles.title}>Default Template</Text>
          <Text style={styles.description}>
            Choose your preferred invoice template
          </Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Selected: </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {templateOptions.find(t => t.value === selectedTemplate)
                  ?.label || 'Not set'}
              </Text>
            </View>
            <Check size={16} color="#22c55e" style={{ marginLeft: 'auto' }} />
          </View>

          {hasUnsavedChanges && (
            <View style={styles.alert}>
              <AlertCircle size={16} color="#b45309" />
              <Text style={styles.alertText}>
                Click "Update" to save selection.
              </Text>
            </View>
          )}

          <Text style={styles.label}>Select Default Template</Text>
          <View style={styles.grid}>
            {templateOptions.map(item => (
              <TouchableOpacity
                key={item.value}
                onPress={() => setSelectedTemplate(item.value)}
                style={[
                  styles.templateItem,
                  selectedTemplate === item.value && styles.templateItemActive,
                ]}
              >
                <View style={styles.templateThumb}>
                  <FileText
                    size={24}
                    color={
                      item.color === 'bg-gray-800'
                        ? '#1f2937'
                        : item.color.replace('bg-', '#').replace('-500', '')
                    }
                  />
                </View>
                <Text style={styles.templateLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                {selectedTemplate === item.value && (
                  <View style={styles.checkOverlay}>
                    <Check size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            style={[
              styles.button,
              (!hasUnsavedChanges || isSaving) && styles.buttonDisabled,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.row}>
                <Save size={18} color="#fff" />
                <Text style={styles.buttonText}>Update Template</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* PREVIEW SECTION */}
        <View style={[styles.card, { marginTop: 20 }]}>
          <View style={styles.row}>
            <Eye size={20} color="#374151" />
            <Text style={[styles.title, { marginLeft: 8 }]}>
              Template Preview
            </Text>
          </View>

          <View style={styles.previewHeader}>
            <View
              style={[
                styles.invIcon,
                {
                  backgroundColor:
                    currentTemplate.color
                      .replace('bg-', '#')
                      .replace('-500', '') || '#3b82f6',
                },
              ]}
            >
              <Text style={styles.invIconText}>INV</Text>
            </View>
            <View>
              <Text style={styles.previewName}>{currentTemplate.label}</Text>
              <Text style={styles.previewSize}>
                {currentTemplate.paperSize}
              </Text>
            </View>
          </View>

          {/* PDF VIEW */}
          <View style={styles.pdfContainer}>
            {isGeneratingPreview ? (
              <View style={styles.pdfCentered}>
                <Loader2 size={32} color="#6b7280" />
                <Text style={styles.pdfLoadingText}>Generating Preview...</Text>
              </View>
            ) : pdfUri ? (
              <Pdf
                source={{ uri: pdfUri }}
                fitPolicy={0}
                style={styles.pdf}
                onLoadComplete={numberOfPages =>
                  console.log(`Pages: ${numberOfPages}`)
                }
                onError={error => handlePdfError(error)}
              />
            ) : (
              <View style={styles.pdfCentered}>
                <FileText size={48} color="#e5e7eb" />
                <Text style={styles.pdfLoadingText}>Preview renders here</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: {  paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 2,
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  description: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusLabel: { fontWeight: '500', color: '#374151' },
  badge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  alertText: { fontSize: 12, color: '#92400e', marginLeft: 8 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  templateItem: {
    width: '31%',
    aspectRatio: 0.8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f3f4f6',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateItemActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  templateThumb: {
    height: 40,
    width: 30,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  templateLabel: { fontSize: 11, fontWeight: '500', color: '#374151' },
  checkOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    padding: 2,
  },
  button: {
    backgroundColor: '#3b82f6',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: { backgroundColor: '#93c5fd' },
  buttonText: { color: '#fff', fontWeight: '600', marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  invIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  invIconText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  previewName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  previewSize: { fontSize: 12, color: '#6b7280' },
  pdfContainer: {
    height: 600,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  pdf: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
  },
  pdfCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pdfLoadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
});
