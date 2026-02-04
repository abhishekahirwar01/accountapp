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
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
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


import RecentTransactions from '../../components/dashboard/RecentTransactions';
import ProductStock from '../../components/dashboard/ProductStock';
import { TransactionForm } from '../../components/transactions/TransactionForm';
import { useCompany } from '../../contexts/company-context';
import UpdateWalkthrough from '../../components/notifications/UpdateWalkthrough';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { usePermissions } from '../../contexts/permission-context';
import { useFocusEffect } from '@react-navigation/native';
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
  const { selectedCompanyId, triggerCompaniesRefresh, refreshTrigger } =
    useCompany();
  const {
    permissions: userCaps,
    isAllowed,
    refetch: refetchUserPermissions,
  } = useUserPermissions();
  const { permissions, refetch: refetchPermissions } = usePermissions();

  useFocusEffect(
    React.useCallback(() => {
      triggerCompaniesRefresh();
    }, [triggerCompaniesRefresh]),
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [serviceNameById, setServiceNameById] = useState(new Map());
  const [refreshing, setRefreshing] = useState(false);

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

  const fetchCompanyDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Error',
          text2: 'Authentication token not found.',
          position: 'bottom',
        });
        throw new Error('Authentication token not found.');
      }

      const authHeaders = { Authorization: `Bearer ${token}` };

      const queryParam = selectedCompanyId
        ? `?companyId=${selectedCompanyId}&isDashboard=true`
        : `?companyId=all&isDashboard=true`;

      const safeFetch = async url => {
        try {
          const r = await fetch(url, { headers: authHeaders });
          if (!r.ok) return {};
          return await r.json();
        } catch {
          return {};
        }
      };

      const [
        rawSales,
        rawPurchases,
        rawReceipts,
        rawPayments,
        rawJournals,
        companiesData,
        servicesJson,
      ] = await Promise.all([
        safeFetch(`${BASE_URL}/api/sales${queryParam}`),
        safeFetch(`${BASE_URL}/api/purchase${queryParam}`),
        safeFetch(`${BASE_URL}/api/receipts${queryParam}`),
        safeFetch(`${BASE_URL}/api/payments${queryParam}`),
        safeFetch(`${BASE_URL}/api/journals${queryParam}`),
        safeFetch(`${BASE_URL}/api/companies/my`),
        safeFetch(`${BASE_URL}/api/services`),
      ]);

      let usersCount = 0;
      if (isAdmin) {
        const usersJson = await safeFetch(`${BASE_URL}/api/users`);
        usersCount = Array.isArray(usersJson)
          ? usersJson.length
          : usersJson?.length || 0;
      }

      const servicesArr = Array.isArray(servicesJson)
        ? servicesJson
        : servicesJson?.services || [];
      const sMap = new Map();
      for (const s of servicesArr) {
        if (s?._id)
          sMap.set(String(s._id), s.serviceName || s.name || 'Service');
      }
      setServiceNameById(sMap);

      const comps = Array.isArray(companiesData)
        ? companiesData
        : companiesData?.data || [];
      setCompanies(comps);

      const salesArr = toArray(rawSales);
      const purchasesArr = toArray(rawPurchases);
      const receiptsArr = toArray(rawReceipts);
      const paymentsArr = toArray(rawPayments);
      const journalsArr = toArray(rawJournals);

      let allTransactions = [
        ...salesArr.map(s => ({ ...s, type: 'sales' })),
        ...purchasesArr.map(p => ({ ...p, type: 'purchases' })),
        ...receiptsArr.map(r => ({ ...r, type: 'receipt' })),
        ...paymentsArr.map(p => ({ ...p, type: 'payment' })),
        ...journalsArr.map(j => ({
          ...j,
          description: j?.narration ?? j?.description ?? '',
          type: 'journal',
        })),
      ];

      if (selectedCompanyId && selectedCompanyId !== 'all') {
        allTransactions = allTransactions.filter(t => {
          const transCompanyId =
            typeof t.company === 'object' ? t.company?._id : t.company;
          return transCompanyId === selectedCompanyId;
        });
      }

      allTransactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      setRecentTransactions(allTransactions.slice(0, 5));

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
        text1: 'Failed to load dashboard data',
        text2: error instanceof Error ? error.message : 'Something went wrong.',
        position: 'bottom',
      });
      setCompanyData(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId, isAdmin]);

  useEffect(() => {
    fetchCompanyDashboard();
  }, [selectedCompanyId, fetchCompanyDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchCompanyDashboard(),
      triggerCompaniesRefresh(),
      refetchUserPermissions ? refetchUserPermissions() : Promise.resolve(),
      refetchPermissions ? refetchPermissions() : Promise.resolve(),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [
    fetchCompanyDashboard,
    triggerCompaniesRefresh,
    refetchUserPermissions,
    refetchPermissions,
  ]);

  const fetchCompaniesOnly = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${BASE_URL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;

      const data = await response.json();
      const comps = Array.isArray(data)
        ? data
        : data?.data || data?.companies || [];
      setCompanies(comps);
    } catch (err) {
      console.error('fetchCompaniesOnly failed:', err);
    }
  }, []);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchCompaniesOnly().catch(err =>
        console.error(
          'UserDashboard fetchCompaniesOnly after trigger failed:',
          err,
        ),
      );
    }
  }, [refreshTrigger, fetchCompaniesOnly]);

  const handleTransactionFormSubmit = () => {
    setIsTransactionFormOpen(false);
    fetchCompanyDashboard();
  };

  const kpis = [
    {
      key: 'sales',
      title: 'TOTAL SALES',
      value: formatCurrency(companyData?.totalSales || 0),
      icon: IndianRupee,
      iconBgColor: '#3B82F6',
      description: selectedCompanyId
        ? 'For selected company'
        : 'All across companies',
      show: isAdmin || (isAllowed && isAllowed('canCreateSaleEntries')),
    },
    {
      key: 'purchases',
      title: 'TOTAL PURCHASES',
      value: formatCurrency(companyData?.totalPurchases || 0),
      icon: CreditCard,
      iconBgColor: '#8B5CF6',
      description: selectedCompanyId
        ? 'For selected company'
        : 'All across companies',
      show: isAdmin || (isAllowed && isAllowed('canCreatePurchaseEntries')),
    },
    {
      key: 'users',
      title: 'ACTIVE USERS',
      value: (companyData?.users || 0).toString(),
      icon: Users,
      iconBgColor: '#14B8A6',
      description: 'Total active users',
      show: isAdmin,
    },
    {
      key: 'companies',
      title: 'COMPANIES',
      value: (companyData?.companies || 0).toString(),
      icon: Building,
      iconBgColor: '#F59E0B',
      description: 'Total companies',
      show: true,
    },
  ].filter(k => k.show);

  // --- Handlers
  const handleSettingsPress = () => navigation.navigate('ProfileScreen');
  const handleTransactionPress = () => setIsTransactionFormOpen(true);

  const KPICard = ({ title, value, Icon, description, iconBgColor }) => (
    <View style={styles.cardWrapper}>
      <View style={styles.kpiCard}>
        <View style={styles.cardInner}>
          <View style={styles.headerRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            <View
              style={[styles.iconContainer, { backgroundColor: iconBgColor }]}
            >
              <Icon size={18} color="#ffffff" strokeWidth={2.5} />
            </View>
          </View>

          <Text style={styles.cardValue} numberOfLines={1}>
            {value}
          </Text>

          <Text style={styles.cardDescription} numberOfLines={1}>
            {description}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
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
              <UpdateWalkthrough />

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

        {/* KPI Cards Grid */}
        {kpis.length > 0 && (
          <View style={styles.kpiGrid}>
            {kpis.map(k => (
              <KPICard
                key={k.key}
                title={k.title}
                value={k.value}
                Icon={k.icon}
                description={k.description}
                iconBgColor={k.iconBgColor}
              />
            ))}
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );

  // --- List Content Component
  const renderContent = () => (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.contentGrid}>
        <ProductStock
          navigation={navigation}
          refetchPermissions={refetchPermissions}
          refetchUserPermissions={refetchUserPermissions}
        />
        <RecentTransactions
          transactions={recentTransactions}
          serviceNameById={serviceNameById}
        />
      </View>
    </TouchableWithoutFeedback>
  );

  // --- Render Loading
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f62fe" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (companies.length === 0) {
    return (
      <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0f62fe']}
              tintColor="#0f62fe"
            />
          }
        >
          <Building size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>No Company Available</Text>
          <Text style={styles.emptyDescription}>
            You don't have access to any company yet. Please contact your admin.
          </Text>
        </ScrollView>
    );
  }

  return (
    <>
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <KeyboardAwareFlatList
          data={[]}
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
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={100}
        />
      </TouchableWithoutFeedback>

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
    </>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: 14,
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
    // marginBottom: 24,
  },
  headerText: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    // marginBottom: 4,
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

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    // padding: 8,
    marginBottom: 14,
  },
  cardWrapper: {
    width: '48%',
    minWidth: 150,
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardInner: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 8,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  cardDescription: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '400',
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
