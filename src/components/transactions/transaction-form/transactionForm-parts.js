import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import { Button, Dialog, Portal, Badge, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { City, State } from 'country-state-city';

import { Combobox } from '../../ui/Combobox';
import CustomDropdown from '../../ui/CustomDropdown';
import { useToast } from '../../hooks/useToast';
import { searchHSNCodes } from '../../../lib/hsnProduct';
import { searchSACCodes } from '../../../lib/sacService';
import { BASE_URL } from '../../../config';

const baseURL = BASE_URL;

// Enhanced Toast with better feedback
const useEnhancedToast = () => {
  const toast = useToast();

  const showToast = useCallback(
    (title, description, variant = 'default') => {
      if (toast?.show) {
        toast.show(description || title, {
          type:
            variant === 'destructive'
              ? 'danger'
              : variant === 'warning'
              ? 'warning'
              : 'success',
          duration: 4000,
        });
      } else {
        Alert.alert(title, description);
      }
    },
    [toast],
  );

  return { showToast };
};

// Enhanced Form Management with better error handling
const useEnhancedForm = form => {
  const fieldRefs = useRef({});
  const [focusedField, setFocusedField] = useState(null);

  const registerField = useCallback((name, ref) => {
    if (ref) {
      fieldRefs.current[name] = ref;
    }
  }, []);

  const focusField = useCallback(name => {
    if (
      fieldRefs.current[name] &&
      typeof fieldRefs.current[name].focus === 'function'
    ) {
      setFocusedField(name);
      fieldRefs.current[name].focus();
    }
  }, []);

  const blurField = useCallback(name => {
    if (
      fieldRefs.current[name] &&
      typeof fieldRefs.current[name].blur === 'function'
    ) {
      fieldRefs.current[name].blur();
    }
    setFocusedField(null);
  }, []);

  const createFocusNext = useCallback(
    nextField => () => {
      focusField(nextField);
    },
    [focusField],
  );

  const handleSubmitEditing = useCallback(
    fieldName => {
      blurField(fieldName);
    },
    [blurField],
  );

  return {
    registerField,
    focusField,
    blurField,
    createFocusNext,
    handleSubmitEditing,
    focusedField,
    setFocusedField,
    fieldRefs,
  };
};

// Enhanced form methods with fallbacks
const useFormMethods = form => {
  return useMemo(() => {
    if (!form) {
      console.warn('Form is undefined in useFormMethods');
      return {
        watch: () => undefined,
        setValue: () => {},
        formState: { errors: {} },
      };
    }

    return {
      watch: field => form.watch?.(field) || form[field],
      setValue: (field, value) => {
        if (form.setValue) {
          form.setValue(field, value);
        } else if (form.onChange) {
          form.onChange(field, value);
        }
      },
      formState: form.formState || { errors: {} },
    };
  }, [form]);
};

export function FormTabs({
  type,
  onTypeChange,
  transactionToEdit,
  canSales,
  canPurchases,
  canReceipt,
  canPayment,
  canJournal,
  form,
  registerField: externalRegisterField,
  companies,
  renderSalesPurchasesFields,
  salesPurchasesProps,
  renderReceiptPaymentFields,
  receiptPaymentProps,
}) {
  const SalesPurchasesComponent = renderSalesPurchasesFields;
  const ReceiptPaymentComponent = renderReceiptPaymentFields;
  const { showToast } = useEnhancedToast();

  // Enhanced form management
  const {
    registerField,
    focusField,
    createFocusNext,
    handleSubmitEditing,
    focusedField,
    setFocusedField,
  } = useEnhancedForm(form);

  const formMethods = useFormMethods(form);

  const [journalDisplayValue, setJournalDisplayValue] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Keyboard visibility handler
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false),
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Dismiss keyboard when tab type changes
  useEffect(() => {
    Keyboard.dismiss();
    setFocusedField(null);
  }, [type]);

  // Initialize date from form
  useEffect(() => {
    const formDate = formMethods.watch('date');
    if (formDate) {
      setTransactionDate(new Date(formDate));
    }
  }, [formMethods]);

  // Sync journal display value
  useEffect(() => {
    const amount = formMethods.watch('totalAmount');
    const numValue = Number(amount);

    if (numValue && !isNaN(numValue)) {
      const stringValue = amount.toString();
      const hasDecimal = stringValue.includes('.');

      if (hasDecimal) {
        const [integerPart, decimalPart] = stringValue.split('.');
        const formattedInt = integerPart
          ? Number(integerPart).toLocaleString('en-IN')
          : '';
        setJournalDisplayValue(`${formattedInt}.${decimalPart}`);
      } else {
        setJournalDisplayValue(numValue.toLocaleString('en-IN'));
      }
    } else {
      setJournalDisplayValue('');
    }
  }, [formMethods.watch('totalAmount')]);

  const handleDateChange = useCallback(
    (event, selectedDate) => {
      const currentDate = selectedDate || transactionDate;
      setShowDatePicker(false);
      setTransactionDate(currentDate);
      formMethods.setValue('date', currentDate);
    },
    [transactionDate, formMethods],
  );

  const formatInput = useCallback(value => {
    if (!value) return '';

    // 1. Clean to allow only digits and at most one decimal point
    const cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    let integerPart = parts[0];
    let decimalPart = parts[1];

    // Handle multiple decimal points (keep first part)
    if (parts.length > 2) {
      decimalPart = parts.slice(1).join('');
    }

    // Format integer part for Indian locale (commas)
    const formattedInt = integerPart
      ? Number(integerPart).toLocaleString('en-IN')
      : '';

    // Reconstruct the string
    if (decimalPart !== undefined) {
      return `${formattedInt}.${decimalPart}`;
    }
    return formattedInt;
  }, []);

  const formatDate = useCallback(date => {
    return date ? date.toLocaleDateString('en-IN') : 'Pick a date';
  }, []);

  const getInputStyle = useCallback(
    (fieldName, hasError) => [
      styles.input,
      focusedField === fieldName && styles.inputFocused,
      hasError && styles.inputError,
    ],
    [focusedField],
  );

  const TypeSelectorMobile = useMemo(
    () => () =>
      (
        <View style={styles.mobileTypeSelector}>
          <Text style={styles.mobileSelectorLabel}>Transaction Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipContainer}
          >
            {canSales && (
              <Chip
                selected={type === 'sales'}
                onPress={() => !transactionToEdit && onTypeChange('sales')}
                disabled={!!transactionToEdit}
                style={[styles.chip, type === 'sales' && styles.chipSelected]}
                textStyle={type === 'sales' && styles.chipTextSelected}
              >
                Sales
              </Chip>
            )}
            {canPurchases && (
              <Chip
                selected={type === 'purchases'}
                onPress={() => !transactionToEdit && onTypeChange('purchases')}
                disabled={!!transactionToEdit}
                style={[
                  styles.chip,
                  type === 'purchases' && styles.chipSelected,
                ]}
                textStyle={type === 'purchases' && styles.chipTextSelected}
              >
                Purchases
              </Chip>
            )}
            {canReceipt && (
              <Chip
                selected={type === 'receipt'}
                onPress={() => !transactionToEdit && onTypeChange('receipt')}
                disabled={!!transactionToEdit}
                style={[styles.chip, type === 'receipt' && styles.chipSelected]}
                textStyle={type === 'receipt' && styles.chipTextSelected}
              >
                Receipt
              </Chip>
            )}
            {canPayment && (
              <Chip
                selected={type === 'payment'}
                onPress={() => !transactionToEdit && onTypeChange('payment')}
                disabled={!!transactionToEdit}
                style={[styles.chip, type === 'payment' && styles.chipSelected]}
                textStyle={type === 'payment' && styles.chipTextSelected}
              >
                Payment
              </Chip>
            )}
            {canJournal && (
              <Chip
                selected={type === 'journal'}
                onPress={() => !transactionToEdit && onTypeChange('journal')}
                disabled={!!transactionToEdit}
                style={[styles.chip, type === 'journal' && styles.chipSelected]}
                textStyle={type === 'journal' && styles.chipTextSelected}
              >
                Journal
              </Chip>
            )}
          </ScrollView>
        </View>
      ),
    [
      type,
      transactionToEdit,
      onTypeChange,
      canSales,
      canPurchases,
      canReceipt,
      canPayment,
      canJournal,
    ],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scrollContent, isKeyboardVisible && styles.keyboardOpen]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
      >
        <TypeSelectorMobile />

        <View style={styles.tabContent}>
          {(type === 'sales' || type === 'purchases') && (
            <SalesPurchasesComponent
              {...salesPurchasesProps}
              registerField={registerField}
              focusField={focusField}
              createFocusNext={createFocusNext}
              handleSubmitEditing={handleSubmitEditing}
            />
          )}
          {(type === 'receipt' || type === 'payment') && (
            <ReceiptPaymentComponent
              {...receiptPaymentProps}
              registerField={registerField}
              focusField={focusField}
              createFocusNext={createFocusNext}
              handleSubmitEditing={handleSubmitEditing}
            />
          )}
          {type === 'journal' && (
            <View style={styles.journalContainer}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Core Details</Text>
                <View style={styles.grid}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Company</Text>
                    <CustomDropdown
                      items={companies.map(c => ({
                        label: c.businessName || c.name || 'Company',
                        value: c._id,
                      }))}
                      value={formMethods.watch('company') || ''}
                      onChange={val => formMethods.setValue('company', val)}
                      placeholder="Select a company"
                    />
                    {formMethods.formState.errors?.company && (
                      <Text style={styles.errorText}>
                        {formMethods.formState.errors.company.message}
                      </Text>
                    )}
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.label}>Transaction Date</Text>
                    <TouchableOpacity
                      style={[
                        styles.dateInput,
                        formMethods.formState.errors?.date && styles.inputError,
                        focusedField === 'date' && styles.inputFocused,
                      ]}
                      onPress={() => {
                        setShowDatePicker(true);
                        setFocusedField('date');
                      }}
                    >
                      <Text style={styles.dateText}>
                        {formatDate(transactionDate)}
                      </Text>
                      <Icon name="calendar" size={20} color="#6B7280" />
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={transactionDate}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                        minimumDate={new Date('1900-01-01')}
                      />
                    )}
                    {formMethods.formState.errors?.date && (
                      <Text style={styles.errorText}>
                        {formMethods.formState.errors.date.message}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Journal Entry</Text>
                <View style={styles.grid}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Debit Account</Text>
                    <TextInput
                      placeholder="e.g., Rent Expense"
                      style={getInputStyle(
                        'fromAccount',
                        formMethods.formState.errors?.fromAccount,
                      )}
                      value={formMethods.watch('fromAccount') || ''}
                      onChangeText={text =>
                        formMethods.setValue('fromAccount', text)
                      }
                      ref={ref => registerField('fromAccount', ref)}
                      returnKeyType="next"
                      onSubmitEditing={createFocusNext('toAccount')}
                      onFocus={() => setFocusedField('fromAccount')}
                      onBlur={() => setFocusedField(null)}
                    />
                    {formMethods.formState.errors?.fromAccount && (
                      <Text style={styles.errorText}>
                        {formMethods.formState.errors.fromAccount.message}
                      </Text>
                    )}
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.label}>Credit Account</Text>
                    <TextInput
                      placeholder="e.g., Cash"
                      style={getInputStyle(
                        'toAccount',
                        formMethods.formState.errors?.toAccount,
                      )}
                      value={formMethods.watch('toAccount') || ''}
                      onChangeText={text =>
                        formMethods.setValue('toAccount', text)
                      }
                      ref={ref => registerField('toAccount', ref)}
                      returnKeyType="next"
                      onSubmitEditing={createFocusNext('totalAmount')}
                      onFocus={() => setFocusedField('toAccount')}
                      onBlur={() => setFocusedField(null)}
                    />
                    {formMethods.formState.errors?.toAccount && (
                      <Text style={styles.errorText}>
                        {formMethods.formState.errors.toAccount.message}
                      </Text>
                    )}
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.label}>Amount</Text>
                    <TextInput
                      placeholder="₹0.00"
                      style={getInputStyle(
                        'totalAmount',
                        formMethods.formState.errors?.totalAmount,
                      )}
                      value={journalDisplayValue}
                      onChangeText={text => {
                        if (!text.trim()) {
                          setJournalDisplayValue('');
                          formMethods.setValue('totalAmount', '');
                        } else {
                          const formatted = formatInput(text);
                          setJournalDisplayValue(formatted);
                          formMethods.setValue(
                            'totalAmount',
                            formatted.replace(/,/g, ''),
                          );
                        }
                      }}
                      keyboardType="numeric"
                      ref={ref => registerField('totalAmount', ref)}
                      returnKeyType="next"
                      onSubmitEditing={createFocusNext('description')}
                      onFocus={() => setFocusedField('totalAmount')}
                      onBlur={() => setFocusedField(null)}
                    />
                    {formMethods.formState.errors?.totalAmount && (
                      <Text style={styles.errorText}>
                        {formMethods.formState.errors.totalAmount.message}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Additional Details</Text>
                <View style={styles.formField}>
                  <Text style={styles.label}>Narration</Text>
                  <TextInput
                    style={getInputStyle(
                      'description',
                      formMethods.formState.errors?.description,
                    )}
                    multiline
                    numberOfLines={4}
                    value={formMethods.watch('description')}
                    onChangeText={text => {
                      formMethods.setValue('description', text);
                      formMethods.setValue('narration', text);
                    }}
                    placeholder="Describe the transaction..."
                    ref={ref => registerField('description', ref)}
                    blurOnSubmit={true}
                    onFocus={() => setFocusedField('description')}
                    onBlur={() => setFocusedField(null)}
                  />
                  {formMethods.formState.errors?.description && (
                    <Text style={styles.errorText}>
                      {formMethods.formState.errors.description.message}
                    </Text>
                  )}
                </View>
              </View>

              {type === 'journal' && (
                <View style={styles.totalsContainer}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Amount</Text>
                    <TextInput
                      style={[styles.totalInput, styles.readOnlyInput]}
                      value={
                        formMethods.watch('totalAmount')
                          ? Number(
                              formMethods.watch('totalAmount'),
                            ).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : '0.00'
                      }
                      editable={false}
                    />
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export function InvoicePreviewSheet({
  invoicePreviewOpen,
  setInvoicePreviewOpen,
  generatedInvoice,
  onFormSubmit,
  handleWhatsAppInvoice,
  handleDownloadInvoice,
  handleEmailInvoice,
  handlePrintInvoice,
  InvoiceTemplateRenderer,
}) {
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const { showToast } = useEnhancedToast();

  const handleActionWithLoading = useCallback(
    async (action, actionName) => {
      setIsProcessing(true);
      setCurrentAction(actionName);
      try {
        await action();
        showToast('Success', `${actionName} completed successfully`);
      } catch (error) {
        console.error(`${actionName} error:`, error);
        showToast(
          'Error',
          `${actionName} failed. Please try again.`,
          'destructive',
        );
      } finally {
        setIsProcessing(false);
        setCurrentAction(null);
      }
    },
    [showToast],
  );

  const handleClose = useCallback(() => {
    setInvoicePreviewOpen(false);
    if (onFormSubmit) {
      onFormSubmit();
    }
  }, [setInvoicePreviewOpen, onFormSubmit]);

  const ActionButton = useMemo(
    () =>
      ({
        onPress,
        icon,
        title,
        loadingText,
        variant = 'contained',
        color,
        disabled,
      }) =>
        (
          <Button
            mode={variant}
            onPress={onPress}
            style={[
              styles.actionButton,
              variant === 'contained' && color && { backgroundColor: color },
              variant === 'outlined' && color && { borderColor: color },
              disabled && styles.actionButtonDisabled,
            ]}
            icon={icon}
            loading={isProcessing && currentAction === title}
            disabled={isProcessing || disabled}
            contentStyle={styles.actionButtonContent}
            labelStyle={styles.actionButtonLabel}
          >
            {isProcessing && currentAction === title ? loadingText : title}
          </Button>
        ),
    [isProcessing, currentAction],
  );

  return (
    <Portal>
      <Dialog
        visible={invoicePreviewOpen}
        onDismiss={handleClose}
        style={[styles.dialog, isMobile && styles.mobileDialog]}
      >
        <Dialog.Title style={styles.dialogTitle}>
          <View style={styles.dialogHeader}>
            <View style={styles.dialogTitleContainer}>
              <Text style={styles.dialogTitleText}>Invoice Preview</Text>
              {generatedInvoice?.invoiceNumber && (
                <Text style={styles.invoiceNumberText}>
                  #{generatedInvoice.invoiceNumber}
                </Text>
              )}
            </View>
            {generatedInvoice?.selectedTemplate && (
              <Badge style={styles.templateBadge}>
                {generatedInvoice.selectedTemplate}
              </Badge>
            )}
          </View>
        </Dialog.Title>

        <Dialog.Content style={styles.dialogContent}>
          {!isMobile && generatedInvoice && (
            <ScrollView
              style={styles.invoicePreview}
              showsVerticalScrollIndicator={true}
            >
              <InvoiceTemplateRenderer invoiceData={generatedInvoice} />
            </ScrollView>
          )}

          {isMobile && generatedInvoice && (
            <View style={styles.mobileInvoiceActions}>
              <View style={styles.mobileInvoiceHeader}>
                {isProcessing ? (
                  <ActivityIndicator size="large" color="#3b82f6" />
                ) : (
                  <View style={styles.successIcon}>
                    <Text style={styles.successIconText}>✓</Text>
                  </View>
                )}
                <Text style={styles.mobileInvoiceTitle}>
                  {isProcessing ? 'Processing...' : 'Invoice Ready'}
                </Text>
                <Text style={styles.mobileInvoiceSubtitle}>
                  {isProcessing
                    ? `Processing ${currentAction}...`
                    : 'Your invoice has been generated successfully'}
                </Text>
                {generatedInvoice.invoiceNumber && (
                  <Text style={styles.invoiceNumber}>
                    Invoice #: {generatedInvoice.invoiceNumber}
                  </Text>
                )}
              </View>

              <View style={styles.mobileActionButtons}>
                <ActionButton
                  onPress={() =>
                    handleActionWithLoading(handleWhatsAppInvoice, 'WhatsApp')
                  }
                  icon="message-text"
                  title="WhatsApp Invoice"
                  loadingText="Sending..."
                  color="#22c55e"
                  disabled={isProcessing}
                />

                <ActionButton
                  onPress={() =>
                    handleActionWithLoading(handleDownloadInvoice, 'Download')
                  }
                  icon="download"
                  title="Download PDF"
                  loadingText="Downloading..."
                  color="#eab308"
                  disabled={isProcessing}
                />

                <ActionButton
                  onPress={() =>
                    handleActionWithLoading(handleEmailInvoice, 'Email')
                  }
                  icon="email"
                  title="Email Invoice"
                  loadingText="Sending..."
                  color="#f97316"
                  disabled={isProcessing}
                />

                <ActionButton
                  onPress={() =>
                    handleActionWithLoading(handlePrintInvoice, 'Print')
                  }
                  icon="printer"
                  title="Print Invoice"
                  loadingText="Printing..."
                  variant="outlined"
                  color="#22c55e"
                  disabled={isProcessing}
                />
              </View>

              <Text style={styles.mobileFooterText}>
                The invoice will open in your device's default PDF viewer
              </Text>
            </View>
          )}
        </Dialog.Content>

        {!isMobile && (
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={handleClose}
              mode="outlined"
              style={styles.closeButton}
              disabled={isProcessing}
              contentStyle={styles.closeButtonContent}
            >
              Close
            </Button>

            <View style={styles.desktopActionButtons}>
              <ActionButton
                onPress={() =>
                  handleActionWithLoading(handleWhatsAppInvoice, 'WhatsApp')
                }
                icon="message-text"
                title="WhatsApp"
                loadingText="Sending..."
                color="#22c55e"
                disabled={isProcessing}
              />

              <ActionButton
                onPress={() =>
                  handleActionWithLoading(handleEmailInvoice, 'Email')
                }
                icon="email"
                title="Email"
                loadingText="Sending..."
                color="#f97316"
                disabled={isProcessing}
              />

              <ActionButton
                onPress={() =>
                  handleActionWithLoading(handleDownloadInvoice, 'Download')
                }
                icon="download"
                title="Download PDF"
                loadingText="Downloading..."
                variant="outlined"
                color="#eab308"
                disabled={isProcessing}
              />

              <ActionButton
                onPress={() =>
                  handleActionWithLoading(handlePrintInvoice, 'Print')
                }
                icon="printer"
                title="Print"
                loadingText="Printing..."
                variant="outlined"
                color="#22c55e"
                disabled={isProcessing}
              />
            </View>
          </Dialog.Actions>
        )}

        {isMobile && (
          <Dialog.Actions style={styles.mobileDialogActions}>
            <Button
              onPress={handleClose}
              mode="outlined"
              style={styles.mobileCloseButton}
              disabled={isProcessing}
              contentStyle={styles.mobileCloseButtonContent}
            >
              Close
            </Button>
          </Dialog.Actions>
        )}
      </Dialog>
    </Portal>
  );
}

export function ShippingAddressDialogue({
  isOpen,
  onOpenChange,
  editingAddress,
  onSave,
}) {
  const { showToast } = useEnhancedToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactNumber: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);

  const [indiaStates, setIndiaStates] = useState([]);
  const [stateCode, setStateCode] = useState(null);
  const [cityOptions, setCityOptions] = useState([]);

  const initializedRef = useRef(false);

  useEffect(() => {
    const loadStates = async () => {
      try {
        const states = await State.getStatesOfCountry('IN');
        setIndiaStates(states);
      } catch (error) {
        console.error('Error loading states:', error);
        showToast('Error', 'Failed to load states', 'destructive');
      }
    };
    loadStates();
  }, [showToast]);

  useEffect(() => {
    const loadCities = async () => {
      if (stateCode) {
        try {
          const cities = await City.getCitiesOfState('IN', stateCode);
          setCityOptions(cities);
        } catch (error) {
          console.error('Error loading cities:', error);
          setCityOptions([]);
          showToast('Error', 'Failed to load cities', 'destructive');
        }
      } else {
        setCityOptions([]);
      }
    };
    loadCities();
  }, [stateCode, showToast]);

  useEffect(() => {
    if (isOpen && !initializedRef.current) {
      if (editingAddress) {
        setFormData(editingAddress);
        const foundState = indiaStates.find(
          s =>
            s.name.toLowerCase() === (editingAddress.state || '').toLowerCase(),
        );
        setStateCode(foundState?.isoCode || null);
      } else {
        setFormData({
          label: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          contactNumber: '',
        });
        setStateCode(null);
      }
      setFormErrors({});
      initializedRef.current = true;
    }

    if (!isOpen) {
      initializedRef.current = false;
      setFormErrors({});
      setFocusedField(null);
    }
  }, [editingAddress, isOpen, indiaStates]);

  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.label?.trim()) {
      errors.label = 'Label is required';
    }

    if (!formData.address?.trim()) {
      errors.address = 'Address is required';
    }

    if (
      formData.contactNumber &&
      !/^\d{10}$/.test(formData.contactNumber.replace(/\D/g, ''))
    ) {
      errors.contactNumber = 'Please enter a valid 10-digit phone number';
    }

    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      errors.pincode = 'Please enter a valid 6-digit pincode';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSave = useCallback(async () => {
    if (!editingAddress?._id) {
      showToast('Error', 'No address selected for editing.', 'destructive');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const updatedAddress = {
        ...editingAddress,
        ...formData,
      };

      const res = await fetch(
        `${baseURL}/api/shipping-addresses/${editingAddress._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedAddress),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Failed to update shipping address',
        );
      }

      const data = await res.json();
      onSave(data.shippingAddress);

      showToast(
        'Address Updated',
        'Shipping address has been updated successfully.',
      );
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating shipping address:', error);
      showToast(
        'Update Failed',
        error.message || 'Failed to update shipping address.',
        'destructive',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [editingAddress, formData, validateForm, onSave, onOpenChange, showToast]);

  const handleStateChange = useCallback(
    isoCode => {
      setStateCode(isoCode);
      const selectedState = indiaStates.find(s => s.isoCode === isoCode);
      setFormData(prev => ({
        ...prev,
        state: selectedState?.name || '',
        city: '',
      }));
      setFormErrors(prev => ({ ...prev, state: undefined }));
    },
    [indiaStates],
  );

  const handleCityChange = useCallback(city => {
    setFormData(prev => ({ ...prev, city }));
    setFormErrors(prev => ({ ...prev, city: undefined }));
  }, []);

  const getInputStyle = useCallback(
    (fieldName, hasError) => [
      styles.input,
      focusedField === fieldName && styles.inputFocused,
      hasError && styles.inputError,
    ],
    [focusedField],
  );

  const stateOptions = useMemo(
    () =>
      indiaStates
        .map(s => ({ value: s.isoCode, label: s.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [indiaStates],
  );

  const cityComboboxOptions = useMemo(
    () =>
      cityOptions
        .map(c => ({ value: c.name, label: c.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [cityOptions],
  );

  return (
    <Portal>
      <Dialog
        visible={isOpen}
        onDismiss={() => onOpenChange(false)}
        style={styles.dialog}
      >
        <Dialog.Title>Edit Shipping Address</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView style={styles.dialogScrollView}>
            <Text style={styles.dialogDescription}>
              Update the shipping address details.
            </Text>

            <View style={styles.addressForm}>
              <View style={styles.formRow}>
                <View style={[styles.formField, styles.halfWidth]}>
                  <Text style={styles.label}>Address Label *</Text>
                  <TextInput
                    placeholder="e.g., Home, Office, Warehouse"
                    style={getInputStyle('label', formErrors.label)}
                    value={formData.label || ''}
                    onChangeText={text =>
                      setFormData(prev => ({ ...prev, label: text }))
                    }
                    onFocus={() => setFocusedField('label')}
                    onBlur={() => setFocusedField(null)}
                  />
                  {formErrors.label && (
                    <Text style={styles.errorText}>{formErrors.label}</Text>
                  )}
                </View>

                <View style={[styles.formField, styles.halfWidth]}>
                  <Text style={styles.label}>Contact Number</Text>
                  <TextInput
                    placeholder="Contact number"
                    style={getInputStyle(
                      'contactNumber',
                      formErrors.contactNumber,
                    )}
                    value={formData.contactNumber || ''}
                    onChangeText={text =>
                      setFormData(prev => ({ ...prev, contactNumber: text }))
                    }
                    keyboardType="phone-pad"
                    maxLength={10}
                    onFocus={() => setFocusedField('contactNumber')}
                    onBlur={() => setFocusedField(null)}
                  />
                  {formErrors.contactNumber && (
                    <Text style={styles.errorText}>
                      {formErrors.contactNumber}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Address *</Text>
                <TextInput
                  placeholder="Full address"
                  style={[
                    getInputStyle('address', formErrors.address),
                    styles.textArea,
                  ]}
                  multiline
                  numberOfLines={3}
                  value={formData.address || ''}
                  onChangeText={text =>
                    setFormData(prev => ({ ...prev, address: text }))
                  }
                  onFocus={() => setFocusedField('address')}
                  onBlur={() => setFocusedField(null)}
                />
                {formErrors.address && (
                  <Text style={styles.errorText}>{formErrors.address}</Text>
                )}
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formField, styles.halfWidth]}>
                  <Text style={styles.label}>State</Text>
                  <Combobox
                    options={stateOptions}
                    value={stateCode || ''}
                    onChange={handleStateChange}
                    placeholder="Select state"
                    searchPlaceholder="Type a state…"
                    noResultsText="No states found."
                  />
                </View>

                <View style={[styles.formField, styles.halfWidth]}>
                  <Text style={styles.label}>City</Text>
                  <Combobox
                    options={cityComboboxOptions}
                    value={formData.city || ''}
                    onChange={handleCityChange}
                    placeholder={
                      stateCode ? 'Select city' : 'Select a state first'
                    }
                    searchPlaceholder="Type a city…"
                    noResultsText={
                      stateCode ? 'No cities found.' : 'Select a state first'
                    }
                    disabled={!stateCode || cityComboboxOptions.length === 0}
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.label}>Pincode</Text>
                <TextInput
                  placeholder="Pincode"
                  style={getInputStyle('pincode', formErrors.pincode)}
                  value={formData.pincode || ''}
                  onChangeText={text =>
                    setFormData(prev => ({ ...prev, pincode: text }))
                  }
                  keyboardType="numeric"
                  maxLength={6}
                  onFocus={() => setFocusedField('pincode')}
                  onBlur={() => setFocusedField(null)}
                />
                {formErrors.pincode && (
                  <Text style={styles.errorText}>{formErrors.pincode}</Text>
                )}
              </View>
            </View>
          </ScrollView>
        </Dialog.ScrollArea>

        <Dialog.Actions>
          <Button onPress={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onPress={handleSave}
            disabled={isSubmitting}
            mode="contained"
            loading={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

export function HSNSearchInput({ onSelect, placeholder, value, onChange }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Sync with external value changes
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (inputValue.length >= 2) {
        setIsLoading(true);
        setSearchError(null);
        setHasSearched(true);
        try {
          const results = await searchHSNCodes(inputValue);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (err) {
          setSearchError('Search failed. Please try again.');
          setSuggestions([]);
          setShowSuggestions(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setShowSuggestions(false);
        setSuggestions([]);
        setSearchError(null);
        setHasSearched(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleSelect = useCallback(
    hsn => {
      setInputValue(hsn.code);
      setShowSuggestions(false);
      setSearchError(null);
      setHasSearched(false);
      onSelect(hsn);
      if (onChange) {
        onChange(hsn.code);
      }
    },
    [onSelect, onChange],
  );

  const handleInputChange = useCallback(
    text => {
      setInputValue(text);
      if (onChange) {
        onChange(text);
      }
    },
    [onChange],
  );

  const clearSearch = useCallback(() => {
    setInputValue('');
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchError(null);
    setHasSearched(false);
    if (onChange) {
      onChange('');
    }
  }, [onChange]);

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <TextInput
          placeholder={placeholder}
          value={inputValue}
          style={[styles.input, showSuggestions && styles.inputWithSuggestions]}
          onChangeText={handleInputChange}
          onFocus={() => {
            if (inputValue.length >= 2 && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {inputValue.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        )}
        {isLoading && (
          <ActivityIndicator
            size="small"
            color="#3b82f6"
            style={styles.searchLoader}
          />
        )}
      </View>

      {searchError && (
        <View style={styles.searchErrorContainer}>
          <Text style={styles.searchErrorText}>{searchError}</Text>
        </View>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionBox}>
          <ScrollView
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="always"
          >
            {suggestions.map(item => (
              <TouchableOpacity
                key={item.code}
                onPress={() => handleSelect(item)}
                style={styles.suggestionItem}
              >
                <View style={styles.suggestionHeader}>
                  <Text style={styles.suggestionCode}>{item.code}</Text>
                  <Badge style={styles.hsnBadge}>HSN</Badge>
                </View>
                <Text style={styles.suggestionDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {showSuggestions &&
        hasSearched &&
        suggestions.length === 0 &&
        !isLoading &&
        !searchError && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>
              No matching HSN codes found.
            </Text>
            <Text style={styles.noResultsSubtext}>
              Please check the code or enter manually.
            </Text>
          </View>
        )}
    </View>
  );
}

export function SACSearchInput({ onSelect, placeholder, value, onChange }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Sync with external value changes
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (inputValue.length >= 2) {
        setIsLoading(true);
        setSearchError(null);
        setHasSearched(true);
        try {
          const results = await searchSACCodes(inputValue);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (err) {
          setSearchError('Search failed. Please try again.');
          setSuggestions([]);
          setShowSuggestions(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setShowSuggestions(false);
        setSuggestions([]);
        setSearchError(null);
        setHasSearched(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleSelect = useCallback(
    sac => {
      setInputValue(sac.code);
      setShowSuggestions(false);
      setSearchError(null);
      setHasSearched(false);
      onSelect(sac);
      if (onChange) {
        onChange(sac.code);
      }
    },
    [onSelect, onChange],
  );

  const handleInputChange = useCallback(
    text => {
      setInputValue(text);
      if (onChange) {
        onChange(text);
      }
    },
    [onChange],
  );

  const clearSearch = useCallback(() => {
    setInputValue('');
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchError(null);
    setHasSearched(false);
    if (onChange) {
      onChange('');
    }
  }, [onChange]);

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <TextInput
          placeholder={placeholder}
          value={inputValue}
          style={[styles.input, showSuggestions && styles.inputWithSuggestions]}
          onChangeText={handleInputChange}
          onFocus={() => {
            if (inputValue.length >= 2 && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {inputValue.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        )}
        {isLoading && (
          <ActivityIndicator
            size="small"
            color="#8b5cf6"
            style={styles.searchLoader}
          />
        )}
      </View>

      {searchError && (
        <View style={styles.searchErrorContainer}>
          <Text style={styles.searchErrorText}>{searchError}</Text>
        </View>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionBox}>
          <ScrollView
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="always"
          >
            {suggestions.map(item => (
              <TouchableOpacity
                key={item.code}
                onPress={() => handleSelect(item)}
                style={styles.suggestionItem}
              >
                <View style={styles.suggestionHeader}>
                  <Text style={styles.suggestionCode}>{item.code}</Text>
                  <Badge style={styles.sacBadge}>SAC</Badge>
                </View>
                <Text style={styles.suggestionDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {showSuggestions &&
        hasSearched &&
        suggestions.length === 0 &&
        !isLoading &&
        !searchError && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>
              No matching SAC codes found.
            </Text>
            <Text style={styles.noResultsSubtext}>
              Please check the code or enter manually.
            </Text>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  keyboardOpen: {
    paddingBottom: 100,
  },
  mobileTypeSelector: {
    marginBottom: 16,
  },
  mobileSelectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: '#f3f4f6',
  },
  chipSelected: {
    backgroundColor: '#3b82f6',
  },
  chipTextSelected: {
    color: 'white',
  },
  tabContent: {
    marginTop: 8,
  },
  journalContainer: {
    gap: 16,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
    color: '#111827',
  },
  grid: {
    gap: 12,
  },
  formField: {
    marginBottom: 8,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 12,
    borderRadius: 6,
    fontSize: 14,
    backgroundColor: 'white',
    color: '#111827',
  },
  inputFocused: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputWithSuggestions: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  disabledInput: {
    backgroundColor: '#f9fafb',
    opacity: 0.6,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 12,
    borderRadius: 6,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    color: '#111827',
  },
  totalsContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  totalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 8,
    borderRadius: 4,
    width: 140,
    textAlign: 'right',
    color: '#111827',
  },
  readOnlyInput: {
    backgroundColor: '#f9fafb',
    color: '#6b7280',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  searchError: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 8,
    maxHeight: '90%',
    width: '95%',
    alignSelf: 'center',
  },
  mobileDialog: {
    margin: 16,
    width: Dimensions.get('window').width - 32,
  },
  dialogTitle: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dialogTitleContainer: {
    flex: 1,
  },
  dialogTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  invoiceNumberText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  templateBadge: {
    backgroundColor: '#3b82f6',
  },
  dialogContent: {
    padding: 0,
  },
  dialogScrollView: {
    paddingHorizontal: 16,
  },
  dialogDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  invoicePreview: {
    padding: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  closeButton: {
    marginRight: 8,
  },
  closeButtonContent: {
    paddingHorizontal: 16,
  },
  mobileCloseButtonContent: {
    width: '100%',
  },
  desktopActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  mobileInvoiceActions: {
    padding: 16,
    alignItems: 'center',
  },
  mobileInvoiceHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIconText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  mobileInvoiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
    color: '#111827',
  },
  mobileInvoiceSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  mobileActionButtons: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  mobileDialogActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  mobileCloseButton: {
    width: '100%',
  },
  mobileFooterText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  actionButton: {
    margin: 0,
  },
  actionButtonContent: {
    flexDirection: 'row-reverse',
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  whatsappButton: {
    backgroundColor: '#22c55e',
  },
  downloadButton: {
    backgroundColor: '#eab308',
  },
  emailButton: {
    backgroundColor: '#f97316',
  },
  printButton: {
    borderColor: '#22c55e',
  },
  addressForm: {
    gap: 12,
  },
  searchContainer: {
    marginVertical: 8,
  },
  searchInputContainer: {
    position: 'relative',
  },
  clearButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6b7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  searchLoader: {
    position: 'absolute',
    right: 40,
    top: 10,
  },
  searchErrorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  searchErrorText: {
    color: '#dc2626',
    fontSize: 12,
    textAlign: 'center',
  },
  suggestionBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    maxHeight: 150,
    marginTop: -1,
    backgroundColor: 'white',
    borderTopWidth: 0,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  suggestionCode: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    color: '#111827',
  },
  suggestionDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  hsnBadge: {
    backgroundColor: '#3b82f6',
    fontSize: 10,
  },
  sacBadge: {
    backgroundColor: '#8b5cf6',
    fontSize: 10,
  },
  noResults: {
    padding: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 6,
    marginTop: 4,
  },
  noResultsText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 12,
    color: '#b91c1c',
    textAlign: 'center',
    marginTop: 2,
  },
});

export default {
  FormTabs,
  InvoicePreviewSheet,
  ShippingAddressDialogue,
  HSNSearchInput,
  SACSearchInput,
};
