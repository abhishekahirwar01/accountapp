// components/WhatsAppConnectionDialog.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useWhatsAppConnection } from '../hooks/useWhatsAppConnection';
import { whatsappAPI } from '../../lib/whatsappAPI';

// QR Code Generator for React Native
import QRCode from 'react-native-qrcode-svg';

const WhatsAppConnectionDialog = ({ isOpen, onClose, onConnected }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState('initial');
  const [qrCodeData, setQrCodeData] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const {
    connectWhatsApp,
    refreshConnection,
    qrCode: hookQRCode,
    isConnecting,
  } = useWhatsAppConnection();

  // Debug authentication on mount
  useEffect(() => {
    if (isOpen) {
      console.log('🔐 Checking authentication status...');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setStep('initial');
      setQrCodeData(null);
      setIsPolling(false);
    }
  }, [isOpen]);

  // Sync with hook QR code
  useEffect(() => {
    if (hookQRCode) {
      setQrCodeData(hookQRCode);
    }
  }, [hookQRCode]);

  // Poll for connection status when in QR step
  useEffect(() => {
    if (!isOpen || step !== 'qr' || !isPolling) return;

    let pollInterval;
    setRetryCount(0);

    const pollStatus = async () => {
      try {
        console.log('🔄 Polling for connection status...');
        const isConnected = await refreshConnection();

        if (isConnected) {
          console.log('✅ Connected successfully!');
          setStep('connected');
          setIsPolling(false);
          setRetryCount(0);
          clearInterval(pollInterval);
          Alert.alert(
            'Connected Successfully!',
            'WhatsApp is now connected and ready to use.',
          );
        } else {
          setRetryCount(prev => prev + 1);
          console.log(
            `🔄 Connection not ready yet (attempt ${retryCount + 1})`,
          );

          if (retryCount > 20) {
            console.log('🔄 QR code might be expired, checking status...');
            const status = await whatsappAPI.getSessionStatus();
            if (status.isConnecting) {
              console.log('✅ QR code still valid, continuing to poll...');
              setRetryCount(0);
            } else {
              console.log('❌ QR code expired or session lost');
              clearInterval(pollInterval);
              setIsPolling(false);
              setRetryCount(0);
              Alert.alert(
                'Session Expired',
                'QR code expired. Please generate a new one.',
              );
              setStep('initial');
            }
          }
        }
      } catch (error) {
        console.error('Error polling status:', error);
        setRetryCount(prev => prev + 1);

        if (retryCount > 3) {
          console.error('❌ Too many polling errors, stopping');
          clearInterval(pollInterval);
          setIsPolling(false);
          setRetryCount(0);
          Alert.alert(
            'Connection Error',
            'Unable to check connection status. Please try again.',
          );
        }
      }
    };

    pollInterval = setInterval(pollStatus, 3000);

    setTimeout(() => {
      if (step === 'qr' && isPolling) {
        console.log('⏰ Extended polling timeout reached');
        clearInterval(pollInterval);
        setIsPolling(false);
        setRetryCount(0);
        Alert.alert(
          'Connection Timeout',
          'QR code expired. Please generate a new one and try scanning again.',
        );
      }
    }, 180000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      setRetryCount(0);
    };
  }, [isOpen, step, isPolling, retryCount]);

  // Get QR code from backend
  const fetchQRCode = async () => {
    try {
      console.log('📱 Checking for QR code...');

      const statusData = await whatsappAPI.getSessionStatus();
      console.log('🔍 Status data:', statusData);

      if (statusData.isConnecting && statusData.qrCode) {
        console.log('✅ QR code received');
        setQrCodeData(statusData.qrCode);
        setIsPolling(true);
        Alert.alert('QR Code Ready!', 'Scan the QR code with your WhatsApp.');
      } else if (statusData.isAuthenticated) {
        setStep('connected');
        setIsPolling(false);
      } else {
        console.log('❌ No QR code available yet, retrying...');
        setTimeout(fetchQRCode, 2000);
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);

      if (error.message.includes('Authentication failed')) {
        Alert.alert(
          'Authentication Required',
          'Please login again to continue.',
        );
        setStep('initial');
        return;
      }

      setTimeout(fetchQRCode, 2000);
    }
  };

  const handleConnectWhatsApp = async () => {
    setIsLoading(true);
    setStep('qr');
    setQrCodeData(null);

    try {
      console.log('🚀 Initializing WhatsApp connection...');

      const result = await whatsappAPI.initialize();

      if (result.success) {
        console.log('✅ WhatsApp initialized:', result.message);
        Alert.alert(
          'Generating QR Code...',
          'Please wait while we generate the QR code.',
        );

        fetchQRCode();
      } else {
        throw new Error(result.error || 'Failed to initialize WhatsApp');
      }
    } catch (error) {
      console.error('❌ Error connecting WhatsApp:', error);

      if (error.message.includes('Authentication failed')) {
        Alert.alert('Login Required', 'Please login to connect WhatsApp.');
      } else {
        Alert.alert(
          'Connection Failed',
          error.message || 'Failed to initialize WhatsApp.',
        );
      }
      setStep('initial');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmConnection = async () => {
    try {
      setIsLoading(true);

      console.log('🔍 Manually checking connection...');
      const isConnected = await refreshConnection();

      if (isConnected) {
        setStep('connected');
        setIsPolling(false);
        Alert.alert(
          'Connected Successfully!',
          'WhatsApp is now connected and ready to use.',
        );
      } else {
        Alert.alert(
          'Not Connected Yet',
          'Please scan the QR code with your phone first.',
        );
      }
    } catch (error) {
      console.error('Error confirming connection:', error);

      if (error.message.includes('Authentication failed')) {
        Alert.alert('Login Required', 'Please login again to continue.');
        setStep('initial');
      } else {
        Alert.alert(
          'Connection Check Failed',
          'Unable to verify connection status.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onConnected();
    onClose();
  };

  const handleRetry = () => {
    setStep('initial');
    setQrCodeData(null);
    setIsPolling(false);
    setRetryCount(0);
  };

  const handleOpenWhatsApp = async () => {
    try {
      const whatsappUrl = 'whatsapp://app';
      const canOpen = await Linking.canOpenURL(whatsappUrl);

      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert(
          'WhatsApp not found',
          'Please install WhatsApp from the app store.',
        );
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert('Error', 'Cannot open WhatsApp');
    }
  };

  const QRCodeDisplay = ({ qrData }) => {
    if (!qrData) {
      return (
        <View style={styles.qrPlaceholder}>
          <Icon name="loading" size={32} color="#666" />
          <Text style={styles.placeholderText}>Generating QR code...</Text>
          <Text style={styles.placeholderSubtext}>Please wait</Text>
        </View>
      );
    }

    return (
      <View style={styles.qrContainer}>
        <View style={styles.qrCodeWrapper}>
          <QRCode
            value={qrData}
            size={200}
            backgroundColor="white"
            color="black"
          />
        </View>

        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => {
            Alert.alert(
              'Save QR Code',
              'Take a screenshot to save the QR code, or share it with another device.',
              [
                { text: 'Take Screenshot', style: 'default' },
                { text: 'Open WhatsApp', onPress: handleOpenWhatsApp },
                { text: 'Cancel', style: 'cancel' },
              ],
            );
          }}
        >
          <Icon name="download" size={16} color="#666" />
          <Text style={styles.downloadButtonText}>Save QR Code</Text>
        </TouchableOpacity>

        <Text style={styles.qrInstruction}>
          Scan this QR code with WhatsApp to authenticate your account
        </Text>
      </View>
    );
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Icon name="whatsapp" size={20} color="#16a34a" />
                <Text style={styles.title}>Connect WhatsApp</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Icon name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>
              Scan QR code to link your WhatsApp account
            </Text>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {step === 'initial' && (
                <View style={styles.stepContainer}>
                  <View style={styles.iconContainer}>
                    <Icon name="whatsapp" size={48} color="#16a34a" />
                  </View>

                  <Text style={styles.stepTitle}>Connect WhatsApp</Text>
                  <Text style={styles.stepDescription}>
                    Scan QR code to link your WhatsApp account for automated
                    messaging
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.primaryButton,
                      isLoading && styles.buttonDisabled,
                    ]}
                    onPress={handleConnectWhatsApp}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Icon name="loading" size={16} color="white" />
                    ) : (
                      <Icon name="qrcode" size={16} color="white" />
                    )}
                    <Text style={styles.buttonText}>
                      {isLoading ? 'Initializing...' : 'Generate QR Code'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.tipBox}>
                    <Icon name="information" size={14} color="#1e40af" />
                    <Text style={styles.tipText}>
                      Open WhatsApp → Menu → Linked Devices → Link a Device
                    </Text>
                  </View>
                </View>
              )}

              {step === 'qr' && (
                <View style={styles.stepContainer}>
                  <View style={styles.iconContainer}>
                    <Icon name="qrcode" size={32} color="#16a34a" />
                  </View>

                  <Text style={styles.stepTitle}>Scan QR Code</Text>
                  <Text style={styles.stepDescription}>
                    {qrCodeData
                      ? 'Scan this QR code with WhatsApp'
                      : 'Generating QR code...'}
                  </Text>

                  {/* QR Code Display */}
                  <View style={styles.qrDisplayContainer}>
                    <QRCodeDisplay qrData={qrCodeData} />
                  </View>

                  {/* Troubleshooting Tips */}
                  <View style={styles.troubleshootBox}>
                    <View style={styles.troubleshootHeader}>
                      <Icon name="lightbulb-on" size={14} color="#92400e" />
                      <Text style={styles.troubleshootTitle}>
                        Having trouble linking?
                      </Text>
                    </View>
                    <View style={styles.troubleshootList}>
                      <View style={styles.troubleshootItem}>
                        <Icon name="wifi" size={12} color="#92400e" />
                        <Text style={styles.troubleshootText}>
                          Make sure your phone has internet connection
                        </Text>
                      </View>
                      <View style={styles.troubleshootItem}>
                        <Icon name="cellphone" size={12} color="#92400e" />
                        <Text style={styles.troubleshootText}>
                          Ensure WhatsApp is updated to latest version
                        </Text>
                      </View>
                      <View style={styles.troubleshootItem}>
                        <Icon name="restart" size={12} color="#92400e" />
                        <Text style={styles.troubleshootText}>
                          Restart WhatsApp if scanning fails multiple times
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.instructions}>
                    <Text style={styles.instructionsTitle}>How to scan:</Text>
                    <View style={styles.instructionsList}>
                      <View style={styles.instructionItem}>
                        <Icon name="numeric-1-circle" size={16} color="#666" />
                        <Text style={styles.instructionText}>
                          Open WhatsApp on your phone
                        </Text>
                      </View>
                      <View style={styles.instructionItem}>
                        <Icon name="numeric-2-circle" size={16} color="#666" />
                        <Text style={styles.instructionText}>
                          Tap Menu → Linked Devices
                        </Text>
                      </View>
                      <View style={styles.instructionItem}>
                        <Icon name="numeric-3-circle" size={16} color="#666" />
                        <Text style={styles.instructionText}>
                          Tap "Link a Device"
                        </Text>
                      </View>
                      <View style={styles.instructionItem}>
                        <Icon name="numeric-4-circle" size={16} color="#666" />
                        <Text style={styles.instructionText}>
                          Point camera at the QR code
                        </Text>
                      </View>
                    </View>
                  </View>

                  {isPolling && (
                    <View style={styles.pollingIndicator}>
                      <Icon name="loading" size={12} color="#166534" />
                      <Text style={styles.pollingText}>
                        Waiting for you to scan... (
                        {Math.floor(retryCount / 20)}s)
                      </Text>
                    </View>
                  )}

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.outlineButton]}
                      onPress={handleRetry}
                    >
                      <Icon name="refresh" size={16} color="#666" />
                      <Text style={styles.outlineButtonText}>New QR Code</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.successButton,
                        isLoading && styles.buttonDisabled,
                      ]}
                      onPress={handleConfirmConnection}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Icon name="loading" size={16} color="white" />
                      ) : (
                        <Icon name="check-circle" size={16} color="white" />
                      )}
                      <Text style={styles.buttonText}>
                        {isLoading ? 'Checking...' : 'I Scanned It'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {step === 'connected' && (
                <View style={styles.stepContainer}>
                  <View style={styles.iconContainer}>
                    <Icon name="check-circle" size={48} color="#16a34a" />
                  </View>

                  <Text style={styles.stepTitle}>Connected Successfully!</Text>
                  <Text style={styles.stepDescription}>
                    Your WhatsApp is now connected and ready to send automated
                    messages.
                  </Text>

                  <View style={styles.successBox}>
                    <Icon name="message-text" size={14} color="#166534" />
                    <Text style={styles.successText}>
                      You can now send messages directly from the app
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.button, styles.successButton]}
                    onPress={handleComplete}
                  >
                    <Icon name="send" size={16} color="white" />
                    <Text style={styles.buttonText}>
                      Start Sending Messages
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    textAlign: 'center',
  },
  content: {
    maxHeight: 500,
  },
  stepContainer: {
    padding: 24,
    gap: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#0f172a',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#16a34a',
  },
  successButton: {
    backgroundColor: '#16a34a',
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dbeafe',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  tipText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
    flex: 1,
  },
  qrDisplayContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#bbf7d0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrContainer: {
    alignItems: 'center',
    gap: 16,
  },
  qrCodeWrapper: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qrPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  placeholderSubtext: {
    fontSize: 13,
    color: '#94a3b8',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  downloadButtonText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  qrInstruction: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  troubleshootBox: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  troubleshootHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  troubleshootTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
  },
  troubleshootList: {
    gap: 8,
  },
  troubleshootItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  troubleshootText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
    flex: 1,
  },
  instructions: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
  },
  instructionsList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  instructionText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  pollingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  pollingText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '600',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dcfce7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  successText: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '600',
    flex: 1,
  },
});

export default WhatsAppConnectionDialog;
