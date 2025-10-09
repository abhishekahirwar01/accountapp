import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import InvoicePreview from '../../components/invoices/InvoicePreview';
import columns from '../../components/transactions/columns';
import DataTable from '../../components/transactions/DataTable';
import TransactionForm from '../../components/transactions/TransactionForm';

// ===========================
// Hardcoded Dummy Data
// ===========================
const DUMMY_COMPANIES = [
  { _id: 'c1', businessName: 'Acme Corp' },
  { _id: 'c2', businessName: 'Globex Ltd' },
];
const DUMMY_PARTIES = [
  { _id: 'p1', name: 'John Doe', email: 'john@example.com' },
  { _id: 'p2', name: 'Jane Smith', email: 'jane@example.com' },
];
const DUMMY_PRODUCTS = [
  { _id: 'prod1', name: 'Widget' },
  { _id: 'prod2', name: 'Gadget' },
];
const DUMMY_SERVICES = [
  { _id: 'srv1', serviceName: 'Consulting' },
  { _id: 'srv2', serviceName: 'Development' },
];
const DUMMY_TRANSACTIONS = [
  {
    _id: 't1',
    date: '2025-10-01',
    type: 'sales',
    company: 'c1',
    party: 'p1',
    amount: 10000,
    products: [
      {
        product: 'prod1',
        quantity: 2,
        unitType: 'pcs',
        pricePerUnit: 5000,
        amount: 10000,
      },
    ],
    services: [],
  },
  {
    _id: 't2',
    date: '2025-10-02',
    type: 'purchases',
    company: 'c2',
    party: 'p2',
    amount: 7000,
    products: [
      {
        product: 'prod2',
        quantity: 1,
        unitType: 'pcs',
        pricePerUnit: 7000,
        amount: 7000,
      },
    ],
    services: [],
  },
  {
    _id: 't3',
    date: '2025-10-03',
    type: 'receipt',
    company: 'c1',
    party: 'p1',
    amount: 5000,
    products: [],
    services: [],
  },
  {
    _id: 't4',
    date: '2025-10-04',
    type: 'payment',
    company: 'c2',
    party: 'p2',
    amount: 3000,
    products: [],
    services: [],
  },
  {
    _id: 't5',
    date: '2025-10-05',
    type: 'journal',
    company: 'c1',
    party: null,
    amount: 1200,
    products: [],
    services: [
      { service: 'srv1', description: 'Yearly consulting', amount: 1200 },
    ],
    narration: 'Yearly consulting adjustment',
    description: 'Yearly consulting adjustment',
  },
];

const formatCurrency = amount => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

const TABS = [
  { key: 'all', label: 'All', icon: 'view-list' },
  { key: 'sales', label: 'Sales', icon: 'trending-up' },
  { key: 'purchases', label: 'Purchases', icon: 'cart' },
  { key: 'receipt', label: 'Receipts', icon: 'receipt' },
  { key: 'payment', label: 'Payments', icon: 'credit-card' },
  { key: 'journal', label: 'Journals', icon: 'file-document' },
];

// User permission simulation
const USER_ROLE = 'master'; // 'master', 'client', or null
const USER_CAPS = {
  canCreateSaleEntries: true,
  canCreatePurchaseEntries: true,
  canCreateReceiptEntries: true,
  canCreatePaymentEntries: true,
  canCreateJournalEntries: true,
};

// ===========================
// Main Component
// ===========================
export default function TransactionsScreen() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isItemsDialogOpen, setIsItemsDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [transactionToPreview, setTransactionToPreview] = useState(null);
  const [itemsToView, setItemsToView] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(false);

  // Simulate initial fetch
  const [companies] = useState(DUMMY_COMPANIES);
  const [parties] = useState(DUMMY_PARTIES);
  const [productsList] = useState(DUMMY_PRODUCTS);
  const [servicesList] = useState(DUMMY_SERVICES);
  const [transactions, setTransactions] = useState(DUMMY_TRANSACTIONS);

  // Permissions
  const isSuper = USER_ROLE === 'master' || USER_ROLE === 'client';
  const canSales = isSuper || !!USER_CAPS.canCreateSaleEntries;
  const canPurchases = isSuper || !!USER_CAPS.canCreatePurchaseEntries;
  const canReceipt = isSuper || !!USER_CAPS.canCreateReceiptEntries;
  const canPayment = isSuper || !!USER_CAPS.canCreatePaymentEntries;
  const canJournal = isSuper || !!USER_CAPS.canCreateJournalEntries;
  const allowedTypes = useMemo(() => {
    const arr = [];
    if (canSales) arr.push('sales');
    if (canPurchases) arr.push('purchases');
    if (canReceipt) arr.push('receipt');
    if (canPayment) arr.push('payment');
    if (canJournal) arr.push('journal');
    return arr;
  }, [canSales, canPurchases, canReceipt, canPayment, canJournal]);
  const canCreateAny = allowedTypes.length > 0;

  // Lookup maps
  const productNameById = useMemo(() => {
    const m = new Map();
    for (const p of productsList) m.set(p._id, p.name || '(unnamed product)');
    return m;
  }, [productsList]);
  const serviceNameById = useMemo(() => {
    const m = new Map();
    for (const s of servicesList) m.set(s._id, s.serviceName);
    return m;
  }, [servicesList]);
  const companyMap = useMemo(() => {
    const m = new Map();
    companies.forEach(c => m.set(c._id, c.businessName));
    return m;
  }, [companies]);
  const partyMap = useMemo(() => {
    const m = new Map();
    parties.forEach(p => m.set(p._id, p.name));
    return m;
  }, [parties]);

  // Transaction Data Filtering
  const filteredData = useMemo(() => {
    if (activeTab === 'all') return transactions;
    return transactions.filter(t => t.type === activeTab);
  }, [activeTab, transactions]);

  // Handlers
  const handleOpenForm = (tx = null) => {
    setTransactionToEdit(tx);
    setIsFormOpen(true);
  };
  const handleOpenDeleteDialog = tx => {
    setTransactionToDelete(tx);
    setIsAlertOpen(true);
  };
  const handleOpenPreviewDialog = tx => {
    setTransactionToPreview(tx);
    setIsPreviewOpen(true);
  };
  const handleViewItems = tx => {
    const prods = (tx.products || []).map(p => ({
      itemType: 'product',
      name: productNameById.get(p.product) || p.product?.name || '(product)',
      quantity: p.quantity ?? '',
      unitType: p.unitType ?? '',
      pricePerUnit: p.pricePerUnit ?? '',
      description: '',
      amount: Number(p.amount) || 0,
    }));
    const svcArr = Array.isArray(tx.services)
      ? tx.services
      : Array.isArray(tx.service)
      ? tx.service
      : tx.services
      ? [tx.services]
      : [];
    const svcs = svcArr.map(s => {
      const id =
        typeof s.service === 'object'
          ? s.service._id
          : s.service ??
            (typeof s.serviceName === 'object'
              ? s.serviceName._id
              : s.serviceName);
      const name =
        (id && serviceNameById.get(String(id))) ||
        (typeof s.service === 'object' && s.service.serviceName) ||
        (typeof s.serviceName === 'object' && s.serviceName.serviceName) ||
        '(service)';
      return {
        itemType: 'service',
        name,
        quantity: '',
        unitType: '',
        pricePerUnit: '',
        description: s.description || '',
        amount: Number(s.amount) || 0,
      };
    });
    setItemsToView([...prods, ...svcs]);
    setIsItemsDialogOpen(true);
  };
  const handleDeleteTransaction = () => {
    setTransactions(prev =>
      prev.filter(t => t._id !== transactionToDelete._id),
    );
    setIsAlertOpen(false);
    setTransactionToDelete(null);
  };
  const handleUpdateTransaction = updatedTransaction => {
    setTransactions(prev =>
      prev.map(t =>
        t._id === updatedTransaction._id ? updatedTransaction : t,
      ),
    );
    setIsFormOpen(false);
    setTransactionToEdit(null);
  };
  const handleSendInvoice = tx => {
    alert(`Invoice sent to ${partyMap.get(tx.party) || 'customer'}`);
  };

  // Renderers
  const renderTabButton = tab => {
    // Only show allowed tabs
    if (
      (tab.key === 'sales' && !canSales) ||
      (tab.key === 'purchases' && !canPurchases) ||
      (tab.key === 'receipts' && !canReceipt) ||
      (tab.key === 'payments' && !canPayment) ||
      (tab.key === 'journals' && !canJournal)
    ) {
      return null;
    }
    return (
      <TouchableOpacity
        key={tab.key}
        style={[
          styles.tabButton,
          activeTab === tab.key && styles.tabButtonActive,
        ]}
        onPress={() => setActiveTab(tab.key)}
      >
        <Icon
          name={tab.icon}
          size={20}
          style={activeTab === tab.key ? styles.tabIconActive : styles.tabIcon}
        />
        <Text
          style={
            activeTab === tab.key ? styles.tabLabelActive : styles.tabLabel
          }
        >
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // DataTable columns config
  const tableColumns = columns({
    onViewItems: handleViewItems,
    onPreview: handleOpenPreviewDialog,
    onEdit: handleOpenForm,
    onDelete: handleOpenDeleteDialog,
    companyMap,
    serviceNameById,
    onSendInvoice: handleSendInvoice,
  });

  // Loading and No Company UI
  if (loading) {
    return (
      <View style={styles.centeredFull}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }
  if (!companies.length) {
    return (
      <View style={styles.centeredFull}>
        <View style={styles.companyCard}>
          <Icon name="office-building" size={40} color="#2563eb" />
          <Text style={styles.companyTitle}>Company Setup Required</Text>
          <Text style={styles.companyDesc}>
            Contact us to enable your company account and access all features.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => alert('Call +91-8989773689')}
          >
            <Icon name="phone" size={22} color="#fff" />
            <Text style={styles.ctaButtonText}>+91-8989773689</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ctaButtonOutline}
            onPress={() => alert('Email: support@company.com')}
          >
            <Icon name="email" size={22} color="#2563eb" />
            <Text style={styles.ctaButtonOutlineText}>Email Us</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Transactions</Text>
            <Text style={styles.subtitle}>
              A list of all financial activities for the selected company.
            </Text>
          </View>
          {canCreateAny && (
            <TouchableOpacity
              style={styles.newButton}
              onPress={() => handleOpenForm()}
            >
              <Icon name="plus-circle" size={20} color="#fff" />
              <Text style={styles.newButtonText}>New Transaction</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          style={styles.tabRow}
          showsHorizontalScrollIndicator={false}
        >
          {TABS.map(renderTabButton)}
        </ScrollView>

        {/* TABLE */}
        <View style={styles.tableWrapper}>
          <DataTable
            columns={tableColumns}
            data={filteredData}
            companyMap={companyMap}
            partyMap={partyMap}
          />
        </View>
      </ScrollView>

      {/* Transaction Form Modal */}
      <Modal visible={isFormOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <TransactionForm
              transactionToEdit={transactionToEdit}
              onFormSubmit={handleUpdateTransaction}
              defaultType={
                transactionToEdit
                  ? transactionToEdit.type
                  : allowedTypes[0] || 'sales'
              }
              transaction={transactionToEdit}
              company={
                companies.find(c => c._id === transactionToEdit?.company) ||
                null
              }
              party={
                parties.find(p => p._id === transactionToEdit?.party) || null
              }
              serviceNameById={serviceNameById}
              onClose={() => setIsFormOpen(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Delete Dialog */}
      <Modal visible={isAlertOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.alertModal}>
            <Text style={styles.alertTitle}>Are you absolutely sure?</Text>
            <Text style={styles.alertDesc}>
              This action cannot be undone. This will permanently delete the
              transaction.
            </Text>
            <View style={styles.alertActions}>
              <TouchableOpacity
                onPress={() => setIsAlertOpen(false)}
                style={styles.alertCancel}
              >
                <Text style={styles.alertCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteTransaction}
                style={styles.alertContinue}
              >
                <Text style={styles.alertContinueText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invoice Preview Modal */}
      <Modal visible={isPreviewOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.previewModal}>
            {transactionToPreview && (
              <InvoicePreview
                transaction={transactionToPreview}
                company={
                  companies.find(c => c._id === transactionToPreview.company) ||
                  null
                }
                party={
                  parties.find(p => p._id === transactionToPreview.party) ||
                  null
                }
                serviceNameById={serviceNameById}
                onClose={() => setIsPreviewOpen(false)}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Items Dialog Modal */}
      <Modal visible={isItemsDialogOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.itemsModal}>
            <Text style={styles.itemsTitle}>Item Details</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {itemsToView.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon
                      name={item.itemType === 'service' ? 'server' : 'cube'}
                      size={18}
                      color="#6b7280"
                    />
                    <Text style={{ marginLeft: 8, fontWeight: 'bold' }}>
                      {item.name ?? '—'}
                    </Text>
                  </View>
                  {item.itemType === 'service' && !!item.description && (
                    <Text
                      style={{
                        color: '#6b7280',
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    >
                      {item.description}
                    </Text>
                  )}
                  <View style={styles.itemDetailsRow}>
                    <Text style={styles.itemDetail}>
                      Type:{' '}
                      <Text style={{ fontWeight: 'bold' }}>
                        {item.itemType}
                      </Text>
                    </Text>
                    <Text style={styles.itemDetail}>
                      Qty:{' '}
                      <Text style={{ fontWeight: 'bold' }}>
                        {item.quantity || '—'}
                      </Text>
                    </Text>
                    <Text style={styles.itemDetail}>
                      Price:{' '}
                      <Text style={{ fontWeight: 'bold' }}>
                        {item.pricePerUnit
                          ? formatCurrency(Number(item.pricePerUnit))
                          : '—'}
                      </Text>
                    </Text>
                    <Text style={styles.itemDetail}>
                      Total:{' '}
                      <Text style={{ fontWeight: 'bold' }}>
                        {formatCurrency(Number(item.amount))}
                      </Text>
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setIsItemsDialogOpen(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ===========================
// Styles
// ===========================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7fc' },
  centeredFull: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#22223b' },
  subtitle: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  newButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '500',
    fontSize: 15,
  },
  tabRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 10 },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 22,
    backgroundColor: '#e0e7ff',
  },
  tabButtonActive: { backgroundColor: '#6366f1' },
  tabIcon: { color: '#6366f1' },
  tabIconActive: { color: '#fff' },
  tabLabel: { marginLeft: 6, color: '#6366f1', fontWeight: 'bold' },
  tabLabelActive: { marginLeft: 6, color: '#fff', fontWeight: 'bold' },
  tableWrapper: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 12,
    width: '90%',
    maxHeight: '90%',
  },
  alertModal: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    minWidth: 280,
    alignItems: 'center',
  },
  alertTitle: { fontWeight: 'bold', fontSize: 17, marginBottom: 6 },
  alertDesc: { color: '#6b7280', textAlign: 'center', marginBottom: 18 },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  alertCancel: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    marginRight: 6,
  },
  alertContinue: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    marginLeft: 6,
  },
  alertCancelText: { color: '#22223b', fontWeight: 'bold' },
  alertContinueText: { color: '#fff', fontWeight: 'bold' },
  previewModal: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 10,
    width: '95%',
    maxHeight: '93%',
  },
  itemsModal: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    width: '92%',
    maxHeight: '90%',
  },
  itemsTitle: {
    fontWeight: 'bold',
    fontSize: 19,
    marginBottom: 10,
    alignSelf: 'center',
  },
  itemRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
    paddingVertical: 10,
  },
  itemDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  itemDetail: { fontSize: 13, color: '#374151', marginRight: 10 },
  closeButton: {
    marginTop: 15,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 9,
    alignSelf: 'center',
    width: 110,
  },
  closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  companyCard: {
    backgroundColor: '#ecf2fe',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    maxWidth: 320,
  },
  companyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22223b',
    marginTop: 10,
  },
  companyDesc: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 8,
  },
  ctaButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  ctaButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#2563eb',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 8,
  },
  ctaButtonOutlineText: { color: '#2563eb', fontWeight: 'bold', marginLeft: 8 },
});
