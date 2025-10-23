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
  getCurrentUserNew as getSession,
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

  // -----------------------------
  // Check session on mount
  // -----------------------------
  useEffect(() => {
  // TEMP: Disable auto-login for manual testing
  setCheckingSession(false);

  // If you want to re-enable later, uncomment:
  /*
  const checkSession = async () => {
    try {
      const session = await getSession();
      if (session?.user?.role?.toLowerCase() === 'customer') {
        navigateByRole(navigation, 'customer');
      } else if (session?.user?.role) {
        await clearSession();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingSession(false);
    }
  };
  checkSession();
  */
}, [navigation]);


  // -----------------------------
  // OTP resend countdown
  // -----------------------------
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn(n => n - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  // -----------------------------
  // Password login - FIXED
  // -----------------------------
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
      console.log('🟡 Attempting login with:', { username, password });

      const user = await loginClientBySlug(username, password);
      console.log('🟢 Server response:', user);

      // ✅ FIX: Check for both 'customer' and 'client' roles
      const userRole = String(user?.role || '').toLowerCase();
      const isValidCustomer = userRole === 'customer' || userRole === 'client';

      if (!user?.token || !isValidCustomer) {
        console.log('🔴 Invalid role or token missing:', user?.role);
        throw new Error('Invalid customer credentials.');
      }

      let decoded;
      try {
        decoded = jwtDecode(user.token);
        console.log('🧩 Decoded Token:', decoded);
      } catch (err) {
        console.error('❌ JWT Decode failed:', err);
        throw new Error('Failed to decode token.');
      }

      const userId = decoded.id || '';

      // Save session
      console.log('💾 Saving session with:', {
        token: user.token,
        role: 'customer',
        username: user.username,
        name: user.name,
        email: user.email,
        id: userId,
        slug: user.slug,
      });

      await saveSession(user.token, {
        role: 'customer',
        username: user.username,
        name: user.name,
        email: user.email,
        id: userId,
        slug: user.slug,
      });

      console.log('🕒 Scheduling auto logout...');
      scheduleAutoLogout(user.token, async () => {
        console.log('⚠️ Session expired — clearing...');
        await clearSession();
        navigation.replace('ClientLogin');
        Toast.show({
          type: 'info',
          text1: 'Session expired',
          text2: 'Please login again',
          position: 'top',
        });
      });

      console.log('✅ Login successful for:', user.username);
      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        text2: `Welcome, ${user.name}!`,
        position: 'top',
      });

      navigateByRole(navigation, 'customer');
    } catch (error) {
      console.log('❌ Login error:', error);
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error instanceof Error ? error.message : 'Something went wrong',
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Send OTP
  // -----------------------------
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
        text2: 'Check your registered email for OTP',
        position: 'top',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to send OTP',
        text2: error instanceof Error ? error.message : 'Something went wrong',
        position: 'top',
      });
    } finally {
      setSendingOtp(false);
    }
  };

  // -----------------------------
  // OTP login - FIXED
  // -----------------------------
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
      
      // ✅ FIX: Check for both 'customer' and 'client' roles
      const userRole = String(user?.role || '').toLowerCase();
      const isValidCustomer = userRole === 'customer' || userRole === 'client';

      if (!user?.token || !isValidCustomer) {
        throw new Error('Invalid OTP.');
      }

      let decoded;
      try {
        decoded = jwtDecode(user.token);
      } catch (err) {
        throw new Error('Failed to decode token.');
      }

      const userId = decoded.id || '';

      await saveSession(user.token, {
        role: 'customer',
        username: user.username,
        name: user.name,
        email: user.email,
        id: userId,
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
        text2: error instanceof Error ? error.message : 'Something went wrong',
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

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.contentContainer}>
          <View style={styles.headerContainer}>
            <Ionicons name="briefcase" size={56} color="#2563eb" />
            <Text style={styles.title}>Sign in to Client Account</Text>
          </View>

          {/* Tabs */}
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

          {tab === 'password' ? (
            <>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                editable={!loading}
                placeholder="Enter username"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  placeholder="Enter password"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  disabled={loading}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={24}
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
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                editable={!loading && !sendingOtp}
                placeholder="Enter username"
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  keyboardAvoidingContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingTop: 50,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  headerContainer: { alignItems: 'center', marginBottom: 40 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
    color: '#000',
  },
  label: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f1f1f1',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
    width: '100%',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  passwordInput: { flex: 1, marginBottom: 0, paddingRight: 50 },
  eyeButton: { position: 'absolute', right: 15, padding: 5 },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  buttonDisabled: { opacity: 0.6 },
  tabContainer: { flexDirection: 'row', marginBottom: 16 },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: { borderBottomColor: '#2563eb' },
  tabText: { fontSize: 16, fontWeight: '600', color: '#000' },
});