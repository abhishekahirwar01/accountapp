import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  RefreshControl,
  TouchableWithoutFeedback,
  Keyboard,
  ImageBackground,
  Animated,
  Image,
} from 'react-native';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import {
  IndianRupee,
  CreditCard,
  Users,
  Building,
  PlusCircle,
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

// ─── KPI Card (matches KpiCards visual style) ───────────────────────────────
function DashboardKpiCard({ companyData, selectedCompany, kpis, showSales, showPurchases, isAdmin }) {
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(flipAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(flipAnim, { toValue: 2, duration: 250, useNativeDriver: true }),
      Animated.timing(flipAnim, { toValue: 3, duration: 250, useNativeDriver: true }),
      Animated.timing(flipAnim, { toValue: 4, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const coinScaleX = flipAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [1, 0, -1, 0, 1],
  });

  const companyName = selectedCompany
    ? selectedCompany.businessName
    : 'All Companies';

  const totalPurchases = formatCurrency(companyData?.totalPurchases || 0);
  const totalSales = formatCurrency(companyData?.totalSales || 0);
  const activeUsers = String(companyData?.users || 0).padStart(2, '0');
  const totalCompanies = String(companyData?.companies || 0).padStart(2, '0');

  return (
    <View style={kpiCardStyles.wrapper}>
      <View style={kpiCardStyles.shadowContainer}>
        <View style={kpiCardStyles.bottomShadow} />

        <ImageBackground
          source={require('../../../assets/dashboard/DashboardCard.jpg')}
          style={kpiCardStyles.card}
          imageStyle={kpiCardStyles.cardImage}
          resizeMode="cover"
        >
          {/* Header row */}
          <View style={kpiCardStyles.headerRow}>
            <Text style={kpiCardStyles.companyName} numberOfLines={1}>
              {companyName}
            </Text>
            <Animated.Image
              source={require('../../../assets/dashboard/Coin1.png')}
              style={[kpiCardStyles.coinImage, { transform: [{ scaleX: coinScaleX }] }]}
              resizeMode="contain"
            />
          </View>

          <View style={kpiCardStyles.spacer} />

          {/* Sales & Purchases rows — only show when permission granted */}
          {showPurchases && (
            <View style={kpiCardStyles.kpiRow}>
              <Text style={kpiCardStyles.kpiLabel}>Total Purchases</Text>
              <Text style={kpiCardStyles.kpiValue}>{totalPurchases}</Text>
            </View>
          )}
          {showSales && (
            <View style={kpiCardStyles.kpiRow}>
              <Text style={kpiCardStyles.kpiLabel}>Total Sales</Text>
              <Text style={kpiCardStyles.kpiValue}>{totalSales}</Text>
            </View>
          )}

          <View style={kpiCardStyles.spacer} />

          {/* Bottom stats row */}
          <View style={kpiCardStyles.bottomRow}>
            {isAdmin && (
              <View style={kpiCardStyles.statItem}>
                <Users size={15} color="rgba(255,255,255,0.85)" strokeWidth={3} />
                <Text style={kpiCardStyles.statLabel}>ACTIVE USERS</Text>
                <Text style={kpiCardStyles.statValue}>{activeUsers}</Text>
              </View>
            )}
            <View style={kpiCardStyles.statItem}>
              <Building size={15} color="rgba(255,255,255,0.85)" strokeWidth={3} />
              <Text style={kpiCardStyles.statLabel}>COMPANIES</Text>
              <Text style={kpiCardStyles.statValue}>{totalCompanies}</Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    </View>
  );
}

// ─── Main Screen ────
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
    ]).finally(() => setRefreshing(false));
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
        console.error('UserDashboard fetchCompaniesOnly after trigger failed:', err),
      );
    }
  }, [refreshTrigger, fetchCompaniesOnly]);

  const handleTransactionFormSubmit = () => {
    setIsTransactionFormOpen(false);
    fetchCompanyDashboard();
  };

  // Determine which KPI rows to show based on permissions (same logic as before)
  const showSales = isAdmin || (isAllowed && isAllowed('canCreateSaleEntries'));
  const showPurchases = isAdmin || (isAllowed && isAllowed('canCreatePurchaseEntries'));

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
                  onPress={() => setIsTransactionFormOpen(true)}
                  style={[styles.btn, styles.btnSolid]}
                  activeOpacity={0.85}
                >
                  <PlusCircle size={16} style={{ marginRight: 8 }} color="#fff" />
                  <Text style={{ color: 'white' }}>New Transaction</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* KPI Card — same visual as KpiCards component */}
        <DashboardKpiCard
          companyData={companyData}
          selectedCompany={selectedCompany}
          showSales={showSales}
          showPurchases={showPurchases}
          isAdmin={isAdmin}
        />
      </View>
    </TouchableWithoutFeedback>
  );

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

// ─── KPI Card Styles (mirrors KpiCards component) ────────────────────────────
const kpiCardStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 0,
    paddingVertical: 8,
    marginBottom: 6,
  },
  shadowContainer: {
    position: 'relative',
  },
  bottomShadow: {
    position: 'absolute',
    bottom: -14,
    left: '1%',
    right: '1%',
    height: 40,
    borderRadius: 24,
    shadowColor: '#050505',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
    elevation: 6,
    shadowColor: '#020202',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  cardImage: {
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
    flex: 1,
    marginRight: 12,
  },
  coinImage: {
    width: 35,
    height: 35,
  },
  spacer: {
    height: 18,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  contentContainer: {
    padding: 14,
    flexGrow: 1,
    paddingTop: 4,
    backgroundColor: '#f7f7f7',
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
  header: {},
  headerText: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
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
  contentGrid: {
    marginBottom: 24,
    gap: 16,
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