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
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function OTPVerificationScreen({ navigation, route }) {
  const { method, email, mobile, otp, role } = route.params;
  const [enteredOtp, setEnteredOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);

  const otpInputsRef = useRef([]);

  // Timer countdown
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

  // 1. Auto focus next box on digit entry
  const handleChange = (value, index) => {
    // Only allow single digit or empty string
    if (/^\d$/.test(value) || value === '') {
      const updatedOtp = [...enteredOtp];
      updatedOtp[index] = value;
      setEnteredOtp(updatedOtp);

      // Auto focus next box if a digit is entered and it's not the last box
      if (value && index < 5) {
        otpInputsRef.current[index + 1]?.focus();
      }

      // If the last digit is entered, dismiss keyboard
      if (index === 5 && value) {
        Keyboard.dismiss();
      }
    }
  };

  // 2. Auto focus previous box on Backspace
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (index > 0) {
        if (enteredOtp[index] === '') {
          otpInputsRef.current[index - 1]?.focus();
        }
      }
    }
  };

  const handleVerify = () => {
    if (otpValue === otp) {
      Toast.show({
        type: 'custom_success',
        text1: 'OTP Verified Successfully!',
        text2: 'Redirecting to your account...',
        position: 'top',
        visibilityTime: 2000,
      });

      setTimeout(() => {
        if (role === 'master') navigation.navigate('AdminLoginScreen');
        else if (role === 'client') navigation.navigate('ClientLoginScreen');
        else navigation.navigate('UserLoginScreen');
      }, 800);
    } else {
      Toast.show({
        type: 'custom_error',
        text1: 'Invalid OTP',
        text2: 'Please check the code and try again.',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const handleResendOtp = () => {
    if (timer === 0) {
      setTimer(30);
      setEnteredOtp(['', '', '', '', '', '']);
      Toast.show({
        type: 'info',
        text1: 'OTP Sent Successfully!',
        text2: `New verification code sent to your ${
          method === 'email' ? 'email' : 'mobile'
        }.`,
        position: 'top',
        visibilityTime: 2500,
      });
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    }
  };

  // Custom Toast Configuration
  const toastConfig = {
    custom_success: props => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: '#22C55E',
          borderRadius: 12,
          backgroundColor: '#F0FDF4',
          height: 70,
          borderWidth: 1,
          borderColor: '#22C55E20',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{
          fontSize: 15,
          fontWeight: '700',
          color: '#15803D',
        }}
        text2Style={{
          fontSize: 13,
          color: '#15803D',
          lineHeight: 18,
        }}
        renderLeadingIcon={() => (
          <Ionicons
            name="checkmark-circle"
            size={26}
            color="#22C55E"
            style={{ marginLeft: 15, marginRight: 12, alignSelf: 'center' }}
          />
        )}
      />
    ),

    custom_error: props => (
      <ErrorToast
        {...props}
        style={{
          borderLeftColor: '#EF4444',
          borderRadius: 12,
          backgroundColor: '#FEF2F2',
          height: 70,
          borderWidth: 1,
          borderColor: '#EF444420',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{
          fontSize: 15,
          fontWeight: '700',
          color: '#B91C1C',
        }}
        text2Style={{
          fontSize: 13,
          color: '#B91C1C',
          lineHeight: 18,
        }}
        renderLeadingIcon={() => (
          <Ionicons
            name="close-circle"
            size={26}
            color="#EF4444"
            style={{ marginLeft: 15, marginRight: 12, alignSelf: 'center' }}
          />
        )}
      />
    ),

    info: props => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: '#3B82F6',
          borderRadius: 12,
          backgroundColor: '#EFF6FF',
          height: 70,
          borderWidth: 1,
          borderColor: '#3B82F620',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{
          fontSize: 15,
          fontWeight: '700',
          color: '#1D4ED8',
        }}
        text2Style={{
          fontSize: 13,
          color: '#1D4ED8',
          lineHeight: 18,
        }}
        renderLeadingIcon={() => (
          <Ionicons
            name="information-circle"
            size={26}
            color="#3B82F6"
            style={{ marginLeft: 15, marginRight: 12, alignSelf: 'center' }}
          />
        )}
      />
    ),
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
              {/* Header: Back Button and Title in one line */}
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
                <Text style={styles.subHeader}>
                  Enter the 6-digit code sent to{' '}
                  {method === 'email' ? email : mobile}.
                </Text>

                {/* OTP Input Boxes */}
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

                {/* Timer & Resend */}
                <View style={styles.timerRow}>
                  <Text style={styles.timerText}>
                    {timer > 0
                      ? `Resend in ${timer}s`
                      : 'Did not receive code?'}
                  </Text>
                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={timer > 0}
                  >
                    <Text
                      style={[
                        styles.resendButtonText,
                        timer > 0 && styles.resendButtonDisabled,
                      ]}
                    >
                      Resend
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    otpValue.length !== 6 && styles.buttonDisabled,
                  ]}
                  onPress={handleVerify}
                  disabled={otpValue.length !== 6}
                >
                  <Text style={styles.primaryButtonText}>
                    Verify & Continue
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        {/* Toast Config */}
        <Toast
          config={toastConfig}
          topOffset={Platform.OS === 'ios' ? 60 : 40}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  flatScreen: { flex: 1, backgroundColor: '#ffffff' },

  // --- Header Styles ---
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
  placeholder: {
    width: 32,
  },

  // --- Container & Content ---
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  contentArea: {
    width: '100%',
    paddingTop: 24,
  },

  // --- Typography ---
  subHeader: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 30,
    lineHeight: 20,
    textAlign: 'left',
  },

  // --- OTP Boxes ---
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

  // --- Timer & Resend ---
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  timerText: { color: '#6b7280', fontSize: 13 },
  resendButtonText: { color: '#4f46e5', fontWeight: '600', fontSize: 13 },
  resendButtonDisabled: { color: '#9ca3af' },

  // --- Button Styles ---
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
  buttonDisabled: {
    backgroundColor: '#a5b4fc',
    elevation: 0,
    opacity: 0.8,
  },
});
