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
import { loginMasterAdmin, getCurrentUser } from '../../lib/auth';
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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Detect keyboard open/close
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () =>
      setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      setIsKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Auto redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (!session) return;
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

      await saveSession(user.token, {
        role: user.role ?? 'master',
        username: user.username,
        name: user.name,
        email: user.email,
      });

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

      {/* 🔙 Fixed Back Button (always top-left) */}
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
          {/* === HEADER === */}
          <View
            style={[
              styles.headerContainer,
              isKeyboardVisible && styles.headerCompact,
            ]}
          >
            <Ionicons
              name="person-circle"
              size={isKeyboardVisible ? 30 : 56}
              color="#ff0000"
              style={isKeyboardVisible && { marginRight: 8 }}
            />
            <Text
              style={[styles.title, isKeyboardVisible && styles.titleCompact]}
            >
              Master Admin Sign In
            </Text>
          </View>

          {/* === FORM === */}
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

          <Text style={styles.label}>Password</Text>
          <View
            style={[styles.inputContainer, passwordError && styles.inputError]}
          >
            <TextInput
              style={styles.inputField}
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
              autoCapitalize="none"
              placeholderTextColor="#94a3b8"
              onBlur={() =>
                !password.trim() &&
                setPasswordError('Password field cannot be empty.')
              }
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
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

      {/* === Toast Config === */}
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
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingTop: 40,
  },
  backButtonAbsolute: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    left: 24,
    zIndex: 10,
    padding: 8,
  },

  // Header
  headerContainer: { alignItems: 'center', marginBottom: 30 },
  headerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 10,
  },
  titleCompact: { fontSize: 18, marginTop: 0 },

  // Form
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    backgroundColor: '#f9fafb',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 15,
    color: '#000',
    marginBottom: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    marginBottom: 14,
    height: 50,
  },
  inputField: { flex: 1, fontSize: 15, color: '#000' },
  inputError: { borderColor: '#ef4444', borderWidth: 2 },
  errorText: { color: '#ef4444', fontSize: 13, marginBottom: 8 },
  forgotPassword: { alignSelf: 'flex-start', marginBottom: 30, marginTop: -5 },
  forgotPasswordText: { color: '#1a73e8', fontWeight: '600', fontSize: 15 },
  button: {
    backgroundColor: '#ff0000',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
