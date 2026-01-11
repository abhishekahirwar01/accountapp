// components/support/SupportForm.js
import React, { useState, useRef } from 'react';
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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { BASE_URL } from '../../config';

const SupportForm = ({ isVisible, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const scrollViewRef = useRef(null);

  const subjectOptions = [
    { value: 'Bug Report', emoji: '🐛' },
    { value: 'Feature Request', emoji: '💡' },
    { value: 'Account Help', emoji: '🔐' },
    { value: 'Billing Question', emoji: '💰' },
    { value: 'Other', emoji: '❓' }
  ];

  const handleSubmit = async () => {
    console.log('Submit button pressed');
    
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      Alert.alert('Required', 'Please enter a valid email');
      return;
    }
    if (!formData.subject.trim()) {
      Alert.alert('Required', 'Please select a subject');
      return;
    }
    if (!formData.message.trim()) {
      Alert.alert('Required', 'Please enter your message');
      return;
    }

    console.log('Form validation passed, submitting...');
    console.log('Form data:', formData);
    
    setLoading(true);
    setResult(null); // Clear any previous results
    
    try {
      const token = await AsyncStorage.getItem('token');
      
      console.log('Token retrieved:', token ? 'Exists' : 'Missing');
      
      if (!token) {
        Alert.alert('Authentication Required', 'Please login again to submit support request.');
        setLoading(false);
        return;
      }

      // For testing - uncomment this block to test without backend
      /*
      console.log('Using mock endpoint for testing');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
      const mockResponse = {
        success: true,
        message: 'Your message has been sent successfully!'
      };
      console.log('Mock response:', mockResponse);
      
      if (mockResponse.success) {
        setResult({ 
          type: 'success', 
          message: mockResponse.message
        });
        
        // Reset form immediately
        resetForm();
        
        // Close modal after delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error('Mock error occurred');
      }
      */
      
      // Real API call - comment this block when using mock
      console.log('Making API call to:', `${BASE_URL}/api/support/contact`);
      
      const response = await fetch(`${BASE_URL}/api/support/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      
      console.log('Response status:', response.status);
      
      const responseData = await response.json();
      console.log('Response data:', responseData);
      
      if (response.ok) {
        setResult({ 
          type: 'success', 
          message: responseData.message || 'Your message has been sent successfully!'
        });
        
        // Reset form immediately
        resetForm();
        
        // Close modal after delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setResult({ 
          type: 'error', 
          message: responseData.message || `Failed to send message. Status: ${response.status}`
        });
      }
      
    } catch (error) {
      console.error('Support form error:', error);
      setResult({ 
        type: 'error', 
        message: `Network error: ${error.message}. Please check your connection and try again.`
      });
    } finally {
      setLoading(false);
      // Clear error result after 5 seconds (only error messages)
      if (result?.type === 'error') {
        setTimeout(() => {
          setResult(null);
        }, 5000);
      }
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    console.log('Resetting form');
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: '',
    });
    setResult(null);
    setLoading(false);
    setShowSubjectPicker(false);
  };

  const handleClose = () => {
    if (loading) {
      Alert.alert(
        'Submission in Progress',
        'Please wait while we send your message.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    resetForm();
    onClose();
  };

  const selectSubject = (subject) => {
    handleChange('subject', subject);
    setShowSubjectPicker(false);
  };

  const handleOverlayPress = () => {
    // Dismiss keyboard when tapping on overlay
    Keyboard.dismiss();
    
    // Only close modal if not loading and not showing subject picker
    if (!loading && !showSubjectPicker) {
      handleClose();
    }
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback 
        onPress={handleOverlayPress}
        accessible={false}
      >
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableWithoutFeedback 
              onPress={() => {}}
              accessible={false}
            >
              <View style={styles.modal}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="help-circle" size={24} color="#FFFFFF" />
                    </View>
                    <View>
                      <Text style={styles.title}>Support Center</Text>
                      <Text style={styles.subtitle}>We're here to help you!</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.closeButton,
                      loading && styles.closeButtonDisabled
                    ]}
                    onPress={handleClose}
                    disabled={loading}
                  >
                    <Ionicons 
                      name="close" 
                      size={24} 
                      color={loading ? '#93C5FD' : '#FFFFFF'} 
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  ref={scrollViewRef}
                  style={styles.scrollView}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                >
                  <TouchableWithoutFeedback 
                    onPress={() => Keyboard.dismiss()}
                    accessible={false}
                  >
                    <View style={styles.form}>
                      {/* Result Message */}
                      {result && (
                        <View style={[
                          styles.resultContainer,
                          result.type === 'success' ? styles.successContainer : styles.errorContainer
                        ]}>
                          <View style={[
                            styles.resultIconContainer,
                            result.type === 'success' ? styles.successIconContainer : styles.errorIconContainer
                          ]}>
                            <Ionicons 
                              name={result.type === 'success' ? 'checkmark-circle' : 'alert-circle'} 
                              size={20} 
                              color={result.type === 'success' ? '#10B981' : '#EF4444'} 
                            />
                          </View>
                          <Text style={[
                            styles.resultText,
                            result.type === 'success' ? styles.successText : styles.errorText
                          ]}>
                            {result.message}
                          </Text>
                        </View>
                      )}

                      {/* Name Field */}
                      <View style={styles.fieldContainer}>
                        <View style={styles.labelRow}>
                          <Ionicons name="person" size={16} color="#3B82F6" />
                          <Text style={styles.label}>Your Name *</Text>
                        </View>
                        <TextInput
                          style={[
                            styles.input,
                            loading && styles.inputDisabled
                          ]}
                          placeholder="Enter your full name"
                          placeholderTextColor="#9CA3AF"
                          value={formData.name}
                          onChangeText={(text) => handleChange('name', text)}
                          editable={!loading}
                          returnKeyType="next"
                          onFocus={() => {
                            // Scroll to input when focused
                            setTimeout(() => {
                              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                            }, 100);
                          }}
                        />
                      </View>

                      {/* Email Field */}
                      <View style={styles.fieldContainer}>
                        <View style={styles.labelRow}>
                          <Ionicons name="mail" size={16} color="#3B82F6" />
                          <Text style={styles.label}>Email Address *</Text>
                        </View>
                        <TextInput
                          style={[
                            styles.input,
                            loading && styles.inputDisabled
                          ]}
                          placeholder="your@email.com"
                          placeholderTextColor="#9CA3AF"
                          value={formData.email}
                          onChangeText={(text) => handleChange('email', text)}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          editable={!loading}
                          returnKeyType="next"
                          onFocus={() => {
                            setTimeout(() => {
                              scrollViewRef.current?.scrollTo({ y: 50, animated: true });
                            }, 100);
                          }}
                        />
                      </View>

                      {/* Subject Field */}
                      <View style={styles.fieldContainer}>
                        <View style={styles.labelRow}>
                          <Ionicons name="document-text" size={16} color="#3B82F6" />
                          <Text style={styles.label}>Subject *</Text>
                        </View>
                        <View style={styles.pickerContainer}>
                          <TextInput
                            style={[
                              styles.pickerInput,
                              loading && styles.inputDisabled
                            ]}
                            placeholder="What can we help you with?"
                            placeholderTextColor="#9CA3AF"
                            value={formData.subject ? `${subjectOptions.find(o => o.value === formData.subject)?.emoji} ${formData.subject}` : ''}
                            editable={false}
                            pointerEvents="none"
                          />
                          <Ionicons 
                            name="chevron-down" 
                            size={20} 
                            color={loading ? "#9CA3AF" : "#6B7280"} 
                            style={styles.pickerIcon} 
                          />
                          <TouchableOpacity
                            style={styles.pickerTouchable}
                            onPress={() => !loading && setShowSubjectPicker(true)}
                            disabled={loading}
                          />
                        </View>
                      </View>

                      {/* Subject Picker Modal */}
                      <Modal
                        visible={showSubjectPicker}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowSubjectPicker(false)}
                      >
                        <TouchableOpacity 
                          style={styles.pickerOverlay}
                          activeOpacity={1}
                          onPress={() => setShowSubjectPicker(false)}
                        >
                          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <View style={styles.pickerModal}>
                              <View style={styles.pickerHeader}>
                                <Text style={styles.pickerTitle}>Select Subject</Text>
                                <TouchableOpacity 
                                  onPress={() => setShowSubjectPicker(false)}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <Ionicons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>
                              </View>
                              <ScrollView 
                                style={styles.pickerScrollView}
                                showsVerticalScrollIndicator={false}
                              >
                                {subjectOptions.map((option) => (
                                  <TouchableOpacity
                                    key={option.value}
                                    style={[
                                      styles.pickerOption,
                                      formData.subject === option.value && styles.pickerOptionActive
                                    ]}
                                    onPress={() => selectSubject(option.value)}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.pickerEmoji}>
                                      {option.emoji}
                                    </Text>
                                    <Text style={[
                                      styles.pickerOptionText,
                                      formData.subject === option.value && styles.pickerOptionTextActive
                                    ]}>
                                      {option.value}
                                    </Text>
                                    {formData.subject === option.value && (
                                      <Ionicons name="checkmark" size={20} color="#3B82F6" />
                                    )}
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          </TouchableWithoutFeedback>
                        </TouchableOpacity>
                      </Modal>

                      {/* Message Field */}
                      <View style={styles.fieldContainer}>
                        <View style={styles.labelRow}>
                          <Ionicons name="chatbubble-ellipses" size={16} color="#3B82F6" />
                          <Text style={styles.label}>Message *</Text>
                        </View>
                        <TextInput
                          style={[
                            styles.textArea,
                            loading && styles.inputDisabled
                          ]}
                          placeholder="Please describe your issue or question in detail. The more information you provide, the better we can help you!"
                          placeholderTextColor="#9CA3AF"
                          value={formData.message}
                          onChangeText={(text) => handleChange('message', text)}
                          multiline
                          numberOfLines={6}
                          textAlignVertical="top"
                          editable={!loading}
                          returnKeyType="done"
                          onFocus={() => {
                            setTimeout(() => {
                              scrollViewRef.current?.scrollTo({ y: 150, animated: true });
                            }, 100);
                          }}
                        />
                      </View>

                      {/* Submit Button */}
                      <TouchableOpacity
                        style={[
                          styles.submitButton,
                          loading && styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}
                      >
                        {loading ? (
                          <View style={styles.loadingContainer}>
                            <ActivityIndicator color="#FFFFFF" size="small" />
                            <Text style={styles.submitButtonText}>Sending Message...</Text>
                          </View>
                        ) : (
                          <View style={styles.submitContent}>
                            <Ionicons name="send" size={18} color="#FFFFFF" />
                            <Text style={styles.submitButtonText}>Send Message</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      {/* Support Info */}
                      <View style={styles.infoCard}>
                        <View style={styles.infoHeader}>
                          <Ionicons name="time" size={18} color="#3B82F6" />
                          <Text style={styles.infoTitle}>Support Information</Text>
                        </View>
                        <View style={styles.infoContent}>
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Support Hours:</Text>
                            <Text style={styles.infoText}>Mon-Sat, 10AM-7PM IST</Text>
                          </View>
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Response Time:</Text>
                            <Text style={styles.infoText}>Typically within 24 hours</Text>
                          </View>
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Urgent Issues:</Text>
                            <Text style={styles.infoText}>Email: support@yourapp.com</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableWithoutFeedback>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#3B82F6',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    color: '#DBEAFE',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  closeButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  scrollView: {
    maxHeight: 600,
  },
  form: {
    padding: 20,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  successContainer: {
    backgroundColor: '#D1FAE5',
    borderLeftColor: '#10B981',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderLeftColor: '#EF4444',
  },
  resultIconContainer: {
    padding: 4,
    borderRadius: 20,
    marginRight: 12,
  },
  successIconContainer: {
    backgroundColor: '#A7F3D0',
  },
  errorIconContainer: {
    backgroundColor: '#FECACA',
  },
  resultText: {
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
    lineHeight: 20,
  },
  successText: {
    color: '#065F46',
  },
  errorText: {
    color: '#991B1B',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    color: '#111827',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 40,
    fontSize: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    color: '#111827',
  },
  pickerIcon: {
    position: 'absolute',
    right: 14,
    zIndex: 1,
    pointerEvents: 'none',
  },
  pickerTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  pickerScrollView: {
    maxHeight: 300,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  pickerOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  pickerEmoji: {
    fontSize: 18,
    width: 30,
  },
  pickerOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  pickerOptionTextActive: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: '#3B82F6',
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
    opacity: 0.8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginTop: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  infoContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'column',
    gap: 2,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  infoText: {
    fontSize: 12,
    color: '#4B5563',
  },
});

export default SupportForm;