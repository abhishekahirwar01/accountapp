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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast, { ErrorToast } from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function SendOtpScreen({ navigation }) {
  const [method, setMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');

  // Keep USERS data for mock functionality
  const USERS = [
    {
      role: 'master',
      email: 'master01@gmail.com',
      mobile: '1111111111',
      otp: '111111',
    },
    {
      role: 'client',
      email: 'client01@gmail.com',
      mobile: '2222222222',
      otp: '222222',
    },
    {
      role: 'user',
      email: 'user01@gmail.com',
      mobile: '3333333333',
      otp: '333333',
    },
  ];

  const handleSendOtp = () => {
    const identifier = method === 'email' ? email.trim() : mobile.trim();
    const user = USERS.find(
      u => (method === 'email' ? u.email : u.mobile) === identifier,
    );

    if (user) {
      // Navigate to OTP screen with user details and OTP
      navigation.navigate('OTPVerificationScreen', {
        method,
        email,
        mobile,
        otp: user.otp,
        role: user.role,
      });
    } else {
      Toast.show({
        type: 'custom_error',
        text1: 'Error',
        text2: 'No account found with this Email or Mobile.',
        position: 'top',
      });
    }
  };

  const switchMethod = newMethod => {
    setMethod(newMethod);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />
      
      <View style={styles.flatScreen}>
        {/* Professional Header Section */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>
        
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              // Removed flexGrow: 1 from contentContainerStyle to top-align content
              contentContainerStyle={styles.container}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentArea}>
                <Text style={styles.header}>OTP Verification</Text>
                <Text style={styles.subHeader}>
                  Choose a method to receive your One-Time Password.
                </Text>

                {/* Toggle Buttons */}
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
                      method === 'mobile' && styles.active,
                    ]}
                    onPress={() => switchMethod('mobile')}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        method === 'mobile' && styles.activeText,
                      ]}
                    >
                      Mobile
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Email/Mobile Input */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.label}>
                    {method === 'email' ? 'Email Address' : 'Mobile Number'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={
                      method === 'email' ? 'name@company.com' : '+91 9876543210'
                    }
                    value={method === 'email' ? email : mobile}
                    onChangeText={method === 'email' ? setEmail : setMobile}
                    keyboardType={
                      method === 'email' ? 'email-address' : 'phone-pad'
                    }
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Send OTP Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (method === 'email' ? !email.trim() : !mobile.trim()) &&
                      styles.buttonDisabled,
                  ]}
                  onPress={handleSendOtp}
                  disabled={method === 'email' ? !email.trim() : !mobile.trim()}
                >
                  <Text style={styles.primaryButtonText}>Send OTP</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
        
        {/* Toast Component */}
        <Toast
          config={{
            custom_error: props => (
              <ErrorToast
                {...props}
                style={{
                  borderLeftColor: '#EF4444',
                  borderRadius: 8, // Slightly reduced radius
                  backgroundColor: '#FEE2E2',
                  paddingHorizontal: 16,
                }}
                text1Style={{
                  fontSize: 15, // Slightly adjusted font size
                  fontWeight: '700',
                  color: '#B91C1C',
                }}
                text2Style={{ fontSize: 13, color: '#B91C1C' }}
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

  // --- Professional Header Styles ---
  headerContainer: {
    paddingHorizontal: 16, // Padding to align with content
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6', // Subtle separator line
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 40, // Defined touch area
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4, // Pulling back for optical alignment
  },
  // --- Container & Content ---
  container: {
    // Removed flexGrow: 1 to ensure content is top-aligned
    paddingHorizontal: 24, // Main screen padding
    paddingTop: 10, // Small top padding for visual break after header
  },
  contentArea: {
    // No specific background/padding here, inherits screen padding
  },
  
  // --- Typography ---
  header: {
    fontSize: 32, // More dominant header
    fontWeight: '800', // Extra bold
    textAlign: 'left',
    marginBottom: 10,
    color: '#1F2937', // Darker text
    marginTop: 20, // Separation from the top/header
  },
  subHeader: {
    fontSize: 16,
    textAlign: 'left',
    color: '#6B7280',
    marginBottom: 40, // Increased bottom margin for breathing room
    lineHeight: 24,
  },

  // --- Toggle Styles ---
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30, // Increased separation
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  active: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.15, // Lighter shadow
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  toggleText: { color: '#374151', fontWeight: '600', fontSize: 15 }, // Adjusted font weight/size
  activeText: { color: '#fff', fontWeight: '700' },
  
  // --- Input Styles ---
  label: { fontSize: 14, color: '#374151', marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: '#F9FAFB', // Very light background for the input field
    borderRadius: 12,
    padding: 16,
    color: '#1F2937',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // --- Button Styles ---
  primaryButton: {
    backgroundColor: '#4F46E5',
    padding: 18,
    borderRadius: 12,
    marginVertical: 30, // Good vertical separation
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  buttonDisabled: {
    backgroundColor: '#A5B4FC',
    shadowOpacity: 0,
    elevation: 0,
  },
});