import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { PlusCircle, Trash2 } from 'lucide-react-native';
import CustomerForm from '../customers/CustomerForm';
import VendorForm from '../vendors/VendorForm';
import ProductForm from '../products/ProductForm';

// Simple hardcoded masters (mock data)
const MOCK_COMPANIES = [
  { _id: 'c1', businessName: 'Acme Pvt Ltd', gstin: '27ABCDE1234F1Z5' },
  { _id: 'c2', businessName: 'Globex Ltd', gstin: '' },
];

const MOCK_PARTIES = [
  { _id: 'p1', name: 'John Doe', contactNumber: '+91 90000 00001' },
  { _id: 'p2', name: 'Jane Smith', contactNumber: '+91 90000 00002' },
];

const MOCK_VENDORS = [
  { _id: 'v1', vendorName: 'Alpha Suppliers', contactNumber: '+91 98888 88888' },
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

const GST_OPTIONS = [
  { label: '0%', value: 0 },
  { label: '5%', value: 5 },
  { label: '18% (Standard)', value: 18 },
  { label: '28%', value: 28 },
];
const UNIT_TYPES = ['Piece', 'Kg', 'Litre', 'Box', 'Meter', 'Dozen', 'Pack', 'Other'];
const MOCK_BANKS = [
  { _id: 'b1', bankName: 'HDFC Bank', companyId: 'c1' },
  { _id: 'b2', bankName: 'ICICI Bank', companyId: 'c1' },
  { _id: 'b3', bankName: 'SBI', companyId: 'c2' },
];

function TransactionForm({
  onFormSubmit = () => {},
  defaultType = 'sales',
  transactionToEdit = null,
}) {
  const [type, setType] = useState(transactionToEdit && transactionToEdit.type ? transactionToEdit.type : defaultType);
  const [companyId, setCompanyId] = useState('c1');
  const [partyId, setPartyId] = useState('p1');
  const [vendorId, setVendorId] = useState('v1');
  const [date, setDate] = useState((transactionToEdit && transactionToEdit.date) || new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState((transactionToEdit && transactionToEdit.referenceNumber) || 'REF-001');
  const [paymentMethod, setPaymentMethod] = useState((transactionToEdit && transactionToEdit.paymentMethod) || 'Cash');
  const [notes, setNotes] = useState((transactionToEdit && transactionToEdit.notes) || '');
  const [dueDate, setDueDate] = useState((transactionToEdit && transactionToEdit.dueDate) || '');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [dontSendInvoice, setDontSendInvoice] = useState(false);
  const [showSalesNotes, setShowSalesNotes] = useState(false);
  const [bankId, setBankId] = useState((() => {
    const first = MOCK_BANKS.find(b => b.companyId === 'c1');
    return first ? first._id : '';
  })());

  const [items, setItems] = useState(
    (transactionToEdit && transactionToEdit.items) || [
      { id: '1', itemType: 'product', product: 'pr1', service: '', name: 'Product A', quantity: 1, unitType: 'Piece', pricePerUnit: 100, amount: 100, gstPercentage: 18, lineTax: 18, lineTotal: 118 },
    ]
  );

  const [companies, setCompanies] = useState(MOCK_COMPANIES);
  const [parties, setParties] = useState(MOCK_PARTIES);
  const [vendors, setVendors] = useState(MOCK_VENDORS);
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [services, setServices] = useState(MOCK_SERVICES);
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(true);
  const [shippingAddress, setShippingAddress] = useState('');

  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [creatingForIndex, setCreatingForIndex] = useState(null);

  const selectedCompany = useMemo(() => companies.find(c => c._id === companyId), [companies, companyId]);
  const gstEnabled = !!(selectedCompany && selectedCompany.gstin);

  const subTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + Number(it.amount || 0), 0);
  }, [items]);

  const totalTax = useMemo(() => {
    if (!gstEnabled) return 0;
    return items.reduce((sum, it) => sum + Number(it.lineTax || 0), 0);
  }, [items, gstEnabled]);

  const invoiceTotal = useMemo(() => subTotal + totalTax, [subTotal, totalTax]);

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { id: String(prev.length + 1), itemType: 'product', product: products[0]?._id || '', service: '', name: products[0]?.name || 'Item', quantity: 1, unitType: 'Piece', pricePerUnit: 0, amount: 0, hsnCode: '-', gstPercentage: 18, lineTax: 0, lineTotal: 0 },
    ]);
  };

  const addProductRow = () => {
    setItems(prev => [
      ...prev,
      { id: String(prev.length + 1), itemType: 'product', product: products[0]?._id || '', service: '', name: products[0]?.name || 'Product', quantity: 1, unitType: products[0]?.unit || 'Piece', pricePerUnit: 0, amount: 0, hsnCode: '-', gstPercentage: 18, lineTax: 0, lineTotal: 0 },
    ]);
  };

  const addServiceRow = () => {
    setItems(prev => [
      ...prev,
      { id: String(prev.length + 1), itemType: 'service', product: '', service: services[0]?._id || '', name: services[0]?.serviceName || 'Service', quantity: '', unitType: '', pricePerUnit: '', amount: 0, hsnCode: '-', gstPercentage: 18, lineTax: 0, lineTotal: 0 },
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
          updated.name = products.find(p => p._id === updated.product)?.name || 'Product';
          updated.quantity = 1;
          updated.pricePerUnit = 0;
        } else {
          updated.product = '';
          updated.service = services[0]?._id || '';
          updated.name = services.find(s => s._id === updated.service)?.serviceName || 'Service';
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
      const base = updated.itemType === 'product' ? Math.max(0, qty * rate) : Number(updated.amount || 0);
      updated.amount = base;

      // GST calculation per line
      const pct = gstEnabled ? Number(updated.gstPercentage || 0) : 0;
      const lineTax = +(base * pct / 100).toFixed(2);
      const lineTotal = +(base + lineTax).toFixed(2);
      updated.lineTax = lineTax;
      updated.lineTotal = lineTotal;

      next[index] = updated;
      return next;
    });
  };

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const payload = {
      type,
      company: companyId,
      party: type === 'purchases' || type === 'payment' ? undefined : partyId,
      vendor: type === 'purchases' || type === 'payment' ? vendorId : undefined,
      date,
      referenceNumber,
      paymentMethod,
      notes,
      fromAccount,
      toAccount,
      totalAmount: invoiceTotal,
      subTotal,
      taxAmount: totalTax,
      items: type === 'sales' || type === 'purchases' ? items : [],
      bank: paymentMethod !== 'Cash' ? bankId : undefined,
      dontSendInvoice: type === 'sales' ? dontSendInvoice : undefined,
      amount: type === 'receipt' || type === 'payment' || type === 'journal' ? Number(amount || 0) : undefined,
    };
    onFormSubmit(payload);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Transaction Details</Text>

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={type} onValueChange={setType}>
              <Picker.Item label="Sales" value="sales" />
              <Picker.Item label="Purchases" value="purchases" />
              <Picker.Item label="Receipt" value="receipt" />
              <Picker.Item label="Payment" value="payment" />
              <Picker.Item label="Journal" value="journal" />
            </Picker>
          </View>
        </View>

        <View style={styles.col}>
          <Text style={styles.label}>Date</Text>
          <TextInput value={date} onChangeText={setDate} style={styles.input} placeholder="YYYY-MM-DD" />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Due Date</Text>
          <TextInput value={dueDate} onChangeText={setDueDate} style={styles.input} placeholder="YYYY-MM-DD" />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Company</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={companyId} onValueChange={setCompanyId}>
              {companies.map(c => (
                <Picker.Item key={c._id} label={c.businessName} value={c._id} />
              ))}
            </Picker>
          </View>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Reference No.</Text>
          <TextInput value={referenceNumber} onChangeText={setReferenceNumber} style={styles.input} placeholder="Reference" />
        </View>
      </View>

      {type === 'sales' || type === 'receipt' ? (
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>{type === 'sales' ? 'Customer' : 'Received From'}</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={partyId} onValueChange={setPartyId}>
                {parties.map(p => (
                  <Picker.Item key={p._id} label={p.name} value={p._id} />
                ))}
              </Picker>
            </View>
           
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={paymentMethod} onValueChange={(v)=>{ setPaymentMethod(v); }}>
                <Picker.Item label="Cash" value="Cash" />
                <Picker.Item label="Credit" value="Credit" />
                <Picker.Item label="UPI" value="UPI" />
                <Picker.Item label="Bank Transfer" value="Bank Transfer" />
              </Picker>
            </View>
            {paymentMethod !== 'Cash' ? (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.smallLabel}>Bank</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={bankId} onValueChange={setBankId}>
                    {MOCK_BANKS.filter(b => b.companyId === companyId).map(b => (
                      <Picker.Item key={b._id} label={b.bankName} value={b._id} />
                    ))}
                  </Picker>
                </View>
              </View>
            ) : null}
      {/* Shipping Address */}
      {type === 'sales' ? (
        <View style={[styles.card, { marginTop: 8 }]}> 
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Switch value={shippingSameAsBilling} onValueChange={setShippingSameAsBilling} />
            <Text style={{ marginLeft: 8 }}>Same as billing address</Text>
          </View>
          {!shippingSameAsBilling ? (
            <TextInput style={[styles.input, { marginTop: 8 }]} multiline numberOfLines={3} value={shippingAddress} onChangeText={setShippingAddress} placeholder="Enter shipping address" />
          ) : null}
        </View>
      ) : null}
          </View>
        </View>
      ) : null}

      {type === 'purchases' || type === 'payment' ? (
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>{type === 'purchases' ? 'Vendor' : 'Paid To'}</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={vendorId} onValueChange={setVendorId}>
                {vendors.map(v => (
                  <Picker.Item key={v._id} label={v.vendorName} value={v._id} />
                ))}
              </Picker>
            </View>
            <TouchableOpacity style={styles.linkButton} onPress={() => setShowPartyModal(true)}>
              <Text style={styles.linkText}>Create Vendor</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={paymentMethod} onValueChange={setPaymentMethod}>
                <Picker.Item label="Cash" value="Cash" />
                <Picker.Item label="Credit" value="Credit" />
                <Picker.Item label="UPI" value="UPI" />
                <Picker.Item label="Bank Transfer" value="Bank Transfer" />
              </Picker>
            </View>
            {paymentMethod !== 'Cash' ? (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.smallLabel}>Bank</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={bankId} onValueChange={setBankId}>
                    {MOCK_BANKS.filter(b => b.companyId === companyId).map(b => (
                      <Picker.Item key={b._id} label={b.bankName} value={b._id} />
                    ))}
                  </Picker>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {type === 'journal' ? (
        <View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Debit Account</Text>
              <TextInput value={fromAccount} onChangeText={setFromAccount} style={styles.input} placeholder="e.g., Rent Expense" />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Credit Account</Text>
              <TextInput value={toAccount} onChangeText={setToAccount} style={styles.input} placeholder="e.g., Cash" />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Amount</Text>
              <TextInput value={amount} onChangeText={setAmount} style={styles.input} placeholder="0.00" keyboardType="numeric" />
            </View>
          </View>
        </View>
      ) : null}

      {type === 'receipt' || type === 'payment' ? (
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Amount</Text>
            <TextInput value={amount} onChangeText={setAmount} style={styles.input} placeholder="0.00" keyboardType="numeric" />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Notes</Text>
            <TextInput value={notes} onChangeText={setNotes} style={styles.input} placeholder="Optional" />
          </View>
        </View>
      ) : null}

      {type === 'sales' || type === 'purchases' ? (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Items</Text>
          {items.map((item, index) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={[styles.col, { flex: 0.9 }]}>
                <Text style={styles.smallLabel}>Type</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={item.itemType} onValueChange={(v) => updateItem(index, 'itemType', v)}>
                    <Picker.Item label="Product" value="product" />
                    <Picker.Item label="Service" value="service" />
                  </Picker>
                </View>
              </View>

              {item.itemType === 'product' ? (
                <View style={[styles.col, { flex: 1.5 }]}>
                  <Text style={styles.smallLabel}>Product</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={item.product} onValueChange={(v) => updateItem(index, 'product', v)}>
                      {products.map(p => (
                        <Picker.Item key={p._id} label={p.name} value={p._id} />
                      ))}
                    </Picker>
                  </View>
                  <TouchableOpacity style={styles.linkButton} onPress={() => { setCreatingForIndex(index); setShowProductModal(true); }}>
                    <Text style={styles.linkText}>Create Product</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.col, { flex: 1.5 }]}>
                  <Text style={styles.smallLabel}>Service</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={item.service} onValueChange={(v) => updateItem(index, 'service', v)}>
                      {services.map(s => (
                        <Picker.Item key={s._id} label={s.serviceName} value={s._id} />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}

              {item.itemType === 'product' ? (
                <>
                  <View style={styles.col}>
                    <Text style={styles.smallLabel}>Qty</Text>
                    <TextInput value={String(item.quantity)} onChangeText={(v) => updateItem(index, 'quantity', v)} style={styles.input} keyboardType="numeric" placeholder="0" />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.smallLabel}>Unit</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker selectedValue={item.unitType || 'Piece'} onValueChange={(v) => updateItem(index, 'unitType', v)}>
                        {UNIT_TYPES.map(u => (<Picker.Item key={u} label={u} value={u} />))}
                      </Picker>
                    </View>
                    {(item.unitType === 'Other') ? (
                      <TextInput style={[styles.input, { marginTop: 6 }]} placeholder="Specify unit" value={item.otherUnit || ''} onChangeText={(v)=> updateItem(index, 'otherUnit', v)} />
                    ) : null}
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.smallLabel}>Rate</Text>
                    <TextInput value={String(item.pricePerUnit)} onChangeText={(v) => updateItem(index, 'pricePerUnit', v)} style={styles.input} keyboardType="numeric" placeholder="0" />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.smallLabel}>HSN Code</Text>
                    <TextInput value={String(item.hsnCode || '-')} onChangeText={(v)=> updateItem(index, 'hsnCode', v)} style={styles.input} placeholder="-" />
                  </View>
                </>
              ) : (
                <View style={styles.col}>
                  <Text style={styles.smallLabel}>Amount</Text>
                  <TextInput value={String(item.amount || 0)} onChangeText={(v) => updateItem(index, 'amount', v)} style={styles.input} keyboardType="numeric" placeholder="0" />
                </View>
              )}

              {gstEnabled ? (
                <View style={styles.col}>
                  <Text style={styles.smallLabel}>GST %</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={Number(item.gstPercentage || 0)} onValueChange={(v) => updateItem(index, 'gstPercentage', v)}>
                      {GST_OPTIONS.map(opt => (
                        <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                      ))}
                    </Picker>
                  </View>
                </View>
              ) : null}

              <View style={[styles.col, { flex: 0.9 }]}> 
                <Text style={styles.smallLabel}>Amt</Text>
                <View style={[styles.input, styles.amountBox]}>
                  <Text style={styles.amountText}>₹{Number(item.amount).toFixed(2)}</Text>
                </View>
              </View>
              <View style={[styles.col, { flex: 0.9 }]}> 
                <Text style={styles.smallLabel}>Total</Text>
                <View style={[styles.input, styles.amountBox]}>
                  <Text style={styles.amountText}>₹{Number(item.lineTotal || item.amount).toFixed(2)}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(index)}>
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.addItemBtn} onPress={addProductRow} activeOpacity={0.8}>
              <PlusCircle size={18} color="#fff" />
              <Text style={styles.addItemText}>Add Product</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addItemBtn, { backgroundColor: '#16a34a' }]} onPress={addServiceRow} activeOpacity={0.8}>
              <PlusCircle size={18} color="#fff" />
              <Text style={styles.addItemText}>Add Service</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {(type === 'sales' || type === 'purchases') ? (
        <>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>₹{subTotal.toFixed(2)}</Text>
          </View>
          {gstEnabled ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST</Text>
              <Text style={styles.totalValue}>₹{totalTax.toFixed(2)}</Text>
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Invoice Total</Text>
            <Text style={styles.totalValue}>₹{invoiceTotal.toFixed(2)}</Text>
          </View>

          {type === 'sales' ? (
            <View style={[styles.card, { marginTop: 8 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.label}>Don't Send Invoice</Text>
                <Switch value={dontSendInvoice} onValueChange={setDontSendInvoice} />
              </View>
              {!showSalesNotes ? (
                <TouchableOpacity style={[styles.addItemBtn, { backgroundColor: '#e2e8f0', marginTop: 8 }]} onPress={() => setShowSalesNotes(true)}>
                  <Text style={[styles.addItemText, { color: '#0f172a' }]}>Add Notes</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.smallLabel}>Notes</Text>
                  <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} multiline value={notes} onChangeText={setNotes} placeholder="Add detailed notes..." />
                </View>
              )}
            </View>
          ) : null}
        </>
      ) : null}

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.9}>
        <Text style={styles.submitText}>{transactionToEdit ? 'Update Transaction' : 'Save Transaction'}</Text>
      </TouchableOpacity>

      {/* Create Party Modal */}
      <Modal visible={showPartyModal} animationType="slide" onRequestClose={() => setShowPartyModal(false)}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Create {type === 'purchases' || type === 'payment' ? 'Vendor' : 'Customer'}</Text>
          {type === 'purchases' || type === 'payment' ? (
            <VendorForm onSuccess={(newVendor) => { setVendors(prev => [...prev, newVendor]); setVendorId(newVendor._id); setShowPartyModal(false); }} />
          ) : (
            <CustomerForm onSuccess={(newParty) => { setParties(prev => [...prev, newParty]); setPartyId(newParty._id); setShowPartyModal(false); }} />
          )}
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#ef4444' }]} onPress={() => setShowPartyModal(false)}>
            <Text style={styles.submitText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* Create Product Modal */}
      <Modal visible={showProductModal} animationType="slide" onRequestClose={() => setShowProductModal(false)}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Create Product</Text>
          <ProductForm onSuccess={(newProduct) => {
            setProducts(prev => [...prev, newProduct]);
            if (creatingForIndex !== null && creatingForIndex !== undefined) {
              updateItem(creatingForIndex, 'product', newProduct._id);
            }
            setShowProductModal(false);
            setCreatingForIndex(null);
          }} />
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#ef4444' }]} onPress={() => setShowProductModal(false)}>
            <Text style={styles.submitText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 6,
  },
  smallLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  linkButton: {
    marginTop: 6,
  },
  linkText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 10,
  },
  amountBox: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  amountText: {
    fontWeight: '600',
    color: '#0f172a',
  },
  removeBtn: {
    padding: 8,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A66C2',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 2,
  },
  addItemText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalLabel: {
    fontSize: 14,
    color: '#334155',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  submitBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  submitText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
  },
});

export { TransactionForm };
export default TransactionForm;
