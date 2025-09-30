import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { navigateByRole } from '../../utils/roleNavigation';

// Dummy current user check (replace with AsyncStorage or API)
const getCurrentUser = () => null;

export default function UserLoginScreen({ navigation }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' | 'error'

  // Hardcoded users
  const HARD_USERS = [
    { userId: 'admin', password: '123', role: 'admin', userName: 'Admin User' },
    { userId: 'customer', password: '123', role: 'customer', userName: 'Customer Demo' },
    { userId: 'client', password: '123', role: 'client', userName: 'Client Demo' },
    { userId: 'user', password: '123', role: 'user', userName: 'Regular User' },
  ];

  // Auto-redirect if already logged in
  useEffect(() => {
    const u = getCurrentUser();
    if (!u) return;
    navigateByRole(navigation, u.role);
  }, [navigation]);

  const onSubmit = () => {
    if (!userId.trim() || !password.trim()) {
      setMessageType('error');
      setMessage('Please enter User ID and Password');
      return;
    }

    setIsLoading(true);
    setMessage('');

    setTimeout(() => {
      const foundUser = HARD_USERS.find(
        u => u.userId === userId && u.password === password
      );

      if (foundUser) {
        setMessageType('success');
        setMessage(`Welcome back, ${foundUser.userName}!`);
        setTimeout(() => {
          navigateByRole(navigation, foundUser.role);
        }, 1000);
      } else {
        setMessageType('error');
        setMessage('Invalid User ID or Password');
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
          <View style={styles.card}>
            <Text style={styles.title}>User Sign In</Text>

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

            {/* User ID Input */}
            <Text style={styles.label}>User ID</Text>
            <TextInput
              placeholder="Enter User ID"
              value={userId}
              onChangeText={setUserId}
              style={styles.input}
              editable={!isLoading}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#94a3b8"
              keyboardType="visible-password"
              textContentType="username"
            />

            {/* Password Input */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={[styles.input, { flex: 1 }]}
                editable={!isLoading}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <LinearGradient
                  colors={['#2563eb', '#1d4ed8', '#1e40af']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.buttonText}>Sign In</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
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
  label: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(243,244,246,0.95)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  passwordContainer: {
    flexDirection: 'row',
    position: 'relative',
    marginBottom: 12,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  gradientButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
