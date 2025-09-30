import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { navigateByRole } from '../../utils/roleNavigation';

export default function ClientLoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [tab, setTab] = useState('password'); // "password" or "otp"
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const HARD_USERNAME = 'client';
  const HARD_PASSWORD = '123';
  const HARD_OTP = '321';
  const ROLE = 'client';

  useEffect(() => {
    if (resendIn <= 0) return;
    const interval = setInterval(() => setResendIn(n => n - 1), 1000);
    return () => clearInterval(interval);
  }, [resendIn]);

  const handleLoginSuccess = () => {
    setMessageType('success');
    setMessage(`Welcome back, ${username}!`);
    setTimeout(() => navigateByRole(navigation, ROLE), 1000);
  };

  // Password login
  const onSubmit = () => {
    setIsLoading(true);
    setTimeout(() => {
      if (username === HARD_USERNAME && password === HARD_PASSWORD) {
        handleLoginSuccess();
      } else {
        setMessageType('error');
        setMessage('Invalid username or password');
      }
      setIsLoading(false);
    }, 1000);
  };

  // Send OTP
  const onSendOtp = () => {
    if (!username) {
      setMessageType('error');
      setMessage('Enter your username first');
      return;
    }
    setSendingOtp(true);
    setTimeout(() => {
      setMessageType('success');
      setMessage(`OTP Sent: ${HARD_OTP}`);
      setResendIn(30);
      setSendingOtp(false);
    }, 500);
  };

  // OTP login
  const onSubmitOtp = () => {
    setIsLoading(true);
    setTimeout(() => {
      if (username === HARD_USERNAME && otp === HARD_OTP) {
        handleLoginSuccess();
      } else {
        setMessageType('error');
        setMessage('Invalid OTP');
      }
      setIsLoading(false);
    }, 1000);
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
            <Text style={styles.title}>Client Sign In</Text>

            {/* Tab Switch */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                onPress={() => setTab('password')}
                style={[styles.tabButton, tab === 'password' && styles.activeTab]}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === 'password' && styles.activeTabText,
                  ]}
                >
                  Password
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTab('otp')}
                style={[styles.tabButton, tab === 'otp' && styles.activeTab]}
              >
                <Text
                  style={[styles.tabText, tab === 'otp' && styles.activeTabText]}
                >
                  OTP
                </Text>
              </TouchableOpacity>
            </View>

            {/* Message */}
            {message ? (
              <Text
                style={{
                  color: messageType === 'success' ? 'green' : 'red',
                  marginBottom: 16,
                  textAlign: 'center',
                  fontWeight: '600',
                }}
              >
                {message}
              </Text>
            ) : null}

            {/* Password Login */}
            {tab === 'password' && (
              <View style={styles.form}>
                <TextInput
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                  style={styles.input}
                  editable={!isLoading}
                  autoCapitalize="none"
                  placeholderTextColor="#94a3b8"
                  keyboardType="visible-password"
                />
                <View style={styles.passwordContainer}>
                  <TextInput
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    editable={!isLoading}
                    placeholderTextColor="#94a3b8"
                    keyboardType="visible-password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={onSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* OTP Login */}
            {tab === 'otp' && (
              <View style={styles.form}>
                <TextInput
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                  style={styles.input}
                  editable={!isLoading && !sendingOtp}
                  autoCapitalize="none"
                  placeholderTextColor="#94a3b8"
                  keyboardType="visible-password"
                />
                <TouchableOpacity
                  style={[
                    styles.button,
                    (sendingOtp || resendIn > 0 || !username) &&
                      styles.buttonDisabled,
                  ]}
                  onPress={onSendOtp}
                  disabled={sendingOtp || resendIn > 0 || !username}
                >
                  <Text style={styles.buttonText}>
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Send OTP'}
                  </Text>
                </TouchableOpacity>
                <TextInput
                  placeholder="Enter OTP"
                  value={otp}
                  onChangeText={setOtp}
                 keyboardType="visible-password"
                  style={styles.input}
                  editable={!isLoading}
                  placeholderTextColor="#94a3b8"
                  maxLength={HARD_OTP.length}
                />
                <TouchableOpacity
                  style={[
                    styles.button,
                    (isLoading || otp.length !== HARD_OTP.length) &&
                      styles.buttonDisabled,
                  ]}
                  onPress={onSubmitOtp}
                  disabled={isLoading || otp.length !== HARD_OTP.length}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Verify & Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
    color: '#1e3a8a',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  form: {},
  input: {
    backgroundColor: '#f1f5f9',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 16,
    color: '#334155',
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
});
