import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomDropdown from '../../components/ui/CustomDropdown';
import HsnSacDropdown from '../ui/HsnSacDropdown.js';
import { Combobox } from '../../components/ui/Combobox';
import QuillEditor from '../../components/ui/QuillEditor';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

// Context
import { useCompany } from '../../contexts/company-context.js';
import { useUserPermissions } from '../../contexts/user-permissions-context';

// Forms
import { CustomerForm } from '../../components/customers/CustomerForm.js';
import ProductForm from '../../components/products/ProductForm.js';
import ServiceForm from '../../components/services/ServiceForm.js';

// Utils
import { BASE_URL } from '../../config.js';
import { sanitizeInput } from '../utils/sanitize.js';

import hsnData from '../../data/HSN.json';
import sacData from '../../data/SAC.json';

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

const STANDARD_GST = 18;
const GST_OPTIONS = [
  { label: '0%', value: '0' },
  { label: '5%', value: '5' },
  { label: 'Standard (18%)', value: '18' },
  { label: '40%', value: '40' },
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
  hsn: '',
  sac: '',
};

const itemSchema = z
  .object({
    itemType: z.enum(['product', 'service']),
    product: z.string().optional(),
    service: z.string().optional(),
    quantity: z.coerce.number().optional(),
    unitType: z.string().optional(),
    otherUnit: z.string().optional(),
    pricePerUnit: z.coerce.number().optional(),
    description: z.string().optional(),
    amount: z.coerce.number(),
    gstPercentage: z.coerce.number().min(0).max(100).optional(),
    lineTax: z.coerce.number().min(0).optional(),
    lineTotal: z.coerce.number().min(0).optional(),
    hsn: z.string().optional(),
    sac: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.itemType === 'product') {
      if (!data.product) {
        ctx.addIssue({
          code: 'custom',
          path: ['product'],
          message: 'Select a product',
        });
      }
      if (!data.quantity || data.quantity <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['quantity'],
          message: 'Quantity must be > 0',
        });
      }
      if (data.itemType === 'product') {
        if (data.pricePerUnit == null || data.pricePerUnit < 0) {
          ctx.addIssue({
            code: 'custom',
            path: ['pricePerUnit'],
            message: 'Price/Unit is required for products and must be ≥ 0',
          });
        }
      }
      if (data.unitType === 'Other' && !data.otherUnit) {
        ctx.addIssue({
          code: 'custom',
          path: ['otherUnit'],
          message: 'Please specify the unit type',
        });
      }
    }
  });

const formSchema = z
  .object({
    type: z.literal('proforma'),
    company: z.string().min(1, 'Please select a company.'),
    party: z.string().optional(),
    date: z.date({ required_error: 'A date is required.' }),
    dueDate: z.date().optional(),
    items: z.array(itemSchema).optional(),
    totalAmount: z.coerce
      .number()
      .positive('Amount must be a positive number.')
      .optional(),
    referenceNumber: z.string().optional(),
    paymentMethod: z.string().optional(),
    taxAmount: z.coerce.number().min(0).optional(),
    invoiceTotal: z.coerce.number().min(0).optional(),
    subTotal: z.coerce.number().min(0).optional(),
    dontSendInvoice: z.boolean().optional(),
    bank: z.string().optional(),
    notes: z.string().optional(),
    sameAsBilling: z.boolean().optional(),
    shippingAddress: z.string().optional(),
    shippingAddressDetails: z
      .object({
        label: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        contactNumber: z.string().optional(),
      })
      .optional(),
  })
  .refine(
    data => {
      return !!data.party;
    },
    {
      message: 'Customer is required for proforma invoice.',
      path: ['party'],
    },
  )
  .refine(
    data => {
      return data.items && data.items.length > 0;
    },
    {
      message: 'At least one item is required for a proforma invoice.',
      path: ['items'],
    },
  );

export default function ProformaForm({
  onFormSubmit,
  serviceNameById,
  transactionToEdit,
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
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [banks, setBanks] = useState([]);
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [partyBalances, setPartyBalances] = useState({});
  const [creatingProductForIndex, setCreatingProductForIndex] = useState(null);
  const [creatingServiceForIndex, setCreatingServiceForIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [existingUnits, setExistingUnits] = useState([]);
  const [unitOpen, setUnitOpen] = useState(false);
  const [originalQuantities, setOriginalQuantities] = useState(new Map());
  const [shippingAddresses, setShippingAddresses] = useState([]);
  const [lastEditedField, setLastEditedField] = useState({});

  const [hsnOptions, setHsnOptions] = useState([]);
  const [sacOptions, setSacOptions] = useState([]);

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

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  const { selectedCompanyId } = useCompany();
  const { permissions: userCaps } = useUserPermissions();

  const paymentMethods = ['Cash', 'Credit', 'UPI', 'Bank Transfer', 'Cheque'];

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      party: '',
      totalAmount: 0,
      items: [PRODUCT_DEFAULT],
      type: 'proforma',
      referenceNumber: '',
      company: selectedCompanyId || '',
      date: new Date(),
      taxAmount: 0,
      invoiceTotal: 0,
      notes: '',
      sameAsBilling: true,
      shippingAddress: '',
      shippingAddressDetails: {
        label: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        contactNumber: '',
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = useWatch({ control: form.control, name: 'items' });
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

  const isSuper = role === 'master' || role === 'client';
  const canSales = isSuper || !!userCaps?.canCreateSaleEntries;
  const canCreateCustomer = isSuper || !!userCaps?.canCreateCustomers;
  const canCreateInventory = isSuper || !!userCaps?.canCreateInventory;
  const canCreateProducts = isSuper || !!userCaps?.canCreateProducts;

  // Populate form with transactionToEdit data
  useEffect(() => {
    if (
      transactionToEdit &&
      transactionToEdit.type === 'proforma' &&
      products.length > 0 &&
      services.length > 0
    ) {
      const tx = transactionToEdit;

      // Build items from products and services
      const items = [];

      // Add products
      if (tx.products && Array.isArray(tx.products)) {
        tx.products.forEach(prod => {
          const productData = products.find(
            p => p._id === (prod.product?._id || prod.product),
          );
          items.push({
            itemType: 'product',
            product: prod.product?._id || prod.product,
            quantity: prod.quantity || 1,
            unitType: prod.unitType || 'Piece',
            otherUnit: prod.otherUnit || '',
            pricePerUnit: prod.pricePerUnit || 0,
            amount: prod.amount || 0,
            gstPercentage: prod.gstPercentage || 18,
            lineTax: prod.lineTax || 0,
            lineTotal: prod.lineTotal || prod.amount || 0,
            description: prod.description || '',
            hsn: productData?.hsn || '',
          });
        });
      }

      // Add services
      if (tx.services && Array.isArray(tx.services)) {
        tx.services.forEach(svc => {
          const serviceData = services.find(
            s => s._id === (svc.service?._id || svc.service),
          );
          items.push({
            itemType: 'service',
            service: svc.service?._id || svc.service,
            amount: svc.amount || 0,
            gstPercentage: svc.gstPercentage || 18,
            lineTax: svc.lineTax || 0,
            lineTotal: svc.lineTotal || svc.amount || 0,
            description: svc.description || '',
            sac: serviceData?.sac || '',
          });
        });
      }

      // If no items, add default
      if (items.length === 0) {
        items.push(PRODUCT_DEFAULT);
      }

      form.reset({
        type: 'proforma',
        company:
          typeof tx.company === 'object' && tx.company !== null
            ? tx.company._id
            : tx.company || selectedCompanyId || '',
        party:
          typeof tx.party === 'object' && tx.party !== null
            ? tx.party._id
            : tx.party || '',
        date: tx.date ? new Date(tx.date) : new Date(),
        dueDate: tx.dueDate ? new Date(tx.dueDate) : undefined,
        items,
        totalAmount: tx.subTotal || tx.totalAmount || 0,
        referenceNumber: tx.referenceNumber || '',
        paymentMethod: tx.paymentMethod || '',
        taxAmount: tx.taxAmount || 0,
        invoiceTotal: tx.invoiceTotal || tx.totalAmount || 0,
        subTotal: tx.subTotal || 0,
        dontSendInvoice: false,
        bank:
          typeof tx.bank === 'object' && tx.bank !== null
            ? tx.bank._id
            : tx.bank || '',
        notes: tx.notes || '',
        sameAsBilling: !tx.shippingAddress,
        shippingAddress:
          typeof tx.shippingAddress === 'object' && tx.shippingAddress !== null
            ? tx.shippingAddress._id
            : tx.shippingAddress || '',
        shippingAddressDetails:
          typeof tx.shippingAddress === 'object' && tx.shippingAddress !== null
            ? {
                label: tx.shippingAddress.label || '',
                address: tx.shippingAddress.address || '',
                city: tx.shippingAddress.city || '',
                state: tx.shippingAddress.state || '',
                pincode: tx.shippingAddress.pincode || '',
                contactNumber: tx.shippingAddress.contactNumber || '',
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
    }
  }, [transactionToEdit, form, selectedCompanyId, products, services]);

  // GST calculation effect
  useEffect(() => {
    if (!watchedItems) return;

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
  }, [watchedItems, gstEnabled, form, lastEditedField]);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const [companiesRes, partiesRes, productsRes, servicesRes] =
        await Promise.all([
          fetch(`${BASE_URL}/api/companies/my`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${BASE_URL}/api/parties`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${BASE_URL}/api/products`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${BASE_URL}/api/services`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      if (
        !companiesRes.ok ||
        !partiesRes.ok ||
        !productsRes.ok ||
        !servicesRes.ok
      ) {
        throw new Error('Failed to fetch initial form data.');
      }

      const companiesData = await companiesRes.json();
      const partiesData = await partiesRes.json();
      const productsData = await productsRes.json();
      const servicesData = await servicesRes.json();

      setCompanies(companiesData);
      setParties(
        Array.isArray(partiesData) ? partiesData : partiesData.parties || [],
      );
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

      if (companiesData.length > 0) {
        form.setValue('company', selectedCompanyId || companiesData[0]._id);
      }
    } catch (error) {
      setSnackbar({
        visible: true,
        message:
          'Failed to load data: ' +
          (error instanceof Error
            ? error.message
            : 'An unknown error occurred.'),
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [form, selectedCompanyId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Fetch banks
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
            (error instanceof Error ? error.message : 'Something went wrong.'),
          type: 'error',
        });
      }
    },
    [BASE_URL],
  );

  useEffect(() => {
    if (selectedCompanyIdWatch) {
      fetchBanks(selectedCompanyIdWatch);
    } else {
      setBanks([]);
    }
  }, [selectedCompanyIdWatch, fetchBanks]);

  // Handle form submission
  const onSubmit = async values => {
    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const method = transactionToEdit ? 'PUT' : 'POST';
      let endpoint = `/api/proforma`;

      if (transactionToEdit) {
        endpoint = `/api/proforma/${transactionToEdit._id}`;
      }

      const productLines =
        values.items
          ?.filter(i => i.itemType === 'product')
          .map(i => ({
            product: i.product,
            quantity: i.quantity,
            unitType: i.unitType,
            otherUnit: sanitizeInput(i.otherUnit),
            pricePerUnit: i.pricePerUnit,
            amount:
              typeof i.amount === 'number'
                ? i.amount
                : Number(i.quantity || 0) * Number(i.pricePerUnit || 0),
            description: sanitizeInput(i.description ?? ''),
            gstPercentage: gstEnabled ? Number(i.gstPercentage ?? 18) : 0,
            lineTax: gstEnabled ? Number(i.lineTax ?? 0) : 0,
            lineTotal: gstEnabled ? Number(i.lineTotal ?? i.amount) : i.amount,
            hsn: i.hsn,
          })) ?? [];

      const serviceLines =
        values.items
          ?.filter(i => i.itemType === 'service')
          .map(i => ({
            service: i.service,
            amount: i.amount,
            description: sanitizeInput(i.description ?? ''),
            gstPercentage: gstEnabled ? Number(i.gstPercentage ?? 18) : 0,
            lineTax: gstEnabled ? Number(i.lineTax ?? 0) : 0,
            lineTotal: gstEnabled ? Number(i.lineTotal ?? i.amount) : i.amount,
            sac: i.sac,
          })) ?? [];

      const uiSubTotal = Number(values.totalAmount ?? 0);
      const uiTax = gstEnabled ? Number(values.taxAmount ?? 0) : 0;
      const uiInvoiceTotal = gstEnabled
        ? Number(values.invoiceTotal ?? uiSubTotal)
        : uiSubTotal;

      // Shipping address logic (same as web)
      let shippingAddressId = null;
      if (values.sameAsBilling) {
        shippingAddressId = null;
      }

      const safeNotes = sanitizeInput(values.notes);
      const safeReferenceNumber = sanitizeInput(values.referenceNumber);

      const payload = {
        type: values.type,
        company: values.company,
        party: values.party,
        date: values.date,
        dueDate: values.dueDate,
        referenceNumber: safeReferenceNumber,
        products: productLines,
        services: serviceLines,
        totalAmount: uiInvoiceTotal,
        subTotal: uiSubTotal,
        taxAmount: uiTax,
        paymentMethod: values.paymentMethod || undefined,
        invoiceTotal: uiInvoiceTotal,
        bank: values.bank || undefined,
        notes: safeNotes || '',
        shippingAddress: shippingAddressId,
      };

      delete payload.items;

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
        throw new Error(data.message || `Failed to submit proforma entry.`);
      }

      const inv = data?.entry?.invoiceNumber;
      setSnackbar({
        visible: true,
        message: transactionToEdit
          ? `Proforma Invoice Updated!`
          : `Proforma Invoice Submitted! ${inv ? `Invoice #${inv}` : ''}`,
        type: 'success',
      });

      onFormSubmit();
    } catch (error) {
      setSnackbar({
        visible: true,
        message:
          'Submission Failed: ' +
          (error instanceof Error
            ? error.message
            : 'An unknown error occurred.'),
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
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

  // Handle customer creation
  const handleCustomerCreated = newCustomer => {
    const entityId = newCustomer._id;
    const entityName = newCustomer.name;

    setParties(prev => [...(Array.isArray(prev) ? prev : []), newCustomer]);
    form.setValue('party', entityId, { shouldValidate: true });

    setSnackbar({
      visible: true,
      message: `${entityName} has been added.`,
      type: 'success',
    });

    setIsPartyDialogOpen(false);
  };

  // Handle product creation
  const handleProductCreated = newProduct => {
    setProducts(prev => [...prev, newProduct]);

    if (creatingProductForIndex !== null) {
      form.setValue(
        `items.${creatingProductForIndex}.product`,
        newProduct._id,
        {
          shouldValidate: true,
          shouldDirty: true,
        },
      );
      form.setValue(`items.${creatingProductForIndex}.itemType`, 'product', {
        shouldValidate: false,
      });
    }
    setCreatingProductForIndex(null);

    setSnackbar({
      visible: true,
      message: `${newProduct.name} has been added.`,
      type: 'success',
    });
    setIsProductDialogOpen(false);
  };

  // Handle service creation
  const handleServiceCreated = newService => {
    setServices(prev => [...prev, newService]);

    if (creatingServiceForIndex !== null) {
      form.setValue(
        `items.${creatingServiceForIndex}.service`,
        newService._id,
        {
          shouldValidate: true,
          shouldDirty: true,
        },
      );
      form.setValue(`items.${creatingServiceForIndex}.itemType`, 'service', {
        shouldValidate: false,
      });
    }
    setCreatingServiceForIndex(null);

    setSnackbar({
      visible: true,
      message: `${newService.serviceName} has been added.`,
      type: 'success',
    });
    setIsServiceDialogOpen(false);
  };

  // Get party options for combobox
  const getPartyOptions = () => {
    const source = parties;
    const nameCount = source.reduce((acc, p) => {
      const name = p.name || '';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    return source.map(p => {
      const name = p.name || '';
      const hasDuplicates = nameCount[name] > 1;
      const label = hasDuplicates ? `${name} (${p.contactNumber || ''})` : name;
      return {
        value: p._id,
        label: String(label),
      };
    });
  };

  const partyOptions = getPartyOptions();
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
    label: c.businessName,
    value: c._id,
  }));

  const renderItemRow = (field, index) => {
    const itemType = form.watch(`items.${index}.itemType`);

    return (
      <View key={field.id} style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle}>
            {itemType === 'product' ? 'Product Item' : 'Service Item'}
          </Text>
          <TouchableOpacity
            onPress={() => remove(index)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.itemContent}>
          {itemType === 'product' && (
            <>
              {/* Product Selection */}
              <View style={styles.formRow}>
                <View style={[styles.formField, { flex: 2 }]}>
                  <Text style={styles.label}>Product</Text>
                  <Combobox
                    options={productOptions}
                    value={form.watch(`items.${index}.product`) || ''}
                    onChange={value => {
                      form.setValue(`items.${index}.product`, value);
                      if (value) {
                        const selectedProduct = products.find(
                          p => p._id === value,
                        );
                        if (selectedProduct) {
                          if (selectedProduct.sellingPrice) {
                            form.setValue(
                              `items.${index}.pricePerUnit`,
                              selectedProduct.sellingPrice,
                            );
                            setLastEditedField(prev => ({
                              ...prev,
                              [index]: 'pricePerUnit',
                            }));
                          }
                          if (selectedProduct.hsn) {
                            form.setValue(
                              `items.${index}.hsn`,
                              selectedProduct.hsn,
                            );
                          } else {
                            form.setValue(`items.${index}.hsn`, '');
                          }
                        }
                      }
                    }}
                    placeholder={
                      transactionToEdit && type === 'purchases'
                        ? 'Select a product...'
                        : 'Select or create a product...'
                    }
                    searchPlaceholder="Search products..."
                    noResultsText="No product found."
                    creatable={canCreateProducts}
                    onCreate={async name => {
                      if (!canCreateProducts) {
                        Toast.show({
                          type: 'error',
                          text1: 'Permission denied',
                          text2:
                            "You don't have permission to create products.",
                        });
                        return '';
                      }
                      setCreatingProductForIndex(index);
                      setNewEntityName(name);
                      setIsProductDialogOpen(true);
                      return '';
                    }}
                    style={
                      form.formState.errors?.items?.[index]?.product
                        ? styles.errorBorder
                        : {}
                    }
                  />
                </View>
              </View>

              {/* Quantity and Unit */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.label}>Quantity</Text>
                  <Controller
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field, fieldState }) => (
                      <>
                        <TextInput
                          style={[
                            styles.input,
                            fieldState.error && styles.inputError,
                          ]}
                          value={field.value?.toString()}
                          onChangeText={text => {
                            const value = text === '' ? '' : Number(text);
                            field.onChange(value);
                            setLastEditedField(prev => ({
                              ...prev,
                              [index]: 'quantity',
                            }));
                          }}
                          placeholder="0"
                          keyboardType="numeric"
                        />
                        {fieldState.error && (
                          <Text style={styles.errorText}>
                            {fieldState.error.message}
                          </Text>
                        )}
                      </>
                    )}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Unit</Text>
                  <CustomDropdown
                    items={unitTypes.map(unit => ({
                      label: unit,
                      value: unit,
                    }))}
                    value={form.watch(`items.${index}.unitType`) || 'Piece'}
                    onChange={val => {
                      form.setValue(`items.${index}.unitType`, val);
                      if (val !== 'Other') {
                        form.setValue(`items.${index}.otherUnit`, '');
                      }
                    }}
                    placeholder="Select unit"
                    style={styles.dropdown}
                  />
                </View>
              </View>

              {/* Other Unit */}
              {form.watch(`items.${index}.unitType`) === 'Other' && (
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Specify Unit</Text>
                    <Controller
                      control={form.control}
                      name={`items.${index}.otherUnit`}
                      render={({ field, fieldState }) => (
                        <>
                          <TextInput
                            style={[
                              styles.input,
                              fieldState.error && styles.inputError,
                            ]}
                            value={field.value}
                            onChangeText={field.onChange}
                            placeholder="e.g., Kg"
                          />
                          {fieldState.error && (
                            <Text style={styles.errorText}>
                              {fieldState.error.message}
                            </Text>
                          )}
                        </>
                      )}
                    />
                  </View>
                </View>
              )}

              {/* Price and Amount */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.label}>Price/Unit</Text>
                  <Controller
                    control={form.control}
                    name={`items.${index}.pricePerUnit`}
                    render={({ field, fieldState }) => (
                      <>
                        <TextInput
                          style={[
                            styles.input,
                            fieldState.error && styles.inputError,
                          ]}
                          value={field.value?.toString()}
                          onChangeText={text => {
                            const value = text === '' ? '' : Number(text);
                            field.onChange(value);
                            setLastEditedField(prev => ({
                              ...prev,
                              [index]: 'pricePerUnit',
                            }));
                          }}
                          placeholder="0.00"
                          keyboardType="numeric"
                        />
                        {fieldState.error && (
                          <Text style={styles.errorText}>
                            {fieldState.error.message}
                          </Text>
                        )}
                      </>
                    )}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Amount</Text>
                  <Controller
                    control={form.control}
                    name={`items.${index}.amount`}
                    render={({ field, fieldState }) => (
                      <>
                        <TextInput
                          style={[
                            styles.input,
                            fieldState.error && styles.inputError,
                          ]}
                          value={field.value?.toString()}
                          onChangeText={text => {
                            const value = text === '' ? '' : Number(text);
                            field.onChange(value);
                            setLastEditedField(prev => ({
                              ...prev,
                              [index]: 'amount',
                            }));
                          }}
                          placeholder="0.00"
                          keyboardType="numeric"
                        />
                        {fieldState.error && (
                          <Text style={styles.errorText}>
                            {fieldState.error.message}
                          </Text>
                        )}
                      </>
                    )}
                  />
                </View>
              </View>

              {/* HSN/SAC Code */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.label}>HSN Code</Text>
                  <HsnSacDropdown
                    items={hsnOptions}
                    value={form.watch(`items.${index}.hsn`) || ''}
                    onChange={hsnCodeValue => {
                      handleHsnChange(hsnCodeValue, index);
                    }}
                    placeholder="Search HSN..."
                  />
                </View>
              </View>

              {/* GST Section */}
              {gstEnabled && (
                <>
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.label}>GST %</Text>
                      <CustomDropdown
                        items={GST_OPTIONS}
                        value={
                          form
                            .watch(`items.${index}.gstPercentage`)
                            ?.toString() || '18'
                        }
                        onChange={val => {
                          form.setValue(
                            `items.${index}.gstPercentage`,
                            Number(val),
                          );
                        }}
                        placeholder="Select GST %"
                        style={styles.dropdown}
                      />
                    </View>

                    <View style={styles.formField}>
                      <Text style={styles.label}>Tax</Text>
                      <Controller
                        control={form.control}
                        name={`items.${index}.lineTax`}
                        render={({ field }) => (
                          <TextInput
                            style={[styles.input, styles.readOnlyInput]}
                            value={field.value?.toFixed(2)}
                            editable={false}
                            placeholder="0.00"
                          />
                        )}
                      />
                    </View>
                  </View>
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.label}>Total</Text>
                      <Controller
                        control={form.control}
                        name={`items.${index}.lineTotal`}
                        render={({ field, fieldState }) => (
                          <>
                            <TextInput
                              style={[
                                styles.input,
                                fieldState.error && styles.inputError,
                              ]}
                              value={field.value?.toString()}
                              onChangeText={text => {
                                const value = text === '' ? '' : Number(text);
                                field.onChange(value);
                                setLastEditedField(prev => ({
                                  ...prev,
                                  [index]: 'lineTotal',
                                }));
                              }}
                              placeholder="0.00"
                              keyboardType="numeric"
                            />
                            {fieldState.error && (
                              <Text style={styles.errorText}>
                                {fieldState.error.message}
                              </Text>
                            )}
                          </>
                        )}
                      />
                    </View>
                  </View>
                </>
              )}
            </>
          )}

          {itemType === 'service' && (
            <>
              {/* Service Selection */}
              <View style={styles.formRow}>
                <View style={[styles.formField, { flex: 2 }]}>
                  <Text style={styles.label}>Service</Text>
                  <Combobox
                    options={serviceOptions}
                    value={form.watch(`items.${index}.service`) || ''}
                    onChange={value => {
                      form.setValue(`items.${index}.service`, value);
                      if (value) {
                        const selectedService = services.find(
                          s => s._id === value,
                        );
                        if (selectedService) {
                          if (selectedService.amount) {
                            form.setValue(
                              `items.${index}.amount`,
                              selectedService.amount,
                            );
                            setLastEditedField(prev => ({
                              ...prev,
                              [index]: 'amount',
                            }));
                          }
                          if (selectedService.sac) {
                            form.setValue(
                              `items.${index}.sac`,
                              selectedService.sac,
                            );
                          } else {
                            form.setValue(`items.${index}.sac`, '');
                          }
                        }
                      }
                    }}
                    placeholder="Select service..."
                    creatable={canCreateInventory}
                    onCreate={name => {
                      if (!canCreateInventory) {
                        setSnackbar({
                          visible: true,
                          message: 'Permission denied to create services.',
                          type: 'error',
                        });
                        return '';
                      }
                      setCreatingServiceForIndex(index);
                      setNewServiceName(name);
                      setIsServiceDialogOpen(true);
                      return Promise.resolve(name);
                    }}
                  />
                </View>
              </View>

              {/* Service Amount */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.label}>Amount</Text>
                  <Controller
                    control={form.control}
                    name={`items.${index}.amount`}
                    render={({ field, fieldState }) => (
                      <>
                        <TextInput
                          style={[
                            styles.input,
                            fieldState.error && styles.inputError,
                          ]}
                          value={field.value?.toString()}
                          onChangeText={text => {
                            const value = text === '' ? '' : Number(text);
                            field.onChange(value);
                            setLastEditedField(prev => ({
                              ...prev,
                              [index]: 'amount',
                            }));
                          }}
                          placeholder="0.00"
                          keyboardType="numeric"
                        />
                        {fieldState.error && (
                          <Text style={styles.errorText}>
                            {fieldState.error.message}
                          </Text>
                        )}
                      </>
                    )}
                  />
                </View>
              </View>

              {/* Service Description */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.label}>Description</Text>
                  <Controller
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field }) => (
                      <TextInput
                        style={styles.input}
                        value={field.value}
                        onChangeText={field.onChange}
                        placeholder="Service description"
                        multiline
                      />
                    )}
                  />
                </View>
              </View>

              {/* HSN/SAC Code */}
              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.label}>SAC Code</Text>
                  <HsnSacDropdown
                    items={sacOptions}
                    value={form.watch(`items.${index}.sac`) || ''}
                    onChange={sacCodeValue => {
                      handleSacChange(sacCodeValue, index);
                    }}
                    placeholder="Search SAC..."
                  />
                </View>
              </View>

              {/* GST Section */}
              {gstEnabled && (
                <>
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.label}>GST %</Text>
                      <CustomDropdown
                        items={GST_OPTIONS}
                        value={
                          form
                            .watch(`items.${index}.gstPercentage`)
                            ?.toString() || '18'
                        }
                        onChange={val => {
                          form.setValue(
                            `items.${index}.gstPercentage`,
                            Number(val),
                          );
                        }}
                        placeholder="Select GST %"
                        style={styles.dropdown}
                      />
                    </View>

                    <View style={styles.formField}>
                      <Text style={styles.label}>Tax</Text>
                      <Controller
                        control={form.control}
                        name={`items.${index}.lineTax`}
                        render={({ field }) => (
                          <TextInput
                            style={[styles.input, styles.readOnlyInput]}
                            value={field.value?.toFixed(2)}
                            editable={false}
                            placeholder="0.00"
                          />
                        )}
                      />
                    </View>
                  </View>
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.label}>Total</Text>
                      <Controller
                        control={form.control}
                        name={`items.${index}.lineTotal`}
                        render={({ field, fieldState }) => (
                          <>
                            <TextInput
                              style={[
                                styles.input,
                                fieldState.error && styles.inputError,
                              ]}
                              value={field.value?.toString()}
                              onChangeText={text => {
                                const value = text === '' ? '' : Number(text);
                                field.onChange(value);
                                setLastEditedField(prev => ({
                                  ...prev,
                                  [index]: 'lineTotal',
                                }));
                              }}
                              placeholder="0.00"
                              keyboardType="numeric"
                            />
                            {fieldState.error && (
                              <Text style={styles.errorText}>
                                {fieldState.error.message}
                              </Text>
                            )}
                          </>
                        )}
                      />
                    </View>
                  </View>
                </>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading form data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Core Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Core Details</Text>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Company</Text>
              <CustomDropdown
                items={companyOptions}
                value={form.watch('company')}
                onChange={val => form.setValue('company', val)}
                placeholder="Select company"
                style={styles.dropdown}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Transaction Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {form.watch('date')
                    ? form.watch('date').toLocaleDateString()
                    : 'Select date'}
                </Text>
                <Icon name="calendar" size={20} color="#6B7280" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={form.watch('date') || new Date()}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      form.setValue('date', selectedDate);
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Due Date (Optional)</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDueDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {form.watch('dueDate')
                    ? form.watch('dueDate').toLocaleDateString()
                    : 'Select date'}
                </Text>
                <Icon name="calendar" size={20} color="#6B7280" />
              </TouchableOpacity>
              {showDueDatePicker && (
                <DateTimePicker
                  value={
                    form.watch('dueDate') || form.watch('date') || new Date()
                  }
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDueDatePicker(false);
                    if (selectedDate) {
                      form.setValue('dueDate', selectedDate);
                    }
                  }}
                />
              )}
            </View>
          </View>
        </View>

        {/* Customer Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Customer Details</Text>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Customer</Text>
              <Combobox
                options={partyOptions}
                value={form.watch('party') || ''}
                onChange={value => {
                  form.setValue('party', value);
                }}
                placeholder="Select customer..."
                creatable={canCreateCustomer}
                onCreate={name => {
                  if (!canCreateCustomer) {
                    setSnackbar({
                      visible: true,
                      message: 'Permission denied to create customers.',
                      type: 'error',
                    });
                    return '';
                  }
                  setNewCustomerName(name);
                  setIsCreateCustomerOpen(true);
                  return Promise.resolve(name);
                }}
              />
              {form.formState.errors.party && (
                <Text style={styles.errorText}>
                  {form.formState.errors.party.message}
                </Text>
              )}
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Reference Number</Text>
              <Controller
                control={form.control}
                name="referenceNumber"
                render={({ field, fieldState }) => (
                  <>
                    <TextInput
                      style={[
                        styles.input,
                        fieldState.error && styles.inputError,
                      ]}
                      value={field.value}
                      onChangeText={field.onChange}
                      placeholder="e.g., PO No, Ref #"
                    />
                    {fieldState.error && (
                      <Text style={styles.errorText}>
                        {fieldState.error.message}
                      </Text>
                    )}
                  </>
                )}
              />
            </View>
          </View>
        </View>

        {/* Items Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Items</Text>

          <FlatList
            data={fields}
            renderItem={({ item, index }) => renderItemRow(item, index)}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />

          <View style={styles.addButtonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.outlineButton]}
              onPress={() => append({ ...PRODUCT_DEFAULT })}
            >
              <Text style={styles.outlineButtonText}>Add Product</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.outlineButton]}
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
            >
              <Text style={styles.outlineButtonText}>Add Service</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Additional Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Additional Details</Text>

          {/* Notes Section */}
          {showNotes ? (
            <View style={styles.formField}>
              <View style={styles.notesHeader}>
                <Text style={styles.label}>Notes</Text>
                <TouchableOpacity
                  onPress={() => setShowNotes(false)}
                  style={styles.removeNotesButton}
                >
                  <Text style={styles.removeNotesText}>Remove Notes</Text>
                </TouchableOpacity>
              </View>
              <Controller
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <QuillEditor
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Add detailed notes with formatting..."
                    style={styles.quillEditor}
                  />
                )}
              />
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.outlineButton]}
              onPress={() => setShowNotes(true)}
            >
              <Text style={styles.outlineButtonText}>Add Notes</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Totals Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Totals</Text>

          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {(form.watch('totalAmount') || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>

            {gstEnabled && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>GST</Text>
                <Text style={styles.totalValue}>
                  {(form.watch('taxAmount') || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            )}

            <View style={[styles.totalRow, styles.invoiceTotalRow]}>
              <Text style={styles.invoiceTotalLabel}>
                Invoice Total{gstEnabled ? ' (GST incl.)' : ''}
              </Text>
              <Text style={styles.invoiceTotalValue}>
                {(form.watch('invoiceTotal') || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.submitContainer}
      >
        <TouchableOpacity
          style={[
            styles.button,
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={form.handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting && (
            <ActivityIndicator
              size="small"
              color="#fff"
              style={styles.submitLoader}
            />
          )}
          <Text style={styles.submitButtonText}>
            {isSubmitting
              ? 'Submitting...'
              : transactionToEdit
              ? 'Update Proforma Invoice'
              : 'Create Proforma Invoice'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* Dialogs */}
      <Modal
        visible={isCreateCustomerOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCreateCustomerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentWithHeader]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitle}>
                <Text style={styles.modalTitle}>Create New Customer</Text>
                <Text style={styles.modalSubTitle}>
                  Add a customer to use in this proforma
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsCreateCustomerOpen(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalInner}>
              <CustomerForm
                initialName={newCustomerName}
                onSuccess={handleCustomerCreated}
                onCancel={() => setIsCreateCustomerOpen(false)}
                hideHeader={true}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isProductDialogOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsProductDialogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentWithHeader]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitle}>
                <Text style={styles.modalTitle}>Create New Product</Text>
                <Text style={styles.modalSubTitle}>
                  Add a product to use in this proforma
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsProductDialogOpen(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalInner}>
              <ProductForm
                productType={'product'}
                onSuccess={handleProductCreated}
                initialName={newEntityName}
                onClose={() => setIsProductDialogOpen(false)}
                hideHeader={true}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isServiceDialogOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsServiceDialogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalContentWithHeader]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitle}>
                <Text style={styles.modalTitle}>Create New Service</Text>
                <Text style={styles.modalSubTitle}>
                  Add a service to use in this proforma
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsServiceDialogOpen(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalInner}>
              <ServiceForm
                onSuccess={handleServiceCreated}
                initialName={newServiceName}
                onClose={() => setIsServiceDialogOpen(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Snackbar */}
      {snackbar.visible && (
        <View
          style={[
            styles.snackbar,
            snackbar.type === 'error' && styles.snackbarError,
            snackbar.type === 'success' && styles.snackbarSuccess,
          ]}
        >
          <Text style={styles.snackbarText}>{snackbar.message}</Text>
          <TouchableOpacity
            onPress={() => setSnackbar(prev => ({ ...prev, visible: false }))}
          >
            <Text style={styles.snackbarClose}>×</Text>
          </TouchableOpacity>
        </View>
      )}
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
  inputError: {
    borderColor: '#d32f2f',
  },
  readOnlyInput: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 4,
  },
  dropdown: {
    backgroundColor: 'white',
    borderColor: '#ddd',
    minHeight: 44,
  },
  dateButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemContent: {
    gap: 12,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
    flex: 1,
  },
  outlineButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  submitLoader: {
    marginRight: 8,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeNotesButton: {
    padding: 8,
  },
  removeNotesText: {
    color: '#007AFF',
    fontSize: 14,
  },
  quillEditor: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
  },
  totalsContainer: {
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  invoiceTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  invoiceTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  invoiceTotalValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    margin: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalSubTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexWrap: 'nowrap',
  },
  modalHeaderTitle: {
    flex: 1,
    paddingRight: 12,
  },
  modalContentWithHeader: {
    padding: 0,
    height: '88%',
    width: '94%',
  },
  modalInner: {
    flex: 1,
    padding: 16,
  },
  modalCloseIcon: {
    fontSize: 20,
    color: '#666',
    padding: 8,
    alignSelf: 'flex-start',
  },
  snackbar: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: '#323232',
    borderRadius: 4,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  snackbarError: {
    backgroundColor: '#d32f2f',
  },
  snackbarSuccess: {
    backgroundColor: '#388e3c',
  },
  snackbarText: {
    color: 'white',
    flex: 1,
  },
  snackbarClose: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
});
