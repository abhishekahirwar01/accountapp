import React, { useState, useEffect } from 'react';
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

// Dummy current user check (replace with AsyncStorage if needed)
const getCurrentUser = () => null;

export default function UserLoginScreen({ navigation }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Hardcoded users
  const HARD_USERS = [
    {
      userId: 'master',
      password: '123',
      role: 'master',
      userName: 'Master Admin',
    },
    {
      userId: 'admin',
      password: '123',
      role: 'admin',
      userName: 'Admin User',
    },
    {
      userId: 'customer',
      password: '123',
      role: 'customer',
      userName: 'Customer Demo',
    },
    {
      userId: 'client',
      password: '123',
      role: 'client',
      userName: 'Client Demo',
    },
  ];

  // Auto-redirect if already logged in
  useEffect(() => {
    const u = getCurrentUser();
    if (!u) return;

    handleRedirect(u.role);
  }, [navigation]);

  const handleRedirect = role => {
    if (role === 'master') {
      navigation.replace('AdminDashboard');
    } else if (role === 'admin') {
      navigation.replace('Dashboard'); // ya alag bhi rakh sakte ho
    } else if (role === 'customer') {
      navigation.replace('Dashboard');
    } else {
      navigation.replace('UserDashboard'); // default
    }
  };

  const onSubmit = () => {
    if (!userId.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter User ID and Password');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const foundUser = HARD_USERS.find(
        u => u.userId === userId && u.password === password,
      );

      if (foundUser) {
        Alert.alert('Login Successful', `Welcome back, ${foundUser.userName}!`);
        handleRedirect(foundUser.role);
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
    justifyContent: 'center',
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
