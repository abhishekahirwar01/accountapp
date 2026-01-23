import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

const SupportForm = ({ isVisible, onClose, fullScreen = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  const subjectOptions = [
    { value: 'Bug Report', emoji: '🐛' },
    { value: 'Feature Request', emoji: '💡' },
    { value: 'Account Help', emoji: '🔐' },
    { value: 'Billing Question', emoji: '💰' },
    { value: 'Other', emoji: '❓' },
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    if (loading) return;
    setFormData({ name: '', email: '', subject: '', message: '' });
    setResult(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.subject ||
      !formData.message.trim()
    ) {
      Alert.alert('Required', 'Please fill all fields');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        'https://accountbackend.sharda.co.in/api/support/contact',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        },
      );

      const responseData = await response.json();

      if (response.ok) {
        setResult({
          type: 'success',
          message: responseData.message || 'We received your message!',
        });
        setFormData({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => handleClose(), 3000);
      } else {
        setResult({
          type: 'error',
          message: responseData.message || 'Submission failed',
        });
      }
    } catch (error) {
      setResult({ type: 'error', message: 'Connection error' });
    } finally {
      setLoading(false);
    }
  };

  if (!fullScreen) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Translucent false ensures no weird color overlay on status bar */}
      <StatusBar
        barStyle="light-content"
        backgroundColor="#3B82F6"
        translucent={false}
      />

      {/* Clean Flat Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Support Center</Text>
          <Text style={styles.headerSubtitle}>How can we help you today?</Text>
        </View>
        <Ionicons
          name="help-circle-outline"
          size={24}
          color="rgba(255,255,255,0.7)"
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={18}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={formData.name}
                onChangeText={t => handleChange('name', t)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={t => handleChange('email', t)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Subject</Text>
            <TouchableOpacity
              style={styles.inputWrapper}
              onPress={() => setShowSubjectPicker(true)}
            >
              <Ionicons
                name="list-outline"
                size={18}
                color="#94A3B8"
                style={styles.inputIcon}
              />
              <Text
                style={[
                  styles.input,
                  {
                    color: formData.subject ? '#1E293B' : '#94A3B8',
                    paddingTop: 14,
                  },
                ]}
              >
                {formData.subject || 'What is this about?'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Message</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe your issue in detail..."
              multiline
              numberOfLines={6}
              value={formData.message}
              onChangeText={t => handleChange('message', t)}
            />
          </View>

          {result && (
            <View
              style={[
                styles.alert,
                result.type === 'success'
                  ? styles.successAlert
                  : styles.errorAlert,
              ]}
            >
              <Ionicons
                name={
                  result.type === 'success'
                    ? 'checkmark-circle'
                    : 'alert-circle'
                }
                size={20}
                color={result.type === 'success' ? '#059669' : '#DC2626'}
              />
              <Text
                style={[
                  styles.alertText,
                  { color: result.type === 'success' ? '#065F46' : '#991B1B' },
                ]}
              >
                {result.message}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Send Message</Text>
                <Ionicons name="send" size={18} color="#FFF" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color="#64748B" />
              <Text style={styles.infoText}>Mon-Sat, 10AM - 7PM IST</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="flash-outline" size={16} color="#64748B" />
              <Text style={styles.infoText}>
                Response time: Typically within 24 hours
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showSubjectPicker} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowSubjectPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose a Subject</Text>
            {subjectOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={styles.option}
                onPress={() => {
                  handleChange('subject', opt.value);
                  setShowSubjectPicker(false);
                }}
              >
                <Text style={styles.optionText}>
                  {opt.emoji} {opt.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    // Rounded corners removed
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTextContainer: { flex: 1 },
  headerTitle: { color: '#FFF', fontSize: 19, fontWeight: 'bold' },
  headerSubtitle: { color: '#DBEAFE', fontSize: 12, marginTop: 1 },
  scrollContent: { padding: 20, flexGrow: 1 },
  inputGroup: { marginBottom: 18 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#1E293B' },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    height: 120,
    textAlignVertical: 'top',
  },
  alert: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    marginBottom: 15,
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  successAlert: { backgroundColor: '#D1FAE5' },
  errorAlert: { backgroundColor: '#FEE2E2' },
  alertText: { flex: 1, fontWeight: '500', fontSize: 14 },
  submitBtn: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
    gap: 10,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  disabledBtn: { backgroundColor: '#93C5FD' },
  infoCard: {
    marginTop: 'auto',
    paddingTop: 40,
    paddingBottom: 10,
    alignItems: 'center',
    gap: 8,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 11, color: '#94A3B8' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  option: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionText: { fontSize: 16, color: '#334155' },
});

export default SupportForm;
