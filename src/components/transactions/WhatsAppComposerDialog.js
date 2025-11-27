import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Card, Button, Portal } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function WhatsAppComposerDialog({
  isOpen,
  onClose,
  transaction,
  party,
  company,
  onGeneratePdf,
  serviceNameById,
  products = [],
  services = [],
}) {
  const [messageContent, setMessageContent] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function for currency formatting
  const formatCurrency = amount => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Helper function for date formatting
  const formatDate = dateString => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';

      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();

      return `${day} ${month}, ${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Helper function for simple date formatting (dd/MM/yyyy)
  const formatSimpleDate = dateString => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error formatting simple date:', error);
      return 'N/A';
    }
  };

  // Function to generate the structured message content
  const generateDefaultMessageContent = () => {
    const invoiceNumber =
      transaction.invoiceNumber || transaction.referenceNumber || 'N/A';

    const invoiceDate = formatDate(transaction.date);

    // Debug: Check both products and services
    console.log('=== TRANSACTION DEBUG ===');
    console.log('Products array:', transaction.products);
    console.log('Services array:', transaction.services);
    console.log('Available products prop:', products);
    console.log('Available services prop:', services);
    console.log('=== END DEBUG ===');

    // Combine both products and services into one array
    const transactionProducts = transaction.products || [];
    const transactionServices = transaction.services || [];
    const allItems = [...transactionProducts, ...transactionServices];

    const subtotal =
      transaction.subtotal ||
      allItems.reduce(
        (sum, item) => sum + (item.amount || item.lineTotal || 0),
        0,
      ) ||
      0;

    const taxAmount =
      transaction.taxAmount ||
      allItems.reduce(
        (sum, item) => sum + (item.lineTax || item.gstAmount || 0),
        0,
      ) ||
      0;

    const totalAmount = transaction.totalAmount || subtotal + taxAmount;

    let message = `📄 *INVOICE - ${
      company?.businessName || 'Your Company'
    }*\n\n`;
    message += `*Invoice No:* ${invoiceNumber}\n`;
    message += `*Date:* ${invoiceDate}\n`;
    message += `*Customer:* ${party?.name || 'Valued Customer'}\n\n`;

    // Build items section from combined products and services
    if (allItems.length > 0) {
      message += `*ITEMS:*\n`;
      message += '────────────────\n';

      allItems.forEach((item, index) => {
        // Determine if it's a product or service and extract name accordingly
        let itemName = 'Item';
        let itemType = '';

        if (item.product || item.productId) {
          // This is a product - use the props to find the actual name
          const productId = item.product?._id || item.product || item.productId;
          const foundProduct = products.find(p => p._id === productId);
          itemName =
            foundProduct?.name || item.product?.name || item.name || 'Product';
          itemType = '🛍️ ';
          console.log(
            `Product ${index + 1}: ID=${productId}, Name=${itemName}`,
          );
        } else if (item.service || item.serviceId) {
          // This is a service - use the props to find the actual name
          const serviceId = item.service?._id || item.service || item.serviceId;
          const foundService = services.find(s => s._id === serviceId);
          itemName =
            foundService?.serviceName ||
            item.service?.serviceName ||
            item.name ||
            'Service';
          itemType = '🔧 ';
          console.log(
            `Service ${index + 1}: ID=${serviceId}, Name=${itemName}`,
          );
        } else {
          // Fallback
          itemName =
            item.name ||
            item.productName ||
            item.serviceName ||
            `Item ${index + 1}`;
        }

        const quantity = item.quantity || 1;
        const unitType = item.unitType ? ` ${item.unitType}` : '';
        const unitPrice =
          item.pricePerUnit ||
          item.rate ||
          item.unitPrice ||
          item.amount / quantity ||
          0;
        const itemAmount =
          item.amount || item.lineTotal || item.total || quantity * unitPrice;
        const itemTax = item.lineTax || item.gstAmount || 0;
        const taxRate = item.gstPercentage || transaction.gstPercentage || 0;

        message += `${index + 1}. ${itemType}${itemName}\n`;
        message += `   Qty: ${quantity}${unitType} × ₹${formatCurrency(
          unitPrice,
        )} = ₹${formatCurrency(itemAmount)}\n`;

        if (itemTax > 0) {
          message += `   Tax (${taxRate}%): ₹${formatCurrency(itemTax)}\n`;
        }
      });

      message += '────────────────\n';
    } else {
      // If no items, show basic info
      message += `*DESCRIPTION:*\n`;
      message += '────────────────\n';
      message += `${
        transaction.description || transaction.narration || 'Products/Services'
      }\n`;
      message += '────────────────\n';
    }

    message += `*Subtotal:* ₹${formatCurrency(subtotal)}\n`;
    message += `*Tax:* ₹${formatCurrency(taxAmount)}\n`;
    message += `*TOTAL:* ₹${formatCurrency(totalAmount)}\n\n`;

    message += `Thank you for your business! 🎉\n\n`;
    message += `Best regards,\n`;
    message += `*${company?.businessName || 'Your Company'}*`;

    return message;
  };

  // Initialize when dialog opens
  useEffect(() => {
    if (isOpen) {
      const partyMobile = party?.contactNumber || party?.phone || '';
      setMobileNumber(partyMobile);
      setMessageContent(generateDefaultMessageContent());
      setPdfGenerated(false);
      setPdfFileName('');
      setCurrentStep(1);
    }
  }, [isOpen, transaction, party, company]);

  // Complete flow handler (similar to handleCompleteFlow in web)
  const handleCompleteFlow = async () => {
    if (!mobileNumber.trim()) {
      Alert.alert(
        'Mobile number required',
        'Please enter a valid mobile number.',
      );
      return;
    }

    try {
      setIsLoading(true);
      setIsGeneratingPdf(true);

      // Simply open WhatsApp without any PDF download (matching web behavior)
      const formattedNumber = mobileNumber.replace(/\D/g, '');
      let finalNumber = formattedNumber;
      if (!formattedNumber.startsWith('91') && formattedNumber.length === 10) {
        finalNumber = `91${formattedNumber}`;
      }

      const encodedMessage = encodeURIComponent(messageContent);

      // Try WhatsApp app first, then fallback to web
      const whatsappUrl = `whatsapp://send?phone=${finalNumber}&text=${encodedMessage}`;
      const whatsappWebUrl = `https://web.whatsapp.com/send?phone=${finalNumber}&text=${encodedMessage}`;

      const canOpen = await Linking.canOpenURL(whatsappUrl);

      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        Alert.alert(
          'WhatsApp Opening',
          'Please download the PDF first and attach it manually in WhatsApp.',
          [
            {
              text: 'OK',
              onPress: () => {
                setTimeout(() => {
                  onClose();
                }, 2000);
              },
            },
          ],
        );
      } else {
        // Fallback to WhatsApp Web
        await Linking.openURL(whatsappWebUrl);
        Alert.alert(
          'WhatsApp Web Opening',
          'Please download the PDF first and attach it manually in WhatsApp Web.',
          [
            {
              text: 'OK',
              onPress: () => {
                setTimeout(() => {
                  onClose();
                }, 2000);
              },
            },
          ],
        );
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert(
        'Operation Failed',
        'Could not open WhatsApp. Please try again.',
      );
    } finally {
      setIsLoading(false);
      setIsGeneratingPdf(false);
    }
  };

  // WhatsApp only handler (similar to handleOpenWhatsAppOnly in web)
  const handleOpenWhatsAppOnly = () => {
    if (!mobileNumber.trim()) {
      Alert.alert(
        'Mobile number required',
        'Please enter a valid mobile number.',
      );
      return;
    }

    const formattedNumber = mobileNumber.replace(/\D/g, '');
    let finalNumber = formattedNumber;
    if (!formattedNumber.startsWith('91') && formattedNumber.length === 10) {
      finalNumber = `91${formattedNumber}`;
    }

    const encodedMessage = encodeURIComponent(messageContent);
    const whatsappUrl = `whatsapp://send?phone=${finalNumber}&text=${encodedMessage}`;

    Linking.openURL(whatsappUrl).catch(() => {
      // Fallback to web
      const webUrl = `https://web.whatsapp.com/send?phone=${finalNumber}&text=${encodedMessage}`;
      Linking.openURL(webUrl);
    });

    Alert.alert('WhatsApp Opening', 'Opening WhatsApp Web.');
    onClose();
  };

  if (!isOpen) return null;

  const invoiceNumber =
    transaction.invoiceNumber || transaction.referenceNumber || 'N/A';

  const invoiceDate = formatSimpleDate(transaction.date);

  const amount = transaction.totalAmount || transaction.amount || 0;

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);

  return (
    <Portal>
      <Modal
        visible={isOpen}
        onDismiss={onClose}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Icon name="whatsapp" size={24} color="#25D366" />
              <Text style={styles.title}>Send Invoice via WhatsApp</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Transaction Summary */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>Invoice Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer:</Text>
                  <Text style={styles.detailValue}>{party?.name || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mobile:</Text>
                  <Text style={styles.detailValue}>
                    {party?.contactNumber || party?.phone || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Invoice No:</Text>
                  <Text style={styles.detailValue}>{invoiceNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{invoiceDate}</Text>
                </View>
                <View style={[styles.detailRow, styles.amountRow]}>
                  <Text style={styles.detailLabel}>Amount:</Text>
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountText}>{formattedAmount}</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* WhatsApp Form */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Customer WhatsApp Number</Text>
              <View style={styles.phoneInputContainer}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  placeholder="Enter customer WhatsApp number"
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <Text style={styles.sectionLabel}>Message to Send</Text>
              <TextInput
                style={styles.messageInput}
                value={messageContent}
                onChangeText={setMessageContent}
                placeholder="Compose your WhatsApp message..."
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                placeholderTextColor="#999"
                editable={true}
              />
            </View>

            {/* Important Instructions */}
            <Card style={styles.warningCard}>
              <Card.Content style={styles.warningContent}>
                <Icon name="paperclip" size={20} color="#B45309" />
                <View style={styles.warningText}>
                  <Text style={styles.warningTitle}>
                    Important: Manual PDF Attachment Required
                  </Text>
                  <Text style={styles.warningDescription}>
                    Please download the PDF first and attach it manually in
                    WhatsApp.
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={onClose}
                style={[styles.button, styles.cancelButton]}
                labelStyle={styles.cancelButtonText}
                disabled={isLoading}
              >
                Cancel
              </Button>

              {currentStep === 1 && (
                <Button
                  mode="contained"
                  onPress={handleCompleteFlow}
                  disabled={isLoading || !mobileNumber.trim()}
                  style={[styles.button, styles.whatsappButton]}
                  labelStyle={styles.whatsappButtonText}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Icon name="whatsapp" size={20} color="white" />
                  )}
                  <Text style={styles.whatsappButtonText}>
                    {isLoading ? ' Preparing...' : ' Open WhatsApp'}
                  </Text>
                </Button>
              )}

              {currentStep === 2 && (
                <Button
                  mode="contained"
                  onPress={handleOpenWhatsAppOnly}
                  style={[styles.button, styles.whatsappButton]}
                  labelStyle={styles.whatsappButtonText}
                >
                  <Icon name="open-in-new" size={20} color="white" />
                  <Text style={styles.whatsappButtonText}>
                    {' '}
                    Open WhatsApp Web
                  </Text>
                </Button>
              )}

              {currentStep === 3 && (
                <Button
                  mode="contained"
                  onPress={onClose}
                  style={[styles.button, styles.doneButton]}
                  labelStyle={styles.doneButtonText}
                >
                  <Icon name="check-circle" size={20} color="white" />
                  <Text style={styles.doneButtonText}>
                    {' '}
                    Done - Return to App
                  </Text>
                </Button>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </Portal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fafafa',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  amountRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    marginTop: 4,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  formSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  countryCode: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 150,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  warningCard: {
    borderColor: '#FBBF24',
    backgroundColor: '#FFFBEB',
    marginBottom: 16,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  warningText: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B45309',
    marginBottom: 4,
  },
  warningDescription: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    backgroundColor: '#fafafa',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  whatsappButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  doneButton: {
    backgroundColor: '#2563eb',
  },
  doneButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});
