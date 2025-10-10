import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Card } from 'react-native-paper';
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
import TransactionForm from '../../components/transactions/TransactionForm';
import ProductStock from '../../components/dashboard/ProductStock';
import KPICard from '../../components/dashboard/KPICard';
import TransactionsScreen from './TransactionsScreen';
import InventoryScreen from './InventoryScreen';

// --- Mock Data ---
const MOCK_COMPANIES = [
  { _id: '1', businessName: 'Company A' },
  { _id: '2', businessName: 'Company B' },
];

const MOCK_SERVICES = [
  { _id: '1', serviceName: 'Service 1' },
  { _id: '2', serviceName: 'Service 2' },
];

const MOCK_TRANSACTIONS = [
  {
    id: '1',
    type: 'sales',
    amount: 1500,
    date: '2024-01-15',
    description: 'Product Sale',
  },
  {
    id: '2',
    type: 'purchase',
    amount: 800,
    date: '2024-01-14',
    description: 'Office Supplies',
  },
];

const formatCurrency = amount => `₹${amount.toLocaleString('en-IN')}`;

const DashboardScreen = ({ navigation, route }) => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [companyData, setCompanyData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [serviceNameById, setServiceNameById] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);

  const { username = 'Master Admin', role = 'master' } = route?.params || {};

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    setIsLoading(true);
    setTimeout(() => {
      const totalSales = MOCK_TRANSACTIONS.filter(t => t.type === 'sales').reduce((sum, t) => sum + t.amount, 0);
      const totalPurchases = MOCK_TRANSACTIONS.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);

      const serviceMap = new Map();
      MOCK_SERVICES.forEach(service => serviceMap.set(service._id, service.serviceName));

      setCompanyData({
        totalSales,
        totalPurchases,
        users: 5,
        companies: MOCK_COMPANIES.length,
      });
      setRecentTransactions(MOCK_TRANSACTIONS);
      setServiceNameById(serviceMap);
      setIsLoading(false);
    }, 1000);
  };

  const handleSettingsPress = () => navigation.navigate('ProfileScreen');

  const handleTransactionFormSubmit = newTransaction => {
    const updatedTransactions = [newTransaction, ...recentTransactions.slice(0, 4)];
    let updatedCompanyData = { ...companyData };

    if (newTransaction.type === 'sales')
      updatedCompanyData.totalSales += newTransaction.amount;
    else if (newTransaction.type === 'purchase')
      updatedCompanyData.totalPurchases += newTransaction.amount;

    setRecentTransactions(updatedTransactions);
    setCompanyData(updatedCompanyData);
    setIsTransactionFormOpen(false);
  };

  // --- Dashboard UI ---
  const renderDashboard = () => {
    const kpiData = [
      { title: 'Total Sales', value: formatCurrency(companyData?.totalSales || 0), icon: IndianRupee },
      { title: 'Total Purchases', value: formatCurrency(companyData?.totalPurchases || 0), icon: CreditCard },
      { title: 'Active Users', value: (companyData?.users || 0).toString(), icon: Users },
      { title: 'Companies', value: (companyData?.companies || 0).toString(), icon: Building },
    ];

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Fetching latest insights...</Text>
        </View>
      );
    }

    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
        <View style={styles.dashboardContainer}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.settingsButton} onPress={handleSettingsPress}>
              <Settings size={18} color="#1e293b" />
              <Text style={styles.settingsText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.addButton} onPress={() => setIsTransactionFormOpen(true)}>
              <PlusCircle size={18} color="#fff" />
              <Text style={styles.addText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
            contentContainerStyle={{ paddingHorizontal: 8 }}
          >
            {kpiData.map(kpi => (
              <View key={kpi.title} style={{ marginRight: 12 }}>
                <KPICard {...kpi} />
              </View>
            ))}
          </ScrollView>

          <ProductStock />
          <RecentTransactions transactions={recentTransactions} serviceNameById={serviceNameById} />
        </View>

        <Modal
          visible={isTransactionFormOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setIsTransactionFormOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Transaction</Text>
                <Text style={styles.modalDescription}>Record a sales or purchase transaction.</Text>
              </View>

              <View style={styles.modalContent}>
                <TransactionForm
                  onFormSubmit={handleTransactionFormSubmit}
                  serviceNameById={serviceNameById}
                />
              </View>

              <TouchableOpacity onPress={() => setIsTransactionFormOpen(false)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </Card>
          </View>
        </Modal>
      </ScrollView>
    );
  };

  // --- Main content renderer ---
  const renderContent = () => {
    switch (activeTab) {
      case 'Transactions':
        return <TransactionsScreen navigation={navigation} />;
      case 'Inventory':
        return <InventoryScreen navigation={navigation} />;
      default:
        return renderDashboard();
    }
  };

  // --- Main layout ---
  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {activeTab === 'Dashboard' && <Header username={username} role={role} />}
      {renderContent()}
      <BottomNav role={role} onTabChange={setActiveTab} />
    </View>
  );
};

export default DashboardScreen;

// --- Styles ---
const styles = StyleSheet.create({
  dashboardContainer: { padding: 16, paddingBottom: 100 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  settingsText: { marginLeft: 6, color: '#1e293b', fontWeight: '600' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  addText: { marginLeft: 6, color: '#fff', fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 16, color: '#475569' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: { width: '100%', maxWidth: 500, borderRadius: 16, overflow: 'hidden' },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  modalDescription: { color: '#64748b', marginTop: 4 },
  modalContent: { maxHeight: 400, padding: 16 },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  cancelText: { color: '#ef4444', fontWeight: '600' },
});
