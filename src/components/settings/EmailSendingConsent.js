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
  ScrollView,
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
        '627437378841-j3v3hhhos4db0mc7e1m7n2sfbddvgn3d.apps.googleusercontent.com',
      offlineAccess: true,
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
        console.log('User cancelled Google Sign-In');
        break;

      case statusCodes.IN_PROGRESS:
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
              await GoogleSignin.signOut();

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

              setStatus({
                connected: false,
                email: null,
                termsAcceptedAt: status.termsAcceptedAt,
              });
              setReconnectNotice(false);

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
      setShowTermsModal(true);
    } else {
      handleGoogleSignIn();
    }
  };

  const handleAcceptTerms = async () => {
    try {
      const termsData = {
        acceptedAt: new Date().toISOString(),
        accepted: true,
      };

      const { token } = await getAuthToken();
      await fetch(`${BASE_URL}/api/integrations/gmail/accept-terms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(termsData),
      });

      setStatus(prev => ({ ...prev, termsAcceptedAt: termsData.acceptedAt }));
      setShowTermsModal(false);

      handleGoogleSignIn();
    } catch (error) {
      console.error('Error accepting terms:', error);
      Alert.alert('Error', 'Failed to accept terms. Please try again.');
    }
  };

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
      <View style={styles.card}>
        <View style={styles.cardContent}>
          {/* Top Section: Icon and Label */}
          <View style={styles.headerInfo}>
            <View style={styles.iconCircle}>
              <Icon name="mail" size={18} color="#64748b" />
            </View>
            <View style={styles.labelContainer}>
              <Text style={styles.emailLabel}>Email account</Text>
              {!status.connected && (
                <Text style={styles.subText}>
                  {!status.termsAcceptedAt
                    ? 'Accept terms first to connect an email.'
                    : 'No email connected yet.'}
                </Text>
              )}
            </View>
          </View>

          {/* Bottom Section: Status and Buttons */}
          <View style={styles.footerActions}>
            {status.connected ? (
              <View style={styles.connectedRow}>
                <View style={styles.badge}>
                  <View style={styles.dot} />
                  <View style={styles.emailTextContainer}>
                    <Text style={styles.connectedLabel}>Connected:</Text>
                    <Text
                      style={styles.emailDisplay}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {status.email}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.disconnectBtn}
                  onPress={handleDisconnect}
                >
                  <Text style={styles.disconnectBtnText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.connectBtn}
                onPress={handleConnectFlow}
                disabled={connecting}
              >
                {connecting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.connectBtnText}>
                    {status.email ? 'Reconnect Gmail' : 'Connect Gmail'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Terms Modal */}
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

                <ScrollView style={styles.termsScroll}>
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
                </ScrollView>

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
    marginVertical: 20,
    paddingHorizontal: 0,
    marginTop: -4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardContent: {
    padding: 16,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  labelContainer: {
    flex: 1,
  },
  emailLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  subText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  footerActions: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    marginTop: 4,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcfce7',
    flex: 1,
    marginRight: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginRight: 8,
    marginTop: 2,
  },
  emailTextContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  connectedLabel: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  emailDisplay: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
    flexShrink: 1,
  },
  disconnectBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disconnectBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  connectBtn: {
    backgroundColor: '#4285F4',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#64748b',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
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
