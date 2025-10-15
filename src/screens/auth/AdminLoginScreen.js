import React, { useState } from 'react';
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
import { navigateByRole } from '../../utils/roleNavigation'; // Assuming this utility exists

export default function AdminLoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!username.trim() || !password.trim()) {
      Toast.show({
        type: 'custom_error',
        text1: 'Validation Error',
        text2: 'Please enter username and password',
        visibilityTime: 2000,
      });
      return;
    }

    setLoading(true);

    // Mock authentication
    const role =
      username === 'master' && password === '123'
        ? 'master'
        : username === 'user' && password === '123'
        ? 'user'
        : username === 'client' && password === '123'
        ? 'client'
        : null;

    // Simulate network delay
    setTimeout(() => {
      setLoading(false);

      if (role) {
        Toast.show({
          type: 'custom_success',
          text1: 'Login Successful',
          text2: `Welcome, ${username}!`,
          visibilityTime: 2000,
        });

        setTimeout(() => {
          navigateByRole(navigation, role);
        }, 500);
      } else {
        Toast.show({
          type: 'custom_error',
          text1: 'Login Failed',
          text2: 'Invalid username or password',
          visibilityTime: 2000,
        });
      }
    }, 1500); // Increased delay for better visibility of the loading state
  };

  // Custom Toast configurations (kept for completeness)
  const toastConfig = {
    custom_success: props => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: '#10b981',
          borderRadius: 8,
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
          borderRadius: 8,
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
      
      {/* 🚀 Back Button is now ABSOLUTELY positioned inside the SafeAreaView */}
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
        {/* Main content container for centering */}
        <View style={styles.contentContainer}>
          
          {/* Title and Icon - Simplified and centered for a clean look */}
          <View style={styles.headerContainer}>
            <Ionicons
              name="person-circle"
              size={56}
              color="#ff0000" // YouTube-like red
            />
            <Text style={styles.title}>Sign in to Master Account</Text>
          </View>

          {/* Username Input */}
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            value={username}
            onChangeText={setUsername}
            editable={!loading}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholderTextColor="#94a3b8"
          />

          {/* Password Input */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
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

      {/* Toast Messages */}
      <Toast config={toastConfig} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff', // Clean white background
  },
  keyboardAvoidingContainer: {
    flex: 1,
    paddingHorizontal: 24, // Added horizontal padding for the content
    justifyContent: 'center', // Center content vertically
  },
  contentContainer: {
    width: '100%', // Take full width
    maxWidth: 400, // Optional: Limit width on tablets/web for better design
    alignSelf: 'center',
    // Added top padding to ensure the centered content doesn't collide with the absolute back button
    paddingTop: 50, 
  },
  // 🚀 New absolute style for the back button
  backButtonAbsolute: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20, // Adjust for Android StatusBar/iOS status bar
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  headerContainer: {
    alignItems: 'center', // Center icon and title
    marginBottom: 40,
    marginTop: 20, // Add some top margin
  },
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
    backgroundColor: '#f1f1f1', // Light grey background for input
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 16,
    color: '#000',
    borderWidth: 1, // Slight border for definition
    borderColor: '#e0e0e0',
    marginBottom: 16, // Use this for spacing between inputs
    width: '100%',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16, // Use this for spacing
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0, // Reset default input margin
    paddingRight: 50, // Make space for the eye icon
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  forgotPassword: {
    alignSelf: 'flex-start', // Align to start for a simple flow
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#1a73e8', // A common blue for links
    fontWeight: '600',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#ff0000', // YouTube-like red for the main button
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 17,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Removed the unused `backButton` style from the previous iteration
});