// lib/whatsapp-connection.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { whatsappAPI } from './whatsappAPI';

class WhatsAppConnectionService {
  constructor() {
    this.STORAGE_KEY = 'whatsapp-connection';
    this.SESSION_KEY = 'whatsapp-session';
    this.connectionCache = null;
    this.lastChecked = 0;
    this.CACHE_DURATION = 60000;
    this.isInitializing = false;
  }

  // Get storage key based on client ID for better persistence
  getStorageKey() {
    const clientId = this.getClientId();
    return clientId ? `${this.STORAGE_KEY}-${clientId}` : this.STORAGE_KEY;
  }

  // Get client ID specifically for storage
  async getClientId() {
    try {
      const [userData, clientId, clientId2, companyId, tenantId] =
        await Promise.all([
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('client_id'),
          AsyncStorage.getItem('clientId'),
          AsyncStorage.getItem('company_id'),
          AsyncStorage.getItem('tenantId'),
        ]);

      const user = userData ? JSON.parse(userData) : {};

      return (
        user?.client_id ||
        user?.clientId ||
        user?.company_id ||
        user?.tenantId ||
        clientId ||
        clientId2 ||
        companyId ||
        tenantId
      );
    } catch (error) {
      console.error('Error getting client ID:', error);
      return null;
    }
  }

  // Get current user info
  async getCurrentUser() {
    try {
      const [
        userData,
        id,
        _id,
        role,
        name,
        email,
        client_id,
        clientId,
        company_id,
        tenantId,
      ] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('id'),
        AsyncStorage.getItem('_id'),
        AsyncStorage.getItem('role'),
        AsyncStorage.getItem('name'),
        AsyncStorage.getItem('email'),
        AsyncStorage.getItem('client_id'),
        AsyncStorage.getItem('clientId'),
        AsyncStorage.getItem('company_id'),
        AsyncStorage.getItem('tenantId'),
      ]);

      const user = userData ? JSON.parse(userData) : {};

      const combinedUser = {
        ...user,
        id: user.id || id,
        _id: user._id || _id,
        role: user.role || role,
        name: user.name || name,
        email: user.email || email,
        client_id: user.client_id || client_id,
        clientId: user.clientId || clientId,
        company_id: user.company_id || company_id,
        tenantId: user.tenantId || tenantId,
      };

      return combinedUser;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  // Check if user is customer (boss/admin)
  async isCustomerUser() {
    const user = await this.getCurrentUser();
    return user?.role === 'customer';
  }

  // Check personal connection using dual storage
  async hasPersonalConnection() {
    const storageKey = this.getStorageKey();

    try {
      // First check sessionStorage equivalent (AsyncStorage)
      const sessionStored = await AsyncStorage.getItem(this.SESSION_KEY);
      if (sessionStored) {
        const sessionConnection = JSON.parse(sessionStored);
        if (sessionConnection.isConnected) {
          return true;
        }
      }

      // Then check main storage
      const localStored = await AsyncStorage.getItem(storageKey);
      if (!localStored) return false;

      const localConnection = JSON.parse(localStored);

      // Check if connection is still valid (within 30 days)
      if (localConnection.lastConnected) {
        const connectionTime = new Date(
          localConnection.lastConnected,
        ).getTime();
        const currentTime = new Date().getTime();
        const daysDiff = (currentTime - connectionTime) / (1000 * 60 * 60 * 24);

        if (daysDiff > 30) {
          await this.clearPersonalConnection();
          return false;
        }
      }

      return localConnection.isConnected === true;
    } catch (error) {
      console.error('Error checking personal connection:', error);
      return false;
    }
  }

  // Get personal connection using dual storage
  async getPersonalConnection() {
    const storageKey = this.getStorageKey();

    try {
      // Prefer session storage first
      const sessionStored = await AsyncStorage.getItem(this.SESSION_KEY);
      if (sessionStored) {
        return JSON.parse(sessionStored);
      }

      // Fall back to main storage
      const localStored = await AsyncStorage.getItem(storageKey);
      return localStored ? JSON.parse(localStored) : { isConnected: false };
    } catch (error) {
      console.error('Error getting personal connection:', error);
      return { isConnected: false };
    }
  }

  // Save personal connection using dual storage
  async setPersonalConnection(connected, phoneNumber) {
    const storageKey = this.getStorageKey();
    const connection = {
      isConnected: connected,
      lastConnected: connected ? new Date() : undefined,
      phoneNumber: connected ? phoneNumber : undefined,
    };

    console.log('💾 Saving WhatsApp connection:', {
      storageKey,
      connected,
      clientId: await this.getClientId(),
    });

    try {
      // Store in session storage
      await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(connection));

      // Also store in main storage for longer persistence
      if (connected) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(connection));
      } else {
        await AsyncStorage.removeItem(storageKey);
      }

      this.connectionCache = connection;
      this.lastChecked = Date.now();
    } catch (error) {
      console.error('Error saving personal connection:', error);
    }
  }

  // Clear personal connection
  async clearPersonalConnection() {
    const storageKey = this.getStorageKey();

    try {
      await AsyncStorage.multiRemove([storageKey, this.SESSION_KEY]);
      this.connectionCache = null;

      console.log('🗑️ Cleared WhatsApp connection for:', storageKey);
    } catch (error) {
      console.error('Error clearing personal connection:', error);
    }
  }

  // Clear all storage (use only for explicit WhatsApp logout)
  async clearAllStorage() {
    try {
      // Clear current client connection
      await this.clearPersonalConnection();

      // Get all keys and remove WhatsApp-related ones
      const keys = await AsyncStorage.getAllKeys();
      const whatsappKeys = keys.filter(
        key => key.startsWith(this.STORAGE_KEY) || key === this.SESSION_KEY,
      );

      if (whatsappKeys.length > 0) {
        await AsyncStorage.multiRemove(whatsappKeys);
        console.log('🗑️ Removed WhatsApp connections:', whatsappKeys);
      }
    } catch (error) {
      console.error('Error clearing all storage:', error);
    }
  }

  // Check WhatsApp connection with proper shared user access
  async checkWhatsAppWebConnection(forceRefresh = false) {
    if (
      !forceRefresh &&
      this.connectionCache &&
      Date.now() - this.lastChecked < this.CACHE_DURATION
    ) {
      return this.connectionCache.isConnected;
    }

    try {
      // Check backend connection first
      const backendResponse = await whatsappAPI.checkStatus();
      console.log('🔍 Backend Status Response:', backendResponse);

      // Staff users should have access if connection exists AND they have access
      const backendConnected =
        backendResponse.hasActiveConnection === true &&
        backendResponse.hasAccess === true;

      // Only check personal connection if no shared connection exists
      let personalConnected = false;
      if (!backendConnected) {
        personalConnected = await this.hasPersonalConnection();
      }

      const isConnected = backendConnected || personalConnected;

      // Update cache
      this.connectionCache = {
        isConnected,
        isSharedConnection: backendConnected,
        isPersonalConnection: personalConnected,
      };
      this.lastChecked = Date.now();

      console.log('🔍 Connection Check Result:', {
        backendConnected,
        personalConnected,
        finalConnected: isConnected,
        backendResponse,
      });

      return isConnected;
    } catch (error) {
      console.error('Error checking WhatsApp connection:', error);
      return false;
    }
  }

  // Get connection info with proper access checking and type handling
  async getConnectionInfo() {
    try {
      // Check backend connection first
      const backendResponse = await whatsappAPI.getConnection();

      console.log('🔍 Backend Connection Response:', backendResponse);

      if (
        backendResponse.success &&
        backendResponse.connection &&
        backendResponse.hasAccess !== false
      ) {
        const apiConnection = backendResponse.connection;
        const user = await this.getCurrentUser();
        const userId = user?.id || user?._id;

        // Extract connected_by ID properly - handle both string and object types
        let connectedById;
        if (typeof apiConnection.connected_by === 'string') {
          connectedById = apiConnection.connected_by;
        } else if (
          apiConnection.connected_by &&
          typeof apiConnection.connected_by === 'object'
        ) {
          connectedById = apiConnection.connected_by._id;
        }

        // Extract connected_by name properly
        let connectedByName;
        if (typeof apiConnection.connected_by === 'string') {
          connectedByName = apiConnection.connected_by_name;
        } else if (
          apiConnection.connected_by &&
          typeof apiConnection.connected_by === 'object'
        ) {
          connectedByName =
            apiConnection.connected_by.name || apiConnection.connected_by_name;
        }

        // Check if user is owner or has shared access
        const isOwner = connectedById === userId;
        const isShared = apiConnection.shared_with_users?.some(sharedUser => {
          const sharedUserId =
            typeof sharedUser === 'string' ? sharedUser : sharedUser._id;
          return sharedUserId === userId;
        });

        const hasAccess =
          isOwner || isShared || backendResponse.hasAccess === true;

        console.log('🔍 Access Check for Connection:', {
          userId,
          connectedById,
          connectedByName,
          sharedWithUsers: apiConnection.shared_with_users,
          isOwner,
          isShared,
          hasAccess,
        });

        if (hasAccess) {
          return {
            isConnected: true,
            phoneNumber: apiConnection.phone_number,
            connectedBy: connectedById,
            connectedByName: connectedByName,
            clientId: apiConnection.client_id,
            connectionId: apiConnection._id,
            lastConnected: new Date(apiConnection.last_connected),
            isClientConnection: true,
            connectionType: 'client',
            hasAccess: true,
          };
        }
      }

      // Only check personal connection if no shared connection exists or no access
      const personalConnection = await this.getPersonalConnection();
      if (personalConnection.isConnected) {
        return {
          ...personalConnection,
          connectionType: 'personal',
          hasAccess: true,
        };
      }

      return {
        isConnected: false,
        connectionType: 'none',
        hasAccess: false,
      };
    } catch (error) {
      console.error('Error getting connection info:', error);
      return {
        isConnected: false,
        connectionType: 'none',
        hasAccess: false,
      };
    }
  }

  // Save client connection (customer only)
  async setClientConnection(phoneNumber, connectionData) {
    try {
      const response = await whatsappAPI.createConnection(
        phoneNumber,
        connectionData,
      );

      if (response.success) {
        await this.setPersonalConnection(true, phoneNumber);
        this.connectionCache = null;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error setting client connection:', error);
      return false;
    }
  }

  // Clear client connection (customer only)
  async clearClientConnection() {
    try {
      const response = await whatsappAPI.deleteConnection();

      if (response.success) {
        await this.clearPersonalConnection();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error clearing client connection:', error);
      return false;
    }
  }

  // Check if user can manage connections
  async canManageConnections() {
    return await this.isCustomerUser();
  }

  // Get connection history (customer only)
  async getConnectionHistory() {
    if (!(await this.canManageConnections())) {
      throw new Error('Insufficient permissions');
    }

    return await whatsappAPI.getConnectionHistory();
  }

  // Refresh connection cache
  refreshConnection() {
    this.connectionCache = null;
    this.lastChecked = 0;
  }

  // Simple sync method for quick checks
  async isWhatsAppConnected() {
    return await this.hasPersonalConnection();
  }

  // Set connection status (compatible with reference code)
  async setConnectionStatus(connected, phoneNumber, connectionId) {
    await this.setPersonalConnection(connected, phoneNumber);
  }

  // Method to restore connection when user logs in
  async restoreConnectionOnLogin() {
    const wasConnected = await this.hasPersonalConnection();

    if (wasConnected) {
      console.log('🔄 Restoring WhatsApp connection after login');

      // Update session storage with current connection info
      const connectionInfo = await this.getPersonalConnection();
      await AsyncStorage.setItem(
        this.SESSION_KEY,
        JSON.stringify(connectionInfo),
      );

      return true;
    }

    return false;
  }

  // Debug method to see connection state
  async debugConnections() {
    try {
      const storageKey = this.getStorageKey();
      const [sessionStored, localStored] = await Promise.all([
        AsyncStorage.getItem(this.SESSION_KEY),
        AsyncStorage.getItem(storageKey),
      ]);

      const allConnections = {};

      if (sessionStored) {
        allConnections.sessionStorage = JSON.parse(sessionStored);
      }

      if (localStored) {
        allConnections.localStorage = JSON.parse(localStored);
      }

      return {
        currentClientId: await this.getClientId(),
        currentStorageKey: storageKey,
        sessionStorage: allConnections.sessionStorage,
        localStorage: allConnections.localStorage,
        isConnected: await this.hasPersonalConnection(),
        connectionCache: this.connectionCache,
      };
    } catch (error) {
      console.error('Error debugging connections:', error);
      return {};
    }
  }

  // Enhanced debug method to check staff access
  async debugStaffAccess() {
    const user = await this.getCurrentUser();
    return {
      user: {
        id: user?.id,
        _id: user?._id,
        role: user?.role,
        name: user?.name,
      },
      canManage: await this.canManageConnections(),
      hasPersonalConnection: await this.hasPersonalConnection(),
      currentCache: this.connectionCache,
    };
  }

  // ========== ENHANCED FEATURES ==========

  // Check if QR code is available (for connection dialog)
  async isQRCodeAvailable() {
    try {
      const status = await whatsappAPI.getSessionStatus();
      return status.status === 'authenticating' && !!status.qrCode;
    } catch (error) {
      console.error('Error checking QR code:', error);
      return false;
    }
  }

  // Get QR code data for display
  async getQRCodeData() {
    try {
      const status = await whatsappAPI.getSessionStatus();
      return status.qrCode || null;
    } catch (error) {
      console.error('Error getting QR code:', error);
      return null;
    }
  }

  // Wait for connection to be established
  async waitForConnection(timeoutMs = 120000) {
    const startTime = Date.now();

    return new Promise(resolve => {
      const checkInterval = setInterval(async () => {
        try {
          const status = await whatsappAPI.getSessionStatus();

          if (status.status === 'authenticated') {
            clearInterval(checkInterval);
            resolve(true);
          } else if (Date.now() - startTime > timeoutMs) {
            clearInterval(checkInterval);
            resolve(false);
          }
        } catch (error) {
          console.error('Error waiting for connection:', error);
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 3000); // Check every 3 seconds
    });
  }

  async getQRCode() {
    try {
      const status = await whatsappAPI.getSessionStatus();
      console.log('🔍 QR Code Status:', status);

      if (status.status === 'authenticating' && status.qrCode) {
        return status.qrCode;
      }
      return null;
    } catch (error) {
      console.error('Error getting QR code:', error);
      return null;
    }
  }

  // Wait for QR code to be available
  async waitForQRCode(timeoutMs = 30000) {
    const startTime = Date.now();

    return new Promise(resolve => {
      const checkQR = async () => {
        try {
          const qrCode = await this.getQRCode();

          if (qrCode) {
            resolve(qrCode);
          } else if (Date.now() - startTime > timeoutMs) {
            resolve(null);
          } else {
            setTimeout(checkQR, 2000); // Check every 2 seconds
          }
        } catch (error) {
          console.error('Error waiting for QR code:', error);
          resolve(null);
        }
      };

      checkQR();
    });
  }

  // Initialize WhatsApp session
  async initializeWhatsApp() {
    if (this.isInitializing) {
      throw new Error('WhatsApp initialization already in progress');
    }

    this.isInitializing = true;
    try {
      const response = await whatsappAPI.initialize();

      if (response.success) {
        console.log('✅ WhatsApp initialization started');
        return response;
      } else {
        throw new Error(response.message || 'Failed to initialize WhatsApp');
      }
    } catch (error) {
      console.error('Error initializing WhatsApp:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  // Logout from WhatsApp
  async logoutWhatsApp() {
    try {
      const response = await whatsappAPI.logout();

      if (response.success) {
        await this.clearAllStorage();
        console.log('✅ WhatsApp logout successful');
        return true;
      } else {
        throw new Error(response.message || 'Failed to logout from WhatsApp');
      }
    } catch (error) {
      console.error('Error logging out from WhatsApp:', error);
      throw error;
    }
  }

  // Quick connection status
  async getQuickStatus() {
    try {
      const [backendStatus, personalConnected] = await Promise.all([
        whatsappAPI.quickStatus(),
        this.hasPersonalConnection(),
      ]);

      return {
        ...backendStatus,
        personalConnected,
        overallConnected: backendStatus.isConnected || personalConnected,
      };
    } catch (error) {
      console.error('Error getting quick status:', error);
      return {
        isConnected: false,
        status: 'error',
        personalConnected: false,
        overallConnected: false,
        error: error.message,
      };
    }
  }

  // Start status polling
  startStatusPolling(callback, interval = 5000) {
    this.stopStatusPolling();

    this.statusPollingInterval = setInterval(async () => {
      try {
        const status = await this.getQuickStatus();
        callback(status);
      } catch (error) {
        callback({
          isConnected: false,
          status: 'error',
          personalConnected: false,
          overallConnected: false,
          error: error.message,
        });
      }
    }, interval);
  }

  // Stop status polling
  stopStatusPolling() {
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
      this.statusPollingInterval = null;
    }
  }

  // Get connection statistics
  async getConnectionStats() {
    try {
      const [connection, history, status, personalConnected] =
        await Promise.all([
          whatsappAPI.getConnection(),
          whatsappAPI.getConnectionHistory(),
          whatsappAPI.getSessionStatus(),
          this.hasPersonalConnection(),
        ]);

      return {
        hasActiveConnection: connection.hasActiveConnection,
        connectionCount: history.connections?.length || 0,
        currentStatus: status.status,
        lastConnected: connection.connection?.last_connected,
        isAuthenticated: status.status === 'authenticated',
        phoneNumber: status.phoneNumber,
        profileName: status.profileName,
        personalConnected,
        overallConnected: connection.hasActiveConnection || personalConnected,
      };
    } catch (error) {
      console.error('Error getting connection stats:', error);
      return {
        hasActiveConnection: false,
        connectionCount: 0,
        currentStatus: 'error',
        lastConnected: null,
        isAuthenticated: false,
        personalConnected: false,
        overallConnected: false,
        error: error.message,
      };
    }
  }
}

// Create singleton instance
export const whatsappConnectionService = new WhatsAppConnectionService();

// Export the class for testing or extended usage
export default WhatsAppConnectionService;
