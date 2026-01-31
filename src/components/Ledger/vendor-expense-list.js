import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

// Import components
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { BASE_URL } from '../../config';

// Memoized Badge Component
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

// Memoized Stat Card Component
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
        {/* Top Row: Label and Icon */}
        <View style={styles.statTopRow}>
          <Text style={styles.statLabel}>{title}</Text>
          <View style={[styles.statIconBg, { backgroundColor: iconConfig.bg }]}>
            <IconComponent size={14} color={iconConfig.color} strokeWidth={2.5} />
          </View>
        </View>

        {/* Value */}
        {loading ? (
          <ActivityIndicator size="small" color={iconConfig.color} style={styles.statLoader} />
        ) : (
          <Text style={[styles.statValue, textColor && { color: textColor }]} numberOfLines={1}>
            {value}
          </Text>
        )}

        {/* Subtitle */}
        <Text style={styles.statSubtext} numberOfLines={2}>{subtitle}</Text>
      </View>
    </View>
  );
});

// Memoized List Item Component
const ListItem = React.memo(({ 
  item, 
  currentView, 
  selectedCompanyId, 
  vendorBalances, 
  expenseTotals, 
  loadingBalances,
  formatCurrency,
  onSelect 
}) => {
  const isVendor = currentView === 'vendor';
  const name = isVendor ? item.vendorName : item.name;
  const id = item._id;
  
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
  
  const { balanceColor, iconBg, iconColor, badgeBg, badgeBorder, balanceText } = useMemo(() => {
    if (isVendor) {
      if (total < 0) return {
        balanceColor: '#ef4444',
        iconBg: styles.iconRed,
        iconColor: '#ef4444',
        badgeBg: styles.badgeRed,
        badgeBorder: '#fecaca',
        balanceText: 'You Owe'
      };
      if (total > 0) return {
        balanceColor: '#10b981',
        iconBg: styles.iconGreen,
        iconColor: '#10b981',
        badgeBg: styles.badgeGreen,
        badgeBorder: '#bbf7d0',
        balanceText: 'Advance'
      };
      return {
        balanceColor: '#64748b',
        iconBg: styles.iconGray,
        iconColor: '#64748b',
        badgeBg: styles.badgeGray,
        badgeBorder: '#e2e8f0',
        balanceText: 'Settled'
      };
    }
    return {
      balanceColor: '#3b82f6',
      iconBg: styles.iconBlue,
      iconColor: '#3b82f6',
      badgeBg: styles.expenseBadge,
      badgeBorder: '#bfdbfe',
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
                <Text style={[styles.balanceText, { color: balanceColor }]}>
                  {balanceText}
                </Text>
                {!isLoading && total !== 0 && (
                  <View style={[styles.balanceBadge, badgeBg]}>
                    {BalanceIcon}
                    <Text style={[styles.balanceBadgeText, { color: balanceColor }]}>
                      {formatCurrency(Math.abs(total))}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.itemActions}>
          {!isVendor && (
            <View style={[styles.balanceBadge, styles.expenseBadge]}>
              <IndianRupee size={12} color="#3b82f6" strokeWidth={2.5} />
              <Text style={styles.expenseBadgeText}>{formatCurrency(total)}</Text>
            </View>
          )}
          <View style={styles.viewButton}>
            <ChevronRight size={18} color="#3b82f6" strokeWidth={2.5} />
          </View>
        </View>
      </View>
      
      {isVendor && isLoading && (
        <ActivityIndicator size="small" color="#3b82f6" style={styles.loadingIndicator} />
      )}
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
  formatCurrency
}) {
  const [vendorLastTransactionDates, setVendorLastTransactionDates] = useState({});
  const [expenseLastTransactionDates, setExpenseLastTransactionDates] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const itemsPerPage = 7;
  const baseURL = BASE_URL;

  // Memoized statistics calculation
  const stats = useMemo(() => {
    if (currentView === 'vendor') {
      let settledVendors = 0;
      for (const v of vendors) {
        const balance = vendorBalances[v._id];
        if (balance !== undefined && balance === 0) {
          settledVendors++;
        }
      }

      let totalExpenseAmount = 0;
      for (const amount of Object.values(expenseTotals)) {
        totalExpenseAmount += amount;
      }

      const netBalance = transactionTotals.totalDebit - transactionTotals.totalCredit;

      return {
        totalVendors: vendors.length,
        totalExpenses: expenses.length,
        netBalance,
        totalExpenseAmount,
        settledVendors,
        totalCredit: transactionTotals.totalCredit,
        totalDebit: transactionTotals.totalDebit,
      };
    } else {
      let totalExpenseAmount = 0;
      for (const amount of Object.values(expenseTotals)) {
        totalExpenseAmount += amount;
      }

      return {
        totalVendors: vendors.length,
        totalExpenses: expenses.length,
        netBalance: 0,
        totalExpenseAmount,
        settledVendors: 0,
        totalCredit: 0,
        totalDebit: 0,
      };
    }
  }, [vendors, expenses, expenseTotals, vendorBalances, transactionTotals, selectedCompanyId, currentView]);

  // Optimized fetch for last transaction dates
  const fetchLastTransactionDates = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('Authentication token not found.');
        return;
      }

      const vendorLastDates = {};
      const expenseLastDates = {};

      // Process vendors
      const vendorDatePromises = vendors.map(async (vendor) => {
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
                'Cache-Control': 'no-cache'
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const allEntries = [...(data.debit || []), ...(data.credit || [])];
            if (allEntries.length > 0) {
              let mostRecentDate = allEntries[0].date;
              for (let i = 1; i < allEntries.length; i++) {
                const entryDate = allEntries[i].date;
                if (new Date(entryDate) > new Date(mostRecentDate)) {
                  mostRecentDate = entryDate;
                }
              }
              vendorLastDates[vendor._id] = mostRecentDate;
            }
          }
        } catch (error) {
          console.error(`Error fetching last transaction date for vendor ${vendor._id}:`, error);
        }
      });

      // Process expenses
      const expenseDatePromises = expenses.map(async (expense) => {
        try {
          const params = new URLSearchParams();
          params.append('expenseId', expense._id);
          if (selectedCompanyId) params.append('companyId', selectedCompanyId);

          const response = await fetch(
            `${baseURL}/api/ledger/expense-payables?${params.toString()}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache'
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const allEntries = [...(data.debit || []), ...(data.credit || [])];
            if (allEntries.length > 0) {
              let mostRecentDate = allEntries[0].date;
              for (let i = 1; i < allEntries.length; i++) {
                const entryDate = allEntries[i].date;
                if (new Date(entryDate) > new Date(mostRecentDate)) {
                  mostRecentDate = entryDate;
                }
              }
              expenseLastDates[expense._id] = mostRecentDate;
            }
          }
        } catch (error) {
          console.error(`Error fetching last transaction date for expense ${expense._id}:`, error);
        }
      });

      // Execute promises in batches to avoid overwhelming the network
      const BATCH_SIZE = 5;
      
      // Process vendors in batches
      for (let i = 0; i < vendorDatePromises.length; i += BATCH_SIZE) {
        const batch = vendorDatePromises.slice(i, i + BATCH_SIZE);
        await Promise.all(batch);
      }
      
      // Process expenses in batches
      for (let i = 0; i < expenseDatePromises.length; i += BATCH_SIZE) {
        const batch = expenseDatePromises.slice(i, i + BATCH_SIZE);
        await Promise.all(batch);
      }

      setVendorLastTransactionDates(vendorLastDates);
      setExpenseLastTransactionDates(expenseLastDates);
    } catch (error) {
      console.error('Error fetching last transaction dates:', error);
    }
  }, [vendors, expenses, selectedCompanyId, baseURL]);

  // Debounced useEffect for fetching dates
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLastTransactionDates();
    }, 300); // Small delay to prevent rapid re-fetches
    
    return () => clearTimeout(timer);
  }, [fetchLastTransactionDates]);

  // Memoized items list with sorting
  const items = useMemo(() => {
    if (currentView === 'vendor') {
      const sortedVendors = [...vendors].sort((a, b) => {
        const aDate = vendorLastTransactionDates[a._id];
        const bDate = vendorLastTransactionDates[b._id];
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

      return sortedVendors.map(vendor => {
        let overallBalance = 0;
        if (!selectedCompanyId && vendor.balances) {
          for (const [companyId, balance] of Object.entries(vendor.balances)) {
            overallBalance += Number(balance || 0);
          }
        } else if (selectedCompanyId && vendorBalances[vendor._id] !== undefined) {
          overallBalance = vendorBalances[vendor._id];
        } else {
          overallBalance = vendor.balance || 0;
        }
        return {
          ...vendor,
          balance: overallBalance
        };
      });
    } else {
      return [...expenses].sort((a, b) => {
        const aDate = expenseLastTransactionDates[a._id];
        const bDate = expenseLastTransactionDates[b._id];
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
    }
  }, [currentView, vendors, expenses, vendorLastTransactionDates, expenseLastTransactionDates, selectedCompanyId, vendorBalances]);

  // Memoized pagination
  const { paginatedItems, totalPages } = useMemo(() => {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = items.slice(startIndex, endIndex);
    
    return { paginatedItems, totalPages };
  }, [items, currentPage]);

  // Reset page when view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentView]);

  const onRefreshList = useCallback(async () => {
    setRefreshing(true);
    await fetchLastTransactionDates();
    setRefreshing(false);
  }, [fetchLastTransactionDates]);

  // Memoized renderItem function
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
    />
  ), [currentView, selectedCompanyId, vendorBalances, expenseTotals, loadingBalances, formatCurrency, onSelect]);

  // Memoized key extractor
  const keyExtractor = useCallback((item) => item._id, []);

  // Memoized header icon
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
        removeClippedSubviews={true}
      >
        {/* Stats Cards */}
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

        {/* Main List Card */}
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
              <Badge variant="secondary" style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {items.length}
                </Text>
              </Badge>
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
                  initialNumToRender={7}
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
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fafbfc',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  loadingIndicator: {
    marginTop: 12,
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