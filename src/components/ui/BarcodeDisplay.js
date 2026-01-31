import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import WebView from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNPrint from 'react-native-print';
import { generatePDF } from 'react-native-html-to-pdf';
import Clipboard from '@react-native-clipboard/clipboard';

const { width } = Dimensions.get('window');

const BarcodeDisplay = ({
  value,
  productName,
  productId,
  stockQuantity = 0,
  compact = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printQuantity, setPrintQuantity] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(100);

  // ✅ Safe value for WebView
  const safeValue = useMemo(() => {
    const val = value || productId;
    return val ? String(val).trim() : '000000';
  }, [value, productId]);

  // ✅ Auto-fill quantity based on stock
  useEffect(() => {
    if (isPrintDialogOpen && stockQuantity > 0) {
      const initialValue = Math.min(stockQuantity, 100);
      setPrintQuantity(initialValue);
    } else if (isPrintDialogOpen && stockQuantity === 0) {
      setPrintQuantity(1);
    }
  }, [isPrintDialogOpen, stockQuantity]);

  // ✅ HTML for WebView barcode display
  const barcodeHTML = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh;
            background: white;
          }
          .barcode-container {
            text-align: center;
            padding: 10px;
          }
          #barcode { 
            width: 100%; 
            max-width: 300px;
            height: auto;
          }
          .barcode-value {
            margin-top: 10px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="barcode-container">
          <svg id="barcode"></svg>
          <div class="barcode-value">${safeValue}</div>
        </div>
        <script>
          try {
            JsBarcode("#barcode", "${safeValue}", {
              format: "CODE128",
              width: 2,
              height: 60,
              displayValue: false,
              margin: 10,
              background: "transparent",
              lineColor: "#000000"
            });
            
            // Send height back to React Native
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: 'height',
                height: document.getElementById('barcode').getBoundingClientRect().height + 30
              })
            );
          } catch(error) {
            document.body.innerHTML = '<div style="color:red; padding:20px; text-align:center;">Invalid Barcode Data</div>';
          }
        </script>
      </body>
      </html>
    `;
  }, [safeValue]);

  // ✅ Generate HTML for thermal printing (same as before)
  const generateBarcodeHTML = qty => {
    let labelsHtml = '';

    for (let i = 0; i < qty; i++) {
      const isLastLabel = i === qty - 1;
      labelsHtml += `
        <div style="
          width: 220px; 
          padding: 10px; 
          text-align: center; 
          font-family: sans-serif; 
          ${!isLastLabel ? 'border-bottom: 1px dashed #999;' : ''}
          page-break-inside: avoid;
          margin-bottom: ${!isLastLabel ? '8px' : '0'};
        ">
          <h2 style="font-size: 14px; margin: 0 0 5px 0; font-weight: bold;">${productName}</h2>
          <img id="barcode${i}" style="width: 200px; height: 50px; margin: 5px 0;" />
          <p style="font-size: 10px; margin: 5px 0 0 0; color: #555;">ID: ${productId}</p>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
          <script>
            JsBarcode("#barcode${i}", "${safeValue}", {
              format: "CODE128",
              width: 2,
              height: 50,
              displayValue: false,
              margin: 0,
              background: "#ffffff",
              lineColor: "#000000"
            });
          </script>
        </div>
      `;
    }

    const labelHeight = 80;
    const pageHeight = Math.max(280, labelHeight * qty + 20);

    return `
      <html>
        <head>
          <meta name="viewport" content="width=220, initial-scale=1.0">
          <style>
            @page { size: 220px ${pageHeight}px; margin: 0; }
            body { margin: 0; padding: 8px; width: 220px; }
          </style>
        </head>
        <body>${labelsHtml}</body>
      </html>
    `;
  };

  // ✅ Handle WebView messages for dynamic height
  const handleWebViewMessage = event => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'height') {
        setWebViewHeight(data.height);
      }
    } catch (error) {
      console.log('WebView message error:', error);
    }
  };

  const handleThermalPrint = async () => {
    const qty = parseInt(printQuantity);
    if (isNaN(qty) || qty < 1 || qty > 100) {
      Alert.alert(
        'Invalid Quantity',
        'Please enter a number between 1 and 100',
      );
      return;
    }

    setIsPrinting(true);
    try {
      const html = generateBarcodeHTML(qty);

      // Generate PDF using react-native-html-to-pdf
      const results = await generatePDF({
        html: html,
        fileName: `Barcode_${productId}_${Date.now()}`,
        directory: 'Documents',
        base64: true, // Keep base64 if needed, otherwise remove
        width: 216, // 3 inches in mm (common thermal paper width)
        height: 100,
      });

      // Print the generated PDF
      await RNPrint.print({
        filePath: results.filePath,
        isLandscape: false,
      });

      Alert.alert(
        'Print Started',
        `Printing ${qty} barcode label(s) for ${productName}`,
      );

      setIsPrintDialogOpen(false);
      setPrintQuantity(1);
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Print Error', 'Failed to print barcodes');
    } finally {
      setIsPrinting(false);
    }
  };

  const copyToClipboard = () => {
    Clipboard.setString(safeValue);
    Alert.alert('Copied!', 'Barcode value copied to clipboard');
  };

  const incrementQuantity = () =>
    setPrintQuantity(prev => Math.min(100, prev + 1));
  const decrementQuantity = () =>
    setPrintQuantity(prev => Math.max(1, prev - 1));

  // ✅ Print Dialog (same as before)
  const renderPrintDialog = () => (
    <Modal
      visible={isPrintDialogOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setIsPrintDialogOpen(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.printDialogContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Print Barcode Labels</Text>
              <Text style={styles.modalSubtitle}>
                Enter quantity for thermal printing
              </Text>
            </View>
            <TouchableOpacity onPress={() => setIsPrintDialogOpen(false)}>
              <Icon name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.printDialogScroll}>
            {/* Product Info Card */}
            <View style={styles.productInfoCard}>
              <View style={styles.productInfoRow}>
                <View style={styles.productInfoLeft}>
                  <Text style={styles.productInfoName}>{productName}</Text>
                  <Text style={styles.productInfoId}>ID: {productId}</Text>
                </View>
                <View style={styles.stockBadge}>
                  <Icon name="inventory-2" size={14} color="#1e40af" />
                  <Text style={styles.stockBadgeText}>
                    Stock: {stockQuantity}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quantity Section */}
            <View style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>Print Copies</Text>
              <View style={styles.quantityControlsRow}>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      printQuantity <= 1 && styles.quantityButtonDisabled,
                    ]}
                    onPress={decrementQuantity}
                    disabled={printQuantity <= 1}
                  >
                    <Text style={styles.quantityButtonText}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.quantityInput}
                    keyboardType="numeric"
                    value={String(printQuantity)}
                    onChangeText={t => {
                      let val = t.replace(/[^0-9]/g, '');
                      if (val === '') {
                        setPrintQuantity(1);
                        return;
                      }
                      let num = parseInt(val, 10);
                      if (num < 1) num = 1;
                      if (num > 100) num = 100;
                      setPrintQuantity(num);
                    }}
                  />
                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      printQuantity >= 100 && styles.quantityButtonDisabled,
                    ]}
                    onPress={incrementQuantity}
                    disabled={printQuantity >= 100}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.labelsSuffix}>
                  label{printQuantity !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {/* Auto-fill Text */}
            <Text style={styles.autoFillText}>
              Auto-filled based on available stock ({stockQuantity} units)
            </Text>

            {/* Print Preview Box */}
            <View style={styles.previewBox}>
              <View style={styles.previewHeader}>
                <View style={styles.pulsingDot} />
                <Text style={styles.previewTitle}>Print Preview:</Text>
              </View>
              <View style={styles.previewList}>
                <Text style={styles.previewItem}>
                  • <Text style={styles.previewBold}>Product:</Text>{' '}
                  {productName}
                </Text>
                <Text style={styles.previewItem}>
                  • <Text style={styles.previewBold}>Current Stock:</Text>{' '}
                  {stockQuantity} units
                </Text>
                <Text style={styles.previewItem}>
                  • <Text style={styles.previewBold}>Print Copies:</Text>{' '}
                  {printQuantity} labels
                </Text>
                <Text style={styles.previewItem}>
                  •{' '}
                  <Text style={styles.previewGreen}>
                    Each label will show stock quantity
                  </Text>
                </Text>
              </View>

              {/* Warning Messages */}
              {printQuantity > stockQuantity && stockQuantity > 0 && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    ⚠️ Note: Printing {printQuantity} labels but stock is{' '}
                    {stockQuantity}
                  </Text>
                </View>
              )}

              {stockQuantity === 0 && (
                <View style={styles.dangerBox}>
                  <Text style={styles.dangerText}>
                    ⚠️ Warning: Product is out of stock (0 units)
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.printDialogFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setIsPrintDialogOpen(false);
                setPrintQuantity(1);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.printButton,
                (isPrinting || stockQuantity < 0) && styles.printButtonDisabled,
              ]}
              onPress={handleThermalPrint}
              disabled={isPrinting || stockQuantity < 0}
            >
              {isPrinting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Icon name="print" size={18} color="white" />
                  <Text style={styles.printButtonText}>
                    Print {printQuantity} Label{printQuantity !== 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View>
      <TouchableOpacity
        style={compact ? styles.compactButton : styles.viewButton}
        onPress={() => setIsModalOpen(true)}
      >
        <Icon name="qr-code" size={compact ? 16 : 18} color="#3b82f6" />
        {compact && <Text style={styles.compactButtonText}>View</Text>}
      </TouchableOpacity>

      {/* ✅ Main Barcode Modal with WebView */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Product Barcode</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Icon name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.barcodeSection}>
              <Text style={styles.productNameLarge}>{productName}</Text>
              <Text style={styles.productIdText}>ID: {productId}</Text>

              {/* Barcode Value Display */}
              <Text style={styles.barcodeValueText}>
                Barcode Value: {safeValue}
              </Text>

              {/* WebView for Barcode */}
              <View style={[styles.barcodeWrapper, { height: webViewHeight }]}>
                {safeValue && safeValue !== '000000' ? (
                  <WebView
                    source={{ html: barcodeHTML }}
                    style={styles.webview}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    onMessage={handleWebViewMessage}
                    scrollEnabled={false}
                    originWhitelist={['*']}
                    mixedContentMode="always"
                    androidLayerType="hardware"
                  />
                ) : (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#3b82f6" size="large" />
                    <Text style={styles.loadingText}>
                      Generating barcode...
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    setIsModalOpen(false);
                    setTimeout(() => setIsPrintDialogOpen(true), 300);
                  }}
                >
                  <Icon name="print" size={18} color="#3b82f6" />
                  <Text style={styles.actionButtonText}>Print</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={copyToClipboard}
                >
                  <Icon name="content-copy" size={18} color="#3b82f6" />
                  <Text style={styles.actionButtonText}>Copy Value</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {renderPrintDialog()}
    </View>
  );
};

const styles = StyleSheet.create({
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  compactButtonText: { fontSize: 11, color: '#3b82f6', fontWeight: '600' },
  viewButton: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  barcodeSection: { padding: 20, alignItems: 'center' },
  productNameLarge: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  productIdText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  barcodeValueText: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  barcodeWrapper: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    width: width * 0.8,
    overflow: 'hidden',
    minHeight: 120,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748b',
  },
  actionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#3b82f6' },

  // Print Dialog Styles (same as before)
  printDialogContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  printDialogScroll: { padding: 20 },
  productInfoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  productInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfoLeft: {
    flex: 1,
  },
  productInfoName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  productInfoId: {
    fontSize: 12,
    color: '#64748b',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  quantitySection: { marginBottom: 12 },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 10,
  },
  quantityControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  quantityButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderColor: '#e2e8f0',
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#475569',
  },
  quantityInput: {
    width: 80,
    height: 40,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  labelsSuffix: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  autoFillText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  previewBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  previewList: {
    paddingLeft: 16,
    gap: 4,
  },
  previewItem: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  previewBold: {
    fontWeight: '600',
    color: '#475569',
  },
  previewGreen: {
    fontWeight: '600',
    color: '#059669',
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
  },
  dangerBox: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
  },
  dangerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991b1b',
  },
  printDialogFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
  },
  cancelButtonText: { fontWeight: '600', color: '#64748b' },
  printButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  printButtonText: { color: 'white', fontWeight: 'bold' },
  printButtonDisabled: { opacity: 0.5 },
});

export default BarcodeDisplay;
