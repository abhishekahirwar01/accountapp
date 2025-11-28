import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal as RNModal,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button, Card, Text, Checkbox } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { Combobox } from '../../ui/Combobox';
import { formatCurrency } from '../../../lib/pdf-utils';
import { useToast } from '../../hooks/useToast';
import { BASE_URL } from '../../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ReceiptPaymentFields = props => {
  const {
    form,
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
        const formattedInt = Number(integerPart).toLocaleString('en-IN');
        setDisplayValue(`${formattedInt}.${decimalPart}`);
      } else {
        setDisplayValue(numValue.toLocaleString('en-IN'));
      }
    } else {
      setDisplayValue('');
    }
  }, [totalAmountValue]);

  const formatInput = value => {
    const cleaned = value.replace(/[^\d.]/g, '');
    const [integerPart, decimalPart] = cleaned.split('.');

    const formattedInt = integerPart
      ? Number(integerPart).toLocaleString('en-IN')
      : '';

    return decimalPart !== undefined
      ? `${formattedInt}.${decimalPart}`
      : formattedInt;
  };

  // Fixed API call with AsyncStorage
  const createExpense = async name => {
    if (!name.trim()) return '';
    try {
      // Fixed: Use AsyncStorage instead of localStorage
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

    if (balance > 0) {
      backgroundColor = isVendor ? '#e8f5e8' : '#ffebee';
      textColor = isVendor ? '#2e7d32' : '#c62828';
      message = isVendor
        ? `You have already paid: ₹${formatCurrency(balance)}`
        : `Customer needs to pay: ₹${formatCurrency(balance)}`;
    } else if (balance < 0) {
      backgroundColor = isVendor ? '#ffebee' : '#e8f5e8';
      textColor = isVendor ? '#c62828' : '#2e7d32';
      message = isVendor
        ? `You need to pay vendor: ₹${formatCurrency(Math.abs(balance))}`
        : `Customer has paid: ₹${Math.abs(balance).toFixed(2)}`;
    } else {
      message = `${isVendor ? 'Vendor' : 'Customer'} balance: ₹${formatCurrency(
        balance,
      )}`;
    }

    return (
      <Card style={[styles.balanceCard, { backgroundColor }]}>
        <Card.Content>
          <Text style={[styles.balanceLabel, { color: '#666' }]}>
            Current Balance
          </Text>
          <Text style={[styles.balanceAmount, { color: textColor }]}>
            {message}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Company</Text>
          <Button
            mode="outlined"
            onPress={() => setCompanyModalVisible(true)}
            style={styles.selectButton}
          >
            {watch('company')
              ? companies.find(c => c._id === watch('company'))?.businessName
              : 'Select a company'}
          </Button>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Transaction Date</Text>
          <Button
            mode="outlined"
            onPress={() => setDatePickerVisible(true)}
            style={styles.selectButton}
            icon="calendar"
          >
            {watch('date')
              ? new Date(watch('date')).toLocaleDateString()
              : 'Pick a date'}
          </Button>
        </View>

        {type === 'payment' && (
          <View style={styles.fieldContainer}>
            <View style={styles.checkboxContainer}>
              <Checkbox.Android
                status={watch('isExpense') ? 'checked' : 'unchecked'}
                onPress={() => {
                  const newValue = !watch('isExpense');
                  setFormValue('isExpense', newValue);

                  if (newValue) {
                    setFormValue('party', '');
                  } else {
                    setFormValue('expense', '');
                  }
                }}
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
            mode="outlined"
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
            style={styles.input}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Payment Method</Text>
          <Button
            mode="outlined"
            onPress={() => setPaymentMethodModalVisible(true)}
            style={styles.selectButton}
          >
            {watch('paymentMethod') || 'Select Payment Method'}
          </Button>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Reference Number (Optional)</Text>
          <TextInput
            mode="outlined"
            placeholder="e.g. Cheque No, Ref #"
            value={watch('referenceNumber')}
            onChangeText={text => setFormValue('referenceNumber', text)}
            style={styles.input}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Description / Narration</Text>
          <TextInput
            mode="outlined"
            placeholder="Describe the transaction..."
            value={watch('description')}
            onChangeText={text => setFormValue('description', text)}
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textArea]}
          />
        </View>
      </View>

      {/* Modals */}
      <RNModal
        visible={companyModalVisible}
        onRequestClose={() => setCompanyModalVisible(false)}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderRow}>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                Select Company
              </Text>
              <Button onPress={() => setCompanyModalVisible(false)}>✕</Button>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {companies.map(company => (
                <TouchableOpacity
                  key={company._id}
                  onPress={() => {
                    setFormValue('company', company._id);
                    setCompanyModalVisible(false);
                  }}
                >
                  <Card style={styles.optionCard}>
                    <Card.Content>
                      <Text style={styles.optionText}>
                        {company.businessName}
                      </Text>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setCompanyModalVisible(false)}
              >
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </RNModal>

      <RNModal
        visible={datePickerVisible}
        onRequestClose={() => setDatePickerVisible(false)}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderRow}>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                Select Date
              </Text>
              <Button onPress={() => setDatePickerVisible(false)}>✕</Button>
            </View>

            <Calendar
              onDayPress={day => {
                setFormValue('date', day.dateString);
                setDatePickerVisible(false);
              }}
              markedDates={{
                [watch('date')]: {
                  selected: true,
                  selectedColor: '#2196F3',
                },
              }}
              style={styles.calendar}
            />

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setDatePickerVisible(false)}
              >
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </RNModal>

      <RNModal
        visible={paymentMethodModalVisible}
        onRequestClose={() => setPaymentMethodModalVisible(false)}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderRow}>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                Select Payment Method
              </Text>
              <Button onPress={() => setPaymentMethodModalVisible(false)}>
                ✕
              </Button>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {paymentMethodsForReceipt.map(method => (
                <TouchableOpacity
                  key={method}
                  onPress={() => {
                    setFormValue('paymentMethod', method);
                    setPaymentMethodModalVisible(false);
                  }}
                >
                  <Card style={styles.optionCard}>
                    <Card.Content>
                      <Text style={styles.optionText}>{method}</Text>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setPaymentMethodModalVisible(false)}
              >
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </RNModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
  },
  textArea: {
    minHeight: 80,
  },
  selectButton: {
    justifyContent: 'flex-start',
    backgroundColor: 'white',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabelContainer: {
    marginLeft: 8,
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkboxDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  balanceCard: {
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 10,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 720,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalActions: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  optionText: {
    fontSize: 16,
    color: '#111827',
  },
  modalContent: {
    maxHeight: 400,
  },
  optionCard: {
    marginBottom: 8,
    elevation: 1,
  },
  calendar: {
    borderRadius: 8,
    marginVertical: 16,
  },
});
