import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  StatusBar,
  Share,
  FlatList, // Added FlatList import
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Updated SafeAreaView import
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Pdf from 'react-native-pdf';
import Toast from 'react-native-toast-message';
import {
  Save,
  Loader2,
  Eye,
  Check,
  AlertCircle,
  FileText,
  Printer,
  Download,
  ArrowLeft,
  Settings,
  Grid,
  Layout,
  File,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  ChevronRight,
  Share as ShareIcon,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Home,
  Filter,
  Search,
  Star,
  Clock,
  TrendingUp,
  Users,
  Award,
} from 'lucide-react-native';
import { BASE_URL } from '../../config';

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

// Dummy data for preview
const dummyCompany = {
  _id: 'company1',
  registrationNumber: 'REG123456',
  businessName: 'Your Company Inc.',
  businessType: 'Private Limited',
  address: '123 Business St',
  mobileNumber: '1234567890',
  gstin: 'GSTIN123456789',
};

const dummyParty = {
  _id: 'party1',
  name: 'Client Name',
  type: 'party',
  createdByClient: 'client1',
  email: 'client@example.com',
  address: '123 Client Street',
  city: 'Client City',
  state: 'Client State',
  gstin: 'GSTIN987654321',
  phone: undefined,
};

const dummyTransaction = {
  _id: 'trans1',
  date: new Date(),
  dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
  invoiceNumber: 'INV-2023-001',
  items: [
    {
      id: '1',
      name: 'Web Development',
      quantity: 1,
      price: 1200,
      taxRate: 18,
    },
    {
      id: '2',
      name: 'UI/UX Design',
      quantity: 1,
      price: 800,
      taxRate: 18,
    },
    {
      id: '3',
      name: 'Consultation',
      quantity: 2,
      price: 100,
      taxRate: 18,
    },
  ],
  type: 'sales',
  amount: 2496,
  paymentMethod: 'cash',
  fromState: undefined,
  toState: undefined,
  services: undefined,
  products: undefined,
  invoiceTotal: undefined,
  taxAmount: 0,
  isExpense: false,
  expense: undefined,
};

const dummyServiceNames = new Map([
  ['service1', 'Web Development'],
  ['service2', 'UI/UX Design'],
  ['service3', 'Consultation'],
]);

const dummyBank = {
  _id: 'bank1',
  client: 'client1',
  user: 'user1',
  company: 'company1',
  bankName: 'Sample Bank',
  managerName: 'John Manager',
  contactNumber: '9876543210',
  email: 'manager@samplebank.com',
  city: 'Mumbai',
  ifscCode: 'SBIN0001234',
  branchAddress: 'Main Branch, Mumbai',
  accountNumber: '1234567890',
  upiId: 'sample@upi',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  __v: 0,
};

const dummyClient = {
  _id: 'client1',
  clientUsername: 'johndoe',
  contactName: 'John Doe',
  email: 'john@example.com',
  phone: '9876543210',
  role: 'admin',
  createdAt: new Date().toISOString(),
  companyName: 'Sample Company',
  subscriptionPlan: 'Premium',
  status: 'Active',
  revenue: 100000,
  users: 5,
  companies: 2,
  totalSales: 50000,
  totalPurchases: 30000,
  maxCompanies: 5,
  maxUsers: 10,
  maxInventories: 1000,
  canSendInvoiceEmail: true,
  canSendInvoiceWhatsapp: true,
  canCreateProducts: true,
  canCreateCustomers: true,
  canCreateVendors: true,
  canCreateCompanies: true,
  canCreateInventory: true,
  canUpdateCompanies: true,
  slug: 'sample-client',
};

const thermalCompany = { ...dummyCompany, businessName: 'Thermal Receipt Co.' };

const templateOptions = [
  {
    value: 'template1',
    label: 'Template 1',
    color: '#3B82F6',
    paperSize: 'A4',
    icon: '📄',
    description: 'Standard invoice template',
    category: 'Standard',
    popularity: 95,
    lastUsed: '2 days ago',
  },
  {
    value: 'template8',
    label: 'Template 2',
    color: '#8B5CF6',
    paperSize: 'A4',
    icon: '📋',
    description: 'Modern design template',
    category: 'Modern',
    popularity: 88,
    lastUsed: '1 week ago',
  },
  {
    value: 'template11',
    label: 'Template 3',
    color: '#1F2937',
    paperSize: 'A4',
    icon: '📑',
    description: 'Professional business template',
    category: 'Professional',
    popularity: 92,
    lastUsed: 'Yesterday',
  },
  {
    value: 'template12',
    label: 'Template 4',
    color: '#10B981',
    paperSize: 'A4',
    icon: '📊',
    description: 'Green themed template',
    category: 'Themed',
    popularity: 75,
    lastUsed: '3 days ago',
  },
  {
    value: 'template16',
    label: 'Template 5',
    color: '#D97706',
    paperSize: 'A4',
    icon: '📈',
    description: 'Premium template',
    category: 'Premium',
    popularity: 85,
    lastUsed: '1 month ago',
  },
  {
    value: 'template17',
    label: 'Template 6',
    color: '#4F46E5',
    paperSize: 'A4',
    icon: '🏢',
    description: 'Corporate template',
    category: 'Corporate',
    popularity: 80,
    lastUsed: '2 weeks ago',
  },
  {
    value: 'template19',
    label: 'Template 7',
    color: '#0D9488',
    paperSize: 'A4',
    icon: '🎯',
    description: 'Minimalist template',
    category: 'Minimal',
    popularity: 90,
    lastUsed: 'Today',
  },
  {
    value: 'template20',
    label: 'Template 8',
    color: '#4F46E5',
    paperSize: 'A4',
    icon: '✨',
    description: 'Modern design template',
    category: 'Modern',
    popularity: 87,
    lastUsed: '4 days ago',
  },
  {
    value: 'template21',
    label: 'Template 9',
    color: '#0D9488',
    paperSize: 'A4',
    icon: '👔',
    description: 'Professional template',
    category: 'Professional',
    popularity: 82,
    lastUsed: '1 week ago',
  },
  {
    value: 'templateA5',
    label: 'Template A5',
    color: '#EC4899',
    paperSize: 'A5 Landscape',
    icon: '📱',
    description: 'Mobile optimized template',
    category: 'Compact',
    popularity: 78,
    lastUsed: '5 days ago',
  },
  {
    value: 'templateA5_2',
    label: 'Template A5-2',
    color: '#10B981',
    paperSize: 'A5',
    icon: '📄',
    description: 'Portrait A5 template',
    category: 'Compact',
    popularity: 70,
    lastUsed: '2 weeks ago',
  },
  {
    value: 'templateA5_3',
    label: 'Template A5-3',
    color: '#F97316',
    paperSize: 'A5',
    icon: '📑',
    description: 'Simple A5 template',
    category: 'Compact',
    popularity: 65,
    lastUsed: '3 weeks ago',
  },
  {
    value: 'templateA5_4',
    label: 'Template A5-4',
    color: '#06B6D4',
    paperSize: 'A5 Landscape',
    icon: '🖼️',
    description: 'Landscape A5 template',
    category: 'Compact',
    popularity: 72,
    lastUsed: '1 month ago',
  },
  {
    value: 'templateA5_5',
    label: 'Template A5-5',
    color: '#06B6D4',
    paperSize: 'A5 Landscape',
    icon: '📋',
    description: 'Alternate A5 template',
    category: 'Compact',
    popularity: 68,
    lastUsed: '2 months ago',
  },
  {
    value: 'template-t3',
    label: 'Template T3',
    color: '#84CC16',
    paperSize: 'Thermal',
    icon: '🧾',
    description: 'Thermal receipt template',
    category: 'Thermal',
    popularity: 95,
    lastUsed: 'Today',
  },
  {
    value: 'template18',
    label: 'Template T3-2',
    color: '#F43F5E',
    paperSize: 'Thermal',
    icon: '🧾',
    description: 'Alternate thermal template',
    category: 'Thermal',
    popularity: 85,
    lastUsed: 'Yesterday',
  },
];

// Helper function to generate PDF and save to file
const generateAndSavePdf = async templateKey => {
  try {
    // Use appropriate data based on template
    const companyData =
      templateKey === 'template18' ? thermalCompany : dummyCompany;

    // Call the appropriate template function
    let pdfResult;
    switch (templateKey) {
      case 'template1':
        pdfResult = await generatePdfForTemplate1(
          dummyTransaction,
          companyData,
          dummyParty,
          dummyServiceNames,
          null,
          dummyBank,
        );
        break;
      case 'template8':
        pdfResult = await generatePdfForTemplate8(
          dummyTransaction,
          companyData,
          dummyParty,
          dummyServiceNames,
          null,
          dummyBank,
        );
        break;
      case 'template11':
        pdfResult = await generatePdfForTemplate11(
          dummyTransaction,
          companyData,
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
          companyData,
          dummyParty,
          dummyServiceNames,
          null,
          dummyBank,
        );
        break;
      case 'template16':
        pdfResult = await generatePdfForTemplate16(
          dummyTransaction,
          companyData,
          dummyParty,
          dummyServiceNames,
          null,
        );
        break;
      case 'template17':
        pdfResult = await generatePdfForTemplate17(
          dummyTransaction,
          companyData,
          dummyParty,
          dummyServiceNames,
          null,
          dummyBank,
        );
        break;
      case 'template18':
        pdfResult = await generatePdfForTemplate18(
          dummyTransaction,
          companyData,
          dummyParty,
          dummyBank,
        );
        break;
      case 'template19':
        pdfResult = await generatePdfForTemplate19(
          dummyTransaction,
          companyData,
          dummyParty,
          dummyServiceNames,
          null,
          dummyBank,
        );
        break;
      case 'template20':
        pdfResult = await generatePdfForTemplate20(
          dummyTransaction,
          companyData,
          dummyParty,
          dummyServiceNames,
          null,
          dummyBank,
        );
        break;
      case 'template21':
        pdfResult = await generatePdfForTemplate21(
          dummyTransaction,
          companyData,
          dummyParty,
          dummyServiceNames,
          null,
          dummyBank,
        );
        break;
      case 'templateA5':
        pdfResult = await generatePdfForTemplateA5(
          dummyTransaction,
          companyData,
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
          companyData,
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
          companyData,
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
          companyData,
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
          companyData,
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
          companyData,
          dummyParty,
          null,
          dummyBank,
        );
        break;
      case 'template3':
        pdfResult = await generatePdfForTemplate3(
          dummyTransaction,
          companyData,
          dummyParty,
          dummyServiceNames,
          null,
        );
        break;
      default:
        pdfResult = await generatePdfForTemplate1(
          dummyTransaction,
          companyData,
          dummyParty,
          dummyServiceNames,
          null,
          dummyBank,
        );
    }

    // Generate unique filename
    const fileName = `template_preview_${templateKey}_${Date.now()}.pdf`;
    const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

    // Handle different return types from PDF functions
    let base64Data;

    const arrayBufferToBase64 = buffer => {
      try {
        if (typeof Buffer !== 'undefined' && Buffer.from) {
          return Buffer.from(buffer).toString('base64');
        }
      } catch (e) {
        // fallthrough
      }

      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;
      let binary = '';
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(
          null,
          Array.from(bytes.subarray(i, i + chunkSize)),
        );
      }
      if (typeof btoa === 'function') return btoa(binary);
      if (typeof global !== 'undefined' && typeof global.btoa === 'function')
        return global.btoa(binary);
      throw new Error('No base64 encoder available');
    };

    const tryDataUri = val => {
      if (typeof val === 'string' && val.startsWith('data:'))
        return val.split(',')[1];
      return null;
    };

    // 1) Data URI string
    base64Data = tryDataUri(pdfResult);

    // 2) Plain base64 string
    if (!base64Data && typeof pdfResult === 'string') {
      base64Data = pdfResult;
    }

    // 3) jsPDF instance with output()
    if (!base64Data && pdfResult && typeof pdfResult.output === 'function') {
      try {
        const dataUri = pdfResult.output('datauristring');
        base64Data = tryDataUri(dataUri) || null;
      } catch (e) {
        try {
          const arr = pdfResult.output('arraybuffer');
          if (arr) base64Data = arrayBufferToBase64(arr);
        } catch (e2) {
          // ignore
        }
      }
    }

    // 4) ArrayBuffer / Uint8Array
    if (
      !base64Data &&
      pdfResult &&
      (pdfResult instanceof ArrayBuffer ||
        pdfResult.buffer instanceof ArrayBuffer)
    ) {
      const buf =
        pdfResult instanceof ArrayBuffer ? pdfResult : pdfResult.buffer;
      base64Data = arrayBufferToBase64(buf);
    }

    // 5) Object containing base64 property
    if (!base64Data && pdfResult && typeof pdfResult === 'object') {
      if (typeof pdfResult.base64 === 'string') base64Data = pdfResult.base64;
      else if (typeof pdfResult.data === 'string') base64Data = pdfResult.data;
    }

    if (!base64Data || typeof base64Data !== 'string') {
      console.error(
        'Unable to convert PDF result to base64',
        typeof pdfResult,
        pdfResult,
      );
      throw new Error('Failed to convert generated PDF to base64');
    }

    // Write PDF to file (base64)
    await RNFS.writeFile(filePath, base64Data, 'base64');

    return {
      uri: `file://${filePath}`,
      fileName: fileName,
      filePath: filePath,
    };
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
};

// Thumbnail cache to avoid regenerating small previews repeatedly
const thumbnailCache = new Map();

// Template Thumbnail Component (includes small PDF thumbnail generation)
const TemplateThumbnail = ({
  template,
  isSelected,
  onSelect,
  onPreview,
  isGenerating,
}) => {
  const [thumbUri, setThumbUri] = useState(null);
  const [loadingThumb, setLoadingThumb] = useState(false);
  const [thumbError, setThumbError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const generateThumb = async () => {
      try {
        if (thumbnailCache.has(template.value)) {
          const cached = thumbnailCache.get(template.value);
          if (mounted) setThumbUri(cached);
          return;
        }

        setLoadingThumb(true);
        const pdfFile = await generateAndSavePdf(template.value);
        // store file uri as thumbnail (Pdf component can render a single page)
        thumbnailCache.set(template.value, pdfFile.uri);
        if (mounted) setThumbUri(pdfFile.uri);
      } catch (err) {
        console.error('Thumbnail generation failed:', err);
        if (mounted) setThumbError(true);
      } finally {
        if (mounted) setLoadingThumb(false);
      }
    };

    generateThumb();
    return () => {
      mounted = false;
    };
  }, [template.value]);

  return (
    <TouchableOpacity
      style={[
        styles.templateCard,
        isSelected && styles.templateCardSelected,
        { borderLeftColor: template.color },
      ]}
      onPress={() => onSelect(template.value)}
      activeOpacity={0.8}
    >
      <View style={styles.templateCardContent}>
        <View style={styles.templateHeader}>
          <View
            style={[
              styles.templateIcon,
              { backgroundColor: template.color + '20' },
            ]}
          >
            <Text style={[styles.templateIconText, { color: template.color }]}>
              {template.icon}
            </Text>
          </View>
          <View style={styles.templateInfo}>
            <Text style={styles.templateLabel} numberOfLines={1}>
              {template.label}
            </Text>
            <Text style={styles.templateSize} numberOfLines={1}>
              {template.paperSize}
            </Text>
          </View>
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Check size={14} color="#10B981" />
            </View>
          )}
        </View>

        {/* Thumbnail area: render small PDF preview if generated */}
        <View style={{ height: 120, marginBottom: 8 }}>
          {loadingThumb ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator size="small" color={template.color} />
            </View>
          ) : thumbUri ? (
            <View
              style={{
                flex: 1,
                borderRadius: 8,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
            >
              <Pdf
                source={{ uri: thumbUri }}
                style={{ flex: 1 }}
                onError={e => console.warn('Thumb Pdf error', e)}
                scale={0.5}
                spacing={0}
                fitPolicy={0}
              />
            </View>
          ) : (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#F1F5F9',
              }}
            >
              <Text style={{ fontSize: 12, color: '#94A3B8' }}>Preview</Text>
            </View>
          )}
        </View>

        <Text style={styles.templateDescription} numberOfLines={2}>
          {template.description}
        </Text>

        <View style={styles.templateStats}>
          <View style={styles.statItem}>
            <Star size={12} color="#F59E0B" />
            <Text style={styles.statText}>{template.popularity}%</Text>
          </View>
          <View style={styles.statItem}>
            <Clock size={12} color="#6B7280" />
            <Text style={styles.statText}>{template.lastUsed}</Text>
          </View>
        </View>

        <View style={styles.templateFooter}>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => onPreview(template)}
          >
            <Eye size={14} color="#3B82F6" />
            <Text style={styles.previewButtonText}>Preview</Text>
          </TouchableOpacity>

          {isGenerating && (
            <ActivityIndicator size="small" color={template.color} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// PDF Preview Modal Component
const PdfPreviewModal = ({
  visible,
  template,
  pdfUri,
  isLoading,
  error,
  onClose,
  onShare,
  onRegenerate,
}) => {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleLoadComplete = numberOfPages => {
    setTotalPages(numberOfPages);
    setPage(1);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: `${template.label} Template Preview`,
        message: `Check out this ${template.label} template preview`,
        url: pdfUri,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTitle}>{template.label}</Text>
            <Text style={styles.modalSubtitle}>
              Page {page} of {totalPages}
            </Text>
          </View>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <ShareIcon size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* PDF Preview Area */}
        <View style={styles.pdfPreviewContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={template.color} />
              <Text style={styles.loadingText}>Generating PDF Preview...</Text>
              <Text style={styles.loadingSubtext}>
                This may take a few moments
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={48} color="#DC2626" />
              <Text style={styles.errorTitle}>Preview Failed</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={onRegenerate}
              >
                <Text style={styles.retryButtonText}>Retry Generation</Text>
              </TouchableOpacity>
            </View>
          ) : pdfUri ? (
            <>
              <View style={styles.pdfContainer}>
                <Pdf
                  source={{ uri: pdfUri }}
                  style={styles.pdf}
                  onLoadComplete={handleLoadComplete}
                  onPageChanged={(page, numberOfPages) => {
                    setPage(page);
                    setTotalPages(numberOfPages);
                  }}
                  onError={error => {
                    console.error('PDF Error:', error);
                    Toast.show({
                      type: 'error',
                      text1: 'PDF Error',
                      text2: 'Failed to load PDF preview',
                    });
                  }}
                  enablePaging={true}
                  fitPolicy={0}
                  scale={scale}
                  minScale={0.5}
                  maxScale={3}
                  spacing={10}
                />
              </View>

              {/* Controls */}
              <View style={styles.controlsContainer}>
                <View style={styles.pageControls}>
                  <TouchableOpacity
                    style={[
                      styles.controlButton,
                      page === 1 && styles.controlButtonDisabled,
                    ]}
                    onPress={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    <ArrowLeft
                      size={20}
                      color={page === 1 ? '#9CA3AF' : '#374151'}
                    />
                  </TouchableOpacity>

                  <Text style={styles.pageInfo}>
                    {page} / {totalPages}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.controlButton,
                      page === totalPages && styles.controlButtonDisabled,
                    ]}
                    onPress={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight
                      size={20}
                      color={page === totalPages ? '#9CA3AF' : '#374151'}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.zoomControls}>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => setScale(Math.max(0.5, scale - 0.25))}
                  >
                    <ZoomOut size={20} color="#374151" />
                  </TouchableOpacity>

                  <Text style={styles.zoomText}>
                    {Math.round(scale * 100)}%
                  </Text>

                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => setScale(Math.min(3, scale + 0.25))}
                  >
                    <ZoomIn size={20} color="#374151" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* Template Info */}
        <View style={styles.templateInfoContainer}>
          <View style={styles.templateInfoHeader}>
            <View
              style={[
                styles.templateInfoIcon,
                { backgroundColor: template.color + '20' },
              ]}
            >
              <Text
                style={[styles.templateInfoIconText, { color: template.color }]}
              >
                {template.icon}
              </Text>
            </View>
            <View style={styles.templateInfoContent}>
              <Text style={styles.templateInfoName}>{template.label}</Text>
              <Text style={styles.templateInfoDescription}>
                {template.description}
              </Text>
            </View>
          </View>

          <View style={styles.templateMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Paper Size:</Text>
              <Text style={styles.metaValue}>{template.paperSize}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Category:</Text>
              <Text
                style={[
                  styles.metaValue,
                  {
                    color: template.color,
                    backgroundColor: template.color + '20',
                  },
                ]}
              >
                {template.category}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Popularity:</Text>
              <View style={styles.popularityBar}>
                <View
                  style={[
                    styles.popularityFill,
                    {
                      width: `${template.popularity}%`,
                      backgroundColor: template.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.popularityText}>{template.popularity}%</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Main Component
const TemplateSettings = () => {
  const [selectedTemplate, setSelectedTemplate] = useState('template1');
  const [fetchedTemplate, setFetchedTemplate] = useState('template1');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [pdfUri, setPdfUri] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [categories] = useState([
    'All',
    'Standard',
    'Modern',
    'Professional',
    'Themed',
    'Premium',
    'Corporate',
    'Minimal',
    'Compact',
    'Thermal',
  ]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [windowDimensions, setWindowDimensions] = useState(
    Dimensions.get('window'),
  );

  // Handle Dimensions changes correctly
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });

    return () => {
      // Correct way to remove event listener in React Native >= 0.65
      subscription?.remove();
    };
  }, []);

  // Filter templates
  const filteredTemplates = templateOptions.filter(template => {
    const matchesCategory =
      selectedCategory === 'All' || template.category === selectedCategory;
    const matchesSearch =
      template.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate number of columns based on screen width
  const numColumns = windowDimensions.width > 768 ? 3 : 2;

  // Load saved template
  const loadTemplateSetting = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'Please login again.',
        });
        return;
      }

      const response = await fetch(
        `${BASE_URL}/api/settings/default-template`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const template = data.defaultTemplate || 'template1';
        setSelectedTemplate(template);
        setFetchedTemplate(template);
      } else if (response.status === 404) {
        setSelectedTemplate('template1');
        setFetchedTemplate('template1');
      } else {
        throw new Error('Failed to fetch template');
      }
    } catch (error) {
      console.error('Failed to load template setting:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load template settings.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle preview
  const handlePreview = useCallback(async template => {
    setPreviewTemplate(template);
    setShowPreview(true);
    setIsGeneratingPdf(true);
    setPdfError(null);
    setPdfUri(null);

    try {
      const pdfFile = await generateAndSavePdf(template.value);
      setPdfUri(pdfFile.uri);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      setPdfError(error.message);
      Toast.show({
        type: 'error',
        text1: 'PDF Generation Failed',
        text2: 'Could not generate PDF preview',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  }, []);

  // Regenerate PDF
  const handleRegeneratePdf = useCallback(async () => {
    if (!previewTemplate) return;

    setIsGeneratingPdf(true);
    setPdfError(null);

    try {
      const pdfFile = await generateAndSavePdf(previewTemplate.value);
      setPdfUri(pdfFile.uri);
    } catch (error) {
      setPdfError(error.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [previewTemplate]);

  // Save template
  const saveTemplate = useCallback(async () => {
    if (selectedTemplate === fetchedTemplate) return;

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'Please login again.',
        });
        return;
      }

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
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Default template updated successfully.',
        });
      } else {
        throw new Error('Failed to save template');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      Toast.show({
        type: 'error',
        text1: 'Save Error',
        text2: 'Failed to save template setting.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedTemplate, fetchedTemplate]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTemplateSetting();
    setRefreshing(false);
  }, [loadTemplateSetting]);

  // Initialize
  useEffect(() => {
    loadTemplateSetting();
  }, [loadTemplateSetting]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading templates...</Text>
      </SafeAreaView>
    );
  }

  const currentTemplate =
    templateOptions.find(t => t.value === fetchedTemplate) ||
    templateOptions[0];
  const hasUnsavedChanges = selectedTemplate !== fetchedTemplate;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Template Settings</Text>
          <Text style={styles.headerSubtitle}>
            Choose your default invoice template
          </Text>
        </View>

        <View style={styles.headerStats}>
          <View style={styles.statBox}>
            <Users size={16} color="#3B82F6" />
            <Text style={styles.statValue}>{templateOptions.length}</Text>
            <Text style={styles.statLabel}>Templates</Text>
          </View>
          <View style={styles.statBox}>
            <TrendingUp size={16} color="#10B981" />
            <Text style={styles.statValue}>95%</Text>
            <Text style={styles.statLabel}>Usage</Text>
          </View>
        </View>
      </View>

      {/* Current Template */}
      <View style={styles.currentTemplateSection}>
        <Text style={styles.sectionTitle}>Current Template</Text>
        <View style={styles.currentTemplateCard}>
          <View style={styles.currentTemplateHeader}>
            <View
              style={[
                styles.currentTemplateIcon,
                { backgroundColor: currentTemplate.color + '20' },
              ]}
            >
              <Text
                style={[
                  styles.currentTemplateIconText,
                  { color: currentTemplate.color },
                ]}
              >
                {currentTemplate.icon}
              </Text>
            </View>
            <View style={styles.currentTemplateDetails}>
              <View style={styles.currentTemplateTitleRow}>
                <Text style={styles.currentTemplateName}>
                  {currentTemplate.label}
                </Text>
                <View style={styles.activeBadge}>
                  <CheckCircle size={12} color="#10B981" />
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              </View>
              <Text style={styles.currentTemplateDescription}>
                {currentTemplate.description}
              </Text>
              <View style={styles.currentTemplateMeta}>
                <Text style={styles.currentTemplateMetaItem}>
                  {currentTemplate.paperSize}
                </Text>
                <Text style={styles.currentTemplateMetaDivider}>•</Text>
                <Text
                  style={[
                    styles.currentTemplateMetaItem,
                    { color: currentTemplate.color },
                  ]}
                >
                  {currentTemplate.category}
                </Text>
                <Text style={styles.currentTemplateMetaDivider}>•</Text>
                <View style={styles.popularityContainer}>
                  <Star size={12} color="#F59E0B" />
                  <Text style={styles.popularityText}>
                    {currentTemplate.popularity}%
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {hasUnsavedChanges && (
            <View style={styles.unsavedAlert}>
              <AlertTriangle size={16} color="#D97706" />
              <Text style={styles.unsavedAlertText}>
                You have unsaved changes
              </Text>
              <TouchableOpacity
                style={styles.saveNowButton}
                onPress={saveTemplate}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveNowButtonText}>Save Now</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categorySection}>
        <Text style={styles.sectionTitle}>Filter by Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === category &&
                    styles.categoryButtonTextActive,
                ]}
              >
                {category}
              </Text>
              {selectedCategory === category && (
                <View style={styles.categoryButtonIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Templates Grid */}
      <View style={styles.templatesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Available Templates ({filteredTemplates.length})
          </Text>
          <TouchableOpacity style={styles.helpButton}>
            <Info size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredTemplates}
          renderItem={({ item }) => (
            <TemplateThumbnail
              template={item}
              isSelected={selectedTemplate === item.value}
              onSelect={setSelectedTemplate}
              onPreview={handlePreview}
              isGenerating={
                isGeneratingPdf && previewTemplate?.value === item.value
              }
            />
          )}
          keyExtractor={item => item.value}
          numColumns={numColumns}
          contentContainerStyle={styles.templatesGrid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
        />
      </View>

      {/* Preview Modal */}
      <PdfPreviewModal
        visible={showPreview}
        template={previewTemplate}
        pdfUri={pdfUri}
        isLoading={isGeneratingPdf}
        error={pdfError}
        onClose={() => {
          setShowPreview(false);
          setPreviewTemplate(null);
          setPdfUri(null);
          setPdfError(null);
        }}
        onShare={() => {
          // Share functionality
        }}
        onRegenerate={handleRegeneratePdf}
      />

      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  currentTemplateSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  currentTemplateCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  currentTemplateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentTemplateIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currentTemplateIconText: {
    fontSize: 28,
  },
  currentTemplateDetails: {
    flex: 1,
  },
  currentTemplateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  currentTemplateName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#065F46',
  },
  currentTemplateDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  currentTemplateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentTemplateMetaItem: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  currentTemplateMetaDivider: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  popularityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popularityText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  unsavedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 8,
  },
  unsavedAlertText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  saveNowButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveNowButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  categorySection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  categoryContainer: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  categoryContent: {
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  categoryButtonIndicator: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  templatesSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  helpButton: {
    padding: 4,
  },
  templatesGrid: {
    paddingBottom: 30,
  },
  templateCard: {
    flex: 1,
    margin: 6,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 220,
  },
  templateCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    shadowOpacity: 0.1,
    elevation: 3,
  },
  templateCardContent: {
    padding: 16,
    flex: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  templateIconText: {
    fontSize: 24,
  },
  templateInfo: {
    flex: 1,
  },
  templateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  templateSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  templateStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  previewButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  shareButton: {
    padding: 8,
  },
  pdfPreviewContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  pdfContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  pdf: {
    flex: 1,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  pageControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  pageInfo: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    minWidth: 60,
    textAlign: 'center',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoomText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    minWidth: 50,
    textAlign: 'center',
  },
  templateInfoContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  templateInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  templateInfoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  templateInfoIconText: {
    fontSize: 24,
  },
  templateInfoContent: {
    flex: 1,
  },
  templateInfoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  templateInfoDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  templateMeta: {
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    width: 80,
  },
  metaValue: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularityBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  popularityFill: {
    height: '100%',
    borderRadius: 3,
  },
});

export default TemplateSettings;
