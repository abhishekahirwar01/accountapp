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
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
// import { BASE_URL } from '../../config';
const BASE_URL = 'https://accountapp-backend-ooxj.vercel.app';

const DURATION = 3000;

const ToastComponent = ({ isVisible, type, text1, text2, onHide }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(onHide);
        }, DURATION - 300);
      });
    }
  }, [isVisible, fadeAnim, onHide]);

  if (!isVisible) return null;

  let color, bgColor, borderColor, iconName;
  if (type === 'success') {
    color = '#15803D';
    bgColor = '#F0FDF4';
    borderColor = '#22C55E';
    iconName = 'checkmark-circle';
  } else if (type === 'error') {
    color = '#B91C1C';
    bgColor = '#FEF2F2';
    borderColor = '#EF4444';
    iconName = 'close-circle';
  } else if (type === 'info') {
    color = '#1D4ED8';
    bgColor = '#EFF6FF';
    borderColor = '#3B82F6';
    iconName = 'information-circle';
  } else {
    color = '#1F2937';
    bgColor = '#FFFFFF';
    borderColor = '#E5E7EB';
    iconName = 'alert-circle';
  }

  return (
    <Animated.View
      style={[
        styles.customToast,
        {
          opacity: fadeAnim,
          backgroundColor: bgColor,
          borderLeftColor: borderColor,
          top: Platform.OS === 'ios' ? 60 : 40,
        },
      ]}
    >
      <Ionicons
        name={iconName}
        size={26}
        color={borderColor}
        style={{ marginLeft: 15, marginRight: 12, alignSelf: 'center' }}
      />
      <View style={styles.customToastContent}>
        <Text style={[styles.customToastText1, { color }]}>{text1}</Text>
        <Text style={[styles.customToastText2, { color }]}>{text2}</Text>
      </View>
    </Animated.View>
  );
};

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

  const [toastVisible, setToastVisible] = useState(false);
  const [toastData, setToastData] = useState({
    type: 'info',
    text1: '',
    text2: '',
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
    setToastData({ type, text1, text2 });
    setToastVisible(true);
  };
  const hideToast = () => setToastVisible(false);

  // Build the message based on method
  const getDisplayMessage = () => {
    if (method === 'userId' || method === 'userid') {
      return `Enter 6-digit code sent to registered email for ${
        userName || identifier
      }`;
    } else if (method === 'email') {
      return `Enter 6-digit code sent to ${email || identifier}`;
    }
    return `Enter the 6-digit code sent to ${email || identifier}`;
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
    if (
      e.nativeEvent.key === 'Backspace' &&
      index > 0 &&
      enteredOtp[index] === ''
    ) {
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
      showToast(
        'error',
        'Incomplete OTP',
        'Please enter the complete 6-digit code.',
      );
      return;
    }

    const id = identifier || email || '';

    // Master path
    if (
      initialRole === 'master' &&
      initialOtp &&
      String(otpValue) === String(initialOtp)
    ) {
      showToast('success', 'OTP Verified', 'Redirecting...');
      setTimeout(() => navigateByRole('master'), 700);
      return;
    }

    // Server verification path
    setLoadingVerify(true);
    try {
      const res = await fetch(
        `${BASE_URL.replace(/\/$/, '')}/api/auth/verify-otp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: id, otp: otpValue }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        showToast(
          'error',
          'Verification Failed',
          json?.message || `Status ${res.status}`,
        );
        setLoadingVerify(false);
        return;
      }

      const serverRole =
        json?.user?.role ||
        json?.role ||
        (json.accountType === 'client' ? 'client' : 'user');
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
    setTimer(30);
    setEnteredOtp(['', '', '', '', '', '']);
    try {
      const res = await fetch(
        `${BASE_URL.replace(/\/$/, '')}/api/auth/request-user-otp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: id }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        showToast(
          'error',
          'Resend Failed',
          json?.message || `Status ${res.status}`,
        );
        setLoadingResend(false);
        return;
      }

      if (json?.dev && json?.otp) {
        showToast('info', 'OTP Sent (Dev)', `OTP: ${json.otp}`);
      } else {
        showToast(
          'info',
          'OTP Sent',
          json?.message || 'OTP sent to registered email.',
        );
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
      <View style={styles.flatScreen}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 10}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.container}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.headerContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={20} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.header}>Verify your OTP</Text>
                <View style={styles.placeholder} />
              </View>

              <View style={styles.contentArea}>
                <Text style={styles.subHeader}>{getDisplayMessage()}</Text>

                <View style={styles.otpRow}>
                  {enteredOtp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={el => (otpInputsRef.current[index] = el)}
                      style={styles.otpBox}
                      value={digit}
                      onChangeText={value => handleChange(value, index)}
                      onKeyPress={e => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      placeholder="•"
                      placeholderTextColor="#9ca3af"
                      textAlign="center"
                      autoFocus={index === 0}
                    />
                  ))}
                </View>

                <View style={styles.timerRow}>
                  <Text style={styles.timerText}>
                    {timer > 0
                      ? `Resend in ${timer}s`
                      : 'Did not receive code?'}
                  </Text>
                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={timer > 0 || loadingResend}
                  >
                    <Text
                      style={[
                        styles.resendButtonText,
                        (timer > 0 || loadingResend) &&
                          styles.resendButtonDisabled,
                      ]}
                    >
                      {loadingResend ? 'Sending...' : 'Resend'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    otpValue.length !== 6 && styles.buttonDisabled,
                  ]}
                  onPress={handleVerify}
                  disabled={loadingVerify || otpValue.length !== 6}
                >
                  <Text style={styles.primaryButtonText}>
                    {loadingVerify ? 'Verifying...' : 'Verify & Continue'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        <ToastComponent
          isVisible={toastVisible}
          type={toastData.type}
          text1={toastData.text1}
          text2={toastData.text2}
          onHide={hideToast}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  flatScreen: { flex: 1, backgroundColor: '#ffffff' },

  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  placeholder: { width: 32 },

  container: { flexGrow: 1, paddingHorizontal: 20 },
  contentArea: { width: '100%', paddingTop: 24 },

  subHeader: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 30,
    lineHeight: 20,
    textAlign: 'left',
  },

  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  otpBox: {
    width: 42,
    height: 50,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#f9fafb',
  },

  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  timerText: { color: '#6b7280', fontSize: 13 },
  resendButtonText: { color: '#4f46e5', fontWeight: '600', fontSize: 13 },
  resendButtonDisabled: { color: '#9ca3af' },

  primaryButton: {
    backgroundColor: '#4f46e5',
    padding: 14,
    borderRadius: 10,
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  buttonDisabled: { backgroundColor: '#a5b4fc', elevation: 0, opacity: 0.8 },

  customToast: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    height: 70,
    borderRadius: 12,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: '#22C55E20',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  customToastContent: { flex: 1, paddingHorizontal: 15 },
  customToastText1: { fontSize: 15, fontWeight: '700' },
  customToastText2: { fontSize: 13, lineHeight: 18 },
});
