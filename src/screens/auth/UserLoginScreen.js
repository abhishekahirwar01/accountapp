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
import { navigateByRole } from '../../utils/roleNavigation';
import { loginUser, getCurrentUser } from '../../lib/auth';

import { useUserPermissions } from '../../contexts/user-permissions-context';
import { usePermissions } from '../../contexts/permission-context';

export default function UserLoginScreen({ navigation }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const { refetch: refetchUserPermissions } = useUserPermissions();
  const { refetch: refetchAppPermissions } = usePermissions();

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
    checkExistingAuth();
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
      Toast.show({
        type: 'custom_error',
        text1: 'Validation Error',
        text2: 'Please enter User ID and Password',
        visibilityTime: 1500,
      });
      return;
    }

    setLoading(true);

    try {
      const user = await loginUser(userId, password);

      Toast.show({
        type: 'custom_success',
        text1: 'Login Successful',
        text2: `Welcome, ${user.name || user.username}!`,
        visibilityTime: 1500,
      });

      await refetchPermissions();

      setTimeout(() => {
        navigateByRole(navigation, user.role);
      }, 500);
    } catch (error) {
      Toast.show({
        type: 'custom_error',
        text1: 'Login Failed',
        text2: error.message || 'Invalid User ID or Password',
        visibilityTime: 1500,
      });
    } finally {
      setLoading(false);
    }
  };

  const toastConfig = {
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
        text1Style={{
          fontSize: 16,
          fontWeight: '700',
          color: '#065f46',
        }}
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
        text1Style={{
          fontSize: 16,
          fontWeight: '700',
          color: '#b91c1c',
        }}
        text2Style={{ fontSize: 14, color: '#b91c1c' }}
      />
    ),
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
              Sign In to Your Account
            </Text>
          </View>

          <Text style={styles.label}>User ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter User ID"
            value={userId}
            onChangeText={setUserId}
            editable={!loading}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#94a3b8"
            returnKeyType="next"
            onSubmitEditing={() => {
              this.passwordInput?.focus();
            }}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              ref={ref => (this.passwordInput = ref)}
              style={styles.passwordInput}
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#94a3b8"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
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

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
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

      <Toast config={toastConfig} />
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
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 10,
    textAlign: 'center',
  },
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
  passwordInput: { flex: 1, fontSize: 15, color: '#000', paddingVertical: 12 },
  eyeButton: { padding: 6 },
  forgotPassword: { alignSelf: 'flex-start', marginBottom: 20 },
  forgotPasswordText: { color: '#1a73e8', fontWeight: '600', fontSize: 15 },
  button: {
    backgroundColor: '#ff0000',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#ffffff', fontWeight: '700', fontSize: 17 },
  buttonDisabled: { opacity: 0.6 },
});
