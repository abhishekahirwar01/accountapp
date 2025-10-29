import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import {
  loginClientBySlug,
  loginClientBySlugWithOtp,
  requestClientOtp,
} from '../../lib/auth';
import {
  saveSession,
  scheduleAutoLogout,
  clearSession,
} from '../../lib/authSession';
import { navigateByRole } from '../../utils/roleNavigation';
import { jwtDecode } from 'jwt-decode';

export default function ClientLoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [tab, setTab] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // 🔹 Keyboard listener
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () =>
      setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    setCheckingSession(false);
  }, [navigation]);

  // 🔹 OTP resend timer
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn(n => n - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  // 🔹 Handle Password Login
  const handlePasswordLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter username and password',
        position: 'top',
      });
      return;
    }
    setLoading(true);
    try {
      const user = await loginClientBySlug(username, password);
      const userRole = String(user?.role || '').toLowerCase();
      const isValidCustomer = userRole === 'customer' || userRole === 'client';
      if (!user?.token || !isValidCustomer)
        throw new Error('Invalid customer credentials.');

      const decoded = jwtDecode(user.token);
      await saveSession(user.token, {
        role: 'customer',
        username: user.username,
        name: user.name,
        email: user.email,
        id: decoded.id,
        slug: user.slug,
      });

      scheduleAutoLogout(user.token, async () => {
        await clearSession();
        navigation.replace('ClientLoginScreen');
        Toast.show({
          type: 'info',
          text1: 'Session expired',
          text2: 'Please login again',
          position: 'top',
        });
      });

      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        text2: `Welcome, ${user.name}!`,
        position: 'top',
      });
      navigateByRole(navigation, 'customer');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error.message || 'Something went wrong',
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Send OTP
  const handleSendOtp = async () => {
    if (!username.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Username required',
        text2: 'Enter your username first',
        position: 'top',
      });
      return;
    }
    if (resendIn > 0) return;
    setSendingOtp(true);
    try {
      await requestClientOtp(username);
      setResendIn(45);
      Toast.show({
        type: 'success',
        text1: 'OTP sent',
        text2: 'Check your registered email',
        position: 'top',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to send OTP',
        text2: error.message || 'Something went wrong',
        position: 'top',
      });
    } finally {
      setSendingOtp(false);
    }
  };

  // 🔹 OTP Login
  const handleOtpLogin = async () => {
    if (!username.trim() || otp.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Enter username and valid OTP',
        position: 'top',
      });
      return;
    }
    setLoading(true);
    try {
      const user = await loginClientBySlugWithOtp(username, otp);
      const userRole = String(user?.role || '').toLowerCase();
      const isValidCustomer = userRole === 'customer' || userRole === 'client';
      if (!user?.token || !isValidCustomer) throw new Error('Invalid OTP.');

      const decoded = jwtDecode(user.token);
      await saveSession(user.token, {
        role: 'customer',
        username: user.username,
        name: user.name,
        email: user.email,
        id: decoded.id,
        slug: user.slug,
      });

      scheduleAutoLogout(user.token, async () => {
        await clearSession();
        navigation.replace('ClientLoginScreen');
        Toast.show({
          type: 'info',
          text1: 'Session expired',
          text2: 'Please login again',
          position: 'top',
        });
      });

      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        text2: `Welcome, ${user.name}!`,
        position: 'top',
      });
      navigateByRole(navigation, 'customer');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'OTP Login Failed',
        text2: error.message || 'Something went wrong',
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* 🔙 Fixed Back Button */}
      <TouchableOpacity
        style={styles.backButtonAbsolute}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Ionicons name="arrow-back" size={26} color="#000" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.contentContainer}>
          {/* HEADER */}
          <View
            style={[
              styles.headerContainer,
              isKeyboardVisible && styles.headerCompact,
            ]}
          >
            <Ionicons
              name="briefcase"
              size={isKeyboardVisible ? 30 : 56}
              color="#2563eb"
              style={isKeyboardVisible && { marginRight: 8 }}
            />
            <Text
              style={[styles.title, isKeyboardVisible && styles.titleCompact]}
            >
              Sign in to Client Account
            </Text>
          </View>

          {/* TABS */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                tab === 'password' && styles.tabButtonActive,
              ]}
              onPress={() => setTab('password')}
            >
              <Text style={styles.tabText}>Password</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                tab === 'otp' && styles.tabButtonActive,
              ]}
              onPress={() => setTab('otp')}
            >
              <Text style={styles.tabText}>OTP</Text>
            </TouchableOpacity>
          </View>

          {/* 🔹 Password Login */}
          {tab === 'password' ? (
            <>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                editable={!loading}
                placeholder="Enter username"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  placeholder="Enter password"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  disabled={loading}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handlePasswordLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* 🔹 OTP Login */}
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                editable={!loading && !sendingOtp}
                placeholder="Enter username"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.button, sendingOtp && { opacity: 0.6 }]}
                onPress={handleSendOtp}
                disabled={sendingOtp || resendIn > 0}
              >
                <Text style={styles.buttonText}>
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Send OTP'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Enter OTP</Text>
              <TextInput
                style={styles.input}
                value={otp}
                onChangeText={t => setOtp(t.replace(/\D/g, ''))}
                maxLength={6}
                keyboardType="numeric"
                editable={!loading}
                placeholder="6-digit OTP"
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity
                style={[
                  styles.button,
                  (loading || otp.length !== 6) && styles.buttonDisabled,
                ]}
                onPress={handleOtpLogin}
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Sign In</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* 🔹 Toast Configuration */}
      <Toast
        config={{
          success: props => (
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
          error: props => (
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
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  keyboardAvoidingContainer: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  contentContainer: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  backButtonAbsolute: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  headerContainer: { alignItems: 'center', marginBottom: 30 },
  headerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#000', marginTop: 10 },
  titleCompact: { fontSize: 18, marginTop: 0 },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000',
    marginBottom: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    paddingVertical: 12,
  },
  eyeButton: {
    padding: 6,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    marginTop: 10,
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: { borderBottomColor: '#2563eb' },
  tabText: { fontSize: 16, fontWeight: '600', color: '#000' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
