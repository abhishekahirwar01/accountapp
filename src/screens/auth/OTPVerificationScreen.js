import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

export default function OTPVerificationScreen({ navigation }) {
  const [method, setMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  const USERS = [
    { role: 'master', email: 'master01@gmail.com', mobile: '1111111111', otp: '111111' },
    { role: 'client', email: 'client01@gmail.com', mobile: '2222222222', otp: '222222' },
    { role: 'user', email: 'user01@gmail.com', mobile: '3333333333', otp: '333333' },
  ];

  const isInputEditable = !otpSent || otpTimer <= 0;
  const isToggleDisabled = otpTimer > 0;

  // OTP resend timer and toast update
  useEffect(() => {
    if (!otpSent || otpTimer <= 0) return;

    const interval = setInterval(() => {
      setOtpTimer(prev => {
        const next = prev - 1;
        if (next <= 0) {
          Toast.hide();
          clearInterval(interval);
          return 0;
        }

        setTimeout(() => {
          Toast.show({
            type: 'custom_otp',
            text1: `OTP sent to ${method === 'email' ? email : mobile}`,
            text2: `OTP: ${otp} (Resend in ${next}s)`,
            position: 'top',
            autoHide: false,
          });
        }, 0);

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [otpSent, otpTimer, method, email, mobile, otp]);

  const handleSendOtp = () => {
    setOtp('');
    const identifier = method === 'email' ? email.trim() : mobile.trim();
    const user = USERS.find(u => (method === 'email' ? u.email : u.mobile) === identifier);

    if (user) {
      setOtp(user.otp);
      setOtpSent(true);
      setOtpTimer(30);
    } else {
      setOtpSent(false);
      Toast.show({
        type: 'custom_error',
        text1: 'Error',
        text2: 'No account found with this Email or Mobile.',
        position: 'top',
      });
    }
  };

  const handleVerify = () => {
    const identifier = method === 'email' ? email.trim() : mobile.trim();
    const user = USERS.find(
      u => (method === 'email' ? u.email : u.mobile) === identifier && u.otp === otp,
    );

    if (user) {
      Toast.show({
        type: 'custom_success',
        text1: 'Success!',
        text2: 'OTP Verified! Redirecting...',
        position: 'top',
      });
      setOtpTimer(0);

      setTimeout(() => {
        if (user.role === 'master') navigation.replace('AdminLoginScreen');
        else if (user.role === 'client') navigation.replace('ClientLoginScreen');
        else navigation.replace('UserLoginScreen');
      }, 800);
    } else {
      Toast.show({
        type: 'custom_error',
        text1: 'Error!',
        text2: 'Invalid OTP or user details.',
        position: 'top',
      });
    }
  };

  const switchMethod = newMethod => {
    setMethod(newMethod);
    setOtp('');
    setOtpSent(false);
  };

  return (
    <SafeAreaView style={{ flex: 1}}>
      <LinearGradient
        colors={['#e0e7ff', '#e0e7ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
       

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.header}>OTP Verification</Text>
              <Text style={styles.subHeader}>
                Enter the OTP sent to your{' '}
                {method === 'email' ? 'email' : 'mobile number'}.
              </Text>

              {/* Toggle Buttons */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    method === 'email' && styles.active,
                  ]}
                  onPress={() => switchMethod('email')}
                  disabled={isToggleDisabled}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      method === 'email' && styles.activeText,
                    ]}
                  >
                    Email
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    method === 'mobile' && styles.active,
                  ]}
                  onPress={() => switchMethod('mobile')}
                  disabled={isToggleDisabled}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      method === 'mobile' && styles.activeText,
                    ]}
                  >
                    Mobile
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Email/Mobile Input */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.label}>
                  {method === 'email' ? 'Email Address' : 'Mobile Number'}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    !isInputEditable && styles.disabledInput,
                  ]}
                  placeholder={
                    method === 'email' ? 'name@company.com' : '+1 555 000 0000'
                  }
                  value={method === 'email' ? email : mobile}
                  onChangeText={method === 'email' ? setEmail : setMobile}
                  keyboardType="visible-password"
                  autoCapitalize="none"
                  editable={isInputEditable}
                  placeholderTextColor="#6b7280"
                  importantForAutofill="yes"
                  autoComplete={method === 'email' ? 'email' : 'tel'}
                />
              </View>

              {/* Send OTP Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  ((method === 'email' ? !email.trim() : !mobile.trim()) ||
                    otpTimer > 0) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleSendOtp}
                disabled={
                  (method === 'email' ? !email.trim() : !mobile.trim()) ||
                  otpTimer > 0
                }
              >
                <Text style={styles.primaryButtonText}>
                  {otpSent ? 'Send Again' : 'Send OTP'}
                </Text>
              </TouchableOpacity>

              {/* OTP Input */}
              <View style={{ marginTop: 16 }}>
                <Text style={styles.label}>Enter OTP</Text>
                <View style={styles.otpInputContainer}>
                  <TextInput
                    style={styles.otpInput}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="• • • • • •"
                    keyboardType="visible-password"
                    maxLength={6}
                    placeholderTextColor="#9ca3af"
                    autoComplete="one-time-code"
                    importantForAutofill="yes"
                  />
                </View>
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  otp.length !== 6 && styles.buttonDisabled,
                ]}
                onPress={handleVerify}
                disabled={otp.length !== 6}
              >
                <Text style={styles.primaryButtonText}>Verify & Continue</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Toast Config */}
        <Toast
          config={{
            custom_otp: props => (
              <BaseToast
                {...props}
                style={{
                  borderLeftColor: '#4f46e5',
                  borderRadius: 12,
                  backgroundColor: '#e0e7ff',
                  paddingHorizontal: 16,
                }}
                contentContainerStyle={{ paddingHorizontal: 12 }}
                text1Style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#4338ca',
                }}
                text2Style={{ fontSize: 14, color: '#4338ca' }}
              />
            ),
            custom_success: props => (
              <BaseToast
                {...props}
                style={{
                  borderLeftColor: '#10b981',
                  borderRadius: 12,
                  backgroundColor: '#ecfdf5',
                  paddingHorizontal: 16,
                }}
                contentContainerStyle={{ paddingHorizontal: 12 }}
                text1Style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#065f46',
                }}
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
                  paddingHorizontal: 16,
                }}
                contentContainerStyle={{ paddingHorizontal: 12 }}
                text1Style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#b91c1c',
                }}
                text2Style={{ fontSize: 14, color: '#b91c1c' }}
              />
            ),
          }}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 15,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#111827',
  },
  subHeader: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 20,
  },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 4,
    backgroundColor: 'rgba(243,244,246,0.9)',
    alignItems: 'center',
  },
  active: { backgroundColor: '#4f46e5' },
  toggleText: { color: '#374151', fontWeight: '500' },
  activeText: { color: '#fff' },
  input: {
    backgroundColor: 'rgba(243,244,246,0.9)',
    borderRadius: 10,
    padding: 14,
    color: '#111827',
    fontSize: 16,
  },
  disabledInput: { backgroundColor: 'rgba(243,244,246,0.6)', color: '#9ca3af' },
  otpInputContainer: { flexDirection: 'row', alignItems: 'center' },
  otpInput: {
    backgroundColor: 'rgba(243,244,246,0.9)',
    borderRadius: 12,
    padding: 16,
    fontSize: 22,
    letterSpacing: 12,
    textAlign: 'center',
    color: '#111827',
    fontWeight: '700',
    flex: 1,
  },
  label: { fontSize: 14, color: '#111827', marginBottom: 6 },
  primaryButton: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  buttonDisabled: { backgroundColor: 'rgba(79,70,229,0.6)' },
});
