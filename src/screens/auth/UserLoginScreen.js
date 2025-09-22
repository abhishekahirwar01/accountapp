// src/screens/auth/UserLoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function UserLoginScreen({ navigation }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const HARD_USER = {
    userId: 'user',
    password: '123',
    role: 'admin',
    userName: 'Akash Demo',
  };

  const onSubmit = () => {
    if (!userId.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter User ID and Password');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      if (userId === HARD_USER.userId && password === HARD_USER.password) {
        Alert.alert('Login Successful', `Welcome back, ${HARD_USER.userName}!`);

        if (HARD_USER.role === 'master') {
          navigation?.replace('AdminDashboard');
        } else if (
          HARD_USER.role === 'admin' ||
          HARD_USER.role === 'customer' ||
          HARD_USER.role === 'client'
        ) {
          navigation?.replace('Dashboard');
        } else {
          navigation?.replace('UserDashboard');
        }
      } else {
        Alert.alert('Login Failed', 'Invalid User ID or Password');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Login</Text>

      <TextInput
        placeholder="User ID"
        value={userId}
        onChangeText={setUserId}
        style={[styles.input, { paddingRight: 40 }]}
        editable={!isLoading}
        autoCapitalize="none"
        autoCorrect={false}
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
          activeOpacity={0.7}
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
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
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
    marginBottom: 28,
    color: '#1e293b',
    textAlign: 'center',
  },
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
    justifyContent: 'center',
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
