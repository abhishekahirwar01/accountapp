// hooks/useWhatsAppConnection.js
import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking, AppState } from 'react-native';
import { whatsappConnectionService } from '../../lib/whatsapp-connection';
import { whatsappAPI } from '../../lib/whatsappAPI';

// Inline Toast Hook
const useInlineToast = () => {
  const [toast, setToast] = useState({
    visible: false,
    title: '',
    description: '',
    type: 'info',
  });

  const showToast = useCallback(({ title, description, type = 'info' }) => {
    setToast({ visible: true, title, description, type });

    // Auto hide after 3 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    toast,
    showToast,
    hideToast,
  };
};

export function useWhatsAppConnection() {
  const [isConnected, setIsConnected] = useState(null);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStats, setConnectionStats] = useState(null);

  // Use inline toast
  const { toast: toastState, showToast, hideToast } = useInlineToast();

  // Check connection status - ENHANCED with better error handling
  const checkConnection = useCallback(async () => {
    try {
      setIsLoading(true);

      const [canManageConnections, status, connectionInfo] = await Promise.all([
        whatsappConnectionService.canManageConnections(),
        whatsappAPI.getSessionStatus(),
        whatsappConnectionService.getConnectionInfo(),
      ]);

      setCanManage(canManageConnections);
      console.log('🔍 WhatsApp Status:', status);
      console.log('🔍 Connection Info:', connectionInfo);

      const connected = status.isAuthenticated || connectionInfo.isConnected;
      setIsConnected(connected);

      if (connected) {
        setConnectionInfo({
          isConnected: true,
          phoneNumber: status.phoneNumber || connectionInfo.phoneNumber,
          profileName: status.profileName || connectionInfo.profileName,
          connectionType: connectionInfo.connectionType || 'client',
          hasAccess: connectionInfo.hasAccess !== false,
          connectedBy: connectionInfo.connectedBy,
          connectedByName: connectionInfo.connectedByName,
        });
      } else {
        setConnectionInfo({
          isConnected: false,
          connectionType: 'none',
          hasAccess: false,
        });
      }

      return connected;
    } catch (error) {
      console.error('Error checking WhatsApp connection:', error);
      setIsConnected(false);
      setConnectionInfo({
        isConnected: false,
        connectionType: 'none',
        hasAccess: false,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize/connect WhatsApp - ENHANCED with QR code handling
  const connectWhatsApp = useCallback(async () => {
    try {
      setIsConnecting(true);
      setIsLoading(true);

      const result = await whatsappAPI.initialize();

      if (result.success) {
        showToast({
          title: 'WhatsApp Initialized',
          description:
            'QR code will appear shortly. Please scan it with your phone.',
          type: 'success',
        });

        let qrCodeRetrieved = false;

        // Start polling for QR code and status
        const pollInterval = setInterval(async () => {
          try {
            const status = await whatsappAPI.getSessionStatus();

            // Handle QR code
            if (status.qrCode && !qrCodeRetrieved) {
              setQrCode(status.qrCode);
              qrCodeRetrieved = true;
              showToast({
                title: 'QR Code Available',
                description: 'Please scan the QR code to connect WhatsApp',
                type: 'info',
              });
            }

            // Handle successful connection
            if (status.isAuthenticated) {
              clearInterval(pollInterval);
              setQrCode(null);
              setIsConnecting(false);
              await checkConnection();
              showToast({
                title: 'WhatsApp Connected!',
                description: `Connected as ${
                  status.profileName || status.phoneNumber
                }`,
                type: 'success',
              });
            }

            // Handle errors
            if (status.hasError) {
              clearInterval(pollInterval);
              setIsConnecting(false);
              setQrCode(null);
              showToast({
                title: 'Connection Failed',
                description: 'Failed to connect WhatsApp. Please try again.',
                type: 'error',
              });
            }

            // Handle timeout while connecting
            if (status.isConnecting && !qrCodeRetrieved) {
              // Still connecting, no QR code yet
              console.log('⏳ Waiting for QR code...');
            }
          } catch (error) {
            console.error('Error polling status:', error);
          }
        }, 3000);

        // Stop polling after 2 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          if (!isConnected && !qrCodeRetrieved) {
            setIsConnecting(false);
            showToast({
              title: 'Connection Timeout',
              description: 'Failed to get QR code. Please try again.',
              type: 'warning',
            });
          }
        }, 120000);

        return true;
      } else {
        showToast({
          title: 'Connection Failed',
          description: result.error || 'Failed to initialize WhatsApp',
          type: 'error',
        });
        return false;
      }
    } catch (error) {
      console.error('Error connecting WhatsApp:', error);
      showToast({
        title: 'Connection Error',
        description: 'An error occurred while connecting WhatsApp',
        type: 'error',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkConnection, isConnected, showToast]);

  // Disconnect WhatsApp - ENHANCED with cleanup
  const disconnectWhatsApp = useCallback(async () => {
    try {
      setIsLoading(true);

      const result = await whatsappAPI.logout();

      if (result.success) {
        // Clear all local state
        setIsConnected(false);
        setConnectionInfo({
          isConnected: false,
          connectionType: 'none',
          hasAccess: false,
        });
        setQrCode(null);
        setConnectionStats(null);

        // Clear local storage
        await whatsappConnectionService.clearAllStorage();

        showToast({
          title: 'WhatsApp Disconnected',
          description: 'WhatsApp has been successfully disconnected',
          type: 'success',
        });
        return true;
      } else {
        showToast({
          title: 'Disconnect Failed',
          description: result.error || 'Failed to disconnect WhatsApp',
          type: 'error',
        });
        return false;
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      showToast({
        title: 'Disconnect Error',
        description: 'An error occurred while disconnecting WhatsApp',
        type: 'error',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Refresh connection
  const refreshConnection = useCallback(async () => {
    return await checkConnection();
  }, [checkConnection]);

  // Send message to party - ENHANCED with better error handling
  const sendMessage = useCallback(
    async params => {
      try {
        // Validate message before sending
        const messageValidation = whatsappAPI.validateMessage(params.message);
        if (!messageValidation.isValid) {
          showToast({
            title: 'Invalid Message',
            description: messageValidation.error,
            type: 'error',
          });
          return { success: false, error: messageValidation.error };
        }

        const result = await whatsappAPI.sendMessage(params);

        if (result.success) {
          if (result.manual) {
            // Manual mode - open WhatsApp
            const whatsappUrl = `whatsapp://send?phone=${
              params.phoneNumber
            }&text=${encodeURIComponent(params.message)}`;

            const canOpen = await Linking.canOpenURL(whatsappUrl);
            if (canOpen) {
              await Linking.openURL(whatsappUrl);
              showToast({
                title: 'Opening WhatsApp',
                description: 'Opening WhatsApp with your message',
                type: 'info',
              });
            } else {
              // Fallback to web
              const webUrl = `https://wa.me/${
                params.phoneNumber
              }?text=${encodeURIComponent(params.message)}`;
              await Linking.openURL(webUrl);
              showToast({
                title: 'Opening WhatsApp Web',
                description: 'WhatsApp not installed, opening web version',
                type: 'info',
              });
            }
          } else {
            // Automated mode - message sent directly
            showToast({
              title: 'Message Sent!',
              description: `Message sent to ${
                params.partyName || params.phoneNumber
              }`,
              type: 'success',
            });
          }
          return result;
        } else {
          showToast({
            title: 'Send Failed',
            description: result.error || 'Failed to send WhatsApp message',
            type: 'error',
          });
          return result;
        }
      } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        showToast({
          title: 'Send Error',
          description: 'An error occurred while sending the message',
          type: 'error',
        });
        throw error;
      }
    },
    [showToast],
  );

  // Send bulk messages - ENHANCED with progress tracking
  const sendBulkMessages = useCallback(
    async params => {
      try {
        showToast({
          title: 'Sending Bulk Messages',
          description: `Starting to send ${
            params.phoneNumbers?.length || 0
          } messages`,
          type: 'info',
        });

        const result = await whatsappAPI.sendBulkMessages(params);

        if (result.successful > 0) {
          showToast({
            title: 'Bulk Messages Sent',
            description: `Successfully sent ${result.successful} out of ${result.total} messages`,
            type: 'success',
          });
        }

        if (result.failed > 0) {
          showToast({
            title:
              result.successful === 0
                ? 'All Messages Failed'
                : 'Some Messages Failed',
            description: `${result.failed} messages failed to send`,
            type: result.successful === 0 ? 'error' : 'warning',
          });
        }

        return result;
      } catch (error) {
        console.error('Error sending bulk WhatsApp messages:', error);
        showToast({
          title: 'Bulk Send Error',
          description: 'An error occurred while sending bulk messages',
          type: 'error',
        });
        throw error;
      }
    },
    [showToast],
  );

  // Ensure connection before sending
  const ensureConnection = useCallback(async () => {
    try {
      const isReady = await checkConnection();

      if (!isReady) {
        showToast({
          title: 'WhatsApp Not Connected',
          description: 'Please connect WhatsApp before sending messages',
          type: 'error',
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error ensuring connection:', error);
      return false;
    }
  }, [checkConnection, showToast]);

  // Send message with connection check
  const sendMessageWithConnectionCheck = useCallback(
    async params => {
      const isReady = await ensureConnection();
      if (!isReady) {
        throw new Error('WhatsApp is not connected');
      }

      return await sendMessage(params);
    },
    [ensureConnection, sendMessage],
  );

  // NEW: Send message with fallback options
  const sendMessageWithFallback = useCallback(
    async (params, options = {}) => {
      try {
        const result = await sendMessageWithConnectionCheck(params);

        // If automated sending fails and fallback is enabled, try manual
        if (!result.success && options.fallbackToManual) {
          showToast({
            title: 'Trying Manual Mode',
            description: 'Automated sending failed, opening WhatsApp manually',
            type: 'info',
          });

          const manualResult = await openWhatsApp(
            params.phoneNumber,
            params.message,
          );
          return {
            success: manualResult,
            manual: true,
            fallbackUsed: true,
          };
        }

        return result;
      } catch (error) {
        console.error('Error in sendMessageWithFallback:', error);
        throw error;
      }
    },
    [sendMessageWithConnectionCheck, openWhatsApp, showToast],
  );

  // Get QR code for display
  const getQRCode = useCallback(async () => {
    try {
      const qrCodeData = await whatsappConnectionService.getQRCode();
      setQrCode(qrCodeData);
      return qrCodeData;
    } catch (error) {
      console.error('Error getting QR code:', error);
      return null;
    }
  }, []);

  // Clear QR code
  const clearQRCode = useCallback(() => {
    setQrCode(null);
  }, []);

  // Check if WhatsApp is available on device
  const checkWhatsAppAvailability = useCallback(async () => {
    try {
      const whatsappUrl = 'whatsapp://send?phone=1234567890&text=test';
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      return canOpen;
    } catch (error) {
      console.error('Error checking WhatsApp availability:', error);
      return false;
    }
  }, []);

  // Open WhatsApp directly with phone number
  const openWhatsApp = useCallback(
    async (phoneNumber, message = '') => {
      try {
        await whatsappAPI.openWhatsApp(phoneNumber, message);
        return true;
      } catch (error) {
        console.error('Error opening WhatsApp:', error);
        showToast({
          title: 'Cannot Open WhatsApp',
          description:
            error.message || 'WhatsApp is not installed on your device',
          type: 'error',
        });
        return false;
      }
    },
    [showToast],
  );

  // Quick send with phone number validation
  const quickSend = useCallback(
    async (phoneNumber, message, partyName = '') => {
      try {
        // Validate phone number
        const validation = whatsappAPI.validatePhoneNumber(phoneNumber);
        if (!validation.isValid) {
          showToast({
            title: 'Invalid Phone Number',
            description: validation.error,
            type: 'error',
          });
          return { success: false, error: validation.error };
        }

        const params = {
          phoneNumber: validation.cleaned,
          message,
          partyName,
        };

        return await sendMessageWithConnectionCheck(params);
      } catch (error) {
        console.error('Error in quick send:', error);
        throw error;
      }
    },
    [sendMessageWithConnectionCheck, showToast],
  );

  // Start real-time status monitoring
  const startStatusMonitoring = useCallback((callback, interval = 5000) => {
    whatsappAPI.startStatusPolling(callback, interval);
  }, []);

  // Stop status monitoring
  const stopStatusMonitoring = useCallback(() => {
    whatsappAPI.stopStatusPolling();
  }, []);

  // NEW: Get and cache connection statistics
  const getConnectionStats = useCallback(
    async (forceRefresh = false) => {
      try {
        if (!forceRefresh && connectionStats) {
          return connectionStats;
        }

        const stats = await whatsappConnectionService.getConnectionStats();
        setConnectionStats(stats);
        return stats;
      } catch (error) {
        console.error('Error getting connection stats:', error);
        return null;
      }
    },
    [connectionStats],
  );

  // NEW: Refresh connection stats
  const refreshConnectionStats = useCallback(async () => {
    return await getConnectionStats(true);
  }, [getConnectionStats]);

  // Debug connection info
  const debugConnection = useCallback(async () => {
    try {
      const [debugInfo, staffAccess] = await Promise.all([
        whatsappConnectionService.debugConnections(),
        whatsappConnectionService.debugStaffAccess(),
      ]);

      console.log('🔍 Connection Debug Info:', debugInfo);
      console.log('🔍 Staff Access Info:', staffAccess);

      return { debugInfo, staffAccess };
    } catch (error) {
      console.error('Error debugging connection:', error);
      return null;
    }
  }, []);

  // NEW: Wait for connection with timeout
  const waitForConnection = useCallback(async (timeoutMs = 30000) => {
    return await whatsappConnectionService.waitForConnection(timeoutMs);
  }, []);

  // NEW: Check if QR code is available
  const checkQRCodeAvailability = useCallback(async () => {
    return await whatsappConnectionService.isQRCodeAvailable();
  }, []);

  // NEW: Restore connection on app start
  const restoreConnection = useCallback(async () => {
    try {
      const restored =
        await whatsappConnectionService.restoreConnectionOnLogin();
      if (restored) {
        await checkConnection();
      }
      return restored;
    } catch (error) {
      console.error('Error restoring connection:', error);
      return false;
    }
  }, [checkConnection]);

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      await restoreConnection();
      await checkConnection();
      await getConnectionStats();
    };

    initialize();
  }, [checkConnection, getConnectionStats, restoreConnection]);

  // Auto-refresh connection when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (nextAppState === 'active') {
        checkConnection();
        refreshConnectionStats();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, [checkConnection, refreshConnectionStats]);

  return {
    // State
    isConnected,
    connectionInfo,
    isLoading,
    canManage,
    qrCode,
    isConnecting,
    connectionStats,
    toast: toastState,

    // Actions
    connectWhatsApp,
    disconnectWhatsApp,
    refreshConnection,
    sendMessage: sendMessageWithConnectionCheck,
    sendMessageWithFallback,
    sendBulkMessages,
    checkConnection,
    ensureConnection,
    getQRCode,
    clearQRCode,
    checkWhatsAppAvailability,
    openWhatsApp,
    quickSend,
    startStatusMonitoring,
    stopStatusMonitoring,
    getConnectionStats,
    refreshConnectionStats,
    debugConnection,
    hideToast,
    waitForConnection,
    checkQRCodeAvailability,
    restoreConnection,
  };
}

// Export hook with default configuration
export default useWhatsAppConnection;
