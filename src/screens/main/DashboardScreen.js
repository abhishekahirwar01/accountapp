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
  RefreshControl, // Added this import
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Settings,
  FileText,
  PlusCircle,
  Package,
  X,
  RefreshCw,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// Assuming context and custom components are adapted for React Native
import { useCompany } from '../../contexts/company-context';
import { useSupport } from '../../contexts/support-context';
import { usePermissions } from '../../contexts/permission-context';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import { useFocusEffect } from '@react-navigation/native';

// Custom components - these must be re-written for React Native
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

// --- Utility Functions (Adapted for React Native) ---

const formatCurrency = amount =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
    amount,
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

// --- Skeleton Components (Simplified for RN) ---

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

// Custom Card Component
const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// Custom Button Component
const Button = ({
  children,
  onPress,
  mode = 'contained',
  loading = false,
  style,
  icon: Icon,
  labelStyle,
  iconColor,
  disabled = false,
}) => {
  const isOutlined = mode === 'outlined';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isOutlined ? styles.buttonOutlined : styles.buttonContained,
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {Icon && (
        <Icon
          size={18}
          color={iconColor ?? (isOutlined ? '#0A66C2' : 'white')}
          style={styles.buttonIcon}
        />
      )}
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isOutlined ? '#0A66C2' : 'white'}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isOutlined ? styles.buttonOutlinedText : styles.buttonContainedText,
            labelStyle,
          ]}
        >
          {children}
        </Text>
      )}
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

  // Trigger company refresh when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 DashboardScreen focused - triggering company refresh...');
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

        const queryParam = selectedCompanyId
          ? `?companyId=${selectedCompanyId}`
          : '';

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

        const totalSales = salesArr.reduce(
          (acc, row) => acc + getAmount('sales', row),
          0,
        );
        const totalPurchases = purchasesArr.reduce(
          (acc, row) => acc + getAmount('purchases', row),
          0,
        );
        const companiesCount = companiesData?.length || 0;

        const initialData = {
          totalSales,
          totalPurchases,
          users: 0, // Will be updated in secondary load
          companies: companiesCount,
          recentTransactions: [],
          serviceNameById: new Map(),
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
      // Clear cache to force fresh data
      await AsyncStorage.removeItem(CACHE_KEY);

      // Fetch fresh data and refresh permissions and companies
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

  // Re-fetch dashboard data when global company refresh is triggered
  // Fetch companies only (silent) when global company refresh is triggered
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

      // Process secondary data
      const salesArr = toArray(rawSales);
      const purchasesArr = toArray(rawPurchases);
      const receiptsArr = toArray(rawReceipts);
      const paymentsArr = toArray(rawPayments);
      const journalsArr = toArray(rawJournals);

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

      // Update cache
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

  const goToSettings = () => {
    Alert.alert('Navigation', 'Navigate to Settings screen.');
  };

  const titleFontSize = width < 360 ? 20 : width < 400 ? 22 : 24;
  const subtitleFontSize = width < 360 ? 13 : 14;
  // Make the title larger so it stands out as the main header
  const largeTitleFontSize = width < 360 ? 24 : width < 400 ? 26 : 30;

  return (
    <AppLayout>
      {/* Fixed header placed above scroll to keep controls accessible */}
      <View style={[styles.header, styles.headerFixed]}>
        <View style={styles.headerRow}>
          <Text
            style={[styles.title, { fontSize: largeTitleFontSize }]}
            numberOfLines={1}
            ellipsizeMode="tail"
            includeFontPadding={false}
          >
            Dashboard
          </Text>

          <View style={styles.buttonGroup}>
            {/* Refresh Button */}
            {/* <TouchableOpacity
              onPress={handleRefresh}
              style={[styles.refreshButton, refreshing && styles.refreshButtonActive]}
              disabled={refreshing}
            >
              <RefreshCw
                size={18}
                color="#3b82f6"
                style={[styles.refreshIcon, refreshing && styles.refreshIconActive]}
              />
            </TouchableOpacity> */}

            <Suspense fallback={null}>
              <UpdateWalkthrough />
            </Suspense>

            <Button
              onPress={() => setIsProformaFormOpen(true)}
              icon={FileText}
              iconColor="#3b82f6"
              style={[styles.actionButton, styles.roleBadgeButton]}
              labelStyle={[styles.smallButtonLabel, styles.roleBadgeButtonText]}
              disabled={companies.length === 0}
            >
              Proforma
            </Button>

            <Button
              onPress={() => setIsTransactionFormOpen(true)}
              icon={PlusCircle}
              iconColor="#3b82f6"
              style={[
                styles.actionButton,
                styles.primaryActionButton,
                styles.roleBadgeButton,
              ]}
              labelStyle={[styles.smallButtonLabel, styles.roleBadgeButtonText]}
              disabled={companies.length === 0}
            >
              Transaction
            </Button>
          </View>
        </View>

        <Text
          style={[styles.subtitle, { fontSize: subtitleFontSize }]}
          numberOfLines={1}
          ellipsizeMode="tail"
          includeFontPadding={false}
        >
          {selectedCompany
            ? `An overview of ${selectedCompany.businessName}.`
            : 'An overview across all companies.'}
        </Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
      >
        {/* Account Validity Notice - Placeholder */}
        <Suspense
          fallback={
            <Card style={styles.validityNoticeSkeleton}>
              <ActivityIndicator />
            </Card>
          }
        >
          <AccountValidityNotice onContactSupport={toggleSupport} />
        </Suspense>

        {/* Main Content */}
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
            {/* KPI Cards */}
            <KpiCards
              data={dashboardData}
              selectedCompanyId={selectedCompanyId}
            />

            {/* Product Stock and Recent Transactions */}
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

      {/* Proforma Modal - TransactionsScreen style में */}
      <Modal
        visible={isProformaFormOpen}
        animationType="slide"
        onRequestClose={() => setIsProformaFormOpen(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header - TransactionsScreen style */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Proforma Invoice</Text>
            <TouchableOpacity
              onPress={() => setIsProformaFormOpen(false)}
              style={styles.closeIconButton}
            >
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.modalScroll}>
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

      {/* Transaction Modal - TransactionsScreen style में */}
      <Modal
        visible={isTransactionFormOpen}
        animationType="slide"
        onRequestClose={() => setIsTransactionFormOpen(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header - TransactionsScreen style */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create a New Transaction</Text>
            <TouchableOpacity
              onPress={() => setIsTransactionFormOpen(false)}
              style={styles.closeIconButton}
            >
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Content */}
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

// --- Stylesheet ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'column',
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 40,
  },
  headerFixed: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
    zIndex: 20,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    opacity: 0.9,
    marginTop: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 0,
  },
  actionButton: {
    marginLeft: 6,
    minWidth: 68,
    paddingHorizontal: 8,
    minHeight: 32,
    paddingVertical: 4,
  },
  primaryActionButton: {
    minWidth: 110,
  },
  smallButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Refresh Button Styles
  refreshButton: {
    padding: 6,
    marginRight: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  refreshButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  refreshIcon: {
    opacity: 0.9,
  },
  refreshIconActive: {
    transform: [{ rotate: '360deg' }],
  },
  // Button Styles
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
  /* Role-badge style for buttons (match UserCard role badges) */
  roleBadgeButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeButtonText: {
    color: '#3b82f6',
  },
  // Card Styles
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  // Modal Styles (TransactionsScreen style में updated)
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeIconButton: {
    padding: 4,
  },
  modalScroll: {
    flex: 1,
  },
  // Optional: Inline header के लिए (पुराने style)
  modalHeaderInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
});
