import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import {
  IndianRupee,
  CreditCard,
  Users,
  Building,
  PlusCircle,
  Settings,
} from 'lucide-react-native';

import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import RecentTransactions from '../../components/dashboard/RecentTransactions';
import ProductStock from '../../components/dashboard/ProductStock';
import TransactionForm from '../../components/transactions/TransactionForm';
import UpdateWalkthrough from '../../components/notifications/UpdateWalkthrough';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

export default function UserDashboardScreen({ navigation, route }) {
  const { username = 'User', role = 'user' } = route?.params || {};
  const [isLoading] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);

  const handleLogout = () => navigation.replace('GettingStarted');

  // Hardcoded company + transaction data for now
  const selectedCompanyId = null;
  const companies = [
    { _id: 'c1', businessName: 'Sharda Associates' },
    { _id: 'c2', businessName: 'Finaxis Consultancy' },
  ];
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

  const recentTransactions = allTransactions.slice(0, 5);
  const totalSales = allTransactions.filter((x) => x.type === 'sales').reduce((a, x) => a + (x.amount || x.totalAmount || 0), 0);
  const totalPurchases = allTransactions.filter((x) => x.type === 'purchases').reduce((a, x) => a + (x.amount || x.totalAmount || 0), 0);

  const isAdmin = role === 'admin';

  const companyData = {
    totalSales,
    totalPurchases,
    users: isAdmin ? 12 : 0,
    companies: selectedCompanyId ? 1 : companies.length,
  };

  const kpis = [
    {
      key: 'sales',
      title: 'Total Sales',
      value: formatCurrency(companyData?.totalSales || 0),
      icon: IndianRupee,
      description: selectedCompanyId ? 'For selected company' : 'Across all companies',
      show: true,
    },
    {
      key: 'purchases',
      title: 'Total Purchases',
      value: formatCurrency(companyData?.totalPurchases || 0),
      icon: CreditCard,
      show: true,
    },
    {
      key: 'users',
      title: 'Active Users',
      value: (companyData?.users || 0).toString(),
      icon: Users,
      show: isAdmin,
    },
    {
      key: 'companies',
      title: 'Companies',
      value: (companyData?.companies || 0).toString(),
      icon: Building,
      show: true,
    },
  ].filter((k) => k.show);

  const handleTransactionFormSubmit = () => {
    Alert.alert('Saved', 'Transaction saved (mock).');
    setIsTransactionFormOpen(false);
  };

  const KPICard = ({ title, value, Icon, description }) => (
    <View style={[styles.kpiCard, { minWidth: SCREEN_WIDTH / 2.2 }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Icon size={16} color="#666" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardValue}>{value}</Text>
        {description ? <Text style={styles.cardDescription}>{description}</Text> : null}
      </View>
    </View>
  );

  const SolidButton = ({ onPress, children }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.btn, styles.btnSolid]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>{children}</View>
    </TouchableOpacity>
  );

  const OutlineButton = ({ onPress, children }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.btn, styles.btnOutline]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>{children}</View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f62fe" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header username={username} role={role} />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Dashboard Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>🙋 Dashboard</Text>
            <Text style={styles.subtitle}>
              {selectedCompany
                ? `An overview of ${selectedCompany.businessName}.`
                : 'An overview across your accessible companies.'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <UpdateWalkthrough />
            <OutlineButton onPress={() => Alert.alert('Go to Settings', 'Mock action')}>
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

        {/* Empty state */}
        {companies.length === 0 ? (
          <View style={styles.emptyState}>
            <Building size={48} color="#666" />
            <Text style={styles.emptyStateTitle}>No Company Available</Text>
            <Text style={styles.emptyStateDescription}>
              You don&apos;t have access to any company yet. Please contact your admin.
            </Text>
          </View>
        ) : (
          <>
            {/* KPI Cards */}
            <View style={styles.kpiGrid}>
              {kpis.map((k) => (
                <KPICard
                  key={k.key}
                  title={k.title}
                  value={k.value}
                  Icon={k.icon}
                  description={k.description}
                />
              ))}
            </View>

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
          </>
        )}

        {/* Logout */}
        <View style={{ marginVertical: 30, alignItems: 'center' }}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Transaction Form Modal */}
      {isTransactionFormOpen && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: SCREEN_WIDTH * 0.95 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create a New Transaction</Text>
              <Text style={styles.modalDescription}>
                Fill in the details below to record a new financial event.
              </Text>
            </View>
            <ScrollView style={styles.modalBody}>
              <TransactionForm onFormSubmit={handleTransactionFormSubmit} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <OutlineButton onPress={() => setIsTransactionFormOpen(false)}>
                <Text>Cancel</Text>
              </OutlineButton>
              <SolidButton onPress={handleTransactionFormSubmit}>
                <Text style={{ color: 'white' }}>Save Transaction</Text>
              </SolidButton>
            </View>
          </View>
        </View>
      )}

      <BottomNav role={role} onTabChange={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 8 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginLeft: 8, marginTop: 4 },
  btnSolid: { backgroundColor: '#0f62fe' },
  btnOutline: { borderWidth: 1, borderColor: '#ccc', backgroundColor: 'white' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  kpiCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '500', color: '#666' },
  cardContent: { flex: 1 },
  cardValue: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  cardDescription: { fontSize: 12, color: '#666' },
  contentGrid: { marginBottom: 24 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#f1f3f5',
  },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptyStateDescription: { fontSize: 14, color: '#666', textAlign: 'center' },
  logoutButton: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    elevation: 3,
  },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 10 },
  modalContent: { backgroundColor: 'white', borderRadius: 12, maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  modalDescription: { fontSize: 14, color: '#666' },
  modalBody: { maxHeight: 400, paddingHorizontal: 8, paddingVertical: 8 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: '#eee' },
});
