// BankDetailsForm.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import bankListData from '../../data/bankList.json';
import ImageCropper from '../ui/ImageCropper';
import { BASE_URL } from '../../config';

const { width, height } = Dimensions.get('window');

const BankDetailsForm = ({ bankDetail, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    company: '',
    bankName: '',
    city: '',
    accountNo: '',
    ifscCode: '',
    branchAddress: '',
    upiId: '',
    upiName: '',
    upiMobile: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  // Bank search states
  const [bankSuggestions, setBankSuggestions] = useState([]);
  const [showBankSuggestions, setShowBankSuggestions] = useState(false);
  const [isLoadingBankSuggestions, setIsLoadingBankSuggestions] =
    useState(false);
  const [focusedBankIndex, setFocusedBankIndex] = useState(-1);
  const [bankSelectedFromDropdown, setBankSelectedFromDropdown] =
    useState(false);

  // QR Code states
  const [qrCodeFile, setQrCodeFile] = useState(null);
  const [existingQrCode, setExistingQrCode] = useState('');
  const [qrCodePreview, setQrCodePreview] = useState(null);
  const [showQrCropper, setShowQrCropper] = useState(false);
  const [tempQrImage, setTempQrImage] = useState('');

  const scrollViewRef = useRef(null);
  const bankInputRef = useRef(null);
  const companyPickerRef = useRef(null);
  const cityRef = useRef(null);
  const accountNoRef = useRef(null);
  const ifscCodeRef = useRef(null);
  const branchAddressRef = useRef(null);
  const upiIdRef = useRef(null);
  const upiNameRef = useRef(null);
  const upiMobileRef = useRef(null);

  // Helper function to extract company ID
  const getCompanyId = company => {
    if (!company) return '';
    if (typeof company === 'string') return company;
    return company._id;
  };

  // Validation function
  const validateForm = () => {
    const newErrors = {};

    if (!formData.company) newErrors.company = 'Company is required';
    if (!formData.bankName) newErrors.bankName = 'Bank name is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.accountNo) newErrors.accountNo = 'Account number is required';
    if (formData.ifscCode && formData.ifscCode.length !== 11) {
      newErrors.ifscCode = 'IFSC code must be 11 characters';
    }
    if (formData.upiMobile && formData.upiMobile.length !== 10) {
      newErrors.upiMobile = 'Mobile number must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fetch companies from API
  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await axios.get(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCompanies(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load companies');
      console.error('Fetch companies error:', error);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, [BASE_URL]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Initialize form with bankDetail data
  useEffect(() => {
    if (bankDetail) {
      setFormData({
        company: getCompanyId(bankDetail.company),
        bankName: bankDetail.bankName || '',
        city: bankDetail.city || '',
        accountNo: bankDetail.accountNo || '',
        ifscCode: bankDetail.ifscCode || '',
        branchAddress: bankDetail.branchAddress || '',
        upiId: bankDetail.upiDetails?.upiId || '',
        upiName: bankDetail.upiDetails?.upiName || '',
        upiMobile: bankDetail.upiDetails?.upiMobile || '',
      });
      setExistingQrCode(bankDetail.qrCode || '');
      if (bankDetail.bankName) {
        setBankSelectedFromDropdown(true);
      }
    }
  }, [bankDetail]);

  // Bank search with debounce - using imported bankListData
  useEffect(() => {
    if (bankSelectedFromDropdown) {
      setShowBankSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      if (formData.bankName && formData.bankName.length >= 2) {
        setIsLoadingBankSuggestions(true);

        // Filter bank list data (same logic as web)
        const results = bankListData
          .filter(
            bank =>
              bank.bank_name
                .toLowerCase()
                .includes(formData.bankName.toLowerCase()) ||
              bank.ifsc.toLowerCase().includes(formData.bankName.toLowerCase()),
          )
          .slice(0, 20);

        setBankSuggestions(results);
        setShowBankSuggestions(true);
        setIsLoadingBankSuggestions(false);
      } else {
        setShowBankSuggestions(false);
        setBankSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.bankName, bankSelectedFromDropdown]);

  // Handle bank selection
  const handleBankSelect = bank => {
    setFormData(prev => ({
      ...prev,
      bankName: bank.bank_name,
      ifscCode: bank.ifsc,
    }));
    setShowBankSuggestions(false);
    setBankSelectedFromDropdown(true);
    setTimeout(() => {
      cityRef.current?.focus();
    }, 100);
  };

  // Get client ID from token
  const getClientIdFromToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return null;

      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.clientId || payload.id || null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Handle image picker for QR code
  const handleQrCodePick = () => {
    ImagePicker.launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
      },
      response => {
        if (response.didCancel) {
          return;
        }
        if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Failed to pick image');
          return;
        }
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          const sizeKB = (asset.fileSize || 0) / 1024;

          if (sizeKB < 10) {
            Alert.alert('Error', 'File size must be greater than 10 KB');
            return;
          }
          if (sizeKB > 100) {
            Alert.alert('Error', 'File size must be less than 100 KB');
            return;
          }

          if (asset.uri) {
            setTempQrImage(asset.uri);
            setShowQrCropper(true);
          }
        }
      },
    );
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please check all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const clientId = await getClientIdFromToken();
      if (!clientId) {
        throw new Error('Client authentication required. Please log in again.');
      }

      const formDataToSend = new FormData();
      formDataToSend.append('company', formData.company);
      formDataToSend.append('bankName', formData.bankName);
      formDataToSend.append('city', formData.city);
      formDataToSend.append('accountNo', formData.accountNo);
      if (formData.ifscCode)
        formDataToSend.append('ifscCode', formData.ifscCode);
      if (formData.branchAddress)
        formDataToSend.append('branchAddress', formData.branchAddress);
      if (formData.upiId) formDataToSend.append('upiId', formData.upiId);
      if (formData.upiName) formDataToSend.append('upiName', formData.upiName);
      if (formData.upiMobile)
        formDataToSend.append('upiMobile', formData.upiMobile);
      formDataToSend.append('client', clientId);

      if (qrCodeFile) {
        formDataToSend.append('qrCode', {
          uri: qrCodeFile.uri,
          type: qrCodeFile.type || 'image/jpeg',
          name: qrCodeFile.fileName || 'qrcode.jpg',
        });
      } else if (bankDetail && existingQrCode) {
        formDataToSend.append('qrCode', existingQrCode);
      }

      const url = bankDetail
        ? `${BASE_URL}/api/bank-details/${bankDetail._id}`
        : `${BASE_URL}/api/bank-details`;

      const method = bankDetail ? 'PUT' : 'POST';

      const response = await axios({
        method,
        url,
        data: formDataToSend,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert(
        'Success',
        `Bank detail ${bankDetail ? 'updated' : 'created'} successfully.`,
      );
      onSuccess();
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message ||
          error.message ||
          'An unknown error occurred.',
      );
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Special handling for bank name
    if (field === 'bankName') {
      setBankSelectedFromDropdown(false);
    }
  };

  // Handle key press for navigation
  const handleKeyPress = (e, nextRef) => {
    if (e.nativeEvent.key === 'Enter' || e.nativeEvent.key === 'next') {
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      }
    }
  };

  // Render bank suggestion item
  const renderBankSuggestion = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem,
        index === focusedBankIndex && styles.suggestionItemFocused,
      ]}
      onPress={() => handleBankSelect(item)}
      onPressIn={() => setFocusedBankIndex(index)}
    >
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionBankName}>{item.bank_name}</Text>
        <Text style={styles.suggestionIfsc}>{item.ifsc}</Text>
      </View>
    </TouchableOpacity>
  );

  // Dismiss keyboard when tapping outside
  const dismissKeyboard = () => {
    Keyboard.dismiss();
    setShowBankSuggestions(false);
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            {/* Company Picker */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Company *</Text>
              {isLoadingCompanies ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    ref={companyPickerRef}
                    selectedValue={formData.company}
                    onValueChange={value => handleInputChange('company', value)}
                    style={styles.picker}
                    dropdownIconColor="#6B7280"
                  >
                    <Picker.Item label="Select a company" value="" />
                    {companies.map(company => (
                      <Picker.Item
                        key={company._id}
                        label={company.businessName}
                        value={company._id}
                      />
                    ))}
                  </Picker>
                </View>
              )}
              {errors.company && (
                <Text style={styles.errorText}>{errors.company}</Text>
              )}
            </View>

            {/* Bank Name with Autocomplete */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Bank Name *</Text>
              <View style={styles.bankInputContainer}>
                <TextInput
                  ref={bankInputRef}
                  style={[styles.input, errors.bankName && styles.inputError]}
                  value={formData.bankName}
                  onChangeText={value => handleInputChange('bankName', value)}
                  placeholder="Search bank name (e.g., State Bank)"
                  placeholderTextColor="#9CA3AF"
                  onBlur={() =>
                    setTimeout(() => setShowBankSuggestions(false), 200)
                  }
                  onFocus={() => {
                    if (formData.bankName && formData.bankName.length >= 2) {
                      setShowBankSuggestions(true);
                    }
                  }}
                  onSubmitEditing={() => cityRef.current?.focus()}
                  returnKeyType="next"
                />
                {isLoadingBankSuggestions && (
                  <ActivityIndicator
                    size="small"
                    color="#007AFF"
                    style={styles.bankLoader}
                  />
                )}
              </View>

              {/* Bank Suggestions */}
              {showBankSuggestions && bankSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <FlatList
                    data={bankSuggestions}
                    renderItem={renderBankSuggestion}
                    keyExtractor={item => item.id}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="always"
                    style={styles.suggestionsList}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              )}

              {showBankSuggestions &&
                formData.bankName &&
                formData.bankName.length >= 2 &&
                bankSuggestions.length === 0 &&
                !isLoadingBankSuggestions && (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>
                      No matching banks found.
                    </Text>
                    <Text style={styles.noResultsSubText}>
                      Please check the bank name or enter manually.
                    </Text>
                  </View>
                )}

              <Text style={styles.hintText}>
                Start typing 2+ characters to see bank suggestions
              </Text>
              {errors.bankName && (
                <Text style={styles.errorText}>{errors.bankName}</Text>
              )}
            </View>

            {/* City and Account Number */}
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flex1]}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  ref={cityRef}
                  style={[styles.input, errors.city && styles.inputError]}
                  value={formData.city}
                  onChangeText={value => handleInputChange('city', value)}
                  placeholder="e.g. New York"
                  placeholderTextColor="#9CA3AF"
                  onSubmitEditing={() => accountNoRef.current?.focus()}
                  returnKeyType="next"
                />
                {errors.city && (
                  <Text style={styles.errorText}>{errors.city}</Text>
                )}
              </View>

              <View style={[styles.formGroup, styles.flex1]}>
                <Text style={styles.label}>Account Number *</Text>
                <TextInput
                  ref={accountNoRef}
                  style={[styles.input, errors.accountNo && styles.inputError]}
                  value={formData.accountNo}
                  onChangeText={value => handleInputChange('accountNo', value)}
                  placeholder="e.g. 123456789012"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  onSubmitEditing={() => ifscCodeRef.current?.focus()}
                  returnKeyType="next"
                />
                {errors.accountNo && (
                  <Text style={styles.errorText}>{errors.accountNo}</Text>
                )}
              </View>
            </View>

            {/* IFSC Code and Branch Address */}
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flex1]}>
                <Text style={styles.label}>IFSC Code</Text>
                <TextInput
                  ref={ifscCodeRef}
                  style={[styles.input, errors.ifscCode && styles.inputError]}
                  value={formData.ifscCode}
                  onChangeText={value =>
                    handleInputChange('ifscCode', value.toUpperCase())
                  }
                  placeholder="e.g. SBIN0123456"
                  placeholderTextColor="#9CA3AF"
                  maxLength={11}
                  autoCapitalize="characters"
                  onSubmitEditing={() => branchAddressRef.current?.focus()}
                  returnKeyType="next"
                />
                {errors.ifscCode && (
                  <Text style={styles.errorText}>{errors.ifscCode}</Text>
                )}
              </View>

              <View style={[styles.formGroup, styles.flex1]}>
                <Text style={styles.label}>Branch Address</Text>
                <TextInput
                  ref={branchAddressRef}
                  style={styles.input}
                  value={formData.branchAddress}
                  onChangeText={value =>
                    handleInputChange('branchAddress', value)
                  }
                  placeholder="e.g. 123 Main St, New York"
                  placeholderTextColor="#9CA3AF"
                  onSubmitEditing={() => upiIdRef.current?.focus()}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* UPI Details */}
            <View style={styles.row}>
              <View style={[styles.formGroup, styles.flex1]}>
                <Text style={styles.label}>UPI ID</Text>
                <TextInput
                  ref={upiIdRef}
                  style={styles.input}
                  value={formData.upiId}
                  onChangeText={value => handleInputChange('upiId', value)}
                  placeholder="e.g. user@bank"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  onSubmitEditing={() => upiNameRef.current?.focus()}
                  returnKeyType="next"
                />
              </View>

              <View style={[styles.formGroup, styles.flex1]}>
                <Text style={styles.label}>UPI Name</Text>
                <TextInput
                  ref={upiNameRef}
                  style={styles.input}
                  value={formData.upiName}
                  onChangeText={value => handleInputChange('upiName', value)}
                  placeholder="e.g. John Doe"
                  placeholderTextColor="#9CA3AF"
                  onSubmitEditing={() => upiMobileRef.current?.focus()}
                  returnKeyType="next"
                />
              </View>

              <View style={[styles.formGroup, styles.flex1]}>
                <Text style={styles.label}>UPI Mobile</Text>
                <TextInput
                  ref={upiMobileRef}
                  style={[styles.input, errors.upiMobile && styles.inputError]}
                  value={formData.upiMobile}
                  onChangeText={value => handleInputChange('upiMobile', value)}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={10}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="done"
                />
                {errors.upiMobile && (
                  <Text style={styles.errorText}>{errors.upiMobile}</Text>
                )}
              </View>
            </View>

            {/* QR Code Upload */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                QR Code Image{' '}
                <Text style={styles.hintText}>(10KB – 100KB)</Text>
              </Text>

              <TouchableOpacity
                style={styles.qrCodeButton}
                onPress={handleQrCodePick}
                disabled={isSubmitting}
              >
                <Text style={styles.qrCodeButtonText}>
                  {qrCodePreview || existingQrCode
                    ? 'Change QR Code'
                    : 'Upload QR Code'}
                </Text>
              </TouchableOpacity>

              {/* Existing QR Code Preview */}
              {existingQrCode && !qrCodePreview && (
                <View style={styles.qrCodePreviewContainer}>
                  <Image
                    source={{ uri: `${BASE_URL}/${existingQrCode}` }}
                    style={styles.qrCodeImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => {
                      setExistingQrCode('');
                    }}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* New QR Code Preview */}
              {qrCodePreview && (
                <View style={styles.qrCodePreviewContainer}>
                  <Image
                    source={{ uri: qrCodePreview }}
                    style={styles.qrCodeImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => {
                      setQrCodeFile(null);
                      setQrCodePreview(null);
                    }}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {onCancel && (
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {bankDetail ? 'Save Changes' : 'Create Bank Detail'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Image Cropper Modal */}
        <ImageCropper
          image={tempQrImage}
          visible={showQrCropper}
          onCropComplete={croppedImage => {
            setQrCodeFile(croppedImage);
            setQrCodePreview(croppedImage.uri);
            setShowQrCropper(false);
            setTempQrImage('');
          }}
          onCancel={() => {
            setShowQrCropper(false);
            setTempQrImage('');
          }}
        />
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  formContainer: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  hintText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: {
    height: 48,
    color: '#111827',
  },
  bankInputContainer: {
    position: 'relative',
  },
  bankLoader: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  suggestionsContainer: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  suggestionsList: {
    padding: 4,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionItemFocused: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  suggestionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionBankName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  suggestionIfsc: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
    fontWeight: '500',
  },
  noResultsContainer: {
    marginTop: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  noResultsSubText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  qrCodeButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  qrCodeButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  qrCodePreviewContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  qrCodeImage: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  removeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  removeButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BankDetailsForm;
