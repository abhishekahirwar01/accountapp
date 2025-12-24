import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ResetPasswordDialog({
  open,
  onClose,
  userId,
  userName,
}) {
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const handleSubmit = async () => {
    if (!pw1 || pw1.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (pw1 !== pw2) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');

      const res = await fetch(
        `${BASE_URL}/api/users/${userId}/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token ?? ''}`,
          },
          body: JSON.stringify({ newPassword: pw1 }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to reset password');

      Alert.alert('Success', `Password updated for ${userName ?? 'user'}.`);
      handleClose();
    } catch (e) {
      Alert.alert('Reset Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPw1('');
    setPw2('');
    setShowPw1(false);
    setShowPw2(false);
    onClose();
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>
                Reset Password{userName ? ` — ${userName}` : ''}
              </Text>
            </View>

            <View style={styles.body}>
              {/* New Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.input}
                    secureTextEntry={!showPw1}
                    value={pw1}
                    onChangeText={setPw1}
                    placeholder="Enter new password"
                    placeholderTextColor="#94a3b8"
                    // --- Added for Mobile Password Manager Integration ---
                    textContentType="newPassword"
                    autoComplete="password-new"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPw1(!showPw1)}
                    style={styles.eyeIcon}
                  >
                    <Icon
                      name={showPw1 ? 'eye-off' : 'eye'}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.input}
                    secureTextEntry={!showPw2}
                    value={pw2}
                    onChangeText={setPw2}
                    placeholder="Confirm new password"
                    placeholderTextColor="#94a3b8"
                    // --- Added for Mobile Password Manager Integration ---
                    textContentType="newPassword"
                    autoComplete="password-new"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPw2(!showPw2)}
                    style={styles.eyeIcon}
                  >
                    <Icon
                      name={showPw2 ? 'eye-off' : 'eye'}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                onPress={handleClose}
                disabled={loading}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={[styles.updateBtn, loading && styles.disabledBtn]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.updateText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: { width: '100%', maxWidth: 400 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
  },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  body: { padding: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#475569', marginBottom: 6 },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e293b',
  },
  eyeIcon: { padding: 10 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { color: '#64748b', fontWeight: '500' },
  updateBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: { opacity: 0.6 },
  updateText: { color: '#fff', fontWeight: '600' },
});
