import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function ClientLoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [tab, setTab] = useState('password'); // "password" or "otp"
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const HARD_USERNAME = 'user';
  const HARD_PASSWORD = '123';
  const HARD_OTP = '321';

  useEffect(() => {
    if (resendIn <= 0) return;
    const interval = setInterval(() => setResendIn(n => n - 1), 1000);
    return () => clearInterval(interval);
  }, [resendIn]);

  // Password login
  const onSubmit = () => {
    setIsLoading(true);
    setTimeout(() => {
      if (username === HARD_USERNAME && password === HARD_PASSWORD) {
        setMessageType('success');
        setMessage(`Login Successful! Welcome back, ${username}`);
        setTimeout(() => {
          navigation.replace('Dashboard');
        }, 1000);
      } else {
        setMessageType('error');
        setMessage('Invalid username or password');
      }
      setIsLoading(false);
    }, 1000);
  };

  // Send OTP
  const onSendOtp = () => {
    if (!username) {
      setMessageType('error');
      setMessage('Enter your username first');
      return;
    }
    setSendingOtp(true);
    setTimeout(() => {
      setMessageType('success');
      setMessage(`OTP Sent: ${HARD_OTP}`);
      setResendIn(30);
      setSendingOtp(false);
    }, 500);
  };

  // OTP login
  const onSubmitOtp = () => {
    setIsLoading(true);
    setTimeout(() => {
      if (username === HARD_USERNAME && otp === HARD_OTP) {
        setMessageType('success');
        setMessage(`OTP Verified! Welcome back, ${username}`);
        setTimeout(() => {
          navigation.replace('Dashboard');
        }, 1000);
      } else {
        setMessageType('error');
        setMessage('Invalid OTP');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Client Login</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setTab('password')}
          style={[styles.tabButton, tab === 'password' && styles.activeTab]}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.tabText, tab === 'password' && styles.activeTabText]}
          >
            Password
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('otp')}
          style={[styles.tabButton, tab === 'otp' && styles.activeTab]}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'otp' && styles.activeTabText]}>
            OTP
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inline message */}
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

      {tab === 'password' && (
        <View style={styles.form}>
          <TextInput
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            editable={!isLoading}
            autoCapitalize="none"
            placeholderTextColor="#94a3b8"
            keyboardType="visible-password"
            textContentType="username"
          />
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.input}
              editable={!isLoading}
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
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {tab === 'otp' && (
        <View style={styles.form}>
          <TextInput
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            editable={!isLoading && !sendingOtp}
            autoCapitalize="none"
            placeholderTextColor="#94a3b8"
            keyboardType="visible-password"
            textContentType="username"
          />
          <TouchableOpacity
            style={[
              styles.button,
              (sendingOtp || resendIn > 0 || !username) &&
                styles.buttonDisabled,
            ]}
            onPress={onSendOtp}
            disabled={sendingOtp || resendIn > 0 || !username}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Send OTP'}
            </Text>
          </TouchableOpacity>
          <TextInput
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="numeric"
            style={styles.input}
            editable={!isLoading}
            placeholderTextColor="#94a3b8"
            maxLength={HARD_OTP.length} // Dynamic max length
          />
          <TouchableOpacity
            style={[
              styles.button,
              (isLoading || otp.length !== HARD_OTP.length) &&
                styles.buttonDisabled, // Dynamic check
            ]}
            onPress={onSubmitOtp}
            disabled={isLoading || otp.length !== HARD_OTP.length}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify & Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#1e293b',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
  },
  activeTab: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  form: {},
  input: {
    backgroundColor: '#f1f5f9',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 16,
    color: '#334155',
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
});
