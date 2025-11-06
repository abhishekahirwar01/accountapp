import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { PlusCircle, Trash2 } from 'lucide-react-native';
import  {CustomerForm}  from '../customers/CustomerForm';
import {VendorForm} from '../vendors/VendorForm';
import  ProductForm  from '../products/ProductForm';
import DateTimePicker from '@react-native-community/datetimepicker';

// --- Hardcoded Data ---
const MOCK_COMPANIES = [
  { _id: 'c1', businessName: 'Acme Pvt Ltd', gstin: '27ABCDE1234F1Z5' },
  { _id: 'c2', businessName: 'Globex Ltd', gstin: '' },
];
const MOCK_PARTIES = [
  {
    _id: 'p1',
    name: 'John Doe',
    contactNumber: '+91 90000 00001',
    email: 'john@example.com',
  },
  {
    _id: 'p2',
    name: 'Jane Smith',
    contactNumber: '+91 90000 00002',
    email: 'jane@example.com',
  },
];
const MOCK_VENDORS = [
  {
    _id: 'v1',
    vendorName: 'Alpha Suppliers',
    contactNumber: '+91 98888 88888',
  },
  { _id: 'v2', vendorName: 'Beta Traders', contactNumber: '+91 97777 77777' },
];
const MOCK_PRODUCTS = [
  { _id: 'pr1', name: 'Product A', unit: 'Piece' },
  { _id: 'pr2', name: 'Product B', unit: 'Kg' },
];
const MOCK_SERVICES = [
  { _id: 'sv1', serviceName: 'Installation' },
  { _id: 'sv2', serviceName: 'Maintenance' },
];
const MOCK_BANKS = [
  { _id: 'b1', bankName: 'HDFC Bank', companyId: 'c1' },
  { _id: 'b2', bankName: 'ICICI Bank', companyId: 'c1' },
  { _id: 'b3', bankName: 'SBI', companyId: 'c2' },
];
const GST_OPTIONS = [
  { label: '0%', value: 0 },
  { label: '5%', value: 5 },
  { label: '18% (Standard)', value: 18 },
  { label: '28%', value: 28 },
];
const UNIT_TYPES = [
  'Piece',
  'Kg',
  'Litre',
  'Box',
  'Meter',
  'Dozen',
  'Pack',
  'Other',
];

const TRANSACTION_TYPES = [
  { label: 'Sales', value: 'sales' },
  { label: 'Purchases', value: 'purchases' },
  { label: 'Receipt', value: 'receipt' },
  { label: 'Payment', value: 'payment' },
  { label: 'Journal', value: 'journal' },
];

// Helper for showing balance (mocked for demo)
const getPartyBalance = partyId => {
  if (partyId === 'p1') return 1200.5;
  if (partyId === 'p2') return 0;
  return 0;
};

// --- ItemsCard: reusable for both sales and purchases ---
function ItemsCard({
  items,
  products,
  services,
  gstEnabled,
  updateItem,
  removeItem,
  addProductRow,
  addServiceRow,
  creatingForIndex,
  setCreatingForIndex,
  setShowProductModal,
  setShowServiceModal,
  subTotal,
  totalTax,
  invoiceTotal,
  showTotals = true,
  showDescription = false,
  description,
  setDescription,
  dontSendInvoice,
  setDontSendInvoice,
  showSalesNotes,
  setShowSalesNotes,
  UNIT_TYPES,
  GST_OPTIONS,
  cardTitle = 'Items & Services',
}) {
  return (
    <View style={styles.card}>
      <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 12 }]}>{cardTitle}</Text>
      {items.map((item, index) => (
        <View key={item.id} style={[styles.verticalItemBox, {marginBottom: 12}]}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.smallLabel}>Type</Text>
            <View style={[styles.pickerWrapper, {flex: 1, marginLeft: 8}]}>
              <Picker
                selectedValue={item.itemType}
                onValueChange={v => updateItem(index, 'itemType', v)}
              >
                <Picker.Item label="Product" value="product" />
                <Picker.Item label="Service" value="service" />
              </Picker>
            </View>
            <TouchableOpacity
              style={[styles.removeBtn, {marginLeft: 'auto'}]}
              onPress={() => removeItem(index)}
            >
              <Trash2 size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
          {item.itemType === 'product' ? (
            <>
              <View style={styles.itemFieldRow}>
                <Text style={styles.smallLabel}>Product</Text>
                <View style={[styles.pickerWrapper, {flex: 1, marginLeft: 8}]}>
                  <Picker
                    selectedValue={item.product}
                    onValueChange={v => updateItem(index, 'product', v)}
                  >
                    {products.map(p => (
                      <Picker.Item
                        key={p._id}
                        label={p.name}
                        value={p._id}
                      />
                    ))}
                  </Picker>
                </View>
                <TouchableOpacity
                  style={[styles.linkButton, {marginLeft: 8}]}
                  onPress={() => {
                    setCreatingForIndex(index);
                    setShowProductModal(true);
                  }}
                >
                  <Text style={styles.linkText}>Create Product</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.itemFieldRow}>
                <View style={{flex: 1, marginRight: 8}}>
                  <Text style={styles.smallLabel}>Qty</Text>
                  <TextInput
                    value={String(item.quantity)}
                    onChangeText={v => updateItem(index, 'quantity', v)}
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={{flex: 1, marginRight: 8}}>
                  <Text style={styles.smallLabel}>Unit</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={item.unitType || 'Piece'}
                      onValueChange={v => updateItem(index, 'unitType', v)}
                    >
                      {UNIT_TYPES.map(u => (
                        <Picker.Item key={u} label={u} value={u} />
                      ))}
                    </Picker>
                  </View>
                  {item.unitType === 'Other' && (
                    <TextInput
                      style={[styles.input, { marginTop: 6 }]}
                      placeholder="Specify unit"
                      value={item.otherUnit || ''}
                      onChangeText={v => updateItem(index, 'otherUnit', v)}
                    />
                  )}
                </View>
                <View style={{flex: 1, marginRight: 8}}>
                  <Text style={styles.smallLabel}>Price/Unit</Text>
                  <TextInput
                    value={String(item.pricePerUnit)}
                    onChangeText={v => updateItem(index, 'pricePerUnit', v)}
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              </View>
              <View style={styles.itemFieldRow}>
                <View style={{flex: 1, marginRight: 8}}>
                  <Text style={styles.smallLabel}>Amount</Text>
                  <TextInput
                    value={String(item.amount || 0)}
                    editable={false}
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={{flex: 1, marginRight: 8}}>
                  <Text style={styles.smallLabel}>HSN Code</Text>
                  <TextInput
                    value={String(item.hsnCode || '-')}
                    onChangeText={v => updateItem(index, 'hsnCode', v)}
                    style={styles.input}
                    placeholder="-"
                  />
                </View>
                {gstEnabled && (
                  <>
                    <View style={{flex: 1, marginRight: 8}}>
                      <Text style={styles.smallLabel}>GST %</Text>
                      <View style={styles.pickerWrapper}>
                        <Picker
                          selectedValue={Number(item.gstPercentage || 0)}
                          onValueChange={v =>
                            updateItem(index, 'gstPercentage', v)
                          }
                        >
                          {GST_OPTIONS.map(opt => (
                            <Picker.Item
                              key={opt.value}
                              label={opt.label}
                              value={opt.value}
                            />
                          ))}
                        </Picker>
                      </View>
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.smallLabel}>Tax</Text>
                      <TextInput
                        value={String(item.lineTax || 0)}
                        editable={false}
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                  </>
                )}
              </View>
              {gstEnabled && (
                <View style={styles.itemFieldRow}>
                  <View style={{flex: 1}}>
                    <Text style={styles.smallLabel}>Total</Text>
                    <TextInput
                      value={String(item.lineTotal || 0)}
                      editable={false}
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.itemFieldRow}>
                <Text style={styles.smallLabel}>Service</Text>
                <View style={[styles.pickerWrapper, {flex: 1, marginLeft: 8}]}>
                  <Picker
                    selectedValue={item.service}
                    onValueChange={v => updateItem(index, 'service', v)}
                  >
                    {services.map(s => (
                      <Picker.Item
                        key={s._id}
                        label={s.serviceName}
                        value={s._id}
                      />
                    ))}
                  </Picker>
                </View>
                <TouchableOpacity
                  style={[styles.linkButton, {marginLeft: 8}]}
                  onPress={() => {
                    setCreatingForIndex(index);
                    setShowServiceModal(true);
                  }}
                >
                  <Text style={styles.linkText}>Create Service</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.itemFieldRow}>
                <View style={{flex: 1, marginRight: 8}}>
                  <Text style={styles.smallLabel}>Amount</Text>
                  <TextInput
                    value={String(item.amount || 0)}
                    onChangeText={v => updateItem(index, 'amount', v)}
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={{flex: 2, marginRight: 8}}>
                  <Text style={styles.smallLabel}>Description</Text>
                  <TextInput
                    value={item.description || ''}
                    onChangeText={v => updateItem(index, 'description', v)}
                    style={styles.input}
                    placeholder="Service description"
                  />
                </View>
                {gstEnabled && (
                  <>
                    <View style={{flex: 1, marginRight: 8}}>
                      <Text style={styles.smallLabel}>GST %</Text>
                      <View style={styles.pickerWrapper}>
                        <Picker
                          selectedValue={Number(item.gstPercentage || 0)}
                          onValueChange={v =>
                            updateItem(index, 'gstPercentage', v)
                          }
                        >
                          {GST_OPTIONS.map(opt => (
                            <Picker.Item
                              key={opt.value}
                              label={opt.label}
                              value={opt.value}
                            />
                          ))}
                        </Picker>
                      </View>
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.smallLabel}>Tax</Text>
                      <TextInput
                        value={String(item.lineTax || 0)}
                        editable={false}
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                  </>
                )}
              </View>
              {gstEnabled && (
                <View style={styles.itemFieldRow}>
                  <View style={{flex: 1}}>
                    <Text style={styles.smallLabel}>Total</Text>
                    <TextInput
                      value={String(item.lineTotal || 0)}
                      editable={false}
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      ))}
      {/* Add buttons */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <TouchableOpacity
          style={styles.addItemBtn}
          onPress={addProductRow}
          activeOpacity={0.8}
        >
          <PlusCircle size={18} color="#fff" />
          <Text style={styles.addItemText}>Add Product</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addItemBtn, { backgroundColor: '#16a34a' }]}
          onPress={addServiceRow}
          activeOpacity={0.8}
        >
          <PlusCircle size={18} color="#fff" />
          <Text style={styles.addItemText}>Add Service</Text>
        </TouchableOpacity>
      </View>
      {/* Totals */}
      {showTotals && (
        <>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>₹{subTotal.toFixed(2)}</Text>
          </View>
          {gstEnabled && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST</Text>
              <Text style={styles.totalValue}>₹{totalTax.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Invoice Total (GST incl.)</Text>
            <Text style={[styles.totalValue, { fontWeight: 'bold' }]}>
              ₹{invoiceTotal.toFixed(2)}
            </Text>
          </View>
        </>
      )}
      {/* Don't Send Invoice (for sales) */}
      {typeof dontSendInvoice !== 'undefined' && (
        <View
          style={{
            marginTop: 8,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            borderRadius: 8,
            padding: 10,
          }}
        >
          <Switch
            value={dontSendInvoice}
            onValueChange={setDontSendInvoice}
          />
          <Text style={{ marginLeft: 12, fontWeight: '600' }}>
            Don't Send Invoice
          </Text>
        </View>
      )}
      {/* Description/Narration (for sales) */}
      {showDescription && (
        !showSalesNotes ? (
          <TouchableOpacity
            style={[
              styles.addItemBtn,
              { backgroundColor: '#e2e8f0', marginTop: 16 },
            ]}
            onPress={() => setShowSalesNotes(true)}
          >
            <Text style={[styles.addItemText, { color: '#0f172a' }]}>
              Add Description/Narration
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.smallLabel}>Description/Narration</Text>
            <TextInput
              style={[
                styles.input,
                { height: 100, textAlignVertical: 'top' },
              ]}
              multiline
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your transaction"
            />
            <TouchableOpacity
              style={[
                styles.addItemBtn,
                { backgroundColor: '#e2e8f0', marginTop: 8 },
              ]}
              onPress={() => setShowSalesNotes(false)}
            >
              <Text style={[styles.addItemText, { color: '#0f172a' }]}>
                Remove Description/Narration
              </Text>
            </TouchableOpacity>
          </View>
        )
      )}
    </View>
  );
}

// --- Main Form Component ---
function TransactionForm({
  onFormSubmit = () => {},
  defaultType = 'sales',
  transactionToEdit = null,
}) {
  // --- State ---
  const [type, setType] = useState(transactionToEdit?.type || defaultType);
  const [companyId, setCompanyId] = useState('c1');
  const [partyId, setPartyId] = useState('p1');
  const [vendorId, setVendorId] = useState('v1');
  const [date, setDate] = useState(
    transactionToEdit?.date || new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(transactionToEdit?.dueDate || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState(
    transactionToEdit?.referenceNumber || '',
  );
  const [paymentMethod, setPaymentMethod] = useState(
    transactionToEdit?.paymentMethod || 'Cash',
  );
  const [description, setDescription] = useState(transactionToEdit?.description || '');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [dontSendInvoice, setDontSendInvoice] = useState(false);
  const [showSalesNotes, setShowSalesNotes] = useState(false);
  const [bankId, setBankId] = useState(
    MOCK_BANKS.find(b => b.companyId === 'c1')._id,
  );

  const [items, setItems] = useState(
    transactionToEdit?.items || [
      {
        id: '1',
        itemType: 'product',
        product: 'pr1',
        service: '',
        name: 'Product A',
        quantity: 1,
        unitType: 'Piece',
        pricePerUnit: 100,
        amount: 100,
        hsnCode: '-',
        gstPercentage: 18,
        lineTax: 18,
        lineTotal: 118,
      },
    ],
  );
  const [companies] = useState(MOCK_COMPANIES);
  const [parties, setParties] = useState(MOCK_PARTIES);
  const [vendors, setVendors] = useState(MOCK_VENDORS);
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [services, setServices] = useState(MOCK_SERVICES);
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
  const [shippingAddress, setShippingAddress] = useState('');
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [partyModalType, setPartyModalType] = useState('customer'); // or vendor
  const [showProductModal, setShowProductModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [creatingForIndex, setCreatingForIndex] = useState(null);

  // --- Derived ---
  const selectedCompany = useMemo(
    () => companies.find(c => c._id === companyId),
    [companies, companyId],
  );
  const gstEnabled = !!(selectedCompany && selectedCompany.gstin);

  const subTotal = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.amount || 0), 0),
    [items],
  );
  const totalTax = useMemo(
    () =>
      gstEnabled
        ? items.reduce((sum, it) => sum + Number(it.lineTax || 0), 0)
        : 0,
    [items, gstEnabled],
  );
  const invoiceTotal = useMemo(() => subTotal + totalTax, [subTotal, totalTax]);

  // --- Item Handlers ---
  const addProductRow = () => {
    setItems(prev => [
      ...prev,
      {
        id: String(prev.length + 1),
        itemType: 'product',
        product: products[0]?._id || '',
        service: '',
        name: products[0]?.name || 'Product',
        quantity: 1,
        unitType: products[0]?.unit || 'Piece',
        pricePerUnit: 0,
        amount: 0,
        hsnCode: '-',
        gstPercentage: 18,
        lineTax: 0,
        lineTotal: 0,
      },
    ]);
  };
  const addServiceRow = () => {
    setItems(prev => [
      ...prev,
      {
        id: String(prev.length + 1),
        itemType: 'service',
        product: '',
        service: services[0]?._id || '',
        name: services[0]?.serviceName || 'Service',
        quantity: '',
        unitType: '',
        pricePerUnit: '',
        amount: 0,
        hsnCode: '-',
        gstPercentage: 18,
        lineTax: 0,
        lineTotal: 0,
      },
    ]);
  };
  const updateItem = (index, key, value) => {
    setItems(prev => {
      const next = [...prev];
      const updated = { ...next[index], [key]: value };
      // If item type changed, reset fields
      if (key === 'itemType') {
        if (value === 'product') {
          updated.service = '';
          updated.product = products[0]?._id || '';
          updated.name =
            products.find(p => p._id === updated.product)?.name || 'Product';
          updated.quantity = 1;
          updated.pricePerUnit = 0;
        } else {
          updated.product = '';
          updated.service = services[0]?._id || '';
          updated.name =
            services.find(s => s._id === updated.service)?.serviceName ||
            'Service';
          updated.quantity = '';
          updated.pricePerUnit = '';
        }
      }
      // If picking product/service, sync display name/unit
      if (key === 'product') {
        const p = products.find(pp => pp._id === value);
        updated.name = p?.name || updated.name;
        if (p?.unit) updated.unitType = p.unit;
      }
      if (key === 'service') {
        const s = services.find(ss => ss._id === value);
        updated.name = s?.serviceName || updated.name;
      }
      // Compute base amount for product
      const qty = Number(updated.quantity || 0);
      const rate = Number(updated.pricePerUnit || 0);
      const base =
        updated.itemType === 'product'
          ? Math.max(0, qty * rate)
          : Number(updated.amount || 0);
      updated.amount = base;
      // GST calculation per line
      const pct = gstEnabled ? Number(updated.gstPercentage || 0) : 0;
      const lineTax = +((base * pct) / 100).toFixed(2);
      const lineTotal = +(base + lineTax).toFixed(2);
      updated.lineTax = lineTax;
      updated.lineTotal = lineTotal;
      next[index] = updated;
      return next;
    });
  };
  const removeItem = index => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // --- Validation ---
  const validate = () => {
    if (!companyId) return 'Select a company.';
    if (
      (type === 'sales' || type === 'purchases') &&
      (!items.length ||
        items.some(
          i =>
            i.itemType === 'product' &&
            (!i.product || !i.quantity || i.quantity <= 0),
        ))
    ) {
      return 'Add at least one valid item.';
    }
    if ((type === 'sales' || type === 'receipt') && !partyId)
      return 'Select a customer.';
    if ((type === 'purchases' || type === 'payment') && !vendorId)
      return 'Select a vendor.';
    if (
      (type === 'receipt' || type === 'payment') &&
      (!amount || Number(amount) <= 0)
    )
      return 'Enter a valid amount.';
    if (type === 'journal' && (!fromAccount || !toAccount || !amount))
      return 'Fill all journal fields.';
    return null;
  };

  // --- Date Handler ---
  function showDatePickerModal(setter, value, minDate) {
    return (
      <DateTimePicker
        value={value ? new Date(value) : new Date()}
        mode="date"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        minimumDate={minDate}
        onChange={(_, selectedDate) => {
          if (selectedDate) {
            setter(selectedDate.toISOString().slice(0, 10));
          }
          if (setter === setDate) setShowDatePicker(false);
          if (setter === setDueDate) setShowDueDatePicker(false);
        }}
      />
    );
  }

  // --- Submit Handler ---
  const handleSubmit = () => {
    const error = validate();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }
    const payload = {
      type,
      company: companyId,
      party: type === 'purchases' || type === 'payment' ? undefined : partyId,
      vendor: type === 'purchases' || type === 'payment' ? vendorId : undefined,
      date,
      referenceNumber:
        type === 'receipt' || type === 'payment' ? referenceNumber : undefined,
      paymentMethod,
      description: description,
      narration: type === 'journal' ? description : undefined,
      fromAccount,
      toAccount,
      totalAmount: invoiceTotal,
      subTotal,
      taxAmount: totalTax,
      items: type === 'sales' || type === 'purchases' ? items : [],
      bank: paymentMethod !== 'Cash' ? bankId : undefined,
      dontSendInvoice: type === 'sales' ? dontSendInvoice : undefined,
      amount:
        type === 'receipt' || type === 'payment' || type === 'journal'
          ? Number(amount || 0)
          : undefined,
      dueDate,
      shippingAddress:
        type === 'sales'
          ? shippingSameAsBilling
            ? null
            : shippingAddress
          : undefined,
    };
    onFormSubmit(payload);
    Alert.alert('Success', 'Transaction submitted!');
  };

  // --- UI ---
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Transaction Details</Text>
      {/* Transaction Type Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
      >
        <View style={styles.typeButtonRow}>
          {TRANSACTION_TYPES.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[
                styles.typeButton,
                type === t.value && styles.typeButtonActive,
              ]}
              onPress={() => setType(t.value)}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  type === t.value && styles.typeButtonTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      {/* Company Selection always first */}
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Company</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={companyId} onValueChange={v => setCompanyId(v)}>
              {companies.map(c => (
                <Picker.Item key={c._id} label={c.businessName} value={c._id} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* TRANSACTION DATE & DUE DATE */}
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Transaction Date</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={styles.input}
            activeOpacity={0.7}
          >
            <Text style={{ color: date ? '#0f172a' : '#64748b' }}>
              {date || 'Select date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker &&
            showDatePickerModal(setDate, date)}
        </View>
        {(type === 'sales' || type === 'purchases') && (
          <View style={styles.col}>
            <Text style={styles.label}>Due Date</Text>
            <TouchableOpacity
              onPress={() => setShowDueDatePicker(true)}
              style={styles.input}
              activeOpacity={0.7}
            >
              <Text style={{ color: dueDate ? '#0f172a' : '#64748b' }}>
                {dueDate || 'Select date'}
              </Text>
            </TouchableOpacity>
            {showDueDatePicker &&
              showDatePickerModal(setDueDate, dueDate)}
          </View>
        )}
      </View>

      {/* PAYMENT TAB */}
      {type === 'payment' && (
        <>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Paid To (Vendor)</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={vendorId}
                  onValueChange={setVendorId}
                  prompt="Select Vendor"
                >
                  {vendors.map(v => (
                    <Picker.Item
                      key={v._id}
                      label={v.vendorName}
                      value={v._id}
                    />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                  setPartyModalType('vendor');
                  setShowPartyModal(true);
                }}
              >
                <Text style={styles.linkText}>Create Vendor</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={paymentMethod}
                  onValueChange={setPaymentMethod}
                >
                  <Picker.Item label="Cash" value="Cash" />
                  <Picker.Item label="Credit" value="Credit" />
                  <Picker.Item label="UPI" value="UPI" />
                  <Picker.Item label="Bank Transfer" value="Bank Transfer" />
                </Picker>
              </View>
              {paymentMethod !== 'Cash' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.smallLabel}>Bank</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={bankId} onValueChange={setBankId}>
                      {MOCK_BANKS.filter(b => b.companyId === companyId).map(
                        b => (
                          <Picker.Item
                            key={b._id}
                            label={b.bankName}
                            value={b._id}
                          />
                        ),
                      )}
                    </Picker>
                  </View>
                </View>
              )}
            </View>
          </View>
          <View style={styles.row}>
            <View className={styles.col}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Reference No. (Optional)</Text>
              <TextInput
                value={referenceNumber}
                onChangeText={setReferenceNumber}
                style={styles.input}
                placeholder="Reference"
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Description/Narration</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                style={styles.input}
                placeholder="Describe your transaction"
              />
            </View>
          </View>
        </>
      )}

      {/* SALES TAB */}
      {type === 'sales' && (
        <>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Customer Name</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={partyId} onValueChange={setPartyId}>
                  {parties.map(p => (
                    <Picker.Item key={p._id} label={p.name} value={p._id} />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                  setPartyModalType('customer');
                  setShowPartyModal(true);
                }}
              >
                <Text style={styles.linkText}>Create Customer</Text>
              </TouchableOpacity>
              {getPartyBalance(partyId) > 0 && (
                <Text style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>
                  Balance: ₹{getPartyBalance(partyId).toFixed(2)}
                </Text>
              )}
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={paymentMethod}
                  onValueChange={setPaymentMethod}
                >
                  <Picker.Item label="Cash" value="Cash" />
                  <Picker.Item label="Credit" value="Credit" />
                  <Picker.Item label="UPI" value="UPI" />
                  <Picker.Item label="Bank Transfer" value="Bank Transfer" />
                </Picker>
              </View>
              {paymentMethod !== 'Cash' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.smallLabel}>Bank</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={bankId} onValueChange={setBankId}>
                      {MOCK_BANKS.filter(b => b.companyId === companyId).map(
                        b => (
                          <Picker.Item
                            key={b._id}
                            label={b.bankName}
                            value={b._id}
                          />
                        ),
                      )}
                    </Picker>
                  </View>
                </View>
              )}
            </View>
          </View>
          {/* Shipping Address */}
          <View style={[styles.card, { marginTop: 8 }]}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <Switch
                value={shippingSameAsBilling}
                onValueChange={setShippingSameAsBilling}
              />
              <Text style={{ marginLeft: 8 }}>Same as billing address</Text>
            </View>
            {!shippingSameAsBilling && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                multiline
                numberOfLines={3}
                value={shippingAddress}
                onChangeText={setShippingAddress}
                placeholder="Enter shipping address"
              />
            )}
          </View>
          {/* Unified Items & Services Card */}
          <ItemsCard
            items={items}
            products={products}
            services={services}
            gstEnabled={gstEnabled}
            updateItem={updateItem}
            removeItem={removeItem}
            addProductRow={addProductRow}
            addServiceRow={addServiceRow}
            creatingForIndex={creatingForIndex}
            setCreatingForIndex={setCreatingForIndex}
            setShowProductModal={setShowProductModal}
            setShowServiceModal={setShowServiceModal}
            subTotal={subTotal}
            totalTax={totalTax}
            invoiceTotal={invoiceTotal}
            UNIT_TYPES={UNIT_TYPES}
            GST_OPTIONS={GST_OPTIONS}
            showTotals={true}
            showDescription={true}
            description={description}
            setDescription={setDescription}
            dontSendInvoice={dontSendInvoice}
            setDontSendInvoice={setDontSendInvoice}
            showSalesNotes={showSalesNotes}
            setShowSalesNotes={setShowSalesNotes}
            cardTitle="Items & Services"
          />
        </>
      )}

      {/* RECEIPT TAB (reference number optional, company/date/party) */}
      {type === 'receipt' && (
        <>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Received From</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={partyId} onValueChange={setPartyId}>
                  {parties.map(p => (
                    <Picker.Item key={p._id} label={p.name} value={p._id} />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                  setPartyModalType('customer');
                  setShowPartyModal(true);
                }}
              >
                <Text style={styles.linkText}>Create Customer</Text>
              </TouchableOpacity>
              {getPartyBalance(partyId) > 0 && (
                <Text style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>
                  Balance: ₹{getPartyBalance(partyId).toFixed(2)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Reference No. (Optional)</Text>
              <TextInput
                value={referenceNumber}
                onChangeText={setReferenceNumber}
                style={styles.input}
                placeholder="Reference"
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Description/Narration</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                style={styles.input}
                placeholder="Describe your transaction"
              />
            </View>
          </View>
        </>
      )}

      {/* Purchases, Journal fallback (company/date already at top) */}
      {type === 'purchases' && (
        <>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Vendor</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={vendorId} onValueChange={setVendorId}>
                  {vendors.map(v => (
                    <Picker.Item
                      key={v._id}
                      label={v.vendorName}
                      value={v._id}
                    />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                  setPartyModalType('vendor');
                  setShowPartyModal(true);
                }}
              >
                <Text style={styles.linkText}>Create Vendor</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={paymentMethod}
                  onValueChange={setPaymentMethod}
                >
                  <Picker.Item label="Cash" value="Cash" />
                  <Picker.Item label="Credit" value="Credit" />
                  <Picker.Item label="UPI" value="UPI" />
                  <Picker.Item label="Bank Transfer" value="Bank Transfer" />
                </Picker>
              </View>
              {paymentMethod !== 'Cash' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.smallLabel}>Bank</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={bankId} onValueChange={setBankId}>
                      {MOCK_BANKS.filter(b => b.companyId === companyId).map(
                        b => (
                          <Picker.Item
                            key={b._id}
                            label={b.bankName}
                            value={b._id}
                          />
                        ),
                      )}
                    </Picker>
                  </View>
                </View>
              )}
            </View>
          </View>
          {/* Unified Items & Services Card */}
          <ItemsCard
            items={items}
            products={products}
            services={services}
            gstEnabled={gstEnabled}
            updateItem={updateItem}
            removeItem={removeItem}
            addProductRow={addProductRow}
            addServiceRow={addServiceRow}
            creatingForIndex={creatingForIndex}
            setCreatingForIndex={setCreatingForIndex}
            setShowProductModal={setShowProductModal}
            setShowServiceModal={setShowServiceModal}
            subTotal={subTotal}
            totalTax={totalTax}
            invoiceTotal={invoiceTotal}
            UNIT_TYPES={UNIT_TYPES}
            GST_OPTIONS={GST_OPTIONS}
            showTotals={true}
            showDescription={false}
            cardTitle="Items & Services"
          />
        </>
      )}

      {/* JOURNAL TAB */}
      {type === 'journal' && (
        <View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Debit Account</Text>
              <TextInput
                value={fromAccount}
                onChangeText={setFromAccount}
                style={styles.input}
                placeholder="e.g., Rent Expense"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Credit Account</Text>
              <TextInput
                value={toAccount}
                onChangeText={setToAccount}
                style={styles.input}
                placeholder="e.g., Cash"
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Narration</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                style={styles.input}
                placeholder="Describe your transaction"
              />
            </View>
          </View>
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmit}
        activeOpacity={0.9}
      >
        <Text style={styles.submitText}>
          {transactionToEdit ? 'Update Transaction' : 'Create Transaction'}
        </Text>
      </TouchableOpacity>

      {/* Create Customer/Vendor Modal */}
      <Modal
        visible={showPartyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPartyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {partyModalType === 'vendor' ? 'Create Vendor' : 'Create Customer'}
              </Text>
              <TouchableOpacity onPress={() => setShowPartyModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
              {partyModalType === 'vendor' ? (
                <VendorForm
                  onSuccess={newVendor => {
                    setVendors(prev => [...prev, newVendor]);
                    setVendorId(newVendor._id);
                    setShowPartyModal(false);
                  }}
                />
              ) : (
                <CustomerForm
                  onSuccess={newParty => {
                    setParties(prev => [...prev, newParty]);
                    setPartyId(newParty._id);
                    setShowPartyModal(false);
                  }}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Product Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Product</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
              <ProductForm
                onSuccess={newProduct => {
                  setProducts(prev => [...prev, newProduct]);
                  if (
                    creatingForIndex !== null &&
                    creatingForIndex !== undefined
                  ) {
                    updateItem(creatingForIndex, 'product', newProduct._id);
                  }
                  setShowProductModal(false);
                  setCreatingForIndex(null);
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Service Modal */}
      <Modal
        visible={showServiceModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowServiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Service</Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
              {/* You should create a ServiceForm component similar to ProductForm */}
              {/* <ServiceForm
                onSuccess={newService => {
                  setServices(prev => [...prev, newService]);
                  if (
                    creatingForIndex !== null &&
                    creatingForIndex !== undefined
                  ) {
                    updateItem(creatingForIndex, 'service', newService._id);
                  }
                  setShowServiceModal(false);
                  setCreatingForIndex(null);
                }}
              /> */}
              <Text style={{ color: '#0f172a', padding: 12 }}>
                ServiceForm component not implemented. Please implement ServiceForm to enable service creation.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  col: { flex: 1 },
  label: { fontSize: 12, color: '#475569', marginBottom: 6 },
  smallLabel: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    minHeight: 40,
    justifyContent: 'center',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  linkButton: { marginTop: 6 },
  linkText: { color: '#2563eb', fontWeight: '600' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 10,
  },
  verticalItemBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 4,
  },
  itemFieldRow: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
  },
  amountBox: { justifyContent: 'center', alignItems: 'flex-end' },
  amountText: { fontWeight: '600', color: '#0f172a' },
  removeBtn: { padding: 8 },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A66C2',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 2,
  },
  addItemText: { color: '#fff', marginLeft: 8, fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalLabel: { fontSize: 14, color: '#334155' },
  totalValue: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  submitBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  submitText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  card: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  typeButtonRow: { flexDirection: 'row', gap: 10 },
  typeButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    marginRight: 8,
  },
  typeButtonActive: { backgroundColor: '#0A66C2' },
  typeButtonText: { color: '#334155', fontWeight: '600' },
  typeButtonTextActive: { color: '#fff' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30,41,59,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A66C2',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modalClose: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    paddingLeft: 8,
    paddingRight: 0,
    paddingVertical: 0,
  },
});

export { TransactionForm };
export default TransactionForm;