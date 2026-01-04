import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  AppState,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { BASE_URL } from '../../config';

export function EmailSendingConsent() {
  const [status, setStatus] = useState({
    connected: false,
    email: null,
    termsAcceptedAt: null,
    reason: null,
    lastFailureAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [reconnectNotice, setReconnectNotice] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const prevConnectedRef = useRef(null);
  const POLL_MS = 120000;

  // Helper to read auth token from multiple possible AsyncStorage keys
  const getAuthToken = async () => {
    const keys = ['authToken', 'token'];
    for (const k of keys) {
      try {
        const v = await AsyncStorage.getItem(k);
        if (v) return { token: v, key: k };
      } catch (e) {
        // ignore and try next
      }
    }
    return { token: null, key: null };
  };

  // Configure Google Sign-In once
  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '627437378841-j3v3hhhos4db0mc7e1m7n2sfbddvgn3d.apps.googleusercontent.com', // Get from Firebase Console
      offlineAccess: true, // Get refresh token
      scopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
    });

    loadInitialStatus();
  }, []);

  // Add AppState handler for foreground refresh
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // App foreground आने पर status refresh करें
        refreshStatus();
      }
    });

    return () => subscription.remove();
  }, [refreshStatus]);

  const refreshStatus = useCallback(async () => {
    try {
      const { token, key } = await getAuthToken();
      const url = `${BASE_URL}/api/integrations/gmail/status`;
      console.log('[EmailSendingConsent] refreshStatus ->', {
        url,
        tokenPresent: !!token,
        tokenKey: key,
      });

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
      });

      if (!response.ok) {
        let bodyText = '';
        try {
          bodyText = await response.text();
        } catch (e) {
          bodyText = '<unable to read body>';
        }
        console.error(
          '[EmailSendingConsent] refreshStatus failed',
          response.status,
          bodyText,
        );
        throw new Error('Failed to load email status');
      }

      const data = await response.json();

      const wasConnected = prevConnectedRef.current;
      const nowConnected = !!data.connected;

      setStatus(data);
      prevConnectedRef.current = nowConnected;

      // Show reconnect notice if connection was lost
      if (wasConnected && !nowConnected && data.email) {
        setReconnectNotice(true);
        const message =
          data.reason === 'token_expired'
            ? 'Your Gmail session expired. Please reconnect to keep emailing invoices.'
            : 'Your Gmail connection is no longer active. Please reconnect.';

        Alert.alert('Gmail needs reconnect', message, [{ text: 'OK' }]);
      }
    } catch (error) {
      console.error('Error refreshing status:', error);
    }
  }, []);

  const loadInitialStatus = async () => {
    try {
      await refreshStatus();
    } catch (error) {
      console.error('Failed to load initial status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Poll for status updates when terms are accepted
  useEffect(() => {
    if (!status.termsAcceptedAt) return;

    const intervalId = setInterval(() => {
      refreshStatus();
    }, POLL_MS);

    return () => clearInterval(intervalId);
  }, [status.termsAcceptedAt, refreshStatus]);

  // Handle Google Sign-In natively
  const handleGoogleSignIn = async () => {
    try {
      setConnecting(true);

      // Clear any existing session first
      try {
        await GoogleSignin.signOut();
      } catch (signOutError) {
        // Ignore if not signed in
      }

      // Check if Google Play Services are available (Android only)
      try {
        await GoogleSignin.hasPlayServices();
      } catch (error) {
        Alert.alert(
          'Google Play Services Required',
          'Please install Google Play Services to connect Gmail.',
          [{ text: 'OK' }],
        );
        return;
      }

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();

      // If signIn returned no user (user cancelled), bail out gracefully
      if (!userInfo || !userInfo.user) {
        console.log('[EmailSendingConsent] Google sign-in aborted by user');
        setConnecting(false);
        return;
      }

      // Get access tokens (may throw if user cancelled or not signed in)
      let tokens;
      try {
        tokens = await GoogleSignin.getTokens();
      } catch (err) {
        // Treat "not signed in" / cancelled as a normal cancellation
        const msg = err && err.message ? err.message : String(err);
        if (
          msg.includes('getTokens requires a user to be signed in') ||
          msg.includes('SIGN_IN_CANCELLED')
        ) {
          console.log(
            '[EmailSendingConsent] getTokens cancelled or user not signed in:',
            msg,
          );
          setConnecting(false);
          return;
        }
        throw err;
      }

      // Send tokens to your backend
      await sendTokensToBackend(userInfo, tokens);
    } catch (error) {
      handleGoogleSignInError(error);
    } finally {
      setConnecting(false);
    }
  };

  const sendTokensToBackend = async (userInfo, tokens) => {
    try {
      const { token } = await getAuthToken();
      const response = await fetch(
        `${BASE_URL}/api/integrations/gmail/connect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            idToken: userInfo.idToken,
            email: userInfo.user.email,
            name: userInfo.user.name,
            photo: userInfo.user.photo,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();

        // Update local state
        setStatus(prev => ({
          ...prev,
          connected: true,
          email: userInfo.user.email,
          termsAcceptedAt: data.termsAcceptedAt || new Date().toISOString(),
        }));

        setReconnectNotice(false);

        // Save to AsyncStorage for persistence
        await AsyncStorage.setItem('gmailLinkedEmail', userInfo.user.email);
        await AsyncStorage.setItem('gmailTermsAccepted', 'true');

        Alert.alert(
          'Success',
          `Gmail connected successfully as ${userInfo.user.email}`,
          [{ text: 'OK' }],
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to connect to backend');
      }
    } catch (error) {
      console.error('Backend connection error:', error);
      Alert.alert('Error', error.message || 'Failed to connect to backend');
    }
  };

  const handleGoogleSignInError = error => {
    console.error('Google Sign-In Error:', error);

    switch (error.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        // User cancelled the sign-in flow - silent fail
        console.log('User cancelled Google Sign-In');
        break;

      case statusCodes.IN_PROGRESS:
        // Operation (e.g., sign in) is already in progress
        console.log('Google Sign-In already in progress');
        break;

      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        Alert.alert(
          'Google Play Services',
          'Google Play Services not available or outdated.',
          [{ text: 'OK' }],
        );
        break;

      default:
        // Check if it's a DEVELOPER_ERROR (Firebase config issue)
        if (
          error.code === 'DEVELOPER_ERROR' ||
          error.message?.includes('DEVELOPER_ERROR')
        ) {
          Alert.alert(
            'Gmail Setup Required',
            'Please ensure your Firebase project is configured correctly:\n\n' +
              "1. Add your app's SHA-1 fingerprint to Firebase Console\n" +
              '2. Create an OAuth 2.0 credential (Android)\n' +
              '3. Ensure the web client ID matches your Firebase setup\n\n' +
              'See: https://react-native-google-signin.github.io/docs/troubleshooting',
            [{ text: 'OK' }],
          );
        } else {
          Alert.alert(
            'Error',
            'Failed to connect to Google. Please try again.',
            [{ text: 'OK' }],
          );
        }
    }
  };

  const handleDisconnect = async () => {
    if (!status.email) return;

    Alert.alert(
      'Disconnect Gmail',
      `Are you sure you want to disconnect ${status.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              // Sign out from Google
              await GoogleSignin.signOut();

              // Disconnect from your backend
              const { token } = await getAuthToken();
              const response = await fetch(
                `${BASE_URL}/api/integrations/gmail/disconnect`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                },
              );

              if (!response.ok)
                throw new Error('Failed to disconnect from backend');

              // Update local state
              setStatus({
                connected: false,
                email: null,
                termsAcceptedAt: status.termsAcceptedAt, // Keep terms acceptance
              });
              setReconnectNotice(false);

              // Remove from AsyncStorage
              await AsyncStorage.removeItem('gmailLinkedEmail');

              Alert.alert(
                'Success',
                `${status.email} has been disconnected successfully.`,
                [{ text: 'OK' }],
              );
            } catch (error) {
              console.error('Disconnect error:', error);
              Alert.alert('Error', error.message || 'Failed to disconnect.');
            }
          },
        },
      ],
    );
  };

  const handleConnectFlow = () => {
    if (!status.termsAcceptedAt) {
      // Show terms modal first
      setShowTermsModal(true);
    } else {
      // Directly connect to Google
      handleGoogleSignIn();
    }
  };

  const handleAcceptTerms = async () => {
    try {
      // Save terms acceptance
      const termsData = {
        acceptedAt: new Date().toISOString(),
        accepted: true,
      };

      // Save to your backend
      const { token } = await getAuthToken();
      await fetch(`${BASE_URL}/api/integrations/gmail/accept-terms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(termsData),
      });

      // Update local state
      setStatus(prev => ({ ...prev, termsAcceptedAt: termsData.acceptedAt }));
      setShowTermsModal(false);

      // Now connect to Google
      handleGoogleSignIn();
    } catch (error) {
      console.error('Error accepting terms:', error);
      Alert.alert('Error', 'Failed to accept terms. Please try again.');
    }
  };

  const needsReconnect =
    reconnectNotice ||
    (status.termsAcceptedAt && !!status.email && !status.connected) ||
    (status.termsAcceptedAt && status.reason === 'token_expired');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#64748b" />
        <Text style={styles.loadingText}>Checking email-sending status…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Reconnect Notice */}
      {/* {needsReconnect && (
        <View style={styles.alertContainer}>
          <View style={styles.alertHeader}>
            <Icon name="alert-triangle" size={20} color="#f59e0b" />
            <Text style={styles.alertTitle}>
              Gmail disconnected — action required
            </Text>
          </View>
          <Text style={styles.alertDescription}>
            {status.reason === 'token_expired'
              ? 'Your Gmail session has expired. Please reconnect to continue emailing invoices.'
              : 'To email invoices, please reconnect your Gmail account.'}
          </Text>

          {status.lastFailureAt ? (
            <Text style={styles.failureText}>
              Last send failure:{' '}
              {new Date(status.lastFailureAt).toLocaleString()}
            </Text>
          ) : null}

          <TouchableOpacity
            style={styles.reconnectButton}
            onPress={handleConnectFlow}
            disabled={connecting}
          >
            {connecting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.reconnectButtonText}>
                {status.email ? 'Reconnect Gmail' : 'Connect Gmail'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )} */}

      {/* Email Account Card */}
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.emailInfo}>
              <Icon name="mail" size={20} color="#64748b" />
              <View style={styles.emailText}>
                <Text style={styles.emailLabel}>Email account</Text>
                {status.connected && status.email ? (
                  <Text style={styles.connectedEmail}>{status.email}</Text>
                ) : (
                  <Text style={styles.noEmailText}>
                    {status.termsAcceptedAt
                      ? 'No email connected yet.'
                      : 'Accept terms first to connect an email.'}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.actionContainer}>
              {status.connected ? (
                <View style={styles.connectedContainer}>
                  <View style={styles.connectedBadge}>
                    <Icon name="check-circle" size={16} color="#10b981" />
                    <Text style={styles.connectedText}>Connected</Text>
                    {status.email && (
                      <Text style={styles.emailTextSmall}>
                        : {status.email}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.disconnectButton}
                    onPress={handleDisconnect}
                  >
                    <Text style={styles.disconnectButtonText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.connectButton}
                  onPress={handleConnectFlow}
                  disabled={connecting}
                >
                  {connecting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Icon
                        name="link"
                        size={16}
                        color="#ffffff"
                        style={styles.buttonIcon}
                      />
                      <Text style={styles.connectButtonText}>
                        {status.email ? 'Reconnect Gmail' : 'Connect Gmail'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Terms Modal (use RN Modal so overlay covers full screen) */}
      <Modal
        visible={showTermsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowTermsModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Terms & Conditions</Text>

                <View style={styles.termsScroll}>
                  <Text style={styles.termsSectionTitle}>
                    Email Sending Service
                  </Text>
                  <Text style={styles.termsText}>
                    By connecting your Gmail account, you agree to allow this
                    application to:
                    {'\n\n'}• Send emails on your behalf
                    {'\n'}• Use your Gmail account only for sending invoices to
                    customers
                    {'\n'}• Store your email address for sending purposes only
                    {'\n\n'}
                    We respect your privacy and will:
                    {'\n\n'}• Never read your emails
                    {'\n'}• Never share your email address with third parties
                    {'\n'}• Only use the minimum permissions required
                    (Gmail.send)
                    {'\n'}• Allow you to disconnect at any time
                    {'\n\n'}
                    You can revoke access at any time from your Google Account
                    settings or from within this app.
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowTermsModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.acceptButton]}
                    onPress={handleAcceptTerms}
                  >
                    <Text style={styles.acceptButtonText}>
                      Accept & Continue
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  alertContainer: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  alertDescription: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
    marginBottom: 8,
  },
  failureText: {
    fontSize: 12,
    color: '#92400e',
    opacity: 0.8,
    marginBottom: 12,
  },
  reconnectButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 140,
  },
  reconnectButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  emailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  emailText: {
    flex: 1,
  },
  emailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  connectedEmail: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
  noEmailText: {
    fontSize: 13,
    color: '#6b7280',
  },
  actionContainer: {
    alignItems: 'flex-end',
  },
  connectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  connectedText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  emailTextSmall: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    maxWidth: 150,
  },
  disconnectButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  disconnectButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  connectButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
    minWidth: 140,
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 4,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  termsScroll: {
    maxHeight: 300,
    marginBottom: 20,
    paddingRight: 8,
  },
  termsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  acceptButton: {
    backgroundColor: '#3b82f6',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
