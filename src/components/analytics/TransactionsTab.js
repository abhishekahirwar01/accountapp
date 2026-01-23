import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ExportTransaction from './ExportTransaction';
import DataTable from '../transactions/DataTable';
import TransactionsTable from '../transactions/TransactionsTable';
import {
  TableSkeleton,
  MobileTableSkeleton,
} from '../transactions/transaction-form/table-skeleton';
import { issueInvoiceNumber } from '../../lib/issueInvoiceNumber';
import { BASE_URL } from '../../config';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const formatCurrency = amount => {
  if (!amount || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

const idOf = v => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v?._id || v?.$oid || v?.id || '';
};

// Skeleton Loading Component
const LoadingSkeleton = ({ isMobile = false }) => {
  if (isMobile) {
    return <MobileTableSkeleton />;
  }
  return <TableSkeleton />;
};

// Simple cache implementation
const apiCache = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

const getCachedData = key => {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  apiCache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

const TransactionsTab = ({ selectedClient, selectedCompanyId, companyMap }) => {
  // PERFORMANCE OPTIMIZATION STRATEGY:
  // ================================
  // Stage 1: Load transactions first (sales, purchases, receipts, payments, journals)
  //          -> This is the critical user-facing data that must appear quickly
  //          -> Users can see the data with basic information (amount, date, etc)
  //
  // Stage 2: Load products/services in background (after transactions show)
  //          -> These are only needed for detailed item viewing
  //          -> Non-blocking background fetch that won't delay initial render
  //          -> Improves perceived performance significantly
  //
  // Result: User sees transactions almost immediately, products/services load quietly in background

  // Consolidated state management
  const [data, setData] = useState({
    sales: [],
    purchases: [],
    receipts: [],
    payments: [],
    journals: [],
    products: [],
    services: [],
  });

  const [loadingStates, setLoadingStates] = useState({
    essential: false,
    sales: false,
    purchases: false,
    receipts: false,
    payments: false,
    journals: false,
  });

  const [progress, setProgress] = useState(0);
  const [selectedTab, setSelectedTab] = useState('all');
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10); // Pagination: show 10 items initially
  const [initialLoad, setInitialLoad] = useState(true); // Track if it's the first load
  const [bgLoading, setBgLoading] = useState(false); // background incremental loader
  const [itemsToView, setItemsToView] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [invNoByTxId, setInvNoByTxId] = useState({});

  // Refs for memory leak prevention
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Memoized data processing with safety checks
  const productNameById = useMemo(() => {
    const m = new Map();
    if (!data.products || !Array.isArray(data.products)) return m;

    for (const p of data.products) {
      if (p && p._id) {
        m.set(String(p._id), p.name || '(unnamed product)');
      }
    }
    return m;
  }, [data.products]);

  const serviceNameById = useMemo(() => {
    const m = new Map();
    if (!data.services || !Array.isArray(data.services)) return m;

    for (const s of data.services) {
      if (s && s._id) {
        m.set(String(s._id), s.serviceName || '(unnamed service)');
      }
    }
    return m;
  }, [data.services]);

  // Safe response parsing
  const parseResponse = useCallback((data, possibleArrayKeys = []) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;

    if (data?.success && Array.isArray(data?.data)) return data.data;
    if (data?.success && Array.isArray(data?.entries)) return data.entries;

    for (const key of possibleArrayKeys) {
      if (Array.isArray(data?.[key])) return data[key];
    }

    for (const key in data) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }

    return [];
  }, []);

  // Optimized API call function
  const fetchWithCache = useCallback(
    async (url, label) => {
      const cacheKey = `${url}-${selectedClient?._id}-${selectedCompanyId}`;
      const cached = getCachedData(cacheKey);

      if (cached) {
        console.log(`Using cached data for ${label}`);
        return cached;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(
          `${label} API ${response.status} ${response.statusText} – ${txt}`,
        );
      }

      const result = await response.json();
      setCachedData(cacheKey, result);

      return result;
    },
    [selectedClient?._id, selectedCompanyId],
  );

  // Sequential data loading with progress - OPTIMIZED
  // Stage 1: Load transactions first (visible data)
  // Stage 2: Load products/services in background
  const loadEssentialData = useCallback(async () => {
    if (!selectedClient?._id || !isMountedRef.current) return;

    setLoadingStates(prev => ({ ...prev, essential: true }));
    setProgress(0);

    try {
      const byCompany = !!selectedCompanyId;
      const baseParams = byCompany
        ? `?companyId=${selectedCompanyId}`
        : `/by-client/${selectedClient._id}`;

      // STAGE 1: Load transactions FIRST (high priority - user-facing data)
      setProgress(5);
      await loadTransactionType(
        'sales',
        `${BASE_URL}/api/sales${baseParams}`,
        20,
      );
      await loadTransactionType(
        'purchases',
        `${BASE_URL}/api/purchase${baseParams}`,
        35,
      );
      await loadTransactionType(
        'receipts',
        `${BASE_URL}/api/receipts${baseParams}`,
        50,
      );
      await loadTransactionType(
        'payments',
        `${BASE_URL}/api/payments${baseParams}`,
        65,
      );
      await loadTransactionType(
        'journals',
        `${BASE_URL}/api/journals${baseParams}`,
        80,
      );

      if (!isMountedRef.current) return;

      // Set progress to 50 since main transactions are loaded (skeleton can disappear)
      setProgress(50);
      setInitialLoad(false); // Hide skeleton now

      // STAGE 2: Load products and services in BACKGROUND (non-blocking)
      // Don't await - let this run in background after transactions are shown
      Promise.all([
        fetchWithCache(
          `${BASE_URL}/api/products${
            byCompany ? `?companyId=${selectedCompanyId}` : ''
          }`,
          'Products',
        ),
        fetchWithCache(
          `${BASE_URL}/api/services${
            byCompany ? `?companyId=${selectedCompanyId}` : ''
          }`,
          'Services',
        ),
      ])
        .then(([productsData, servicesData]) => {
          if (!isMountedRef.current) return;

          const productsList = parseResponse(productsData, [
            'products',
            'items',
            'data',
          ]);
          const servicesList = parseResponse(servicesData, [
            'services',
            'data',
          ]);

          setData(prev => ({
            ...prev,
            products: productsList,
            services: servicesList,
          }));
          setProgress(100);
        })
        .catch(error => {
          console.warn('Background product/service loading failed:', error);
          setProgress(100);
        });
    } catch (error) {
      console.error('Failed to load transaction data:', error);
      if (isMountedRef.current) {
        Alert.alert(
          'Failed to load transactions',
          error instanceof Error ? error.message : 'Something went wrong.',
        );
        setProgress(100);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingStates(prev => ({ ...prev, essential: false }));
      }
    }
  }, [selectedClient?._id, selectedCompanyId, fetchWithCache, parseResponse]);

  const loadTransactionType = async (type, url, progressValue) => {
    if (!isMountedRef.current) return;

    setLoadingStates(prev => ({ ...prev, [type]: true }));

    try {
      const responseData = await fetchWithCache(url, type);

      if (!isMountedRef.current) return;

      const parsedData = parseResponse(responseData, [
        `${type}Entries`,
        type,
        'entries',
        'data',
      ])
        .filter(Boolean)
        .map(item => ({
          ...item,
          type: type === 'purchase' ? 'purchases' : type,
        }));

      const filteredData = filterByCompany(parsedData, selectedCompanyId);

      setData(prev => ({
        ...prev,
        [type]: filteredData,
      }));
      setProgress(progressValue);
    } catch (error) {
      console.error(`Failed to load ${type}:`, error);
    } finally {
      if (isMountedRef.current) {
        setLoadingStates(prev => ({ ...prev, [type]: false }));
      }
    }
  };

  const filterByCompany = (arr, companyId) => {
    if (!arr || !Array.isArray(arr)) return [];
    if (!companyId) return arr;

    return arr.filter(doc => {
      if (!doc) return false;
      const docCompanyId = idOf(doc.company?._id ?? doc.company);
      return docCompanyId === companyId;
    });
  };

  useEffect(() => {
    loadEssentialData();
  }, [loadEssentialData]);

  // Invoice number functionality with safety
  const ensureInvoiceNumberFor = useCallback(
    async tx => {
      if (!tx) throw new Error('No transaction provided');

      const existing = tx.invoiceNumber || invNoByTxId[tx._id];
      if (existing) return existing;

      const companyId = idOf(tx.company?._id ?? tx.company);
      if (!companyId) throw new Error('No companyId on this transaction');

      const issued = await issueInvoiceNumber(companyId);
      if (isMountedRef.current) {
        setInvNoByTxId(m => ({ ...m, [tx._id]: issued }));
      }
      return issued;
    },
    [invNoByTxId],
  );

  // Optimized item viewing with better HSN/SAC extraction
  const handleViewItems = useCallback(
    tx => {
      if (!tx) return;

      const prods = (tx.products || [])
        .map(p => {
          if (!p) return null;

          const productName =
            productNameById.get(p.product) || p.product?.name || '(product)';
          let hsnCode = p.hsn || p.product?.hsn || p.product?.hsnCode || '';

          // Fallback HSN codes
          if (!hsnCode) {
            if (productName.toLowerCase().includes('gel')) hsnCode = '330499';
            else if (productName.toLowerCase().includes('moody'))
              hsnCode = '330499';
            else hsnCode = '8471';
          }

          return {
            itemType: 'product',
            name: productName,
            quantity: p.quantity ?? '',
            unitType: p.unitType ?? '',
            otherUnit: p.otherUnit ?? '',
            pricePerUnit: p.pricePerUnit ?? '',
            description: '',
            amount: Number(p.amount) || 0,
            hsnCode,
          };
        })
        .filter(Boolean);

      const svcArr = Array.isArray(tx.services)
        ? tx.services
        : Array.isArray(tx.service)
        ? tx.service
        : [];

      const svcs = svcArr
        .map(s => {
          if (!s) return null;

          const id = typeof s.service === 'object' ? s.service._id : s.service;
          const name =
            serviceNameById.get(String(id)) ||
            (typeof s.service === 'object' && s.service.serviceName) ||
            '(service)';

          let sacCode = s.sac || s.service?.sac || s.service?.sacCode || '';

          // Fallback SAC codes
          if (!sacCode) {
            if (name.toLowerCase().includes('dressing')) sacCode = '999723';
            else if (name.toLowerCase().includes('consult')) sacCode = '998311';
            else sacCode = '9984';
          }

          return {
            itemType: 'service',
            name,
            quantity: '',
            unitType: '',
            pricePerUnit: '',
            description: s.description || '',
            amount: Number(s.amount) || 0,
            sacCode,
          };
        })
        .filter(Boolean);

      const allItems = [...prods, ...svcs];

      if (isMountedRef.current) {
        setItemsToView(allItems);
        setIsItemsModalOpen(true);
      }
    },
    [productNameById, serviceNameById],
  );

  const handleAction = useCallback(() => {
    Alert.alert(
      'Action not available',
      'Editing and deleting transactions is not available from the analytics dashboard.',
      [{ text: 'OK' }],
    );
  }, []);

  const onPreview = useCallback(
    async tx => {
      if (!tx) return;

      try {
        const invNo = await ensureInvoiceNumberFor(tx);
        Alert.alert(
          'Preview Invoice',
          `Invoice ${invNo} would open in preview mode`,
          [{ text: 'OK' }],
        );
      } catch (e) {
        Alert.alert(
          "Couldn't issue invoice number",
          e?.message || 'Try again.',
          [{ text: 'OK' }],
        );
      }
    },
    [ensureInvoiceNumberFor],
  );

  const onDownloadInvoice = useCallback(
    async tx => {
      if (!tx) return;

      try {
        const invNo = await ensureInvoiceNumberFor(tx);
        Alert.alert(
          'Download Invoice',
          `Invoice ${invNo} would be downloaded`,
          [{ text: 'OK' }],
        );
      } catch (e) {
        Alert.alert(
          "Couldn't issue invoice number",
          e?.message || 'Try again.',
          [{ text: 'OK' }],
        );
      }
    },
    [ensureInvoiceNumberFor],
  );

  // Optimized data processing
  const allTransactions = useMemo(() => {
    const all = [
      ...data.sales,
      ...data.purchases,
      ...data.receipts,
      ...data.payments,
      ...data.journals,
    ].filter(Boolean);

    return all.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [data.sales, data.purchases, data.receipts, data.payments, data.journals]);

  // Tab content rendering with safety
  const getTabData = useCallback(() => {
    let tabData = [];
    switch (selectedTab) {
      case 'sales':
        tabData = data.sales || [];
        break;
      case 'purchases':
        tabData = data.purchases || [];
        break;
      case 'receipts':
        tabData = data.receipts || [];
        break;
      case 'payments':
        tabData = data.payments || [];
        break;
      case 'journals':
        tabData = data.journals || [];
        break;
      default:
        tabData = allTransactions;
    }
    // Return paginated data (show visibleCount items)
    return tabData.slice(0, visibleCount);
  }, [selectedTab, data, allTransactions, visibleCount]);

  // Load more handler for pagination (kept for explicit triggers)
  const handleLoadMore = useCallback(() => {
    let allTabData = [];
    switch (selectedTab) {
      case 'sales':
        allTabData = data.sales || [];
        break;
      case 'purchases':
        allTabData = data.purchases || [];
        break;
      case 'receipts':
        allTabData = data.receipts || [];
        break;
      case 'payments':
        allTabData = data.payments || [];
        break;
      case 'journals':
        allTabData = data.journals || [];
        break;
      default:
        allTabData = allTransactions;
    }

    if (visibleCount < allTabData.length) {
      setVisibleCount(prevCount => Math.min(prevCount + 10, allTabData.length)); // Load 10 more items
    }
  }, [visibleCount, selectedTab, data, allTransactions]);

  // Background incremental loader: when initial skeleton is hidden, keep loading more items quietly
  useEffect(() => {
    if (initialLoad) return; // don't run while initial skeleton is active

    let cancelled = false;
    let timer = null;

    const getFullLength = () => {
      switch (selectedTab) {
        case 'sales':
          return (data.sales || []).length;
        case 'purchases':
          return (data.purchases || []).length;
        case 'receipts':
          return (data.receipts || []).length;
        case 'payments':
          return (data.payments || []).length;
        case 'journals':
          return (data.journals || []).length;
        default:
          return allTransactions.length;
      }
    };

    const scheduleNext = () => {
      const fullLen = getFullLength();
      if (cancelled) return;
      if (visibleCount >= fullLen) return;

      setBgLoading(true);
      timer = setTimeout(() => {
        if (cancelled || !isMountedRef.current) return;
        setVisibleCount(prev => Math.min(prev + 10, fullLen));
        setBgLoading(false);
        // schedule another chunk if still more
        timer = setTimeout(() => {
          scheduleNext();
        }, 600);
      }, 700);
    };

    // Start background loading only if there are more items
    if (visibleCount < getFullLength()) scheduleNext();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      setBgLoading(false);
    };
  }, [
    initialLoad,
    selectedTab,
    visibleCount,
    data.sales,
    data.purchases,
    data.receipts,
    data.payments,
    data.journals,
    allTransactions,
  ]);

  // Show skeleton only on initial load until transactions are ready
  const isLoading = initialLoad && progress < 50;

  const renderContent = () => {
    // Show skeleton while loading transactions initially
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <LoadingSkeleton isMobile={isMobile} />
        </View>
      );
    }

    const paginatedTabData = getTabData();
    // Get full data for checking if there's more to load
    let fullTabData = [];
    switch (selectedTab) {
      case 'sales':
        fullTabData = data.sales || [];
        break;
      case 'purchases':
        fullTabData = data.purchases || [];
        break;
      case 'receipts':
        fullTabData = data.receipts || [];
        break;
      case 'payments':
        fullTabData = data.payments || [];
        break;
      case 'journals':
        fullTabData = data.journals || [];
        break;
      default:
        fullTabData = allTransactions;
    }

    if (!paginatedTabData || paginatedTabData.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions found</Text>
        </View>
      );
    }

    if (isMobile) {
      return (
        <ScrollView>
          <TransactionsTable
            data={paginatedTabData}
            companyMap={companyMap}
            serviceNameById={serviceNameById}
            onPreview={onPreview}
            onEdit={handleAction}
            onDelete={handleAction}
            onViewItems={handleViewItems}
            onSendInvoice={() => {}}
            hideActions={true}
          />
          {visibleCount < fullTabData.length && (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          )}
        </ScrollView>
      );
    }

    return (
      <ScrollView>
        <DataTable
          data={paginatedTabData}
          companyMap={companyMap}
          serviceNameById={serviceNameById}
          onViewItems={handleViewItems}
          onPreview={onPreview}
          onEdit={handleAction}
          onDelete={handleAction}
        />
        {visibleCount < fullTabData.length && (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}
      </ScrollView>
    );
  };

  const handleTabChange = useCallback(tab => {
    setSelectedTab(tab);
    setIsDropdownOpen(false);
    setVisibleCount(10); // Reset to show 10 items for new tab
  }, []);

  // Tab navigation component
  const TabNavigation = useCallback(
    () => (
      <View style={styles.tabContainer}>
        {/* Desktop Tabs */}
        {!isMobile && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabList}
          >
            {[
              'all',
              'sales',
              'purchases',
              'receipts',
              'payments',
              'journals',
            ].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabTrigger,
                  selectedTab === tab && styles.activeTab,
                ]}
                onPress={() => handleTabChange(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Mobile Dropdown */}
        {isMobile && (
          <View style={styles.mobileTabContainer}>
            <TouchableOpacity
              style={styles.mobileTabHeader}
              onPress={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <Text style={styles.mobileTabText}>
                {selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            {isDropdownOpen && (
              <View style={styles.dropdownMenu}>
                {[
                  'all',
                  'sales',
                  'purchases',
                  'receipts',
                  'payments',
                  'journals',
                ].map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={styles.dropdownItem}
                    onPress={() => handleTabChange(tab)}
                  >
                    <Text style={styles.dropdownItemText}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Export Button */}
        <View style={styles.exportSection}>
          <ExportTransaction
            selectedClientId={selectedClient?._id}
            companyMap={companyMap}
            defaultCompanyId={selectedCompanyId}
          />
        </View>
      </View>
    ),
    [
      isMobile,
      selectedTab,
      handleTabChange,
      isDropdownOpen,
      selectedClient,
      selectedCompanyId,
      companyMap,
    ],
  );

  // Items Modal Component
  const ItemsModal = useCallback(
    () => (
      <Modal
        visible={isItemsModalOpen}
        animationType="slide"
        onRequestClose={() => setIsItemsModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Item Details</Text>
            <Text style={styles.modalDescription}>
              A detailed list of all items in this transaction.
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsItemsModalOpen(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={itemsToView}
            keyExtractor={(item, index) => `${index}-${item.name}`}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemIcon}>
                    <Text style={styles.iconText}>
                      {item.itemType === 'service' ? '⚡' : '📦'}
                    </Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemType}>
                        {item.itemType?.charAt(0).toUpperCase() +
                          item.itemType?.slice(1)}
                      </Text>
                      <Text style={styles.hsnSac}>
                        {item.itemType === 'service' ? 'SAC' : 'HSN'}:{' '}
                        {item.sacCode || item.hsnCode || '—'}
                      </Text>
                    </View>
                    {item.itemType === 'service' && item.description && (
                      <Text style={styles.itemDescription}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.itemDetails}>
                  {item.itemType === 'product' && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailText}>
                        Qty: {item.quantity}{' '}
                        {item.unitType === 'Other'
                          ? item.otherUnit || 'Other'
                          : item.unitType || 'Piece'}
                      </Text>
                      <Text style={styles.detailText}>
                        Rate: {formatCurrency(Number(item.pricePerUnit))}
                      </Text>
                    </View>
                  )}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalAmount}>
                      {formatCurrency(Number(item.amount))}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            contentContainerStyle={styles.itemsList}
            ListEmptyComponent={
              <View style={styles.noItems}>
                <Text style={styles.noItemsText}>No items found</Text>
              </View>
            }
          />
        </View>
      </Modal>
    ),
    [isItemsModalOpen, itemsToView],
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabSectionWrapper}>
        <TabNavigation />
      </View>

      <ScrollView
        style={styles.contentScrollView}
        contentContainerStyle={styles.contentScrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>

      <ItemsModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 16,
  },
  tabSectionWrapper: {
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    zIndex: 1,
  },
  contentScrollView: {
    flex: 1,
    paddingHorizontal: 2,
  },
  contentScrollContainer: {
    paddingBottom: 40,
    minHeight: '100%',
  },
  // Tab Navigation Styles
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tabList: {
    flex: 1,
  },
  tabTrigger: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    minWidth: 80,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  mobileTabContainer: {
    flex: 1,
    position: 'relative',
  },
  mobileTabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mobileTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 4,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  exportSection: {
    marginLeft: 12,
  },
  // Content Styles
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    width: '80%',
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  noItems: {
    padding: 40,
    alignItems: 'center',
  },
  noItemsText: {
    fontSize: 16,
    color: '#666',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  itemsList: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 12,
    color: 'white',
    backgroundColor: '#666',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    overflow: 'hidden',
  },
  hsnSac: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  itemDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  itemDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
  },
  totalLabel: {
    fontWeight: '600',
    color: '#333',
    fontSize: 14,
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#007AFF',
    fontSize: 16,
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  loadMoreText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TransactionsTab;
