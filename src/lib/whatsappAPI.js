// lib/api/whatsapp-api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { BASE_URL } from '../config';

// WhatsApp Connection Class
export class WhatsAppConnection {
  constructor(data = {}) {
    this._id = data._id;
    this.client_id = data.client_id;
    this.phone_number = data.phone_number;
    this.connected_by = data.connected_by || {};
    this.connected_by_name = data.connected_by_name;
    this.connection_data = data.connection_data || {};
    this.is_active = data.is_active || false;
    this.last_connected = data.last_connected;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.shared_with_users = data.shared_with_users || [];
    this.status = data.status || 'disconnected';
    this.qr_code = data.qr_code;
    this.profile_name = data.profile_name;
  }
}

// API Response Class
export class APIResponse {
  constructor(data = {}) {
    this.success = data.success || false;
    this.message = data.message;
    this.connection = data.connection;
    this.connections = data.connections;
    this.hasActiveConnection = data.hasActiveConnection || false;
    this.hasAccess = data.hasAccess || false;
    this.count = data.count;
    this.error = data.error;
    this.data = data.data;
    this.qrCode = data.qrCode;
    this.sessionId = data.sessionId;
  }
}

// WhatsApp Status Response
export class WhatsAppStatusResponse {
  constructor(data = {}) {
    this.status = data.status || 'not_initialized';
    this.phoneNumber = data.phoneNumber;
    this.profileName = data.profileName;
    this.lastActivity = data.lastActivity;
    this.qrCode = data.qrCode;
    this.sessionId = data.sessionId;
    this.isAuthenticated = data.status === 'authenticated';
    this.isConnecting = data.status === 'authenticating';
    this.isDisconnected = data.status === 'disconnected';
    this.hasError = data.status === 'error';
  }
}

// Send Message Response
export class SendMessageResponse {
  constructor(data = {}) {
    this.success = data.success || false;
    this.messageId = data.messageId;
    this.timestamp = data.timestamp;
    this.manual = data.manual || false;
    this.whatsappLink = data.whatsappLink;
    this.message = data.message;
    this.error = data.error;
    this.status = data.status;
    this.recipient = data.recipient;
  }
}

// Bulk Message Response
export class BulkMessageResponse {
  constructor(data = {}) {
    this.total = data.total || 0;
    this.successful = data.successful || 0;
    this.failed = data.failed || 0;
    this.results = data.results || [];
    this.errors = data.errors || [];
    this.batchId = data.batchId;
    this.completedAt = data.completedAt;
  }
}

// Error handling utilities
function getErrorMessage(error) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return error.message;
  }
  return String(error);
}

class WhatsAppAPI {
  constructor() {
    this.baseURL = BASE_URL;
    this.isInitializing = false;
    this.statusCheckInterval = null;
  }

  // Get auth headers
  async getAuthHeaders() {
    try {
      const [token, userData, userId] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('_id'),
      ]);

      const user = userData ? JSON.parse(userData) : {};
      const finalUserId = user?.id || user?._id || userId;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-User-ID': finalUserId || '',
        'X-User-Role': user?.role || '',
        'X-Device-Platform': Platform.OS,
      };

      return headers;
    } catch (error) {
      return {
        'Content-Type': 'application/json',
        'X-Device-Platform': Platform.OS,
      };
    }
  }

  // Fetch API with retry logic
  async fetchAPI(endpoint, options = {}, retries = 3) {
    const url = `${this.baseURL}/api/whatsapp${endpoint}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const headers = await this.getAuthHeaders();

        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (response.status === 401) {
          await AsyncStorage.multiRemove(['token', 'authToken', '_id', 'user']);
          throw new Error('Authentication failed. Please login again.');
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        );
      }
    }
  }

  // ========== CONNECTION MANAGEMENT ==========

  // Get active connection for client
  async getConnection() {
    try {
      const result = await this.fetchAPI('/connection');
      return new APIResponse(result);
    } catch (error) {
      return new APIResponse({
        success: false,
        message: 'Failed to fetch WhatsApp connection',
        error: getErrorMessage(error),
      });
    }
  }

  // Check connection status
  async checkStatus() {
    try {
      const result = await this.fetchAPI('/connection/status');
      return new APIResponse(result);
    } catch (error) {
      return new APIResponse({
        success: false,
        message: 'Failed to check WhatsApp status',
        error: getErrorMessage(error),
      });
    }
  }

  // Create connection (customer only)
  async createConnection(phoneNumber, connectionData = {}) {
    try {
      const userData = await AsyncStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : {};

      const requestBody = {
        phoneNumber,
        connectionData: {
          ...connectionData,
          userContext: {
            userId: user?.id || user?._id,
            userRole: user?.role,
            timestamp: new Date().toISOString(),
            platform: Platform.OS,
          },
        },
      };

      const result = await this.fetchAPI('/connection', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      return new APIResponse(result);
    } catch (error) {
      return new APIResponse({
        success: false,
        message: 'Failed to create WhatsApp connection',
        error: getErrorMessage(error),
      });
    }
  }

  // Delete connection (customer only)
  async deleteConnection() {
    try {
      const result = await this.fetchAPI('/connection', {
        method: 'DELETE',
      });
      return new APIResponse(result);
    } catch (error) {
      return new APIResponse({
        success: false,
        message: 'Failed to delete WhatsApp connection',
        error: getErrorMessage(error),
      });
    }
  }

  // Get connection history (customer only)
  async getConnectionHistory() {
    try {
      const result = await this.fetchAPI('/connection/history');
      return new APIResponse(result);
    } catch (error) {
      return new APIResponse({
        success: false,
        message: 'Failed to fetch connection history',
        error: getErrorMessage(error),
      });
    }
  }

  // ========== SESSION MANAGEMENT ==========

  // Initialize WhatsApp session
  async initialize() {
    if (this.isInitializing) {
      return new APIResponse({
        success: false,
        message: 'WhatsApp initialization already in progress',
      });
    }

    this.isInitializing = true;
    try {
      const result = await this.fetchAPI('/initialize', {
        method: 'POST',
      });
      return new APIResponse(result);
    } catch (error) {
      return new APIResponse({
        success: false,
        error: getErrorMessage(error) || 'Failed to initialize WhatsApp',
      });
    } finally {
      this.isInitializing = false;
    }
  }

  // Get session status
  async getSessionStatus() {
    try {
      const result = await this.fetchAPI('/status');
      return new WhatsAppStatusResponse(result);
    } catch (error) {
      return new WhatsAppStatusResponse({ status: 'error' });
    }
  }

  // Logout from WhatsApp
  async logout() {
    try {
      const result = await this.fetchAPI('/logout', {
        method: 'POST',
      });
      return new APIResponse(result);
    } catch (error) {
      return new APIResponse({
        success: false,
        error: getErrorMessage(error) || 'Failed to logout',
      });
    }
  }

  // ========== MESSAGING ==========

  // Send message to party
  async sendMessage(params) {
    try {
      const result = await this.fetchAPI('/send-message', {
        method: 'POST',
        body: JSON.stringify({
          ...params,
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
        }),
      });
      return new SendMessageResponse(result);
    } catch (error) {
      return new SendMessageResponse({
        success: false,
        error: getErrorMessage(error) || 'Failed to send message',
      });
    }
  }

  // Send bulk messages to multiple parties
  async sendBulkMessages(params) {
    try {
      const result = await this.fetchAPI('/send-bulk-messages', {
        method: 'POST',
        body: JSON.stringify({
          ...params,
          platform: Platform.OS,
          batchTimestamp: new Date().toISOString(),
        }),
      });
      return new BulkMessageResponse(result);
    } catch (error) {
      return new BulkMessageResponse({
        total: params.phoneNumbers?.length || 0,
        successful: 0,
        failed: params.phoneNumbers?.length || 0,
        results: [],
        errors: (params.phoneNumbers || []).map(phone => ({
          phoneNumber: phone,
          error: getErrorMessage(error) || 'Failed to send bulk messages',
        })),
      });
    }
  }

  // ========== ENHANCED FEATURES ==========

  // Quick status check
  async quickStatus() {
    try {
      const status = await this.getSessionStatus();
      return {
        isConnected: status.status === 'authenticated',
        phoneNumber: status.phoneNumber,
        profileName: status.profileName,
        lastActivity: status.lastActivity,
        status: status.status,
        hasError: status.hasError,
      };
    } catch (error) {
      return {
        isConnected: false,
        status: 'error',
        error: getErrorMessage(error),
      };
    }
  }

  // Start status polling
  startStatusPolling(callback, interval = 5000) {
    this.stopStatusPolling();

    this.statusCheckInterval = setInterval(async () => {
      try {
        const status = await this.quickStatus();
        callback(status);
      } catch (error) {
        callback({
          isConnected: false,
          status: 'error',
          error: getErrorMessage(error),
        });
      }
    }, interval);
  }

  // Stop status polling
  stopStatusPolling() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  // Validate phone number
  validatePhoneNumber(phoneNumber) {
    if (!phoneNumber) {
      return { isValid: false, error: 'Phone number is required' };
    }

    const cleaned = phoneNumber.replace(/\D/g, '');

    if (cleaned.length < 10) {
      return { isValid: false, error: 'Phone number too short' };
    }

    if (cleaned.length > 15) {
      return { isValid: false, error: 'Phone number too long' };
    }

    return { isValid: true, cleaned };
  }

  // Generate WhatsApp link
  generateWhatsAppLink(phoneNumber, message = '') {
    const validation = this.validatePhoneNumber(phoneNumber);
    if (!validation.isValid) {
      return null;
    }

    const cleanedPhone = validation.cleaned;
    const encodedMessage = encodeURIComponent(message);

    return `https://wa.me/${cleanedPhone}${
      message ? `?text=${encodedMessage}` : ''
    }`;
  }

  // Open WhatsApp directly
  async openWhatsApp(phoneNumber, message = '') {
    try {
      const whatsappLink = this.generateWhatsAppLink(phoneNumber, message);
      if (!whatsappLink) {
        throw new Error('Invalid phone number');
      }

      const supported = await Linking.canOpenURL(whatsappLink);
      if (supported) {
        await Linking.openURL(whatsappLink);
        return true;
      } else {
        throw new Error('WhatsApp is not installed');
      }
    } catch (error) {
      throw error;
    }
  }

  // Check if WhatsApp is available
  async isWhatsAppAvailable() {
    try {
      const status = await this.getSessionStatus();
      return status.status === 'authenticated';
    } catch (error) {
      return false;
    }
  }

  // Get connection statistics
  async getConnectionStats() {
    try {
      const [connection, history, status] = await Promise.all([
        this.getConnection(),
        this.getConnectionHistory(),
        this.getSessionStatus(),
      ]);

      return {
        hasActiveConnection: connection.hasActiveConnection,
        connectionCount: history.connections?.length || 0,
        currentStatus: status.status,
        lastConnected: connection.connection?.last_connected,
        isAuthenticated: status.status === 'authenticated',
        phoneNumber: status.phoneNumber,
        profileName: status.profileName,
      };
    } catch (error) {
      return {
        hasActiveConnection: false,
        connectionCount: 0,
        currentStatus: 'error',
        lastConnected: null,
        isAuthenticated: false,
        error: getErrorMessage(error),
      };
    }
  }
}

// Create singleton instance
export const whatsappAPI = new WhatsAppAPI();

// Utility functions for React Native components
export const WhatsAppUtils = {
  // Format phone number for display
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';

    const cleaned = phoneNumber.replace(/\D/g, '');

    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(
        7,
      )}`;
    }

    return `+${cleaned}`;
  },

  // Check if message can be sent
  canSendMessage(party) {
    return !!(party?.phoneNumber || party?.contactNumber);
  },

  // Get phone number from party
  getPhoneNumber(party) {
    return party?.phoneNumber || party?.contactNumber || '';
  },

  // Prepare message data
  prepareMessageData(party, message, invoiceData = null, options = {}) {
    const phoneNumber = this.getPhoneNumber(party);

    if (!phoneNumber) {
      throw new Error('No phone number available for this party');
    }

    return {
      phoneNumber,
      message,
      partyName: party.name,
      invoiceData,
      timestamp: new Date().toISOString(),
      ...options,
    };
  },

  // Generate default reminder message
  generateReminderMessage(party, transaction, company, customMessage = null) {
    if (customMessage) {
      return this.replaceMessageVariables(
        customMessage,
        party,
        transaction,
        company,
      );
    }

    const amount = transaction.totalAmount || transaction.amount || 0;
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);

    const invoiceNumber =
      transaction.invoiceNumber || transaction.referenceNumber || 'N/A';
    const dueDate = transaction.dueDate
      ? new Date(transaction.dueDate).toLocaleDateString()
      : 'N/A';
    const currentDate = new Date().toLocaleDateString();

    return `Dear ${party.name},

This is a friendly reminder regarding your outstanding payment.

Invoice: ${invoiceNumber}
Amount: ${formattedAmount}
Due Date: ${dueDate}
Date: ${currentDate}

Please process the payment at your earliest convenience.

Thank you,
${company.businessName || company.name || 'Your Company'}`;
  },

  // Replace variables in message template
  replaceMessageVariables(template, party, transaction, company) {
    let message = template;

    const variables = {
      '{partyName}': party.name,
      '{invoiceNumber}':
        transaction.invoiceNumber || transaction.referenceNumber || 'N/A',
      '{amount}': new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(transaction.totalAmount || transaction.amount || 0),
      '{dueDate}': transaction.dueDate
        ? new Date(transaction.dueDate).toLocaleDateString()
        : 'N/A',
      '{currentDate}': new Date().toLocaleDateString(),
      '{companyName}': company.businessName || company.name || 'Your Company',
      '{companyEmail}': company.email || '',
      '{companyPhone}': company.phone || '',
    };

    Object.keys(variables).forEach(key => {
      message = message.replace(new RegExp(key, 'g'), variables[key]);
    });

    return message;
  },

  // Validate message content
  validateMessage(message, maxLength = 4096) {
    if (!message || message.trim().length === 0) {
      return { isValid: false, error: 'Message cannot be empty' };
    }

    if (message.length > maxLength) {
      return {
        isValid: false,
        error: `Message too long (${message.length}/${maxLength} characters)`,
      };
    }

    return { isValid: true };
  },
};

// Export default instance
export default whatsappAPI;
