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
import LinearGradient from 'react-native-linear-gradient';

export default function OTPVerificationScreen({ navigation }) {
  const [method, setMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const USERS = [
    { role: 'master', email: 'master01@gmail.com', mobile: '1111111111', otp: '111111' },
    { role: 'client', email: 'client01@gmail.com', mobile: '2222222222', otp: '222222' },
    { role: 'user', email: 'user01@gmail.com', mobile: '3333333333', otp: '333333' },
  ];

  useEffect(() => {
    if (resendIn <= 0) return;
    const interval = setInterval(() => setResendIn(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [resendIn]);

  const handleSendOtp = () => {
    const identifier = method === 'email' ? email.trim() : mobile.trim();
    const user = USERS.find(
      u => (method === 'email' ? u.email : u.mobile) === identifier
    );

    if (user) {
      setGeneratedOtp(user.otp);
      setOtpSent(true);
      setResendIn(30);
      setMessage('');
      setMessageType('otp');
    } else {
      setMessageType('error');
      setMessage('No account found with this Email or Mobile.');
      setOtpSent(false);
    }
  };

  const handleVerify = () => {
    const identifier = method === 'email' ? email.trim() : mobile.trim();
    const user = USERS.find(
      u => (method === 'email' ? u.email : u.mobile) === identifier && u.otp === otp
    );

    if (user) {
      setMessageType('success');
      setMessage('OTP Verified! Redirecting...');
      setTimeout(() => {
        if (user.role === 'master') navigation.replace('AdminLoginScreen');
        else if (user.role === 'client') navigation.replace('ClientLoginScreen');
        else navigation.replace('UserLoginScreen');
      }, 800);
    } else {
      setMessageType('error');
      setMessage('Invalid OTP or user details.');
    }
  };

  return (
    <LinearGradient
      colors={['#4f46e5', '#6366f1', '#a5b4fc']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card Container */}
          <View style={styles.card}>
            <Text style={styles.header}>OTP Verification</Text>
            <Text style={styles.subHeader}>
              Enter the OTP sent to your {method === 'email' ? 'email' : 'mobile number'}.
            </Text>

            {message && messageType !== 'otp' && (
              <Text
                style={[
                  styles.message,
                  { color: messageType === 'success' ? '#059669' : '#b91c1c' },
                ]}
              >
                {message}
              </Text>
            )}

            {/* Toggle */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleButton, method === 'email' && styles.active]}
                onPress={() => setMethod('email')}
                disabled={otpSent}
              >
                <Text style={[styles.toggleText, method === 'email' && styles.activeText]}>
                  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, method === 'mobile' && styles.active]}
                onPress={() => setMethod('mobile')}
                disabled={otpSent}
              >
                <Text style={[styles.toggleText, method === 'mobile' && styles.activeText]}>
                  Mobile
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>
                {method === 'email' ? 'Email Address' : 'Mobile Number'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={method === 'email' ? 'name@company.com' : '+1 555 000 0000'}
                value={method === 'email' ? email : mobile}
                onChangeText={method === 'email' ? setEmail : setMobile}
                keyboardType="visible-password"
                editable={!otpSent}
                placeholderTextColor="#6b7280"
              />
            </View>

            {/* Send OTP */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                ((method === 'email' ? !email : !mobile) || resendIn > 0) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleSendOtp}
              disabled={(method === 'email' ? !email : !mobile) || resendIn > 0}
            >
              <Text style={styles.primaryButtonText}>
                {otpSent ? 'Send Again' : 'Send OTP'}
              </Text>
            </TouchableOpacity>

            {/* OTP Info + Resend */}
            {otpSent && (
              <View style={{ marginTop: 8, alignItems: 'center' }}>
                <Text style={styles.otpText}>
                  OTP sent to {method === 'email' ? email : mobile}.
                  <Text style={{ fontWeight: 'bold' }}> {generatedOtp}</Text>
                </Text>

                {resendIn > 0 ? (
                  <Text style={{ color: '#6b7280', marginTop: 4 }}>
                    Resend in {resendIn}s
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOtp}>
                    <Text style={{ color: '#4f46e5', fontWeight: '600', marginTop: 4 }}>
                      Resend OTP
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* OTP Input */}
            <View style={{ marginTop: 16 }}>
              <Text style={styles.label}>Enter OTP</Text>
              <TextInput
                style={styles.otpInput}
                value={otp}
                onChangeText={setOtp}
                placeholder="• • • • • •"
                keyboardType="visible-password"
                maxLength={6}
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.primaryButton, otp.length !== 6 && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={otp.length !== 6}
            >
              <Text style={styles.primaryButtonText}>Verify & Continue</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
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
  message: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
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
  otpInput: {
    backgroundColor: 'rgba(243,244,246,0.9)',
    borderRadius: 12,
    padding: 16,
    fontSize: 22,
    letterSpacing: 12,
    textAlign: 'center',
    color: '#111827',
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
  buttonDisabled: { backgroundColor: 'rgba(79, 70, 229, 0.6)' },
  otpText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#059669',
    fontWeight: '500',
    fontSize: 14,
  },
});
