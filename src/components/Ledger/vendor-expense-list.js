import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from 'react';
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
  CreditCard,
} from 'lucide-react-native';

import { BASE_URL } from '../../config';

// ─────────────────────────────────────────────
// Badge
// ─────────────────────────────────────────────
const Badge = React.memo(({ children, variant = 'default', style }) => {
  const badgeStyles = [
    styles.badge,
    variant === 'secondary' && styles.badgeSecondary,
    variant === 'destructive' && styles.badgeDestructive,
    style,
  ];
  return (
    <View style={badgeStyles}>
      {typeof children === 'string' ? (
        <Text style={styles.badgeText}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
});

// ─────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────
const StatCard = React.memo(
  ({ title, value, subtitle, icon: IconComponent, textColor }) => {
    const iconConfig = useMemo(() => {
      const configs = {
        'Total Vendors': { color: '#3B82F6', bg: '#EFF6FF' },
        'Net Payable': { color: '#EF4444', bg: '#FEF2F2' },
        'Net Advance': { color: '#10B981', bg: '#F0FDF4' },
        'Total Credit': { color: '#8B5CF6', bg: '#F5F3FF' },
        'Total Debit': { color: '#F59E0B', bg: '#FFFBEB' },
        'Expense Categories': { color: '#3B82F6', bg: '#EFF6FF' },
        'Total Expenses': { color: '#3B82F6', bg: '#EFF6FF' },
      };
      return configs[title] || { color: '#3B82F6', bg: '#EFF6FF' };
    }, [title]);

    return (
      <View style={styles.statCard}>
        <View style={styles.statCardContent}>
          <View style={styles.statTopRow}>
            <Text style={styles.statLabel}>{title}</Text>
            <View
              style={[styles.statIconBg, { backgroundColor: iconConfig.bg }]}
            >
              <IconComponent
                size={14}
                color={iconConfig.color}
                strokeWidth={2.5}
              />
            </View>
          </View>
          <Text
            style={[styles.statValue, textColor && { color: textColor }]}
            numberOfLines={1}
          >
            {value}
          </Text>
          <Text style={styles.statSubtext} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </View>
    );
  },
);

// ─────────────────────────────────────────────
// Skeleton shimmer
// ─────────────────────────────────────────────
const SkeletonBox = ({ width, height, style }) => (
  <View style={[styles.skeleton, { width, height }, style]} />
);

const ListSkeleton = () => (
  <View>
    {/* Stat cards skeleton */}
    <View style={styles.statsGrid}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={styles.statCard}>
          <View style={styles.statCardContent}>
            <View style={styles.statTopRow}>
              <SkeletonBox width={80} height={10} />
              <SkeletonBox width={24} height={24} style={{ borderRadius: 6 }} />
            </View>
            <SkeletonBox width={90} height={20} style={{ marginTop: 4 }} />
            <SkeletonBox width={110} height={10} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>

    {/* List card skeleton */}
    <View style={styles.mainCard}>
      <View
        style={[
          styles.mainHeader,
          { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <SkeletonBox width={40} height={40} style={{ borderRadius: 14 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonBox width={80} height={14} />
              <SkeletonBox width={160} height={10} />
            </View>
          </View>
          <SkeletonBox width={32} height={28} style={{ borderRadius: 12 }} />
        </View>
      </View>
      {[1, 2, 3, 4, 5, 6, 7].map(i => (
        <View key={i}>
          <View style={styles.skeletonRow}>
            <SkeletonBox width={40} height={40} style={{ borderRadius: 12 }} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonBox width={130} height={12} />
              <SkeletonBox width={85} height={10} />
            </View>
            <SkeletonBox width={70} height={26} style={{ borderRadius: 10 }} />
          </View>
          {i < 7 && <View style={styles.separator} />}
        </View>
      ))}
    </View>
  </View>
);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const formatName = str => {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

// ─────────────────────────────────────────────
// ListItem — no loaders, values are ready when rendered
// ─────────────────────────────────────────────
const ListItem = React.memo(
  ({ item, currentView, formatCurrency, onSelect }) => {
    const isVendor = currentView === 'vendor';
    const name = formatName(isVendor ? item.vendorName : item.name);
    const total = item._resolvedBalance ?? 0;

    const { balanceColor, iconBg, iconColor, badgeBg, balanceText } =
      useMemo(() => {
        if (isVendor) {
          // positive = debit > credit = aap ne purchase kiya, vendor ko dena hai = You Owe
          // negative = credit > debit = aapne zyada pay kiya = Advance
          if (total > 0)
            return {
              balanceColor: '#ef4444',
              iconBg: styles.iconRed,
              iconColor: '#ef4444',
              badgeBg: styles.badgeRed,
              balanceText: 'You Owe',
            };
          if (total < 0)
            return {
              balanceColor: '#10b981',
              iconBg: styles.iconGreen,
              iconColor: '#10b981',
              badgeBg: styles.badgeGreen,
              balanceText: 'Advance',
            };
          return {
            balanceColor: '#64748b',
            iconBg: styles.iconGray,
            iconColor: '#64748b',
            badgeBg: styles.badgeGray,
            balanceText: 'Settled',
          };
        }
        return {
          balanceColor: '#3b82f6',
          iconBg: styles.iconBlue,
          iconColor: '#3b82f6',
          badgeBg: styles.expenseBadge,
          balanceText: '',
        };
      }, [isVendor, total]);

    const BalanceIcon = useMemo(() => {
      if (total > 0)
        return <ArrowUpRight size={12} color="#ef4444" strokeWidth={2.5} />;
      if (total < 0)
        return <ArrowDownLeft size={12} color="#10b981" strokeWidth={2.5} />;
      return <Minus size={12} color="#64748b" strokeWidth={2.5} />;
    }, [total]);

    const handlePress = useCallback(
      () => onSelect(item._id),
      [onSelect, item._id],
    );

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
              <Text style={styles.itemName} numberOfLines={1}>
                {name}
              </Text>
              {isVendor && (
                <View style={styles.itemBalanceInfo}>
                  <Text style={[styles.balanceText, { color: balanceColor }]}>
                    {balanceText}
                  </Text>
                  {total !== 0 && (
                    <View style={[styles.balanceBadge, badgeBg]}>
                      {BalanceIcon}
                      <Text
                        style={[
                          styles.balanceBadgeText,
                          { color: balanceColor },
                        ]}
                      >
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
                <Text style={styles.expenseBadgeText}>
                  {formatCurrency(total)}
                </Text>
              </View>
            )}
            <View style={styles.viewButton}>
              <ChevronRight size={18} color="#3b82f6" strokeWidth={2.5} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) =>
    prev.item._resolvedBalance === next.item._resolvedBalance &&
    prev.formatCurrency === next.formatCurrency &&
    prev.onSelect === next.onSelect,
);

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
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
  setVendorBalances,
  setLoadingBalances,
  setTransactionTotals,
  setLoadingTotals,
  setExpenseTotals,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  // ── Core state: processed & sorted items ready to display ─────────────────
  // null  = still loading
  // []    = loaded but empty
  // [...] = loaded with data
  const [readyItems, setReadyItems] = useState(null);
  const [readyStats, setReadyStats] = useState(null);

  const baseURL = BASE_URL;
  const loadingRef = useRef(false);
  const abortRef = useRef(null); // AbortController for cancellation

  // ── Master fetch: loads ALL data, computes sort, sets state ONCE ──────────
  const loadAllData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    // Cancel previous in-flight request if any
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    // Show skeleton
    setReadyItems(null);
    setReadyStats(null);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token || signal.aborted) return;

      // ── VENDOR VIEW ───────────────────────────────────────────────────────
      if (currentView === 'vendor') {
        if (!vendors.length) {
          setReadyItems([]);
          setReadyStats({
            totalVendors: 0,
            settledVendors: 0,
            netBalance: 0,
            totalCredit: 0,
            totalDebit: 0,
          });
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // Fetch balance + ledger for every vendor in parallel
        const results = await Promise.all(
          vendors.map(async vendor => {
            try {
              const p = new URLSearchParams({ vendorId: vendor._id });
              if (selectedCompanyId) p.append('companyId', selectedCompanyId);

              // 1. Ledger (for debit/credit totals + last transaction date)
              const ledgerRes = await fetch(
                `${baseURL}/api/ledger/vendor-payables?${p}`,
                { headers, signal },
              );

              let debitTotal = 0;
              let creditTotal = 0;
              let lastDate = null;
              let balance = vendor.balance || 0;

              if (ledgerRes.ok) {
                const data = await ledgerRes.json();
                debitTotal = (data.debit || []).reduce(
                  (s, e) => s + (e.amount || 0),
                  0,
                );
                creditTotal = [
                  ...(data.debit || []).filter(
                    e => e.paymentMethod !== 'Credit',
                  ),
                  ...(data.credit || []),
                ].reduce((s, e) => s + (e.amount || 0), 0);

                // Last transaction date for sorting
                const allEntries = [
                  ...(data.debit || []),
                  ...(data.credit || []),
                ];
                if (allEntries.length) {
                  lastDate = allEntries.reduce(
                    (latest, e) =>
                      new Date(e.date) > new Date(latest) ? e.date : latest,
                    allEntries[0].date,
                  );
                }

                // Compute balance from ledger (debit - credit = payable)
                balance = debitTotal - creditTotal;
              }

              return {
                vendorId: vendor._id,
                debitTotal,
                creditTotal,
                balance,
                lastDate,
              };
            } catch (err) {
              if (err.name === 'AbortError') throw err;
              return {
                vendorId: vendor._id,
                debitTotal: 0,
                creditTotal: 0,
                balance: vendor.balance || 0,
                lastDate: null,
              };
            }
          }),
        );

        if (signal.aborted) return;

        // Aggregate stats
        let totalDebit = 0;
        let totalCredit = 0;
        const balanceMap = {};
        const dateMap = {};

        results.forEach(r => {
          totalDebit += r.debitTotal;
          totalCredit += r.creditTotal;
          balanceMap[r.vendorId] = r.balance;
          if (r.lastDate) dateMap[r.vendorId] = r.lastDate;
        });

        // Update parent state for vendorBalances (so detail view works)
        if (setVendorBalances) setVendorBalances(balanceMap);
        if (setTransactionTotals)
          setTransactionTotals({ totalCredit, totalDebit });

        const netBalance = totalDebit - totalCredit;
        const settledVendors = results.filter(r => r.balance === 0).length;

        // Sort: by last transaction date descending (most recent first)
        // Vendors with no transactions go to end
        const sortedVendors = [...vendors].sort((a, b) => {
          const da = dateMap[a._id];
          const db = dateMap[b._id];
          if (!da && !db) return 0;
          if (!da) return 1;
          if (!db) return -1;
          return new Date(db) - new Date(da);
        });

        // Attach resolved balance to each item
        const itemsWithBalance = sortedVendors.map(v => ({
          ...v,
          _resolvedBalance: balanceMap[v._id] ?? v.balance ?? 0,
        }));

        setReadyItems(itemsWithBalance);
        setReadyStats({
          totalVendors: vendors.length,
          settledVendors,
          netBalance,
          totalCredit,
          totalDebit,
        });

        // ── EXPENSE VIEW ──────────────────────────────────────────────────────
      } else {
        if (!expenses.length) {
          setReadyItems([]);
          setReadyStats({ totalExpenses: 0, totalExpenseAmount: 0 });
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const results = await Promise.all(
          expenses.map(async expense => {
            try {
              const p = new URLSearchParams({ expenseId: expense._id });
              if (dateRange?.from) p.append('fromDate', dateRange.from);
              if (dateRange?.to) p.append('toDate', dateRange.to);
              if (selectedCompanyId) p.append('companyId', selectedCompanyId);

              const res = await fetch(
                `${baseURL}/api/ledger/expense-payables?${p}`,
                { headers, signal },
              );

              let total = 0;
              let lastDate = null;

              if (res.ok) {
                const data = await res.json();
                total =
                  (data.debit || [])
                    .filter(e => e.paymentMethod !== 'Credit')
                    .reduce((s, e) => s + Number(e.amount || 0), 0) +
                  (data.credit || []).reduce(
                    (s, e) => s + Number(e.amount || 0),
                    0,
                  );

                const allEntries = [
                  ...(data.debit || []),
                  ...(data.credit || []),
                ];
                if (allEntries.length) {
                  lastDate = allEntries.reduce(
                    (latest, e) =>
                      new Date(e.date) > new Date(latest) ? e.date : latest,
                    allEntries[0].date,
                  );
                }
              }

              return { expenseId: expense._id, total, lastDate };
            } catch (err) {
              if (err.name === 'AbortError') throw err;
              return { expenseId: expense._id, total: 0, lastDate: null };
            }
          }),
        );

        if (signal.aborted) return;

        const totalsMap = {};
        const dateMap = {};
        let totalExpenseAmount = 0;

        results.forEach(r => {
          totalsMap[r.expenseId] = r.total;
          totalExpenseAmount += r.total;
          if (r.lastDate) dateMap[r.expenseId] = r.lastDate;
        });

        if (setExpenseTotals) setExpenseTotals(totalsMap);

        const sortedExpenses = [...expenses].sort((a, b) => {
          const da = dateMap[a._id];
          const db = dateMap[b._id];
          if (!da && !db) return 0;
          if (!da) return 1;
          if (!db) return -1;
          return new Date(db) - new Date(da);
        });

        const itemsWithTotal = sortedExpenses.map(e => ({
          ...e,
          _resolvedBalance: totalsMap[e._id] ?? 0,
        }));

        setReadyItems(itemsWithTotal);
        setReadyStats({ totalExpenses: expenses.length, totalExpenseAmount });
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // silently cancelled
      console.error('loadAllData error', err);
      // Show empty on error rather than infinite skeleton
      setReadyItems([]);
      setReadyStats(
        currentView === 'vendor'
          ? {
              totalVendors: vendors.length,
              settledVendors: 0,
              netBalance: 0,
              totalCredit: 0,
              totalDebit: 0,
            }
          : { totalExpenses: expenses.length, totalExpenseAmount: 0 },
      );
    } finally {
      loadingRef.current = false;
    }
  }, [
    currentView,
    vendors,
    expenses,
    selectedCompanyId,
    dateRange,
    baseURL,
    setVendorBalances,
    setTransactionTotals,
    setExpenseTotals,
  ]);

  // ── Trigger load when key dependencies change ──────────────────────────────
  useEffect(() => {
    setCurrentPage(1);
    loadAllData();
    // Cleanup: abort if deps change before fetch completes
    return () => {
      if (abortRef.current) abortRef.current.abort();
      loadingRef.current = false;
    };
  }, [loadAllData]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const itemsPerPage = 10;
  const { paginatedItems, totalPages } = useMemo(() => {
    if (!readyItems) return { paginatedItems: [], totalPages: 0 };
    const total = Math.ceil(readyItems.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    return {
      paginatedItems: readyItems.slice(start, start + itemsPerPage),
      totalPages: total,
    };
  }, [readyItems, currentPage]);

  // ── Refresh ────────────────────────────────────────────────────────────────
  const onRefreshList = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    if (abortRef.current) abortRef.current.abort();
    loadingRef.current = false;
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }) => (
      <ListItem
        item={item}
        currentView={currentView}
        formatCurrency={formatCurrency}
        onSelect={onSelect}
      />
    ),
    [currentView, formatCurrency, onSelect],
  );

  const keyExtractor = useCallback(item => item._id, []);
  const HeaderIcon = currentView === 'vendor' ? Users : FileText;
  const headerIconColor = currentView === 'vendor' ? '#059669' : '#3b82f6';
  const headerIconBg =
    currentView === 'vendor' ? styles.headerIconGreen : styles.headerIconBlue;

  const DASH = '—';

  // ── Stats display ──────────────────────────────────────────────────────────
  const statsReady = readyStats !== null;
  const s = readyStats || {};

  // positive = vendor ko dena hai = Net Payable; negative = advance diya = Net Advance
  const netIsPayable = (s.netBalance ?? 0) >= 0;
  const netLabel = netIsPayable ? 'Net Payable' : 'Net Advance';
  const netIcon = netIsPayable ? TrendingUp : TrendingDown;
  const netColor = netIsPayable ? '#EF4444' : '#10B981';

  // ── Show skeleton until data is fully ready ────────────────────────────────
  if (readyItems === null && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <ListSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

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
        {/* ── Stats ─────────────────────────────────────────────────────── */}
        {currentView === 'vendor' ? (
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Vendors"
              value={statsReady ? String(s.totalVendors) : DASH}
              subtitle={statsReady ? `${s.settledVendors} settled` : ''}
              icon={Users}
              textColor="#111827"
            />
            <StatCard
              title={netLabel}
              value={statsReady ? formatCurrency(Math.abs(s.netBalance)) : DASH}
              subtitle={
                netIsPayable
                  ? 'You owe to vendors'
                  : 'Total advance with vendors'
              }
              icon={netIcon}
              textColor={netColor}
            />
            <StatCard
              title="Total Credit"
              value={statsReady ? formatCurrency(s.totalCredit) : DASH}
              subtitle="Payments made to vendors"
              icon={CreditCard}
              textColor="#111827"
            />
            <StatCard
              title="Total Debit"
              value={statsReady ? formatCurrency(s.totalDebit) : DASH}
              subtitle="All-time purchases made"
              icon={IndianRupee}
              textColor="#111827"
            />
          </View>
        ) : (
          <View style={[styles.statsGrid, styles.expenseStatsGrid]}>
            <StatCard
              title="Expense Categories"
              value={statsReady ? String(s.totalExpenses) : DASH}
              subtitle="Total categories"
              icon={FileText}
              textColor="#111827"
            />
            <StatCard
              title="Total Expenses"
              value={statsReady ? formatCurrency(s.totalExpenseAmount) : DASH}
              subtitle="Total amount spent"
              icon={TrendingUp}
              textColor="#111827"
            />
          </View>
        )}

        {/* ── Vendor / Expense list ──────────────────────────────────────── */}
        <View style={styles.mainCard}>
          <View
            style={[
              styles.mainHeader,
              { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
            ]}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerIconContainer}>
                <View style={[styles.headerIcon, headerIconBg]}>
                  <HeaderIcon
                    size={20}
                    color={headerIconColor}
                    strokeWidth={2}
                  />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.mainTitle}>
                    {currentView === 'vendor'
                      ? 'Vendors'
                      : 'Expense Categories'}
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
                    {readyItems?.length ?? 0}
                  </Text>
                </Badge>
              </View>
            </View>
          </View>

          <View style={styles.mainContent}>
            {!readyItems || readyItems.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <HeaderIcon size={36} color="#cbd5e1" strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyText}>
                  No{' '}
                  {currentView === 'vendor' ? 'vendors' : 'expense categories'}{' '}
                  found
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
                  ItemSeparatorComponent={() => (
                    <View style={styles.separator} />
                  )}
                />

                {readyItems.length > itemsPerPage && (
                  <View style={styles.pagination}>
                    <Text style={styles.paginationText}>
                      Showing {(currentPage - 1) * itemsPerPage + 1}–
                      {Math.min(currentPage * itemsPerPage, readyItems.length)}{' '}
                      of {readyItems.length}
                    </Text>
                    <View style={styles.paginationControls}>
                      <TouchableOpacity
                        onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={[
                          styles.paginationButton,
                          currentPage === 1 && styles.buttonDisabled,
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.paginationButtonText,
                            currentPage === 1 && styles.buttonTextDisabled,
                          ]}
                        >
                          Previous
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.pageNumberContainer}>
                        <Text style={styles.pageNumber}>{currentPage}</Text>
                        <Text style={styles.pageTotal}>of {totalPages}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          setCurrentPage(p => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        style={[
                          styles.paginationButton,
                          currentPage === totalPages && styles.buttonDisabled,
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.paginationButtonText,
                            currentPage === totalPages &&
                              styles.buttonTextDisabled,
                          ]}
                        >
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

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: -50,
  },
  skeleton: {
    backgroundColor: '#E8EDF2',
    borderRadius: 6,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 12,
  },
  expenseStatsGrid: { justifyContent: 'space-between' },
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
  statCardContent: { padding: 12, gap: 6 },
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
    fontSize: 16,
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
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
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
    elevation: 3,
  },
  headerIconGreen: { backgroundColor: '#ecfdf5' },
  headerIconBlue: { backgroundColor: '#eff6ff' },
  headerText: { flex: 1 },
  mainTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  headerSubtitle: { fontSize: 10, color: '#64748b', lineHeight: 18 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
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
  mainContent: { backgroundColor: '#ffffff' },
  listItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  iconRed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  iconGreen: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  iconGray: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  iconBlue: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  itemBalanceInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  balanceText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  badgeRed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  badgeGreen: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  badgeGray: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  expenseBadge: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  balanceBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  expenseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e40af',
    letterSpacing: 0.2,
  },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewButton: {
    width: 25,
    height: 25,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  separator: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 20 },
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
  buttonTextDisabled: { color: '#cbd5e1' },
  buttonDisabled: { opacity: 0.4, backgroundColor: '#f8fafc' },
  pageNumberContainer: { alignItems: 'center', paddingHorizontal: 16 },
  pageNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  pageTotal: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  badge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeSecondary: { backgroundColor: '#f1f5f9' },
  badgeDestructive: { backgroundColor: '#ef4444' },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
