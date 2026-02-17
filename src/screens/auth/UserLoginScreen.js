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
  Keyboard,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from '../../components/ui/Toast';
import { navigateByRole } from '../../utils/roleNavigation';
import { loginUser, getCurrentUser } from '../../lib/auth';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { usePermissions } from '../../contexts/permission-context';

export default function UserLoginScreen({ navigation }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userIdFocused, setUserIdFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Show toast if logoutReason param is present
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const reason = navigation
        ?.getState?.()
        ?.routes?.find(r => r.name === 'UserLoginScreen')?.params?.logoutReason;
      if (reason) {
        setToast({
          visible: true,
          type: 'warning',
          title: 'Logged Out',
          message: reason,
        });
        // Optionally clear the param so it doesn't show again
        navigation.setParams({ logoutReason: undefined });
      }
    });
    return unsubscribe;
  }, [navigation]);

  const { refetch: refetchUserPermissions } = useUserPermissions();
  const { refetch: refetchAppPermissions } = usePermissions();

  useEffect(() => {
    checkExistingAuth();
    // Back button on login screen should close the app
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        BackHandler.exitApp();
        return true;
      },
    );
    return () => backHandler.remove();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        await refetchPermissions();
        setTimeout(() => {
          navigateByRole(navigation, currentUser.role);
        }, 500);
      }
    } catch (error) {}
  };

  const refetchPermissions = async () => {
    try {
      await refetchUserPermissions?.();
      await refetchAppPermissions?.();
    } catch (error) {}
  };

  const handleSubmit = async () => {
    if (!userId.trim() || !password.trim()) {
      setToast({
        visible: true,
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter User ID and Password',
      });
      return;
    }

    setLoading(true);

    try {
      const user = await loginUser(userId, password);

      setToast({
        visible: true,
        type: 'success',
        title: 'Login Successful',
        message: `Welcome, ${user.name || user.username}!`,
      });

      await refetchPermissions();

      // Auto logout schedule logic
      const { scheduleAutoLogout } = await import('../../lib/authSession');
      const currentUser = await getCurrentUser();
      if (currentUser && currentUser.token) {
        scheduleAutoLogout(currentUser.token);
      }

      setTimeout(() => {
        navigateByRole(navigation, user.role);
      }, 500);
    } catch (error) {
      // 1. Backend ka real message nikaalein (Axios logic)
      // error.response.data.message mein actual backend error hota hai
      const serverMsg =
        error.response?.data?.message ||
        error.message ||
        'Invalid User ID or Password';
      const status = error.response?.status;

      // 2. Web ki tarah 403 (Account Validity) check karein
      const isAccountIssue =
        status === 403 ||
        serverMsg.toLowerCase().includes('expired') ||
        serverMsg.toLowerCase().includes('validity');

      setToast({
        visible: true,
        type: 'error',
        // Agar 403 hai toh title "Account Status" ya "Account Expired" rakhein
        title: isAccountIssue ? 'Account Status' : 'Login Failed',
        message: serverMsg, // Ab yahan "Request failed with 403" nahi dikhega
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoOuter}>
                <View style={styles.logoInner}>
                  <Ionicons name="person" size={32} color="#2563eb" />
                </View>
              </View>
              <Text style={styles.title}>User Sign In</Text>
              <Text style={styles.subtitle}>
                Access your account with credentials
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* User ID Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>User ID</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    userIdFocused && styles.inputFocused,
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={userIdFocused ? '#2563eb' : '#94a3b8'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={userId}
                    onChangeText={setUserId}
                    onFocus={() => setUserIdFocused(true)}
                    onBlur={() => setUserIdFocused(false)}
                    editable={!loading}
                    placeholder="Enter your user ID"
                    placeholderTextColor="#cbd5e1"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    passwordFocused && styles.inputFocused,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={passwordFocused ? '#2563eb' : '#94a3b8'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    placeholder="Enter your password"
                    placeholderTextColor="#cbd5e1"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    disabled={loading}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={passwordFocused ? '#2563eb' : '#94a3b8'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[
                  styles.button,
                  (!userId.trim() || !password.trim() || loading) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading || !userId.trim() || !password.trim()}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Text>
                {!loading && (
                  <View style={styles.buttonIcon}>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Info */}
              <View style={styles.info}>
                <Ionicons name="information-circle" size={16} color="#64748b" />
                <Text style={styles.infoText}>
                  Secure user access with standard privileges
                </Text>
              </View>
            </View>

            {/* Security Badge */}
            <View style={styles.security}>
              <View style={styles.securityIcon}>
                <Ionicons name="lock-closed" size={16} color="#2563eb" />
              </View>
              <Text style={styles.securityText}>Encrypted & Secure</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {toast.visible && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast({ ...toast, visible: false })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f7ff',
  },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logoOuter: {
    width: 72,
    height: 72,
    borderRadius: 44,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 18,
  },
  logoInner: {
    width: 60,
    height: 60,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Form
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },

  // Input
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#dbeafe',
    paddingHorizontal: 14,
  },
  inputFocused: {
    backgroundColor: '#ffffff',
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 8,
  },

  // Forgot Password
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },

  // Button
  button: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.15,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonIcon: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 20,
    height: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Info
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    marginLeft: 8,
  },

  // Security
  security: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  securityIcon: {
    marginRight: 8,
    backgroundColor: '#dbeafe',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
});
