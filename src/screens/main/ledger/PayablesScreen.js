import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  FlatList,
  Alert,
  RefreshControl,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Filter, ArrowLeft } from 'lucide-react-native';
import { BASE_URL } from '../../../config';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { VendorExpenseToggle } from '../../../components/Ledger/vendor-expense-toggle';
import { VendorLedgerView as ImportedVendorLedgerView } from '../../../components/Ledger/vendor-ledger-view';
import { ExpenseLedger as ImportedExpenseLedger } from '../../../components/Ledger/expense-ledger';
import { VendorExpenseList as ImportedVendorExpenseList } from '../../../components/Ledger/vendor-expense-list';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useCompany } from '../../../contexts/company-context';

export default function PayablesScreen() {
  const navigation = useNavigation();
  const baseURL = BASE_URL;
  const [loading, setLoading] = useState(false);
  const { selectedCompanyId, refreshTrigger } = useCompany();
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedExpense, setSelectedExpense] = useState('');
  const [individualExportLoading, setIndividualExportLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: '',
  });
  const [currentView, setCurrentView] = useState('vendor');
  const [expenseTotals, setExpenseTotals] = useState({});
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('');
  const [selectedExpenseFilter, setSelectedExpenseFilter] = useState('');
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [vendorBalances, setVendorBalances] = useState({});
  const [loadingBalances, setLoadingBalances] = useState({});
  const [transactionTotals, setTransactionTotals] = useState({
    totalCredit: 0,
    totalDebit: 0,
  });
  const [loadingTotals, setLoadingTotals] = useState(false);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  // Cache flags to prevent unnecessary reloads
  const dataLoadedRef = useRef({
    vendors: false,
    expenses: false,
    companies: false,
    products: false,
  });

  // Handle hardware back button and swipe gestures
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedVendor || selectedExpense) {
          setSelectedVendor('');
          setSelectedExpense('');
          setSelectedVendorFilter('');
          setSelectedExpenseFilter('');
          AsyncStorage.removeItem('selectedVendor_payables');
          return true;
        }
        return false;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      const unsubscribe = navigation.addListener('beforeRemove', e => {
        if (selectedVendor || selectedExpense) {
          e.preventDefault();
          setSelectedVendor('');
          setSelectedExpense('');
          setSelectedVendorFilter('');
          setSelectedExpenseFilter('');
          AsyncStorage.removeItem('selectedVendor_payables');
        }
      });

      return () => {
        backHandler.remove();
        unsubscribe();
      };
    }, [selectedVendor, selectedExpense, navigation]),
  );

  // For toast notifications
  const showToast = (title, description, type = 'success') => {
    Alert.alert(title, description);
  };

  // Date picker handlers
  const handleFromDatePickerChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowFromDatePicker(false);
    }
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setDateRange(prev => ({
        ...prev,
        from: dateString,
      }));
    }
  };

  const handleToDatePickerChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowToDatePicker(false);
    }
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setDateRange(prev => ({
        ...prev,
        to: dateString,
      }));
    }
  };

  // Optimized fetch products - only load once, in background
  const fetchProducts = useCallback(async () => {
    if (dataLoadedRef.current.products) return;

    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${baseURL}/api/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setProductsList(data.products || data || []);
        dataLoadedRef.current.products = true;
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, [baseURL]);

  // Optimized fetch vendors
  const fetchVendors = useCallback(
    async (forceRefresh = false) => {
      if (dataLoadedRef.current.vendors && !forceRefresh) return;

      try {
        setVendorsLoading(true);
        const token = await AsyncStorage.getItem('token');
        const params = new URLSearchParams();
        if (selectedCompanyId) params.append('companyId', selectedCompanyId);

        const res = await fetch(`${baseURL}/api/vendors?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch vendors');
        }

        const data = await res.json();
        let vendorsArray = [];

        if (Array.isArray(data)) {
          vendorsArray = data;
        } else if (data && Array.isArray(data.vendors)) {
          vendorsArray = data.vendors;
        } else if (data && Array.isArray(data.data)) {
          vendorsArray = data.data;
        }

        setVendors(vendorsArray);
        dataLoadedRef.current.vendors = true;
      } catch (error) {
        console.error('Error fetching vendors:', error);
        setVendors([]);
      } finally {
        setVendorsLoading(false);
      }
    },
    [baseURL, selectedCompanyId],
  );

  // Optimized fetch expenses
  const fetchExpenses = useCallback(
    async (forceRefresh = false) => {
      if (dataLoadedRef.current.expenses && !forceRefresh) return;

      try {
        setExpensesLoading(true);
        const token = await AsyncStorage.getItem('token');
        const params = new URLSearchParams();
        if (selectedCompanyId) params.append('companyId', selectedCompanyId);

        const res = await fetch(
          `${baseURL}/api/payment-expenses?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) {
          throw new Error('Failed to fetch expenses');
        }

        const data = await res.json();
        let expensesArray = [];

        if (Array.isArray(data)) {
          expensesArray = data;
        } else if (data && Array.isArray(data.expenses)) {
          expensesArray = data.expenses;
        } else if (data && Array.isArray(data.data)) {
          expensesArray = data.data;
        } else if (data && data.success && Array.isArray(data.data)) {
          expensesArray = data.data;
        }

        setExpenses(expensesArray);
        dataLoadedRef.current.expenses = true;
      } catch (error) {
        console.error('Error fetching expenses:', error);
        setExpenses([]);
      } finally {
        setExpensesLoading(false);
      }
    },
    [baseURL, selectedCompanyId],
  );

  // Optimized fetch companies
  const fetchCompanies = useCallback(async () => {
    if (dataLoadedRef.current.companies) return;

    try {
      setCompaniesLoading(true);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${baseURL}/api/companies/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch companies');
      }

      const data = await res.json();
      setCompanies(data);
      dataLoadedRef.current.companies = true;
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
    } finally {
      setCompaniesLoading(false);
    }
  }, [baseURL]);

  // Initial data load - parallel for speed
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        currentView === 'vendor' ? fetchVendors() : fetchExpenses(),
        fetchCompanies(),
      ]);

      // Load products in background (non-blocking)
      fetchProducts();
    };

    loadInitialData();
  }, []);

  // Reset data when company changes
  useEffect(() => {
    const resetAndFetch = async () => {
      dataLoadedRef.current.vendors = false;
      dataLoadedRef.current.expenses = false;

      setVendors([]);
      setExpenses([]);
      setVendorBalances({});
      setExpenseTotals({});
      setTransactionTotals({ totalCredit: 0, totalDebit: 0 });

      await Promise.all([fetchVendors(true), fetchExpenses(true)]);
    };

    resetAndFetch();
  }, [selectedCompanyId]);

  // Fetch ledger data based on current view
  const fetchLedgerData = useCallback(async () => {
    if (currentView === 'vendor' && !selectedVendor) {
      setLedgerData(null);
      setLoading(false);
      return;
    }

    if (currentView === 'expense' && !selectedExpense) {
      setLedgerData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');

      let endpoint = '';
      let params = new URLSearchParams();

      if (currentView === 'vendor') {
        endpoint = `${baseURL}/api/ledger/vendor-payables`;
        params.append('vendorId', selectedVendor);
      } else {
        endpoint = `${baseURL}/api/ledger/expense-payables`;
        params.append('expenseId', selectedExpense);
      }

      if (dateRange.from) params.append('fromDate', dateRange.from);
      if (dateRange.to) params.append('toDate', dateRange.to);

      if (selectedCompanyId) {
        params.append('companyId', selectedCompanyId);
      }

      const res = await fetch(`${endpoint}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setLedgerData(data);
      } else {
        console.error('Failed to fetch ledger data');
        setLedgerData(null);
      }
    } catch (error) {
      console.error('Error fetching ledger data:', error);
      setLedgerData(null);
    } finally {
      setLoading(false);
    }
  }, [
    selectedVendor,
    selectedExpense,
    dateRange.from,
    dateRange.to,
    currentView,
    baseURL,
    selectedCompanyId,
  ]);

  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  // Handle vendor selection from filter
  useEffect(() => {
    if (currentView === 'vendor' && selectedVendorFilter) {
      setSelectedVendor(selectedVendorFilter);
      AsyncStorage.setItem('selectedVendor_payables', selectedVendorFilter);
    }
  }, [selectedVendorFilter, currentView]);

  // Handle expense selection from filter
  useEffect(() => {
    if (currentView === 'expense' && selectedExpenseFilter) {
      setSelectedExpense(selectedExpenseFilter);
    }
  }, [selectedExpenseFilter, currentView]);

  const formatDate = useCallback(dateString => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const formatCurrency = useCallback(amount => {
    if (!amount && amount !== 0) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  const getPaymentMethodDisplay = useCallback(method => {
    if (!method) return 'Payment';
    const methodMap = {
      Cash: 'Cash Payment',
      'Bank Transfer': 'Bank Payment',
      UPI: 'UPI Payment',
      Cheque: 'Cheque Payment',
      Credit: 'Credit Purchase',
    };
    return methodMap[method] || `${method} Payment`;
  }, []);

  const getPaymentMethodBadge = useCallback(method => {
    const variantMap = {
      Cash: 'default',
      'Bank Transfer': 'secondary',
      UPI: 'outline',
      Cheque: 'default',
      Credit: 'outline',
    };
    return variantMap[method || ''] || 'outline';
  }, []);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (selectedVendorFilter) count++;
    if (selectedExpenseFilter) count++;
    if (dateRange.from) count++;
    if (dateRange.to) count++;
    return count;
  }, [selectedVendorFilter, selectedExpenseFilter, dateRange]);

  const resetFilters = useCallback(() => {
    setSelectedVendorFilter('');
    setSelectedExpenseFilter('');
    setDateRange({ from: '', to: '' });
  }, []);

  const getCompanyName = useCallback(
    companyId => {
      const company = companies.find(c => c._id === companyId);
      return company?.businessName || 'Unknown Company';
    },
    [companies],
  );

  const calculateTotals = useCallback(() => {
    if (!ledgerData) return { debit: 0, credit: 0, balance: 0 };

    const debitTotal = (ledgerData.debit || []).reduce(
      (sum, entry) => sum + entry.amount,
      0,
    );

    const creditPurchaseEntries = (ledgerData.debit || []).filter(
      entry => entry.paymentMethod !== 'Credit',
    );
    const creditPaymentEntries = ledgerData.credit || [];

    const creditTotal = [
      ...creditPurchaseEntries,
      ...creditPaymentEntries,
    ].reduce((sum, entry) => sum + entry.amount, 0);

    const balance = debitTotal - creditTotal;

    return {
      debit: debitTotal,
      credit: creditTotal,
      balance: balance,
    };
  }, [ledgerData]);

  const handleIndividualExport = async () => {
    try {
      setIndividualExportLoading(true);
      const token = await AsyncStorage.getItem('token');

      if (currentView === 'vendor' && !selectedVendor) {
        showToast(
          'Selection Required',
          'Please select a vendor to export individual vendor data.',
          'error',
        );
        setIndividualExportLoading(false);
        return;
      }

      if (currentView === 'expense' && !selectedExpense) {
        showToast(
          'Selection Required',
          'Please select an expense category to export individual expense data.',
          'error',
        );
        setIndividualExportLoading(false);
        return;
      }

      showToast(
        'Export Feature',
        'Export functionality would be implemented here using react-native-share or similar library.',
        'info',
      );
    } catch (error) {
      console.error('Error during individual export:', error);
      showToast(
        'Export Failed',
        'There was an error exporting the data.',
        'error',
      );
    } finally {
      setIndividualExportLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (currentView === 'vendor') {
        await fetchVendors(true);
      } else {
        await fetchExpenses(true);
      }
      await fetchLedgerData();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [currentView, fetchVendors, fetchExpenses, fetchLedgerData]);

  // Trigger refresh when refreshTrigger increments. Use ref to avoid
  // re-running when onRefresh identity changes.
  const onRefreshRef = React.useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      onRefreshRef.current();
    }
  }, [refreshTrigger]);

  const stats = useMemo(() => {
    return {
      totalVendors: vendors.length,
      totalExpenses: expenses.length,
    };
  }, [vendors.length, expenses.length]);

  const expenseOptions = useMemo(
    () =>
      expenses.map(expense => ({
        value: expense._id,
        label: expense.name,
      })),
    [expenses],
  );

  const isDetailOpen = useMemo(
    () =>
      currentView === 'vendor'
        ? Boolean(selectedVendor)
        : Boolean(selectedExpense),
    [currentView, selectedVendor, selectedExpense],
  );

  const FiltersSection = React.memo(() => (
    <View style={styles.filterSection}>
      <View style={styles.filterHeader}>
        <View style={styles.filterHeaderLeft}>
          <View style={styles.filterIconWrapper}>
            <Icon name="filter-variant" size={18} color="#3B82F6" />
          </View>
          <Text style={styles.filterTitle}>Filters</Text>
          {getActiveFilterCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {getActiveFilterCount()}
              </Text>
            </View>
          )}
        </View>
        {getActiveFilterCount() > 0 && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={resetFilters}
          >
            <Text style={styles.clearFiltersText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterCard}>
        <View style={styles.filterGrid}>
          {currentView === 'vendor' ? (
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>
                 <Icon name="account-multiple" size={14} color="#6B7280" />{' '}Vendor</Text>
              <TouchableOpacity
                style={[
                  styles.filterInput,
                  selectedVendorFilter && styles.filterInputActive,
                ]}
                onPress={() => setShowVendorModal(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterInputText,
                    !selectedVendorFilter && styles.filterInputPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selectedVendorFilter
                    ? vendors.find(v => v._id === selectedVendorFilter)
                        ?.vendorName || 'Select vendor'
                    : 'All vendors'}
                </Text>
                <Icon name="chevron-down" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Expense Category</Text>
              <TouchableOpacity
                style={[
                  styles.filterInput,
                  selectedExpenseFilter && styles.filterInputActive,
                ]}
                onPress={() => setShowExpenseModal(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterInputText,
                    !selectedExpenseFilter && styles.filterInputPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selectedExpenseFilter
                    ? expenses.find(e => e._id === selectedExpenseFilter)
                        ?.name || 'Select category'
                    : 'All categories'}
                </Text>
                <Icon name="chevron-down" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.filterItem}>
            <View style={styles.dateFilterHeader}>
              
              <Text style={styles.filterLabel}>
                 <Icon name="calendar-start" size={14} color="#6B7280" /> {' '}Date Range</Text>
              {(dateRange.from || dateRange.to) && (
                <TouchableOpacity
                  style={styles.dateResetButton}
                  onPress={() => setDateRange({ from: '', to: '' })}
                  activeOpacity={0.6}
                >
                  <Icon name="close-circle" size={14} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.dateRangeRow}>
              <TouchableOpacity
                style={[
                  styles.dateInput,
                  dateRange.from && styles.dateInputActive,
                ]}
                onPress={() => setShowFromDatePicker(true)}
                activeOpacity={0.7}
              >
                <Icon
                  name="calendar-blank"
                  size={16}
                  color={dateRange.from ? '#3B82F6' : '#2564bd'}
                />
                <Text
                  style={[
                    styles.dateInputText,
                    !dateRange.from && styles.dateInputPlaceholder,
                  ]}
                >
                  {dateRange.from ? formatDate(dateRange.from) : 'Start date'}
                </Text>
              </TouchableOpacity>

              <View style={styles.dateSeparator}>
                <View style={styles.dateSeparatorLine} />
              </View>

              <TouchableOpacity
                style={[
                  styles.dateInput,
                  dateRange.to && styles.dateInputActive,
                ]}
                onPress={() => setShowToDatePicker(true)}
                activeOpacity={0.7}
              >
                <Icon
                  name="calendar-blank"
                  size={16}
                  color={dateRange.to ? '#3B82F6' : '#2564bd'}
                />
                <Text
                  style={[
                    styles.dateInputText,
                    !dateRange.to && styles.dateInputPlaceholder,
                  ]}
                >
                  {dateRange.to ? formatDate(dateRange.to) : 'End date'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {showFromDatePicker && (
        <DateTimePicker
          value={dateRange.from ? new Date(dateRange.from) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleFromDatePickerChange}
          maximumDate={new Date()}
        />
      )}
      {showToDatePicker && (
        <DateTimePicker
          value={dateRange.to ? new Date(dateRange.to) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleToDatePickerChange}
          maximumDate={new Date()}
        />
      )}

      <Modal
        visible={showVendorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVendorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vendor</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowVendorModal(false)}
              >
                <Icon name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={vendors}
              keyExtractor={item => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedVendorFilter === item._id &&
                      styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedVendorFilter(item._id);
                    setShowVendorModal(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedVendorFilter === item._id &&
                        styles.modalItemTextSelected,
                    ]}
                  >
                    {item.vendorName}
                  </Text>
                  {selectedVendorFilter === item._id && (
                    <Icon name="check" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showExpenseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExpenseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Expense Category</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowExpenseModal(false)}
              >
                <Icon name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={expenses}
              keyExtractor={item => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedExpenseFilter === item._id &&
                      styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedExpenseFilter(item._id);
                    setShowExpenseModal(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedExpenseFilter === item._id &&
                        styles.modalItemTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {selectedExpenseFilter === item._id && (
                    <Icon name="check" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  ));

  // Minimal loading state
  if (
    (vendorsLoading || expensesLoading) &&
    vendors.length === 0 &&
    expenses.length === 0
  ) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedVendorData = vendors.find(v => v._id === selectedVendor);
  const selectedExpenseData = expenses.find(e => e._id === selectedExpense);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
           <View style={styles.headerMain}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>
                    {currentView === 'vendor'
                      ? 'Vendor Account'
                      : 'Expense Account'}
                  </Text>
                  <View style={styles.mobileToggle}>
                    <VendorExpenseToggle
                      currentView={currentView}
                      onViewChange={setCurrentView}
                    />
                  </View>
                </View>
              </View>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              {isDetailOpen && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setSelectedVendor('');
                    setSelectedExpense('');
                    setSelectedVendorFilter('');
                    setSelectedExpenseFilter('');
                    AsyncStorage.removeItem('selectedVendor_payables');
                  }}
                >
                  <ArrowLeft size={16} color="#3B82F6" />
                  <Text style={styles.backButtonText}>Back to List</Text>
                </TouchableOpacity>
              )}

           
            </View>
          </View>

          <FiltersSection />

          <View style={styles.mainContent}>
            {currentView === 'vendor' ? (
              selectedVendor ? (
                <ImportedVendorLedgerView
                  loading={loading}
                  ledgerData={ledgerData}
                  selectedVendorData={selectedVendorData}
                  formatDate={formatDate}
                  formatCurrency={formatCurrency}
                  getPaymentMethodDisplay={getPaymentMethodDisplay}
                  getPaymentMethodBadge={getPaymentMethodBadge}
                  calculateTotals={calculateTotals}
                  dateRange={dateRange}
                  productsList={productsList}
                />
              ) : (
                <ImportedVendorExpenseList
                  currentView={currentView}
                  vendors={vendors}
                  expenses={expenses}
                  expenseTotals={expenseTotals}
                  vendorBalances={vendorBalances}
                  loadingBalances={loadingBalances}
                  transactionTotals={transactionTotals}
                  loadingTotals={loadingTotals}
                  onSelect={id => {
                    setSelectedVendor(id);
                    setSelectedVendorFilter(id);
                    AsyncStorage.setItem('selectedVendor_payables', id);
                  }}
                  selectedCompanyId={selectedCompanyId}
                  dateRange={dateRange}
                  formatCurrency={formatCurrency}
                  setVendorBalances={setVendorBalances}
                  setLoadingBalances={setLoadingBalances}
                  setTransactionTotals={setTransactionTotals}
                  setLoadingTotals={setLoadingTotals}
                  setExpenseTotals={setExpenseTotals}
                />
              )
            ) : selectedExpense ? (
              <ImportedExpenseLedger
                ledgerData={ledgerData}
                loading={loading}
                selectedExpense={selectedExpense}
                expenses={expenses}
                dateRange={dateRange}
              />
            ) : (
              <ImportedVendorExpenseList
                currentView={currentView}
                vendors={vendors}
                expenses={expenses}
                expenseTotals={expenseTotals}
                onSelect={id => {
                  setSelectedExpense(id);
                  setSelectedExpenseFilter(id);
                }}
                selectedCompanyId={selectedCompanyId}
                formatCurrency={formatCurrency}
                setExpenseTotals={setExpenseTotals}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: -50,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 6,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    marginBottom: 8,
  },
  headerTop: {
    marginBottom: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,

    // backgroundColor:'white'
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  headerMain: {
    backgroundColor:'white',
     paddingHorizontal: 10,
     paddingVertical:10,
      elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  mobileToggle: {
    display: 'flex',
  },
  filterSection: {
    marginBottom: 4,
    backgroundColor:'white',
     borderRadius: 16,
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  filterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    letterSpacing: -0.2,
  },
  filterBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterCard: {
    backgroundColor: '#FFFFFF',
    // borderRadius: 16,
    // padding: 12,
    // shadowColor: '#0F172A',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.04,
    // shadowRadius: 8,
    // elevation: 2,
  },
  filterGrid: {
    gap: 16,
  },
  filterItem: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  filterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    // paddingVertical: 13,
    minHeight: 40,
  },
  filterInputActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#3B82F6',
  },
  filterInputText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    flex: 1,
    letterSpacing: -0.2,
  },
  filterInputPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  dateFilterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateResetButton: {
    padding: 4,
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    // paddingVertical: 11,
    minHeight: 40,
  },
  dateInputActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#3B82F6',
  },
  dateInputText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    flex: 1,
    letterSpacing: -0.2,
  },
  dateInputPlaceholder: {
    color: '#252627',
    fontWeight: '400',
  },
  dateSeparator: {
    width: 20,
    alignItems: 'center',
  },
  dateSeparatorLine: {
    width: 8,
    height: 1.5,
    backgroundColor: '#3e3e3f',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
    letterSpacing: -0.2,
  },
  modalItemTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  mainContent: {
    gap: 24,
  },
});
