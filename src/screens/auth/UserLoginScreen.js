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
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView, // Re-imported ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { navigateByRole } from '../../utils/roleNavigation';

export default function UserLoginScreen({ navigation }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const HARD_USERS = [
    { userId: 'admin', password: '123', role: 'admin', name: 'Admin User' },
    {
      userId: 'customer',
      password: '123',
      role: 'customer',
      name: 'Customer Demo',
    },
    { userId: 'client', password: '123', role: 'client', name: 'Client Demo' },
    { userId: 'user', password: '123', role: 'user', name: 'Regular User' },
  ];

  const handleSubmit = () => {
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

    setTimeout(() => {
      const foundUser = HARD_USERS.find(
        u => u.userId === userId && u.password === password,
      );

      setLoading(false);

      if (foundUser) {
        Toast.show({
          type: 'custom_success',
          text1: 'Login Successful',
          text2: `Welcome, ${foundUser.name}!`,
          visibilityTime: 1500,
        });

        setTimeout(() => {
          navigateByRole(navigation, foundUser.role);
        }, 500);
      } else {
        Toast.show({
          type: 'custom_error',
          text1: 'Login Failed',
          text2: 'Invalid User ID or Password',
          visibilityTime: 1500,
        });
      }
    }, 1500);
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

      {/* Back Button - positioned absolutely relative to the SafeAreaView */}
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
        // Removed fixed keyboardVerticalOffset as ScrollView handles content movement
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            contentContainerStyle={styles.scrollContentContainer} // Use contentContainerStyle
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Main Content Container */}
            <View style={styles.contentContainer}>
              
              {/* Icon + Title - Centered and prominent */}
              <View style={styles.headerContainer}>
                <Ionicons
                  name="person-circle"
                  size={56}
                  color="#ff0000"
                />
                <Text style={styles.title}>Sign In to Your Account</Text>
              </View>

              {/* User ID */}
              <Text style={styles.label}>User ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter User ID"
                value={userId}
                onChangeText={setUserId}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholderTextColor="#94a3b8"
                returnKeyType="next"
              />

              {/* Password */}
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
                  textContentType="password"
                  returnKeyType="done"
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
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Toast Messages */}
      <Toast config={toastConfig} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoidingContainer: {
    flex: 1,
    paddingHorizontal: 24, // Consistent padding for content
  },
  scrollContentContainer: {
    flexGrow: 1, // Allows content to fill space and enables scrolling
    justifyContent: 'center', // Centers the login form vertically when keyboard is hidden
    paddingVertical: 50, // Added padding to ensure content isn't flush with top/bottom edges
  },
  contentContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  backButtonAbsolute: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10, // Adjusted for StatusBar
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
    // marginTop removed, handled by scrollContentContainer padding
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
  passwordInput: {
    flex: 1,
    marginBottom: 0,
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  forgotPassword: {
    alignSelf: 'flex-start',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#1a73e8',
    fontWeight: '600',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#ff0000',
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
});