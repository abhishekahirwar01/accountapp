import React, { useState, useEffect, useMemo } from 'react';
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
  Loader2,
  IndianRupee,
  ArrowUpRight,
  ArrowDownLeft,
  Minus,
  CreditCard
} from 'lucide-react-native';

// Import components - these should be properly exported from your components
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { BASE_URL } from '../../config';

// Create placeholder components if they don't exist
const Badge = ({ children, variant = 'default', style }) => {
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
};

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
  dateRange, // Add dateRange as prop
  formatCurrency // Add formatCurrency as prop
}) {
  const [vendorLastTransactionDates, setVendorLastTransactionDates] = useState({});
  const [expenseLastTransactionDates, setExpenseLastTransactionDates] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const itemsPerPage = 7;
  const baseURL = BASE_URL;

  // Calculate statistics based on props
  const stats = useMemo(() => {
    if (currentView === 'vendor') {
      const settledVendors = vendors.filter(v => {
        const balance = vendorBalances[v._id];
        return balance !== undefined && balance === 0;
      }).length;

      const netBalance = transactionTotals.totalDebit - transactionTotals.totalCredit;

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
    } else {
      return {
        totalVendors: vendors.length,
        totalExpenses: expenses.length,
        netBalance: 0,
        totalExpenseAmount: Object.values(expenseTotals).reduce(
          (sum, amount) => sum + amount,
          0
        ),
        settledVendors: 0,
        totalCredit: 0,
        totalDebit: 0,
      };
    }
  }, [vendors, expenses, expenseTotals, vendorBalances, transactionTotals, selectedCompanyId, currentView]);

  // Fetch last transaction dates for sorting (without date filters)
  const fetchLastTransactionDates = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('Authentication token not found.');
        return;
      }

      const vendorLastDates = {};
      const expenseLastDates = {};

      // Fetch last transaction dates for vendors
      const vendorPromises = vendors.map(async (vendor) => {
        try {
          const params = new URLSearchParams();
          params.append('vendorId', vendor._id);
          if (selectedCompanyId) params.append('companyId', selectedCompanyId);
          
          // IMPORTANT: Do NOT add date filters here for list view
          // The list should show overall data, not filtered data
          // if (dateRange.from) params.append('fromDate', dateRange.from);
          // if (dateRange.to) params.append('toDate', dateRange.to);

          const response = await fetch(
            `${baseURL}/api/ledger/vendor-payables?${params.toString()}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const allEntries = [...(data.debit || []), ...(data.credit || [])];
            if (allEntries.length > 0) {
              const mostRecentDate = allEntries.reduce((latest, entry) => {
                return new Date(entry.date) > new Date(latest)
                  ? entry.date
                  : latest;
              }, allEntries[0].date);
              vendorLastDates[vendor._id] = mostRecentDate;
            }
          }
        } catch (error) {
          console.error(`Error fetching last transaction date for vendor ${vendor._id}:`, error);
        }
      });

      // Fetch last transaction dates for expenses
      const expensePromises = expenses.map(async (expense) => {
        try {
          const params = new URLSearchParams();
          params.append('expenseId', expense._id);
          if (selectedCompanyId) params.append('companyId', selectedCompanyId);
          
          // IMPORTANT: Do NOT add date filters here for list view
          // if (dateRange.from) params.append('fromDate', dateRange.from);
          // if (dateRange.to) params.append('toDate', dateRange.to);

          const response = await fetch(
            `${baseURL}/api/ledger/expense-payables?${params.toString()}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const allEntries = [...(data.debit || []), ...(data.credit || [])];
            if (allEntries.length > 0) {
              const mostRecentDate = allEntries.reduce((latest, entry) => {
                return new Date(entry.date) > new Date(latest)
                  ? entry.date
                  : latest;
              }, allEntries[0].date);
              expenseLastDates[expense._id] = mostRecentDate;
            }
          }
        } catch (error) {
          console.error(`Error fetching last transaction date for expense ${expense._id}:`, error);
        }
      });

      await Promise.all([...vendorPromises, ...expensePromises]);
      setVendorLastTransactionDates(vendorLastDates);
      setExpenseLastTransactionDates(expenseLastDates);
    } catch (error) {
      console.error('Error fetching last transaction dates:', error);
    }
  };

  // Fetch last transaction dates on component mount
  useEffect(() => {
    fetchLastTransactionDates();
  }, [vendors, expenses, selectedCompanyId, currentView]);

  const getBalanceVariant = (amount) => {
    if (amount < 0) return 'destructive';
    if (amount > 0) return 'default';
    return 'secondary';
  };

  const getBalanceIcon = (amount) => {
    if (amount < 0) return <ArrowUpRight size={12} color="#dc2626" />;
    if (amount > 0) return <ArrowDownLeft size={12} color="#16a34a" />;
    return <Minus size={12} color="#64748b" />;
  };

  const getBalanceText = (amount) => {
    if (amount < 0) return 'You Owe';
    if (amount > 0) return 'Advance';
    return 'Settled';
  };

  const getBalanceColor = (amount) => {
    if (amount < 0) return '#dc2626';
    if (amount > 0) return '#16a34a';
    return '#64748b';
  };

  const getNetBalanceConfig = (netBalance) => {
    if (netBalance < 0) {
      return {
        title: 'Net Payable',
        subtitle: 'Total amount you owe',
        icon: TrendingUp,
        trend: 'down',
        cardBorderColor: '#fecaca',
        textColor: '#dc2626',
        iconBgColor: '#fee2e2'
      };
    } else if (netBalance > 0) {
      return {
        title: 'Net Advance',
        subtitle: 'Total advance with vendors',
        icon: TrendingDown,
        trend: 'up',
        cardBorderColor: '#bbf7d0',
        textColor: '#16a34a',
        iconBgColor: '#dcfce7'
      };
    } else {
      return {
        title: 'Net Balance',
        subtitle: 'All accounts settled',
        icon: Minus,
        trend: 'neutral',
        cardBorderColor: '#e2e8f0',
        textColor: '#64748b',
        iconBgColor: '#dbeafe'
      };
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, cardBorderColor, loading, textColor, iconBgColor }) => {
    const borderStyle = cardBorderColor ? { borderColor: cardBorderColor } : {};
    const textStyle = textColor ? { color: textColor } : {};
    const iconBgStyle = iconBgColor ? { backgroundColor: iconBgColor } : {};

    return (
      <Card style={[styles.statCard, borderStyle]}>
        <CardContent style={styles.statContent}>
          <View style={styles.statRow}>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>{title}</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#64748b" style={styles.statLoading} />
              ) : (
                <Text style={[styles.statValue, textStyle]}>{value}</Text>
              )}
              <Text style={styles.statSubtitle}>{subtitle}</Text>
            </View>
            <View style={[styles.statIconContainer, iconBgStyle]}>
              <Icon size={16} color={
                trend === 'up' ? '#16a34a' : 
                trend === 'down' ? '#dc2626' : '#2563eb'
              } />
            </View>
          </View>
        </CardContent>
      </Card>
    );
  };

  // Prepare items list - sort by last transaction date
  const items = currentView === 'vendor'
    ? [...vendors].sort((a, b) => {
        const aDate = vendorLastTransactionDates[a._id];
        const bDate = vendorLastTransactionDates[b._id];
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      }).map(vendor => {
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
      })
    : [...expenses].sort((a, b) => {
        const aDate = expenseLastTransactionDates[a._id];
        const bDate = expenseLastTransactionDates[b._id];
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

  // Get net balance configuration
  const netBalanceConfig = getNetBalanceConfig(stats.netBalance);

  // Calculate pagination
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  // Reset to page 1 when view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentView]);

  const onRefreshList = async () => {
    setRefreshing(true);
    await fetchLastTransactionDates();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => {
    const isVendor = currentView === 'vendor';
    const name = isVendor ? item.vendorName : item.name;
    const total = isVendor
      ? selectedCompanyId && vendorBalances[item._id] !== undefined
        ? vendorBalances[item._id]
        : item.balance || 0
      : expenseTotals[item._id] || 0;
    const id = item._id;
    const isLoading = loadingBalances && loadingBalances[id];
    const balanceColor = getBalanceColor(total);

    return (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => onSelect(id)}
      >
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <View style={[
              styles.itemIcon,
              isVendor
                ? total < 0 ? styles.iconRed :
                  total > 0 ? styles.iconGreen : styles.iconGray
                : styles.iconBlue
            ]}>
              {isVendor ? (
                <Users size={16} color={balanceColor} />
              ) : (
                <FileText size={16} color="#2563eb" />
              )}
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
              {isVendor && (
                <View style={styles.itemBalanceInfo}>
                  <Text style={[styles.balanceText, { color: balanceColor }]}>
                    {getBalanceText(total)}
                  </Text>
                  {!isLoading && total !== 0 && (
                    <View style={[
                      styles.balanceBadge, 
                      total < 0 ? styles.badgeRed :
                      total > 0 ? styles.badgeGreen : styles.badgeGray
                    ]}>
                      {getBalanceIcon(total)}
                      <Text style={styles.balanceBadgeText}>
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
                <IndianRupee size={12} color="#2563eb" />
                <Text style={styles.expenseBadgeText}>{formatCurrency(total)}</Text>
              </View>
            )}
            <Button
              variant="outline"
              onPress={() => onSelect(id)}
              style={styles.viewButton}
            >
              <Text style={styles.viewButtonText}>View</Text>
            </Button>
          </View>
        </View>
        
        {isVendor && isLoading && (
          <ActivityIndicator size="small" color="#64748b" style={styles.loadingIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefreshList} />
        }
      >
        {/* Stats Cards */}
        {currentView === 'vendor' ? (
          <View style={styles.statsGrid}>
            {/* Row 1 - First 2 boxes */}
            <StatCard
              title="Total Vendors"
              value={stats.totalVendors.toString()}
              subtitle={`${stats.settledVendors} settled`}
              icon={Users}
              trend="neutral"
              iconBgColor="#dbeafe"
            />
            <StatCard
              title={netBalanceConfig.title}
              value={formatCurrency(Math.abs(stats.netBalance))}
              subtitle={netBalanceConfig.subtitle}
              icon={netBalanceConfig.icon}
              trend={netBalanceConfig.trend}
              cardBorderColor={netBalanceConfig.cardBorderColor}
              textColor={netBalanceConfig.textColor}
              iconBgColor={netBalanceConfig.iconBgColor}
              loading={loadingTotals}
            />
            
            {/* Row 2 - Next 2 boxes */}
            <StatCard
              title="Total Credit"
              value={formatCurrency(stats.totalCredit)}
              subtitle="Payments made to vendors"
              icon={CreditCard}
              trend="up"
              loading={loadingTotals}
              cardBorderColor={stats.totalCredit > 0 ? '#bfdbfe' : '#e2e8f0'}
              iconBgColor="#dcfce7"
            />
            <StatCard
              title="Total Debit"
              value={formatCurrency(stats.totalDebit)}
              subtitle="All-time purchases made"
              icon={IndianRupee}
              trend="down"
              loading={loadingTotals}
              cardBorderColor={stats.totalDebit > 0 ? '#fed7aa' : '#e2e8f0'}
              iconBgColor="#fee2e2"
            />
          </View>
        ) : (
          <View style={[styles.statsGrid, styles.expenseStatsGrid]}>
            <StatCard
              title="Expense Categories"
              value={stats.totalExpenses.toString()}
              subtitle="Total categories"
              icon={FileText}
              trend="neutral"
              iconBgColor="#dbeafe"
            />
            <StatCard
              title="Total Expenses"
              value={formatCurrency(stats.totalExpenseAmount)}
              subtitle="Total amount spent"
              icon={TrendingUp}
              trend="neutral"
              iconBgColor="#e9d5ff"
            />
          </View>
        )}

        {/* Main List Card */}
        <Card style={styles.mainCard}>
          <CardHeader style={styles.mainHeader}>
            <View style={styles.headerContent}>
              <View style={styles.headerIconContainer}>
                <View style={[
                  styles.headerIcon,
                  currentView === 'vendor' ? styles.headerIconGreen : styles.headerIconBlue
                ]}>
                  {currentView === 'vendor' ? (
                    <Users size={20} color="#16a34a" />
                  ) : (
                    <FileText size={20} color="#2563eb" />
                  )}
                </View>
                <View style={styles.headerText}>
                  <CardTitle style={styles.mainTitle}>
                    {currentView === 'vendor' ? 'Vendors' : 'Expense Categories'}
                  </CardTitle>
                  <Text style={styles.headerSubtitle}>
                    {currentView === 'vendor'
                      ? 'Manage your vendor relationships and balances'
                      : 'Track expenses across different categories'}
                  </Text>
                </View>
              </View>
              <Badge variant="secondary" style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {items.length} {currentView === 'vendor' ? 'vendors' : 'categories'}
                </Text>
              </Badge>
            </View>
          </CardHeader>

          <CardContent style={styles.mainContent}>
            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  {currentView === 'vendor' ? (
                    <Users size={32} color="#94a3b8" />
                  ) : (
                    <FileText size={32} color="#94a3b8" />
                  )}
                </View>
                <Text style={styles.emptyText}>
                  No {currentView === 'vendor' ? 'vendors' : 'expense categories'} found
                </Text>
                <Text style={styles.emptySubtext}>
                  {currentView === 'vendor'
                    ? 'Add vendors to start tracking balances'
                    : 'Create expense categories to organize your spending'}
                </Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={paginatedItems}
                  renderItem={renderItem}
                  keyExtractor={(item) => item._id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />

                {/* Pagination Controls */}
                {items.length > itemsPerPage && (
                  <View style={styles.pagination}>
                    <View style={styles.paginationInfo}>
                      <Text style={styles.paginationText}>
                        Showing {startIndex + 1} to {Math.min(endIndex, items.length)} of {items.length} {currentView === 'vendor' ? 'vendors' : 'categories'}
                      </Text>
                    </View>
                    <View style={styles.paginationControls}>
                      <TouchableOpacity
                        onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={[styles.paginationButton, currentPage === 1 && styles.buttonDisabled]}
                      >
                        <Text style={styles.paginationButtonText}>Previous</Text>
                      </TouchableOpacity>
                      <Text style={styles.pageNumber}>
                        Page {currentPage} of {totalPages}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        style={[styles.paginationButton, currentPage === totalPages && styles.buttonDisabled]}
                      >
                        <Text style={styles.paginationButtonText}>Next</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop:-50
  },
  // Stats Grid - UPDATED for 2-column layout
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    padding: 2,
    paddingBottom: 8,
  },
  expenseStatsGrid: {
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%', // Fixed width for 2-column layout
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  statContent: {
    padding: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLoading: {
    height: 24,
  },
  statSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Main List Card
  mainCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 2,
    marginBottom: 16,
  },
  mainHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconGreen: {
    backgroundColor: '#dcfce7',
  },
  headerIconBlue: {
    backgroundColor: '#dbeafe',
  },
  headerText: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  headerBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  // List Items
  mainContent: {
    padding: 0,
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconRed: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  iconGreen: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  iconGray: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  iconBlue: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  itemBalanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeRed: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  badgeGreen: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  badgeGray: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  expenseBadge: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  balanceBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1e293b',
  },
  expenseBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1e40af',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  loadingIndicator: {
    marginTop: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#f1f5f9',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Pagination
  pagination: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  paginationInfo: {
    marginBottom: 12,
  },
  paginationText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  paginationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  paginationButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  pageNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    paddingHorizontal: 8,
  },
  // Badge
  badge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeSecondary: {
    backgroundColor: '#f1f5f9',
  },
  badgeDestructive: {
    backgroundColor: '#ef4444',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});