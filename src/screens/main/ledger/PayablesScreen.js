import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  FlatList,
  Alert,
  RefreshControl,
 
  Dimensions
} from 'react-native';
import{SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Filter,
  Download,
  Calendar,
  ArrowLeft,
  FileText,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Users,
  IndianRupee,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Minus,
  DownloadIcon,
} from 'lucide-react-native';
import { BASE_URL } from '../../../config';

// Import your React Native components
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { VendorExpenseToggle } from '../../../components/Ledger/vendor-expense-toggle';
import { VendorLedgerView as ImportedVendorLedgerView } from '../../../components/Ledger/vendor-ledger-view'; 
import { ExpenseLedger as ImportedExpenseLedger } from '../../../components/Ledger/expense-ledger';
import { VendorExpenseList as ImportedVendorExpenseList } from '../../../components/Ledger/vendor-expense-list'; 
import { Skeleton } from "../../../components/ui/Skeleton";

export default function PayablesScreen() {
  const baseURL = BASE_URL;
  const [loading, setLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [expensesLoading, setExpensesLoading] = useState(true);
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
  const [companiesLoading, setCompaniesLoading] = useState(true);
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

  // For toast notifications
  const showToast = (title, description, type = 'success') => {
    Alert.alert(title, description);
  };

  // Placeholder for company context
  // const { selectedCompanyId } = useCompany();
  const selectedCompanyId = null;

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, [baseURL]);

  const fetchProducts = async () => {
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
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const expenseOptions = expenses.map((expense) => ({
    value: expense._id,
    label: expense.name,
  }));

  const isDetailOpen = currentView === 'vendor'
    ? Boolean(selectedVendor)
    : Boolean(selectedExpense);

  // Fetch vendors
  useEffect(() => {
    fetchVendors();
  }, [baseURL, selectedCompanyId]);

  const fetchVendors = async () => {
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
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendors([]);
    } finally {
      setVendorsLoading(false);
    }
  };

  // Fetch expenses
  useEffect(() => {
    fetchExpenses();
  }, [baseURL, selectedCompanyId]);

  const fetchExpenses = async () => {
    try {
      setExpensesLoading(true);
      const token = await AsyncStorage.getItem('token');
      const params = new URLSearchParams();
      if (selectedCompanyId) params.append('companyId', selectedCompanyId);
      const res = await fetch(`${baseURL}/api/payment-expenses?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

      // Fetch totals for expenses
      const totals = {};
      for (const expense of expensesArray) {
        try {
          const params = new URLSearchParams();
          params.append('expenseId', expense._id);
          if (dateRange.from) params.append('fromDate', dateRange.from);
          if (dateRange.to) params.append('toDate', dateRange.to);
          if (selectedCompanyId) params.append('companyId', selectedCompanyId);

          const totalRes = await fetch(
            `${baseURL}/api/ledger/expense-payables?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (totalRes.ok) {
            const totalData = await totalRes.json();
            const cashExpenses = (totalData.debit || [])
              .filter((e) => e.paymentMethod !== 'Credit')
              .reduce(
                (sum, e) => sum + Number(e.amount || 0),
                0
              );

            const payments = (totalData.credit || []).reduce(
              (sum, e) => sum + Number(e.amount || 0),
              0
            );

            totals[expense._id] = cashExpenses + payments;
          }
        } catch (error) {
          console.error(`Error fetching total for expense ${expense._id}:`, error);
        }
      }
      setExpenseTotals(totals);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
    } finally {
      setExpensesLoading(false);
    }
  };

  // Fetch companies
  useEffect(() => {
    fetchCompanies();
  }, [baseURL]);

  const fetchCompanies = async () => {
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
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
    } finally {
      setCompaniesLoading(false);
    }
  };

  // Fetch ledger data based on current view
  useEffect(() => {
    fetchLedgerData();
  }, [
    selectedVendor,
    selectedExpense,
    dateRange.from,
    dateRange.to,
    currentView,
    baseURL,
    selectedCompanyId
  ]);

  const fetchLedgerData = async () => {
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
  };

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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getPaymentMethodDisplay = (method) => {
    if (!method) return 'Payment';
    const methodMap = {
      Cash: 'Cash Payment',
      'Bank Transfer': 'Bank Payment',
      UPI: 'UPI Payment',
      Cheque: 'Cheque Payment',
      Credit: 'Credit Purchase',
    };
    return methodMap[method] || `${method} Payment`;
  };

  const getPaymentMethodBadge = (method) => {
    const variantMap = {
      Cash: 'default',
      'Bank Transfer': 'secondary',
      UPI: 'outline',
      Cheque: 'default',
      Credit: 'outline',
    };
    return variantMap[method || ''] || 'outline';
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedVendorFilter) count++;
    if (selectedExpenseFilter) count++;
    if (dateRange.from) count++;
    if (dateRange.to) count++;
    return count;
  };

  const resetFilters = () => {
    setSelectedVendorFilter('');
    setSelectedExpenseFilter('');
    setDateRange({ from: '', to: '' });
  };

  const getCompanyName = (companyId) => {
    const company = companies.find((c) => c._id === companyId);
    return company?.businessName || 'Unknown Company';
  };

  const calculateTotals = () => {
    if (!ledgerData) return { debit: 0, credit: 0, balance: 0 };

    const debitTotal = (ledgerData.debit || []).reduce(
      (sum, entry) => sum + entry.amount,
      0
    );

    const creditPurchaseEntries = (ledgerData.debit || []).filter(
      (entry) => entry.paymentMethod !== 'Credit'
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
  };

  const handleIndividualExport = async () => {
    try {
      setIndividualExportLoading(true);
      const token = await AsyncStorage.getItem('token');

      if (currentView === 'vendor' && !selectedVendor) {
        showToast('Selection Required', 'Please select a vendor to export individual vendor data.', 'error');
        setIndividualExportLoading(false);
        return;
      }

      if (currentView === 'expense' && !selectedExpense) {
        showToast('Selection Required', 'Please select an expense category to export individual expense data.', 'error');
        setIndividualExportLoading(false);
        return;
      }

      showToast('Export Feature', 'Export functionality would be implemented here using react-native-share or similar library.', 'info');

    } catch (error) {
      console.error('Error during individual export:', error);
      showToast('Export Failed', 'There was an error exporting the data.', 'error');
    } finally {
      setIndividualExportLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (currentView === 'vendor') {
        await fetchVendors();
      } else {
        await fetchExpenses();
      }
      await fetchLedgerData();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch overall transaction totals
  const fetchOverallTotals = async () => {
    try {
      setLoadingTotals(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found.");
      }

      let totalCredit = 0;
      let totalDebit = 0;

      // Fetch ledger data for each vendor
      const vendorPromises = vendors.map(async (vendor) => {
        try {
          const params = new URLSearchParams();
          params.append("vendorId", vendor._id);
          if (selectedCompanyId) params.append("companyId", selectedCompanyId);
          const response = await fetch(
            `${baseURL}/api/ledger/vendor-payables?${params.toString()}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const debitTotal = (data.debit || []).reduce(
              (sum, entry) => sum + (entry.amount || 0),
              0
            );

            const creditPurchaseEntries = (data.debit || []).filter(
              (entry) => entry.paymentMethod !== "Credit"
            );
            const creditPaymentEntries = data.credit || [];

            const creditTotal = [
              ...creditPurchaseEntries,
              ...creditPaymentEntries,
            ].reduce((sum, entry) => sum + (entry.amount || 0), 0);

            return {
              debit: debitTotal,
              credit: creditTotal,
              vendorName: vendor.vendorName,
            };
          } else {
            console.error(`Failed to fetch ledger data for vendor ${vendor._id}`);
            return { debit: 0, credit: 0, vendorName: vendor.vendorName };
          }
        } catch (error) {
          console.error(`Error fetching ledger data for vendor ${vendor._id}:`, error);
          return { debit: 0, credit: 0, vendorName: vendor.vendorName };
        }
      });

      const vendorResults = await Promise.all(vendorPromises);

      // Sum up all vendor totals
      vendorResults.forEach((result) => {
        totalDebit += result.debit;
        totalCredit += result.credit;
      });

      setTransactionTotals({
        totalCredit,
        totalDebit,
      });
    } catch (error) {
      console.error("Error fetching overall totals:", error);
      setTransactionTotals({
        totalCredit: 0,
        totalDebit: 0,
      });
    } finally {
      setLoadingTotals(false);
    }
  };

  // Fetch balance for a vendor
  const fetchVendorBalance = async (vendorId) => {
    if (!vendorId || vendorBalances[vendorId] !== undefined) return;

    try {
      setLoadingBalances((prev) => ({ ...prev, [vendorId]: true }));

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const params = new URLSearchParams();
      if (selectedCompanyId) params.append('companyId', selectedCompanyId);
      const response = await fetch(
        `${baseURL}/api/vendors/${vendorId}/balance?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setVendorBalances((prev) => ({
          ...prev,
          [vendorId]: data.balance || 0,
        }));
      } else {
        console.error(`Failed to fetch balance for vendor ${vendorId}`);
        setVendorBalances((prev) => ({
          ...prev,
          [vendorId]: 0,
        }));
      }
    } catch (error) {
      console.error(`Error fetching balance for vendor ${vendorId}:`, error);
      setVendorBalances((prev) => ({
        ...prev,
        [vendorId]: 0,
      }));
    } finally {
      setLoadingBalances((prev) => ({ ...prev, [vendorId]: false }));
    }
  };

  // Fetch balances for all vendors when component mounts
  useEffect(() => {
    if (currentView === 'vendor') {
      vendors.forEach((vendor) => {
        fetchVendorBalance(vendor._id);
      });
      fetchOverallTotals();
    }
  }, [vendors, currentView, selectedCompanyId]);

  // Calculate statistics
  const stats = useMemo(() => {
    // Calculate settled vendors
    const settledVendors = vendors.filter(v => {
      const balance = vendorBalances[v._id];
      return balance !== undefined && balance === 0;
    }).length;

    // Calculate net balance
    const netBalance = transactionTotals.totalDebit - transactionTotals.totalCredit; // Debit is purchase (you owe), Credit is payment (you paid)

    return {
      totalVendors: vendors.length,
      totalExpenses: expenses.length,
      netBalance,
      totalExpenseAmount: Object.values(expenseTotals).reduce(
        (sum, amount) => sum + amount,
        0
      ),
      settledVendors,
      totalCredit: transactionTotals.totalCredit,
      totalDebit: transactionTotals.totalDebit,
    };
  }, [vendors, expenses, expenseTotals, vendorBalances, transactionTotals]);

  const FiltersSection = () => (
    <View style={styles.filterSection}>
      <View style={styles.filterHeader}>
        <View style={styles.filterTitleContainer}>
          <Filter size={16} color="#64748b" />
          <Text style={styles.filterTitle}>
            {isDetailOpen
              ? 'Filter Transactions'
              : `Filter ${currentView === 'vendor' ? 'Vendors' : 'Expenses'}`}
          </Text>
        </View>
        <Badge variant="secondary">
          <Text>{getActiveFilterCount()} active</Text>
        </Badge>
      </View>

      <View style={styles.filterCard}>
        <View style={styles.filterRow}>
          {currentView === 'vendor' && (
            <View style={styles.filterInputContainer}>
              <Text style={styles.filterLabel}>
                {isDetailOpen ? 'Switch Vendor' : 'Filter by Vendor'}
              </Text>
              <TouchableOpacity
                style={styles.comboboxTrigger}
                onPress={() => setShowVendorModal(true)}
              >
                <Text style={[
                  styles.comboboxPlaceholder,
                  selectedVendorFilter && styles.comboboxValue
                ]}>
                  {selectedVendorFilter
                    ? vendors.find(v => v._id === selectedVendorFilter)?.vendorName || 'Select vendor...'
                    : 'Select vendor...'}
                </Text>
              </TouchableOpacity>

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
                      <TouchableOpacity onPress={() => setShowVendorModal(false)}>
                        <Text style={styles.modalClose}>×</Text>
                      </TouchableOpacity>
                    </View>
                    <FlatList
                      data={vendors}
                      keyExtractor={(item) => item._id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedVendorFilter(item._id);
                            setShowVendorModal(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{item.vendorName}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </View>
              </Modal>
            </View>
          )}

          {currentView === 'expense' && (
            <View style={styles.filterInputContainer}>
              <Text style={styles.filterLabel}>
                {isDetailOpen ? 'Switch Category' : 'Filter by Expense Category'}
              </Text>
              <TouchableOpacity
                style={styles.comboboxTrigger}
                onPress={() => setShowExpenseModal(true)}
              >
                <Text style={[
                  styles.comboboxPlaceholder,
                  selectedExpenseFilter && styles.comboboxValue
                ]}>
                  {selectedExpenseFilter
                    ? expenses.find(e => e._id === selectedExpenseFilter)?.name || 'Select category...'
                    : 'Select category...'}
                </Text>
              </TouchableOpacity>

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
                      <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
                        <Text style={styles.modalClose}>×</Text>
                      </TouchableOpacity>
                    </View>
                    <FlatList
                      data={expenses}
                      keyExtractor={(item) => item._id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedExpenseFilter(item._id);
                            setShowExpenseModal(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </View>
              </Modal>
            </View>
          )}

          <View style={styles.filterInputContainer}>
            <Text style={styles.filterLabel}>Date Range</Text>
            <View style={styles.dateRangeContainer}>
              <View style={styles.dateInputContainer}>
                <Calendar size={16} color="#94a3b8" style={styles.dateIcon} />
                <TextInput
                  style={styles.dateInput}
                  value={dateRange.from}
                  onChangeText={(text) => {
                    setDateRange((prev) => ({
                      ...prev,
                      from: text,
                    }));
                  }}
                  placeholder="From date"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={styles.dateInputContainer}>
                <Calendar size={16} color="#94a3b8" style={styles.dateIcon} />
                <TextInput
                  style={styles.dateInput}
                  value={dateRange.to}
                  onChangeText={(text) => {
                    setDateRange((prev) => ({
                      ...prev,
                      to: text,
                    }));
                  }}
                  placeholder="To date"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  // StatCard Component
  // const StatCard = ({
  //   title,
  //   value,
  //   subtitle,
  //   icon: Icon,
  //   trend,
  //   className = "",
  //   loading = false,
  //   valueColor = ""
  // }) => {
  //   const trendColor = trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#64748b';

  //   return (
  //     <Card style={[styles.statCard, className]}>
  //       <CardContent style={styles.statCardContent}>
  //         <View style={styles.statCardHeader}>
  //           <View style={[styles.statCardIcon, { backgroundColor: trendColor + '20' }]}>
  //             <Icon size={18} color={trendColor} />
  //           </View>
  //           <Text style={styles.statCardTitle}>{title}</Text>
  //         </View>
          
  //         {loading ? (
  //           <ActivityIndicator size="small" color="#64748b" style={styles.statLoading} />
  //         ) : (
  //           <View style={styles.statCardValueRow}>
  //             <Text style={[styles.statCardValue, valueColor && { color: valueColor }]}>
  //               {value}
  //             </Text>
  //           </View>
  //         )}
          
  //         <Text style={styles.statCardSubtitle}>{subtitle}</Text>
  //       </CardContent>
  //     </Card>
  //   );
  // };

  // const getNetBalanceConfig = (netBalance) => {
  //   // netBalance > 0 means Debit > Credit, so you owe money (Payable)
  //   if (netBalance > 0) {
  //     return {
  //       title: "Net Payable",
  //       subtitle: "Total amount you owe",
  //       icon: TrendingUp, // Payable is a negative trend for cash flow
  //       trend: "down",
  //       className: styles.netPayableCard,
  //       textColor: "#dc2626"
  //     };
  //   } else if (netBalance < 0) {
  //     // netBalance < 0 means Debit < Credit, so they owe you (Advance)
  //     return {
  //       title: "Net Advance",
  //       subtitle: "Total advance with vendors",
  //       icon: TrendingDown, // Advance is a positive trend for cash flow
  //       trend: "up",
  //       className: styles.netAdvanceCard,
  //       textColor: "#16a34a"
  //     };
  //   } else {
  //     return {
  //       title: "Net Balance",
  //       subtitle: "All accounts settled",
  //       icon: Minus,
  //       trend: "neutral",
  //       className: "",
  //       textColor: "#64748b"
  //     };
  //   }
  // };

  // const netBalanceConfig = getNetBalanceConfig(stats.netBalance);

  // const StatsSection = () => (
  //   <View style={styles.statsSection}>
  //     <View style={styles.statsGrid}>
  //       {currentView === 'vendor' ? (
  //         <>
  //           <StatCard
  //             title="Total Vendors"
  //             value={<Text>{stats.totalVendors.toString()}</Text>}
  //             subtitle={<Text>{`${stats.settledVendors} settled`}</Text>}
  //             icon={Users}
  //             trend="neutral"
  //           />
  //           <StatCard
  //             title={netBalanceConfig.title}
  //             value={<Text>{formatCurrency(Math.abs(stats.netBalance))}</Text>}
  //             subtitle={<Text>{netBalanceConfig.subtitle}</Text>}
  //             icon={netBalanceConfig.icon}
  //             trend={netBalanceConfig.trend}
  //             className={netBalanceConfig.className}
  //             valueColor={netBalanceConfig.textColor}
  //           />
  //           <StatCard
  //             title="Total Purchases (Debit)"
  //             value={<Text>{formatCurrency(stats.totalDebit)}</Text>}
  //             subtitle={<Text>Purchases made from vendors</Text>}
  //             icon={IndianRupee}
  //             trend="down"
  //             loading={loadingTotals}
  //             className={stats.totalDebit > 0 ? styles.debitCard : ''}
  //           />
  //           <StatCard
  //             title="Total Payments (Credit)"
  //             value={<Text>{formatCurrency(stats.totalCredit)}</Text>}
  //             subtitle={<Text>Payments made to vendors</Text>}
  //             icon={CreditCard}
  //             trend="up"
  //             loading={loadingTotals}
  //             className={stats.totalCredit > 0 ? styles.creditCard : ''}
  //           />
  //         </>
  //       ) : (
  //         <>
  //           <StatCard
  //             title="Expense Categories"
  //             value={<Text>{stats.totalExpenses.toString()}</Text>}
  //             subtitle={<Text>Total categories</Text>}
  //             icon={FileText}
  //             trend="neutral"
  //           />
  //           <StatCard
  //             title="Total Expenses"
  //             value={<Text>{formatCurrency(stats.totalExpenseAmount)}</Text>}
  //             subtitle={<Text>Total amount spent</Text>}
  //             icon={TrendingUp}
  //             trend="neutral"
  //           />
  //         </>
  //       )}
  //     </View>
  //   </View>
  // );

  if (vendorsLoading || expensesLoading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingHeader}>
            <View>
              <Skeleton style={styles.loadingTitle} />
              <Skeleton style={styles.loadingSubtitle} />
            </View>
            <Skeleton style={styles.loadingButton} />
          </View>
          <Skeleton style={styles.loadingCard} />
        </View>
      </SafeAreaView>
    );
  }

  const selectedVendorData = vendors.find((v) => v._id === selectedVendor);
  const selectedExpenseData = expenses.find((e) => e._id === selectedExpense);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
                  <ArrowLeft size={16} color="#64748b" />
                  <Text style={styles.backButtonText}>Back to List</Text>
                </TouchableOpacity>
              )}

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
            </View>

            <View style={styles.headerActions}>
              <Button
                onPress={handleIndividualExport}
                disabled={individualExportLoading || !isDetailOpen}
                variant="outline"
                style={styles.exportButton}
                // icon={Download}
                loading={individualExportLoading}
              >
                <Icon name="download" size={20} />
                <Text>
                  {/* <Download/> */}
                  Export {currentView === 'vendor' ? 'Vendor' : 'Category'}
                </Text>
              </Button>

              <View style={styles.desktopToggle}>
                <VendorExpenseToggle
                  currentView={currentView}
                  onViewChange={setCurrentView}
                />
              </View>
            </View>
          </View>

          <FiltersSection />

          {/* <StatsSection /> */}

          <View style={styles.mainContent}>
            {currentView === 'vendor' ? (
              selectedVendor ? (
                // Using the IMPORTED VendorLedgerView component
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
                // Using the IMPORTED VendorExpenseList component
                <ImportedVendorExpenseList
                  currentView={currentView}
                  vendors={vendors}
                  expenses={expenses}
                  expenseTotals={expenseTotals}
                  vendorBalances={vendorBalances}
                  loadingBalances={loadingBalances}
                  transactionTotals={transactionTotals}
                  loadingTotals={loadingTotals}
                  onSelect={(id) => {
                    setSelectedVendor(id);
                    setSelectedVendorFilter(id);
                    AsyncStorage.setItem('selectedVendor_payables', id);
                  }}
                  selectedCompanyId={selectedCompanyId}
                  formatCurrency={formatCurrency}
                />
              )
            ) : selectedExpense ? (
              <ImportedExpenseLedger
              ledgerData={ledgerData}
              loading={loading}
              selectedExpense={selectedExpense}
              expenses={expenses}
              dateRange={dateRange}/>
            ) : (
              // Using the IMPORTED VendorExpenseList component
              <ImportedVendorExpenseList
                currentView={currentView}
                vendors={vendors}
                expenses={expenses}
                expenseTotals={expenseTotals}
                onSelect={(id) => {
                  setSelectedExpense(id);
                  setSelectedExpenseFilter(id);
                }}
                selectedCompanyId={selectedCompanyId}
                formatCurrency={formatCurrency}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    // paddingTop:-40
    
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 6,
    marginTop: -10
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  loadingContent: {
    flex: 1,
  },
  loadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingTitle: {
    height: 32,
    width: 200,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginBottom: 8,
  },
  loadingSubtitle: {
    height: 16,
    width: 150,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
  },
  loadingButton: {
    height: 40,
    width: 160,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
  },
  loadingCard: {
    height: 200,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
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
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: '#64748b',
  },
  headerMain: {
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  mobileToggle: {
    display: 'flex',
  },
  desktopToggle: {
    display: 'none',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterSection: {
    marginBottom: 16,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    width: '48%', // Two boxes per row
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 10,
    minHeight: 120, // Consistent height
  },
  statCardContent: {
    padding: 12, // Reduced padding
    flex: 1,
    justifyContent: 'space-between',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardTitle: {
    fontSize: 11, // Smaller font
    fontWeight: '500',
    color: '#64748b',
    flex: 1,
  },
  statCardValueRow: {
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 16, // Reduced from 20
    fontWeight: 'bold',
    color: '#0f172a',
  },
  statCardSubtitle: {
    fontSize: 10, // Smaller font
    color: '#94a3b8',
    lineHeight: 14,
  },
  statCardIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statLoading: {
    marginVertical: 8,
  },
  netPayableCard: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  netAdvanceCard: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  creditCard: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  debitCard: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  filterCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    // borderRadius: 12,
    // borderWidth: 1,
    // borderColor: '#e2e8f0',
    padding: 2,
  },
  filterRow: {
    gap: 16,
  },
  filterInputContainer: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  comboboxTrigger: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  comboboxPlaceholder: {
    color: '#94a3b8',
    fontSize: 14,
  },
  comboboxValue: {
    color: '#0f172a',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#0f172a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '80%',
    maxHeight: '60%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748b',
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#334155',
  },
  mainContent: {
    gap: 24,
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  comingSoonText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
  },
});