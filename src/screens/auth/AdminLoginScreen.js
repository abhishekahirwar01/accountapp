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
import { loginMasterAdmin } from '../../lib/auth';
import { getCurrentUser } from '../../lib/auth';
import {
  getCurrentUserNew as getSession,
  saveSession,
  scheduleAutoLogout,
  clearSession,
} from '../../lib/authSession';
import { navigateByRole } from '../../utils/roleNavigation';

export default function AdminLoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (!session) return; // no token or expired

      const user = await getCurrentUser();
      if (!user) return;

      navigateByRole(navigation, user.role ?? 'master');
    };
    checkSession();
  }, []);

 const handleLogin = async () => {
  setUsernameError('');
  setPasswordError('');
  let hasValidationError = false;

  if (!username.trim()) {
    setUsernameError('Username field cannot be empty.');
    hasValidationError = true;
  }

  if (!password.trim()) {
    setPasswordError('Password field cannot be empty.');
    hasValidationError = true;
  }

  if (hasValidationError) return;

  setLoading(true);

  try {
    const user = await loginMasterAdmin(username, password);
    if (!user?.token) throw new Error('Invalid username or password');

    // Save session (async but fast)
    await saveSession(user.token, {
      role: user.role ?? 'master',
      username: user.username,
      name: user.name,
      email: user.email,
    });

    // Schedule auto logout (non-blocking)
    scheduleAutoLogout(user.token, async () => {
      await clearSession();
      navigation.replace('AdminLoginScreen');
      Toast.show({
        type: 'info',
        text1: 'Session expired',
        text2: 'Please log in again',
        position: 'top',
      });
    });

    // 🚀 Instantly navigate without toast or delay
    navigateByRole(navigation, user.role ?? 'master');
  } catch (err) {
    setLoading(false);

    let errorMessage = 'Invalid username or password';
    if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err.message && err.message !== 'Network Error') {
      errorMessage = err.message;
    }

    Toast.show({
      type: 'error',
      text1: 'Login Failed',
      text2: errorMessage,
      position: 'top',
      visibilityTime: 1000,
    });
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

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
          <View style={styles.headerContainer}>
            <Ionicons name="person-circle" size={56} color="#ff0000" />
            <Text style={styles.title}>Sign in to Master Account</Text>
          </View>

          {/* === USERNAME INPUT === */}
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={[styles.input, usernameError && styles.inputError]}
            placeholder="Enter username"
            value={username}
            onChangeText={setUsername}
            onBlur={() =>
              !username.trim() &&
              setUsernameError('Username field cannot be empty.')
            }
            editable={!loading}
            autoCapitalize="none"
            placeholderTextColor="#94a3b8"
          />
          {usernameError ? (
            <Text style={styles.errorText}>{usernameError}</Text>
          ) : null}

          {/* === PASSWORD INPUT === */}
          <Text style={styles.label}>Password</Text>
          <View
            style={[
              styles.passwordContainer,
              passwordError && { marginBottom: 0 },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                passwordError && styles.inputError,
              ]}
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              onBlur={() =>
                !password.trim() &&
                setPasswordError('Password field cannot be empty.')
              }
              secureTextEntry={!showPassword}
              editable={!loading}
              autoCapitalize="none"
              placeholderTextColor="#94a3b8"
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

          {passwordError ? (
            <Text style={styles.errorText}>{passwordError}</Text>
          ) : (
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {/* === LOGIN BUTTON === */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 💡 NEW: TOAST COMPONENT FOR RENDERING MESSAGES */}
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
  backButtonAbsolute: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  headerContainer: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 10,
    textAlign: 'center',
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
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: -10,
    marginBottom: 16,
    fontWeight: '500',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  passwordInput: { flex: 1, marginBottom: 0, paddingRight: 50 },
  eyeButton: { position: 'absolute', right: 15, padding: 5 },
  forgotPassword: { alignSelf: 'flex-start', marginBottom: 30, marginTop: -5 },
  forgotPasswordText: { color: '#1a73e8', fontWeight: '600', fontSize: 15 },
  button: {
    backgroundColor: '#ff0000',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  buttonDisabled: { opacity: 0.6 },
});
