// src/screens/dashboard/UserDashboardScreen.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  FlatList,
  RefreshControl,
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
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppLayout from '../../components/layout/AppLayout';
import RecentTransactions from '../../components/dashboard/RecentTransactions';
import ProductStock from '../../components/dashboard/ProductStock';
import { TransactionForm } from '../../components/transactions/TransactionForm';
import { useCompany } from '../../contexts/company-context';
import UpdateWalkthrough from '../../components/notifications/UpdateWalkthrough';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { usePermissions } from '../../contexts/permission-context'; // Import permission context
import { BASE_URL } from '../../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatCurrency = amount =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
    amount || 0,
  );

const toArray = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.entries)) return data.entries;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const num = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const getAmount = (type, row) => {
  switch (type) {
    case 'sales':
      return num(row?.amount ?? row?.totalAmount);
    case 'purchases':
      return num(row?.totalAmount ?? row?.amount);
    case 'receipt':
    case 'payment':
      return num(row?.amount ?? row?.totalAmount);
    case 'journal':
      return 0;
    default:
      return 0;
  }
};

export default function UserDashboardScreen({ navigation, route }) {
  // --- State & Hooks
  const { selectedCompanyId } = useCompany();
  const { permissions: userCaps, isAllowed, refetch: refetchUserPermissions } = useUserPermissions();
  const { permissions, refetch: refetchPermissions } = usePermissions(); // Get permission refetch

  const [isLoading, setIsLoading] = useState(true);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [serviceNameById, setServiceNameById] = useState(new Map());
  const [refreshing, setRefreshing] = useState(false);

  // Read role from AsyncStorage
  const [role, setRole] = useState('user');

  useEffect(() => {
    const fetchRole = async () => {
      const storedRole = await AsyncStorage.getItem('role');
      setRole(storedRole || 'user');
    };
    fetchRole();
  }, []);

  const isAdmin = role === 'admin' || role === 'master';
  const selectedCompany = useMemo(
    () =>
      selectedCompanyId
        ? companies.find(c => c._id === selectedCompanyId) || null
        : null,
    [companies, selectedCompanyId],
  );

  // Safe fetch helper
  const safeGet = useCallback(async url => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return {};

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return {};
      return await response.json();
    } catch {
      return {};
    }
  }, []);

  // Fetch dashboard data
  const fetchCompanyDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParam = selectedCompanyId
        ? `?companyId=${selectedCompanyId}`
        : '';

      const [
        rawSales,
        rawPurchases,
        rawReceipts,
        rawPayments,
        rawJournals,
        companiesData,
        servicesJson,
      ] = await Promise.all([
        safeGet(`${BASE_URL}/api/sales${queryParam}`),
        safeGet(`${BASE_URL}/api/purchase${queryParam}`),
        safeGet(`${BASE_URL}/api/receipts${queryParam}`),
        safeGet(`${BASE_URL}/api/payments${queryParam}`),
        safeGet(`${BASE_URL}/api/journals${queryParam}`),
        safeGet(`${BASE_URL}/api/companies/my`),
        safeGet(`${BASE_URL}/api/services`),
      ]);

      // Only admins can see users count
      let usersCount = 0;
      if (isAdmin) {
        const usersJson = await safeGet(`${BASE_URL}/api/users`);
        usersCount = Array.isArray(usersJson)
          ? usersJson.length
          : usersJson?.length || 0;
      }

      // Services map
      const servicesArr = Array.isArray(servicesJson)
        ? servicesJson
        : servicesJson?.services || [];
      const sMap = new Map();
      servicesArr.forEach(s => {
        if (s?._id) {
          sMap.set(String(s._id), s.serviceName || s.name || 'Service');
        }
      });
      setServiceNameById(sMap);

      // Companies
      const comps = Array.isArray(companiesData)
        ? companiesData
        : companiesData?.data || [];
      setCompanies(comps);

      // Normalize arrays
      const salesArr = toArray(rawSales);
      const purchasesArr = toArray(rawPurchases);
      const receiptsArr = toArray(rawReceipts);
      const paymentsArr = toArray(rawPayments);
      const journalsArr = toArray(rawJournals);

      // Combine all transactions
      const allTransactions = [
        ...salesArr.map(s => ({ ...s, type: 'sales' })),
        ...purchasesArr.map(p => ({ ...p, type: 'purchases' })),
        ...receiptsArr.map(r => ({ ...r, type: 'receipt' })),
        ...paymentsArr.map(p => ({ ...p, type: 'payment' })),
        ...journalsArr.map(j => ({
          ...j,
          description: j?.narration ?? j?.description ?? '',
          type: 'journal',
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRecentTransactions(allTransactions.slice(0, 5));

      // Calculate KPIs
      const totalSales = salesArr.reduce(
        (acc, row) => acc + getAmount('sales', row),
        0,
      );
      const totalPurchases = purchasesArr.reduce(
        (acc, row) => acc + getAmount('purchases', row),
        0,
      );
      const companiesCount = selectedCompanyId
        ? 1
        : Array.isArray(comps)
        ? comps.length
        : 0;

      setCompanyData({
        totalSales,
        totalPurchases,
        users: usersCount,
        companies: companiesCount,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load dashboard',
        text2: error instanceof Error ? error.message : 'Something went wrong.',
        position: 'bottom',
      });
      setCompanyData(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId, isAdmin, safeGet]);

  useEffect(() => {
    fetchCompanyDashboard();
  }, [selectedCompanyId, fetchCompanyDashboard]);

  // Add refresh function that also fetches permissions
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchCompanyDashboard(),
      refetchUserPermissions ? refetchUserPermissions() : Promise.resolve(),
      refetchPermissions ? refetchPermissions() : Promise.resolve(),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [fetchCompanyDashboard, refetchUserPermissions, refetchPermissions]);

  const handleTransactionFormSubmit = () => {
    setIsTransactionFormOpen(false);
    fetchCompanyDashboard();
  };

  // --- KPI Cards
  const kpis = [
    {
      key: 'sales',
      title: 'Total Sales',
      value: formatCurrency(companyData?.totalSales || 0),
      icon: IndianRupee,
      description: selectedCompanyId
        ? 'For selected company'
        : 'Across all companies',
      show: isAdmin || isAllowed('canCreateSaleEntries'),
    },
    {
      key: 'purchases',
      title: 'Total Purchases',
      value: formatCurrency(companyData?.totalPurchases || 0),
      icon: CreditCard,
      show: isAdmin || isAllowed('canCreatePurchaseEntries'),
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
  ].filter(k => k.show);

  // --- Handlers
  const handleSettingsPress = () => navigation.navigate('ProfileScreen');
  const handleTransactionPress = () => setIsTransactionFormOpen(true);

  // --- KPI Card Component
  const KPICard = ({ title, value, Icon, description }) => (
    <View style={[styles.kpiCard, { width: SCREEN_WIDTH * 0.6 }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Icon size={18} color="#666" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardValue}>{value}</Text>
        {description && (
          <Text style={styles.cardDescription}>{description}</Text>
        )}
      </View>
    </View>
  );

  // --- List Header Component
  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>User Dashboard</Text>
          <Text style={styles.subtitle}>
            {selectedCompany
              ? `An overview of ${selectedCompany.businessName}.`
              : 'An overview across your accessible companies.'}
          </Text>
        </View>

        {companies.length > 0 && (
          <View style={styles.headerActions}>
            {/* <TouchableOpacity
              onPress={handleSettingsPress}
              style={[styles.btn, styles.btnOutline]}
              activeOpacity={0.85}
            >
              <Settings size={16} style={{ marginRight: 8 }} />
              <Text>Settings</Text>
            </TouchableOpacity> */}

            {isAdmin && (
              <TouchableOpacity
                onPress={handleTransactionPress}
                style={[styles.btn, styles.btnSolid]}
                activeOpacity={0.85}
              >
                <PlusCircle
                  size={16}
                  style={{ marginRight: 8 }}
                  color="#fff"
                />
                <Text style={{ color: 'white' }}>New Transaction</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* KPI Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 24 }}
      >
        {kpis.map(k => (
          <KPICard
            key={k.key}
            title={k.title}
            value={k.value}
            Icon={k.icon}
            description={k.description}
          />
        ))}
      </ScrollView>
    </View>
  );

  // --- List Content Component
  const renderContent = () => (
    <View style={styles.contentGrid}>
      <ProductStock />
      <RecentTransactions
        transactions={recentTransactions}
        serviceNameById={serviceNameById}
      />
    </View>
  );

  // --- Render Loading
  if (isLoading) {
    return (
      <AppLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0f62fe" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </AppLayout>
    );
  }

  // --- Render Empty State
  if (companies.length === 0) {
    return (
      <AppLayout>
        <View style={styles.emptyContainer}>
          <Building size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>No Company Available</Text>
          <Text style={styles.emptyDescription}>
            You don't have access to any company yet. Please contact your admin.
          </Text>
        </View>
      </AppLayout>
    );
  }

  // --- Main Render with FlatList
  return (
    <AppLayout>
      <FlatList
        data={[]} // We don't need actual data since we're using ListHeaderComponent
        renderItem={null}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0f62fe']}
            tintColor="#0f62fe"
          />
        }
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Transaction Modal */}
      <Modal
        visible={isTransactionFormOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsTransactionFormOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: SCREEN_WIDTH * 0.95 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create a New Transaction</Text>
              <Text style={styles.modalDescription}>
                Fill in the details below to record a new financial event.
              </Text>
            </View>
            <ScrollView style={styles.modalBody}>
              <TransactionForm
                onFormSubmit={handleTransactionFormSubmit}
                serviceNameById={serviceNameById}
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setIsTransactionFormOpen(false)}
                style={[styles.btn, styles.btnOutline]}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: 16,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptyDescription: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    marginBottom: 24,
  },
  headerText: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  btn: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSolid: {
    backgroundColor: '#0f62fe',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: 'white',
  },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  cardContent: {
    flex: 1,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 11,
    color: '#666',
  },
  contentGrid: {
    marginBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
  },
  modalBody: {
    maxHeight: 400,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});