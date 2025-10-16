import React, { useState, useEffect, useRef } from 'react'; // 💡 Added 'useRef'
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

  // 💡 NEW: Create an array of refs for each TextInput
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

  // Join digits into one string for verification
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
  const handleKeyPress = (
    e,
    index,
  ) => {
    // Check if the pressed key is 'Backspace'
    // Also, check if the current input is empty, which means the user wants to delete the previous digit.
    if (e.nativeEvent.key === 'Backspace') {
      if (index > 0) {
        // If current box is empty, move to the previous box
        if (enteredOtp[index] === '') {
          otpInputsRef.current[index - 1]?.focus();
        } 
        // If current box has a digit, the handleChange function will clear it.
        // We don't need explicit backspace logic here for moving focus because 
        // the default TextInput behavior handles clearing the digit, and the 
        // empty check above handles moving to the previous box when already empty.
      }
    }
  };

  const handleVerify = () => {
    if (otpValue === otp) {
      Toast.show({
        type: 'custom_success',
        text1: 'Success!',
        text2: 'OTP Verified! Redirecting...',
        position: 'top',
      });

      setTimeout(() => {
        if (role === 'master') navigation.navigate('AdminLoginScreen');
        else if (role === 'client') navigation.navigate('ClientLoginScreen');
        else navigation.navigate('UserLoginScreen');
      }, 800);
    } else {
      Toast.show({
        type: 'custom_error',
        text1: 'Error!',
        text2: 'Invalid OTP.',
        position: 'top',
      });
    }
  };

  const handleResendOtp = () => {
    if (timer === 0) {
      setTimer(30);
      setEnteredOtp(['', '', '', '', '', '']);
      // 🚨 TODO: Implement the actual API call to resend OTP and update the 'otp' param in route.params
      Toast.show({
        type: 'info',
        text1: 'Resend',
        text2: `New OTP sent to ${method === 'email' ? 'your email' : 'your mobile'}.`,
        position: 'top',
      });
      // 💡 Auto-focus the first input after resend
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.flatScreen}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.container}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#111827" />
              </TouchableOpacity>

              <View style={styles.contentArea}>
                <Text style={styles.header}>Verify your OTP</Text>
                <Text style={styles.subHeader}>
                  Enter the 6-digit code sent to {method === 'email' ? email : mobile}.
                </Text>

                {/* OTP Input Boxes */}
                <View style={styles.otpRow}>
                  {enteredOtp.map((digit, index) => (
                    <TextInput
                      key={index}
                      // 💡 UPDATED: Set ref using the useRef array
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
                    {timer > 0 ? `Resend in ${timer}s` : 'Did not receive code?'}
                  </Text>
                  <TouchableOpacity onPress={handleResendOtp} disabled={timer > 0}>
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
                  <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        {/* Toast Config */}
        <Toast
          config={{
            custom_success: props => (
              <BaseToast
                {...props}
                style={{
                  borderLeftColor: '#10b981',
                  borderRadius: 12,
                  backgroundColor: '#ecfdf5',
                }}
                text1Style={{ fontSize: 16, fontWeight: '700', color: '#065f46' }}
                text2Style={{ fontSize: 14, color: '#065f46' }}
              />
            ),
            custom_error: props => (
              <ErrorToast
                {...props}
                style={{
                  borderLeftColor: '#ef4444',
                  borderRadius: 12,
                  backgroundColor: '#fee2e2',
                }}
                text1Style={{ fontSize: 16, fontWeight: '700', color: '#b91c1c' }}
                text2Style={{ fontSize: 14, color: '#b91c1c' }}
              />
            ),
            info: props => (
              <BaseToast
                {...props}
                style={{
                  borderLeftColor: '#2563eb',
                  borderRadius: 12,
                  backgroundColor: '#eff6ff',
                }}
                text1Style={{ fontSize: 16, fontWeight: '700', color: '#1e40af' }}
                text2Style={{ fontSize: 14, color: '#1e40af' }}
              />
            ),
          }}
        />
      </View>
    </SafeAreaView>
  );
}

// Styles (Unchanged)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  flatScreen: { flex: 1, backgroundColor: '#ffffff' },
  container: {
    flexGrow: 1,
    alignItems: 'flex-start',
    padding: 24,
  },
  contentArea: {
    width: '100%',
    marginTop: 100,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 0 : 16,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  timerText: { color: '#6b7280', fontSize: 14 },
  resendButtonText: { color: '#4f46e5', fontWeight: '600', fontSize: 14 },
  resendButtonDisabled: { color: '#9ca3af' },
  primaryButton: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 12,
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  buttonDisabled: { backgroundColor: '#a5b4fc', elevation: 0 },
});