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
import { loginClientBySlug } from '../../lib/auth';
import {
  saveSession,
  scheduleAutoLogout,
  clearSession,
} from '../../lib/authSession';
import { navigateByRole } from '../../utils/roleNavigation';
import { jwtDecode } from 'jwt-decode';

// ✅ Import both permission contexts
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { usePermissions } from '../../contexts/permission-context';

export default function ClientLoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // ✅ Access refetch from both contexts
  const { refetch: refetchUserPermissions } = useUserPermissions();
  const { refetch: refetchClientPermissions } = usePermissions();

  // 🔹 Keyboard listener
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

  useEffect(() => {
    setCheckingSession(false);
  }, [navigation]);

  // 🔹 Shared logic for saving session + refetch + navigation
  const completeLoginFlow = async (user, roleLabel) => {
    const decoded = jwtDecode(user.token);
    await saveSession(user.token, {
      role: 'customer',
      username: user.username,
      name: user.name,
      email: user.email,
      id: decoded.id,
      slug: user.slug,
    });

    // ✅ Re-fetch BOTH permissions contexts
    if (refetchUserPermissions) {
      console.log('🔁 Refetching user permissions after login...');
      await refetchUserPermissions();
    }
    if (refetchClientPermissions) {
      console.log('🔁 Refetching client permissions after login...');
      await refetchClientPermissions();
    }

    // ✅ Schedule auto logout
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

    navigateByRole(navigation, roleLabel);
  };

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

      await completeLoginFlow(user, 'customer');
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
        </View>
      </KeyboardAvoidingView>

      {/* Toast Configuration */}
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
  eyeButton: { padding: 6 },
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
