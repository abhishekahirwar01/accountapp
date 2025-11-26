import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useForm, useWatch, Controller } from 'react-hook-form';
import Toast from 'react-native-toast-message';
import { formatCurrency } from '../../../lib/pdf-utils';
import { Combobox } from '../../ui/Combobox';
import QuillEditor from '../../ui/QuillEditor';
import { HSNSearchInput, SACSearchInput } from './transactionForm-parts';
import { handleHSNSelect, handleSACSelect } from './transaction-utils';
import { BASE_URL } from '../../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IconMap = {
  Calendar: 'calendar',
  Check: 'check',
  ChevronDown: 'chevron-down',
  Copy: 'content-copy',
  Edit: 'pencil',
  Plus: 'plus-circle',
  Trash2: 'trash-can-outline',
  X: 'close',
  ShoppingCart: 'cart-outline',
  Zap: 'lightning-bolt-outline',
  Bank: 'bank-outline',
  Cash: 'cash',
  CreditCard: 'credit-card-outline',
};

const PRODUCT_DEFAULT = {
  itemType: 'product',
  product: '',
  quantity: 1,
  unitType: '',
  otherUnit: '',
  pricePerUnit: 0,
  amount: 0,
  hsn: '',
  gstPercentage: 18,
  lineTax: 0,
  lineTotal: 0,
};

const GST_OPTIONS = [
  { label: '0%', value: '0' },
  { label: '5%', value: '5' },
  { label: 'Standard (18%)', value: '18' },
  { label: '40%', value: '40' },
  { label: 'Custom', value: 'custom' },
];

const unitTypes = [
  'Kg',
  'Litre',
  'Piece',
  'Box',
  'Meter',
  'Dozen',
  'Pack',
  'Other',
];

const QUICK_DATE_OPTIONS = [
  { label: '7 Days', days: 7 },
  { label: '10 Days', days: 10 },
  { label: '15 Days', days: 15 },
  { label: '30 Days', days: 30 },
  { label: '45 Days', days: 45 },
  { label: '60 Days', days: 60 },
  { label: '90 Days', days: 90 },
];

const PAYMENT_METHOD_ICONS = {
  Cash: 'cash',
  Credit: 'credit-card-outline',
  UPI: 'cellphone',
  'Bank Transfer': 'bank-transfer',
  Cheque: 'note-text-outline',
  Others: 'dots-horizontal-circle',
};

const formatWithCommas = value => {
  if (value === '' || value === null || value === undefined) return '';
  const num = Number(value);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

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

const FormMessage = ({ error, message }) => {
  if (!error) return null;
  return <Text style={styles.errorText}>{message || error.message}</Text>;
};

const CustomCard = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const CustomButton = ({
  children,
  onPress,
  mode = 'contained',
  style,
  textStyle,
  disabled = false,
}) => {
  const isOutlined = mode === 'outlined';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isOutlined ? styles.buttonOutlined : styles.buttonContained,
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.buttonText,
          isOutlined ? styles.buttonOutlinedText : styles.buttonContainedText,
          textStyle,
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const CustomCheckbox = ({ status, onPress, label, description }) => (
  <TouchableOpacity style={styles.checkboxContainer} onPress={onPress}>
    <View
      style={[styles.checkbox, status === 'checked' && styles.checkboxChecked]}
    >
      {status === 'checked' && <Icon name="check" size={16} color="#FFFFFF" />}
    </View>
    <View style={styles.checkboxContent}>
      <Text style={styles.checkboxLabel}>{label}</Text>
      {description && (
        <Text style={styles.checkboxDescription}>{description}</Text>
      )}
    </View>
  </TouchableOpacity>
);

const CustomMenu = ({ visible, onDismiss, anchor, children }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onDismiss}
      animationType="fade"
    >
      <Pressable style={styles.menuOverlay} onPress={onDismiss}>
        <View style={styles.menuContainer}>{children}</View>
      </Pressable>
    </Modal>
  );
};

const MenuItem = ({ onPress, title, leadingIcon, trailing }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemContent}>
      {leadingIcon && (
        <Icon
          name={leadingIcon}
          size={20}
          color="#374151"
          style={styles.menuItemIcon}
        />
      )}
      <Text style={styles.menuItemText}>{title}</Text>
    </View>
    {trailing}
  </TouchableOpacity>
);

export const SalesPurchasesFields = props => {
  const {
    form,
    type,
    registerField,
    companies,
    partyOptions,
    partyLabel,
    partyCreatable,
    partyBalance,
    vendorBalance,
    paymentMethods,
    banks: propBanks,
    selectedCompanyIdWatch,
    gstEnabled,
    handlePartyChangeWrapper,
    handleTriggerCreateParty,
    paymentMethod,
    parties,
    shippingAddresses,
    indiaStates,
    setShippingStateCode,
    setIsEditShippingAddressDialogOpen,
    setEditAddressForm,
    setEditingShippingAddress,
    shippingStateCode,
    shippingStateOptions,
    shippingCityOptions,
    fields,
    insert,
    append,
    itemRenderKeys,
    remove,
    productOptions,
    products,
    setCreatingProductForIndex,
    setItemRenderKeys,
    setLastEditedField,
    setUnitOpen,
    unitOpen,
    handleTriggerCreateProduct,
    serviceOptions,
    services,
    setIsServiceDialogOpen,
    serviceCreatable,
    setCreatingServiceForIndex,
    setNewEntityName,
    transactionToEdit,
  } = props;

  const {
    formState: { errors, dirtyFields },
    watch,
    setValue,
    getValues,
    control,
    trigger,
  } = form;

  const [existingUnits, setExistingUnits] = useState([]);
  const [customGstInputs, setCustomGstInputs] = useState({});
  const [showNotes, setShowNotes] = useState(false);
  const [date, setDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showDueQuickMenu, setShowDueQuickMenu] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedParty, setSelectedParty] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [banks, setBanks] = useState(propBanks || []);
  const [selectedBank, setSelectedBank] = useState('');
  const [paymentExpenses, setPaymentExpenses] = useState([]);
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(null);
  const fieldRefs = useRef({});
  const [isExpense, setIsExpense] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState('');
  const [dontSendInvoice, setDontSendInvoice] = useState(false);
  const [isBankAutoSelected, setIsBankAutoSelected] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    transaction: true,
    items: true,
    shipping: false,
    totals: true,
  });

  // Track original products for purchases transactions
  const [originalProductIds] = React.useState(() => {
    if (!transactionToEdit || type !== 'purchases') return new Set();

    const originalItems =
      transactionToEdit.items || transactionToEdit.products || [];

    const ids = new Set();
    originalItems.forEach(item => {
      const productId = item.product?._id || item.product || item.productId;
      if (productId) ids.add(productId);
    });
    return ids;
  });

  const watchedPaymentMethod = useWatch({
    control: form.control,
    name: 'paymentMethod',
  });

  const watchedItems = useWatch({
    control: form.control,
    name: 'items',
  });

  const watchedUnitStates = fields.map((_, index) =>
    watch(`items.${index}.unitType`),
  );
  const watchedOtherUnits = fields.map((_, index) =>
    watch(`items.${index}.otherUnit`),
  );

  const getPaymentMethods = () => {
    if (paymentMethods && paymentMethods.length > 0) {
      return paymentMethods;
    }
    if (type === 'receipt' || type === 'payment') {
      return ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];
    }
    return ['Cash', 'Credit', 'UPI', 'Bank Transfer', 'Cheque', 'Others'];
  };

  const currentPaymentMethods = getPaymentMethods();

  const registerFieldRef = (name, ref) => {
    if (ref) {
      if (fieldRefs.current[name] !== ref) {
        fieldRefs.current[name] = ref;
      }
      if (registerField) {
        try {
          registerField(name, ref);
        } catch (e) {
          // ignore registration errors
        }
      }
    }
  };

  const calculateLineTotals = index => {
    const quantity = Number(watch(`items.${index}.quantity`)) || 0;
    const pricePerUnit = Number(watch(`items.${index}.pricePerUnit`)) || 0;
    const amount = quantity * pricePerUnit;

    const gstPercentage = Number(watch(`items.${index}.gstPercentage`)) || 0;
    const lineTax = (amount * gstPercentage) / 100;
    const lineTotal = amount + lineTax;

    setValue(`items.${index}.amount`, amount, { shouldValidate: true });
    setValue(`items.${index}.lineTax`, lineTax, { shouldValidate: true });
    setValue(`items.${index}.lineTotal`, lineTotal, { shouldValidate: true });
  };

  const calculateInvoiceTotals = () => {
    const items = watch('items') || [];

    const totalAmount = items.reduce((sum, item) => {
      return sum + (Number(item.amount) || 0);
    }, 0);

    const taxAmount = items.reduce((sum, item) => {
      return sum + (Number(item.lineTax) || 0);
    }, 0);

    const invoiceTotal = totalAmount + taxAmount;

    setValue('totalAmount', totalAmount, { shouldValidate: true });
    setValue('taxAmount', taxAmount, { shouldValidate: true });
    setValue('invoiceTotal', invoiceTotal, { shouldValidate: true });
  };

  const fetchPaymentExpenses = async companyId => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res = await fetch(
        `${BASE_URL}/api/payment-expenses?companyId=${companyId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data = await res.json();
        const expensesData = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.expenses)
          ? data.expenses
          : [];

        setPaymentExpenses(expensesData);
      } else {
        setPaymentExpenses([]);
      }
    } catch (error) {
      console.error('Error fetching payment expenses:', error);
      setPaymentExpenses([]);
    }
  };

  const fetchBanks = async companyId => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res = await fetch(
        `${BASE_URL}/api/bank-details?companyId=${companyId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data = await res.json();
        let banksData = data;

        if (data && data.banks) {
          banksData = data.banks;
        } else if (Array.isArray(data)) {
          banksData = data;
        } else if (data && Array.isArray(data.data)) {
          banksData = data.data;
        } else {
          banksData = [];
        }

        const filteredBanks = banksData.filter(bank => {
          const bankCompanyId =
            bank.company?._id || bank.company || bank.companyId;
          return !companyId || bankCompanyId === companyId;
        });

        setBanks(filteredBanks);

        // Enhanced Auto Bank Selection Logic
        if (filteredBanks.length > 0 && watchedPaymentMethod !== 'Cash') {
          const currentBankValue = getValues('bank');

          // Only auto-select if no bank is currently selected
          if (!currentBankValue) {
            const firstBankId = filteredBanks[0]._id;
            console.log(
              `🔍 Auto-selecting bank: ${firstBankId} (${filteredBanks.length} banks available)`,
            );

            setSelectedBank(firstBankId);
            setValue('bank', firstBankId, {
              shouldValidate: true,
              shouldDirty: false,
            });
            setIsBankAutoSelected(true);

            // Show toast notification for auto-selection
            if (filteredBanks.length > 1) {
              Toast.show({
                type: 'info',
                text1: 'Bank Auto-Selected',
                text2: 'First bank selected - you can change it',
              });
            }
          }
        } else if (
          filteredBanks.length === 0 &&
          watchedPaymentMethod !== 'Cash'
        ) {
          // Clear bank selection if no banks available
          setValue('bank', '');
          setSelectedBank('');
          setIsBankAutoSelected(false);
        }
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
      setBanks([]);
    }
  };

  const handleDeleteUnit = async unitId => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/units/${unitId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete unit');
      }

      const unitsRes = await fetch(`${BASE_URL}/api/units`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (unitsRes.ok) {
        const units = await unitsRes.json();
        setExistingUnits(units);
      }

      Toast.show({
        type: 'success',
        text1: 'Unit deleted',
        text2: 'The unit has been removed successfully.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: error.message || 'Something went wrong.',
      });
    }
  };

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${BASE_URL}/api/units`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const units = await res.json();
          setExistingUnits(units);
        }
      } catch (error) {
        console.error('Failed to fetch units:', error);
      }
    };
    fetchUnits();
  }, []);

  useEffect(() => {
    if (selectedCompanyIdWatch) {
      fetchBanks(selectedCompanyIdWatch);
      fetchPaymentExpenses(selectedCompanyIdWatch);
    } else {
      setBanks([]);
      setPaymentExpenses([]);
    }
  }, [selectedCompanyIdWatch]);

  // Enhanced useEffect for bank auto-selection
  useEffect(() => {
    if (banks && banks.length > 0 && watchedPaymentMethod !== 'Cash') {
      const currentBankValue = getValues('bank');

      // Only auto-select if no bank is currently selected
      if (!currentBankValue) {
        const firstBankId = banks[0]._id;
        setSelectedBank(firstBankId);
        setValue('bank', firstBankId, {
          shouldValidate: true,
          shouldDirty: false,
        });
        setIsBankAutoSelected(true);
      }
    }
  }, [banks, watchedPaymentMethod]);

  // Reset auto-selection flag when user manually changes bank
  const handleBankChange = (itemValue, onChange) => {
    setIsBankAutoSelected(false);
    setSelectedBank(itemValue);
    onChange(itemValue);
    validateField('bank');
  };

  const validateField = async fieldName => {
    try {
      await trigger(fieldName);
    } catch (error) {
      console.error(`Validation error for ${fieldName}:`, error);
    }
  };

  // Enhanced stock validation with better error handling
  const handleStockValidation = (productId, quantity, index) => {
    if (productId && quantity > 0) {
      const selectedProduct = products.find(p => p._id === productId);
      if (
        selectedProduct &&
        selectedProduct.stocks !== undefined &&
        selectedProduct.stocks !== null
      ) {
        const currentStock = Number(selectedProduct.stocks) || 0;
        const requestedQuantity = Number(quantity) || 0;

        if (currentStock <= 0) {
          Alert.alert(
            'Out of Stock',
            `${selectedProduct.name} is currently out of stock.`,
            [{ text: 'OK' }],
          );
          return false;
        } else if (requestedQuantity > currentStock) {
          Alert.alert(
            'Insufficient Stock',
            `You're ordering ${requestedQuantity} units but only ${currentStock} are available for ${selectedProduct.name}.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Proceed Anyway',
                onPress: () => {
                  // Allow user to proceed despite insufficient stock
                  Toast.show({
                    type: 'warning',
                    text1: 'Insufficient Stock',
                    text2: 'Proceeding with order despite low stock',
                  });
                },
              },
            ],
          );
          return false;
        }
      }
    }
    return true;
  };

  const renderBalanceDisplay = () => {
    if (partyBalance == null && vendorBalance == null) return null;

    let balance =
      type === 'sales' || type === 'receipt' ? partyBalance : vendorBalance;
    if (balance === 0 || balance === null) return null;

    let isPositiveBalance =
      type === 'sales' || type === 'receipt' ? balance > 0 : balance < 0;

    let message = '';
    if (type === 'sales') {
      message =
        balance > 0
          ? `Customer needs to pay: ${formatCurrencyDisplay(balance)}`
          : `Customer advance payment: ${formatCurrencyDisplay(
              Math.abs(balance),
            )}`;
    } else if (type === 'purchases') {
      message =
        balance < 0
          ? `You need to pay vendor: ${formatCurrencyDisplay(
              Math.abs(balance),
            )}`
          : `Vendor advance payment: ${formatCurrencyDisplay(balance)}`;
    } else if (type === 'receipt') {
      message =
        balance > 0
          ? `Customer needs to pay: ${formatCurrencyDisplay(balance)}`
          : `Customer advance payment: ${formatCurrencyDisplay(
              Math.abs(balance),
            )}`;
    } else if (type === 'payment') {
      message =
        balance < 0
          ? `You need to pay vendor: ${formatCurrencyDisplay(
              Math.abs(balance),
            )}`
          : `Vendor advance payment: ${formatCurrencyDisplay(balance)}`;
    }

    return (
      <CustomCard
        style={[
          styles.balanceCard,
          {
            backgroundColor: isPositiveBalance ? '#FEF2F2' : '#F0FDF4',
            borderColor: isPositiveBalance ? '#FECACA' : '#BBF7D0',
          },
        ]}
      >
        <View style={styles.balanceHeader}>
          <Icon
            name={
              isPositiveBalance
                ? 'alert-circle-outline'
                : 'check-circle-outline'
            }
            size={16}
            color={isPositiveBalance ? '#DC2626' : '#16A34A'}
          />
          <Text
            style={[
              styles.balanceText,
              { color: isPositiveBalance ? '#DC2626' : '#16A34A' },
            ]}
          >
            {message}
          </Text>
        </View>
      </CustomCard>
    );
  };

  const handleProductSelection = (value, index) => {
    setValue(`items.${index}.product`, value, { shouldValidate: true });

    if (value && typeof value === 'string') {
      const selectedProduct = products.find(p => p._id === value);

      if (selectedProduct?.unit) {
        setValue(`items.${index}.unitType`, selectedProduct.unit, {
          shouldValidate: true,
        });
      }

      if (
        type === 'sales' &&
        selectedProduct?.sellingPrice &&
        selectedProduct.sellingPrice > 0
      ) {
        const newPrice = selectedProduct.sellingPrice;
        setValue(`items.${index}.pricePerUnit`, newPrice, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });

        setTimeout(() => {
          calculateLineTotals(index);
        }, 100);

        setItemRenderKeys(prev => ({
          ...prev,
          [index]: (prev[index] || 0) + 1,
        }));
      } else {
        setValue(`items.${index}.pricePerUnit`, 0, { shouldValidate: true });
        calculateLineTotals(index);
        setItemRenderKeys(prev => ({
          ...prev,
          [index]: (prev[index] || 0) + 1,
        }));
      }

      // Validate stock when product is selected
      const currentQuantity = watch(`items.${index}.quantity`) || 0;
      if (currentQuantity > 0) {
        handleStockValidation(value, currentQuantity, index);
      }
    }
  };

  const handleQuantityChange = (text, index) => {
    const value = text === '' ? '' : Number(text);
    setValue(`items.${index}.quantity`, value, { shouldValidate: true });

    setLastEditedField(prev => ({
      ...prev,
      [index]: 'quantity',
    }));

    setTimeout(() => {
      calculateLineTotals(index);
    }, 100);

    const productId = getValues(`items.${index}.product`);
    const quantityNumber = Number(value) || 0;

    // Enhanced stock validation
    if (productId && quantityNumber > 0) {
      handleStockValidation(productId, quantityNumber, index);
    }
  };

  const renderStockDisplay = (selectedProduct, index) => {
    if (
      !selectedProduct ||
      selectedProduct.stocks === undefined ||
      selectedProduct.stocks === null
    )
      return null;

    const currentStock = Number(selectedProduct.stocks) || 0;
    const isOutOfStock = currentStock <= 0;
    const isLowStock = currentStock > 0 && currentStock <= 5;

    return (
      <View
        style={[
          styles.stockContainer,
          {
            backgroundColor: isOutOfStock
              ? '#FEF2F2'
              : isLowStock
              ? '#FFFBEB'
              : '#F0FDF4',
            borderColor: isOutOfStock
              ? '#FECACA'
              : isLowStock
              ? '#FED7AA'
              : '#BBF7D0',
          },
        ]}
      >
        <View style={styles.stockHeader}>
          <Icon
            name={
              isOutOfStock
                ? 'alert-circle-outline'
                : isLowStock
                ? 'alert-outline'
                : 'check-circle-outline'
            }
            size={14}
            color={
              isOutOfStock ? '#DC2626' : isLowStock ? '#D97706' : '#16A34A'
            }
          />
          <Text
            style={[
              styles.stockText,
              {
                color: isOutOfStock
                  ? '#DC2626'
                  : isLowStock
                  ? '#D97706'
                  : '#16A34A',
              },
            ]}
          >
            {isOutOfStock
              ? 'Out of Stock'
              : isLowStock
              ? `Low Stock: ${currentStock} units left`
              : `In Stock: ${currentStock} units`}
          </Text>
        </View>
      </View>
    );
  };

  const handlePriceChange = (text, index) => {
    const value = text === '' ? '' : Number(text);
    setValue(`items.${index}.pricePerUnit`, value, { shouldValidate: true });

    setLastEditedField(prev => ({
      ...prev,
      [index]: 'pricePerUnit',
    }));

    setTimeout(() => {
      calculateLineTotals(index);
    }, 100);
  };

  const handleAmountChange = (text, index, fieldName) => {
    const raw = text.replace(/,/g, '');
    if (/^\d*\.?\d*$/.test(raw)) {
      const numericValue = raw === '' ? '' : parseFloat(raw);
      setValue(`items.${index}.${fieldName}`, numericValue, {
        shouldValidate: true,
      });

      setLastEditedField(prev => ({
        ...prev,
        [index]: fieldName,
      }));

      if (fieldName === 'amount') {
        setTimeout(() => {
          calculateInvoiceTotals();
        }, 100);
      }
    }
  };

  const handleGstPercentageChange = (value, index) => {
    if (value === 'custom') {
      setCustomGstInputs(prev => ({
        ...prev,
        [index]: true,
      }));
      setValue(`items.${index}.gstPercentage`, 0, { shouldValidate: true });
    } else {
      const numericValue = Number(value);
      setValue(`items.${index}.gstPercentage`, numericValue, {
        shouldValidate: true,
      });

      setTimeout(() => {
        calculateLineTotals(index);
      }, 100);
    }
  };

  const handleUnitSelection = (unitValue, index) => {
    setValue(`items.${index}.unitType`, unitValue);
    if (setUnitOpen) {
      setUnitOpen(false);
    }
  };

  const handleUnitMenuOpen = index => {
    setSelectedUnitIndex(index);
    if (setUnitOpen) {
      setUnitOpen(true);
    }
  };

  const handleUnitMenuClose = () => {
    if (setUnitOpen) {
      setUnitOpen(false);
    }
  };

  const handleShippingAddressChange = value => {
    setShippingAddress(value);
    setValue('shippingAddress', value);

    if (value && value !== 'new') {
      const selectedAddr = shippingAddresses.find(addr => addr._id === value);
      if (selectedAddr) {
        setValue('shippingAddressDetails', {
          label: selectedAddr.label,
          address: selectedAddr.address,
          city: selectedAddr.city,
          state: selectedAddr.state,
          pincode: selectedAddr.pincode || '',
          contactNumber: selectedAddr.contactNumber || '',
        });
        const found = indiaStates.find(
          s =>
            s.name.toLowerCase() === (selectedAddr.state || '').toLowerCase(),
        );
        setShippingStateCode(found?.isoCode || null);
      }
    } else if (value === 'new') {
      setValue('shippingAddressDetails', {
        label: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        contactNumber: '',
      });
      setShippingStateCode(null);
    }
  };

  const handleSameAsBillingToggle = newValue => {
    setSameAsBilling(newValue);
    setValue('sameAsBilling', newValue);

    if (newValue) {
      const selectedPartyObj = parties.find(p => p._id === selectedParty);
      if (selectedPartyObj) {
        setValue('shippingAddressDetails', {
          label: 'Billing Address',
          address: selectedPartyObj.address || '',
          city: selectedPartyObj.city || '',
          state: selectedPartyObj.state || '',
          pincode: '',
          contactNumber: selectedPartyObj.contactNumber || '',
        });
        setValue('shippingAddress', '');
      }
    } else {
      setValue('shippingAddressDetails', {
        label: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        contactNumber: '',
      });
      setValue('shippingAddress', '');
    }
  };

  const handleStateChange = isoCode => {
    setShippingStateCode(isoCode);
    const selectedState = indiaStates.find(s => s.isoCode === isoCode);
    setValue('shippingAddressDetails.state', selectedState?.name || '');
    // Reset city when state changes
    setValue('shippingAddressDetails.city', '');
  };

  const toggleSection = section => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // NEW: Expense Section for Payment Transactions
  const renderExpenseSection = () => {
    if (type !== 'payment') return null;

    return (
      <CustomCard style={styles.sectionCard}>
        <View style={styles.sectionContent}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('expense')}
          >
            <View style={styles.sectionTitleContainer}>
              <Icon name="file-document-outline" size={20} color="#7C3AED" />
              <Text style={styles.sectionTitle}>Expense Details</Text>
            </View>
            <Icon
              name={expandedSections.expense ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>

          {expandedSections.expense && (
            <View style={styles.expenseContent}>
              <CustomCard style={styles.checkboxCard}>
                <View style={styles.checkboxContainer}>
                  <CustomCheckbox
                    status={isExpense ? 'checked' : 'unchecked'}
                    onPress={() => {
                      const newValue = !isExpense;
                      setIsExpense(newValue);
                      setValue('isExpense', newValue);
                      if (!newValue) {
                        setSelectedExpense('');
                        setValue('expense', '');
                      }
                    }}
                    label="Mark as Expense"
                    description="Categorize this payment as a business expense"
                  />
                </View>
              </CustomCard>

              {isExpense && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Expense Category</Text>
                  <Controller
                    control={control}
                    name="expense"
                    render={({ field: { onChange, value } }) => (
                      <Picker
                        selectedValue={value}
                        onValueChange={itemValue => {
                          onChange(itemValue);
                          setSelectedExpense(itemValue);
                        }}
                        style={[
                          styles.picker,
                          errors.expense ? styles.errorBorder : {},
                        ]}
                      >
                        <Picker.Item label="Select Expense Category" value="" />
                        {paymentExpenses.map(expense => (
                          <Picker.Item
                            key={expense._id}
                            label={
                              expense.name ||
                              expense.category ||
                              'Unnamed Expense'
                            }
                            value={expense._id}
                          />
                        ))}
                      </Picker>
                    )}
                  />
                  <FormMessage error={errors.expense} />
                  {paymentExpenses.length === 0 && (
                    <Text style={styles.noExpensesText}>
                      No expense categories available. Create expense categories
                      in settings.
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </CustomCard>
    );
  };

  // NEW: Enhanced Payment Method Display with Icons
  const renderPaymentMethodItem = method => {
    const iconName = PAYMENT_METHOD_ICONS[method] || 'credit-card-outline';
    return (
      <View style={styles.paymentMethodItem}>
        <Icon name={iconName} size={16} color="#6B7280" />
        <Text style={styles.paymentMethodText}>{method}</Text>
      </View>
    );
  };

  const renderProductItem = (item, index) => {
    const selectedProduct = products.find(
      p => p._id === watch(`items.${index}.product`),
    );

    const currentUnitType = watchedUnitStates[index];
    const currentOtherUnit = watchedOtherUnits[index];

    // Check if this is an ORIGINAL product from the transaction being edited
    const isOriginalProduct =
      transactionToEdit &&
      type === 'purchases' &&
      watch(`items.${index}.product`) &&
      originalProductIds.has(watch(`items.${index}.product`));

    return (
      <CustomCard
        key={`item-${index}-${itemRenderKeys[index] || 0}`}
        style={styles.itemCard}
      >
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemNumber}>Item {index + 1}</Text>
            <View style={styles.itemActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  const currentItem = getValues(`items.${index}`);
                  insert(index + 1, JSON.parse(JSON.stringify(currentItem)));
                }}
              >
                <Icon name={IconMap.Copy} size={16} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => remove(index)}
                disabled={fields.length <= 1}
              >
                <Icon name={IconMap.Trash2} size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.productSelectionContainer}>
            <View style={styles.sectionHeader}>
              <Icon name={IconMap.ShoppingCart} size={16} color="#1E40AF" />
              <Text style={styles.sectionHeaderText}>Product Selection</Text>
              {isOriginalProduct && (
                <Text style={styles.originalProductWarning}>
                  (Product name is fixed — you can edit Qty, price or add new
                  products)
                </Text>
              )}
            </View>

            <View ref={ref => registerFieldRef(`items.${index}.product`, ref)}>
              {isOriginalProduct ? (
                <View style={styles.readOnlyProductContainer}>
                  <TextInput
                    style={styles.readOnlyProductInput}
                    value={selectedProduct?.name || 'Unknown Product'}
                    editable={false}
                  />
                  <View style={styles.originalProductOverlay}>
                    <Text style={styles.originalProductOverlayText}>
                      Original product cannot be changed
                    </Text>
                  </View>
                </View>
              ) : (
                <Combobox
                  options={productOptions}
                  value={watch(`items.${index}.product`) || ''}
                  onChange={value => handleProductSelection(value, index)}
                  placeholder={
                    transactionToEdit && type === 'purchases'
                      ? 'Select a product...'
                      : 'Select or create a product...'
                  }
                  searchPlaceholder="Search products..."
                  noResultsText="No product found."
                  creatable
                  onCreate={async name => {
                    setCreatingProductForIndex(index);
                    handleTriggerCreateProduct(name);
                    return '';
                  }}
                  style={
                    errors?.items?.[index]?.product ? styles.errorBorder : {}
                  }
                />
              )}
            </View>

            <FormMessage
              error={errors?.items?.[index]?.product}
              message={errors?.items?.[index]?.product?.message}
            />

            {renderStockDisplay(selectedProduct, index)}
          </View>

          <View style={styles.productDetailsContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Qty</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors?.items?.[index]?.quantity ? styles.errorBorder : {},
                ]}
                value={watch(`items.${index}.quantity`)?.toString() || ''}
                onChangeText={text => handleQuantityChange(text, index)}
                keyboardType="numeric"
                placeholder="1"
              />
              <FormMessage error={errors?.items?.[index]?.quantity} />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Unit</Text>
              <CustomMenu
                visible={unitOpen && selectedUnitIndex === index}
                onDismiss={handleUnitMenuClose}
                anchor={
                  <TouchableOpacity
                    style={[
                      styles.unitButton,
                      errors?.items?.[index]?.unitType
                        ? styles.errorBorder
                        : {},
                    ]}
                    onPress={() => handleUnitMenuOpen(index)}
                  >
                    <Text style={styles.unitButtonText}>
                      {currentUnitType === 'Other' && currentOtherUnit
                        ? currentOtherUnit
                        : currentUnitType || 'Select unit...'}
                    </Text>
                    <Icon
                      name={IconMap.ChevronDown}
                      size={16}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                }
              >
                <ScrollView style={{ maxHeight: 200 }}>
                  {unitTypes
                    .filter(u => u !== 'Other')
                    .map(unit => (
                      <MenuItem
                        key={unit}
                        onPress={() => handleUnitSelection(unit, index)}
                        title={unit}
                        leadingIcon={
                          currentUnitType === unit ? IconMap.Check : undefined
                        }
                      />
                    ))}

                  {existingUnits.map(unit => (
                    <MenuItem
                      key={unit._id}
                      onPress={() => handleUnitSelection(unit.name, index)}
                      title={unit.name}
                      leadingIcon={
                        currentUnitType === unit.name
                          ? IconMap.Check
                          : undefined
                      }
                      trailing={
                        <TouchableOpacity
                          style={styles.deleteUnitButton}
                          onPress={e => {
                            e.stopPropagation();
                            handleDeleteUnit(unit._id);
                          }}
                        >
                          <Icon name={IconMap.X} size={14} color="#DC2626" />
                        </TouchableOpacity>
                      }
                    />
                  ))}

                  <MenuItem
                    onPress={() => handleUnitSelection('Other', index)}
                    title="Other"
                    leadingIcon={
                      currentUnitType === 'Other' ? IconMap.Check : undefined
                    }
                  />
                </ScrollView>
              </CustomMenu>
              <FormMessage error={errors?.items?.[index]?.unitType} />
            </View>

            {currentUnitType === 'Other' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Specify Unit</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors?.items?.[index]?.otherUnit ? styles.errorBorder : {},
                  ]}
                  value={currentOtherUnit || ''}
                  onChangeText={text =>
                    setValue(`items.${index}.otherUnit`, text)
                  }
                  placeholder="e.g., Bundle, Set"
                />
                <FormMessage error={errors?.items?.[index]?.otherUnit} />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Price/Unit</Text>
              <TextInput
                key={`price-${index}-${itemRenderKeys[index] || 0}`}
                style={[
                  styles.textInput,
                  styles.rightAlignedInput,
                  errors?.items?.[index]?.pricePerUnit
                    ? styles.errorBorder
                    : {},
                ]}
                value={watch(`items.${index}.pricePerUnit`)?.toString() || ''}
                onChangeText={text => handlePriceChange(text, index)}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
              <FormMessage error={errors?.items?.[index]?.pricePerUnit} />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.rightAlignedInput,
                  errors?.items?.[index]?.amount ? styles.errorBorder : {},
                ]}
                value={formatWithCommas(watch(`items.${index}.amount`))}
                onChangeText={text => handleAmountChange(text, index, 'amount')}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
              <FormMessage error={errors?.items?.[index]?.amount} />
            </View>

            <View style={[styles.inputContainer, styles.wideInput]}>
              <Text style={styles.inputLabel}>HSN Code</Text>
              {selectedProduct?.hsn ? (
                <View style={styles.readOnlyContainer}>
                  <Text style={styles.readOnlyText}>{selectedProduct.hsn}</Text>
                </View>
              ) : (
                <HSNSearchInput
                  onSelect={hsnCode => {
                    handleHSNSelect(hsnCode, index, form, value =>
                      setValue(`items.${index}.hsn`, value),
                    );
                  }}
                  placeholder="Search HSN..."
                />
              )}
              <FormMessage error={errors?.items?.[index]?.hsn} />
            </View>

            {gstEnabled && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>GST %</Text>
                  {customGstInputs[index] ? (
                    <View style={styles.customGstContainer}>
                      <TextInput
                        style={[
                          styles.textInput,
                          { flex: 1 },
                          errors?.items?.[index]?.gstPercentage
                            ? styles.errorBorder
                            : {},
                        ]}
                        value={
                          watch(`items.${index}.gstPercentage`)?.toString() ||
                          ''
                        }
                        onChangeText={text => {
                          const val = text === '' ? '' : Number(text);
                          if (val === '' || (val >= 0 && val <= 100)) {
                            setValue(`items.${index}.gstPercentage`, val);
                          }
                        }}
                        keyboardType="decimal-pad"
                        placeholder="Enter %"
                      />
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => {
                          setCustomGstInputs(prev => ({
                            ...prev,
                            [index]: false,
                          }));
                          setValue(`items.${index}.gstPercentage`, 18);
                        }}
                      >
                        <Icon name={IconMap.X} size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Picker
                      selectedValue={
                        watch(`items.${index}.gstPercentage`)?.toString() ||
                        '18'
                      }
                      onValueChange={value =>
                        handleGstPercentageChange(value, index)
                      }
                      style={[
                        styles.picker,
                        errors?.items?.[index]?.gstPercentage
                          ? styles.errorBorder
                          : {},
                      ]}
                    >
                      {GST_OPTIONS.map(opt => (
                        <Picker.Item
                          key={opt.value}
                          label={opt.label}
                          value={opt.value}
                        />
                      ))}
                    </Picker>
                  )}
                  <FormMessage error={errors?.items?.[index]?.gstPercentage} />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Tax</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.rightAlignedInput,
                      errors?.items?.[index]?.lineTax ? styles.errorBorder : {},
                    ]}
                    value={formatWithCommas(watch(`items.${index}.lineTax`))}
                    onChangeText={text =>
                      handleAmountChange(text, index, 'lineTax')
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                  <FormMessage error={errors?.items?.[index]?.lineTax} />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Total</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.rightAlignedInput,
                      styles.totalInput,
                      errors?.items?.[index]?.lineTotal
                        ? styles.errorBorder
                        : {},
                    ]}
                    value={formatWithCommas(watch(`items.${index}.lineTotal`))}
                    onChangeText={text =>
                      handleAmountChange(text, index, 'lineTotal')
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                  <FormMessage error={errors?.items?.[index]?.lineTotal} />
                </View>
              </>
            )}
          </View>
        </View>
      </CustomCard>
    );
  };

  const renderServiceItem = (item, index) => {
    const selectedService = services.find(
      s => s._id === watch(`items.${index}.service`),
    );

    return (
      <CustomCard
        key={`service-${index}-${itemRenderKeys[index] || 0}`}
        style={styles.itemCard}
      >
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemNumber}>Service {index + 1}</Text>
            <View style={styles.itemActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  const currentItem = getValues(`items.${index}`);
                  insert(index + 1, JSON.parse(JSON.stringify(currentItem)));
                }}
              >
                <Icon name={IconMap.Copy} size={16} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => remove(index)}
                disabled={fields.length <= 1}
              >
                <Icon name={IconMap.Trash2} size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.serviceSelectionContainer}>
            <View style={styles.sectionHeader}>
              <Icon name={IconMap.Zap} size={16} color="#166534" />
              <Text style={styles.sectionHeaderText}>Service Selection</Text>
            </View>

            <View ref={ref => registerFieldRef(`items.${index}.service`, ref)}>
              <Combobox
                options={serviceOptions}
                value={watch(`items.${index}.service`) || ''}
                onChange={value => {
                  setValue(`items.${index}.service`, value);
                  if (value && type === 'sales') {
                    const selectedService = services.find(s => s._id === value);
                    if (selectedService?.amount > 0) {
                      setValue(`items.${index}.amount`, selectedService.amount);
                    }
                  }
                }}
                placeholder="Select or create a service..."
                searchPlaceholder="Search services..."
                noResultsText="No service found."
                creatable={serviceCreatable}
                onCreate={name => {
                  if (!serviceCreatable) {
                    Toast.show({
                      type: 'error',
                      text1: 'Permission denied',
                      text2: "You don't have permission to create inventory.",
                    });
                    return '';
                  }

                  setCreatingServiceForIndex(index);
                  setNewEntityName(name);
                  setIsServiceDialogOpen(true);
                  return '';
                }}
                style={
                  errors?.items?.[index]?.service ? styles.errorBorder : {}
                }
              />
            </View>
            <FormMessage error={errors?.items?.[index]?.service} />
          </View>

          <View style={styles.serviceDetailsContainer}>
            <View style={[styles.inputContainer, styles.flex2]}>
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors?.items?.[index]?.amount ? styles.errorBorder : {},
                ]}
                value={formatWithCommas(watch(`items.${index}.amount`))}
                onChangeText={text => handleAmountChange(text, index, 'amount')}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
              <FormMessage error={errors?.items?.[index]?.amount} />
            </View>

            <View style={[styles.inputContainer, styles.flex3]}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors?.items?.[index]?.description ? styles.errorBorder : {},
                ]}
                value={watch(`items.${index}.description`) || ''}
                onChangeText={text =>
                  setValue(`items.${index}.description`, text)
                }
                placeholder="Service description"
              />
              <FormMessage error={errors?.items?.[index]?.description} />
            </View>

            <View style={[styles.inputContainer, styles.flex2]}>
              <Text style={styles.inputLabel}>SAC Code</Text>
              {selectedService?.sac ? (
                <View style={styles.readOnlyContainer}>
                  <Text style={styles.readOnlyText}>{selectedService.sac}</Text>
                </View>
              ) : (
                <SACSearchInput
                  onSelect={sacCode => {
                    handleSACSelect(sacCode, index, form, value =>
                      setValue(`items.${index}.sac`, value),
                    );
                  }}
                  placeholder="Search SAC..."
                />
              )}
              <FormMessage error={errors?.items?.[index]?.sac} />
            </View>

            {gstEnabled && (
              <>
                <View style={[styles.inputContainer, styles.flex2]}>
                  <Text style={styles.inputLabel}>GST %</Text>
                  {customGstInputs[index] ? (
                    <View style={styles.customGstContainer}>
                      <TextInput
                        style={[
                          styles.textInput,
                          { flex: 1 },
                          errors?.items?.[index]?.gstPercentage
                            ? styles.errorBorder
                            : {},
                        ]}
                        value={
                          watch(`items.${index}.gstPercentage`)?.toString() ||
                          ''
                        }
                        onChangeText={text => {
                          const val = text === '' ? '' : Number(text);
                          if (val === '' || (val >= 0 && val <= 100)) {
                            setValue(`items.${index}.gstPercentage`, val);
                          }
                        }}
                        keyboardType="decimal-pad"
                        placeholder="Enter %"
                      />
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => {
                          setCustomGstInputs(prev => ({
                            ...prev,
                            [index]: false,
                          }));
                          setValue(`items.${index}.gstPercentage`, 18);
                        }}
                      >
                        <Icon name={IconMap.X} size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Picker
                      selectedValue={
                        watch(`items.${index}.gstPercentage`)?.toString() ||
                        '18'
                      }
                      onValueChange={value =>
                        handleGstPercentageChange(value, index)
                      }
                      style={[
                        styles.picker,
                        errors?.items?.[index]?.gstPercentage
                          ? styles.errorBorder
                          : {},
                      ]}
                    >
                      {GST_OPTIONS.map(opt => (
                        <Picker.Item
                          key={opt.value}
                          label={opt.label}
                          value={opt.value}
                        />
                      ))}
                    </Picker>
                  )}
                  <FormMessage error={errors?.items?.[index]?.gstPercentage} />
                </View>

                <View style={[styles.inputContainer, styles.flex1]}>
                  <Text style={styles.inputLabel}>Tax</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.rightAlignedInput,
                      errors?.items?.[index]?.lineTax ? styles.errorBorder : {},
                    ]}
                    value={formatWithCommas(watch(`items.${index}.lineTax`))}
                    onChangeText={text =>
                      handleAmountChange(text, index, 'lineTax')
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                  <FormMessage error={errors?.items?.[index]?.lineTax} />
                </View>

                <View style={[styles.inputContainer, styles.flex2]}>
                  <Text style={styles.inputLabel}>Total</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.rightAlignedInput,
                      styles.serviceTotalInput,
                      errors?.items?.[index]?.lineTotal
                        ? styles.errorBorder
                        : {},
                    ]}
                    value={formatWithCommas(watch(`items.${index}.lineTotal`))}
                    onChangeText={text =>
                      handleAmountChange(text, index, 'lineTotal')
                    }
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                  <FormMessage error={errors?.items?.[index]?.lineTotal} />
                </View>
              </>
            )}
          </View>
        </View>
      </CustomCard>
    );
  };

  const shouldShowBankField =
    (watchedPaymentMethod || paymentMethod) &&
    watchedPaymentMethod !== 'Cash' &&
    paymentMethod !== 'Cash';

  const renderDontSendInvoice = () => {
    if (type !== 'sales') return null;

    return (
      <CustomCard style={styles.checkboxCard}>
        <CustomCheckbox
          status={dontSendInvoice ? 'checked' : 'unchecked'}
          onPress={() => {
            const newValue = !dontSendInvoice;
            setDontSendInvoice(newValue);
            setValue('dontSendInvoice', newValue);
          }}
          label="Don't Send Invoice"
          description="Check this if you don't want to email the invoice to the customer"
        />
      </CustomCard>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Transaction Details Section */}
      <CustomCard style={styles.sectionCard}>
        <View style={styles.sectionContent}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('transaction')}
          >
            <View style={styles.sectionTitleContainer}>
              <Icon name="file-document-outline" size={20} color="#1E40AF" />
              <Text style={styles.sectionTitle}>Transaction Details</Text>
            </View>
            <Icon
              name={
                expandedSections.transaction ? 'chevron-up' : 'chevron-down'
              }
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>

          {expandedSections.transaction && (
            <View style={styles.sectionContent}>
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Company</Text>
                  <Controller
                    control={control}
                    name="company"
                    render={({ field: { onChange, value } }) => (
                      <Picker
                        selectedValue={value}
                        onValueChange={itemValue => {
                          onChange(itemValue);
                          setSelectedCompany(itemValue);
                          validateField('company');
                        }}
                        style={[
                          styles.picker,
                          errors.company ? styles.errorBorder : {},
                        ]}
                      >
                        <Picker.Item label="Select a company" value="" />
                        {companies.map(c => (
                          <Picker.Item
                            key={c._id}
                            label={c.businessName}
                            value={c._id}
                          />
                        ))}
                      </Picker>
                    )}
                  />
                  <FormMessage error={errors.company} />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Transaction Date</Text>
                  <Controller
                    control={control}
                    name="date"
                    render={({ field: { onChange, value } }) => (
                      <View>
                        <TouchableOpacity
                          style={[
                            styles.dateButton,
                            errors.date ? styles.errorBorder : {},
                          ]}
                          onPress={() => setShowDatePicker(true)}
                        >
                          <Text style={styles.dateButtonText}>
                            {(value || new Date()).toLocaleDateString()}
                          </Text>
                          <Icon
                            name={IconMap.Calendar}
                            size={16}
                            color="#6B7280"
                          />
                        </TouchableOpacity>
                        {showDatePicker && (
                          <DateTimePicker
                            value={value || new Date()}
                            mode="date"
                            display={
                              Platform.OS === 'ios' ? 'spinner' : 'default'
                            }
                            onChange={(event, selectedDate) => {
                              setShowDatePicker(false);
                              if (selectedDate) {
                                onChange(selectedDate);
                                validateField('date');
                              }
                            }}
                          />
                        )}
                      </View>
                    )}
                  />
                  <FormMessage error={errors.date} />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Due Date</Text>
                  <Controller
                    control={control}
                    name="dueDate"
                    render={({ field: { onChange, value } }) => (
                      <View>
                        <View style={styles.dueDateContainer}>
                          <TouchableOpacity
                            style={[
                              styles.dateButton,
                              { flex: 1 },
                              errors.dueDate ? styles.errorBorder : {},
                            ]}
                            onPress={() => setShowDueDatePicker(true)}
                          >
                            <Text style={styles.dateButtonText}>
                              {(value || new Date()).toLocaleDateString()}
                            </Text>
                            <Icon
                              name={IconMap.Calendar}
                              size={16}
                              color="#6B7280"
                            />
                          </TouchableOpacity>

                          <CustomMenu
                            visible={showDueQuickMenu}
                            onDismiss={() => setShowDueQuickMenu(false)}
                            anchor={
                              <TouchableOpacity
                                style={styles.quickButton}
                                onPress={() => setShowDueQuickMenu(true)}
                              >
                                <Text style={styles.quickButtonText}>
                                  Quick
                                </Text>
                              </TouchableOpacity>
                            }
                          >
                            {QUICK_DATE_OPTIONS.map(option => (
                              <MenuItem
                                key={option.days}
                                onPress={() => {
                                  const currentDate =
                                    getValues('date') || new Date();
                                  const newDueDate = new Date(currentDate);
                                  newDueDate.setDate(
                                    newDueDate.getDate() + option.days,
                                  );
                                  onChange(newDueDate);
                                  validateField('dueDate');
                                  setShowDueQuickMenu(false);
                                }}
                                title={option.label}
                              />
                            ))}
                            <MenuItem
                              onPress={() => {
                                setShowDueQuickMenu(false);
                                setShowDueDatePicker(true);
                              }}
                              title="Custom Date"
                            />
                          </CustomMenu>
                        </View>

                        {showDueDatePicker && (
                          <DateTimePicker
                            value={value || new Date()}
                            mode="date"
                            display={
                              Platform.OS === 'ios' ? 'spinner' : 'default'
                            }
                            onChange={(event, selectedDate) => {
                              setShowDueDatePicker(false);
                              if (selectedDate) {
                                onChange(selectedDate);
                                validateField('dueDate');
                              }
                            }}
                          />
                        )}
                      </View>
                    )}
                  />
                  <FormMessage error={errors.dueDate} />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{partyLabel}</Text>
                  <View ref={ref => registerFieldRef('party', ref)}>
                    <Controller
                      control={control}
                      name="party"
                      render={({ field: { onChange, value } }) => (
                        <Combobox
                          options={partyOptions}
                          value={value}
                          onChange={itemValue => {
                            onChange(itemValue);
                            setSelectedParty(itemValue);
                            if (
                              type === 'sales' ||
                              type === 'purchases' ||
                              type === 'receipt' ||
                              type === 'payment'
                            ) {
                              handlePartyChangeWrapper(itemValue);
                            }
                            validateField('party');
                          }}
                          placeholder="Select or create..."
                          searchPlaceholder="Enter Name"
                          noResultsText="No results found."
                          creatable={partyCreatable}
                          onCreate={async name => {
                            if (!partyCreatable) {
                              Toast.show({
                                type: 'error',
                                text1: 'Permission denied',
                                text2:
                                  type === 'sales' || type === 'receipt'
                                    ? "You don't have permission to create customers."
                                    : "You don't have permission to create vendors.",
                              });
                              return '';
                            }
                            handleTriggerCreateParty(name);
                            return '';
                          }}
                          style={errors.party ? styles.errorBorder : {}}
                        />
                      )}
                    />
                  </View>
                  <FormMessage error={errors.party} />
                  {renderBalanceDisplay()}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Payment Method</Text>
                  <View ref={ref => registerFieldRef('paymentMethod', ref)}>
                    <Controller
                      control={control}
                      name="paymentMethod"
                      render={({ field: { onChange, value } }) => (
                        <Picker
                          selectedValue={value}
                          onValueChange={itemValue => {
                            onChange(itemValue);
                            setSelectedPaymentMethod(itemValue);
                            validateField('paymentMethod');
                          }}
                          style={[
                            styles.picker,
                            errors.paymentMethod ? styles.errorBorder : {},
                          ]}
                        >
                          <Picker.Item label="Select Payment Method" value="" />
                          {currentPaymentMethods.map(method => (
                            <Picker.Item
                              key={method}
                              label={method}
                              value={method}
                            />
                          ))}
                        </Picker>
                      )}
                    />
                  </View>
                  <FormMessage error={errors.paymentMethod} />
                </View>
              </View>

              {shouldShowBankField && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bank</Text>
                  <Controller
                    control={control}
                    name="bank"
                    render={({ field: { onChange, value } }) => (
                      <>
                        {banks && banks.length > 0 ? (
                          <Picker
                            selectedValue={value}
                            onValueChange={itemValue =>
                              handleBankChange(itemValue, onChange)
                            }
                            style={[
                              styles.picker,
                              errors.bank ? styles.errorBorder : {},
                            ]}
                          >
                            {banks.map((bank, index) => (
                              <Picker.Item
                                key={bank._id}
                                label={`${bank.bankName}${
                                  bank.company?.businessName
                                    ? ` (${bank.company.businessName})`
                                    : ''
                                }${
                                  index === 0 && banks.length > 1
                                    ? ' (First)'
                                    : ''
                                }`}
                                value={bank._id}
                              />
                            ))}
                          </Picker>
                        ) : (
                          <View style={styles.noBanksContainer}>
                            <Text style={styles.noBanksText}>
                              {selectedCompanyIdWatch
                                ? 'No banks available for the selected company'
                                : 'Select a company first'}
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  />
                  <FormMessage error={errors.bank} />

                  {/* Show auto-selection info */}
                  {banks && banks.length > 0 && isBankAutoSelected && (
                    <Text style={styles.autoSelectText}>
                      {banks.length === 1
                        ? 'Only one bank available - auto-selected'
                        : 'First bank auto-selected - you can change it'}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </CustomCard>

      {/* Expense Section for Payment Transactions */}
      {renderExpenseSection()}

      {/* Shipping Address Section - Only for Sales */}
      {type === 'sales' && (
        <CustomCard style={styles.sectionCard}>
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('shipping')}
            >
              <View style={styles.sectionTitleContainer}>
                <Icon name="truck-delivery-outline" size={20} color="#7C3AED" />
                <Text style={styles.sectionTitle}>Shipping Address</Text>
              </View>
              <Icon
                name={expandedSections.shipping ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>

            {expandedSections.shipping && (
              <View style={styles.sectionContent}>
                <CustomCard style={styles.checkboxCard}>
                  <CustomCheckbox
                    status={sameAsBilling ? 'checked' : 'unchecked'}
                    onPress={() => handleSameAsBillingToggle(!sameAsBilling)}
                    label="Same as billing address"
                    description="Use the customer's billing address as the shipping address"
                  />
                </CustomCard>

                {!sameAsBilling && (
                  <View style={styles.shippingSection}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Shipping Address</Text>
                      <Picker
                        selectedValue={shippingAddress}
                        onValueChange={handleShippingAddressChange}
                        style={[
                          styles.picker,
                          errors.shippingAddress ? styles.errorBorder : {},
                        ]}
                      >
                        <Picker.Item
                          label="Select saved address or create new"
                          value=""
                        />
                        {shippingAddresses.map(addr => (
                          <Picker.Item
                            key={addr._id}
                            label={`${addr.label} - ${addr.address}, ${addr.city}`}
                            value={addr._id}
                          />
                        ))}
                        <Picker.Item label="+ Create New Address" value="new" />
                      </Picker>
                      <FormMessage error={errors.shippingAddress} />
                    </View>

                    {shippingAddress === 'new' && (
                      <CustomCard>
                        <View style={styles.newAddressForm}>
                          <Text style={styles.newAddressTitle}>
                            New Shipping Address
                          </Text>

                          <View style={styles.formRow}>
                            <View style={styles.formGroup}>
                              <Text style={styles.formLabel}>
                                Address Label
                              </Text>
                              <TextInput
                                style={[
                                  styles.textInput,
                                  errors.shippingAddressDetails?.label
                                    ? styles.errorBorder
                                    : {},
                                ]}
                                value={
                                  watch('shippingAddressDetails.label') || ''
                                }
                                onChangeText={text =>
                                  setValue('shippingAddressDetails.label', text)
                                }
                                placeholder="e.g., Home, Office, Warehouse"
                              />
                              <FormMessage
                                error={errors.shippingAddressDetails?.label}
                              />
                            </View>
                            <View style={styles.formGroup}>
                              <Text style={styles.formLabel}>
                                Contact Number
                              </Text>
                              <TextInput
                                style={[
                                  styles.textInput,
                                  errors.shippingAddressDetails?.contactNumber
                                    ? styles.errorBorder
                                    : {},
                                ]}
                                value={
                                  watch(
                                    'shippingAddressDetails.contactNumber',
                                  ) || ''
                                }
                                onChangeText={text =>
                                  setValue(
                                    'shippingAddressDetails.contactNumber',
                                    text,
                                  )
                                }
                                placeholder="Contact number"
                                keyboardType="phone-pad"
                              />
                              <FormMessage
                                error={
                                  errors.shippingAddressDetails?.contactNumber
                                }
                              />
                            </View>
                          </View>

                          <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Address</Text>
                            <TextInput
                              style={[
                                styles.textInput,
                                styles.textArea,
                                errors.shippingAddressDetails?.address
                                  ? styles.errorBorder
                                  : {},
                              ]}
                              value={
                                watch('shippingAddressDetails.address') || ''
                              }
                              onChangeText={text =>
                                setValue('shippingAddressDetails.address', text)
                              }
                              placeholder="Full address"
                              multiline
                              numberOfLines={3}
                            />
                            <FormMessage
                              error={errors.shippingAddressDetails?.address}
                            />
                          </View>

                          <View style={styles.formRow}>
                            <View style={styles.formGroup}>
                              <Text style={styles.formLabel}>State</Text>
                              <Combobox
                                options={shippingStateOptions}
                                value={shippingStateCode || ''}
                                onChange={handleStateChange}
                                placeholder="Select state"
                                searchPlaceholder="Type a state…"
                                noResultsText="No states found."
                              />
                              <FormMessage
                                error={errors.shippingAddressDetails?.state}
                              />
                            </View>
                            <View style={styles.formGroup}>
                              <Text style={styles.formLabel}>City</Text>
                              <Combobox
                                options={shippingCityOptions}
                                value={
                                  watch('shippingAddressDetails.city') || ''
                                }
                                onChange={value =>
                                  setValue('shippingAddressDetails.city', value)
                                }
                                placeholder={
                                  shippingStateCode
                                    ? 'Select city'
                                    : 'Select a state first'
                                }
                                searchPlaceholder="Type a city…"
                                noResultsText={
                                  shippingStateCode
                                    ? 'No cities found.'
                                    : 'Select a state first'
                                }
                                disabled={
                                  !shippingStateCode ||
                                  shippingCityOptions.length === 0
                                }
                              />
                              <FormMessage
                                error={errors.shippingAddressDetails?.city}
                              />
                            </View>
                          </View>

                          <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Pincode</Text>
                            <TextInput
                              style={[
                                styles.textInput,
                                errors.shippingAddressDetails?.pincode
                                  ? styles.errorBorder
                                  : {},
                              ]}
                              value={
                                watch('shippingAddressDetails.pincode') || ''
                              }
                              onChangeText={text =>
                                setValue('shippingAddressDetails.pincode', text)
                              }
                              placeholder="Pincode"
                              keyboardType="numeric"
                            />
                            <FormMessage
                              error={errors.shippingAddressDetails?.pincode}
                            />
                          </View>
                        </View>
                      </CustomCard>
                    )}

                    {shippingAddress && shippingAddress !== 'new' && (
                      <CustomButton
                        mode="outlined"
                        onPress={() => {
                          const selectedAddr = shippingAddresses.find(
                            addr => addr._id === shippingAddress,
                          );
                          if (selectedAddr) {
                            setEditingShippingAddress(selectedAddr);
                            setEditAddressForm({
                              label: selectedAddr.label || '',
                              address: selectedAddr.address || '',
                              city: selectedAddr.city || '',
                              state: selectedAddr.state || '',
                              pincode: selectedAddr.pincode || '',
                              contactNumber: selectedAddr.contactNumber || '',
                            });
                            setIsEditShippingAddressDialogOpen(true);
                          }
                        }}
                        style={styles.editAddressButton}
                      >
                        Edit Address
                      </CustomButton>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </CustomCard>
      )}

      {/* Items & Services Section */}
      <CustomCard style={styles.sectionCard}>
        <View style={styles.sectionContent}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('items')}
          >
            <View style={styles.sectionTitleContainer}>
              <Icon name="format-list-bulleted" size={20} color="#059669" />
              <Text style={styles.sectionTitle}>Items & Services</Text>
            </View>
            <Icon
              name={expandedSections.items ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>

          {expandedSections.items && (
            <View style={styles.sectionContent}>
              {fields.map((item, index) =>
                item.itemType === 'product'
                  ? renderProductItem(item, index)
                  : renderServiceItem(item, index),
              )}

              <View style={styles.addButtonsContainer}>
                <CustomButton
                  mode="outlined"
                  onPress={() => append({ ...PRODUCT_DEFAULT })}
                  style={styles.addButton}
                >
                  Add Product
                </CustomButton>
                <CustomButton
                  mode="outlined"
                  onPress={() =>
                    append({
                      itemType: 'service',
                      service: '',
                      amount: 0,
                      description: '',
                      gstPercentage: 18,
                      lineTax: 0,
                      lineTotal: 0,
                    })
                  }
                  style={styles.addButton}
                >
                  Add Service
                </CustomButton>
              </View>
            </View>
          )}
        </View>
      </CustomCard>

      {/* Totals and Notes Section */}
      <CustomCard style={styles.sectionCard}>
        <View style={styles.sectionContent}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('totals')}
          >
            <View style={styles.sectionTitleContainer}>
              <Icon name="calculator" size={20} color="#DC2626" />
              <Text style={styles.sectionTitle}>Totals & Notes</Text>
            </View>
            <Icon
              name={expandedSections.totals ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>

          {expandedSections.totals && (
            <View style={styles.sectionContent}>
              {type === 'sales' && (
                <View style={styles.notesSection}>
                  {!showNotes ? (
                    <View style={styles.addNotesButtonContainer}>
                      <CustomButton
                        mode="outlined"
                        onPress={() => setShowNotes(true)}
                      >
                        Add Notes
                      </CustomButton>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.notesHeader}>
                        <Text style={styles.notesLabel}>Notes</Text>
                        <TouchableOpacity onPress={() => setShowNotes(false)}>
                          <Text style={styles.removeNotesText}>
                            Remove Notes
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <QuillEditor
                        value={watch('notes') || ''}
                        onChange={value => setValue('notes', value)}
                        placeholder="Add detailed notes with formatting..."
                        style={styles.quillEditor}
                      />
                      <Text style={styles.notesDescription}>
                        Add rich text notes with formatting, colors, and styles
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View
                style={[
                  styles.totalsSection,
                  { alignSelf: type === 'sales' ? 'flex-end' : 'flex-end' },
                ]}
              >
                <CustomCard>
                  <View style={styles.totalsContainer}>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Subtotal</Text>
                      <TextInput
                        style={styles.totalInputField}
                        value={formatWithCommas(watch('totalAmount'))}
                        editable={false}
                      />
                    </View>

                    {gstEnabled && (
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>GST</Text>
                        <TextInput
                          style={styles.totalInputField}
                          value={formatWithCommas(watch('taxAmount'))}
                          editable={false}
                        />
                      </View>
                    )}

                    <View style={styles.totalRow}>
                      <Text style={styles.invoiceTotalLabel}>
                        Invoice Total{gstEnabled ? ' (GST incl.)' : ''}
                      </Text>
                      <TextInput
                        style={styles.invoiceTotalInput}
                        value={formatCurrencyDisplay(watch('invoiceTotal'))}
                        editable={false}
                      />
                    </View>
                  </View>
                </CustomCard>

                {/* Don't Send Invoice Checkbox for Sales */}
                {type === 'sales' && renderDontSendInvoice()}
              </View>
            </View>
          )}
        </View>
      </CustomCard>

      <Toast />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionContent: {
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    minWidth: 150,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#374151',
  },
  picker: {
    height: 50,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonContained: {
    backgroundColor: '#2563EB',
  },
  buttonOutlined: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainedText: {
    color: 'white',
  },
  buttonOutlinedText: {
    color: '#374151',
  },
  dateButton: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  dueDateContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  quickButton: {
    height: 50,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  balanceCard: {
    marginTop: 8,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  noBanksContainer: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noBanksText: {
    fontSize: 14,
    color: '#6B7280',
  },
  noExpensesText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  autoSelectText: {
    fontSize: 12,
    color: '#2563EB',
    marginTop: 4,
    fontStyle: 'italic',
  },
  checkboxCard: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxContent: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  checkboxDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  expenseContent: {
    marginTop: 16,
  },
  shippingSection: {
    gap: 16,
  },
  newAddressForm: {
    gap: 12,
  },
  newAddressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formGroup: {
    flex: 1,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    color: '#374151',
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingVertical: 8,
  },
  editAddressButton: {
    marginTop: 8,
  },
  itemCard: {
    marginVertical: 8,
  },
  itemContent: {
    gap: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  productSelectionContainer: {
    backgroundColor: '#DBEAFE',
    padding: 16,
    borderRadius: 8,
  },
  serviceSelectionContainer: {
    backgroundColor: '#DCFCE7',
    padding: 16,
    borderRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8,
  },
  originalProductWarning: {
    fontSize: 10,
    color: '#D97706',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  readOnlyProductContainer: {
    position: 'relative',
  },
  readOnlyProductInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#FBBF24',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFFBEB',
    fontSize: 14,
    color: '#92400E',
  },
  originalProductOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  originalProductOverlayText: {
    fontSize: 10,
    color: '#D97706',
    backgroundColor: '#FFFBEB',
    padding: 4,
    borderRadius: 4,
  },
  stockContainer: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  stockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  productDetailsContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceDetailsContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  inputContainer: {
    minWidth: 80,
    flex: 1,
  },
  wideInput: {
    flex: 2,
    minWidth: 200,
  },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  flex3: { flex: 3 },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  rightAlignedInput: {
    textAlign: 'right',
  },
  unitButton: {
    height: 40,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  readOnlyContainer: {
    height: 40,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  customGstContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalInput: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
    color: '#1E40AF',
    fontWeight: '500',
  },
  serviceTotalInput: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    color: '#166534',
    fontWeight: '500',
  },
  addButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  addButton: {
    flex: 1,
  },
  footerSection: {
    flexDirection: 'column',
    gap: 24,
  },
  notesSection: {
    flex: 1,
  },
  addNotesButtonContainer: {
    alignItems: 'flex-start',
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  removeNotesText: {
    color: '#6B7280',
    fontSize: 14,
  },
  quillEditor: {
    minHeight: 120,
  },
  notesDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  totalsSection: {
    width: '100%',
    maxWidth: 400,
  },
  totalsContainer: {
    gap: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalInputField: {
    width: 150,
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    fontSize: 14,
    textAlign: 'right',
  },
  invoiceTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  invoiceTotalInput: {
    width: 150,
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  errorBorder: {
    borderColor: '#DC2626',
    borderWidth: 1,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
  },
  deleteUnitButton: {
    padding: 4,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentMethodText: {
    fontSize: 14,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    minWidth: 200,
    maxHeight: 300,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: '#374151',
  },
});
