import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
  Switch,
  Platform,
  Keyboard,
} from 'react-native';
import { Controller } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Combobox } from '../../ui/Combobox';
import { formatCurrency } from '../../../lib/pdf-utils';
import { useToast } from '../../hooks/useToast';
import { BASE_URL } from '../../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CustomDropdown from '../../ui/CustomDropdown';

// Reusable components (can be moved to a UI library)
const OutlineButton = ({ onPress, children, icon, style }) => (
  <TouchableOpacity onPress={onPress} style={[styles.selectButton, style]}>
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

const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const FormMessage = ({ error }) => {
  if (!error?.message) return null;
  return <Text style={styles.errorText}>{error.message}</Text>;
};

export const ReceiptPaymentFields = props => {
  const {
    form,
    type,
    companies,
    companyOptions,
    partyOptions,
    partyLabel,
    partyCreatable,
    partyBalance,
    vendorBalance,
    handlePartyChangeWrapper,
    handleTriggerCreateParty,
    paymentExpenses = [],
    expenseOptions,
    setPaymentExpenses,
    paymentMethodReceiptOptions,
    companyDropdownOpen,
    setCompanyDropdownOpen,
    partyDropdownOpen,
    setPartyDropdownOpen,
    expenseDropdownOpen,
    setExpenseDropdownOpen,
    paymentMethodDropdownOpen,
    setPaymentMethodDropdownOpen,
    canCreateInventory,
    canCreateCustomer,
    canCreateVendor,
  } = props;

  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const { toast } = useToast();

  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const isExpense = watch('isExpense');
  const watchedCompany = watch('company');
  const watchedDate = watch('date');
  const watchedPaymentMethod = watch('paymentMethod');
  const totalAmountValue = watch('totalAmount');

  // Dismiss keyboard when component loads or type changes
  useEffect(() => {
    Keyboard.dismiss();
  }, [type]);

  const createExpense = async name => {
    if (!name.trim()) return '';
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found.');
      }

      const res = await fetch(`${BASE_URL}/api/payment-expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), company: watchedCompany }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create expense.');

      setPaymentExpenses(prev => [...prev, data.expense]);
      toast({
        title: 'Expense Created',
        description: `${name} has been added.`,
      });
      setValue('expense', data.expense._id, { shouldValidate: true });
      return data.expense._id;
    } catch (error) {
      console.error('Error creating expense:', error);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: error.message,
      });
      return '';
    }
  };

  const renderBalanceDisplay = () => {
    const formatCurrencyDisplay = value => {
      if (value === '' || value === null || value === undefined) return '';
      try {
        const formatted = formatCurrency(value);
        if (!formatted) return '';
        return String(formatted).startsWith('₹')
          ? String(formatted)
          : '₹ ' + String(formatted);
      } catch (err) {
        const num = Number(value);
        if (isNaN(num)) return '';
        return (
          '₹ ' +
          new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(num)
        );
      }
    };
    // Show customer balance for sales/receipt
    if ((type === 'sales' || type === 'receipt') && partyBalance != null) {
      const b = partyBalance;

      // Zero balance: neutral message
      if (b === 0) {
        return (
          <Card
            style={[
              styles.balanceCard,
              { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
            ]}
          >
            <View style={{ paddingVertical: 6 }}>
              <Text style={[styles.balanceLabel, { color: '#666' }]}>
                Current Balance
              </Text>
              <Text style={[styles.balanceAmount, { color: '#374151' }]}>
                {`Customer balance: ${formatCurrencyDisplay(0)}`}
              </Text>
            </View>
          </Card>
        );
      }

      const isCustomerOwed = b > 0;
      return (
        <Card
          style={[
            styles.balanceCard,
            {
              backgroundColor: isCustomerOwed ? '#FEF2F2' : '#F0FDF4',
              borderColor: isCustomerOwed ? '#FECACA' : '#BBF7D0',
            },
          ]}
        >
          <View style={{ paddingVertical: 6 }}>
            <Text style={[styles.balanceLabel, { color: '#666' }]}>
              Current Balance
            </Text>
            <Text
              style={[
                styles.balanceAmount,
                { color: isCustomerOwed ? '#DC2626' : '#16A34A' },
              ]}
            >
              {isCustomerOwed
                ? `Customer needs to pay: ${formatCurrencyDisplay(b)}`
                : `Customer advance payment: ${formatCurrencyDisplay(
                    Math.abs(b),
                  )}`}
            </Text>
          </View>
        </Card>
      );
    }

    // Show vendor balance for purchases/payment
    if ((type === 'purchases' || type === 'payment') && vendorBalance != null) {
      const b = vendorBalance;

      if (b === 0) {
        return (
          <Card
            style={[
              styles.balanceCard,
              { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
            ]}
          >
            <View style={{ paddingVertical: 6 }}>
              <Text style={[styles.balanceLabel, { color: '#666' }]}>
                Current Balance
              </Text>
              <Text style={[styles.balanceAmount, { color: '#374151' }]}>
                {`Vendor balance: ${formatCurrencyDisplay(0)}`}
              </Text>
            </View>
          </Card>
        );
      }

      const vendorPayable = b < 0; // negative means we owe vendor
      return (
        <Card
          style={[
            styles.balanceCard,
            {
              backgroundColor: vendorPayable ? '#FEF2F2' : '#F0FDF4',
              borderColor: vendorPayable ? '#FECACA' : '#BBF7D0',
            },
          ]}
        >
          <View style={{ paddingVertical: 6 }}>
            <Text style={[styles.balanceLabel, { color: '#666' }]}>
              Current Balance
            </Text>
            <Text
              style={[
                styles.balanceAmount,
                { color: vendorPayable ? '#DC2626' : '#16A34A' },
              ]}
            >
              {vendorPayable
                ? `You need to pay vendor: ${formatCurrencyDisplay(
                    Math.abs(b),
                  )}`
                : `Vendor advance payment: ${formatCurrencyDisplay(b)}`}
            </Text>
          </View>
        </Card>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Company</Text>
          <Controller
            control={control}
            name="company"
            render={({ field: { onChange, value } }) => (
              <CustomDropdown
                open={companyDropdownOpen}
                setOpen={setCompanyDropdownOpen}
                value={value}
                items={companyOptions.filter(o => o.value)}
                onChange={onChange}
                placeholder="Select a company"
                zIndex={3000}
                zIndexInverse={1000}
              />
            )}
          />
          <FormMessage error={errors.company} />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Transaction Date</Text>
          <Controller
            control={control}
            name="date"
            render={({ field: { onChange, value } }) => (
              <>
                <OutlineButton
                  onPress={() => setDatePickerVisible(true)}
                  icon="calendar"
                  style={errors.date ? styles.errorBorder : {}}
                >
                  {new Date(value).toLocaleDateString()}
                </OutlineButton>
                {datePickerVisible && (
                  <DateTimePicker
                    value={new Date(value)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setDatePickerVisible(false);
                      if (selectedDate) {
                        onChange(selectedDate);
                      }
                    }}
                    maximumDate={new Date()}
                  />
                )}
              </>
            )}
          />
          <FormMessage error={errors.date} />
        </View>

        {type === 'payment' && (
          <View style={styles.fieldContainer}>
            <View style={styles.checkboxContainer}>
              <Controller
                control={control}
                name="isExpense"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={newValue => {
                      onChange(newValue);
                      if (newValue) {
                        setValue('party', '');
                      } else {
                        setValue('expense', '');
                      }
                    }}
                    trackColor={{ false: '#767577', true: '#007AFF' }}
                    thumbColor={value ? '#f4f3f4' : '#f4f3f4'}
                  />
                )}
              />
              <View style={styles.checkboxLabelContainer}>
                <Text style={styles.checkboxLabel}>Mark as Expense</Text>
                <Text style={styles.checkboxDescription}>
                  Categorize this payment as a business expense
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.fieldContainer}>
          {isExpense && type === 'payment' ? (
            <>
              <Text style={styles.label}>Expense Category</Text>
              <Controller
                control={control}
                name="expense"
                render={({ field: { onChange, value } }) => (
                  <Combobox
                    options={expenseOptions}
                    value={value}
                    onChange={onChange}
                    placeholder="Select or create expense..."
                    searchPlaceholder="Search expenses..."
                    noResultsText="No expenses found."
                    creatable={true}
                    onCreate={createExpense}
                  />
                )}
              />
              <FormMessage error={errors.expense} />
            </>
          ) : (
            <>
              <Text style={styles.label}>{partyLabel}</Text>
              <Controller
                control={control}
                name="party"
                render={({ field: { onChange, value } }) => (
                  <Combobox
                    options={partyOptions}
                    value={value}
                    onChange={selectedValue => {
                      onChange(selectedValue);
                      handlePartyChangeWrapper(selectedValue);
                    }}
                    placeholder="Select or create..."
                    searchPlaceholder="Enter Name"
                    noResultsText="No results found."
                    creatable={partyCreatable}
                    onCreate={name => {
                      if (!partyCreatable) {
                        toast({
                          variant: 'destructive',
                          title: 'Permission denied',
                          description:
                            type === 'receipt'
                              ? "You don't have permission to create customers."
                              : "You don't have permission to create vendors.",
                        });
                        return '';
                      }
                      handleTriggerCreateParty(name);
                      return '';
                    }}
                  />
                )}
              />
              <FormMessage error={errors.party} />
              {renderBalanceDisplay()}
            </>
          )}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Amount</Text>
          <Controller
            control={control}
            name="totalAmount"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[
                  styles.input,
                  errors.totalAmount ? styles.errorBorder : {},
                ]}
                placeholder="₹0.00"
                value={String(value || '')}
                onChangeText={onChange}
                keyboardType="numeric"
              />
            )}
          />
          <FormMessage error={errors.totalAmount} />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Payment Method</Text>
          <Controller
            control={control}
            name="paymentMethod"
            render={({ field: { onChange, value } }) => (
              <CustomDropdown
                open={paymentMethodDropdownOpen}
                setOpen={setPaymentMethodDropdownOpen}
                value={value}
                items={paymentMethodReceiptOptions.filter(o => o.value)}
                onChange={onChange}
                placeholder="Select Payment Method"
                zIndex={1000}
                zIndexInverse={3000}
              />
            )}
          />
          <FormMessage error={errors.paymentMethod} />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Reference Number (Optional)</Text>
          <Controller
            control={control}
            name="referenceNumber"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="e.g. Cheque No, Ref #"
                value={value || ''}
                onChangeText={onChange}
              />
            )}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Description / Narration</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the transaction..."
                value={value || ''}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
              />
            )}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingBottom: 12,
  },
  content: {
    padding: 12,
    paddingTop: 14,
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
    height: 45,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: 'white',
    color: '#1F2937',
  },
  textArea: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
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
    color: '#1F2937',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
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
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardContent: {
    padding: 12,
  },
  balanceCard: {
    marginTop: 12,
    borderLeftWidth: 4,
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
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
  },
  errorBorder: {
    borderColor: '#DC2626',
  },
});
