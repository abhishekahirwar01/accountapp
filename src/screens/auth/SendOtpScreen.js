import React, { useState } from 'react';
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
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast, { ErrorToast } from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
// import { BASE_URL } from '../../config';
const BASE_URL = 'https://accountapp-backend-ooxj.vercel.app';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function SendOtpScreen({ navigation }) {
  const [method, setMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const USERS = [
    {
      role: 'master',
      email: 'master01@gmail.com',
      userId: 'master01',
      otp: '111111',
    },
    {
      role: 'client',
      email: 'client01@gmail.com',
      userId: 'client01',
      otp: '222222',
    },
    {
      role: 'user',
      email: 'user01@gmail.com',
      userId: 'user01',
      otp: '333333',
    },
  ];

  const isMasterIdentifier = identifier => {
    const normalized = String(identifier).trim().toLowerCase();
    return normalized === 'master01@gmail.com' || normalized === 'master01';
  };

  const handleSendOtp = async () => {
    const identifier = method === 'email' ? email.trim() : userId.trim();

    if (!identifier) {
      Toast.show({
        type: 'custom_error',
        text1: 'Validation Error',
        text2: `Please enter your ${method === 'email' ? 'Email' : 'User ID'}.`,
        position: 'top',
      });
      return;
    }

    // Master path: hardcoded
    if (isMasterIdentifier(identifier)) {
      const master = USERS.find(u => u.role === 'master');
      navigation.navigate('OTPVerificationScreen', {
        method,
        identifier,
        email: master.email,
        otp: master.otp,
        role: 'master',
        fromServer: false,
      });
      Toast.show({
        type: 'success',
        text1: 'OTP Sent (Dev)',
        text2: `Master OTP is ${master.otp}. Redirecting to verification screen.`,
        position: 'top',
      });
      return;
    }

    // Non-master: call backend API
    setLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL.replace(/\/$/, '')}/api/auth/request-user-otp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier }),
        },
      );

      const json = await res.json();

      if (!res.ok) {
        const message = json?.message || `Request failed (${res.status})`;
        Toast.show({
          type: 'custom_error',
          text1: 'Failed to send OTP',
          text2: message,
          position: 'top',
        });
        setLoading(false);
        return;
      }

      // Get email and userName from response
      const responseEmail = json?.email || '';
      const responseUserName =
        json?.userName || json?.clientUsername || identifier;

      // Navigate to OTP verification screen with email
      navigation.navigate('OTPVerificationScreen', {
        method,
        identifier,
        email: responseEmail, // Pass email from backend response
        userName: responseUserName, // Pass userName for display
        otp: json?.otp || null, // dev convenience
        role: undefined,
        fromServer: true,
      });

      Toast.show({
        type: 'success',
        text1: 'OTP Sent',
        text2: json?.message || 'OTP sent to registered email.',
        position: 'top',
      });
    } catch (err) {
      console.error('request-user-otp error:', err);
      Toast.show({
        type: 'custom_error',
        text1: 'Network Error',
        text2: 'Could not reach server. Please try again.',
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  const switchMethod = newMethod => {
    setMethod(newMethod);
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.flatScreen}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 10}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.container}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.headerContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={22} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.header}>OTP Verification</Text>
              </View>

              <Text style={styles.subHeader}>
                Choose a method to receive your One-Time Password.
              </Text>

              <View style={styles.contentArea}>
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      method === 'email' && styles.active,
                    ]}
                    onPress={() => switchMethod('email')}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        method === 'email' && styles.activeText,
                      ]}
                    >
                      Email
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      method === 'userId' && styles.active,
                    ]}
                    onPress={() => switchMethod('userId')}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        method === 'userId' && styles.activeText,
                      ]}
                    >
                      User ID
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ marginBottom: 15 }}>
                  <Text style={styles.label}>
                    {method === 'email' ? 'Email Address' : 'User ID'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={
                      method === 'email'
                        ? 'name@company.com'
                        : 'Enter your user id'
                    }
                    value={method === 'email' ? email : userId}
                    onChangeText={method === 'email' ? setEmail : setUserId}
                    keyboardType={
                      method === 'email' ? 'email-address' : 'default'
                    }
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (method === 'email' ? !email.trim() : !userId.trim()) &&
                      styles.buttonDisabled,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleSendOtp}
                  disabled={
                    loading ||
                    (method === 'email' ? !email.trim() : !userId.trim())
                  }
                >
                  <Text style={styles.primaryButtonText}>
                    {loading ? 'Sending...' : 'Send OTP'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        <Toast
          config={{
            custom_error: props => (
              <ErrorToast
                {...props}
                style={{
                  borderLeftColor: '#EF4444',
                  borderRadius: 6,
                  backgroundColor: '#FEE2E2',
                  paddingHorizontal: 12,
                }}
                text1Style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#B91C1C',
                }}
                text2Style={{ fontSize: 12, color: '#B91C1C' }}
              />
            ),
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  flatScreen: { flex: 1, backgroundColor: '#ffffff' },

  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  container: {
    paddingHorizontal: 16,
  },
  contentArea: {
    paddingTop: 10,
  },

  subHeader: {
    fontSize: 14,
    textAlign: 'left',
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 3,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 7,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  active: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  toggleText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  activeText: { color: '#fff', fontWeight: '700' },

  label: { fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 14,
    color: '#1F2937',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  primaryButton: {
    backgroundColor: '#4F46E5',
    padding: 14,
    borderRadius: 8,
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  buttonDisabled: {
    backgroundColor: '#A5B4FC',
    shadowOpacity: 0,
    elevation: 0,
  },
});
