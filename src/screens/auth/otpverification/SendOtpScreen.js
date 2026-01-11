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
  Dimensions, // हालांकि फिक्स्ड वैल्यू का उपयोग किया गया है, Dimensions अभी भी उपयोगी है
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast, { ErrorToast } from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

// स्क्रीन की चौड़ाई (width)
const SCREEN_WIDTH = Dimensions.get('window').width;

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

    // Basic Validation
    if (!identifier) {
      Toast.show({
        type: 'custom_error',
        text1: 'Validation Error',
        text2: `Please enter your ${
          method === 'email' ? 'Email' : 'Mobile Number'
        }.`,
        position: 'top',
      });
      return;
    }

    const user = USERS.find(
      u => (method === 'email' ? u.email : u.mobile) === identifier,
    );

    if (user) {
      // Navigate to OTP screen with user details and OTP
      navigation.navigate('OTPVerificationScreen', {
        method,
        identifier: identifier, // 'email' या 'mobile' वैल्यू भेजें
        otp: user.otp, // Mock OTP
        role: user.role,
      });
      Toast.show({
        type: 'success',
        text1: 'OTP Sent (Mock)',
        text2: `OTP is ${user.otp}. Redirecting to verification screen.`,
        position: 'top',
      });
    } else {
      Toast.show({
        type: 'custom_error',
        text1: 'Error',
        text2: 'No account found with this identifier.',
        position: 'top',
      });
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 10} // कम किया गया offset
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.container}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Header: Back Button and OTP Verification Title in one line */}
              <View style={styles.headerContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={22} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.header}>OTP Verification</Text>
              </View>

              {/* Sub Header (Title के तुरंत बाद) */}
              <Text style={styles.subHeader}>
                Choose a method to receive your One-Time Password.
              </Text>

              <View style={styles.contentArea}>
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
                <View style={{ marginBottom: 15 }}>
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
                  borderRadius: 6, // Compact
                  backgroundColor: '#FEE2E2',
                  paddingHorizontal: 12, // Compact
                }}
                text1Style={{
                  fontSize: 14, // Compact
                  fontWeight: '700',
                  color: '#B91C1C',
                }}
                text2Style={{ fontSize: 12, color: '#B91C1C' }} // Compact
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

  // --- Header/Title Section ---
  headerContainer: {
    flexDirection: 'row', // एक ही लाइन में लाने के लिए
    alignItems: 'center', // वर्टिकली सेंटर
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 30, // छोटा किया गया
    height: 30, // छोटा किया गया
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10, // Title से दूरी
  },
  header: {
    fontSize: 24, // साइज़ 32 से 24 किया गया
    fontWeight: '700', // थोड़ा कम बोल्ड
    color: '#1F2937',
    // marginTop और marginBottom हटा दिया गया क्योंकि यह अब row में है
  },
  // --- Container & Content ---
  container: {
    paddingHorizontal: 16, // Padding 24 से 16 किया गया
  },
  contentArea: {
    paddingTop: 10, // Subheader के बाद से content के लिए स्पेस
  },

  // --- Typography ---
  subHeader: {
    fontSize: 14, // साइज़ 16 से 14 किया गया
    textAlign: 'left',
    color: '#6B7280',
    marginBottom: 20, // Margin 40 से 20 किया गया
    lineHeight: 20, // LineHeight 24 से 20 किया गया
    paddingHorizontal: 16, // Screen padding के साथ मैच करने के लिए
    paddingTop: 10, // Header के बाद स्पेस
  },

  // --- Toggle Styles ---
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20, // Margin 30 से 20 किया गया
    backgroundColor: '#F3F4F6',
    borderRadius: 8, // छोटा किया गया
    padding: 3, // छोटा किया गया
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10, // Padding 12 से 10 किया गया
    borderRadius: 7, // छोटा किया गया
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
  toggleText: { color: '#374151', fontWeight: '600', fontSize: 14 }, // Font 15 से 14 किया गया
  activeText: { color: '#fff', fontWeight: '700' },

  // --- Input Styles ---
  label: { fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: '600' }, // Font 14 से 13 किया गया
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8, // छोटा किया गया
    padding: 14, // Padding 16 से 14 किया गया
    color: '#1F2937',
    fontSize: 15, // Font 16 से 15 किया गया
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // --- Button Styles ---
  primaryButton: {
    backgroundColor: '#4F46E5',
    padding: 14, // Padding 18 से 14 किया गया
    borderRadius: 8, // छोटा किया गया
    marginVertical: 20, // Margin 30 से 20 किया गया
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 }, // छोटा किया गया
    shadowRadius: 6, // छोटा किया गया
    elevation: 4,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 }, // Font 18 से 16 किया गया
  buttonDisabled: {
    backgroundColor: '#A5B4FC',
    shadowOpacity: 0,
    elevation: 0,
  },
});
