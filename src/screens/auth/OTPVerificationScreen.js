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
} from 'react-native';

export default function OTPVerificationScreen({ navigation }) {
  const [method, setMethod] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const USERS = [
    {
      role: 'admin',
      email: 'admin01@gmail.com',
      mobile: '1111111111',
      otp: '111111',
    },
    {
      role: 'client',
      email: 'client01@gmail.com',
      mobile: '2222222222',
      otp: '222222',
    },
    {
      role: 'user',
      email: 'user01@gmail.com',
      mobile: '3333333333',
      otp: '333333',
    },
  ];

  useEffect(() => {
    if (resendIn <= 0) return;
    const interval = setInterval(() => setResendIn(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [resendIn]);

  const handleSendOtp = () => {
    const user = USERS.find(
      u => (method === 'email' ? u.email : u.mobile) === identifier.trim(),
    );
    if (user) {
      setGeneratedOtp(user.otp);
      setOtpSent(true);
      setResendIn(30);
      setMessageType('success');
      setMessage(`OTP sent to ${identifier}. (Demo OTP: ${user.otp})`);
    } else {
      setMessageType('error');
      setMessage('No account found with this Email or Mobile.');
    }
  };

  const handleVerify = () => {
    const user = USERS.find(
      u =>
        (method === 'email' ? u.email : u.mobile) === identifier.trim() &&
        u.otp === otp,
    );

    if (user) {
      setMessageType('success');
      setMessage('OTP Verified! Redirecting...');
      setTimeout(() => {
        if (user.role === 'admin') navigation.replace('AdminLoginScreen');
        else if (user.role === 'client')
          navigation.replace('ClientLoginScreen');
        else navigation.replace('UserLoginScreen');
      }, 800);
    } else {
      setMessageType('error');
      setMessage('Invalid OTP or user details.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.stepText}>Step 1 of 2</Text>
        <Text style={styles.title}>Account App</Text>
        <Text style={styles.subtitle}>Professional Accounting Services</Text>

        {message ? (
          <Text
            style={[
              styles.message,
              { color: messageType === 'success' ? 'green' : 'red' },
            ]}
          >
            {message}
          </Text>
        ) : null}

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, method === 'email' && styles.active]}
            onPress={() => setMethod('email')}
            disabled={otpSent}
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
            style={[styles.toggleButton, method === 'mobile' && styles.active]}
            onPress={() => setMethod('mobile')}
            disabled={otpSent}
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

        <TextInput
          style={styles.input}
          placeholder={
            method === 'email' ? 'name@company.com' : '+1 555 000 0000'
          }
          value={identifier}
          onChangeText={setIdentifier}
          keyboardType="visible-password"
          textContentType="username"
          editable={!otpSent}
        />

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!identifier || resendIn > 0) && styles.buttonDisabled,
          ]}
          onPress={handleSendOtp}
          disabled={!identifier || resendIn > 0}
        >
          <Text style={styles.primaryButtonText}>
            {resendIn > 0 ? `Resend in ${resendIn}s` : 'Send OTP'}
          </Text>
        </TouchableOpacity>

        {otpSent && (
          <Text style={styles.otpText}>
            (Demo OTP:{' '}
            <Text style={{ fontWeight: 'bold' }}>{generatedOtp}</Text>)
          </Text>
        )}

        <Text style={styles.label}>Enter OTP</Text>
        <TextInput
          style={styles.input}
          value={otp}
          onChangeText={setOtp}
          placeholder="6-digit OTP"
         keyboardType="visible-password"
          textContentType="username"
          maxLength={6}
        />

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
      </ScrollView>

      {/* Fixed Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressDot} />
        <View style={[styles.progressDot, styles.activeDot]} />
        <View style={styles.progressDot} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  stepText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  active: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  toggleText: { color: '#374151', fontWeight: '500' },
  activeText: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  label: { fontSize: 14, color: '#374151', marginTop: 8, marginBottom: 4 },
  primaryButton: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '600' },
  buttonDisabled: { backgroundColor: '#93c5fd' },
  otpText: {
    textAlign: 'center',
    marginBottom: 12,
    color: 'green',
    fontWeight: '500',
  },
  message: { textAlign: 'center', marginBottom: 12, fontWeight: '600' },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: '#f9fafb',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  progressDot: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1d5db',
    marginHorizontal: 4,
  },
  activeDot: { backgroundColor: '#2563eb' },
});
