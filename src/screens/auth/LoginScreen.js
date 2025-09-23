// src/screens/auth/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import AdminLoginScreen from './AdminLoginScreen';
import ClientLoginScreen from './ClientLoginScreen';
import UserLoginScreen from './UserLoginScreen';

export default function LoginScreen({ navigation }) { // <-- accept navigation
  const [activeRole, setActiveRole] = useState('user'); // default role

  const roles = [
    { id: 'user', label: 'User' },
    { id: 'client', label: 'Client' },
    { id: 'admin', label: 'Admin' },
  ];

  const renderForm = () => {
    // pass navigation prop to child screens
    if (activeRole === 'admin') return <AdminLoginScreen navigation={navigation} />;
    if (activeRole === 'client') return <ClientLoginScreen navigation={navigation} />;
    return <UserLoginScreen navigation={navigation} />; // default user
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>AccounTech Pro</Text>
        <Text style={styles.subtitle}>Select Login Type</Text>

        <View style={styles.roleContainer}>
          {roles.map(({ id, label }) => (
            <TouchableOpacity
              key={id}
              style={[
                styles.roleItem,
                activeRole === id && styles.roleItemActive,
              ]}
              onPress={() => setActiveRole(id)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.radioOuter,
                  activeRole === id && styles.radioOuterActive,
                ]}
              >
                {activeRole === id && <View style={styles.radioInner} />}
              </View>
              <Text
                style={[
                  styles.roleText,
                  activeRole === id && styles.roleTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.formContainer}>{renderForm()}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 6,
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 24,
    color: '#475569',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  roleItemActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
    shadowOpacity: 0.2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#94a3b8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioOuterActive: {
    borderColor: '#fff',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  roleText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
  },
  roleTextActive: {
    color: '#fff',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
});
