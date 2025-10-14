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
  ScrollView,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { navigateByRole } from '../../utils/roleNavigation';

// ✅ Same background as AdminLoginScreen
const backgroundPath = require('../../../assets/images/bg1.png');

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
        visibilityTime: 500,
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
          visibilityTime: 500,
        });

        setTimeout(() => {
          navigateByRole(navigation, foundUser.role);
        }, 500);
      } else {
        Toast.show({
          type: 'custom_error',
          text1: 'Login Failed',
          text2: 'Invalid User ID or Password',
          visibilityTime: 500,
        });
      }
    }, 500);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ✅ Background same as AdminLoginScreen */}
      <ImageBackground
        source={backgroundPath}
        style={styles.background}
        resizeMode="cover"
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              {/* Icon + Title */}
              <View style={styles.titleContainer}>
                <Ionicons
                  name="person-circle-outline"
                  size={28}
                  color="#2563eb"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.title}>User Sign In</Text>
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
                keyboardType="visible-password"
                placeholderTextColor="#94a3b8"
              />

              {/* Password */}
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
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
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size={24} />
                ) : (
                  <View style={styles.gradientButton}>
                    <Text style={styles.buttonText}>Sign In</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color="#fff"
                      style={styles.buttonIcon}
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Toast Config */}
        <Toast
          config={{
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
          }}
        />
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    padding: 18,
    borderRadius: 14,
    fontSize: 16,
    color: '#0f172a',
    borderWidth: 2,
    borderColor: '#f1f5f9',
    marginBottom: 20,
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
    backgroundColor: '#2563eb',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
