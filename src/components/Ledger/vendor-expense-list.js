import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  ChevronRight,
  IndianRupee,
  ArrowUpRight,
  ArrowDownLeft,
  Minus,
  CreditCard
} from 'lucide-react-native';

import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { BASE_URL } from '../../config';

const Badge = React.memo(({ children, variant = 'default', style }) => {
  const badgeStyles = [
    styles.badge,
    variant === 'secondary' && styles.badgeSecondary,
    variant === 'destructive' && styles.badgeDestructive,
    style
  ];
  
  return (
    <View style={badgeStyles}>
      {typeof children === 'string' ? <Text style={styles.badgeText}>{children}</Text> : children}
    </View>
  );
});

const StatCard = React.memo(({ title, value, subtitle, icon: IconComponent, loading, textColor }) => {
  const iconConfig = useMemo(() => {
    const configs = {
      'Total Vendors': { color: '#3B82F6', bg: '#EFF6FF' },
      'Net Payable': { color: '#EF4444', bg: '#FEF2F2' },
      'Net Advance': { color: '#10B981', bg: '#F0FDF4' },
      'Total Credit': { color: '#8B5CF6', bg: '#F5F3FF' },
      'Total Debit': { color: '#F59E0B', bg: '#FFFBEB' },
      'Expense Categories': { color: '#3B82F6', bg: '#EFF6FF' },
      'Total Expenses': { color: '#3B82F6', bg: '#EFF6FF' }
    };
    return configs[title] || { color: '#3B82F6', bg: '#EFF6FF' };
  }, [title]);

  return (
    <View style={styles.statCard}>
      <View style={styles.statCardContent}>
        <View style={styles.statTopRow}>
          <Text style={styles.statLabel}>{title}</Text>
          <View style={[styles.statIconBg, { backgroundColor: iconConfig.bg }]}>
            <IconComponent size={14} color={iconConfig.color} strokeWidth={2.5} />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={iconConfig.color} style={styles.statLoader} />
        ) : (
          <Text style={[styles.statValue, textColor && { color: textColor }]} numberOfLines={1}>
            {value}
          </Text>
        )}

        <Text style={styles.statSubtext} numberOfLines={2}>{subtitle}</Text>
      </View>
    </View>
  );
});

const ListItem = React.memo(({ 
  item, 
  currentView, 
  selectedCompanyId, 
  vendorBalances, 
  expenseTotals, 
  loadingBalances,
  formatCurrency,
  onSelect,
  onItemVisible
}) => {
  const isVendor = currentView === 'vendor';
  const name = isVendor ? item.vendorName : item.name;
  const id = item._id;
  
  // Trigger lazy loading when item becomes visible
  useEffect(() => {
    if (onItemVisible) {
      onItemVisible(id, isVendor);
    }
  }, [id, isVendor, onItemVisible]);
  
  const total = useMemo(() => {
    if (isVendor) {
      if (selectedCompanyId && vendorBalances[id] !== undefined) {
        return vendorBalances[id];
      }
      return item.balance || 0;
    }
    return expenseTotals[id] || 0;
  }, [isVendor, selectedCompanyId, vendorBalances, id, item.balance, expenseTotals]);

  const isLoading = loadingBalances && loadingBalances[id];
  
  const { balanceColor, iconBg, iconColor, badgeBg, balanceText } = useMemo(() => {
    if (isVendor) {
      if (total < 0) return {
        balanceColor: '#ef4444',
        iconBg: styles.iconRed,
        iconColor: '#ef4444',
        badgeBg: styles.badgeRed,
        balanceText: 'You Owe'
      };
      if (total > 0) return {
        balanceColor: '#10b981',
        iconBg: styles.iconGreen,
        iconColor: '#10b981',
        badgeBg: styles.badgeGreen,
        balanceText: 'Advance'
      };
      return {
        balanceColor: '#64748b',
        iconBg: styles.iconGray,
        iconColor: '#64748b',
        badgeBg: styles.badgeGray,
        balanceText: 'Settled'
      };
    }
    return {
      balanceColor: '#3b82f6',
      iconBg: styles.iconBlue,
      iconColor: '#3b82f6',
      badgeBg: styles.expenseBadge,
      balanceText: ''
    };
  }, [isVendor, total]);

  const BalanceIcon = useMemo(() => {
    if (total < 0) return <ArrowUpRight size={12} color="#ef4444" strokeWidth={2.5} />;
    if (total > 0) return <ArrowDownLeft size={12} color="#10b981" strokeWidth={2.5} />;
    return <Minus size={12} color="#64748b" strokeWidth={2.5} />;
  }, [total]);

  const handlePress = useCallback(() => {
    onSelect(id);
  }, [onSelect, id]);

  return (
    <TouchableOpacity
      style={styles.listItem}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <View style={[styles.itemIcon, iconBg]}>
            {isVendor ? (
              <Users size={16} color={iconColor} strokeWidth={2} />
            ) : (
              <FileText size={16} color="#3b82f6" strokeWidth={2} />
            )}
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
            {isVendor && (
              <View style={styles.itemBalanceInfo}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <>
                    <Text style={[styles.balanceText, { color: balanceColor }]}>
                      {balanceText}
                    </Text>
                    {total !== 0 && (
                      <View style={[styles.balanceBadge, badgeBg]}>
                        {BalanceIcon}
                        <Text style={[styles.balanceBadgeText, { color: balanceColor }]}>
                          {formatCurrency(Math.abs(total))}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.itemActions}>
          {!isVendor && (
            <View style={[styles.balanceBadge, styles.expenseBadge]}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <>
                  <IndianRupee size={12} color="#3b82f6" strokeWidth={2.5} />
                  <Text style={styles.expenseBadgeText}>{formatCurrency(total)}</Text>
                </>
              )}
            </View>
          )}
          <View style={styles.viewButton}>
            <ChevronRight size={18} color="#3b82f6" strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export function VendorExpenseList({
  currentView,
  vendors,
  expenses,
  expenseTotals,
  vendorBalances,
  loadingBalances,
  transactionTotals,
  loadingTotals,
  onSelect,
  selectedCompanyId,
  dateRange,
  formatCurrency,
  // State setters for updating parent
  setVendorBalances,
  setLoadingBalances,
  setTransactionTotals,
  setLoadingTotals,
  setExpenseTotals,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: 'recent', // Default sort is 'recent'
    direction: 'desc' // Default direction is descending (newest first)
  });
  
  const itemsPerPage = 10;
  const baseURL = BASE_URL;

  // Track which items have been loaded for balances (lazy loading)
  const loadedBalancesRef = useRef(new Set());
  const loadingQueueRef = useRef(new Set());
  
  // Track if we've loaded the global totals
  const globalTotalsLoadedRef = useRef(false);
  
  // Track last transaction dates for sorting
  const vendorLastTransactionDatesRef = useRef({});
  const expenseLastTransactionDatesRef = useRef({});

  // ==========================================================================
  // GLOBAL TOTALS: Fetch for ALL vendors (for KPI cards) - ONE TIME ONLY
  // ==========================================================================
  const fetchGlobalTotals = useCallback(async () => {
    if (currentView !== 'vendor' || vendors.length === 0) return;
    if (globalTotalsLoadedRef.current) return; // Only load once
    if (!setLoadingTotals || !setTransactionTotals) return;

    try {
      setLoadingTotals(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      let totalCredit = 0;
      let totalDebit = 0;
      const vendorDates = {};

      // Fetch in batches to avoid overwhelming server
      const batchSize = 5;
      for (let i = 0; i < vendors.length; i += batchSize) {
        const batch = vendors.slice(i, i + batchSize);
        
        const vendorResults = await Promise.all(
          batch.map(async vendor => {
            try {
              const params = new URLSearchParams();
              params.append('vendorId', vendor._id);
              if (selectedCompanyId) params.append('companyId', selectedCompanyId);
              
              const response = await fetch(
                `${baseURL}/api/ledger/vendor-payables?${params.toString()}`,
                {
                  method: 'GET',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              );

              if (response.ok) {
                const data = await response.json();
                const debitTotal = (data.debit || []).reduce(
                  (sum, entry) => sum + (entry.amount || 0),
                  0,
                );

                const creditPurchaseEntries = (data.debit || []).filter(
                  entry => entry.paymentMethod !== 'Credit',
                );
                const creditPaymentEntries = data.credit || [];

                const creditTotal = [
                  ...creditPurchaseEntries,
                  ...creditPaymentEntries,
                ].reduce((sum, entry) => sum + (entry.amount || 0), 0);

                // Get last transaction date for sorting
                const allEntries = [...(data.debit || []), ...(data.credit || [])];
                let lastDate = null;
                if (allEntries.length > 0) {
                  lastDate = allEntries.reduce((latest, entry) => {
                    return new Date(entry.date) > new Date(latest) ? entry.date : latest;
                  }, allEntries[0].date);
                }
                
                return {
                  debit: debitTotal,
                  credit: creditTotal,
                  lastDate,
                  vendorId: vendor._id
                };
              }
              return { debit: 0, credit: 0, lastDate: null, vendorId: vendor._id };
            } catch (error) {
              console.error(
                `Error fetching ledger data for vendor ${vendor._id}:`,
                error,
              );
              return { debit: 0, credit: 0, lastDate: null, vendorId: vendor._id };
            }
          })
        );

        // Accumulate totals and dates
        vendorResults.forEach(result => {
          totalDebit += result.debit;
          totalCredit += result.credit;
          if (result.lastDate) {
            vendorDates[result.vendorId] = result.lastDate;
          }
        });

        // Update state progressively
        setTransactionTotals({
          totalCredit,
          totalDebit,
        });
        
        // Update dates ref
        vendorLastTransactionDatesRef.current = {
          ...vendorLastTransactionDatesRef.current,
          ...vendorDates
        };
      }

      globalTotalsLoadedRef.current = true;
    } catch (error) {
      console.error('Error fetching global totals:', error);
    } finally {
      setLoadingTotals(false);
    }
  }, [currentView, vendors, selectedCompanyId, baseURL, setLoadingTotals, setTransactionTotals]);

  // ==========================================================================
  // LAZY LOADING: Fetch balance for individual items when they become visible
  // ==========================================================================
  const fetchVendorBalance = useCallback(
    async (vendorId) => {
      if (loadedBalancesRef.current.has(vendorId) || loadingQueueRef.current.has(vendorId)) {
        return;
      }

      loadingQueueRef.current.add(vendorId);
      
      if (setLoadingBalances) {
        setLoadingBalances(prev => ({ ...prev, [vendorId]: true }));
      }

      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        const params = new URLSearchParams();
        if (selectedCompanyId) params.append('companyId', selectedCompanyId);
        
        const response = await fetch(
          `${baseURL}/api/vendors/${vendorId}/balance?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (setVendorBalances) {
            setVendorBalances(prev => ({
              ...prev,
              [vendorId]: data.balance || 0,
            }));
          }
          loadedBalancesRef.current.add(vendorId);
        }
      } catch (error) {
        console.error(`Error fetching balance for vendor ${vendorId}:`, error);
      } finally {
        loadingQueueRef.current.delete(vendorId);
        if (setLoadingBalances) {
          setLoadingBalances(prev => ({ ...prev, [vendorId]: false }));
        }
      }
    },
    [selectedCompanyId, baseURL, setVendorBalances, setLoadingBalances],
  );

  const fetchExpenseTotal = useCallback(
    async (expenseId) => {
      if (loadedBalancesRef.current.has(expenseId) || loadingQueueRef.current.has(expenseId)) {
        return;
      }

      loadingQueueRef.current.add(expenseId);

      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        const params = new URLSearchParams();
        params.append('expenseId', expenseId);
        if (dateRange?.from) params.append('fromDate', dateRange.from);
        if (dateRange?.to) params.append('toDate', dateRange.to);
        if (selectedCompanyId) params.append('companyId', selectedCompanyId);

        const response = await fetch(
          `${baseURL}/api/ledger/expense-payables?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        
        if (response.ok) {
          const data = await response.json();
          const cashExpenses = (data.debit || [])
            .filter(e => e.paymentMethod !== 'Credit')
            .reduce((sum, e) => sum + Number(e.amount || 0), 0);

          const payments = (data.credit || []).reduce(
            (sum, e) => sum + Number(e.amount || 0),
            0,
          );

          const total = cashExpenses + payments;
          
          // Get last transaction date for sorting
          const allEntries = [...(data.debit || []), ...(data.credit || [])];
          let lastDate = null;
          if (allEntries.length > 0) {
            lastDate = allEntries.reduce((latest, entry) => {
              return new Date(entry.date) > new Date(latest) ? entry.date : latest;
            }, allEntries[0].date);
          }
          
          if (setExpenseTotals) {
            setExpenseTotals(prev => ({ ...prev, [expenseId]: total }));
          }
          
          if (lastDate) {
            expenseLastTransactionDatesRef.current[expenseId] = lastDate;
          }
          
          loadedBalancesRef.current.add(expenseId);
        }
      } catch (error) {
        console.error(`Error fetching total for expense ${expenseId}:`, error);
      } finally {
        loadingQueueRef.current.delete(expenseId);
      }
    },
    [baseURL, selectedCompanyId, dateRange, setExpenseTotals],
  );

  // Handle item visibility for lazy loading
  const handleItemVisible = useCallback((itemId, isVendor) => {
    if (isVendor) {
      fetchVendorBalance(itemId);
    } else {
      fetchExpenseTotal(itemId);
    }
  }, [fetchVendorBalance, fetchExpenseTotal]);

  // ==========================================================================
  // SORTING LOGIC - Always sorts by 'recent' by default
  // ==========================================================================
  
  // Sort items with memoization to avoid unnecessary re-sorting
  const sortedItems = useMemo(() => {
    const itemsToSort = currentView === 'vendor' ? [...vendors] : [...expenses];
    
    if (itemsToSort.length === 0) return [];
    
    // Create a stable sorted array
    return [...itemsToSort].sort((a, b) => {
      // Default sort is 'recent' - newest transactions first
      const aDate = currentView === 'vendor' 
        ? vendorLastTransactionDatesRef.current[a._id]
        : expenseLastTransactionDatesRef.current[a._id];
      const bDate = currentView === 'vendor'
        ? vendorLastTransactionDatesRef.current[b._id]
        : expenseLastTransactionDatesRef.current[b._id];
      
      // Handle items without dates (show them last)
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1; // b comes first if a has no date
      if (!bDate) return -1; // a comes first if b has no date
      
      // Sort by date (newest first by default)
      const dateA = new Date(aDate).getTime();
      const dateB = new Date(bDate).getTime();
      return sortConfig.direction === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [
    currentView,
    vendors,
    expenses,
    sortConfig.direction, // Only direction can change, key is always 'recent'
  ]);

  // Process items with balances
  const items = useMemo(() => {
    return sortedItems.map(item => {
      if (currentView === 'vendor') {
        let overallBalance = 0;
        if (!selectedCompanyId && item.balances) {
          // Sum all company balances
          for (const [companyId, balance] of Object.entries(item.balances)) {
            overallBalance += Number(balance || 0);
          }
        } else if (selectedCompanyId && vendorBalances[item._id] !== undefined) {
          // Use company-specific balance
          overallBalance = vendorBalances[item._id];
        } else {
          // Fallback to stored balance
          overallBalance = item.balance || 0;
        }
        return {
          ...item,
          balance: overallBalance
        };
      } else {
        return item;
      }
    });
  }, [currentView, sortedItems, selectedCompanyId, vendorBalances]);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================
  
  // Fetch global totals when vendors are loaded (ONE TIME)
  useEffect(() => {
    if (currentView === 'vendor' && vendors.length > 0 && !globalTotalsLoadedRef.current) {
      fetchGlobalTotals();
    }
  }, [currentView, vendors.length, fetchGlobalTotals]);

  // Reset when view or company changes
  useEffect(() => {
    setCurrentPage(1);
    loadedBalancesRef.current.clear();
    globalTotalsLoadedRef.current = false;
  }, [currentView, selectedCompanyId]);

  // ==========================================================================
  // PAGINATION
  // ==========================================================================
  
  const { paginatedItems, totalPages } = useMemo(() => {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = items.slice(startIndex, endIndex);
    
    return { paginatedItems, totalPages };
  }, [items, currentPage, itemsPerPage]);

  // ==========================================================================
  // STATS (KPI CARDS) - Always show global totals for ALL vendors
  // ==========================================================================
  
  const stats = useMemo(() => {
    if (currentView === 'vendor') {
      let settledVendors = 0;
      for (const v of vendors) {
        const balance = vendorBalances[v._id];
        if (balance !== undefined && balance === 0) {
          settledVendors++;
        }
      }

      const netBalance = transactionTotals.totalDebit - transactionTotals.totalCredit;

      return {
        totalVendors: vendors.length,
        netBalance,
        settledVendors,
        totalCredit: transactionTotals.totalCredit,
        totalDebit: transactionTotals.totalDebit,
      };
    } else {
      const totalExpenseAmount = Object.values(expenseTotals).reduce(
        (sum, amount) => sum + amount,
        0,
      );

      return {
        totalExpenses: expenses.length,
        totalExpenseAmount,
      };
    }
  }, [vendors.length, expenses.length, vendorBalances, transactionTotals, expenseTotals, currentView]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================
  
  const onRefreshList = useCallback(async () => {
    setRefreshing(true);
    loadedBalancesRef.current.clear();
    globalTotalsLoadedRef.current = false;
    vendorLastTransactionDatesRef.current = {};
    expenseLastTransactionDatesRef.current = {};
    
    // Re-fetch global totals
    if (currentView === 'vendor') {
      await fetchGlobalTotals();
      // Re-fetch balances for visible items
      await Promise.all(paginatedItems.map(item => fetchVendorBalance(item._id)));
    } else {
      await Promise.all(paginatedItems.map(item => fetchExpenseTotal(item._id)));
    }
    
    setRefreshing(false);
  }, [currentView, paginatedItems, fetchVendorBalance, fetchExpenseTotal, fetchGlobalTotals]);

  // ==========================================================================
  // RENDER FUNCTIONS
  // ==========================================================================
  
  const renderItem = useCallback(({ item }) => (
    <ListItem
      item={item}
      currentView={currentView}
      selectedCompanyId={selectedCompanyId}
      vendorBalances={vendorBalances}
      expenseTotals={expenseTotals}
      loadingBalances={loadingBalances}
      formatCurrency={formatCurrency}
      onSelect={onSelect}
      onItemVisible={handleItemVisible}
    />
  ), [currentView, selectedCompanyId, vendorBalances, expenseTotals, loadingBalances, formatCurrency, onSelect, handleItemVisible]);

  const keyExtractor = useCallback((item) => item._id, []);

  const HeaderIcon = currentView === 'vendor' ? Users : FileText;
  const headerIconColor = currentView === 'vendor' ? '#059669' : '#3b82f6';
  const headerIconBg = currentView === 'vendor' ? styles.headerIconGreen : styles.headerIconBlue;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefreshList}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards - ALWAYS show totals for ALL vendors */}
        {currentView === 'vendor' ? (
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Vendors"
              value={stats.totalVendors.toString()}
              subtitle={`${stats.settledVendors} settled`}
              icon={Users}
              textColor="#111827"
            />
            
            <StatCard
              title={stats.netBalance > 0 ? 'Net Advance' : 'Net Payable'}
              value={formatCurrency(Math.abs(stats.netBalance))}
              subtitle={stats.netBalance > 0 ? 'Total advance with vendors' : 'You owe to vendors'}
              icon={stats.netBalance > 0 ? TrendingDown : TrendingUp}
              textColor={stats.netBalance > 0 ? '#10B981' : '#EF4444'}
              loading={loadingTotals}
            />
            
            <StatCard
              title="Total Credit"
              value={formatCurrency(stats.totalCredit)}
              subtitle="Payments made to vendors"
              icon={CreditCard}
              loading={loadingTotals}
              textColor="#111827"
            />
            
            <StatCard
              title="Total Debit"
              value={formatCurrency(stats.totalDebit)}
              subtitle="All-time purchases made"
              icon={IndianRupee}
              loading={loadingTotals}
              textColor="#111827"
            />
          </View>
        ) : (
          <View style={[styles.statsGrid, styles.expenseStatsGrid]}>
            <StatCard
              title="Expense Categories"
              value={stats.totalExpenses.toString()}
              subtitle="Total categories"
              icon={FileText}
              textColor="#111827"
            />
            <StatCard
              title="Total Expenses"
              value={formatCurrency(stats.totalExpenseAmount)}
              subtitle="Total amount spent"
              icon={TrendingUp}
              textColor="#111827"
            />
          </View>
        )}

        {/* Main List Card - Paginated */}
        <View style={styles.mainCard}>
          <View style={styles.mainHeader}>
            <View style={styles.headerContent}>
              <View style={styles.headerIconContainer}>
                <View style={[styles.headerIcon, headerIconBg]}>
                  <HeaderIcon size={20} color={headerIconColor} strokeWidth={2} />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.mainTitle}>
                    {currentView === 'vendor' ? 'Vendors' : 'Expense Categories'}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {currentView === 'vendor'
                      ? 'Manage vendor relationships & balances'
                      : 'Track expenses across categories'}
                  </Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                <Badge variant="secondary" style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>
                    {items.length}
                  </Text>
                </Badge>
              </View>
            </View>
          </View>

          <View style={styles.mainContent}>
            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <HeaderIcon size={36} color="#cbd5e1" strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyText}>
                  No {currentView === 'vendor' ? 'vendors' : 'expense categories'} found
                </Text>
                <Text style={styles.emptySubtext}>
                  {currentView === 'vendor'
                    ? 'Add vendors to start tracking balances'
                    : 'Create expense categories to organize spending'}
                </Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={paginatedItems}
                  renderItem={renderItem}
                  keyExtractor={keyExtractor}
                  scrollEnabled={false}
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  initialNumToRender={10}
                  updateCellsBatchingPeriod={50}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />

                {/* Pagination */}
                {items.length > itemsPerPage && (
                  <View style={styles.pagination}>
                    <Text style={styles.paginationText}>
                      Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, items.length)} of {items.length}
                    </Text>
                    <View style={styles.paginationControls}>
                      <TouchableOpacity
                        onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={[styles.paginationButton, currentPage === 1 && styles.buttonDisabled]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.paginationButtonText, currentPage === 1 && styles.buttonTextDisabled]}>
                          Previous
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.pageNumberContainer}>
                        <Text style={styles.pageNumber}>
                          {currentPage}
                        </Text>
                        <Text style={styles.pageTotal}>of {totalPages}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        style={[styles.paginationButton, currentPage === totalPages && styles.buttonDisabled]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.buttonTextDisabled]}>
                          Next
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
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
    paddingTop: -50
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 0,
    paddingBottom: 12,
  },
  expenseStatsGrid: {
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  statCardContent: {
    padding: 12,
    gap: 6,
  },
  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 12,
  },
  statIconBg: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  statSubtext: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
    lineHeight: 12,
  },
  statLoader: {
    height: 24,
    justifyContent: 'center',
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 0,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  mainHeader: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fafbfc',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerIconGreen: {
    backgroundColor: '#ecfdf5',
  },
  headerIconBlue: {
    backgroundColor: '#eff6ff',
  },
  headerText: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.2,
  },
  mainContent: {
    backgroundColor: '#ffffff',
  },
  listItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  iconRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  iconGreen: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  iconGray: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  iconBlue: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  itemBalanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  badgeRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  badgeGreen: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  badgeGray: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  expenseBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  balanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  expenseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e40af',
    letterSpacing: 0.2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  pagination: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fafbfc',
  },
  paginationText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  paginationButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    minWidth: 90,
    alignItems: 'center',
  },
  paginationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
    letterSpacing: 0.2,
  },
  buttonTextDisabled: {
    color: '#cbd5e1',
  },
  pageNumberContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pageNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  pageTotal: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeSecondary: {
    backgroundColor: '#f1f5f9',
  },
  badgeDestructive: {
    backgroundColor: '#ef4444',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.4,
    backgroundColor: '#f8fafc',
  },
});  