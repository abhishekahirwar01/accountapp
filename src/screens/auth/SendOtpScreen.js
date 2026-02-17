import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from '../../components/ui/Toast';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../../config';

export default function SendOtpScreen({ navigation }) {
  const [method, setMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const USERS = [
    { role: 'master', email: 'master01@gmail.com', userId: 'master01', otp: '111111' },
    { role: 'client', email: 'client01@gmail.com', userId: 'client01', otp: '222222' },
    { role: 'user', email: 'user01@gmail.com', userId: 'user01', otp: '333333' },
  ];


  const isMasterIdentifier = identifier => {
    const normalized = String(identifier).trim().toLowerCase();
    return normalized === 'master01@gmail.com' || normalized === 'master01';
  };

  const handleSendOtp = async () => {
    const identifier = method === 'email' ? email.trim() : userId.trim();

    if (!identifier) {
      setToast({
        visible: true,
        type: 'error',
        title: 'Validation Error',
        message: `Please enter your ${method === 'email' ? 'Email' : 'User ID'}.`,
      });
      return;
    }

    if (isMasterIdentifier(identifier)) {
      const master = USERS.find(u => u.role === 'master');
      navigation.navigate('OTPVerificationScreen', {
        method,
        identifier,
        email: master.email,
        otp: master.otp,
        role: 'master',
        fromServer: false,
      });
      setToast({
        visible: true,
        type: 'success',
        title: 'OTP Sent (Dev)',
        message: `Master OTP is ${master.otp}. Redirecting to verification screen.`,
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/api/auth/request-user-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      const json = await res.json();

      if (!res.ok) {
        setToast({
          visible: true,
          type: 'error',
          title: 'Failed to send OTP',
          message: json?.message || `Request failed (${res.status})`,
        });
        setLoading(false);
        return;
      }

      navigation.navigate('OTPVerificationScreen', {
        method,
        identifier,
        email: json?.email || '',
        userName: json?.userName || json?.clientUsername || identifier,
        otp: json?.otp || null,
        role: undefined,
        fromServer: true,
      });

      setToast({
        visible: true,
        type: 'success',
        title: 'OTP Sent',
        message: json?.message || 'OTP sent to registered email.',
      });
    } catch (err) {
      console.error('request-user-otp error:', err);
      setToast({
        visible: true,
        type: 'error',
        title: 'Network Error',
        message: 'Could not reach server. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const currentValue = method === 'email' ? email : userId;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <View style={styles.backButtonCircle}>
          <Ionicons name="arrow-back" size={22} color="#2563eb" />
        </View>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoOuter}>
                <View style={styles.logoInner}>
                  <Ionicons name="shield-checkmark" size={32} color="#2563eb" />
                </View>
              </View>
              <Text style={styles.title}>OTP Verification</Text>
              <Text style={styles.subtitle}>
                Choose a method to receive your secure code
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Toggle */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggle, method === 'email' && styles.toggleActive]}
                  onPress={() => {
                    setMethod('email');
                    Keyboard.dismiss();
                  }}
                  disabled={loading}
                >
                  <View style={styles.toggleContent}>
                    <View style={[styles.toggleIcon, method === 'email' && styles.toggleIconActive]}>
                      <Ionicons name="mail" size={18} color={method === 'email' ? '#fff' : '#2563eb'} />
                    </View>
                    <Text style={[styles.toggleText, method === 'email' && styles.toggleTextActive]}>
                      Email
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggle, method === 'userId' && styles.toggleActive]}
                  onPress={() => {
                    setMethod('userId');
                    Keyboard.dismiss();
                  }}
                  disabled={loading}
                >
                  <View style={styles.toggleContent}>
                    <View style={[styles.toggleIcon, method === 'userId' && styles.toggleIconActive]}>
                      <Ionicons name="person" size={18} color={method === 'userId' ? '#fff' : '#2563eb'} />
                    </View>
                    <Text style={[styles.toggleText, method === 'userId' && styles.toggleTextActive]}>
                      User ID
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {method === 'email' ? 'Email Address' : 'User ID'}
                </Text>
                <View style={[styles.inputWrapper, inputFocused && styles.inputFocused]}>
                  <Ionicons
                    name={method === 'email' ? 'mail-outline' : 'person-outline'}
                    size={20}
                    color={inputFocused ? '#2563eb' : '#94a3b8'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={currentValue}
                    onChangeText={method === 'email' ? setEmail : setUserId}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    editable={!loading}
                    placeholder={method === 'email' ? 'name@company.com' : 'Enter your user id'}
                    placeholderTextColor="#cbd5e1"
                    keyboardType={method === 'email' ? 'email-address' : 'default'}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Button */}
              <TouchableOpacity
                style={[styles.button, (!currentValue.trim() || loading) && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={loading || !currentValue.trim()}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </Text>
                {!loading && (
                  <View style={styles.buttonIcon}>
                    <Ionicons name="send" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Info */}
              <View style={styles.info}>
                <Ionicons name="information-circle" size={16} color="#64748b" />
                <Text style={styles.infoText}>
                  A verification code will be sent to your {method === 'email' ? 'registered email' : 'registered contact'}
                </Text>
              </View>
            </View>

            {/* Security Badge */}
            <View style={styles.security}>
              <View style={styles.securityIcon}>
                <Ionicons name="lock-closed" size={16} color="#2563eb" />
              </View>
              <Text style={styles.securityText}>Encrypted & Secure</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {toast.visible && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast({ ...toast, visible: false })}
        />
      )}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#f0f7ff',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 12,
    zIndex: 10,
  },
  backButtonCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  content: { 
    width: '100%', 
    maxWidth: 420, 
    alignSelf: 'center',
  },
  
  // Header
  header: { 
    alignItems: 'center', 
    marginBottom: 25,
  },
  logoOuter: {
    width: 72,
    height: 72,
    borderRadius: 44,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 18,
  },
  logoInner: {
    width: 60,
    height: 60,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  title: { 
    fontSize: 22,
    fontWeight: '700', 
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Form
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 20,
  },
  toggle: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  toggleIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  toggleTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Input
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#dbeafe',
    paddingHorizontal: 14,
    // height: 54,
  },
  inputFocused: {
    backgroundColor: '#ffffff',
    borderColor: '#2563eb',
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  
  // Button
  button: {
    // marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { 
    opacity: 0.6,
    shadowOpacity: 0.15,
  },
  buttonText: { 
    color: '#ffffff', 
    fontSize: 14, 
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonIcon: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 20,
    height: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Info
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    marginLeft: 8,
  },
  
  // Security
  security: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  securityIcon: {
    marginRight: 8,
    backgroundColor: '#dbeafe',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
});