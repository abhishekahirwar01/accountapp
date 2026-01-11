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
  Image,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';

import bankListData from '../../data/bankList.json';
import ImageCropper from '../ui/ImageCropper';
import { BASE_URL } from '../../config';

const { width } = Dimensions.get('window');

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
  const [isLoadingBankSuggestions, setIsLoadingBankSuggestions] = useState(false);
  const [bankSelectedFromDropdown, setBankSelectedFromDropdown] = useState(false);

  // QR Code states
  const [qrCodeFile, setQrCodeFile] = useState(null);
  const [existingQrCode, setExistingQrCode] = useState('');
  const [qrCodePreview, setQrCodePreview] = useState(null);
  const [showQrCropper, setShowQrCropper] = useState(false);
  const [tempQrImage, setTempQrImage] = useState('');
  const [showImagePreview, setShowImagePreview] = useState(false);

  const cityRef = useRef(null);
  const accountNoRef = useRef(null);
  const ifscCodeRef = useRef(null);
  const branchAddressRef = useRef(null);
  const upiIdRef = useRef(null);
  const upiNameRef = useRef(null);
  const upiMobileRef = useRef(null);

  const getCompanyId = company => {
    if (!company) return '';
    return typeof company === 'string' ? company : company._id;
  };

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

  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(response.data);
    } catch (error) {
      console.error('Fetch companies error:', error);
      Alert.alert('Error', 'Failed to load companies');
    } finally {
      setIsLoadingCompanies(false);
    }
  }, []);

  useEffect(() => { 
    fetchCompanies(); 
  }, [fetchCompanies]);

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
      if (bankDetail.qrCode) {
        setQrCodePreview(`${BASE_URL}/${bankDetail.qrCode}`);
      }
      if (bankDetail.bankName) {
        setBankSelectedFromDropdown(true);
      }
    }
  }, [bankDetail]);

  useEffect(() => {
    if (bankSelectedFromDropdown) {
      setShowBankSuggestions(false);
      return;
    }
    const timer = setTimeout(() => {
      if (formData.bankName && formData.bankName.length >= 2) {
        setIsLoadingBankSuggestions(true);
        const results = bankListData
          .filter(bank => 
            bank.bank_name.toLowerCase().includes(formData.bankName.toLowerCase()) ||
            bank.ifsc.toLowerCase().includes(formData.bankName.toLowerCase())
          ).slice(0, 10);
        setBankSuggestions(results);
        setShowBankSuggestions(results.length > 0);
        setIsLoadingBankSuggestions(false);
      } else {
        setShowBankSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.bankName, bankSelectedFromDropdown]);

  const handleBankSelect = bank => {
    setFormData(prev => ({ 
      ...prev, 
      bankName: bank.bank_name, 
      ifscCode: bank.ifsc 
    }));
    setBankSelectedFromDropdown(true);
    setShowBankSuggestions(false);
    Keyboard.dismiss();
  };

  const handleQrCodePick = () => {
    ImagePicker.launchImageLibrary(
      { 
        mediaType: 'photo', 
        quality: 0.8,
        selectionLimit: 1,
      }, 
      response => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorCode) {
          console.error('ImagePicker Error:', response.errorMessage);
          Alert.alert('Error', 'Failed to pick image');
        } else if (response.assets && response.assets[0]) {
          console.log('Image picked:', response.assets[0].uri);
          setTempQrImage(response.assets[0].uri);
          setShowQrCropper(true);
        }
      }
    );
  };

  const handleRemoveQrCode = () => {
    Alert.alert(
      'Remove QR Code',
      'Are you sure you want to remove this QR code?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setQrCodeFile(null);
            setQrCodePreview(null);
            setExistingQrCode('');
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill all required fields correctly');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      const clientId = payload.clientId || payload.id;

      const formDataToSend = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          formDataToSend.append(key, formData[key]);
        }
      });
      formDataToSend.append('client', clientId);

      // Append QR code file if exists
      if (qrCodeFile && qrCodeFile.uri) {
        console.log('Appending QR code:', qrCodeFile);
        
        formDataToSend.append('qrCode', {
          uri: Platform.OS === 'android' 
            ? qrCodeFile.uri 
            : qrCodeFile.uri.replace('file://', ''),
          type: qrCodeFile.type || 'image/jpeg',
          name: qrCodeFile.name || `qrcode_${Date.now()}.jpg`,
        });
      }

      const method = bankDetail ? 'PUT' : 'POST';
      const url = bankDetail 
        ? `${BASE_URL}/api/bank-details/${bankDetail._id}` 
        : `${BASE_URL}/api/bank-details`;

      console.log('Submitting to:', url, 'Method:', method);

      const response = await axios({
        method,
        url,
        data: formDataToSend,
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      console.log('Success response:', response.data);
      Alert.alert('Success', 'Bank details saved successfully', [
        { text: 'OK', onPress: onSuccess }
      ]);
      
    } catch (error) {
      console.error('Submit error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Submission failed';
      
      if (error.response) {
        errorMessage = error.response.data?.message 
          || error.response.data?.error 
          || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your internet connection.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getQrCodeSource = () => {
    if (qrCodePreview) {
      return { uri: qrCodePreview };
    }
    if (existingQrCode) {
      return { uri: `${BASE_URL}/${existingQrCode}` };
    }
    return null;
  };

  return (
    // <TouchableWithoutFeedback onPress={() => { 
    //   Keyboard.dismiss(); 
    //   setShowBankSuggestions(false); 
    // }}>
      <View 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Company */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Company *</Text>
            <View style={styles.pickerContainer}>
              {isLoadingCompanies ? (
                <ActivityIndicator style={styles.pickerLoader} />
              ) : (
                <Picker
                  selectedValue={formData.company}
                  onValueChange={v => setFormData({ ...formData, company: v })}
                  style={styles.picker}
                  enabled={!isLoadingCompanies}
                >
                  <Picker.Item label="Select Company" value="" />
                  {companies.map(c => (
                    <Picker.Item 
                      key={c._id} 
                      label={c.businessName} 
                      value={c._id} 
                    />
                  ))}
                </Picker>
              )}
            </View>
            {errors.company && <Text style={styles.errorText}>{errors.company}</Text>}
          </View>

          {/* Bank Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Bank Name *</Text>
            <View>
              <TextInput
                style={[styles.input, errors.bankName && styles.inputError]}
                value={formData.bankName}
                onChangeText={v => { 
                  setFormData({ ...formData, bankName: v }); 
                  setBankSelectedFromDropdown(false); 
                }}
                placeholder="Search Bank..."
                placeholderTextColor="#9CA3AF"
              />
              {isLoadingBankSuggestions && (
                <ActivityIndicator 
                  style={styles.bankLoader} 
                  size="small" 
                  color="#3B82F6" 
                />
              )}
            </View>
            
            {showBankSuggestions && bankSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <ScrollView 
                  style={styles.suggestionsScroll}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {bankSuggestions.map((item, index) => (
                    <TouchableOpacity 
                      key={`${item.ifsc}-${index}`}
                      style={[
                        styles.suggestionItem,
                        index === bankSuggestions.length - 1 && styles.suggestionItemLast
                      ]}
                      onPress={() => handleBankSelect(item)}
                    >
                      <Text style={styles.suggestionBankName}>{item.bank_name}</Text>
                      <Text style={styles.suggestionIfsc}>{item.ifsc}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}
          </View>

          {/* City & Account */}
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>City *</Text>
              <TextInput 
                style={[styles.input, errors.city && styles.inputError]} 
                value={formData.city} 
                onChangeText={v => setFormData({...formData, city: v})} 
                placeholder="Enter City"
                placeholderTextColor="#9CA3AF"
                ref={cityRef}
              />
              {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Account No *</Text>
              <TextInput 
                style={[styles.input, errors.accountNo && styles.inputError]} 
                keyboardType="numeric" 
                value={formData.accountNo} 
                onChangeText={v => setFormData({...formData, accountNo: v})}
                placeholder="Enter Account No"
                placeholderTextColor="#9CA3AF"
                ref={accountNoRef}
              />
              {errors.accountNo && <Text style={styles.errorText}>{errors.accountNo}</Text>}
            </View>
          </View>

          {/* IFSC & Branch Address */}
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>IFSC Code</Text>
              <TextInput 
                style={[styles.input, errors.ifscCode && styles.inputError]} 
                autoCapitalize="characters" 
                value={formData.ifscCode} 
                onChangeText={v => setFormData({...formData, ifscCode: v.toUpperCase()})}
                placeholder="IFSC Code"
                placeholderTextColor="#9CA3AF"
                maxLength={11}
                ref={ifscCodeRef}
              />
              {errors.ifscCode && <Text style={styles.errorText}>{errors.ifscCode}</Text>}
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Branch Address</Text>
              <TextInput 
                style={styles.input} 
                value={formData.branchAddress} 
                onChangeText={v => setFormData({...formData, branchAddress: v})}
                placeholder="Branch Address"
                placeholderTextColor="#9CA3AF"
                ref={branchAddressRef}
              />
            </View>
          </View>

          {/* UPI Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>UPI Details (Optional)</Text>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>UPI ID</Text>
            <TextInput 
              placeholder="example@upi" 
              style={styles.input} 
              value={formData.upiId} 
              onChangeText={v => setFormData({...formData, upiId: v})}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              ref={upiIdRef}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>UPI Name</Text>
              <TextInput 
                placeholder="UPI Name" 
                style={styles.input} 
                value={formData.upiName} 
                onChangeText={v => setFormData({...formData, upiName: v})}
                placeholderTextColor="#9CA3AF"
                ref={upiNameRef}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>UPI Mobile</Text>
              <TextInput 
                placeholder="Mobile Number" 
                style={[styles.input, errors.upiMobile && styles.inputError]} 
                keyboardType="phone-pad" 
                value={formData.upiMobile} 
                onChangeText={v => setFormData({...formData, upiMobile: v})}
                placeholderTextColor="#9CA3AF"
                maxLength={10}
                ref={upiMobileRef}
              />
              {errors.upiMobile && <Text style={styles.errorText}>{errors.upiMobile}</Text>}
            </View>
          </View>

          {/* QR Code Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>QR Code (Optional)</Text>
          </View>

          {(qrCodePreview || existingQrCode) ? (
            <View style={styles.qrCodeContainer}>
              <TouchableOpacity 
                style={styles.qrCodePreview}
                onPress={() => setShowImagePreview(true)}
              >
                <Image 
                  source={getQrCodeSource()} 
                  style={styles.qrCodeImage} 
                  resizeMode="contain"
                />
                <View style={styles.qrCodeOverlay}>
                  <Icon name="zoom-in" size={24} color="white" />
                  <Text style={styles.qrCodeOverlayText}>Tap to view</Text>
                </View>
              </TouchableOpacity>
              
              <View style={styles.qrCodeActions}>
                <TouchableOpacity 
                  style={styles.qrCodeActionButton}
                  onPress={handleQrCodePick}
                >
                  <Icon name="edit" size={20} color="#3B82F6" />
                  <Text style={styles.qrCodeActionText}>Change</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.qrCodeActionButton, styles.qrCodeRemoveButton]}
                  onPress={handleRemoveQrCode}
                >
                  <Icon name="delete" size={20} color="#EF4444" />
                  <Text style={[styles.qrCodeActionText, styles.qrCodeRemoveText]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.qrCodeUploadButton} 
              onPress={handleQrCodePick}
            >
              <Icon name="cloud-upload" size={32} color="#3B82F6" />
              <Text style={styles.qrCodeUploadText}>Upload QR Code</Text>
              <Text style={styles.qrCodeUploadSubtext}>Tap to select image</Text>
            </TouchableOpacity>
          )}

          {/* Submission Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onCancel}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {bankDetail ? 'Update' : 'Submit'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Image Cropper Modal */}
        <ImageCropper
          image={tempQrImage}
          visible={showQrCropper}
          onCropComplete={cropped => {
            console.log('Cropped image data:', cropped);
            
            // Transform the cropped image data to match FormData requirements
            const qrFile = {
              uri: cropped.path, // react-native-image-crop-picker uses 'path'
              type: cropped.mime || 'image/jpeg',
              name: cropped.filename || `qrcode_${Date.now()}.jpg`,
            };
            
            console.log('QR File object:', qrFile);
            
            setQrCodeFile(qrFile);
            setQrCodePreview(cropped.path);
            setShowQrCropper(false);
            setTempQrImage('');
          }}
          onCancel={() => {
            setShowQrCropper(false);
            setTempQrImage('');
          }}
        />

        {/* Full Screen Image Preview Modal */}
        {showImagePreview && (
          <TouchableOpacity 
            style={styles.imagePreviewModal}
            activeOpacity={1}
            onPress={() => setShowImagePreview(false)}
          >
            <View style={styles.imagePreviewHeader}>
              <Text style={styles.imagePreviewTitle}>QR Code Preview</Text>
              <TouchableOpacity 
                style={styles.imagePreviewClose}
                onPress={() => setShowImagePreview(false)}
              >
                <Icon name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.imagePreviewContent}>
              <Image 
                source={getQrCodeSource()} 
                style={styles.imagePreviewFull}
                resizeMode="contain"
              />
            </View>
            
            <Text style={styles.imagePreviewHint}>Tap anywhere to close</Text>
          </TouchableOpacity>
        )}
      </View>
    // </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  scrollView: { 
    flex: 1 
  },
  scrollContent: { 
    padding: 16, 
    paddingBottom: 40 
  },
  formGroup: { 
    marginBottom: 16 
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#374151', 
    marginBottom: 6 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#D1D5DB', 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 14,
    backgroundColor: 'white',
    color: '#111827'
  },
  inputError: { 
    borderColor: '#EF4444' 
  },
  errorText: { 
    color: '#EF4444', 
    fontSize: 12, 
    marginTop: 4 
  },
  row: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 16 
  },
  flex1: { 
    flex: 1 
  },
  pickerContainer: { 
    borderWidth: 1, 
    borderColor: '#D1D5DB', 
    borderRadius: 8, 
    overflow: 'hidden',
    backgroundColor: 'white'
  },
  picker: { 
    height: 50 
  },
  pickerLoader: {
    padding: 15
  },
  bankLoader: { 
    position: 'absolute', 
    right: 12, 
    top: 12 
  },
  suggestionsContainer: { 
    backgroundColor: 'white', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionsScroll: {
    maxHeight: 200,
  },
  suggestionItem: { 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6', 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionBankName: { 
    fontSize: 14, 
    fontWeight: '500', 
    flex: 1,
    color: '#111827' 
  },
  suggestionIfsc: { 
    fontSize: 12, 
    color: '#6B7280',
    marginLeft: 8
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  qrCodeContainer: {
    marginBottom: 20,
  },
  qrCodePreview: {
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrCodeImage: { 
    width: 200, 
    height: 200,
  },
  qrCodeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  qrCodeOverlayText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  qrCodeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  qrCodeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    gap: 6,
  },
  qrCodeRemoveButton: {
    backgroundColor: '#FEE2E2',
  },
  qrCodeActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  qrCodeRemoveText: {
    color: '#EF4444',
  },
  qrCodeUploadButton: { 
    padding: 32, 
    backgroundColor: '#F9FAFB', 
    borderRadius: 12, 
    alignItems: 'center', 
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    marginBottom: 20,
  },
  qrCodeUploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  qrCodeUploadSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  buttonRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 24 
  },
  submitButton: { 
    flex: 1, 
    backgroundColor: '#3B82F6', 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#D1D5DB', 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center',
    backgroundColor: 'white',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    zIndex: 10,
  },
  imagePreviewTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  imagePreviewClose: {
    padding: 8,
  },
  imagePreviewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imagePreviewFull: {
    width: width - 40,
    height: width - 40,
  },
  imagePreviewHint: {
    position: 'absolute',
    bottom: 40,
    color: '#9CA3AF',
    fontSize: 14,
  },
});

export default BankDetailsForm;