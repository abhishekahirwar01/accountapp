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

export default function TransactionsTab({
  selectedClient,
  selectedCompanyId,
  companyMap,
}) {
  // State management
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [journals, setJournals] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [itemsToView, setItemsToView] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [invNoByTxId, setInvNoByTxId] = useState({});

  // Refs for memory leak prevention
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Memoized data processing with safety checks
  const productNameById = useMemo(() => {
    const m = new Map();
    if (!productsList || !Array.isArray(productsList)) return m;

    for (const p of productsList) {
      if (p && p._id) {
        m.set(String(p._id), p.name || '(unnamed product)');
      }
    }
    return m;
  }, [productsList]);

  const serviceNameById = useMemo(() => {
    const m = new Map();
    if (!servicesList || !Array.isArray(servicesList)) return m;

    for (const s of servicesList) {
      if (s && s._id) {
        m.set(String(s._id), s.serviceName || '(unnamed service)');
      }
    }
    return m;
  }, [servicesList]);

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

  // API fetch function with crash protection
  const fetchTransactions = useCallback(async () => {
    if (!selectedClient?._id || !isMountedRef.current) return;

    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const auth = {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      };

      const byCompany = !!selectedCompanyId;

      // Update API URLs to include company context
      const productsUrl = selectedCompanyId
        ? `${BASE_URL}/api/products?companyId=${selectedCompanyId}`
        : `${BASE_URL}/api/products`;

      const servicesUrl = selectedCompanyId
        ? `${BASE_URL}/api/services?companyId=${selectedCompanyId}`
        : `${BASE_URL}/api/services`;

      const [
        salesRes,
        purchasesRes,
        receiptsRes,
        paymentsRes,
        journalsRes,
        productsRes,
        servicesRes,
      ] = await Promise.all([
        fetch(
          byCompany
            ? `${BASE_URL}/api/sales?companyId=${selectedCompanyId}`
            : `${BASE_URL}/api/sales/by-client/${selectedClient._id}`,
          auth,
        ),
        fetch(
          byCompany
            ? `${BASE_URL}/api/purchase?companyId=${selectedCompanyId}`
            : `${BASE_URL}/api/purchase/by-client/${selectedClient._id}`,
          auth,
        ),
        fetch(
          byCompany
            ? `${BASE_URL}/api/receipts?companyId=${selectedCompanyId}`
            : `${BASE_URL}/api/receipts/by-client/${selectedClient._id}`,
          auth,
        ),
        fetch(
          byCompany
            ? `${BASE_URL}/api/payments?companyId=${selectedCompanyId}`
            : `${BASE_URL}/api/payments/by-client/${selectedClient._id}`,
          auth,
        ),
        fetch(
          byCompany
            ? `${BASE_URL}/api/journals?companyId=${selectedCompanyId}`
            : `${BASE_URL}/api/journals/by-client/${selectedClient._id}`,
          auth,
        ),
        fetch(productsUrl, auth),
        fetch(servicesUrl, auth),
      ]);

      // Check if component is still mounted
      if (!isMountedRef.current) return;

      // Check response statuses
      const mustOk = async (res, label) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(
            `${label} API ${res.status} ${res.statusText} – ${txt}`,
          );
        }
      };

      await Promise.all([
        mustOk(salesRes, 'Sales'),
        mustOk(purchasesRes, 'Purchases'),
        mustOk(receiptsRes, 'Receipts'),
        mustOk(paymentsRes, 'Payments'),
        mustOk(journalsRes, 'Journals'),
        mustOk(productsRes, 'Products'),
        mustOk(servicesRes, 'Services'),
      ]);

      const [
        salesData,
        purchasesData,
        receiptsData,
        paymentsData,
        journalsData,
        productsData,
        servicesData,
      ] = await Promise.all([
        salesRes.json(),
        purchasesRes.json(),
        receiptsRes.json(),
        paymentsRes.json(),
        journalsRes.json(),
        productsRes.json(),
        servicesRes.json(),
      ]);

      // Parse responses with safety
      const salesArr = parseResponse(salesData, [
        'salesEntries',
        'sales',
        'entries',
      ])
        .filter(Boolean)
        .map(s => ({
          ...s,
          type: 'sales',
        }));

      const purchasesArr = parseResponse(purchasesData, [
        'purchaseEntries',
        'purchases',
        'entries',
      ])
        .filter(Boolean)
        .map(p => ({
          ...p,
          type: 'purchases',
        }));

      const receiptsArr = parseResponse(receiptsData, [
        'receiptEntries',
        'receipts',
        'entries',
      ])
        .filter(Boolean)
        .map(r => ({
          ...r,
          type: 'receipt',
        }));

      const paymentsArr = parseResponse(paymentsData, [
        'paymentEntries',
        'payments',
        'entries',
      ])
        .filter(Boolean)
        .map(p => ({
          ...p,
          type: 'payment',
        }));

      const journalsArr = parseResponse(journalsData, ['data'])
        .filter(Boolean)
        .map(j => ({
          ...j,
          description: j.narration || j.description || '',
          type: 'journal',
          products: j.products || [],
          services: j.services || [],
          invoiceNumber: j.invoiceNumber || '',
          party: j.party || '',
        }));

      const productsList = parseResponse(productsData, [
        'products',
        'items',
        'data',
      ]);
      const servicesList = parseResponse(servicesData, ['services', 'data']);

      const filterByCompany = (arr, companyId) => {
        if (!arr || !Array.isArray(arr)) return [];
        if (!companyId) return arr;

        return arr.filter(doc => {
          if (!doc) return false;
          const docCompanyId = idOf(doc.company?._id ?? doc.company);
          return docCompanyId === companyId;
        });
      };

      if (isMountedRef.current) {
        setSales(filterByCompany(salesArr, selectedCompanyId));
        setPurchases(filterByCompany(purchasesArr, selectedCompanyId));
        setReceipts(filterByCompany(receiptsArr, selectedCompanyId));
        setPayments(filterByCompany(paymentsArr, selectedCompanyId));
        setJournals(filterByCompany(journalsArr, selectedCompanyId));
        setProductsList(productsList);
        setServicesList(servicesList);
      }
    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }

      console.error('Failed to load transactions:', error);
      if (isMountedRef.current) {
        Alert.alert(
          'Failed to load transactions',
          error instanceof Error ? error.message : 'Something went wrong.',
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [selectedClient?._id, selectedCompanyId, parseResponse]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

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

  // Safe data handlers
  const handleViewItems = useCallback(
    tx => {
      if (!tx) return;

      const prods = (tx.products || [])
        .map(p => {
          if (!p) return null;

          const productName =
            productNameById.get(p.product) || p.product?.name || '(product)';

          // Enhanced HSN code extraction
          let hsnCode = '';

          // Method 1: Check if product has HSN directly
          if (p.product && typeof p.product === 'object') {
            hsnCode = p.product.hsn || p.product.hsnCode || '';
          }

          // Method 2: Check product line level
          if (!hsnCode && p.hsn) {
            hsnCode = p.hsn;
          }

          // Method 3: Look up in productsList
          if (!hsnCode) {
            const productId =
              typeof p.product === 'object' ? p.product._id : p.product;
            const productObj = productsList.find(
              prod => prod && prod._id === productId,
            );
            hsnCode = productObj?.hsn || productObj?.hsnCode || '';
          }

          // Method 4: Fallback based on product name
          if (!hsnCode) {
            if (productName.toLowerCase().includes('gel')) hsnCode = '330499';
            else if (productName.toLowerCase().includes('moody'))
              hsnCode = '330499';
            else hsnCode = '8471'; // General goods
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

          const id =
            typeof s.service === 'object'
              ? s.service._id
              : s.service ??
                (typeof s.serviceName === 'object'
                  ? s.serviceName._id
                  : s.serviceName);

          const name =
            (id && serviceNameById.get(String(id))) ||
            (typeof s.service === 'object' && s.service.serviceName) ||
            (typeof s.serviceName === 'object' && s.serviceName.serviceName) ||
            '(service)';

          // Enhanced SAC code extraction
          let sacCode = '';

          // Method 1: Check if service has SAC directly
          if (s.service && typeof s.service === 'object') {
            sacCode = s.service.sac || s.service.sacCode || '';
          }

          // Method 2: Check service line level
          if (!sacCode && s.sac) {
            sacCode = s.sac;
          }

          // Method 3: Look up in servicesList
          if (!sacCode) {
            const serviceObj = servicesList.find(svc => svc && svc._id === id);
            sacCode = serviceObj?.sac || serviceObj?.sacCode || '';
          }

          // Method 4: Fallback based on service name
          if (!sacCode) {
            if (name.toLowerCase().includes('dressing')) sacCode = '999723';
            else if (name.toLowerCase().includes('consult')) sacCode = '998311';
            else sacCode = '9984'; // General services
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
    [productNameById, serviceNameById, productsList, servicesList],
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

  // Safe data processing
  const allTransactions = useMemo(() => {
    const all = [
      ...sales,
      ...purchases,
      ...receipts,
      ...payments,
      ...journals,
    ].filter(Boolean);

    return all.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [sales, purchases, receipts, payments, journals]);

  // Tab content rendering with safety
  const getTabData = useCallback(() => {
    switch (selectedTab) {
      case 'sales':
        return sales || [];
      case 'purchases':
        return purchases || [];
      case 'receipts':
        return receipts || [];
      case 'payments':
        return payments || [];
      case 'journals':
        return journals || [];
      default:
        return allTransactions;
    }
  }, [
    selectedTab,
    sales,
    purchases,
    receipts,
    payments,
    journals,
    allTransactions,
  ]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      );
    }

    const data = getTabData();

    if (!data || data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions found</Text>
        </View>
      );
    }

    if (isMobile) {
      return (
        <TransactionsTable
          data={data}
          companyMap={companyMap}
          serviceNameById={serviceNameById}
          onPreview={onPreview}
          onEdit={handleAction}
          onDelete={handleAction}
          onViewItems={handleViewItems}
          onSendInvoice={() => {}}
          hideActions={true}
        />
      );
    }

    // For desktop, use DataTable with columns
    return (
      <DataTable
        data={data}
        companyMap={companyMap}
        serviceNameById={serviceNameById}
        onViewItems={handleViewItems}
        onPreview={onPreview}
        onEdit={handleAction}
        onDelete={handleAction}
      />
    );
  };

  const handleTabChange = useCallback(tab => {
    setSelectedTab(tab);
    setIsDropdownOpen(false);
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
            keyExtractor={(item, index) => index.toString()}
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
}

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
    paddingHorizontal: 16,
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
});
