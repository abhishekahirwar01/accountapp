import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  FlatList,
  Linking,
  Dimensions,
  TextInput as RNTextInput,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import FileViewer from 'react-native-file-viewer';
import DropDownPicker from 'react-native-dropdown-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import WebView from 'react-native-webview';
import Pdf from 'react-native-pdf';
import RenderHtml from 'react-native-render-html';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useCompany } from '../../contexts/company-context.js';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { usePermissions } from '../../contexts/permission-context';

import { VendorForm } from '../vendors/VendorForm.js';
import { CustomerForm } from '../customers/CustomerForm.js';
import ProductForm from '../products/ProductForm.js';
import ServiceForm from '../services/ServiceForm.js';
import WhatsAppComposerDialog from './WhatsAppComposerDialog.js';

import {
  scrollToFirstError,
  buildInvoiceEmailHTML,
  handleCreateTransactionWithPreview,
  handlePartyChange,
} from './transaction-form/transaction-utils';
import { formSchema, useTransactionForm } from './transaction-form/schemas';
import hsnData from '../../data/HSN.json';
import sacData from '../../data/SAC.json';

import { generatePdfByTemplate } from './transaction-form/invoice-handler';
import {
  FormTabs,
  InvoicePreviewSheet,
  ShippingAddressDialogue,
} from './transaction-form/transactionForm-parts';
import { SalesPurchasesFields } from './transaction-form/SalesPurchasesFields';
import { ReceiptPaymentFields } from './transaction-form/ReceiptPaymentFields';
import {
  getStatesOfCountry,
  getCitiesOfState,
} from '../utils/country-utils.js';
import { BASE_URL } from '../../config';

// Custom Components to replace React Native Paper
const Text = ({ children, style, variant, ...props }) => {
  const getFontSize = () => {
    switch (variant) {
      case 'titleLarge':
        return 20;
      case 'headlineSmall':
        return 18;
      case 'titleMedium':
        return 16;
      case 'bodyMedium':
        return 14;
      case 'bodySmall':
        return 12;
      default:
        return 14;
    }
  };

  const getFontWeight = () => {
    switch (variant) {
      case 'titleLarge':
      case 'headlineSmall':
      case 'titleMedium':
        return '600';
      default:
        return '400';
    }
  };

  return (
    <RNTextInput
      editable={false}
      style={[
        {
          fontSize: getFontSize(),
          fontWeight: getFontWeight(),
          color: '#000',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNTextInput>
  );
};

const Button = ({
  children,
  onPress,
  mode,
  loading,
  disabled,
  style,
  icon,
  ...props
}) => {
  const backgroundColor = mode === 'contained' ? '#007AFF' : 'transparent';
  const borderColor = mode === 'outlined' ? '#007AFF' : 'transparent';
  const textColor = mode === 'contained' ? '#fff' : '#007AFF';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          backgroundColor,
          borderWidth: mode === 'outlined' ? 1 : 0,
          borderColor,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
      {...props}
    >
      <Text style={{ color: textColor, fontWeight: '600' }}>
        {loading ? 'Loading...' : children}
      </Text>
    </TouchableOpacity>
  );
};

const Card = ({ children, style }) => (
  <View
    style={[{ backgroundColor: '#fff', borderRadius: 8, padding: 16 }, style]}
  >
    {children}
  </View>
);

const Dialog = ({ visible, children, onDismiss, style }) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.dialogOverlay}>
        <View style={[styles.dialog, style]}>{children}</View>
      </View>
    </Modal>
  );
};

Dialog.Title = ({ children }) => (
  <View style={styles.dialogTitle}>
    <Text variant="titleLarge" style={{ fontWeight: '600' }}>
      {children}
    </Text>
  </View>
);

Dialog.Content = ({ children }) => (
  <View style={styles.dialogContent}>{children}</View>
);

const IconButton = ({ icon, onPress, size = 24, style }) => (
  <TouchableOpacity onPress={onPress} style={[styles.iconButton, style]}>
    <Text style={{ fontSize: size }}>{icon}</Text>
  </TouchableOpacity>
);

const IconAction = ({ iconName, label, onPress, disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={styles.iconActionContainer}
  >
    <Icon name={iconName} size={32} color={disabled ? '#AAA' : '#007AFF'} />
    <Text style={styles.iconActionLabel}>{label}</Text>
  </TouchableOpacity>
);

// const ActivityIndicator = ({ size, color }) => (
//   <View style={styles.activityIndicator}>
//     <Text style={{ color, fontSize: size === 'large' ? 24 : 16 }}>●</Text>
//   </View>
// );

const TextInput = ({ label, error, style, ...props }) => (
  <View style={styles.textInputContainer}>
    {label && <Text style={styles.textInputLabel}>{label}</Text>}
    <RNTextInput
      style={[styles.textInput, error && styles.textInputError, style]}
      placeholderTextColor="#999"
      {...props}
    />
    {error && <Text style={styles.textInputErrorText}>{error}</Text>}
  </View>
);

const HelperText = ({ children, type }) => (
  <Text style={[styles.helperText, type === 'error' && styles.helperTextError]}>
    {children}
  </Text>
);

const Snackbar = ({ visible, children, onDismiss, duration, style }) => {
  useEffect(() => {
    if (visible && duration) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  return (
    <View style={[styles.snackbar, style]}>
      <Text style={styles.snackbarText}>{children}</Text>
      <TouchableOpacity onPress={onDismiss} style={styles.snackbarCloseButton}>
        <Icon name="close" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const Divider = ({ style }) => <View style={[styles.divider, style]} />;

// Custom Form Focus Hook
const useFormFocus = (errors, scrollViewRef) => {
  const [focusedFields, setFocusedFields] = useState({});
  const inputRefs = useRef({});

  const registerField = (name, ref) => {
    if (ref) {
      inputRefs.current[name] = ref;
    }

    return {
      onFocus: () => {
        setFocusedFields(prev => ({ ...prev, [name]: true }));
        setTimeout(() => {
          ref?.measure((x, y, width, height, pageX, pageY) => {
            scrollViewRef.current?.scrollTo({ y: pageY - 100, animated: true });
          });
        }, 100);
      },
      onBlur: () => setFocusedFields(prev => ({ ...prev, [name]: false })),
      hasError: !!errors[name],
      isFocused: focusedFields[name],
      ref: node => {
        if (node) {
          inputRefs.current[name] = node;
        }
      },
    };
  };

  const scrollToFirstError = useCallback(() => {
    const firstError = Object.keys(errors)[0];
    if (firstError && inputRefs.current[firstError]) {
      inputRefs.current[firstError].focus();
    }
  }, [errors]);

  return { registerField, scrollToFirstError };
};

const getCompanyGSTIN = c => {
  const x = c;
  return (
    x?.gstin ??
    x?.gstIn ??
    x?.gstNumber ??
    x?.gst_no ??
    x?.gst ??
    x?.gstinNumber ??
    x?.tax?.gstin ??
    null
  );
};

const STANDARD_GST = 18;
const GST_OPTIONS = [
  { label: '0%', value: '0' },
  { label: '5%', value: '5' },
  { label: 'Standard (18%)', value: '18' },
  { label: '40%', value: '40' },
  { label: 'Custom', value: 'custom' },
];

const PRODUCT_DEFAULT = {
  itemType: 'product',
  product: '',
  quantity: 1,
  pricePerUnit: 0,
  unitType: 'Piece',
  otherUnit: '',
  amount: 0,
  gstPercentage: STANDARD_GST,
  lineTax: 0,
  lineTotal: 0,
};

export function TransactionForm({
  transactionToEdit,
  onFormSubmit,
  defaultType = 'sales',
  serviceNameById,
  prefillFrom,
}) {
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'default',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPartyDialogOpen, setIsPartyDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [companies, setCompanies] = useState([]);
  const [parties, setParties] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [balance, setBalance] = useState(null);
  const [partyBalance, setPartyBalance] = useState(null);
  const [vendorBalance, setVendorBalance] = useState(null);
  const [banks, setBanks] = useState([]);
  const [paymentExpenses, setPaymentExpenses] = useState([]);
  const [partyBalances, setPartyBalances] = useState({});
  const [creatingProductForIndex, setCreatingProductForIndex] = useState(null);
  const [creatingServiceForIndex, setCreatingServiceForIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [existingUnits, setExistingUnits] = useState([]);
  const [unitOpen, setUnitOpen] = useState(false);
  const [originalQuantities, setOriginalQuantities] = useState(new Map());
  const [shippingAddresses, setShippingAddresses] = useState([]);
  const [isEditShippingAddressDialogOpen, setIsEditShippingAddressDialogOpen] =
    useState(false);
  const [editingShippingAddress, setEditingShippingAddress] = useState(null);
  const [editAddressForm, setEditAddressForm] = useState({
    label: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactNumber: '',
  });
  const [customGstInputs, setCustomGstInputs] = useState({});
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState(null);
  const [isPreviewProcessing, setIsPreviewProcessing] = useState(false);
  const [previewCurrentAction, setPreviewCurrentAction] = useState(null);
  const [isTransactionSaved, setIsTransactionSaved] = useState(false);
  const [savedTransactionData, setSavedTransactionData] = useState(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailDialogTitle, setEmailDialogTitle] = useState('');
  const [emailDialogMessage, setEmailDialogMessage] = useState('');
  const [serviceCreationModal, setServiceCreationModal] = useState({
    open: false,
    name: '',
    index: null,
    amount: 0,
  });
  const [lastEditedField, setLastEditedField] = useState({});
  const [whatsappComposerOpen, setWhatsappComposerOpen] = useState(false);
  const [itemRenderKeys, setItemRenderKeys] = useState({});
  const [indiaStates, setIndiaStates] = useState([]);
  const [shippingStateCode, setShippingStateCode] = useState(null);
  const [shippingCityOptions, setShippingCityOptions] = useState([]);
  const [hsnOptions, setHsnOptions] = useState([]);
  const [sacOptions, setSacOptions] = useState([]);

  // Dropdown states
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState({});
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState({});
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [expenseDropdownOpen, setExpenseDropdownOpen] = useState(false);
  const [paymentMethodDropdownOpen, setPaymentMethodDropdownOpen] =
    useState(false);
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

  const { selectedCompanyId } = useCompany();
  const { permissions: userCaps } = useUserPermissions();
  const { permissions: accountPermissions } = usePermissions();

  const paymentMethods = [
    'Cash',
    'Credit',

    'UPI',
    'Bank Transfer',
    'Cheque',
    'Others',
  ];
  const paymentMethodsForReceipt = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];

  const form = useTransactionForm(undefined, defaultType);
  const scrollViewRef = useRef(null);
  const { registerField, scrollToFirstError } = useFormFocus(
    form.formState.errors,
    scrollViewRef,
  );

  useEffect(() => {
    const hsn = hsnData.map(item => ({
      label: `${item.HSN_CD} - ${item.HSN_Description}`,
      value: item.HSN_CD.toString(),
    }));
    setHsnOptions(hsn);

    const sac = sacData.map(item => ({
      label: `${item.SAC_CD} - ${item.SAC_Description}`,
      value: item.SAC_CD.toString(),
    }));
    setSacOptions(sac);
  }, []);

  useEffect(() => {
    const loadStates = async () => {
      try {
        const states = await getStatesOfCountry('IN');
        setIndiaStates(states);
      } catch (error) {
        console.error('Failed to load states:', error);
        setIndiaStates([]);
      }
    };
    loadStates();
  }, []);

  const selectedCompanyIdWatch = useWatch({
    control: form.control,
    name: 'company',
  });

  const selectedCompany = useMemo(
    () => companies.find(c => c._id === selectedCompanyIdWatch),
    [companies, selectedCompanyIdWatch],
  );

  const companyGSTIN = useMemo(
    () => getCompanyGSTIN(selectedCompany),
    [selectedCompany],
  );

  const gstEnabled = !!(companyGSTIN && String(companyGSTIN).trim());

  const [role, setRole] = useState(null);

  useEffect(() => {
    const loadRole = async () => {
      const storedRole = await AsyncStorage.getItem('role');
      setRole(storedRole);
    };
    loadRole();
  }, []);

  // Treat only 'master' as elevated super role — customers should not be
  // granted blanket elevated permissions.
  const isSuper = role === 'master';

  const canSales = isSuper || !!userCaps?.canCreateSaleEntries;
  const canPurchases = isSuper || !!userCaps?.canCreatePurchaseEntries;
  const canReceipt = isSuper || !!userCaps?.canCreateReceiptEntries;
  const canPayment = isSuper || !!userCaps?.canCreatePaymentEntries;
  const canJournal = isSuper || !!userCaps?.canCreateJournalEntries;

  // Prefer account-level permissions when available, fall back to user permissions
  const canCreateCustomer =
    isSuper ||
    (accountPermissions?.canCreateCustomers ??
      userCaps?.canCreateCustomers ??
      false);
  const canCreateVendor =
    isSuper ||
    (accountPermissions?.canCreateVendors ??
      userCaps?.canCreateVendors ??
      false);
  // Product permission prefers explicit `canCreateProducts` at account level
  // (matching ProductSettings), falling back to inventory permissions.
  const canCreateProducts =
    isSuper ||
    (accountPermissions?.canCreateProducts ??
      accountPermissions?.canCreateInventory ??
      userCaps?.accountPermissions?.canCreateProducts ??
      userCaps?.canCreateProducts ??
      userCaps?.canCreateInventory ??
      false);

  const canCreateInventory =
    isSuper ||
    (accountPermissions?.canCreateInventory ??
      accountPermissions?.canCreateProducts ??
      userCaps?.canCreateInventory ??
      userCaps?.canCreateProducts ??
      false);

  useEffect(() => {}, [
    role,
    isSuper,
    accountPermissions,
    userCaps,
    canCreateInventory,
    canCreateProducts,
    canCreateCustomer,
    canCreateVendor,
  ]);

  const allowedTypes = useMemo(() => {
    const arr = [];
    if (canSales) arr.push('sales');
    if (canPurchases) arr.push('purchases');
    if (canReceipt) arr.push('receipt');
    if (canPayment) arr.push('payment');
    if (canJournal) arr.push('journal');
    return arr;
  }, [canSales, canPurchases, canReceipt, canPayment, canJournal]);

  const { fields, append, remove, replace, insert } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const receiptAmountWatch = useWatch({
    control: form.control,
    name: 'totalAmount',
  });
  const type = form.watch('type');

  // Reset UI-only state when switching transaction type to avoid leftover
  // open dropdowns, dialogs or menus causing layout issues.
  useEffect(() => {
    // Close common dropdowns and dialogs
    setPartyDropdownOpen(false);
    setCompanyDropdownOpen(false);
    setStateDropdownOpen(false);
    setCityDropdownOpen(false);
    setBankDropdownOpen(false);
    setExpenseDropdownOpen(false);
    setPaymentMethodDropdownOpen(false);
    setUnitOpen(false);

    // Close any creation dialogs or preview
    setIsPartyDialogOpen(false);
    setIsProductDialogOpen(false);
    setIsServiceDialogOpen(false);
    setInvoicePreviewOpen(false);
    setShowNotes(false);

    // Reset dropdown open maps used for per-row pickers
    setProductDropdownOpen({});
    setServiceDropdownOpen({});

    // Reset transient UI helpers
    setItemRenderKeys({});

    // Note: per-component `expandedSections` is managed inside the
    // SalesPurchasesFields component. Do not call setExpandedSections here.
  }, [type]);

  const partyCreatable = useMemo(() => {
    if (type === 'sales' || type === 'receipt') return canCreateCustomer;
    if (type === 'purchases' || type === 'payment') return canCreateVendor;
    return false;
  }, [type, canCreateCustomer, canCreateVendor]);

  const serviceCreatable = canCreateInventory;

  useEffect(() => {
    if (type === 'sales' || type === 'purchases') {
      if (!form.getValues('items')?.length) {
        replace([PRODUCT_DEFAULT]);
      }
    } else {
      if (form.getValues('items')?.length) {
        replace([]);
      }
    }
  }, [type, replace, form]);

  useEffect(() => {
    if (!watchedItems || !['sales', 'purchases'].includes(type)) return;

    let subTotal = 0;
    let totalTax = 0;

    watchedItems.forEach((it, idx) => {
      if (!it) return;

      let base = 0;
      let lineTax = 0;
      let lineTotal = 0;
      const lastEdited = lastEditedField[idx];

      if (it.itemType === 'product') {
        const q = Number(it.quantity) || 0;
        const p = Number(it.pricePerUnit) || 0;
        const amt = Number(it.amount) || 0;
        const lineTot = Number(it.lineTotal) || 0;
        const pct = gstEnabled ? Number(it?.gstPercentage ?? 18) : 0;

        if (lastEdited === 'lineTotal') {
          lineTotal = lineTot;
          base = +(lineTotal / (1 + pct / 100)).toFixed(2);
          lineTax = +(lineTotal - base).toFixed(2);

          if (base !== amt) {
            form.setValue(`items.${idx}.amount`, base, {
              shouldValidate: false,
            });
          }

          if (q !== 0) {
            const calculatedPrice = +(base / q).toFixed(2);
            if (calculatedPrice !== p) {
              form.setValue(`items.${idx}.pricePerUnit`, calculatedPrice, {
                shouldValidate: false,
              });
            }
          }
        } else if (lastEdited === 'amount') {
          base = amt;
          lineTax = +((base * pct) / 100).toFixed(2);
          lineTotal = +(base + lineTax).toFixed(2);

          if (q !== 0) {
            const calculatedPrice = +(base / q).toFixed(2);
            if (calculatedPrice !== p) {
              form.setValue(`items.${idx}.pricePerUnit`, calculatedPrice, {
                shouldValidate: false,
              });
            }
          }
        } else if (lastEdited === 'quantity') {
          base = +(q * p).toFixed(2);
          lineTax = +((base * pct) / 100).toFixed(2);
          lineTotal = +(base + lineTax).toFixed(2);

          if (base !== amt) {
            form.setValue(`items.${idx}.amount`, base, {
              shouldValidate: false,
            });
          }
        } else if (lastEdited === 'pricePerUnit') {
          base = +(q * p).toFixed(2);
          lineTax = +((base * pct) / 100).toFixed(2);
          lineTotal = +(base + lineTax).toFixed(2);

          if (base !== amt) {
            form.setValue(`items.${idx}.amount`, base, {
              shouldValidate: false,
            });
          }
        } else {
          base = +(q * p).toFixed(2);
          lineTax = +((base * pct) / 100).toFixed(2);
          lineTotal = +(base + lineTax).toFixed(2);

          if (base !== amt) {
            form.setValue(`items.${idx}.amount`, base, {
              shouldValidate: false,
            });
          }
        }
      } else if (it.itemType === 'service') {
        const amt = Number(it.amount) || 0;
        const lineTot = Number(it.lineTotal) || 0;
        const pct = gstEnabled ? Number(it?.gstPercentage ?? 18) : 0;

        if (lastEdited === 'lineTotal') {
          lineTotal = lineTot;
          base = +(lineTotal / (1 + pct / 100)).toFixed(2);
          lineTax = +(lineTotal - base).toFixed(2);

          if (base !== amt) {
            form.setValue(`items.${idx}.amount`, base, {
              shouldValidate: false,
            });
          }
        } else {
          base = amt;
          lineTax = +((base * pct) / 100).toFixed(2);
          lineTotal = +(base + lineTax).toFixed(2);
        }
      }

      subTotal += base;
      totalTax += lineTax;

      const currentLineTax =
        Number(form.getValues(`items.${idx}.lineTax`)) || 0;
      const currentLineTotal =
        Number(form.getValues(`items.${idx}.lineTotal`)) || 0;

      if (currentLineTax !== lineTax) {
        form.setValue(`items.${idx}.lineTax`, lineTax, {
          shouldValidate: false,
        });
      }
      if (currentLineTotal !== lineTotal) {
        form.setValue(`items.${idx}.lineTotal`, lineTotal, {
          shouldValidate: false,
        });
      }
    });

    const invoiceTotal = +(subTotal + totalTax).toFixed(2);

    if ((Number(form.getValues('totalAmount')) || 0) !== subTotal) {
      form.setValue('totalAmount', subTotal, { shouldValidate: true });
    }
    if ((Number(form.getValues('taxAmount')) || 0) !== totalTax) {
      form.setValue('taxAmount', totalTax, { shouldValidate: false });
    }
    if ((Number(form.getValues('invoiceTotal')) || 0) !== invoiceTotal) {
      form.setValue('invoiceTotal', invoiceTotal, { shouldValidate: false });
    }
  }, [watchedItems, type, gstEnabled, form, lastEditedField]);

  const loadPartyBalances = useCallback(
    async list => {
      const token = await AsyncStorage.getItem('token');
      if (!token || !Array.isArray(list) || list.length === 0) return;

      try {
        const bulk = await fetch(`${BASE_URL}/api/parties/balances`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (bulk.ok) {
          const data = await bulk.json();
          const map = (data && data.balances) || {};
          setPartyBalances(map);
          return;
        }
      } catch {}

      const entries = await Promise.all(
        list.map(async p => {
          try {
            const r = await fetch(`${BASE_URL}/api/parties/${p._id}/balance`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!r.ok) return [p._id, 0];
            const d = await r.json();
            return [p._id, Number(d?.balance ?? 0)];
          } catch {
            return [p._id, 0];
          }
        }),
      );
      setPartyBalances(Object.fromEntries(entries));
    },
    [BASE_URL],
  );

  const fetchBanks = useCallback(
    async companyId => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found.');

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
          } else {
            banksData = [];
          }

          const filteredBanks = banksData.filter(bank => {
            const bankCompanyId =
              bank.company?._id || bank.company || bank.companyId;
            return bankCompanyId === companyId;
          });

          setBanks(filteredBanks);
        } else {
          throw new Error('Failed to fetch banks.');
        }
      } catch (error) {
        console.error('Error fetching banks:', error);
        setBanks([]);
        setSnackbar({
          visible: true,
          message:
            'Error fetching banks: ' +
            (error.message || 'Something went wrong.'),
          type: 'error',
        });
      }
    },
    [BASE_URL],
  );

  const transactionDate = form.watch('date');
  const dueDate = form.watch('dueDate');

  useEffect(() => {
    if (transactionDate && !dueDate) {
      form.setValue('dueDate', transactionDate);
    }
  }, [transactionDate, dueDate, form]);

  const fetchShippingAddresses = useCallback(
    async partyId => {
      if (!partyId) {
        setShippingAddresses([]);
        return;
      }

      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found.');

        const res = await fetch(
          `${BASE_URL}/api/shipping-addresses/party/${partyId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (res.ok) {
          const data = await res.json();
          setShippingAddresses(data.shippingAddresses || []);
        } else {
          setShippingAddresses([]);
        }
      } catch (error) {
        console.error('Error fetching shipping addresses:', error);
        setShippingAddresses([]);
      }
    },
    [BASE_URL],
  );

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const [
        companiesRes,
        partiesRes,
        productsRes,
        vendorsRes,
        servicesRes,
        paymentExpensesRes,
      ] = await Promise.all([
        fetch(`${BASE_URL}/api/companies/my`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/api/parties`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/api/products`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/api/vendors`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/api/services`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/api/payment-expenses`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (
        !companiesRes.ok ||
        !partiesRes.ok ||
        !productsRes.ok ||
        !vendorsRes.ok ||
        !servicesRes.ok ||
        !paymentExpensesRes.ok
      ) {
        throw new Error('Failed to fetch initial form data.');
      }

      const companiesData = await companiesRes.json();
      const partiesData = await partiesRes.json();
      const productsData = await productsRes.json();
      const vendorsData = await vendorsRes.json();
      const servicesData = await servicesRes.json();
      const paymentExpensesData = await paymentExpensesRes.json();

      setCompanies(companiesData);
      setParties(
        Array.isArray(partiesData) ? partiesData : partiesData.parties || [],
      );

      const list = Array.isArray(partiesData)
        ? partiesData
        : partiesData.parties || [];
      const listHasInlineBalance =
        Array.isArray(list) && list.some(p => typeof p?.balance === 'number');

      if (!listHasInlineBalance) {
        loadPartyBalances(list);
      } else {
        const map = {};
        list.forEach(p => (map[p._id] = Number(p.balance || 0)));
        setPartyBalances(map);
      }

      setProducts(
        Array.isArray(productsData)
          ? productsData
          : productsData.products || [],
      );
      setServices(
        Array.isArray(servicesData)
          ? servicesData
          : servicesData.services || [],
      );
      setVendors(
        Array.isArray(vendorsData) ? vendorsData : vendorsData.vendors || [],
      );
      setPaymentExpenses(
        Array.isArray(paymentExpensesData.data)
          ? paymentExpensesData.data
          : paymentExpensesData.expenses || [],
      );

      if (companiesData.length > 0 && !transactionToEdit) {
        form.setValue('company', selectedCompanyId || companiesData[0]._id);
      }
    } catch (error) {
      setSnackbar({
        visible: true,
        message:
          'Failed to load data: ' +
          (error.message || 'An unknown error occurred.'),
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [form, transactionToEdit, selectedCompanyId]);

  const handlePartyChangeWrapper = async partyId => {
    await handlePartyChange(
      partyId,
      type,
      selectedCompanyIdWatch,
      parties,
      vendors,
      setPartyBalance,
      setVendorBalance,
      setBalance,
      type === 'sales' ? fetchShippingAddresses : undefined,
      form,
      setParties,
      setVendors,
    );
  };

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

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
  }, [BASE_URL]);

  useEffect(() => {
    if (selectedCompanyIdWatch) {
      fetchBanks(selectedCompanyIdWatch);
      fetchPaymentExpenses(selectedCompanyIdWatch);
    } else {
      setBanks([]);
      setPaymentExpenses([]);
    }
  }, [selectedCompanyIdWatch, fetchBanks]);

  const fetchPaymentExpenses = useCallback(
    async companyId => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found.');

        const res = await fetch(
          `${BASE_URL}/api/payment-expenses?companyId=${companyId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (res.ok) {
          const data = await res.json();
          setPaymentExpenses(Array.isArray(data.data) ? data.data : []);
        } else {
          console.error('Failed to fetch payment expenses');
          setPaymentExpenses([]);
        }
      } catch (error) {
        console.error('Error fetching payment expenses:', error);
        setPaymentExpenses([]);
      }
    },
    [BASE_URL],
  );

  useEffect(() => {
    const currentStateName = form
      .getValues('shippingAddressDetails.state')
      ?.trim();
    if (!currentStateName) {
      setShippingStateCode(null);
      return;
    }
    const found = indiaStates.find(
      s => s.name.toLowerCase() === currentStateName.toLowerCase(),
    );
    setShippingStateCode(found?.isoCode || null);
  }, [indiaStates, form]);

  useEffect(() => {
    if (isEditShippingAddressDialogOpen && editAddressForm.state) {
      const found = indiaStates.find(
        s => s.name.toLowerCase() === editAddressForm.state.toLowerCase(),
      );
      setShippingStateCode(found?.isoCode || null);
    }
  }, [isEditShippingAddressDialogOpen, editAddressForm.state, indiaStates]);

  const shippingStateOptions = useMemo(
    () =>
      indiaStates
        .map(s => ({ value: s.isoCode, label: s.name }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [indiaStates],
  );

  useEffect(() => {
    const loadCities = async () => {
      if (!shippingStateCode) {
        setShippingCityOptions([]);
        return;
      }

      try {
        const cities = await getCitiesOfState('IN', shippingStateCode);
        const cityOptions = cities
          .map(c => ({ value: c.name, label: c.name }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setShippingCityOptions(cityOptions);
      } catch (error) {
        console.error('Failed to load cities:', error);
        setShippingCityOptions([]);
      }
    };

    loadCities();
  }, [shippingStateCode]);

  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    const items = form.getValues('items');

    if (items && items.length > 0) {
      const updatedItems = items.map(item => {
        if (item.itemType === 'product') {
          return {
            ...item,
            pricePerUnit: 0,
            amount: 0,
            lineTax: 0,
            lineTotal: 0,
          };
        }
        return item;
      });

      form.setValue('items', updatedItems);

      form.setValue('totalAmount', 0);
      form.setValue('taxAmount', 0);
      form.setValue('invoiceTotal', 0);
    }
  }, [type, form]);

  useEffect(() => {
    if (transactionToEdit && banks.length > 0) {
      const bankValue = form.getValues('bank');
      if (bankValue) {
        const bankExists = banks.some(bank => bank._id === bankValue);
        if (!bankExists) {
          form.setValue('bank', '');
        }
      }
    }
  }, [banks, transactionToEdit, form]);

  useEffect(() => {
    const partyId = form.watch('party');
    if (partyId && type === 'sales') {
      fetchShippingAddresses(partyId);
    }
  }, [form.watch('party'), type, fetchShippingAddresses]);

  useEffect(() => {
    const partyId = form.watch('party');
    if (partyId && selectedCompanyIdWatch) {
      handlePartyChangeWrapper(partyId);
    }
  }, [selectedCompanyIdWatch, form.watch('party'), type]);

  useEffect(() => {
    if (!prefillFrom) return;

    let prefillItems = [];

    if (Array.isArray(prefillFrom.items) && prefillFrom.items.length) {
      prefillItems = prefillFrom.items.map(item => ({
        itemType: item.itemType || (item.product ? 'product' : 'service'),
        product: item.product?._id || item.product || '',
        service: item.service?._id || item.service || '',
        quantity: item.quantity || 1,
        unitType: item.unitType || 'Piece',
        otherUnit: item.otherUnit || '',
        pricePerUnit: item.pricePerUnit || 0,
        amount: item.amount || 0,
        gstPercentage: item.gstPercentage || 18,
        lineTax: item.lineTax || 0,
        lineTotal: item.lineTotal || item.amount || 0,
        description: item.description || '',
      }));
    } else {
      const prodArr = Array.isArray(prefillFrom.products)
        ? prefillFrom.products.map(p => ({
            itemType: 'product',
            product: p.product?._id || p.product || '',
            service: '',
            quantity: p.quantity || 1,
            unitType: p.unitType || 'Piece',
            otherUnit: p.otherUnit || '',
            pricePerUnit: p.pricePerUnit || 0,
            amount: p.amount || 0,
            gstPercentage: p.gstPercentage || 18,
            lineTax: p.lineTax || 0,
            lineTotal: p.lineTotal || p.amount || 0,
            description: p.description || '',
          }))
        : [];

      const svcArr = Array.isArray(prefillFrom.services)
        ? prefillFrom.services.map(s => ({
            itemType: 'service',
            product: '',
            service: s.service?._id || s.service || '',
            quantity: undefined,
            unitType: undefined,
            otherUnit: undefined,
            pricePerUnit: undefined,
            amount: s.amount || 0,
            gstPercentage: s.gstPercentage || 18,
            lineTax: s.lineTax || 0,
            lineTotal: s.lineTotal || s.amount || 0,
            description: s.description || '',
          }))
        : [];

      prefillItems = [...prodArr, ...svcArr];
    }

    const normalizedItems =
      prefillItems.length > 0 ? prefillItems : [PRODUCT_DEFAULT];

    form.reset({
      party:
        typeof prefillFrom.party === 'object' && prefillFrom.party?._id
          ? prefillFrom.party._id
          : typeof prefillFrom.party === 'string'
          ? prefillFrom.party
          : '',
      expense: '',
      isExpense: false,
      description: prefillFrom.description || '',
      totalAmount: prefillFrom.totalAmount || 0,
      items: normalizedItems,
      type: 'sales',
      referenceNumber: '',
      fromAccount: '',
      toAccount: '',
      narration: '',
      company:
        typeof prefillFrom.company === 'object' && prefillFrom.company?._id
          ? prefillFrom.company._id
          : typeof prefillFrom.company === 'string'
          ? prefillFrom.company
          : selectedCompanyId || '',
      date: new Date(),
      taxAmount: prefillFrom.taxAmount || 0,
      invoiceTotal: prefillFrom.invoiceTotal || prefillFrom.totalAmount || 0,
      notes: '',
      sameAsBilling: true,
      shippingAddress:
        prefillFrom.shippingAddress &&
        typeof prefillFrom.shippingAddress === 'object'
          ? String(prefillFrom.shippingAddress._id || '')
          : String(prefillFrom.shippingAddress || ''),
      shippingAddressDetails:
        prefillFrom.shippingAddress &&
        typeof prefillFrom.shippingAddress === 'object'
          ? {
              label: prefillFrom.shippingAddress.label || '',
              address: prefillFrom.shippingAddress.address || '',
              city: prefillFrom.shippingAddress.city || '',
              state: prefillFrom.shippingAddress.state || '',
              pincode: prefillFrom.shippingAddress.pincode || '',
              contactNumber: prefillFrom.shippingAddress.contactNumber || '',
            }
          : {
              label: '',
              address: '',
              city: '',
              state: '',
              pincode: '',
              contactNumber: '',
            },
    });

    replace(normalizedItems);
  }, [prefillFrom, form, replace, selectedCompanyId]);

  useEffect(() => {
    if (!transactionToEdit) return;

    const toProductItem = p => ({
      itemType: 'product',
      product:
        p.product && typeof p.product === 'object'
          ? String(p.product._id)
          : String(p.product || ''),
      quantity: p.quantity ?? 1,
      unitType: p.unitType ?? 'Piece',
      otherUnit: p.otherUnit ?? ' ',
      pricePerUnit: p.pricePerUnit ?? 0,
      description: p.description ?? '',
      amount:
        typeof p.amount === 'number'
          ? p.amount
          : Number(p.quantity || 0) * Number(p.pricePerUnit || 0),
      gstPercentage: p.gstPercentage ?? 18,
      lineTax: p.lineTax ?? 0,
      lineTotal: p.lineTotal ?? p.amount,
    });

    const toServiceId = s => {
      const raw =
        (s.service &&
          (typeof s.service === 'object' ? s.service._id : s.service)) ??
        (s.serviceName &&
          (typeof s.serviceName === 'object'
            ? s.serviceName._id
            : s.serviceName)) ??
        s.serviceId;

      return raw ? String(raw) : '';
    };

    const toServiceItem = s => ({
      itemType: 'service',
      service: toServiceId(s),
      description: s.description ?? '',
      amount: Number(s.amount || 0),
      gstPercentage: s.gstPercentage ?? 18,
      lineTax: s.lineTax ?? 0,
      lineTotal: s.lineTotal ?? s.amount,
    });

    const toUnifiedItem = i => ({
      itemType:
        i.itemType ??
        (i.product || i.productId
          ? 'product'
          : i.service || i.serviceName
          ? 'service'
          : 'product'),
      product:
        i.product && typeof i.product === 'object'
          ? String(i.product._id)
          : String(i.product || ''),
      service: toServiceId(i),
      quantity: i.quantity ?? (i.itemType === 'service' ? undefined : 1),
      unitType: i.unitType ?? 'Piece',
      otherUnit: i.otherUnit ?? ' ',
      pricePerUnit: i.pricePerUnit ?? undefined,
      description: i.description ?? '',
      amount:
        typeof i.amount === 'number'
          ? i.amount
          : Number(i.quantity || 0) * Number(i.pricePerUnit || 0),
      gstPercentage: i.gstPercentage ?? 18,
      lineTax: i.lineTax ?? 0,
      lineTotal: i.lineTotal ?? i.amount,
    });

    let itemsToSet = [];

    if (
      Array.isArray(transactionToEdit.items) &&
      transactionToEdit.items.length
    ) {
      itemsToSet = transactionToEdit.items.map(toUnifiedItem);
    } else {
      const prodArr = Array.isArray(transactionToEdit.products)
        ? transactionToEdit.products.map(toProductItem)
        : [];

      const svcPlural = Array.isArray(transactionToEdit.services)
        ? transactionToEdit.services.map(toServiceItem)
        : [];

      const svcLegacy = Array.isArray(transactionToEdit.service)
        ? transactionToEdit.service.map(toServiceItem)
        : [];

      itemsToSet = [...prodArr, ...svcPlural, ...svcLegacy];
    }

    if (
      (!itemsToSet || itemsToSet.length === 0) &&
      (transactionToEdit.type === 'sales' ||
        transactionToEdit.type === 'purchases')
    ) {
      itemsToSet = [
        {
          itemType: 'product',
          product: '',
          quantity: 1,
          pricePerUnit: 0,
          unitType: 'Piece',
          otherUnit: ' ',
          amount: 0,
          description: '',
        },
      ];
    }

    let partyId;

    if (
      transactionToEdit.type === 'sales' ||
      transactionToEdit.type === 'receipt'
    ) {
      partyId = transactionToEdit.party
        ? typeof transactionToEdit.party === 'object'
          ? transactionToEdit.party._id
          : transactionToEdit.party
        : undefined;
    } else if (
      transactionToEdit.type === 'purchases' ||
      transactionToEdit.type === 'payment'
    ) {
      partyId = transactionToEdit.vendor
        ? typeof transactionToEdit.vendor === 'object'
          ? transactionToEdit.vendor._id
          : transactionToEdit.vendor
        : undefined;
    }

    form.reset({
      type: transactionToEdit.type,
      company:
        transactionToEdit?.company &&
        typeof transactionToEdit.company === 'object'
          ? transactionToEdit.company._id || ''
          : typeof transactionToEdit?.company === 'string'
          ? transactionToEdit.company === 'all'
            ? ''
            : transactionToEdit.company
          : selectedCompanyId || '',
      date: new Date(transactionToEdit.date),
      dueDate: transactionToEdit.dueDate
        ? new Date(transactionToEdit.dueDate)
        : undefined,
      totalAmount: transactionToEdit.totalAmount || transactionToEdit.amount,
      items: itemsToSet,
      description: transactionToEdit.description || transactionToEdit.narration || '',
      narration: transactionToEdit.narration || '',
      party: partyId,
      referenceNumber: transactionToEdit.referenceNumber,
      fromAccount: transactionToEdit.debitAccount,
      toAccount: transactionToEdit.creditAccount,
      paymentMethod: transactionToEdit.paymentMethod || '',
      isExpense:
        transactionToEdit.type === 'payment'
          ? transactionToEdit.isExpense || false
          : false,
      expense:
        transactionToEdit.type === 'payment'
          ? transactionToEdit.expense
            ? typeof transactionToEdit.expense === 'object'
              ? transactionToEdit.expense._id
              : transactionToEdit.expense
            : ''
          : '',

      bank:
        transactionToEdit.bank && typeof transactionToEdit.bank === 'object'
          ? transactionToEdit.bank._id
          : transactionToEdit.bank || '',
      notes: transactionToEdit.notes || '',
      sameAsBilling: !transactionToEdit.shippingAddress,
      shippingAddress:
        transactionToEdit.shippingAddress &&
        typeof transactionToEdit.shippingAddress === 'object'
          ? String(transactionToEdit.shippingAddress._id || '')
          : String(transactionToEdit.shippingAddress || ''),
      shippingAddressDetails:
        transactionToEdit.shippingAddress &&
        typeof transactionToEdit.shippingAddress === 'object'
          ? {
              label: transactionToEdit.shippingAddress.label || '',
              address: transactionToEdit.shippingAddress.address || '',
              city: transactionToEdit.shippingAddress.city || '',
              state: transactionToEdit.shippingAddress.state || '',
              pincode: transactionToEdit.shippingAddress.pincode || '',
              contactNumber:
                transactionToEdit.shippingAddress.contactNumber || '',
            }
          : {
              label: '',
              address: '',
              city: '',
              state: '',
              pincode: '',
              contactNumber: '',
            },
    });

    if (transactionToEdit.notes && transactionToEdit.notes.trim()) {
      setShowNotes(true);
    }

    replace(itemsToSet);

    const origMap = new Map();
    itemsToSet.forEach(item => {
      if (item.product) {
        origMap.set(item.product, Number(item.quantity) || 0);
      }
    });
    setOriginalQuantities(origMap);

    if (partyId) {
      handlePartyChangeWrapper(partyId);
    }
  }, [transactionToEdit, form, replace, isLoading]);

  useEffect(() => {
    if (transactionToEdit) return;
    const current = form.getValues('type');
    if (!allowedTypes.includes(current)) {
      form.setValue('type', allowedTypes[0] ?? 'sales');
    }
  }, [allowedTypes, transactionToEdit, form]);

  useEffect(() => {
    const partyId = form.watch('party');
    if (partyId && (type === 'sales' || type === 'receipt')) {
      const selectedParty = parties.find(p => p._id === partyId);
    } else if (partyId && (type === 'purchases' || type === 'payment')) {
      const selectedVendor = vendors.find(v => v._id === partyId);
    }
  }, [form.watch('party'), type, parties, vendors, transactionToEdit]);

  useEffect(() => {
    const currentPartyId = form.watch('party');

    if (!currentPartyId) {
      setPartyBalance(null);
      setVendorBalance(null);
      setBalance(null);
      return;
    }

    const isCustomer = parties.find(p => p._id === currentPartyId);
    const isVendor = vendors.find(v => v._id === currentPartyId);

    if (
      currentPartyId &&
      (type === 'sales' || type === 'receipt') &&
      isCustomer &&
      partyBalance === null
    ) {
      handlePartyChangeWrapper(currentPartyId);
    }

    if (
      currentPartyId &&
      (type === 'purchases' || type === 'payment') &&
      isVendor &&
      vendorBalance === null
    ) {
      handlePartyChangeWrapper(currentPartyId);
    }

    if ((type === 'sales' || type === 'receipt') && !isCustomer) {
      setPartyBalance(null);
    }
    if ((type === 'purchases' || type === 'payment') && !isVendor) {
      setVendorBalance(null);
    }
  }, [type, form.watch('party')]);

  useEffect(() => {
    const partyId = form.getValues('party');
    if (!partyId) return;

    if ((type === 'sales' || type === 'receipt') && parties.length > 0) {
      if (partyBalance === null) {
        handlePartyChangeWrapper(partyId);
      }
    } else if (
      (type === 'purchases' || type === 'payment') &&
      vendors.length > 0
    ) {
      if (vendorBalance === null) {
        handlePartyChangeWrapper(partyId);
      }
    }
  }, [type, parties.length, vendors.length]);

  useEffect(() => {
    if (!transactionToEdit || !shippingAddresses.length) return;

    const shippingAddr = transactionToEdit.shippingAddress;

    if (shippingAddr) {
      const addressId =
        typeof shippingAddr === 'object' ? shippingAddr._id : shippingAddr;

      const addressExists = shippingAddresses.some(
        addr => addr._id === addressId,
      );

      if (addressExists) {
        form.setValue('sameAsBilling', false, { shouldValidate: false });

        setTimeout(() => {
          form.setValue('shippingAddress', addressId, {
            shouldValidate: false,
          });

          if (typeof shippingAddr === 'object') {
            form.setValue(
              'shippingAddressDetails',
              {
                label: shippingAddr.label || '',
                address: shippingAddr.address || '',
                city: shippingAddr.city || '',
                state: shippingAddr.state || '',
                pincode: shippingAddr.pincode || '',
                contactNumber: shippingAddr.contactNumber || '',
              },
              { shouldValidate: false },
            );

            const found = indiaStates.find(
              s =>
                s.name.toLowerCase() ===
                (shippingAddr.state || '').toLowerCase(),
            );
            setShippingStateCode(found?.isoCode || null);
          }
        }, 50);
      }
    }
  }, [transactionToEdit, shippingAddresses, form, indiaStates]);

  useEffect(() => {}, [
    form.watch('sameAsBilling'),
    form.watch('shippingAddress'),
    shippingAddresses,
    transactionToEdit,
  ]);

  useEffect(() => {}, [shippingAddresses]);

  const handlePreviewClose = () => {
    setInvoicePreviewOpen(false);
    if (type === 'sales') {
      if (onFormSubmit && typeof onFormSubmit === 'function') {
        onFormSubmit();
      }
    }
  };

  const enrichTransactionWithNames = (transaction, products, services) => {
    if (!transaction) return transaction;

    const enriched = { ...transaction };

    if (Array.isArray(enriched.products)) {
      enriched.products = enriched.products.map(productItem => {
        const product = products.find(p => p._id === productItem.product);
        return {
          ...productItem,
          productName: product?.name || 'Unknown Product',
          product: product
            ? { ...product, name: product.name }
            : productItem.product,
        };
      });
    }

    if (Array.isArray(enriched.services)) {
      enriched.services = enriched.services.map(serviceItem => {
        const service = services.find(s => s._id === serviceItem.service);
        return {
          ...serviceItem,
          serviceName: service?.serviceName || 'Unknown Service',
          service: service
            ? { ...service, serviceName: service.serviceName }
            : serviceItem.service,
        };
      });
    }

    return enriched;
  };

  // Normalize various PDF instances to base64 string
  const pdfInstanceToBase64 = async pdfInstance => {
    const uint8ToBinaryString = u8 => {
      const CHUNK = 0x8000;
      let result = '';
      if (u8 && u8.length > 0) {
        for (let i = 0; i < u8.length; i += CHUNK) {
          const slice = u8.subarray(i, i + CHUNK);
          result += String.fromCharCode.apply(null, slice);
        }
      }

      return result;
    };

    const base64FromUint8 = u8 => {
      const map =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let output = '';
      const len = u8?.length || 0;
      let i;

      for (i = 0; i < len - 2; i += 3) {
        const n = (u8[i] << 16) | (u8[i + 1] << 8) | u8[i + 2];
        output +=
          map[(n >> 18) & 63] +
          map[(n >> 12) & 63] +
          map[(n >> 6) & 63] +
          map[n & 63];
      }

      if (i < len) {
        let n = (u8[i] & 0xff) << 16;
        let pad = '==';
        if (i + 1 < len) {
          n |= (u8[i + 1] & 0xff) << 8;
          pad = '=';
        }
        output += map[(n >> 18) & 63] + map[(n >> 12) & 63];
        output += i + 1 < len ? map[(n >> 6) & 63] : '=';
        output += pad === '=' ? '=' : map[n & 63];
      }

      return output;
    };

    try {
      // ✅ FIRST AND MOST IMPORTANT: Check if base64 already exists in the object
      if (pdfInstance?.base64 && typeof pdfInstance.base64 === 'string') {
        return pdfInstance.base64;
      }

      // ✅ SECOND: Check if it's already a base64 string
      if (typeof pdfInstance === 'string') {
        if (pdfInstance.startsWith('data:')) {
          const base64Data = pdfInstance.split(',')[1];

          return base64Data || pdfInstance;
        }

        return pdfInstance;
      }

      // ✅ THIRD: Try output('base64') directly
      if (pdfInstance && typeof pdfInstance.output === 'function') {
        try {
          const base64 = pdfInstance.output('base64');
          if (base64 && typeof base64 === 'string' && base64.length > 0) {
            return base64;
          }
        } catch (e) {}
      }
      // ✅ FOURTH: Traditional conversion methods (as fallback)
      if (typeof Blob !== 'undefined' && pdfInstance instanceof Blob) {
        const arrayBuffer = await pdfInstance.arrayBuffer();

        const u8 = new Uint8Array(arrayBuffer);

        const bin = uint8ToBinaryString(u8);

        if (typeof btoa === 'function') {
          const result = btoa(bin);

          return result;
        }
        if (typeof Buffer !== 'undefined') {
          const result = Buffer.from(u8).toString('base64');

          return result;
        }
        const result = base64FromUint8(u8);

        return result;
      }

      if (pdfInstance && typeof pdfInstance.save === 'function') {
        const u8 = await pdfInstance.save();

        const bin = uint8ToBinaryString(u8);

        if (typeof btoa === 'function') {
          const result = btoa(bin);

          return result;
        }
        if (typeof Buffer !== 'undefined') {
          const result = Buffer.from(u8).toString('base64');

          return result;
        }
        const result = base64FromUint8(u8);

        return result;
      }

      if (pdfInstance && typeof pdfInstance.output === 'function') {
        try {
          const arr = pdfInstance.output('arraybuffer');
          if (arr && arr.byteLength > 0) {
            const u8 = new Uint8Array(arr);

            const bin = uint8ToBinaryString(u8);

            if (typeof btoa === 'function') {
              const result = btoa(bin);

              return result;
            }
            if (typeof Buffer !== 'undefined') {
              const result = Buffer.from(u8).toString('base64');

              return result;
            }
            const result = base64FromUint8(u8);

            return result;
          }
        } catch (e) {}

        try {
          const out = pdfInstance.output();

          if (typeof out === 'string') {
            if (out.startsWith('data:')) {
              const base64Data = out.split(',')[1];

              return base64Data;
            } else {
              return out;
            }
          }
        } catch (e) {}
      }

      throw new Error('Unable to convert PDF instance to base64');
    } catch (err) {
      console.error('🔴 pdfInstanceToBase64 FAILED:', err);
      console.error('🔴 Error stack:', err.stack);
      throw err;
    }
  };
  const updateProductHsn = async (productId, hsn) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      await fetch(`${BASE_URL}/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hsn }),
      });
      // Also update local state for consistency
      setProducts(prev =>
        prev.map(p => (p._id === productId ? { ...p, hsn } : p)),
      );
    } catch (error) {
      console.error('Failed to update product HSN in background:', error);
      // Optional: show a non-intrusive error
    }
  };

  const updateServiceSac = async (serviceId, sac) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      await fetch(`${BASE_URL}/api/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sac }),
      });
      // Also update local state for consistency
      setServices(prev =>
        prev.map(s => (s._id === serviceId ? { ...s, sac } : s)),
      );
    } catch (error) {
      console.error('Failed to update service SAC in background:', error);
      // Optional: show a non-intrusive error
    }
  };
  const handleHsnChange = (hsnCodeValue, index) => {
    form.setValue(`items.${index}.hsn`, hsnCodeValue, {
      shouldValidate: true,
    });

    const productId = form.watch(`items.${index}.product`);
    if (productId) {
      // Fire-and-forget update to the backend
      updateProductHsn(productId, hsnCodeValue);
    }
  };

  const handleSacChange = (sacCodeValue, index) => {
    form.setValue(`items.${index}.sac`, sacCodeValue, {
      shouldValidate: true,
    });

    const serviceId = form.watch(`items.${index}.service`);
    if (serviceId) {
      // Fire-and-forget update to the backend
      updateServiceSac(serviceId, sacCodeValue);
    }
  };

  async function onSubmit(values, shouldCloseForm = true) {
    const isValid = await form.trigger();

    if (!isValid) {
      scrollToFirstError();
      return;
    }

    if (values.type === 'sales' && values.items) {
      values.items.forEach((item, index) => {
        if (item.itemType === 'product' && item.product && item.quantity) {
          const selectedProduct = products.find(p => p._id === item.product);
          if (
            selectedProduct &&
            selectedProduct.stocks !== undefined &&
            selectedProduct.stocks !== null
          ) {
            const currentStock = Number(selectedProduct.stocks) || 0;
            const requestedQuantity = Number(item.quantity) || 0;

            const stockAfterTransaction = currentStock - requestedQuantity;

            if (currentStock <= 0) {
              setSnackbar({
                visible: true,
                message: `${selectedProduct.name} is out of stock.`,
                type: 'error',
              });
            } else if (requestedQuantity > currentStock) {
              setSnackbar({
                visible: true,
                message: `${selectedProduct.name}: Ordered ${requestedQuantity} but only ${currentStock} available.`,
                type: 'error',
              });
            } else if (stockAfterTransaction <= 0) {
              setSnackbar({
                visible: true,
                message: `${selectedProduct.name} will be out of stock after this order.`,
                type: 'error',
              });
            } else if (stockAfterTransaction <= 5) {
              setSnackbar({
                visible: true,
                message: `${selectedProduct.name} will have only ${stockAfterTransaction} units left after this order.`,
                type: 'error',
              });
            } else if (currentStock <= 5) {
              setSnackbar({
                visible: true,
                message: `${selectedProduct.name} currently has low stock (${currentStock} units).`,
                type: 'error',
              });
            }
          }
        }
      });
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const endpointMap = {
        sales: `/api/sales`,
        purchases: `/api/purchase`,
        receipt: `/api/receipts`,
        payment: `/api/payments`,
        journal: `/api/journals`,
      };

      const method = transactionToEdit ? 'PUT' : 'POST';
      let endpoint = endpointMap[values.type];

      if (transactionToEdit) {
        const editType = transactionToEdit.type;
        endpoint = `${endpointMap[editType]}/${transactionToEdit._id}`;
      }

      const productLines =
        values.items
          ?.filter(i => i.itemType === 'product')
          .map(i => ({
            product: i.product,
            quantity: i.quantity,
            unitType: i.unitType,
            otherUnit: i.otherUnit,
            pricePerUnit: i.pricePerUnit,
            amount:
              typeof i.amount === 'number'
                ? i.amount
                : Number(i.quantity || 0) * Number(i.pricePerUnit || 0),
            description: i.description ?? '',
            gstPercentage: gstEnabled ? Number(i.gstPercentage ?? 18) : 0,
            lineTax: gstEnabled ? Number(i.lineTax ?? 0) : 0,
            lineTotal: gstEnabled ? Number(i.lineTotal ?? i.amount) : i.amount,
          })) ?? [];

      const serviceLines =
        values.items
          ?.filter(i => i.itemType === 'service')
          .map(i => ({
            service: i.service,
            amount: i.amount,
            description: i.description ?? '',
            gstPercentage: gstEnabled ? Number(i.gstPercentage ?? 18) : 0,
            lineTax: gstEnabled ? Number(i.lineTax ?? 0) : 0,
            lineTotal: gstEnabled ? Number(i.lineTotal ?? i.amount) : i.amount,
          })) ?? [];

      const uiSubTotal = Number(values.totalAmount ?? 0);

      const uiTax = gstEnabled ? Number(values.taxAmount ?? 0) : 0;
      const uiInvoiceTotal = gstEnabled
        ? Number(values.invoiceTotal ?? uiSubTotal)
        : uiSubTotal;
      const receiptAmount = Number(
        values.totalAmount ?? values.subTotal ?? values.invoiceTotal ?? 0,
      );

      let shippingAddressId = null;
      if (values.type === 'sales') {
        if (values.sameAsBilling) {
          shippingAddressId = null;
        } else if (values.shippingAddress && values.shippingAddress !== 'new') {
          shippingAddressId = values.shippingAddress;
        } else if (
          values.shippingAddress === 'new' &&
          values.shippingAddressDetails
        ) {
          try {
            const shippingPayload = {
              party: values.party,
              label: values.shippingAddressDetails.label || 'New Address',
              address: values.shippingAddressDetails.address || '',
              city: values.shippingAddressDetails.city || '',
              state: values.shippingAddressDetails.state || '',
              pincode: values.shippingAddressDetails.pincode || '',
              contactNumber: values.shippingAddressDetails.contactNumber || '',
            };

            const shippingRes = await fetch(
              `${BASE_URL}/api/shipping-addresses`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(shippingPayload),
              },
            );

            if (shippingRes.ok) {
              const shippingData = await shippingRes.json();
              shippingAddressId = shippingData.shippingAddress._id;

              setShippingAddresses(prev => [
                ...prev,
                shippingData.shippingAddress,
              ]);
            } else {
              throw new Error('Failed to create shipping address');
            }
          } catch (error) {
            console.error('Error creating shipping address:', error);
            setSnackbar({
              visible: true,
              message:
                'Failed to save shipping address. Transaction will proceed without it.',
              type: 'error',
            });
          }
        }
      }

      let payload;

      if (values.type === 'receipt') {
        payload = {
          type: 'receipt',
          company: values.company,
          party: values.party,
          date: values.date,
          amount: receiptAmount,
          description: values.description,
          paymentMethod: values.paymentMethod,
          referenceNumber: values.referenceNumber,
        };
      } else {
        payload = {
          type: values.type,
          company: values.company,
          party: values.party,
          date: values.date,
          dueDate: values.dueDate,
          description: values.description,
          referenceNumber: values.referenceNumber,
          narration: values.narration,
          products: productLines,
          services: serviceLines,
          totalAmount: uiInvoiceTotal,
          subTotal: uiSubTotal,
          taxAmount: uiTax,
          paymentMethod: values.paymentMethod,
          invoiceTotal: uiInvoiceTotal,
          bank: values.bank || undefined,
          notes: values.notes || '',
          shippingAddress: shippingAddressId,
        };
      }

      if (values.type === 'payment') {
        payload.amount = values.totalAmount;
        payload.isExpense = values.isExpense || false;
        if (values.isExpense && values.expense) {
          payload.expense = values.expense;
        }
        delete payload.totalAmount;
        delete payload.subTotal;
        delete payload.taxAmount;
        delete payload.invoiceTotal;
        delete payload.products;
        delete payload.services;
      }

      delete payload.items;
      delete payload.gstRate;

      if (values.type === 'purchases' || values.type === 'payment') {
        payload.vendor = values.party;
        delete payload.party;
      }

    if (values.type === 'journal') {
      payload.debitAccount = values.fromAccount;
      payload.creditAccount = values.toAccount;
      payload.amount = Number(values.totalAmount ?? 0);
      payload.narration = values.description || '';

      delete payload.items;
      delete payload.totalAmount;
      delete payload.taxAmount;
    }

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || `Failed to submit ${values.type} entry.`,
        );
      }

      if (shouldCloseForm) {
        onFormSubmit();
      }

      const templateRes = await fetch(
        `${BASE_URL}/api/settings/default-template`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const templateData = await templateRes.json();

      if (values.type === 'sales') {
        const saved = data?.entry || data?.sale || {};
        const savedCompanyId = String(
          saved.company?._id || saved.company || values.company,
        );
        const savedPartyId = String(
          saved.party?._id || saved.party || values.party,
        );

        const companyDoc = companies.find(
          c => String(c._id) === savedCompanyId,
        );
        const partyDoc = parties.find(p => String(p._id) === savedPartyId);

        if (partyDoc?.email) {
          setSnackbar({
            visible: true,
            message:
              'Invoice created successfully. You can now send it via email using the email button.',
            type: 'success',
          });
        } else {
          setSnackbar({
            visible: true,
            message:
              "Transaction created but customer doesn't have an email address.",
            type: 'error',
          });
        }
      }

      const inv =
        values.type === 'sales' ? data?.entry?.invoiceNumber : undefined;
      setSnackbar({
        visible: true,
        message: inv
          ? `Your ${values.type} entry has been recorded. Invoice #${inv}.`
          : `Your ${values.type} entry has been recorded.`,
        type: 'success',
      });

      return data;
    } catch (error) {
      setSnackbar({
        visible: true,
        message:
          'Submission Failed: ' +
          (error.message || 'An unknown error occurred.'),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleTriggerCreateParty = name => {
    const needCustomer = type === 'sales' || type === 'receipt';
    const allowed = needCustomer ? canCreateCustomer : canCreateVendor;
    if (!allowed) {
      setSnackbar({
        visible: true,
        message: needCustomer
          ? "You don't have permission to create customers."
          : "You don't have permission to create vendors.",
        type: 'error',
      });
      return;
    }
    setNewEntityName(name);
    setIsPartyDialogOpen(true);
  };

  const handlePartyCreated = newEntity => {
    const entityId = newEntity._id;
    const entityName = newEntity.name || newEntity.vendorName;

    if (['sales', 'receipt'].includes(form.getValues('type'))) {
      setParties(prev => [...(Array.isArray(prev) ? prev : []), newEntity]);
    } else {
      setVendors(prev => [...(Array.isArray(prev) ? prev : []), newEntity]);
    }

    form.setValue('party', entityId, { shouldValidate: true });
    setSnackbar({
      visible: true,
      message: `${entityName} has been added.`,
      type: 'success',
    });
    setIsPartyDialogOpen(false);
  };

  const handleTriggerCreateProduct = name => {
    setNewEntityName(name);
    setIsProductDialogOpen(true);
  };

  const handleProductCreated = newProduct => {
    setProducts(prev => [...prev, newProduct]);

    if (creatingProductForIndex !== null) {
      form.setValue(
        `items.${creatingProductForIndex}.product`,
        newProduct._id,
        { shouldValidate: true, shouldDirty: true },
      );
      form.setValue(`items.${creatingProductForIndex}.itemType`, 'product', {
        shouldValidate: false,
      });

      if (newProduct?.unit) {
        form.setValue(
          `items.${creatingProductForIndex}.unitType`,
          newProduct.unit,
        );
      }
      if (newProduct?.sellingPrice && newProduct.sellingPrice > 0) {
        form.setValue(
          `items.${creatingProductForIndex}.pricePerUnit`,
          newProduct.sellingPrice,
        );
      }
    }
    setCreatingProductForIndex(null);

    setSnackbar({
      visible: true,
      message: `${newProduct.name} has been added.`,
      type: 'success',
    });
    setIsProductDialogOpen(false);
  };

  const handleServiceCreated = newService => {
    setServices(prev => [...prev, newService]);

    if (creatingServiceForIndex !== null) {
      form.setValue(
        `items.${creatingServiceForIndex}.service`,
        newService._id,
        { shouldValidate: true, shouldDirty: true },
      );
      form.setValue(`items.${creatingServiceForIndex}.itemType`, 'service', {
        shouldValidate: false,
      });

      const amt = Number(newService.amount || 0);
      form.setValue(`items.${creatingServiceForIndex}.amount`, amt, {
        shouldValidate: true,
        shouldDirty: true,
      });

      setLastEditedField(prev => ({
        ...prev,
        [creatingServiceForIndex]: 'amount',
      }));
    }
    setCreatingServiceForIndex(null);

    setSnackbar({
      visible: true,
      message: `${newService.serviceName} has been added.`,
      type: 'success',
    });
    setIsServiceDialogOpen(false);
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

      setSnackbar({
        visible: true,
        message: 'The unit has been removed successfully.',
        type: 'success',
      });
    } catch (error) {
      setSnackbar({
        visible: true,
        message: 'Delete Failed: ' + (error.message || 'Something went wrong.'),
        type: 'error',
      });
    }
  };

  const handleHSNSelect = async (hsnCode, index) => {
    const productId = form.watch(`items.${index}.product`);
    if (!productId) return;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hsn: hsnCode.code }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update product HSN');
      }

      setProducts(prev =>
        prev.map(p => (p._id === productId ? { ...p, hsn: hsnCode.code } : p)),
      );

      setSnackbar({
        visible: true,
        message: `HSN ${hsnCode.code} saved to product.`,
        type: 'success',
      });
    } catch (error) {
      setSnackbar({
        visible: true,
        message:
          'Update Failed: ' +
          (error.message || 'Failed to save HSN to product.'),
        type: 'error',
      });
    }
  };

  const handleSACSelect = async (sacCode, index) => {
    const serviceId = form.watch(`items.${index}.service`);
    if (!serviceId) return;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const res = await fetch(`${BASE_URL}/api/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sac: sacCode.code }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update service SAC');
      }

      setServices(prev =>
        prev.map(s => (s._id === serviceId ? { ...s, sac: sacCode.code } : s)),
      );

      setSnackbar({
        visible: true,
        message: `SAC ${sacCode.code} saved to service.`,
        type: 'success',
      });
    } catch (error) {
      setSnackbar({
        visible: true,
        message:
          'Update Failed: ' +
          (error.message || 'Failed to save SAC to service.'),
        type: 'error',
      });
    }
  };

  const handleEmailInvoice = async () => {
    if (!generatedInvoice) return;

    try {
      let transactionToUse = generatedInvoice;
      if (!isTransactionSaved) {
        const result = await onSubmit(form.getValues(), false);
        if (result && result.entry) {
          const savedTransaction = result.entry;
          setSavedTransactionData(savedTransaction);
          setIsTransactionSaved(true);
          transactionToUse = savedTransaction;

          const updatedPreview = {
            ...savedTransaction,
            company: companies.find(
              c =>
                c._id ===
                (savedTransaction.company?._id || savedTransaction.company),
            ),
            party: parties.find(
              p =>
                p._id ===
                (savedTransaction.party?._id || savedTransaction.party),
            ),
          };
          setGeneratedInvoice(updatedPreview);
          transactionToUse = updatedPreview;
        }
      } else {
        transactionToUse = savedTransactionData || generatedInvoice;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const companyDoc = companies.find(
        c =>
          c._id === (transactionToUse.company?._id || transactionToUse.company),
      );
      const partyDoc = parties.find(
        p => p._id === (transactionToUse.party?._id || transactionToUse.party),
      );

      if (!companyDoc || !partyDoc) {
        throw new Error('Company or party data not found');
      }

      if (!partyDoc.email) {
        setEmailDialogTitle('❌ No Email Found');
        setEmailDialogMessage(
          'The selected customer does not have an email address. Please add an email for this customer.',
        );
        setIsEmailDialogOpen(true);
        return;
      }

      const enrichedTransaction = enrichTransactionWithNames(
        transactionToUse,
        products,
        services,
      );

      const templateRes = await fetch(
        `${BASE_URL}/api/settings/default-template`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const templateData = await templateRes.json();
      const selectedTemplate = templateData.defaultTemplate || 'template1';

      const pdfDoc = await generatePdfByTemplate(
        selectedTemplate,
        enrichedTransaction,
        companyDoc,
        partyDoc,
        serviceNameById,
        generatedInvoice.shippingAddress,
        generatedInvoice.bank,
      );

      const pdfInstance = await pdfDoc;
      const pdfBase64 = await pdfInstanceToBase64(pdfInstance);

      const subject = `Invoice From ${
        companyDoc?.businessName ?? 'Your Company'
      }`;
      const bodyHtml = buildInvoiceEmailHTML({
        companyName: companyDoc?.businessName ?? 'Your Company',
        partyName: partyDoc?.name ?? 'Customer',
        supportEmail: companyDoc?.emailId ?? '',
        supportPhone: companyDoc?.mobileNumber ?? '',
      });

      const fileName = `${
        transactionToUse.invoiceNumber ??
        transactionToUse.referenceNumber ??
        'invoice'
      }.pdf`;

      const emailRes = await fetch(
        `${BASE_URL}/api/integrations/gmail/send-invoice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: partyDoc.email,
            subject,
            html: bodyHtml,
            fileName,
            pdfBase64,
            companyId: companyDoc._id,
            sendAs: 'companyOwner',
          }),
        },
      );

      if (!emailRes.ok) {
        const eData = await emailRes.json().catch(() => ({}));
        throw new Error(eData.message || 'Failed to send invoice email.');
      }

      setEmailDialogTitle('✅ Invoice Sent');
      setEmailDialogMessage(`Sent to ${partyDoc.email}`);
      setIsEmailDialogOpen(true);
    } catch (error) {
      // Check if it's a Gmail connection error
      if (
        error.message?.includes('Gmail is not connected') ||
        error.message?.includes('Gmail not connected') ||
        error.message?.includes('not connected for the company sender')
      ) {
        // Show specific Gmail connection error with guidance
        setEmailDialogTitle('Gmail Not Connected');
        setEmailDialogMessage(
          'Gmail is not connected. Please connect Gmail in Settings → Integrations to send emails.',
        );
        setIsEmailDialogOpen(true);

        // Optional: You can also show an alert for more prominent notification
        Alert.alert(
          'Gmail Not Connected',
          'To send emails directly from the app, you need to connect your Gmail account first.\n\nPlease go to Settings → Integrations and connect your Gmail account.',
          [
            {
              text: 'Open Settings',
              onPress: () => {
                // Navigate to settings screen
                // navigation.navigate('Settings', { screen: 'Integrations' });
                // Or open settings URL if available
                Linking.openURL('app-settings:').catch(() => {});
              },
            },
            { text: 'OK', style: 'cancel' },
          ],
        );
      } else if (
        error.message?.includes('No customer email') ||
        error.message?.includes('does not have an email address')
      ) {
        // Handle missing customer email
        setEmailDialogTitle('❌ No Email Found');
        setEmailDialogMessage(
          'Customer email not found. Please add an email address for this customer.',
        );
        setIsEmailDialogOpen(true);
      } else {
        console.error('Email send error:', error);
        setEmailDialogTitle('❌ Send Failed');
        setEmailDialogMessage(
          'Email failed: ' + (error.message || 'Failed to send invoice email'),
        );
        setIsEmailDialogOpen(true);
      }
    }
  };

  const handleDownloadInvoice = async () => {
    if (!generatedInvoice) return;

    try {
      let transactionToUse = generatedInvoice;

      if (!isTransactionSaved) {
        const result = await onSubmit(form.getValues(), false);
        if (result && result.entry) {
          const savedTransaction = result.entry;
          setSavedTransactionData(savedTransaction);
          setIsTransactionSaved(true);
          transactionToUse = savedTransaction;
        }
      } else {
        transactionToUse = savedTransactionData || generatedInvoice;
      }

      const companyDoc = companies.find(
        c =>
          c._id === (transactionToUse.company?._id || transactionToUse.company),
      );
      const partyDoc = parties.find(
        p => p._id === (transactionToUse.party?._id || transactionToUse.party),
      );

      if (!companyDoc || !partyDoc) {
        throw new Error('Company or party data not found');
      }

      const enrichedTransaction = enrichTransactionWithNames(
        transactionToUse,
        products,
        services,
      );

      const token = await AsyncStorage.getItem('token');
      const templateRes = await fetch(
        `${BASE_URL}/api/settings/default-template`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const templateData = await templateRes.json();
      const selectedTemplate = templateData.defaultTemplate || 'template1';

      const pdfDoc = await generatePdfByTemplate(
        selectedTemplate,
        enrichedTransaction,
        companyDoc,
        partyDoc,
        serviceNameById,
        generatedInvoice.shippingAddress,
        generatedInvoice.bank,
      );

      const pdfInstance = await pdfDoc;
      const pdfBase64 = await pdfInstanceToBase64(pdfInstance);

      if (!pdfBase64 || typeof pdfBase64 !== 'string') {
        throw new Error('Invalid PDF data generated');
      }

      const invoiceNumber =
        transactionToUse.invoiceNumber || transactionToUse.referenceNumber;
      const fname = `Invoice-${
        invoiceNumber ||
        (transactionToUse._id ?? 'INV').toString().slice(-6).toUpperCase()
      }.pdf`;

      // Save to app's document directory
      const appFilePath = `${RNFS.DocumentDirectoryPath}/${fname}`;
      await RNFS.writeFile(appFilePath, pdfBase64, 'base64');

      const appFileExists = await RNFS.exists(appFilePath);
      if (!appFileExists) {
        throw new Error('Failed to save PDF to app storage');
      }

      let downloadsFilePath = '';
      let copiedToDownloads = false;

      // Try to copy to Downloads folder for easier access
      if (Platform.OS === 'android') {
        try {
          downloadsFilePath = `${RNFS.DownloadDirectoryPath}/${fname}`;
          await RNFS.copyFile(appFilePath, downloadsFilePath);
          const downloadsFileExists = await RNFS.exists(downloadsFilePath);
          copiedToDownloads = downloadsFileExists;
        } catch (copyError) {
          copiedToDownloads = false;
        }
      }

      // Show success message with file location
      let successMessage;
      if (copiedToDownloads) {
        successMessage = `Invoice ${invoiceNumber} saved to Downloads folder and app storage`;
      } else {
        successMessage = `Invoice ${invoiceNumber} saved to app storage. Use a file manager to access it.`;
      }

      setSnackbar({
        visible: true,
        message: successMessage,
        type: 'success',
      });

      // Optional: Show an alert with more details
      Alert.alert(
        'Invoice Saved Successfully',
        `Invoice ${invoiceNumber} has been saved as ${fname}\n\n` +
          (copiedToDownloads
            ? `Location: Downloads folder\nPath: ${downloadsFilePath}`
            : `Location: App storage\nPath: ${appFilePath}`),
        [
          { text: 'OK', style: 'default' },
          // Only show "Open File" option if we have a reliable way to open it
          ...(Platform.OS === 'ios'
            ? [
                {
                  text: 'Open File',
                  onPress: () => openFileWithFallback(appFilePath),
                },
              ]
            : []),
        ],
      );
    } catch (error) {
      console.error('🔴 Download failed:', error);
      setSnackbar({
        visible: true,
        message: `Download failed: ${
          error.message || 'Failed to download invoice'
        }`,
        type: 'error',
      });
    }
  };

  // Helper function to try opening files (works better on iOS)
  const openFileWithFallback = async filePath => {
    try {
      const fileUri = Platform.OS === 'ios' ? `file://${filePath}` : filePath;
      await FileViewer.open(fileUri, {
        showOpenWithDialog: true,
        showAppsSuggestions: true,
      });
    } catch (error) {
      // On failure, just show the success message again
      setSnackbar({
        visible: true,
        message:
          'File saved successfully. Use your device file manager to open it.',
        type: 'info',
      });
    }
  };

  const handlePrintInvoice = async () => {
    if (!generatedInvoice) return;

    try {
      let transactionToUse = generatedInvoice;

      if (!isTransactionSaved) {
        const result = await onSubmit(form.getValues(), false);
        if (result && result.entry) {
          const savedTransaction = result.entry;
          setSavedTransactionData(savedTransaction);
          setIsTransactionSaved(true);
          transactionToUse = savedTransaction;
        }
      } else {
        transactionToUse = savedTransactionData || generatedInvoice;
      }

      const companyDoc = companies.find(
        c =>
          c._id === (transactionToUse.company?._id || transactionToUse.company),
      );
      const partyDoc = parties.find(
        p => p._id === (transactionToUse.party?._id || transactionToUse.party),
      );

      if (!companyDoc || !partyDoc) {
        throw new Error('Company or party data not found');
      }

      const enrichedTransaction = enrichTransactionWithNames(
        transactionToUse,
        products,
        services,
      );

      const token = await AsyncStorage.getItem('token');
      const templateRes = await fetch(
        `${BASE_URL}/api/settings/default-template`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const templateData = await templateRes.json();
      const selectedTemplate = templateData.defaultTemplate || 'template1';

      const pdfDoc = await generatePdfByTemplate(
        selectedTemplate,
        enrichedTransaction,
        companyDoc,
        partyDoc,
        serviceNameById,
        generatedInvoice.shippingAddress,
        generatedInvoice.bank,
      );

      const pdfInstance = await pdfDoc;
      const pdfBase64 = await pdfInstanceToBase64(pdfInstance);

      if (!pdfBase64 || typeof pdfBase64 !== 'string') {
        throw new Error('Invalid PDF data generated');
      }

      const invoiceNumber =
        transactionToUse.invoiceNumber || transactionToUse.referenceNumber;
      const fname = `Invoice-${
        invoiceNumber ||
        (transactionToUse._id ?? 'INV').toString().slice(-6).toUpperCase()
      }.pdf`;

      // Save file
      const appFilePath = `${RNFS.DocumentDirectoryPath}/${fname}`;
      await RNFS.writeFile(appFilePath, pdfBase64, 'base64');

      let downloadsFilePath = '';
      let copiedToDownloads = false;

      if (Platform.OS === 'android') {
        try {
          downloadsFilePath = `${RNFS.DownloadDirectoryPath}/${fname}`;
          await RNFS.copyFile(appFilePath, downloadsFilePath);
          copiedToDownloads = await RNFS.exists(downloadsFilePath);
        } catch (copyError) {}
      }

      setSnackbar({
        visible: true,
        message: `Invoice ${invoiceNumber} saved and ready for printing. ${
          copiedToDownloads
            ? 'File is in Downloads folder.'
            : 'Use a file manager to access the file.'
        }`,
        type: 'success',
      });

      // Show instructions for printing
      Alert.alert(
        'Ready for Printing',
        `Invoice ${invoiceNumber} has been saved as ${fname}\n\nTo print:\n1. Open your device's file manager\n2. Navigate to ${
          copiedToDownloads ? 'Downloads folder' : 'App storage'
        }\n3. Open the PDF file\n4. Use the print option from your PDF viewer`,
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Show File Location',
            onPress: () => {
              setSnackbar({
                visible: true,
                message: `File location: ${
                  copiedToDownloads ? downloadsFilePath : appFilePath
                }`,
                type: 'info',
              });
            },
          },
        ],
      );
    } catch (error) {
      console.error('Print failed:', error);
      setSnackbar({
        visible: true,
        message: `Print failed: ${
          error.message || 'Failed to generate invoice for printing'
        }`,
        type: 'error',
      });
    }
  };

  const handleWhatsAppInvoice = () => {
    if (!generatedInvoice) {
      setSnackbar({
        visible: true,
        message: 'Please create the transaction first to generate an invoice.',
        type: 'error',
      });
      return;
    }

    setWhatsappComposerOpen(true);
  };

  // Invoice Template Renderer: generate PDF, write to RNFS cache, render using react-native-pdf
  const InvoiceTemplateRenderer = ({ invoiceData }) => {
    const [source, setSource] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const tempFileRef = useRef(null);

    useEffect(() => {
      let mounted = true;

      const generatePreview = async () => {
        if (!invoiceData) return;

        try {
          setLoading(true);
          setError(null);

          const companyDoc = invoiceData.company;
          const partyDoc = invoiceData.party;

          if (!companyDoc || !partyDoc) {
            throw new Error('Company or party data is missing');
          }

          const pdfDoc = await generatePdfByTemplate(
            invoiceData.selectedTemplate || 'template1',
            invoiceData,
            companyDoc,
            partyDoc,
            invoiceData.serviceNameById || new Map(),
            invoiceData.shippingAddress,
            invoiceData.bank,
          );

          // Prefer centralized conversion helper if available
          let base64 = null;
          try {
            base64 = await pdfInstanceToBase64(pdfDoc);
          } catch (e) {
            // fallback to older heuristics
            if (pdfDoc && typeof pdfDoc.output === 'function')
              base64 = pdfDoc.output('base64');
            else if (typeof pdfDoc === 'string') base64 = pdfDoc;
            else if (pdfDoc && pdfDoc.base64) base64 = pdfDoc.base64;
          }

          if (!base64) {
            throw new Error('No PDF data generated');
          }

          const fileName = `invoice_preview_${Date.now()}.pdf`;
          const cachePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

          await RNFS.writeFile(cachePath, base64, 'base64');

          // keep ref to delete later
          tempFileRef.current = cachePath;

          if (!mounted) return;

          const uri =
            Platform.OS === 'android' ? `file://${cachePath}` : cachePath;
          setSource({ uri, cache: true });
        } catch (err) {
          console.error('❌ Error generating preview:', err);
          if (mounted) setError(err.message || 'Failed to generate preview');
        } finally {
          if (mounted) setLoading(false);
        }
      };

      generatePreview();

      return () => {
        mounted = false;
        // try to remove temp file
        (async () => {
          try {
            if (tempFileRef.current) {
              const exists = await RNFS.exists(tempFileRef.current);
              if (exists) await RNFS.unlink(tempFileRef.current);
              tempFileRef.current = null;
            }
          } catch (e) {
            // ignore cleanup errors
          }
        })();
      };
    }, [invoiceData]);

    if (loading) {
      return (
        <View style={styles.previewLoadingContainer}>
          <View style={styles.previewLoadingContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.previewLoadingText}>Generating preview...</Text>
          </View>
        </View>
      );
    }

    if (error || !source) {
      return (
        <View style={styles.previewErrorContainer}>
          <Text style={styles.previewErrorText}>
            {error || 'Failed to load invoice preview'}
          </Text>
          <Text style={styles.previewSubText}>
            PDF cannot be displayed in preview. Use download or share options.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.previewContainer}>
        <Pdf
          source={source}
          style={styles.webview}
          onLoadComplete={(numberOfPages, filePath) => {}}
          onError={err => {
            console.error('❌ Pdf render error:', err);
            setError(err?.message || 'PDF render failed');
          }}
          onPageChanged={(page, numberOfPages) => {}}
        />
      </View>
    );
  };

  const paymentMethod = useWatch({
    control: form.control,
    name: 'paymentMethod',
  });

  const getPartyOptions = () => {
    if (type === 'sales' || type === 'receipt') {
      const source = parties;

      const nameCount = source.reduce((acc, p) => {
        const name = p.name || '';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});

      return source.map(p => {
        const name = p.name || '';
        const hasDuplicates = nameCount[name] > 1;
        const label = hasDuplicates
          ? `${name} (${p.contactNumber || ''})`
          : name;
        return {
          label: String(label),
          value: p._id,
        };
      });
    }

    if (type === 'purchases' || type === 'payment') {
      const nameCount = vendors.reduce((acc, v) => {
        const name = v.vendorName || '';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});

      return vendors.map(v => {
        const name = v.vendorName || '';
        const hasDuplicates = nameCount[name] > 1;
        const label = hasDuplicates
          ? `${name} (${v.contactNumber || ''})`
          : name;
        return {
          label: String(label),
          value: v._id,
        };
      });
    }

    return [];
  };

  const getPartyLabel = () => {
    switch (type) {
      case 'sales':
        return 'Customer Name';
      case 'purchases':
        return 'Vendor Name';
      case 'receipt':
        return 'Received From';
      case 'payment':
        return 'Paid To';
      default:
        return 'Party';
    }
  };

  const productOptions = products.map(p => {
    const stockNum = Number(p.stocks ?? p.stock ?? 0);

    let stockLabel;
    if (stockNum > 0) {
      stockLabel = `${stockNum} in stock`;
    } else if (stockNum < 0) {
      stockLabel = `${stockNum} in stock`;
    } else {
      stockLabel = 'Out of stock';
    }

    return {
      label: `${p.name} (${stockLabel})`,
      value: p._id,
    };
  });

  const serviceOptions = services.map(s => ({
    value: s._id,
    label: s.serviceName,
  }));

  const companyOptions = companies.map(c => ({
    label: c.businessName || c.name || 'Unknown Company',
    value: c._id,
  }));

  const bankOptions = banks.map(b => ({
    label: `${b.bankName} - ${b.accountNumber}`,
    value: b._id,
  }));

  const expenseOptions = paymentExpenses.map(e => ({
    label: e.name || 'Unknown Expense',
    value: e._id,
  }));

  const paymentMethodOptions = paymentMethods.map(method => ({
    label: method,
    value: method,
  }));

  const paymentMethodReceiptOptions = paymentMethodsForReceipt.map(method => ({
    label: method,
    value: method,
  }));

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading form data...</Text>
        </View>
      </View>
    );
  }

  const hasAnyTxnCreate =
    canSales || canPurchases || canReceipt || canPayment || canJournal;
  const hasAnyEntityCreate =
    canCreateCustomer || canCreateVendor || canCreateInventory;
  const canOpenForm = isSuper || !!transactionToEdit || hasAnyTxnCreate;

  if (!canOpenForm) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Card style={styles.accessDeniedCard}>
          <View style={styles.cardContent}>
            <Text variant="titleLarge">Access denied</Text>
            <Text variant="bodyMedium" style={styles.accessDeniedText}>
              Your admin hasn't granted you the permissions required to create
              transactions here.
            </Text>
            {!hasAnyTxnCreate && (
              <Text variant="bodySmall">
                • You lack permission to create
                Sales/Purchases/Receipt/Payment/Journal.
              </Text>
            )}
            {!hasAnyEntityCreate && (
              <Text variant="bodySmall">
                • You lack permission to create Customers, Vendors, or Inventory
                (Products/Services).
              </Text>
            )}
            <Text variant="bodyMedium" style={styles.accessDeniedText}>
              Please contact your administrator.
            </Text>
          </View>
        </Card>
      </View>
    );
  }

  if (!transactionToEdit && !isSuper && allowedTypes.length === 0) {
    return (
      <View style={styles.noPermissionsContainer}>
        <Text variant="headlineSmall">No permissions</Text>
        <Text variant="bodyMedium">
          You don't have access to create any transactions. Please contact your
          administrator.
        </Text>
      </View>
    );
  }

  const handleAddressSaved = updatedAddress => {
    setShippingAddresses(prev =>
      prev.map(addr =>
        addr._id === updatedAddress._id ? updatedAddress : addr,
      ),
    );

    const currentShippingAddress = form.getValues('shippingAddress');
    if (currentShippingAddress === updatedAddress._id) {
      form.setValue('shippingAddressDetails', {
        label: updatedAddress.label || '',
        address: updatedAddress.address || '',
        city: updatedAddress.city || '',
        state: updatedAddress.state || '',
        pincode: updatedAddress.pincode || '',
        contactNumber: updatedAddress.contactNumber || '',
      });
    }

    setSnackbar({
      visible: true,
      message: 'Shipping address has been updated successfully.',
      type: 'success',
    });
  };

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 140 }}
        extraHeight={100}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
      >
        <FormTabs
          type={type}
          onTypeChange={newType => {
            Keyboard.dismiss();
            form.setValue('type', newType, { shouldValidate: true });
          }}
          canSales={canSales}
          canPurchases={canPurchases}
          canReceipt={canReceipt}
          canPayment={canPayment}
          canJournal={canJournal}
          form={form}
          registerField={registerField}
          companies={companies}
          renderSalesPurchasesFields={SalesPurchasesFields}
          salesPurchasesProps={{
            form,
            type,
            registerField,
            companies,
            partyOptions: getPartyOptions(),
            partyLabel: getPartyLabel(),
            partyCreatable,
            partyBalance,
            vendorBalance,
            paymentMethods,
            banks,
            selectedCompanyIdWatch,
            gstEnabled,
            handlePartyChangeWrapper,
            handleTriggerCreateParty,
            paymentMethod: form.watch('paymentMethod'),
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
            hsnOptions,
            sacOptions,
            handleHsnChange,
            handleSacChange,
            // Dropdown props
            partyDropdownOpen,
            setPartyDropdownOpen,
            companyDropdownOpen,
            setCompanyDropdownOpen,
            productDropdownOpen,
            setProductDropdownOpen,
            serviceDropdownOpen,
            setServiceDropdownOpen,
            bankDropdownOpen,
            setBankDropdownOpen,
            stateDropdownOpen,
            setStateDropdownOpen,
            cityDropdownOpen,
            setCityDropdownOpen,
            companyOptions,
            bankOptions,
            paymentMethodOptions,
            canCreateInventory,
            canCreateProducts,
            canCreateCustomer,
            canCreateVendor,
          }}
          renderReceiptPaymentFields={ReceiptPaymentFields}
          receiptPaymentProps={{
            form,
            type,
            companies,
            partyOptions: getPartyOptions(),
            partyLabel: getPartyLabel(),
            partyCreatable,
            partyBalance,
            vendorBalance,
            handlePartyChangeWrapper,
            handleTriggerCreateParty,
            paymentExpenses,
            setPaymentExpenses,
            paymentMethodsForReceipt,
            transactionToEdit,
            registerField,
            // Dropdown props
            partyDropdownOpen,
            setPartyDropdownOpen,
            companyDropdownOpen,
            setCompanyDropdownOpen,
            expenseDropdownOpen,
            setExpenseDropdownOpen,
            paymentMethodDropdownOpen,
            setPaymentMethodDropdownOpen,
            companyOptions,
            expenseOptions,
            paymentMethodReceiptOptions,
            canCreateInventory,
            canCreateProducts,
            canCreateCustomer,
            canCreateVendor,
          }}
        />
      </KeyboardAwareScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.stickySubmitContainer}>
          <Button
            mode="contained"
            onPress={form.handleSubmit(async data => {
              await handleCreateTransactionWithPreview({
                form,
                setIsSubmitting,
                onSubmit,
                setSavedTransactionData,
                setIsTransactionSaved,
                setGeneratedInvoice,
                setInvoicePreviewOpen,
                companies,
                parties,
                banks,
                shippingAddresses,
                BASE_URL,
              });
            })}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.submitButton}
          >
            {transactionToEdit ? 'Save Changes' : 'Create Transaction'}
          </Button>
        </View>
      </KeyboardAvoidingView>

      <Dialog
        visible={isPartyDialogOpen}
        onDismiss={() => setIsPartyDialogOpen(false)}
        style={styles.dialog}
      >
        <View style={styles.modalHeader}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.modalTitle}>
              Create New{' '}
              {['sales', 'receipt'].includes(type) ? 'Customer' : 'Vendor'}
            </Text>
            <Text style={styles.modalSubTitle}>
              {['sales', 'receipt'].includes(type)
                ? 'Add a customer to this transaction'
                : 'Add a vendor to this transaction'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setIsPartyDialogOpen(false)}>
            <Text style={styles.modalCloseIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <Dialog.Content>
          <View style={{ flex: 1 }}>
            {type === 'sales' || type === 'receipt' ? (
              <CustomerForm
                initialName={newEntityName}
                onSuccess={handlePartyCreated}
                onCancel={() => setIsPartyDialogOpen(false)}
                hideHeader={true}
              />
            ) : (
              <VendorForm
                initialName={newEntityName}
                onSuccess={handlePartyCreated}
                onClose={() => setIsPartyDialogOpen(false)}
                hideHeader={true}
              />
            )}
          </View>
        </Dialog.Content>
      </Dialog>

      <Dialog
        visible={isProductDialogOpen}
        onDismiss={() => setIsProductDialogOpen(false)}
        style={styles.dialog}
      >
        <View style={styles.modalHeader}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.modalTitle}>Create New Product</Text>
            <Text style={styles.modalSubTitle}>
              Add a product to use in this transaction
            </Text>
          </View>
          <TouchableOpacity onPress={() => setIsProductDialogOpen(false)}>
            <Text style={styles.modalCloseIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <Dialog.Content>
          <View style={{ flex: 1 }}>
            <ProductForm
              productType={'product'}
              onSuccess={handleProductCreated}
              initialName={newEntityName}
              onClose={() => setIsProductDialogOpen(false)}
              hideHeader={true}
            />
          </View>
        </Dialog.Content>
      </Dialog>

      <Dialog
        visible={isServiceDialogOpen}
        onDismiss={() => setIsServiceDialogOpen(false)}
        style={styles.dialog}
      >
        <View style={styles.modalHeader}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.modalTitle}>Create New Service</Text>
            <Text style={styles.modalSubTitle}>
              Add a service to use in this transaction
            </Text>
          </View>
          <TouchableOpacity onPress={() => setIsServiceDialogOpen(false)}>
            <Text style={styles.modalCloseIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <Dialog.Content>
          <View style={{ flex: 1 }}>
            <ServiceForm
              onSuccess={handleServiceCreated}
              service={undefined}
              initialName={newEntityName}
              onClose={() => setIsServiceDialogOpen(false)}
            />
          </View>
        </Dialog.Content>
      </Dialog>

      <Dialog
        visible={isEditShippingAddressDialogOpen}
        onDismiss={() => setIsEditShippingAddressDialogOpen(false)}
        style={styles.dialog}
      >
        <Dialog.Title>Edit Shipping Address</Dialog.Title>
        <Dialog.Content>
          <View style={styles.editAddressForm}>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.label}>Address Label</Text>
                <TextInput
                  placeholder="e.g., Home, Office, Warehouse"
                  value={editAddressForm.label}
                  onChangeText={text =>
                    setEditAddressForm(prev => ({
                      ...prev,
                      label: text,
                    }))
                  }
                  style={styles.input}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.label}>Contact Number</Text>
                <TextInput
                  placeholder="Contact number"
                  value={editAddressForm.contactNumber}
                  onChangeText={text =>
                    setEditAddressForm(prev => ({
                      ...prev,
                      contactNumber: text,
                    }))
                  }
                  style={styles.input}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                placeholder="Full address"
                value={editAddressForm.address}
                onChangeText={text =>
                  setEditAddressForm(prev => ({
                    ...prev,
                    address: text,
                  }))
                }
                multiline
                numberOfLines={3}
                style={styles.textArea}
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.label}>State</Text>
                <DropDownPicker
                  open={stateDropdownOpen}
                  value={
                    shippingStateOptions.find(
                      o =>
                        o.label.toLowerCase() ===
                        editAddressForm.state.toLowerCase(),
                    )?.value ?? ''
                  }
                  items={shippingStateOptions}
                  setOpen={setStateDropdownOpen}
                  onSelectItem={item => {
                    const selected = indiaStates.find(
                      s => s.isoCode === item.value,
                    );
                    setEditAddressForm(prev => ({
                      ...prev,
                      state: selected?.name || '',
                      city: '',
                    }));
                  }}
                  placeholder="Select state"
                  style={styles.dropdown}
                  textStyle={styles.dropdownText}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.label}>City</Text>
                <DropDownPicker
                  open={cityDropdownOpen}
                  value={
                    shippingCityOptions.find(
                      o =>
                        o.label.toLowerCase() ===
                        editAddressForm.city.toLowerCase(),
                    )?.value ?? ''
                  }
                  items={shippingCityOptions}
                  setOpen={setCityDropdownOpen}
                  onSelectItem={item => {
                    setEditAddressForm(prev => ({
                      ...prev,
                      city: item.label,
                    }));
                  }}
                  placeholder={
                    editAddressForm.state
                      ? 'Select city'
                      : 'Select a state first'
                  }
                  disabled={
                    !editAddressForm.state || shippingCityOptions.length === 0
                  }
                  style={styles.dropdown}
                  textStyle={styles.dropdownText}
                />
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput
                placeholder="Pincode"
                value={editAddressForm.pincode}
                onChangeText={text =>
                  setEditAddressForm(prev => ({
                    ...prev,
                    pincode: text,
                  }))
                }
                style={styles.input}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.dialogActions}>
            <Button
              mode="outlined"
              onPress={() => setIsEditShippingAddressDialogOpen(false)}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={async () => {
                try {
                  const token = await AsyncStorage.getItem('token');
                  if (!token)
                    throw new Error('Authentication token not found.');

                  const updatedAddress = {
                    ...editingShippingAddress,
                    ...editAddressForm,
                  };

                  const res = await fetch(
                    `${BASE_URL}/api/shipping-addresses/${editingShippingAddress._id}`,
                    {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify(updatedAddress),
                    },
                  );

                  if (res.ok) {
                    const data = await res.json();
                    handleAddressSaved(data.shippingAddress);
                    setIsEditShippingAddressDialogOpen(false);
                  } else {
                    throw new Error('Failed to update shipping address');
                  }
                } catch (error) {
                  console.error('Error updating shipping address:', error);
                  setSnackbar({
                    visible: true,
                    message: 'Failed to update shipping address.',
                    type: 'error',
                  });
                }
              }}
            >
              Save Changes
            </Button>
          </View>
        </Dialog.Content>
      </Dialog>

      {/* Invoice Preview Modal */}
      <Modal
        visible={invoicePreviewOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handlePreviewClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="headlineSmall">Invoice Preview</Text>
            <IconButton icon="✕" size={24} onPress={handlePreviewClose} />
          </View>

          <InvoiceTemplateRenderer invoiceData={generatedInvoice} />

          <View style={styles.modalActions}>
            <IconAction
              iconName="whatsapp"
              label="WhatsApp"
              onPress={handleWhatsAppInvoice}
            />
            <IconAction
              iconName="download"
              label="Download"
              onPress={handleDownloadInvoice}
            />
            <IconAction
              iconName="email"
              label="Email"
              onPress={async () => {
                setIsPreviewProcessing(true);
                setPreviewCurrentAction('Email');
                try {
                  await handleEmailInvoice();
                } catch (err) {
                  console.error('Email action error:', err);
                } finally {
                  setIsPreviewProcessing(false);
                  setPreviewCurrentAction(null);
                }
              }}
            />
            <IconAction
              iconName="printer"
              label="Print"
              onPress={handlePrintInvoice}
            />
          </View>
        </View>
      </Modal>

      {/* Email Status Dialog */}
      <Modal
        visible={isEmailDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEmailDialogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.emailDialogContainer}>
            <View style={styles.emailDialogContent}>
              <Text style={styles.emailDialogTitle}>{emailDialogTitle}</Text>
              <Text style={styles.emailDialogMessage}>
                {emailDialogMessage}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.emailDialogButton}
              onPress={() => setIsEmailDialogOpen(false)}
            >
              <Text style={styles.emailDialogButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* WhatsApp Composer Dialog */}
      <WhatsAppComposerDialog
        isOpen={whatsappComposerOpen}
        onClose={() => setWhatsappComposerOpen(false)}
        transaction={generatedInvoice}
        party={generatedInvoice?.party}
        company={generatedInvoice?.company}
        products={products}
        services={services}
        onGeneratePdf={async (transaction, party, company) => {
          const { generatePdfForTemplate1 } = await import(
            '../../lib/pdf-template1.js'
          );
          return await generatePdfForTemplate1(
            transaction,
            company,
            party,
            serviceNameById,
          );
        }}
        serviceNameById={serviceNameById}
      />

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar(prev => ({ ...prev, visible: false }))}
        duration={3000}
        style={[
          styles.snackbar,
          snackbar.type === 'error' && styles.snackbarError,
          snackbar.type === 'success' && styles.snackbarSuccess,
        ]}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingContent: {
    alignItems: 'center',
    marginTop: 150,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  accessDeniedContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  accessDeniedCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    padding: 0,
  },
  accessDeniedText: {
    marginVertical: 8,
    color: '#666',
  },
  noPermissionsContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  submitButtonContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    paddingVertical: 8,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 0,
    width: '90%',
    height: '80%',
  },
  dialogTitle: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stickySubmitContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  dialogContent: {
    padding: 16,
    flex: 1,
    minHeight: 0,
  },
  editAddressForm: {
    gap: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formField: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
  },
  textArea: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dropdown: {
    backgroundColor: 'white',
    borderColor: '#ddd',
  },
  dropdownText: {
    fontSize: 14,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  cancelButton: {
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexWrap: 'nowrap',
  },
  modalHeaderTitle: {
    flex: 1,
    paddingRight: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 0,
    paddingBottom: 0,
    lineHeight: 22,
  },
  modalSubTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 0,
    paddingTop: 0,
    lineHeight: 18,
  },
  modalCloseIcon: {
    fontSize: 20,
    color: '#6B7280',
    padding: 8,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 110,
  },
  actionButton: {
    flex: 1,
  },
  iconActionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  iconActionLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#111827',
    textAlign: 'center',
  },
  previewLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  previewLoadingContent: {
    alignItems: 'center',
    marginTop: 150,
  },
  previewLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  previewErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  previewErrorText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    color: '#666',
  },
  retryButton: {
    marginTop: 8,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  snackbar: {
    backgroundColor: '#2c2c2c',
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  snackbarText: {
    color: '#fff',
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  snackbarCloseButton: {
    padding: 6,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snackbarError: {
    backgroundColor: '#c62828',
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  snackbarSuccess: {
    backgroundColor: '#2e7d32',
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  // Email Dialog Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailDialogContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  emailDialogContent: {
    marginBottom: 16,
  },
  emailDialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emailDialogMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  emailDialogButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  emailDialogButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  textInputContainer: {
    marginBottom: 16,
  },
  textInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
  },
  textInputError: {
    borderColor: '#d32f2f',
  },
  textInputErrorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  helperTextError: {
    color: '#d32f2f',
  },
  iconButton: {
    padding: 8,
  },
  activityIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
});
