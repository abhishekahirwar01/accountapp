import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  StyleSheet,
  Modal
} from 'react-native';
import {
  Loader2,
  Mail,
  ShieldCheck,
  CheckCircle2,
  ChevronRight
} from 'lucide-react-native';

// Mock data for email status
const MOCK_EMAIL_STATUS = {
  connected: false,
  email: null,
  termsAcceptedAt: null,
  reason: null,
  lastFailureAt: null
};

export default function EmailSendingConsent() {
  const [status, setStatus] = React.useState(MOCK_EMAIL_STATUS);
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [agreeChecked, setAgreeChecked] = React.useState(false);
  const [savingAgree, setSavingAgree] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [reconnectNotice, setReconnectNotice] = React.useState(false);

  // Simulate initial loading
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleAgree = async () => {
    if (!agreeChecked) return;
    setSavingAgree(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStatus(prev => ({
        ...prev,
        termsAcceptedAt: new Date().toISOString()
      }));
      setDialogOpen(false);
      Alert.alert(
        'Thank you!',
        'Terms accepted. You can now connect an email account.'
      );
    } catch (error) {
      Alert.alert(
        'Could not save',
        'Something went wrong. Please try again.'
      );
    } finally {
      setSavingAgree(false);
    }
  };

  const handleConnect = async () => {
    if (!status.termsAcceptedAt) {
      setDialogOpen(true);
      return;
    }

    setConnecting(true);
    try {
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful connection
      setStatus(prev => ({
        ...prev,
        connected: true,
        email: 'user@example.com',
        reason: null
      }));
      setReconnectNotice(false);
      
      Alert.alert(
        'Gmail Connected',
        `Connected as user@example.com`
      );
    } catch (error) {
      Alert.alert(
        'Connection Failed',
        'Failed to connect Gmail. Please try again.'
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Gmail',
      'Are you sure you want to disconnect your Gmail account?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setStatus(prev => ({
              ...prev,
              connected: false,
              email: null,
              reason: 'revoked'
            }));
            setReconnectNotice(true);
            Alert.alert(
              'Gmail Disconnected',
              'Your Gmail account has been disconnected.'
            );
          }
        }
      ]
    );
  };

  const hasAccepted = Boolean(status.termsAcceptedAt);
  const needsReconnect = reconnectNotice || 
    (hasAccepted && !!status.email && !status.connected) ||
    (hasAccepted && status.reason === 'token_expired');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader2 size={16} color="#666" style={styles.spinner} />
        <Text style={styles.loadingText}>Checking email-sending status…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!hasAccepted && (
        <View style={styles.alert}>
          <ShieldCheck size={16} color="#3b82f6" />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Email invoicing is enabled for your account</Text>
            <Text style={styles.alertDescription}>
              Your administrator has granted you permission to send invoices via email.
              Please review and accept the terms to activate this feature.
            </Text>
            <TouchableOpacity 
              style={styles.alertButton}
              onPress={() => setDialogOpen(true)}
            >
              <Text style={styles.alertButtonText}>Read & Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {needsReconnect && (
        <View style={[styles.alert, styles.warningAlert]}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Gmail disconnected — action required</Text>
            <Text style={styles.alertDescription}>
              {status.reason === 'token_expired'
                ? 'Your Gmail session has expired. Please reconnect to continue emailing invoices.'
                : 'To email invoices, please reconnect your Gmail account.'}
            </Text>
            <TouchableOpacity 
              style={styles.alertButton}
              onPress={handleConnect}
            >
              <Mail size={16} color="#fff" />
              <Text style={styles.alertButtonText}>
                {status.email ? 'Reconnect Gmail' : 'Connect Gmail'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.cardInfo}>
              <Mail size={20} color="#666" />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Email account</Text>
                {status.connected && status.email ? (
                  <Text style={styles.cardSubtitle}>Connected: {status.email}</Text>
                ) : (
                  <Text style={styles.cardSubtitle}>
                    {hasAccepted
                      ? 'No email connected yet.'
                      : 'Accept terms first to connect an email.'}
                  </Text>
                )}
              </View>
            </View>
            
            {status.connected ? (
              <View style={styles.connectedBadge}>
                <CheckCircle2 size={16} color="#10b981" />
                <Text style={styles.connectedText}>Connected</Text>
                <TouchableOpacity onPress={handleDisconnect}>
                  <Text style={styles.disconnectText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[
                  styles.connectButton,
                  (!hasAccepted || connecting) && styles.buttonDisabled
                ]}
                onPress={handleConnect}
                disabled={!hasAccepted || connecting}
              >
                {connecting && <Loader2 size={16} color="#fff" style={styles.spinner} />}
                <Text style={styles.connectButtonText}>
                  {status.email ? 'Reconnect Gmail' : 'Connect Gmail'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Terms Modal */}
      <Modal
        visible={dialogOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDialogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms for sending invoices via email</Text>
            </View>
            
            <ScrollView style={styles.termsContent}>
              <View style={styles.termsSection}>
                <Text style={styles.termsText}>
                  <Text style={styles.termsBold}>1. Scope.</Text> You authorize this app to send invoice emails on your behalf.
                </Text>
              </View>
              
              <View style={styles.termsSection}>
                <Text style={styles.termsText}>
                  <Text style={styles.termsBold}>2. Data usage.</Text> Email metadata (recipient, subject) and invoice PDFs may be
                  processed to deliver messages.
                </Text>
              </View>
              
              <View style={styles.termsSection}>
                <Text style={styles.termsText}>
                  <Text style={styles.termsBold}>3. Gmail access.</Text> We request the Gmail scope gmail.send solely
                  to send messages; we do not read your inbox.
                </Text>
              </View>
              
              <View style={styles.termsSection}>
                <Text style={styles.termsText}>
                  <Text style={styles.termsBold}>4. Compliance.</Text> You agree to comply with anti-spam and email content policies.
                  Do not send unsolicited emails.
                </Text>
              </View>
              
              <View style={styles.termsSection}>
                <Text style={styles.termsText}>
                  <Text style={styles.termsBold}>5. Revocation.</Text> You can disconnect your email anytime from this screen.
                </Text>
              </View>
              
              <View style={styles.termsSection}>
                <Text style={styles.termsText}>
                  <Text style={styles.termsBold}>6. Liability.</Text> Use at your own risk; the service is provided "as is".
                </Text>
              </View>
            </ScrollView>

            <View style={styles.agreeSection}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => setAgreeChecked(!agreeChecked)}
              >
                <View style={[
                  styles.checkboxBox,
                  agreeChecked && styles.checkboxChecked
                ]}>
                  {agreeChecked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  I have read and agree to the terms above.
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setDialogOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.agreeButton,
                  (!agreeChecked || savingAgree) && styles.buttonDisabled
                ]}
                onPress={handleAgree}
                disabled={!agreeChecked || savingAgree}
              >
                {savingAgree && <Loader2 size={16} color="#fff" style={styles.spinner} />}
                <Text style={styles.agreeButtonText}>Agree & Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
    padding: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  spinner: {
    animationKeyframes: {
      '0%': { transform: [{ rotate: '0deg' }] },
      '100%': { transform: [{ rotate: '360deg' }] },
    },
    animationDuration: '1s',
    animationIterationCount: 'infinite',
  },
  alert: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  warningAlert: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  alertContent: {
    flex: 1,
    gap: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  alertDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 8,
    alignSelf: 'flex-start',
  },
  alertButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  connectedText: {
    fontSize: 14,
    color: '#065f46',
    fontWeight: '500',
  },
  disconnectText: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 8,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  termsContent: {
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
  },
  termsSection: {
    marginBottom: 12,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  termsBold: {
    fontWeight: '600',
  },
  agreeSection: {
    marginBottom: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  agreeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
  },
  agreeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});