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
  Animated, // Animated API for Custom Toast
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

// --- 1. Custom Toast Component (Kudsi Custom Toast) ---
const DURATION = 3000; // Toast visibility time

const ToastComponent = ({ isVisible, type, text1, text2, onHide }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Show animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Auto hide after DURATION
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            onHide();
          });
        }, DURATION - 300); // Wait for DURATION, then start hide animation
      });
    }
  }, [isVisible, fadeAnim, onHide]);

  if (!isVisible) return null;

  // Define styles based on toast type
  let color, bgColor, borderColor, iconName;
  if (type === 'success') {
    color = '#15803D'; // Green
    bgColor = '#F0FDF4';
    borderColor = '#22C55E';
    iconName = 'checkmark-circle';
  } else if (type === 'error') {
    color = '#B91C1C'; // Red
    bgColor = '#FEF2F2';
    borderColor = '#EF4444';
    iconName = 'close-circle';
  } else if (type === 'info') {
    color = '#1D4ED8'; // Blue
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
          opacity: fadeAnim, // Bind opacity to animated value
          backgroundColor: bgColor,
          borderLeftColor: borderColor,
        },
        // Position at the top, adjusted for StatusBar/SafeArea
        { top: Platform.OS === 'ios' ? 60 : 40 },
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
// --- End of Custom Toast Component ---

export default function OTPVerificationScreen({ navigation, route }) {
  const { method, email, mobile, otp, role } = route.params;
  const [enteredOtp, setEnteredOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);

  // Custom Toast State
  const [toastVisible, setToastVisible] = useState(false);
  const [toastData, setToastData] = useState({
    type: 'info',
    text1: '',
    text2: '',
  });

  const otpInputsRef = useRef([]);

  // Function to show custom toast
  const showToast = (type, text1, text2) => {
    setToastData({ type, text1, text2 });
    setToastVisible(true);
  };

  // Function to hide custom toast
  const hideToast = () => {
    setToastVisible(false);
  };

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

  // --- Verification and Error Handling (Updated to use custom Toast) ---
  const handleVerify = () => {
    // Basic validation
    if (otpValue.length !== 6) {
      showToast(
        'error',
        'Incomplete OTP',
        'Please enter the complete 6-digit code.',
      );
      return;
    }

    // OTP verification logic (client-side simple comparison for demo)
    if (otpValue === otp) {
      showToast(
        'success',
        'OTP Verified Successfully!',
        'Redirecting to your account...',
      );

      setTimeout(() => {
        if (role === 'master') navigation.navigate('AdminLoginScreen');
        else if (role === 'client') navigation.navigate('ClientLoginScreen');
        else navigation.navigate('UserLoginScreen');
      }, 800);
    } else {
      // Error Handling: Invalid OTP
      showToast('error', 'Invalid OTP', 'Please check the code and try again.');
    }
  };

  const handleResendOtp = () => {
    if (timer === 0) {
      // In a real application, you would make an API call here to resend the OTP
      // For this demo, we just reset the timer and show a success message.

      setTimer(30);
      setEnteredOtp(['', '', '', '', '', '']); // Clear the previous OTP
      showToast(
        'info',
        'OTP Sent Successfully!',
        `New verification code sent to your ${
          method === 'email' ? 'email' : 'mobile'
        }.`,
      );
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    }
  };
  // --- End of Verification and Error Handling ---

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

        {/* Custom Toast Integration */}
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

  // --- Custom Toast Styles ---
  customToast: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    height: 70,
    borderRadius: 12,
    borderLeftWidth: 5, // For color indication
    borderWidth: 1,
    borderColor: '#22C55E20', // General border (optional)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  customToastContent: {
    flex: 1,
    paddingHorizontal: 15,
  },
  customToastText1: {
    fontSize: 15,
    fontWeight: '700',
  },
  customToastText2: {
    fontSize: 13,
    lineHeight: 18,
  },
});
