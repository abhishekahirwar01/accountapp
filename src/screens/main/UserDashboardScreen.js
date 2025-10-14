import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import {
  IndianRupee,
  CreditCard,
  Users,
  Building,
  PlusCircle,
  Settings,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import RecentTransactions from '../../components/dashboard/RecentTransactions';
import ProductStock from '../../components/dashboard/ProductStock';
import TransactionForm from '../../components/transactions/TransactionForm';
import TransactionsScreen from './TransactionsScreen';
import InventoryScreen from './InventoryScreen';
import UpdateWalkthrough from '../../components/notifications/UpdateWalkthrough';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

export default function UserDashboardScreen({ navigation, route }) {
  const { username = 'User', role = 'user' } = route?.params || {};

  // --- State & Hooks (all at top level)
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);

  const companies = [
    { _id: 'c1', businessName: 'Sharda Associates' },
    { _id: 'c2', businessName: 'Finaxis Consultancy' },
  ];
  const selectedCompanyId = null;

  const selectedCompany = useMemo(
    () => (selectedCompanyId ? companies.find((c) => c._id === selectedCompanyId) || null : null),
    [companies, selectedCompanyId]
  );

  const serviceNameById = useMemo(() => {
    const m = new Map();
    m.set('s1', 'GST Filing');
    m.set('s2', 'ITR Filing');
    m.set('s3', 'Project Report');
    return m;
  }, []);

  const allTransactions = [
    { id: 't1', type: 'sales', date: '2025-09-25', amount: 25000, serviceId: 's3', partyName: 'Aparajita Logistics Pvt Ltd', narration: 'DPR fees received' },
    { id: 't2', type: 'purchases', date: '2025-09-23', totalAmount: 8000, serviceId: 's2', partyName: 'AWS (infra)', narration: 'Server cost' },
    { id: 't3', type: 'receipt', date: '2025-09-22', amount: 12000, serviceId: 's1', partyName: 'Kailash Real Estate', narration: 'Advance for GST' },
    { id: 't4', type: 'payment', date: '2025-09-20', amount: 4500, serviceId: 's1', partyName: 'Tally Prime License', narration: 'Monthly fee' },
    { id: 't5', type: 'journal', date: '2025-09-18', narration: 'Year-end adjustments' },
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const [recentTransactions, setRecentTransactions] = useState(allTransactions.slice(0, 5));

  const totalSales = allTransactions.filter(t => t.type === 'sales').reduce((a, t) => a + (t.amount || t.totalAmount || 0), 0);
  const totalPurchases = allTransactions.filter(t => t.type === 'purchases').reduce((a, t) => a + (t.amount || t.totalAmount || 0), 0);

  const isAdmin = role === 'admin';
  const companyData = {
    totalSales,
    totalPurchases,
    users: isAdmin ? 12 : 0,
    companies: selectedCompanyId ? 1 : companies.length,
  };

  // --- KPI Cards
  const kpis = [
    { key: 'sales', title: 'Total Sales', value: formatCurrency(companyData.totalSales), icon: IndianRupee, description: selectedCompanyId ? 'For selected company' : 'Across all companies', show: true },
    { key: 'purchases', title: 'Total Purchases', value: formatCurrency(companyData.totalPurchases), icon: CreditCard, show: true },
    { key: 'users', title: 'Active Users', value: companyData.users.toString(), icon: Users, show: isAdmin },
    { key: 'companies', title: 'Companies', value: companyData.companies.toString(), icon: Building, show: true },
  ].filter(k => k.show);

  // --- Handlers
  const handleTransactionFormSubmit = (newTransaction) => {
    if (newTransaction) {
      const updated = [newTransaction, ...recentTransactions.slice(0, 4)];
      setRecentTransactions(updated);
    }
    Toast.show({ type: 'success', text1: 'Transaction Saved', text2: 'Your transaction has been successfully recorded!', position: 'bottom' });
    setIsTransactionFormOpen(false);
  };

  const handleSettingsPress = () => {
    navigation.navigate('ProfileScreen');
  };

  // --- Components
  const KPICard = ({ title, value, Icon, description }) => (
    <View style={[styles.kpiCard, { width: SCREEN_WIDTH * 0.6 }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Icon size={18} color="#666" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardValue}>{value}</Text>
        {description && <Text style={styles.cardDescription}>{description}</Text>}
      </View>
    </View>
  );

  const SolidButton = ({ onPress, children }) => (
    <TouchableOpacity onPress={onPress} style={[styles.btn, styles.btnSolid]} activeOpacity={0.85}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>{children}</View>
    </TouchableOpacity>
  );

  const OutlineButton = ({ onPress, children }) => (
    <TouchableOpacity onPress={onPress} style={[styles.btn, styles.btnOutline]} activeOpacity={0.85}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>{children}</View>
    </TouchableOpacity>
  );

  // --- Render Dashboard
  const renderDashboard = () => (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.subtitle}>
            {selectedCompany ? `An overview of ${selectedCompany.businessName}.` : 'An overview across your accessible companies.'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <UpdateWalkthrough />
          <OutlineButton onPress={handleSettingsPress}>
            <Settings size={16} style={{ marginRight: 8 }} />
            <Text>Settings</Text>
          </OutlineButton>
          {isAdmin && (
            <SolidButton onPress={() => setIsTransactionFormOpen(true)}>
              <PlusCircle size={16} style={{ marginRight: 8 }} />
              <Text style={{ color: 'white' }}>New Transaction</Text>
            </SolidButton>
          )}
        </View>
      </View>

      {/* KPI Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
        {kpis.map(k => (
          <KPICard key={k.key} title={k.title} value={k.value} Icon={k.icon} description={k.description} />
        ))}
      </ScrollView>

      {/* Product Stock + Recent Transactions */}
      <View style={styles.contentGrid}>
        <ProductStock
          items={[
            { id: 'p1', name: 'Thermal Paper', qty: 120, unit: 'rolls' },
            { id: 'p2', name: 'A4 Sheets', qty: 45, unit: 'reams' },
            { id: 'p3', name: 'Printer Ink', qty: 12, unit: 'bottles' },
          ]}
        />
        <RecentTransactions transactions={recentTransactions} serviceNameById={serviceNameById} />
      </View>
    </ScrollView>
  );

  // --- Render content based on active tab
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0f62fe" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'Transactions':
        return <TransactionsScreen navigation={navigation} />;
      case 'Inventory':
        return <InventoryScreen navigation={navigation} />;
      case 'Dashboard':
      default:
        return renderDashboard();
    }
  };

  return (
    <View style={styles.screen}>
      {activeTab === 'Dashboard' && <Header username={username} role={role} />}
      {renderContent()}

      {/* Transaction Modal */}
      <Modal
        visible={isTransactionFormOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsTransactionFormOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: SCREEN_WIDTH * 0.95 }]}>
            <ScrollView style={styles.modalBody}>
              <TransactionForm onFormSubmit={handleTransactionFormSubmit} serviceNameById={serviceNameById} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <OutlineButton onPress={() => setIsTransactionFormOpen(false)}>
                <Text>Cancel</Text>
              </OutlineButton>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNav role={role} onTabChange={setActiveTab} />
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 },
  subtitle: { fontSize: 14, color: '#666', flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 8 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginLeft: 8, marginTop: 4 },
  btnSolid: { backgroundColor: '#0f62fe' },
  btnOutline: { borderWidth: 1, borderColor: '#ccc', backgroundColor: 'white' },
  kpiCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginRight: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '500', color: '#666' },
  cardContent: { flex: 1 },
  cardValue: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  cardDescription: { fontSize: 12, color: '#666' },
  contentGrid: { marginBottom: 24 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10 },
  modalContent: { backgroundColor: 'white', borderRadius: 12, maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalBody: { maxHeight: 400, paddingHorizontal: 8, paddingVertical: 8 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: '#eee' },
});
