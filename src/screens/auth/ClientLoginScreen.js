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
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
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
    Toast.show({
      type: 'custom_success',
      text1: 'Login Successful',
      text2: `Welcome back, ${username}!`,
      visibilityTime: 2000,
    });
    setTimeout(() => navigateByRole(navigation, ROLE), 2100);
  };

  // Password login
  const onSubmit = () => {
    if (!username || !password) {
      Toast.show({
        type: 'custom_error',
        text1: 'Validation Error',
        text2: 'Please enter username and password',
        visibilityTime: 2500,
      });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (username === HARD_USERNAME && password === HARD_PASSWORD) {
        handleLoginSuccess();
      } else {
        Toast.show({
          type: 'custom_error',
          text1: 'Login Failed',
          text2: 'Invalid username or password',
          visibilityTime: 2500,
        });
      }
    }, 1000);
  };

  // Send OTP
  const onSendOtp = () => {
    if (!username) {
      Toast.show({
        type: 'custom_error',
        text1: 'Validation Error',
        text2: 'Enter your username first',
        visibilityTime: 2500,
      });
      return;
    }
    setSendingOtp(true);
    setTimeout(() => {
      setSendingOtp(false);
      setResendIn(30);
      Toast.show({
        type: 'custom_success',
        text1: 'OTP Sent',
        text2: `Your OTP is: ${HARD_OTP}`,
        visibilityTime: 2500,
      });
    }, 500);
  };

  // OTP login
  const onSubmitOtp = () => {
    if (!otp) {
      Toast.show({
        type: 'custom_error',
        text1: 'Validation Error',
        text2: 'Enter the OTP',
        visibilityTime: 2500,
      });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (username === HARD_USERNAME && otp === HARD_OTP) {
        handleLoginSuccess();
      } else {
        Toast.show({
          type: 'custom_error',
          text1: 'Login Failed',
          text2: 'Invalid OTP',
          visibilityTime: 2000,
        });
      }
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
          <View style={styles.card}>
            <Text style={styles.title}>Client Sign In</Text>

            {/* Tab Switch */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                onPress={() => setTab('password')}
                style={[
                  styles.tabButton,
                  tab === 'password' && styles.activeTab,
                ]}
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
                  style={[
                    styles.tabText,
                    tab === 'otp' && styles.activeTabText,
                  ]}
                >
                  OTP
                </Text>
              </TouchableOpacity>
            </View>

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

      {/* Toast */}
      <Toast
        config={{
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
                paddingHorizontal: 16,
              }}
              contentContainerStyle={{ paddingHorizontal: 12 }}
              text1Style={{ fontSize: 16, fontWeight: '700', color: '#b91c1c' }}
              text2Style={{ fontSize: 14, color: '#b91c1c' }}
            />
          ),
        }}
      />
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
