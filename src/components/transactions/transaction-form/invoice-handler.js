import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'react-native-fs';
import Share from 'react-native-share';

// Import all your PDF template generators
import { generatePdfForTemplate1 } from '../../../lib/pdf-template1';
import { generatePdfForTemplate2 } from '../../../lib/pdf-template2';
import { generatePdfForTemplate3 } from '../../../lib/pdf-template3';
import { generatePdfForTemplate4 } from '../../../lib/pdf-template4';
import { generatePdfForTemplate5 } from '../../../lib/pdf-template5';
import { generatePdfForTemplate6 } from '../../../lib/pdf-template6';
import { generatePdfForTemplate7 } from '../../../lib/pdf-template7';
import { generatePdfForTemplate8 } from '../../../lib/pdf-template8';
import { generatePdfForTemplate11 } from '../../../lib/pdf-template11';
import { generatePdfForTemplate12 } from '../../../lib/pdf-template12';
import { generatePdfForTemplateA5 } from '../../../lib/pdf-templateA5';
import { generatePdfForTemplateA5_3 } from '../../../lib/pdf-templateA5-3';
import { generatePdfForTemplateA5_4 } from '../../../lib/pdf-templateA5-4';
import { generatePdfForTemplateA5_2 } from '../../../lib/pdf-templateA3-2';
import { generatePdfForTemplate16 } from '../../../lib/pdf-template16';
import { generatePdfForTemplate17 } from '../../../lib/pdf-template17';
import { generatePdfForTemplate18 } from '../../../lib/pdf-template18';
import { generatePdfForTemplate19 } from '../../../lib/pdf-template19';
import { generatePdfForTemplatet3 } from '../../../lib/pdf-template-t3'; // Missing import added

// Shared helper to centralize template -> generator mapping
export async function generatePdfByTemplate(
  selectedTemplate,
  enrichedTransaction,
  companyDoc,
  partyDoc,
  serviceNameById = new Map(),
  shippingAddress,
  bank,
) {
  try {
    let result;
    switch (selectedTemplate) {
      case 'template1':
        result = await generatePdfForTemplate1(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
          shippingAddress,
          bank,
        );
        break;
      case 'template2':
        result = await generatePdfForTemplate2(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
        );
        break;
      case 'template3':
        result = await generatePdfForTemplate3(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
        );
        break;
      case 'template4':
        result = await generatePdfForTemplate4(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
        );
        break;
      case 'template5':
        result = await generatePdfForTemplate5(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
        );
        break;
      case 'template6':
        result = await generatePdfForTemplate6(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
        );
        break;
      case 'template7':
        result = await generatePdfForTemplate7(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
        );
        break;
      case 'template8':
        result = await generatePdfForTemplate8(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
        );
        break;
      case 'template11':
        result = await generatePdfForTemplate11(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
        );
        break;
      case 'template12':
        result = await generatePdfForTemplate12(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
        );
        break;
      case 'template16':
        result = await generatePdfForTemplate16(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
          shippingAddress,
        );
        break;
      case 'template17':
        result = await generatePdfForTemplate17(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
          shippingAddress,
          bank,
        );
        break;
      case 'template18':
        result = await generatePdfForTemplate18(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
          shippingAddress,
          bank,
        );
        break;
      case 'template19':
        result = await generatePdfForTemplate19(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
          shippingAddress,
          bank,
        );
        break;
      case 'templateA5':
        result = await generatePdfForTemplateA5(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
          shippingAddress,
          bank,
        );
        break;
      case 'templateA5_2':
        result = await generatePdfForTemplateA5_2(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
          shippingAddress,
          bank,
        );
        break;
      case 'templateA5_3':
        result = await generatePdfForTemplateA5_3(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
          shippingAddress,
          bank,
        );
        break;
      case 'templateA5_4':
        result = await generatePdfForTemplateA5_4(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
          shippingAddress,
          bank,
        );
        break;
      case 'template-t3':
        result = await generatePdfForTemplatet3(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          shippingAddress,
          bank,
        );
        break;
      default:
        result = await generatePdfForTemplate1(
          enrichedTransaction,
          companyDoc,
          partyDoc,
          serviceNameById,
          shippingAddress,
          bank,
        );
        break;
    }

    return result;
  } catch (error) {
    throw error;
  }
}

const InvoiceTemplateRenderer = ({ invoiceData }) => {
  const [pdfBase64, setPdfBase64] = useState('');
  const [pdfPath, setPdfPath] = useState('');
  const [pdfUri, setPdfUri] = useState('');
  const [loading, setLoading] = useState(true);
  const [webViewKey, setWebViewKey] = useState(0);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);

  useEffect(() => {
    const generatePreview = async () => {
      if (!invoiceData) return;

      try {
        setLoading(true);
        setUseFallbackViewer(false);

        const companyDoc = invoiceData.company;
        const partyDoc = invoiceData.party;

        if (!companyDoc || !partyDoc) {
          throw new Error('Company or party data is missing');
        }

        const pdfResult = await generatePdfByTemplate(
          invoiceData.selectedTemplate || 'template1',
          invoiceData,
          companyDoc,
          partyDoc,
          invoiceData.serviceNameById || new Map(),
          invoiceData.shippingAddress,
          invoiceData.bank,
        );

        let finalBase64;

        // Enhanced PDF result handling for React Native
        if (pdfResult && typeof pdfResult.output === 'function') {
          // jsPDF instance
          finalBase64 = pdfResult.output('base64');
        } else if (pdfResult && typeof pdfResult.arrayBuffer === 'function') {
          // Blob object (React Native compatible check)
          const arrayBuffer = await pdfResult.arrayBuffer();
          finalBase64 = arrayBufferToBase64(arrayBuffer);
        } else if (
          pdfResult &&
          pdfResult._blob &&
          typeof pdfResult._blob.arrayBuffer === 'function'
        ) {
          // Alternative blob detection for React Native
          const arrayBuffer = await pdfResult._blob.arrayBuffer();
          finalBase64 = arrayBufferToBase64(arrayBuffer);
        } else if (typeof pdfResult === 'string' && pdfResult.length > 0) {
          // Already base64 string
          finalBase64 = pdfResult;
        } else {
          // Last resort - try to use output method if available
          if (pdfResult && typeof pdfResult.output === 'function') {
            finalBase64 = pdfResult.output('base64');
          } else {
            throw new Error('Unsupported PDF format generated');
          }
        }

        if (!finalBase64) {
          throw new Error('Failed to generate PDF data');
        }

        setPdfBase64(finalBase64);
        await savePdfToFileSystem(finalBase64);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Generation Failed',
          text2: error.message || 'Failed to generate PDF preview',
        });
      } finally {
        setLoading(false);
      }
    };

    generatePreview();
  }, [invoiceData]);

  // Helper function to convert ArrayBuffer to Base64
  const arrayBufferToBase64 = buffer => {
    try {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (error) {
      throw new Error('Failed to convert PDF data to base64');
    }
  };

  const savePdfToFileSystem = async base64Data => {
    try {
      const fileName = `invoice_${
        invoiceData?.invoiceNumber || Date.now()
      }.pdf`;
      const path = `${FileSystem.DocumentDirectoryPath}/${fileName}`;

      await FileSystem.writeFile(path, base64Data, 'base64');
      setPdfPath(path);
      setPdfUri(`file://${path}`);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: 'Failed to save PDF locally',
      });
    }
  };

  const handleSharePdf = async () => {
    if (!pdfPath) {
      Toast.show({
        type: 'error',
        text1: 'PDF Not Ready',
        text2: 'Please wait for PDF generation',
      });
      return;
    }

    try {
      const shareOptions = {
        url: `file://${pdfPath}`,
        type: 'application/pdf',
        filename: `Invoice_${invoiceData?.invoiceNumber || Date.now()}.pdf`,
        subject: `Invoice ${invoiceData?.invoiceNumber || ''}`,
      };

      await Share.open(shareOptions);
    } catch (error) {
      if (error.message !== 'User did not share') {
        Toast.show({
          type: 'error',
          text1: 'Share Failed',
          text2: 'Failed to share PDF',
        });
      }
    }
  };

  const handleViewPdf = () => {
    if (!pdfPath) {
      Toast.show({
        type: 'error',
        text1: 'PDF Not Ready',
        text2: 'PDF is not available for viewing',
      });
      return;
    }

    // Force WebView reload with current PDF
    setWebViewKey(prev => prev + 1);

    Toast.show({
      type: 'success',
      text1: 'PDF Loaded',
      text2: 'PDF is successfully loaded in preview',
    });
  };

  const handleWebViewError = () => {
    setUseFallbackViewer(true);

    Toast.show({
      type: 'info',
      text1: 'Using Fallback Viewer',
      text2: 'Loading PDF with alternative method',
    });
  };

  const getWebViewSource = () => {
    if (useFallbackViewer && pdfPath) {
      // Use Google Docs as fallback viewer
      const encodedUri = encodeURIComponent(`file://${pdfPath}`);
      return {
        uri: `https://docs.google.com/gview?embedded=true&url=${encodedUri}`,
      };
    }

    // Use local file URI first, then fallback to data URI
    if (pdfUri) {
      return { uri: pdfUri };
    }

    return { uri: `data:application/pdf;base64,${pdfBase64}` };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Generating preview...</Text>
      </View>
    );
  }

  if (!pdfBase64) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to generate invoice preview</Text>
        <Text style={styles.subErrorText}>
          Please check your data and try again
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => window.location.reload()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        key={webViewKey}
        source={getWebViewSource()}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        onError={handleWebViewError}
        onLoadEnd={() => {}}
        renderError={() => (
          <View style={styles.webviewError}>
            <Text style={styles.webviewErrorText}>
              Failed to load PDF preview
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleWebViewError}
            >
              <Text style={styles.retryButtonText}>Use Fallback Viewer</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleViewPdf}
          disabled={!pdfPath}
        >
          <Text style={styles.buttonText}>
            {pdfPath ? 'Reload PDF' : 'Generating...'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.shareButton]}
          onPress={handleSharePdf}
          disabled={!pdfPath}
        >
          <Text style={styles.buttonText}>
            {pdfPath ? 'Share PDF' : 'Please Wait...'}
          </Text>
        </TouchableOpacity>
      </View>

      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  webview: {
    flex: 1,
    width: '100%',
  },
  webviewError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webviewErrorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 400,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 400,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 8,
  },
  subErrorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default InvoiceTemplateRenderer;
