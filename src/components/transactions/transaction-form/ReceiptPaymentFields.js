import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal as RNModal,
  TouchableOpacity,
  Text,
  TextInput,
  Switch,
  Platform,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Combobox } from '../../ui/Combobox';
import { formatCurrency } from '../../../lib/pdf-utils';
import { useToast } from '../../hooks/useToast';
import { BASE_URL } from '../../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Using a common icon library for buttons

// Custom Button Component for better styling (Pressable with Text)
const OutlineButton = ({ onPress, children, icon }) => (
  <TouchableOpacity onPress={onPress} style={styles.selectButton}>
    {icon && (
      <Icon
        name={icon}
        size={20}
        color="#007AFF"
        style={styles.selectButtonIcon}
      />
    )}
    <Text style={styles.selectButtonText}>{children}</Text>
  </TouchableOpacity>
);

// Custom Card Component (View with Shadow/Elevation)
const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const ReceiptPaymentFields = props => {
  const {
    type,
    companies,
    partyOptions,
    partyLabel,
    partyCreatable,
    partyBalance,
    vendorBalance,
    handlePartyChangeWrapper,
    handleTriggerCreateParty,
    paymentExpenses = [],
    setPaymentExpenses,
    paymentMethodsForReceipt,
  } = props;

  const baseURL = BASE_URL;
  const { toast } = useToast();

  // Form state management for React Native
  const [formState, setFormState] = useState({
    company: '',
    date: new Date().toISOString().split('T')[0],
    isExpense: false,
    party: '',
    expense: '',
    totalAmount: '',
    paymentMethod: '',
    referenceNumber: '',
    description: '',
  });

  const totalAmountValue = formState.totalAmount;
  const [displayValue, setDisplayValue] = useState(() => {
    const numValue = Number(totalAmountValue);
    return numValue && !isNaN(numValue)
      ? numValue.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '';
  });

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [paymentMethodModalVisible, setPaymentMethodModalVisible] =
    useState(false);

  // Update form state
  const setFormValue = (key, value) => {
    setFormState(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Watch form values (simulate react-hook-form's watch)
  const watch = key => {
    return formState[key];
  };

  useEffect(() => {
    const numValue = Number(totalAmountValue);

    if (numValue && !isNaN(numValue)) {
      const stringValue = totalAmountValue.toString();
      const hasDecimal = stringValue.includes('.');

      if (hasDecimal) {
        const [integerPart, decimalPart] = stringValue.split('.');
        // Ensure integerPart is formatted but handle empty string if input starts with '.'
        const formattedInt = integerPart
          ? Number(integerPart).toLocaleString('en-IN')
          : '';
        setDisplayValue(`${formattedInt}.${decimalPart}`);
      } else {
        setDisplayValue(numValue.toLocaleString('en-IN'));
      }
    } else {
      setDisplayValue('');
    }
  }, [totalAmountValue]);

  // Dismiss keyboard when component loads or type changes
  useEffect(() => {
    Keyboard.dismiss();
  }, [type]);

  const formatInput = value => {
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
  };

  // Fixed API call with AsyncStorage
  const createExpense = async name => {
    if (!name.trim()) return '';
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication token not found.');
      }

      const res = await fetch(`${baseURL}/api/payment-expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          company: formState.company,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create expense.');
      }

      setPaymentExpenses(prev => [...prev, data.expense]);

      toast({
        title: 'Expense Created',
        description: `${name} has been added.`,
      });

      setFormValue('expense', data.expense._id);
      return data.expense._id;
    } catch (error) {
      console.error('Error creating expense:', error);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description:
          error instanceof Error ? error.message : 'Failed to create expense.',
      });
      return '';
    }
  };

  const renderBalanceDisplay = (balance, isVendor = false) => {
    if (balance === null) return null;

    let backgroundColor = '#f5f5f5';
    let textColor = '#666';
    let message = '';
    const formattedBalance = formatCurrency(Math.abs(balance));

    if (balance > 0) {
      // Customer OWES (Receipt) or We PAID Vendor (Payment)
      backgroundColor = isVendor ? '#e8f5e8' : '#ffebee'; // Green for money we received, Red for money we spent
      textColor = isVendor ? '#2e7d32' : '#c62828';
      message = isVendor
        ? `You have already paid: ₹${formattedBalance}`
        : `Customer needs to pay: ₹${formattedBalance}`;
    } else if (balance < 0) {
      // Customer PAID US (Receipt) or We OWE Vendor (Payment)
      backgroundColor = isVendor ? '#ffebee' : '#e8f5e8'; // Red for money we owe, Green for money we received
      textColor = isVendor ? '#c62828' : '#2e7d32';
      message = isVendor
        ? `You need to pay vendor: ₹${formattedBalance}`
        : `Customer has paid: ₹${formattedBalance}`;
    } else {
      message = `${
        isVendor ? 'Vendor' : 'Customer'
      } balance: ₹${formattedBalance}`;
    }

    return (
      <Card style={[styles.balanceCard, { backgroundColor }]}>
        <View style={styles.cardContent}>
          <Text style={[styles.balanceLabel, { color: '#666' }]}>
            Current Balance
          </Text>
          <Text style={[styles.balanceAmount, { color: textColor }]}>
            {message}
          </Text>
        </View>
      </Card>
    );
  };

  const CompanyModal = ({ visible, onClose, companies, onSelect }) => (
    <RNModal
      visible={visible}
      onRequestClose={onClose}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Select Company</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {companies.map(company => (
              <TouchableOpacity
                key={company._id}
                onPress={() => {
                  onSelect(company._id);
                  onClose();
                }}
              >
                <Card style={styles.optionCard}>
                  <View style={styles.cardContent}>
                    <Text style={styles.optionText}>
                      {company.businessName}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <OutlineButton onPress={onClose}>Cancel</OutlineButton>
          </View>
        </View>
      </View>
    </RNModal>
  );

  const DateModal = ({ visible, onClose, selectedDate, onDaySelect }) => {
    const handleDateChange = (event, selectedDate) => {
      if (selectedDate) {
        const dateString = selectedDate.toISOString().split('T')[0];
        onDaySelect(dateString);
      }
      if (Platform.OS === 'android') {
        onClose();
      }
    };

    if (!visible) return null;

    return (
      <DateTimePicker
        value={selectedDate ? new Date(selectedDate) : new Date()}
        mode="date"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={handleDateChange}
      />
    );
  };

  const PaymentMethodModal = ({
    visible,
    onClose,
    methods,
    onSelect,
    selectedMethod,
  }) => (
    <RNModal
      visible={visible}
      onRequestClose={onClose}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Select Payment Method</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {methods.map(method => (
              <TouchableOpacity
                key={method}
                onPress={() => {
                  onSelect(method);
                  onClose();
                }}
              >
                <Card
                  style={[
                    styles.optionCard,
                    selectedMethod === method && styles.selectedOptionCard,
                  ]}
                >
                  <View style={styles.cardContent}>
                    <Text
                      style={[
                        styles.optionText,
                        selectedMethod === method && styles.selectedOptionText,
                      ]}
                    >
                      {method}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <OutlineButton onPress={onClose}>Cancel</OutlineButton>
          </View>
        </View>
      </View>
    </RNModal>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Company</Text>
          <OutlineButton onPress={() => setCompanyModalVisible(true)}>
            {watch('company')
              ? companies.find(c => c._id === watch('company'))?.businessName
              : 'Select a company'}
          </OutlineButton>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Transaction Date</Text>
          <OutlineButton
            onPress={() => setDatePickerVisible(true)}
            icon="calendar"
          >
            {watch('date')
              ? new Date(watch('date')).toLocaleDateString()
              : 'Pick a date'}
          </OutlineButton>
        </View>

        {type === 'payment' && (
          <View style={styles.fieldContainer}>
            <View style={styles.checkboxContainer}>
              <Switch
                value={watch('isExpense')}
                onValueChange={newValue => {
                  setFormValue('isExpense', newValue);

                  if (newValue) {
                    setFormValue('party', '');
                  } else {
                    setFormValue('expense', '');
                  }
                }}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={watch('isExpense') ? '#f4f3f4' : '#f4f3f4'}
              />
              <View style={styles.checkboxLabelContainer}>
                <Text style={styles.checkboxLabel}>Expense</Text>
                <Text style={styles.checkboxDescription}>
                  Check if this is an expense payment
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.fieldContainer}>
          {type === 'payment' && watch('isExpense') ? (
            <>
              <Text style={styles.label}>Expense</Text>
              <Combobox
                options={(paymentExpenses || []).map(expense => ({
                  value: expense._id,
                  label: expense.name,
                }))}
                value={watch('expense') || ''}
                onChange={value => setFormValue('expense', value)}
                placeholder="Select or create expense..."
                searchPlaceholder="Search expenses..."
                noResultsText="No expenses found."
                creatable={true}
                onCreate={createExpense}
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>{partyLabel}</Text>
              <Combobox
                data-testid="party-combobox"
                options={partyOptions}
                value={watch('party') || ''}
                onChange={value => {
                  setFormValue('party', value);
                  if (type === 'receipt' || type === 'payment') {
                    handlePartyChangeWrapper(value);
                  }
                }}
                placeholder="Select or create..."
                searchPlaceholder="Enter Name"
                noResultsText="No results found."
                creatable={partyCreatable}
                onCreate={async name => {
                  if (!partyCreatable) {
                    toast({
                      variant: 'destructive',
                      title: 'Permission denied',
                      description:
                        "You don't have permission to create vendors.",
                    });
                    return '';
                  }
                  handleTriggerCreateParty(name);
                  return '';
                }}
              />

              {partyBalance != null &&
                type === 'receipt' &&
                renderBalanceDisplay(partyBalance, false)}

              {vendorBalance != null &&
                type === 'payment' &&
                renderBalanceDisplay(vendorBalance, true)}
            </>
          )}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="₹0.00"
            value={displayValue}
            onChangeText={text => {
              if (!text.trim()) {
                setDisplayValue('');
                setFormValue('totalAmount', '');
              } else {
                const formatted = formatInput(text);
                setDisplayValue(formatted);
                setFormValue('totalAmount', formatted.replace(/,/g, ''));
              }
            }}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Payment Method</Text>
          <OutlineButton onPress={() => setPaymentMethodModalVisible(true)}>
            {watch('paymentMethod') || 'Select Payment Method'}
          </OutlineButton>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Reference Number (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Cheque No, Ref #"
            value={watch('referenceNumber')}
            onChangeText={text => setFormValue('referenceNumber', text)}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Description / Narration</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the transaction..."
            value={watch('description')}
            onChangeText={text => setFormValue('description', text)}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      {/* Modals */}
      <CompanyModal
        visible={companyModalVisible}
        onClose={() => setCompanyModalVisible(false)}
        companies={companies}
        onSelect={id => setFormValue('company', id)}
      />

      <DateModal
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        selectedDate={watch('date')}
        onDaySelect={dateString => setFormValue('date', dateString)}
      />

      <PaymentMethodModal
        visible={paymentMethodModalVisible}
        onClose={() => setPaymentMethodModalVisible(false)}
        methods={paymentMethodsForReceipt}
        onSelect={method => setFormValue('paymentMethod', method)}
        selectedMethod={watch('paymentMethod')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', // Light background for the whole screen
  },
  content: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#D1D5DB', // Light gray border
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: 'top', // For Android
  },
  // Custom Outline Button Style
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    justifyContent: 'flex-start',
  },
  selectButtonIcon: {
    marginRight: 8,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#1F2937', // Dark text color
  },
  // Checkbox (Switch) Styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkboxLabelContainer: {
    marginLeft: 12,
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  checkboxDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  // Card/Balance Styles
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    // Elevation for Android
    elevation: 3,
  },
  cardContent: {
    padding: 12,
  },
  balanceCard: {
    marginTop: 12,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // Slightly lighter overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    maxHeight: '85%',
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: 720,
      },
    }),
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6B7280',
  },
  modalActions: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  modalContent: {
    maxHeight: 400,
  },
  optionCard: {
    marginBottom: 8,
    backgroundColor: '#F9FAFB', // Light gray background for options
  },
  selectedOptionCard: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#EBF5FF',
  },
  optionText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#007AFF',
  },
  datePickerContainer: {
    marginVertical: 16,
    paddingHorizontal: 12,
  },
});
