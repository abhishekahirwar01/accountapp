import React, { useState, useEffect, useRef } from 'react';
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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../../config';
import Toast from '../../components/ui/Toast';

export default function OTPVerificationScreen({ navigation, route }) {
  const {
    method,
    email,
    identifier,
    userName,
    otp: initialOtp,
    role: initialRole,
    fromServer,
  } = route.params || {};

  const [enteredOtp, setEnteredOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const otpInputsRef = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const otpValue = enteredOtp.join('');

  const showToast = (type, text1, text2) => {
    setToast({ visible: true, type, title: text1, message: text2 });
  };

  const getDisplayMessage = () => {
    if (method === 'userId' || method === 'userid') {
      return `We've sent a verification code to the registered email for ${userName || identifier}`;
    } else if (method === 'email') {
      return `We've sent a verification code to ${email || identifier}`;
    }
    return `We've sent a verification code to ${email || identifier}`;
  };

  const handleChange = (value, index) => {
    if (/^\d$/.test(value) || value === '') {
      const updated = [...enteredOtp];
      updated[index] = value;
      setEnteredOtp(updated);
      if (value && index < 5) otpInputsRef.current[index + 1]?.focus();
      if (index === 5 && value) Keyboard.dismiss();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && enteredOtp[index] === '') {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const navigateByRole = roleToUse => {
    if (roleToUse === 'master') navigation.navigate('AdminLoginScreen');
    else if (roleToUse === 'client') navigation.navigate('ClientLoginScreen');
    else navigation.navigate('UserLoginScreen');
  };

  const handleVerify = async () => {
    if (otpValue.length !== 6) {
      showToast('error', 'Incomplete OTP', 'Please enter the complete 6-digit code.');
      return;
    }

    const id = identifier || email || '';

    if (initialRole === 'master' && initialOtp && String(otpValue) === String(initialOtp)) {
      showToast('success', 'OTP Verified', 'Redirecting...');
      setTimeout(() => navigateByRole('master'), 700);
      return;
    }

    setLoadingVerify(true);
    try {
      const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id, otp: otpValue }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast('error', 'Verification Failed', json?.message || `Status ${res.status}`);
        setLoadingVerify(false);
        return;
      }

      const serverRole = json?.user?.role || json?.role || (json.accountType === 'client' ? 'client' : 'user');
      showToast('success', 'OTP Verified', 'Redirecting to your account...');
      setTimeout(() => navigateByRole(serverRole), 700);
    } catch (err) {
      console.error('verify-otp error:', err);
      showToast('error', 'Network Error', 'Could not verify OTP. Try again.');
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    const id = identifier || email || '';
    setLoadingResend(true);
    setTimer(45);
    setEnteredOtp(['', '', '', '', '', '']);
    try {
      const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/api/auth/request-user-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast('error', 'Resend Failed', json?.message || `Status ${res.status}`);
        setLoadingResend(false);
        return;
      }

      if (json?.dev && json?.otp) {
        showToast('info', 'OTP Sent (Dev)', `OTP: ${json.otp}`);
      } else {
        showToast('info', 'OTP Sent', json?.message || 'OTP sent to registered email.');
      }
    } catch (err) {
      console.error('request-user-otp error:', err);
      showToast('error', 'Network Error', 'Could not resend OTP.');
    } finally {
      setLoadingResend(false);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        disabled={loadingVerify}
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
                  <Ionicons name="mail-open" size={32} color="#2563eb" />
                </View>
              </View>
              <Text style={styles.title}>Verify Your Code</Text>
              <Text style={styles.subtitle}>{getDisplayMessage()}</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* OTP Input */}
              <View style={styles.otpContainer}>
                <Text style={styles.label}>Enter 6-Digit Code</Text>
                <View style={styles.otpRow}>
                  {enteredOtp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={el => (otpInputsRef.current[index] = el)}
                      style={[
                        styles.otpBox,
                        digit && styles.otpBoxFilled
                      ]}
                      value={digit}
                      onChangeText={value => handleChange(value, index)}
                      onKeyPress={e => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      placeholder="•"
                      placeholderTextColor="#cbd5e1"
                      textAlign="center"
                      autoFocus={index === 0}
                      editable={!loadingVerify}
                    />
                  ))}
                </View>
              </View>

              {/* Timer & Resend */}
              <View style={styles.timerContainer}>
                <View style={styles.timerRow}>
                  <Ionicons name="time-outline" size={16} color="#64748b" />
                  <Text style={styles.timerText}>
                    {timer > 0 ? `Code expires in ${timer}s` : 'Code expired'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={timer > 0 || loadingResend}
                  style={styles.resendButton}
                >
                  <Text style={[
                    styles.resendText,
                    (timer > 0 || loadingResend) && styles.resendTextDisabled
                  ]}>
                    {loadingResend ? 'Sending...' : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[
                  styles.button,
                  (otpValue.length !== 6 || loadingVerify) && styles.buttonDisabled
                ]}
                onPress={handleVerify}
                disabled={loadingVerify || otpValue.length !== 6}
              >
                <Text style={styles.buttonText}>
                  {loadingVerify ? 'Verifying...' : 'Verify & Continue'}
                </Text>
                {!loadingVerify && (
                  <View style={styles.buttonIcon}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Help Text */}
              <View style={styles.helpContainer}>
                <Ionicons name="help-circle" size={16} color="#64748b" />
                <Text style={styles.helpText}>
                  Didn't receive the code? Check your spam folder or try resending
                </Text>
              </View>
            </View>

            {/* Security Badge */}
            <View style={styles.security}>
              <View style={styles.securityIcon}>
                <Ionicons name="shield-checkmark" size={16} color="#2563eb" />
              </View>
              <Text style={styles.securityText}>End-to-End Encrypted</Text>
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
    marginBottom: 24,
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
    paddingHorizontal: 20,
  },
  
  // Form
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#dbeafe',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },

  // OTP Input
  otpContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
    textAlign: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpBox: {
    width: 44,
    height: 50,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 12,
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: '#f0f7ff',
  },
  otpBoxFilled: {
    borderColor: '#2563eb',
    backgroundColor: '#ffffff',
  },

  // Timer
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
    fontWeight: '500',
  },
  resendButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: '#cbd5e1',
  },
  
  // Button
  button: {
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
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Help
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  helpText: {
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