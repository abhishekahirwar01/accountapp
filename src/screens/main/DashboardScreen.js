import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FileText,
  PlusCircle,
  Package,
  X,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// Assuming context and custom components are adapted for React Native
import { useCompany } from '../../contexts/company-context';
import { useSupport } from '../../contexts/support-context';
import { usePermissions } from '../../contexts/permission-context';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { useFocusEffect } from '@react-navigation/native';

// Custom components
import { KpiCards } from '../../components/dashboard/KPICard';
import RecentTransactions from '../../components/dashboard/RecentTransactions';
import ProductStock from '../../components/dashboard/ProductStock';
import ProformaForm from '../../components/transactions/ProformaForm';
import { TransactionForm } from '../../components/transactions/TransactionForm';
import { AccountValidityNotice } from '../../components/dashboard/AccountValidityNotice';
const UpdateWalkthrough = React.lazy(() =>
  import('../../components/notifications/UpdateWalkthrough'),
);
import { BASE_URL } from '../../config';
import AppLayout from '../../components/layout/AppLayout';

const CACHE_KEY = 'company_dashboard_data';
const baseURL = BASE_URL;

// --- Utility Function ---
const toArray = data => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.entries)) return data.entries;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

// --- Skeleton Components ---
const KpiSkeleton = () => (
  <View style={styles.kpiContainer}>
    {[...Array(3)].map((_, i) => (
      <View key={i} style={styles.kpiCardSkeleton}>
        <ActivityIndicator size="small" />
      </View>
    ))}
  </View>
);

const ProductStockSkeleton = () => (
  <View style={styles.productStockSkeleton}>
    <ActivityIndicator />
  </View>
);

const RecentTransactionsSkeleton = () => (
  <View style={styles.transactionsSkeleton}>
    <ActivityIndicator />
  </View>
);

// Custom Card Component with Animation
const Card = ({ children, style }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.card, style, { opacity: fadeAnim }]}>
      {children}
    </Animated.View>
  );
};

// Animated TouchableOpacity Component (USED in header)
const AnimatedTouchable = ({ children, onPress, style, disabled }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// --- Main Component ---
export default function DashboardPage() {
  const navigation = useNavigation();
  const { toggleSupport } = useSupport();
  const { selectedCompanyId, triggerCompaniesRefresh, refreshTrigger } =
    useCompany();
  const { width } = useWindowDimensions();

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(-20)).current;

  // Trigger company refresh when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      triggerCompaniesRefresh();
    }, [triggerCompaniesRefresh]),
  );

  const { permissions, refetch: refetchPermissions } = usePermissions();
  const { permissions: userCaps, refetch: refetchUserPermissions } =
    useUserPermissions();
  const [dashboardData, setDashboardData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [isProformaFormOpen, setIsProformaFormOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const selectedCompany = useMemo(
    () =>
      selectedCompanyId
        ? companies.find(c => c._id === selectedCompanyId) || null
        : null,
    [companies, selectedCompanyId],
  );

  const showToast = useCallback((title, description, isDestructive = false) => {
    Alert.alert(title, description);
  }, []);

  // Animate header on mount
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Optimized data fetching with request batching
  const fetchDashboardData = useCallback(
    async (forceRefresh = false) => {
      setIsLoading(true);

      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found.');

        // Check cache first for immediate response (unless force refresh)
        if (!forceRefresh) {
          const cached = await AsyncStorage.getItem(CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            setDashboardData(parsed);
          }
        }

        const queryParam =
          selectedCompanyId && selectedCompanyId !== 'all'
            ? `?companyId=${selectedCompanyId}&limit=10000`
            : '?limit=10000';

        // Batch critical API calls first
        const [salesRes, purchasesRes, companiesRes] = await Promise.all([
          fetch(`${baseURL}/api/sales${queryParam}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${baseURL}/api/purchase${queryParam}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${baseURL}/api/companies/my`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const [rawSales, rawPurchases, companiesData] = await Promise.all([
          salesRes.json(),
          purchasesRes.json(),
          companiesRes.json(),
        ]);

        // Process critical data first
        const salesArr = toArray(rawSales);
        const purchasesArr = toArray(rawPurchases);

        // Calculate totals (simplified since they're only used in initialData)
        const totalSales = salesArr.reduce(
          (acc, row) => acc + (Number(row?.amount ?? row?.totalAmount ?? 0) || 0),
          0,
        );
        const totalPurchases = purchasesArr.reduce(
          (acc, row) => acc + (Number(row?.amount ?? row?.totalAmount ?? 0) || 0),
          0,
        );
        const companiesCount = companiesData?.length || 0;

        const initialData = {
          totalSales,
          totalPurchases,
          users: 0,
          companies: companiesCount,
          recentTransactions: [],
          serviceNameById: {},
        };

        setDashboardData(initialData);
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        setIsLoading(false);

        // Secondary non-critical data loading
        fetchSecondaryData(token, queryParam, initialData);
      } catch (error) {
        showToast(
          'Failed to load dashboard data',
          error instanceof Error ? error.message : 'Something went wrong.',
          true,
        );
        setIsLoading(false);
      }
    },
    [selectedCompanyId, showToast],
  );

  // Refresh functionality
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await Promise.all([
        fetchDashboardData(true),
        triggerCompaniesRefresh(),
        refetchPermissions ? refetchPermissions() : Promise.resolve(),
        refetchUserPermissions ? refetchUserPermissions() : Promise.resolve(),
      ]);
    } catch (error) {
      showToast(
        'Refresh Failed',
        error instanceof Error ? error.message : 'Failed to refresh data',
        true,
      );
    } finally {
      setRefreshing(false);
    }
  }, [
    fetchDashboardData,
    showToast,
    triggerCompaniesRefresh,
    refetchPermissions,
    refetchUserPermissions,
  ]);

  const fetchCompaniesOnly = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${baseURL}/api/companies/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('fetchCompaniesOnly failed:', err);
    }
  }, []);

  React.useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchCompaniesOnly().catch(err =>
        console.error(
          'Dashboard fetchCompaniesOnly after trigger failed:',
          err,
        ),
      );
    }
  }, [refreshTrigger, fetchCompaniesOnly]);

  const fetchSecondaryData = async (token, queryParam, initialData) => {
    try {
      const [
        salesRes,
        purchasesRes,
        receiptsRes,
        paymentsRes,
        journalsRes,
        usersRes,
        servicesRes,
      ] = await Promise.all([
        fetch(`${baseURL}/api/sales${queryParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/purchase${queryParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/receipts${queryParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/payments${queryParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/journals${queryParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/services`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [
        rawSales,
        rawPurchases,
        rawReceipts,
        rawPayments,
        rawJournals,
        usersData,
        servicesJson,
      ] = await Promise.all([
        salesRes.json(),
        purchasesRes.json(),
        receiptsRes.json(),
        paymentsRes.json(),
        journalsRes.json(),
        usersRes.json(),
        servicesRes.json(),
      ]);

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

      const servicesArr = Array.isArray(servicesJson)
        ? servicesJson
        : servicesJson.services || [];
      const sMap = new Map();
      for (const s of servicesArr) {
        if (s?._id)
          sMap.set(String(s._id), s.serviceName || s.name || 'Service');
      }

      const updatedData = {
        ...initialData,
        users: usersData?.length || 0,
        recentTransactions: allTransactions.slice(0, 4),
        serviceNameById: sMap,
      };

      setDashboardData(updatedData);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updatedData));
    } catch (error) {
      console.error('Failed to load secondary data:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleTransactionFormSubmit = () => {
    setIsTransactionFormOpen(false);
    fetchDashboardData();
  };

  const handleProformaFormSubmit = () => {
    setIsProformaFormOpen(false);
    fetchDashboardData();
  };

  return (
    <AppLayout>
      {/* Animated Header */}
      <Animated.View
        style={[
          styles.header,
          styles.headerFixed,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Dashboard
            </Text>
            <Text
              style={styles.headerSubtitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {selectedCompany
                ? `An overview of ${selectedCompany.businessName}.`
                : 'An overview across all companies.'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Suspense fallback={null}>
              <UpdateWalkthrough />
            </Suspense>

            <AnimatedTouchable
              onPress={() => setIsProformaFormOpen(true)}
              disabled={companies.length === 0}
              style={[
                styles.headerButton,
                styles.proformaButton,
                companies.length === 0 && styles.headerButtonDisabled,
              ]}
            >
              <FileText size={14} color="#3b82f6" strokeWidth={2.5} />
              <Text style={[styles.headerButtonText, styles.proformaButtonText]}>
                Proforma
              </Text>
            </AnimatedTouchable>

            <AnimatedTouchable
              onPress={() => setIsTransactionFormOpen(true)}
              disabled={companies.length === 0}
              style={[
                styles.headerButton,
                styles.transactionButton,
                companies.length === 0 && styles.headerButtonDisabled,
              ]}
            >
              <PlusCircle size={14} color="#ffffff" strokeWidth={2.5} />
              <Text style={[styles.headerButtonText, styles.transactionButtonText]}>
                Transaction
              </Text>
            </AnimatedTouchable>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
        decelerationRate="normal"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
            progressViewOffset={0}
          />
        }
      >
        <Suspense
          fallback={
            <Card style={styles.validityNoticeSkeleton}>
              <ActivityIndicator />
            </Card>
          }
        >
          <AccountValidityNotice onContactSupport={toggleSupport} />
        </Suspense>

        {isLoading ? (
          <KpiSkeleton />
        ) : companies.length === 0 ? (
          <Card style={styles.noCompanyCard}>
            <Package size={48} color="#666" />
            <Text style={styles.noCompanyTitle}>No Company Selected</Text>
            <Text style={styles.noCompanyText}>
              Please select a company from the header to view its dashboard.
            </Text>
          </Card>
        ) : (
          <>
            <KpiCards
              data={dashboardData}
              selectedCompanyId={selectedCompanyId}
            />

            <View style={styles.dataContainer}>
              <Suspense fallback={<ProductStockSkeleton />}>
                <ProductStock
                  navigation={navigation}
                  refetchPermissions={refetchPermissions}
                  refetchUserPermissions={refetchUserPermissions}
                />
              </Suspense>

              <Suspense fallback={<RecentTransactionsSkeleton />}>
                <RecentTransactions
                  navigation={navigation}
                  transactions={dashboardData?.recentTransactions || []}
                  serviceNameById={dashboardData?.serviceNameById || new Map()}
                />
              </Suspense>
            </View>
          </>
        )}
      </ScrollView>

      {/* Proforma Modal with Slide Animation */}
      <Modal
        visible={isProformaFormOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsProformaFormOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Proforma Invoice</Text>
            <TouchableOpacity
              onPress={() => setIsProformaFormOpen(false)}
              style={styles.closeIconButton}
              activeOpacity={0.7}
            >
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={true}
            style={styles.modalScroll}
          >
            <Suspense
              fallback={<ActivityIndicator style={{ marginTop: 20 }} />}
            >
              <ProformaForm
                onFormSubmit={handleProformaFormSubmit}
                serviceNameById={dashboardData?.serviceNameById || new Map()}
              />
            </Suspense>
          </ScrollView>
        </View>
      </Modal>

      {/* Transaction Modal with Slide Animation */}
      <Modal
        visible={isTransactionFormOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsTransactionFormOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create a New Transaction</Text>
            <TouchableOpacity
              onPress={() => setIsTransactionFormOpen(false)}
              style={styles.closeIconButton}
              activeOpacity={0.7}
            >
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            <TransactionForm
              onFormSubmit={handleTransactionFormSubmit}
              serviceNameById={dashboardData?.serviceNameById || new Map()}
            />
          </ScrollView>
        </View>
      </Modal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'column',
    marginBottom: 0,
  },
  headerFixed: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    // marginBottom: 2,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '400',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  proformaButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },
  transactionButton: {
    backgroundColor: '#3b82f6',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },
  headerButtonText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  proformaButtonText: {
    color: '#3b82f6',
  },
  transactionButtonText: {
    color: '#ffffff',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 32,
  },
  buttonContained: {
    backgroundColor: 'rgba(5,150,105,0.08)',
    borderColor: 'rgba(5,150,105,0.2)',
  },
  buttonOutlined: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(5,150,105,0.2)',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainedText: {
    color: '#059669',
  },
  buttonOutlinedText: {
    color: '#059669',
  },
  buttonIcon: {
    marginRight: 6,
    tintColor: '#059669',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginVertical: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  validityNoticeSkeleton: {
    height: 80,
    marginVertical: 10,
    borderRadius: 8,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  kpiCardSkeleton: {
    flex: 1,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  noCompanyCard: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 10,
  },
  noCompanyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    color: '#333',
  },
  noCompanyText: {
    fontSize: 16,
    marginTop: 4,
    textAlign: 'center',
    color: '#666',
    opacity: 0.7,
  },
  dataContainer: {
    gap: 12,
    marginTop: 8,
    margin: 8,
  },
  productStockSkeleton: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  transactionsSkeleton: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeIconButton: {
    padding: 4,
    borderRadius: 8,
  },
  modalScroll: {
    flex: 1,
  },
});