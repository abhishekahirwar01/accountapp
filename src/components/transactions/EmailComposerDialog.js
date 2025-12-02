// components/EmailComposerDialog.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Appearance,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BASE_URL } from '../../config';

const { width, height } = Dimensions.get('window');

const EmailComposerDialog = ({
  isOpen,
  onClose,
  transaction,
  party,
  company,
  daysOverdue,
  pendingAmount,
  totalCustomerBalance,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [colorScheme, setColorScheme] = useState('light');

  // Detect color scheme
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    setColorScheme(Appearance.getColorScheme());
    return () => subscription.remove();
  }, []);

  // Initialize email content when dialog opens
  useEffect(() => {
    if (isOpen) {
      const defaultSubject = `Payment Reminder - Invoice ${
        transaction.invoiceNumber || transaction.referenceNumber || ''
      }`;
      const defaultContent = generateDefaultEmailContent();

      setEmailSubject(defaultSubject);
      setEmailContent(defaultContent);
    }
  }, [
    isOpen,
    transaction,
    party,
    company,
    daysOverdue,
    pendingAmount,
    totalCustomerBalance,
  ]);

  const generateDefaultEmailContent = () => {
    const invoiceNumber =
      transaction.invoiceNumber || transaction.referenceNumber || 'N/A';
    const invoiceDate = new Date(transaction.date).toLocaleDateString();
    const formattedAmount = new Intl.NumberFormat('en-IN').format(
      totalCustomerBalance,
    );

    return `Dear ${party.name || 'Valued Customer'},

This is a friendly reminder regarding your outstanding payment. The following invoice is currently pending:

Invoice Number: ${invoiceNumber}
Invoice Date: ${invoiceDate}
Days Outstanding: ${daysOverdue} days
Pending Amount: ₹${formattedAmount}

${
  daysOverdue > 30
    ? `This invoice is ${
        daysOverdue - 30
      } days overdue. Please process the payment immediately to avoid any disruption in services.`
    : 'Please process this payment at your earliest convenience.'
}

If you have already made the payment, please disregard this reminder. For any queries regarding this invoice, please contact us.

Thank you for your business!

Best regards,
${company.businessName || 'Your Company'}
${company.emailId ? `Email: ${company.emailId}` : ''}`;
  };

  const handleSendEmail = async () => {
    if (!emailContent.trim() || !emailSubject.trim()) {
      Alert.alert(
        'Missing content',
        'Please provide both subject and email content.',
      );
      return;
    }

    setIsSending(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        `${BASE_URL}/api/sales/send-credit-reminder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            transactionId: transaction._id,
            partyId: party._id,
            daysOverdue: daysOverdue,
            totalCustomerBalance: totalCustomerBalance,
            emailSubject: emailSubject,
            emailContent: emailContent,
            isHtml: false,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reminder');
      }

      Alert.alert('Success', `Email sent to ${party.email}`);
      onClose();
    } catch (error) {
      Alert.alert(
        'Failed to send reminder',
        error.message || 'Please try again later.',
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleResetContent = () => {
    setEmailContent(generateDefaultEmailContent());
  };

  const handleBackdropClick = () => {
    onClose();
  };

  // Theme-aware styles
  const styles = createStyles(colorScheme);

  // Mobile View
  if (width < 768) {
    return (
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.mobileHeader}>
            <View style={styles.headerTitleContainer}>
              <Icon name="email" size={24} color="#2563eb" />
              <Text style={styles.mobileHeaderTitle}>
                Send Payment Reminder
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon
                name="close"
                size={24}
                color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.mobileContent}>
            {/* Transaction Summary */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Transaction Summary</Text>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Customer:</Text>
                <Text style={styles.summaryValue}>{party.name}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Email:</Text>
                <Text style={styles.summaryValue}>{party.email}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Invoice:</Text>
                <Text style={styles.summaryValue}>
                  {transaction.invoiceNumber ||
                    transaction.referenceNumber ||
                    'N/A'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Date:</Text>
                <Text style={styles.summaryValue}>
                  {new Date(transaction.date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Days Outstanding:</Text>
                <View
                  style={[
                    styles.badge,
                    daysOverdue > 30
                      ? styles.badgeDestructive
                      : styles.badgeSecondary,
                  ]}
                >
                  <Text style={styles.badgeText}>{daysOverdue} days</Text>
                </View>
              </View>
              <View style={[styles.summaryItem, styles.amountContainer]}>
                <Text style={styles.summaryLabel}>Pending Amount:</Text>
                <Text style={styles.amountText}>
                  ₹{new Intl.NumberFormat('en-IN').format(totalCustomerBalance)}
                </Text>
              </View>
            </View>

            {/* Email Form */}
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>To</Text>
                <View style={styles.disabledInput}>
                  <Text style={styles.disabledInputText}>{party.email}</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Subject</Text>
                <TextInput
                  style={styles.textInput}
                  value={emailSubject}
                  onChangeText={setEmailSubject}
                  placeholder="Enter email subject"
                  placeholderTextColor={
                    colorScheme === 'dark' ? '#6b7280' : '#9ca3af'
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Content</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={emailContent}
                  onChangeText={setEmailContent}
                  placeholder="Compose your email message..."
                  placeholderTextColor={
                    colorScheme === 'dark' ? '#6b7280' : '#9ca3af'
                  }
                  multiline
                  textAlignVertical="top"
                  numberOfLines={10}
                />
              </View>

              <View style={styles.helperTextContainer}>
                <Text style={styles.helperText}>
                  You can edit the content above as needed
                </Text>
                <TouchableOpacity onPress={handleResetContent}>
                  <Text style={styles.resetButton}>Reset to default</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={isSending}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.sendButton,
                  isSending && styles.sendButtonDisabled,
                ]}
                onPress={handleSendEmail}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Icon name="send" size={20} color="#ffffff" />
                )}
                <Text style={styles.sendButtonText}>
                  {isSending ? 'Sending...' : 'Send Reminder'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // Desktop View
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={styles.desktopBackdrop}
        onStartShouldSetResponder={() => true}
        onResponderRelease={handleBackdropClick}
      >
        <View
          style={styles.desktopPanel}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.desktopContainer}>
            {/* Header */}
            <View style={styles.desktopHeader}>
              <View style={styles.headerTitleContainer}>
                <Icon name="email" size={24} color="#2563eb" />
                <View>
                  <Text style={styles.desktopHeaderTitle}>
                    Send Payment Reminder
                  </Text>
                  <Text style={styles.desktopHeaderSubtitle}>
                    Compose and send reminder email
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon
                  name="close"
                  size={24}
                  color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
                />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.desktopContent}>
              {/* Transaction Summary */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Transaction Summary</Text>
                <View style={styles.desktopSummaryGrid}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Customer:</Text>
                    <Text style={styles.summaryValue}>{party.name}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Email:</Text>
                    <Text style={styles.summaryValue}>{party.email}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Invoice:</Text>
                    <Text style={styles.summaryValue}>
                      {transaction.invoiceNumber ||
                        transaction.referenceNumber ||
                        'N/A'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Date:</Text>
                    <Text style={styles.summaryValue}>
                      {new Date(transaction.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Days Outstanding:</Text>
                    <View
                      style={[
                        styles.badge,
                        daysOverdue > 30
                          ? styles.badgeDestructive
                          : styles.badgeSecondary,
                      ]}
                    >
                      <Text style={styles.badgeText}>{daysOverdue} days</Text>
                    </View>
                  </View>
                  <View style={[styles.summaryRow, styles.amountRow]}>
                    <Text style={styles.summaryLabel}>Pending Amount:</Text>
                    <Text style={styles.amountText}>
                      ₹
                      {new Intl.NumberFormat('en-IN').format(
                        totalCustomerBalance,
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Email Form */}
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>To</Text>
                  <View style={styles.disabledInput}>
                    <Text style={styles.disabledInputText}>{party.email}</Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Subject</Text>
                  <TextInput
                    style={styles.textInput}
                    value={emailSubject}
                    onChangeText={setEmailSubject}
                    placeholder="Enter email subject"
                    placeholderTextColor={
                      colorScheme === 'dark' ? '#6b7280' : '#9ca3af'
                    }
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Content</Text>
                  <TextInput
                    style={[styles.textInput, styles.desktopTextArea]}
                    value={emailContent}
                    onChangeText={setEmailContent}
                    placeholder="Compose your email message..."
                    placeholderTextColor={
                      colorScheme === 'dark' ? '#6b7280' : '#9ca3af'
                    }
                    multiline
                    textAlignVertical="top"
                    numberOfLines={12}
                  />
                </View>

                <View style={styles.helperTextContainer}>
                  <Text style={styles.helperText}>
                    You can edit the content above as needed
                  </Text>
                  <TouchableOpacity onPress={handleResetContent}>
                    <Text style={styles.resetButton}>Reset to default</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.desktopFooter}>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                  disabled={isSending}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.sendButton,
                    isSending && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSendEmail}
                  disabled={isSending}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Icon name="send" size={20} color="#ffffff" />
                  )}
                  <Text style={styles.sendButtonText}>
                    {isSending ? 'Sending...' : 'Send Reminder'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = colorScheme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#111827' : '#ffffff',
    },
    // Mobile Styles
    mobileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
      backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
    },
    headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    mobileHeaderTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#f9fafb' : '#1f2937',
    },
    mobileContent: {
      flex: 1,
      padding: 16,
      backgroundColor: colorScheme === 'dark' ? '#111827' : '#ffffff',
    },
    // Desktop Styles
    desktopBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
    },
    desktopPanel: {
      width: width * 0.6,
      maxWidth: 600,
      height: '100%',
      backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
    },
    desktopContainer: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#111827' : '#f9fafb',
    },
    desktopHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
      backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
    },
    desktopHeaderTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#f9fafb' : '#1f2937',
    },
    desktopHeaderSubtitle: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#d1d5db' : '#6b7280',
      marginTop: 4,
    },
    desktopContent: {
      flex: 1,
      padding: 24,
      backgroundColor: colorScheme === 'dark' ? '#111827' : '#f9fafb',
    },
    desktopFooter: {
      padding: 24,
      borderTopWidth: 1,
      borderTopColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
      backgroundColor:
        colorScheme === 'dark'
          ? 'rgba(31, 41, 55, 0.8)'
          : 'rgba(243, 244, 246, 0.2)',
    },
    closeButton: {
      padding: 4,
    },
    // Card Styles
    card: {
      backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colorScheme === 'dark' ? '#f9fafb' : '#1f2937',
      marginBottom: 12,
    },
    // Summary Styles
    summaryItem: {
      marginBottom: 8,
    },
    desktopSummaryGrid: {
      gap: 8,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#d1d5db' : '#6b7280',
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#f9fafb' : '#1f2937',
    },
    amountContainer: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
      marginTop: 8,
    },
    amountRow: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
      marginTop: 8,
    },
    amountText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? '#fca5a5' : '#dc2626',
    },
    // Badge Styles
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeSecondary: {
      backgroundColor: colorScheme === 'dark' ? '#374151' : '#f3f4f6',
    },
    badgeDestructive: {
      backgroundColor: colorScheme === 'dark' ? '#7f1d1d' : '#fef2f2',
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#f9fafb' : '#1f2937',
    },
    // Form Styles
    formContainer: {
      gap: 16,
    },
    inputGroup: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#f9fafb' : '#1f2937',
    },
    textInput: {
      backgroundColor: colorScheme === 'dark' ? '#374151' : '#ffffff',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#4b5563' : '#d1d5db',
      borderRadius: 6,
      padding: 12,
      fontSize: 16,
      color: colorScheme === 'dark' ? '#f9fafb' : '#1f2937',
    },
    textArea: {
      height: 200,
      textAlignVertical: 'top',
    },
    desktopTextArea: {
      height: 300,
      textAlignVertical: 'top',
    },
    disabledInput: {
      backgroundColor: colorScheme === 'dark' ? '#374151' : '#f3f4f6',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#4b5563' : '#e5e7eb',
      borderRadius: 6,
      padding: 12,
    },
    disabledInputText: {
      fontSize: 16,
      color: colorScheme === 'dark' ? '#9ca3af' : '#6b7280',
    },
    helperTextContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    helperText: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#9ca3af' : '#6b7280',
    },
    resetButton: {
      fontSize: 14,
      color: '#2563eb',
      fontWeight: '500',
    },
    // Button Styles
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 6,
      gap: 8,
    },
    cancelButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#4b5563' : '#d1d5db',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: colorScheme === 'dark' ? '#d1d5db' : '#374151',
    },
    sendButton: {
      backgroundColor: '#2563eb',
    },
    sendButtonDisabled: {
      backgroundColor: '#93c5fd',
    },
    sendButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: '#ffffff',
    },
  });

export default EmailComposerDialog;
