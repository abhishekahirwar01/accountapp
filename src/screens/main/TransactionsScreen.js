// screens/TransactionsScreen.js
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
// SafeAreaView removed: global Header provides the safe area
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  FlatList,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Linking,
  Platform,
  PermissionsAndroid,
  Share,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Pdf from 'react-native-pdf';
import { useCompany } from '../../contexts/company-context';
import { useToast } from '../../components/hooks/useToast';
import { usePermissions } from '../../contexts/permission-context';
import { useUserPermissions } from '../../contexts/user-permissions-context';

// Icons
import Icon from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Custom components
import DataTable from '../../components/transactions/DataTable';
import { TransactionForm } from '../../components/transactions/TransactionForm';
import ProformaForm from '../../components/transactions/ProformaForm';
import InvoicePreview from '../../components/invoices/InvoicePreview';
import {
  columns,
  useColumns,
  makeCustomFilterFn,
} from '../../components/transactions/columns';
import { generatePdfForTemplate1 } from '../../lib/pdf-template1';
import {
  TableSkeleton,
  MobileTableSkeleton,
} from '../../components/transactions/transaction-form/table-skeleton';
import { BASE_URL } from '../../config';
import AppLayout from '../../components/layout/AppLayout';

const { width, height } = Dimensions.get('window');

// Format currency for Indian Rupees
const formatCurrency = amount => {
  if (!amount) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

// Tab types
const TABS = {
  ALL: 'all',
  SALES: 'sales',
  PURCHASES: 'purchases',
  PROFORMA: 'proforma',
  RECEIPTS: 'receipts',
  PAYMENTS: 'payments',
  JOURNALS: 'journals',
};

// Skeleton Loading Component
const LoadingSkeleton = ({ isMobile = false }) => {
  if (isMobile) {
    return <MobileTableSkeleton />;
  }

  return <TableSkeleton />;
};

const TransactionsScreen = ({ navigation }) => {
  const { width: windowWidth } = useWindowDimensions();
  // Reduce title sizes so it fits on one line with buttons
  const largeTitleFontSize =
    windowWidth < 360 ? 18 : windowWidth < 400 ? 20 : 22;
  const subtitleFontSize = windowWidth < 360 ? 12 : 13;
  // State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProformaFormOpen, setIsProformaFormOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isItemsDialogOpen, setIsItemsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const mobileTabScrollRef = useRef(null);
  const [mobileScrollX, setMobileScrollX] = useState(0);
  const [mobileContentWidth, setMobileContentWidth] = useState(0);
  const [mobileContainerWidth, setMobileContainerWidth] = useState(0);

  // Since chevrons are absolute overlays at the edges, treat the visible
  // area as the full container width. Show left arrow when scrolled > 5px.
  // Show right arrow only when there is remaining content to the right.
  const innerContainerWidth = mobileContainerWidth || 0;
  const EDGE_THRESHOLD = 8;
  const showLeftArrow = mobileScrollX > EDGE_THRESHOLD;
  const showRightArrow =
    mobileScrollX + innerContainerWidth < mobileContentWidth - EDGE_THRESHOLD;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPdfViewOpen, setIsPdfViewOpen] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [transactionToEdit, setTransactionToEdit] = useState(null);

  const [itemsToView, setItemsToView] = useState([]);

  const [activeTab, setActiveTab] = useState(TABS.ALL);
  const [vendors, setVendors] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [proforma, setProforma] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [journals, setJournals] = useState([]);

  const [companies, setCompanies] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [parties, setParties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const [defaultTransactionType, setDefaultTransactionType] = useState(null);
  const [prefillFromTransaction, setPrefillFromTransaction] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filter, setFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);

  // Email states
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailDialogMessage, setEmailDialogMessage] = useState('');
  const [emailDialogTitle, setEmailDialogTitle] = useState('');
  const [isGmailNotConnected, setIsGmailNotConnected] = useState(false);

  // Hooks
  const { selectedCompanyId, triggerCompaniesRefresh } = useCompany();
  const { toast } = useToast();
  const {
    permissions: userCaps,
    role,
    refetch: refetchUserPermissions,
  } = useUserPermissions();
  const { permissions: clientPermissions, refetch: refetchClientPermissions } =
    usePermissions();

  const isSuper = role === 'master' || role === 'client';

  // Permission checks
  const canSales = isSuper || !!userCaps?.canCreateSaleEntries;
  const canPurchases = isSuper || !!userCaps?.canCreatePurchaseEntries;
  const canReceipt = isSuper || !!userCaps?.canCreateReceiptEntries;
  const canPayment = isSuper || !!userCaps?.canCreatePaymentEntries;
  const canJournal = isSuper || !!userCaps?.canCreateJournalEntries;

  const allowedTypes = useMemo(() => {
    const arr = [];
    if (canSales) arr.push('sales');
    if (canPurchases) arr.push('purchases');
    if (canReceipt) arr.push('receipt');
    if (canPayment) arr.push('payment');
    if (canJournal) arr.push('journal');
    return arr;
  }, [canSales, canPurchases, canReceipt, canPayment, canJournal]);

  const canCreateAny = allowedTypes.length > 0;

  // Tab to form type mapping
  const tabToFormType = tab => {
    switch (tab) {
      case TABS.SALES:
        return 'sales';
      case TABS.PURCHASES:
        return 'purchases';
      case TABS.RECEIPTS:
        return 'receipt';
      case TABS.PAYMENTS:
        return 'payment';
      case TABS.JOURNALS:
        return 'journal';
      default:
        return null;
    }
  };

  // Company ID helper
  const getCompanyId = c => {
    if (!c) return null;
    if (typeof c === 'object') return c._id || null;
    return c || null;
  };

  // Fetch transactions
  const fetchTransactions = useCallback(
    async (isManualRefresh = false) => {
      if (initialLoad) {
        setIsLoading(true); // Skeleton shuru
        // Ensure pull-to-refresh spinner is off for initial load
        setIsRefreshing(false);
      }

      // Show pull-to-refresh spinner only when user explicitly refreshes
      if (isManualRefresh) {
        setIsRefreshing(true);
      }

      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found.');

        const queryParam = selectedCompanyId
          ? `?companyId=${selectedCompanyId}`
          : '';

        const parseResponse = (data, possibleArrayKeys = []) => {
          if (Array.isArray(data)) return data;

          if (data?.success && Array.isArray(data?.data)) return data.data;
          if (data?.success && Array.isArray(data?.entries))
            return data.entries;

          for (const key of possibleArrayKeys) {
            if (Array.isArray(data?.[key])) return data[key];
          }

          for (const key in data) {
            if (Array.isArray(data[key])) {
              console.warn(`Found array in unexpected key: ${key}`);
              return data[key];
            }
          }

          return [];
        };

        const fetchData = async (url, parser, endpointName) => {
          try {
            const response = await fetch(`${BASE_URL}${url}`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
              throw new Error(
                `${endpointName} failed: ${response.status} ${response.statusText}`,
              );
            }

            const data = await response.json();
            return parser(data);
          } catch (error) {
            console.error(`Error fetching ${endpointName}:`, error);
            throw error;
          }
        };

        const maybeFetch = (condition, task, fallback) =>
          condition ? task() : Promise.resolve(fallback);

        // STEP 1: Pehle Transactions aur Companies dono fetch karein
        const [
          salesArray,
          purchasesArray,
          proformaArray,
          receiptsArray,
          paymentsArray,
          journalsArray,
          companiesArray, // <-- Company ko bhi main promise mein le aayein
        ] = await Promise.all([
          maybeFetch(
            canSales,
            () =>
              fetchData(
                `/api/sales${queryParam}`,
                data =>
                  parseResponse(data, ['salesEntries', 'sales', 'entries']),
                'sales',
              ),
            [],
          ),
          maybeFetch(
            canPurchases,
            () =>
              fetchData(
                `/api/purchase${queryParam}`,
                data =>
                  parseResponse(data, [
                    'purchaseEntries',
                    'purchases',
                    'entries',
                  ]),
                'purchases',
              ),
            [],
          ),
          maybeFetch(
            canSales,
            () =>
              fetchData(
                `/api/proforma${queryParam}`,
                data =>
                  parseResponse(data, [
                    'proformaEntries',
                    'proforma',
                    'entries',
                  ]),
                'proforma',
              ),
            [],
          ),
          maybeFetch(
            canReceipt,
            () =>
              fetchData(
                `/api/receipts${queryParam}`,
                data =>
                  parseResponse(data, [
                    'receiptEntries',
                    'receipts',
                    'entries',
                  ]),
                'receipts',
              ),
            [],
          ),
          maybeFetch(
            canPayment,
            () =>
              fetchData(
                `/api/payments${queryParam}`,
                data =>
                  parseResponse(data, [
                    'paymentEntries',
                    'payments',
                    'entries',
                  ]),
                'payments',
              ),
            [],
          ),
          maybeFetch(
            canJournal,
            () =>
              fetchData(
                `/api/journals${queryParam}`,
                data =>
                  parseResponse(data, [
                    'journalEntries',
                    'journals',
                    'entries',
                  ]),
                'journals',
              ),
            [],
          ),
          fetchData(
            '/api/companies/my',
            data => parseResponse(data, ['companies', 'data']),
            'companies',
          ),
        ]);

        // Sabse pehle Companies set karein taaki "Company Setup Required" na dikhe
        setCompanies(companiesArray);

        // Baaki data set karein
        setSales(salesArray.map(p => ({ ...p, type: 'sales' })));
        setPurchases(purchasesArray.map(p => ({ ...p, type: 'purchases' })));
        setProforma(proformaArray.map(p => ({ ...p, type: 'proforma' })));
        setReceipts(receiptsArray.map(r => ({ ...r, type: 'receipt' })));
        setPayments(paymentsArray.map(p => ({ ...p, type: 'payment' })));
        setJournals(
          journalsArray.map(j => ({
            ...j,
            description: j.narration || j.description,
            type: 'journal',
          })),
        );

        // Ab Loading band karein (Ab seedha UI dikhega)
        setIsLoading(false);
        setIsRefreshing(false);
        setInitialLoad(false);

        // STEP 2: Ab baki bacha hua low-priority data background mein chalne dein
        Promise.all([
          fetchData(
            '/api/parties',
            data => parseResponse(data, ['parties', 'customers', 'data']),
            'parties',
          ),
          fetchData(
            '/api/vendors',
            data => parseResponse(data, ['vendors', 'suppliers', 'data']),
            'vendors',
          ),
          fetchData(
            '/api/products',
            data => parseResponse(data, ['products', 'items', 'data']),
            'products',
          ),
          fetchData(
            '/api/services',
            data => parseResponse(data, ['services', 'data']),
            'services',
          ),
        ]).then(
          ([partiesArray, vendorsArray, productsArray, servicesArray]) => {
            setParties(partiesArray);
            setVendors(vendorsArray);
            setProductsList(productsArray);
            setServicesList(servicesArray);
          },
        );
      } catch (error) {
        // ... error handling
        console.error('Fetch transactions error:', error);
        toast('Failed to load transactions', 'error', error.message);
        setIsLoading(false);
        setInitialLoad(false);
        setIsRefreshing(false);
      } finally {
        // Do not change refreshing here; background tasks run separately
      }
    },
    [
      selectedCompanyId,
      canSales,
      canPurchases,
      canReceipt,
      canPayment,
      canJournal,
      toast,
      initialLoad,
    ],
  );

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Data processing
  const productNameById = useMemo(() => {
    const map = new Map();
    productsList.forEach(p => {
      map.set(String(p._id), p.name || '(unnamed product)');
    });
    return map;
  }, [productsList]);

  const serviceNameById = useMemo(() => {
    const map = new Map();
    servicesList.forEach(s => {
      map.set(String(s._id), s.serviceName || '');
    });
    return map;
  }, [servicesList]);

  const customFilterFn = useMemo(
    () => makeCustomFilterFn(serviceNameById),
    [serviceNameById],
  );

  // Filter data based on company
  const userCompanyIds = useMemo(() => companies.map(c => c._id), [companies]);

  const filteredSales = useMemo(() => {
    const base = selectedCompanyId
      ? sales.filter(s => getCompanyId(s.company) === selectedCompanyId)
      : sales.filter(s => userCompanyIds.includes(getCompanyId(s.company)));
    return base;
  }, [sales, selectedCompanyId, userCompanyIds]);

  const filteredPurchases = useMemo(() => {
    const base = selectedCompanyId
      ? purchases.filter(p => getCompanyId(p.company) === selectedCompanyId)
      : purchases.filter(p => userCompanyIds.includes(getCompanyId(p.company)));
    return base;
  }, [purchases, selectedCompanyId, userCompanyIds]);

  const filteredProforma = useMemo(() => {
    const base = selectedCompanyId
      ? proforma.filter(p => getCompanyId(p.company) === selectedCompanyId)
      : proforma.filter(p => userCompanyIds.includes(getCompanyId(p.company)));
    return base;
  }, [proforma, selectedCompanyId, userCompanyIds]);

  const filteredReceipts = useMemo(() => {
    const base = selectedCompanyId
      ? receipts.filter(r => getCompanyId(r.company) === selectedCompanyId)
      : receipts.filter(r => userCompanyIds.includes(getCompanyId(r.company)));
    return base;
  }, [receipts, selectedCompanyId, userCompanyIds]);

  const filteredPayments = useMemo(() => {
    const base = selectedCompanyId
      ? payments.filter(p => getCompanyId(p.company) === selectedCompanyId)
      : payments.filter(p => userCompanyIds.includes(getCompanyId(p.company)));
    return base;
  }, [payments, selectedCompanyId, userCompanyIds]);

  const filteredJournals = useMemo(() => {
    const base = selectedCompanyId
      ? journals.filter(j => getCompanyId(j.company) === selectedCompanyId)
      : journals.filter(j => userCompanyIds.includes(getCompanyId(j.company)));
    return base;
  }, [journals, selectedCompanyId, userCompanyIds]);

  // Visible data based on permissions
  const visibleSales = canSales ? filteredSales : [];
  const visiblePurchases = canPurchases ? filteredPurchases : [];
  const visibleProforma = canSales ? filteredProforma : [];
  const visibleReceipts = canReceipt ? filteredReceipts : [];
  const visiblePayments = canPayment ? filteredPayments : [];
  const visibleJournals = canJournal ? filteredJournals : [];

  const allVisibleTransactions = useMemo(() => {
    return [
      ...visibleSales,
      ...visiblePurchases,
      ...visibleProforma,
      ...visibleReceipts,
      ...visiblePayments,
      ...visibleJournals,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    visibleSales,
    visiblePurchases,
    visibleProforma,
    visibleReceipts,
    visiblePayments,
    visibleJournals,
  ]);

  const searchedAll = useMemo(() => {
    if (!filter) return allVisibleTransactions;
    return allVisibleTransactions.filter(item => customFilterFn(item, filter));
  }, [filter, allVisibleTransactions, customFilterFn]);

  const searchedSales = useMemo(() => {
    if (!filter) return visibleSales;
    return visibleSales.filter(item => customFilterFn(item, filter));
  }, [filter, visibleSales, customFilterFn]);

  const searchedPurchases = useMemo(() => {
    if (!filter) return visiblePurchases;
    return visiblePurchases.filter(item => customFilterFn(item, filter));
  }, [filter, visiblePurchases, customFilterFn]);

  const searchedProforma = useMemo(() => {
    if (!filter) return visibleProforma;
    return visibleProforma.filter(item => customFilterFn(item, filter));
  }, [filter, visibleProforma, customFilterFn]);

  const searchedReceipts = useMemo(() => {
    if (!filter) return visibleReceipts;
    return visibleReceipts.filter(item => customFilterFn(item, filter));
  }, [filter, visibleReceipts, customFilterFn]);

  const searchedPayments = useMemo(() => {
    if (!filter) return visiblePayments;
    return visiblePayments.filter(item => customFilterFn(item, filter));
  }, [filter, visiblePayments, customFilterFn]);

  const searchedJournals = useMemo(() => {
    if (!filter) return visibleJournals;
    return visibleJournals.filter(item => customFilterFn(item, filter));
  }, [filter, visibleJournals, customFilterFn]);

  const onFilterChange = text => {
    setFilter(text);
    setVisibleCount(20);
  };

  const getCurrentSearchedData = useCallback(() => {
    switch (activeTab) {
      case TABS.ALL:
        return searchedAll;
      case TABS.SALES:
        return searchedSales;
      case TABS.PURCHASES:
        return searchedPurchases;
      case TABS.PROFORMA:
        return searchedProforma;
      case TABS.RECEIPTS:
        return searchedReceipts;
      case TABS.PAYMENTS:
        return searchedPayments;
      case TABS.JOURNALS:
        return searchedJournals;
      default:
        return searchedAll;
    }
  }, [
    activeTab,
    searchedAll,
    searchedSales,
    searchedPurchases,
    searchedProforma,
    searchedReceipts,
    searchedPayments,
    searchedJournals,
  ]);

  const handleLoadMore = useCallback(() => {
    const currentData = getCurrentSearchedData();
    if (visibleCount < currentData.length) {
      setVisibleCount(prevCount => prevCount + 20); // Load 20 more items
    }
  }, [visibleCount, getCurrentSearchedData]);

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case TABS.ALL:
        return allVisibleTransactions;
      case TABS.SALES:
        return filteredSales;
      case TABS.PURCHASES:
        return filteredPurchases;
      case TABS.PROFORMA:
        return filteredProforma;
      case TABS.RECEIPTS:
        return filteredReceipts;
      case TABS.PAYMENTS:
        return filteredPayments;
      case TABS.JOURNALS:
        return filteredJournals;
      default:
        return allVisibleTransactions;
    }
  };

  // Handle PDF generation and download
  const handleDownloadInvoice = async transaction => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      setIsLoadingPdf(true);
      toast('Generating invoice PDF...', 'info');

      // Request permissions for Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to storage to download files',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          toast(
            'Permission denied',
            'error',
            'Cannot download without storage permission',
          );
          setIsLoadingPdf(false);
          return;
        }
      }

      // Generate PDF
      const response = await fetch(
        `${BASE_URL}/api/invoices/generate-pdf/${transaction._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error('Failed to generate PDF');

      // Create blob
      const blob = await response.blob();

      // Generate filename
      const fileName = `invoice_${
        transaction.invoiceNumber || transaction._id
      }_${new Date().getTime()}.pdf`;

      // Determine download directory
      const downloadDir =
        Platform.OS === 'ios'
          ? RNFS.DocumentDirectoryPath
          : RNFS.DownloadDirectoryPath;

      const filePath = `${downloadDir}/${fileName}`;

      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);

      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];

        try {
          await RNFS.writeFile(filePath, base64data, 'base64');

          // Set PDF URI for viewing
          const fileUri =
            Platform.OS === 'ios' ? `file://${filePath}` : `file://${filePath}`;

          setPdfUri(fileUri);

          toast('Invoice downloaded', 'success', `Saved to: ${fileName}`);

          // Show options for view/share
          Alert.alert(
            'Invoice Downloaded',
            'What would you like to do with the invoice?',
            [
              {
                text: 'View',
                onPress: () => setIsPdfViewOpen(true),
              },
              {
                text: 'Share',
                onPress: () => handleShareInvoice(filePath, fileName),
              },
              {
                text: 'Save Only',
                style: 'cancel',
              },
            ],
          );
        } catch (error) {
          console.error('File write error:', error);
          toast('File save failed', 'error', error.message);
        } finally {
          setIsLoadingPdf(false);
        }
      };

      reader.onerror = () => {
        setIsLoadingPdf(false);
        toast('File conversion failed', 'error');
      };
    } catch (error) {
      console.error('Download error:', error);
      toast(
        'Download failed',
        'error',
        error.message || 'Something went wrong',
      );
      setIsLoadingPdf(false);
    }
  };

  // Handle sharing invoice
  const handleShareInvoice = async (filePath, fileName) => {
    try {
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        toast('File not found', 'error');
        return;
      }

      // For iOS, we need to use a different URI format
      const shareUri =
        Platform.OS === 'ios' ? `file://${filePath}` : `file://${filePath}`;

      const shareOptions = {
        title: 'Share Invoice',
        message: 'Check out this invoice',
        url: shareUri,
        type: 'application/pdf',
        filename: fileName,
      };

      const result = await Share.share(shareOptions);

      if (result.action === Share.sharedAction) {
        toast('Invoice shared successfully', 'success');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast('Share failed', 'error', error.message);
    }
  };

  // Handle direct view PDF without download
  const handleViewInvoice = async transaction => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      setIsLoadingPdf(true);
      toast('Loading invoice...', 'info');

      // Generate PDF
      const response = await fetch(
        `${BASE_URL}/api/invoices/generate-pdf/${transaction._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error('Failed to generate PDF');

      // Create blob
      const blob = await response.blob();

      // Generate filename
      const fileName = `invoice_${
        transaction.invoiceNumber || transaction._id
      }_${new Date().getTime()}.pdf`;

      // Determine temporary directory
      const tempDir = RNFS.TemporaryDirectoryPath;
      const filePath = `${tempDir}/${fileName}`;

      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);

      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];

        try {
          await RNFS.writeFile(filePath, base64data, 'base64');

          // Set PDF URI for viewing
          const fileUri =
            Platform.OS === 'ios' ? `file://${filePath}` : `file://${filePath}`;

          setPdfUri(fileUri);
          setIsPdfViewOpen(true);
        } catch (error) {
          console.error('File write error:', error);
          toast('Failed to load PDF', 'error', error.message);
        } finally {
          setIsLoadingPdf(false);
        }
      };

      reader.onerror = () => {
        setIsLoadingPdf(false);
        toast('File conversion failed', 'error');
      };
    } catch (error) {
      console.error('View invoice error:', error);
      toast(
        'Failed to load invoice',
        'error',
        error.message || 'Something went wrong',
      );
      setIsLoadingPdf(false);
    }
  };

  // Combined invoice actions handler
  const handleInvoiceActions = transaction => {
    Alert.alert('Invoice Actions', 'Choose an action for this invoice', [
      {
        text: 'View Invoice',
        onPress: () => handleViewInvoice(transaction),
      },
      {
        text: 'Download & Save',
        onPress: () => handleDownloadInvoice(transaction),
      },
      {
        text: 'Share Invoice',
        onPress: () => {
          // For share, we need to download first
          handleDownloadInvoice(transaction);
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  // Event handlers
  const handleOpenForm = (transaction = null, type = null) => {
    setTransactionToEdit(transaction);
    setDefaultTransactionType(type);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = transaction => {
    setTransactionToDelete(transaction);
    setIsAlertOpen(true);
  };

  const handleOpenPreviewDialog = transaction => {
    // Navigate to the InvoicePreview screen so parent UI is removed
    const companyObj = companies.find(c => c._id === transaction.company?._id);
    const partyObj = parties.find(
      p => p._id === transaction?.party?._id || transaction?.party === p._id,
    );
    navigation.navigate('InvoicePreview', {
      transaction,
      company: companyObj || null,
      party: partyObj || null,
      // navigation params must be serializable — convert Map to plain object
      serviceNameById: serviceNameById
        ? Object.fromEntries(serviceNameById)
        : {},
    });
  };

  const handleViewItems = tx => {
    const prods = (tx.products || []).map(p => {
      const productName =
        productNameById.get(p.product) || p.product?.name || '(product)';
      const productId =
        typeof p.product === 'object' ? p.product._id : p.product;
      const productObj = productsList.find(prod => prod._id === productId);
      const hsnCode = productObj?.hsn || '';

      return {
        itemType: 'product',
        name: productName,
        quantity: p.quantity ?? '',
        unitType: p.unitType ?? '',
        pricePerUnit: p.pricePerUnit ?? '',
        description: '',
        amount: Number(p.amount) || 0,
        hsnCode,
        gstPercentage: p.gstPercentage,
        gstRate: p.gstPercentage,
        lineTax: p.lineTax,
      };
    });

    const svcArr = Array.isArray(tx.services)
      ? tx.services
      : Array.isArray(tx.service)
      ? tx.service
      : tx.services
      ? [tx.services]
      : [];

    const svcs = svcArr.map(s => {
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

      const serviceObj = servicesList.find(svc => svc._id === id);
      const sacCode = serviceObj?.sac || '';

      return {
        itemType: 'service',
        name,
        quantity: '',
        unitType: '',
        pricePerUnit: '',
        description: s.description || '',
        amount: Number(s.amount) || 0,
        sacCode,
        gstPercentage: s.gstPercentage,
        gstRate: s.gstPercentage,
        lineTax: s.lineTax,
      };
    });

    setItemsToView([...prods, ...svcs]);
    setIsItemsDialogOpen(true);
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const endpointMap = {
        sales: `/api/sales/${transactionToDelete._id}`,
        purchases: `/api/purchase/${transactionToDelete._id}`,
        receipt: `/api/receipts/${transactionToDelete._id}`,
        payment: `/api/payments/${transactionToDelete._id}`,
        journal: `/api/journals/${transactionToDelete._id}`,
        proforma: `/api/proforma/${transactionToDelete._id}`,
      };

      const endpoint = endpointMap[transactionToDelete.type];
      if (!endpoint)
        throw new Error(
          `Invalid transaction type: ${transactionToDelete.type}`,
        );

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete transaction.');
      }

      toast(
        'Transaction Deleted',
        'success',
        'Transaction has been successfully removed.',
      );
      fetchTransactions();
    } catch (error) {
      toast(
        'Deletion Failed',
        'error',
        error.message || 'Something went wrong.',
      );
    } finally {
      setIsAlertOpen(false);
      setTransactionToDelete(null);
    }
  };

  const handleSendInvoice = async tx => {
    console.log('🟢 handleSendInvoice called with tx:', tx?._id);
    try {
      if (tx.type !== 'sales' && tx.type !== 'proforma') {
        console.log('❌ Invalid transaction type:', tx.type);
        setEmailDialogTitle('❌ Cannot Send Email');
        setEmailDialogMessage(
          'Only sales and proforma transactions can be emailed as invoices.',
        );
        setIsEmailDialogOpen(true);
        return;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      console.log('📤 Checking Gmail status...');
      setIsSendingEmail(true);

      // Check Gmail connection status
      const statusRes = await fetch(
        `${BASE_URL}/api/integrations/gmail/status`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log('✅ Gmail status response:', statusRes.status);

      if (!statusRes.ok) {
        throw new Error('Could not check email status');
      }

      const emailStatus = await statusRes.json();
      console.log('📧 Gmail connected:', emailStatus.connected);

      if (!emailStatus.connected) {
        console.log('⚠️ Gmail not connected - showing settings dialog');
        setIsGmailNotConnected(true);
        setIsSendingEmail(false);
        return;
      }

      // Get party/customer info
      const pv = tx.party || tx.vendor;
      const partyId = pv?._id || null;

      console.log('👤 Party/Vendor info:', { partyId, pv });

      if (!partyId) {
        throw new Error('Customer details not found');
      }

      // Fetch complete party details
      console.log('🔍 Fetching party details for ID:', partyId);
      const partyRes = await fetch(`${BASE_URL}/api/parties/${partyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('✅ Party response:', partyRes.status);

      if (!partyRes.ok) {
        throw new Error('Failed to fetch customer details');
      }

      const partyToUse = await partyRes.json();

      console.log('👤 Party data:', {
        email: partyToUse?.email,
        name: partyToUse?.name,
      });

      if (!partyToUse?.email) {
        console.log('❌ Customer has no email');
        setEmailDialogTitle('❌ No Email Found');
        setEmailDialogMessage(
          "Customer doesn't have an email address on file.",
        );
        setIsEmailDialogOpen(true);
        setIsSendingEmail(false);
        return;
      }

      // Get company ID
      const companyId =
        typeof tx.company === 'object' ? tx.company._id : tx.company || '';

      console.log('🏢 Company ID:', companyId);

      if (!companyId) {
        throw new Error('Company not found');
      }

      // Fetch company details
      console.log('🔍 Fetching company details...');
      const companyRes = await fetch(`${BASE_URL}/api/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('✅ Company response:', companyRes.status);

      if (!companyRes.ok) {
        throw new Error('Failed to fetch company details');
      }

      const companyToUse = await companyRes.json();

      console.log('🏢 Company data:', {
        businessName: companyToUse?.businessName,
      });

      // Generate PDF using template1
      console.log('📄 Generating PDF...');
      const pdfResult = await generatePdfForTemplate1(
        tx,
        companyToUse || null,
        partyToUse,
        serviceNameById,
      );

      console.log('✅ PDF generated, extracting base64...');

      // Extract base64 from PDF result
      let base64Data = '';

      if (pdfResult.base64) {
        // Direct base64 from PDF generation
        base64Data = pdfResult.base64;
      } else if (pdfResult.filePath) {
        // If only file path is available, read it
        base64Data = await RNFS.readFile(pdfResult.filePath, 'base64');
      } else if (typeof pdfResult === 'string') {
        // If it's already a string path
        base64Data = await RNFS.readFile(pdfResult, 'base64');
      } else {
        throw new Error('Invalid PDF generation result');
      }

      if (!base64Data) {
        throw new Error('Failed to generate PDF base64 data');
      }

      console.log('✅ Base64 extracted, building email...');

      // Build email content
      const subject = `Invoice from ${
        companyToUse?.businessName || 'Your Company'
      }`;
      const bodyHtml = buildInvoiceEmailHTML({
        companyName: companyToUse?.businessName || 'Your Company',
        partyName: partyToUse?.name || 'Customer',
        supportEmail: companyToUse?.emailId || '',
        supportPhone: companyToUse?.mobileNumber || '',
        logoUrl: companyToUse?.logoUrl || '',
      });
      const fileName = `${
        tx.invoiceNumber || tx.referenceNumber || 'invoice'
      }.pdf`;

      console.log('📧 Sending email to:', partyToUse.email);

      // Send email API call
      const sendRes = await fetch(
        `${BASE_URL}/api/integrations/gmail/send-invoice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: partyToUse.email,
            subject,
            html: bodyHtml,
            fileName,
            pdfBase64: base64Data,
            companyId,
            sendAs: 'companyOwner',
          }),
        },
      );

      console.log('✅ Email API response:', sendRes.status);

      if (sendRes.ok) {
        console.log('🎉 Email sent successfully');
        setEmailDialogTitle('✅ Invoice Sent');
        setEmailDialogMessage(`Email sent successfully to ${partyToUse.email}`);
        setIsEmailDialogOpen(true);
      } else {
        const errorData = await sendRes.json().catch(() => ({}));
        console.log('❌ Email send failed:', errorData);
        throw new Error(errorData.message || 'Failed to send email');
      }
    } catch (e) {
      console.error('❌ FINAL Send invoice error:', e);
      console.error('Stack:', e?.stack);
      setEmailDialogTitle('❌ Send Failed');
      setEmailDialogMessage(e.message || 'Could not send invoice email.');
      setIsEmailDialogOpen(true);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Helper function to build invoice email HTML
  const buildInvoiceEmailHTML = ({
    companyName,
    partyName = 'Customer',
    supportEmail = '',
    supportPhone = '',
    logoUrl = '',
  }) => {
    const contactLine = supportEmail
      ? `for any queries, feel free to contact us at ${supportEmail}${
          supportPhone ? ` or ${supportPhone}` : ''
        }.`
      : `for any queries, feel free to contact us${
          supportPhone ? ` at ${supportPhone}` : ''
        }.`;

    return `<view style="background-color:#f5f7fb;padding:24px 12px;">
  <view style="background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;">
    <view style="background-color:#111827;color:#ffffff;padding:16px 24px;">
      <view style="display:flex;align-items:center;gap:12px;">
        ${
          logoUrl
            ? `<image source={{uri: "${logoUrl}"}} style="width:32;height:32;border-radius:6px;display:inline-block;" />`
            : ''
        }
        <text style="font-size:18px;font-weight:700;letter-spacing:0.3px;">${companyName}</text>
      </view>
    </view>

    <view style="padding:24px 24px 8px;">
      <text style="margin:0 0 12px 0;font-size:16px;color:#111827;">Dear ${partyName},</text>
      <text style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#374151;">
        Thank you for choosing ${companyName}. Please find attached the invoice for your recent purchase.
        We appreciate your business and look forward to serving you again.
      </text>

      <view style="margin:18px 0;padding:14px 16px;border:1px solid #e5e7eb;background-color:#f9fafb;border-radius:10px;font-size:14px;color:#111827;">
        <text>Your invoice is attached as a PDF.</text>
      </view>

      <text style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#374151;">
        ${contactLine}
      </text>

      <text style="margin:24px 0 0 0;font-size:14px;color:#111827;">
        Warm regards,
        ${companyName}
        ${supportEmail ? `${supportEmail}` : ''}
      </text>
    </view>

    <view style="background-color:#f9fafb;color:#6b7280;font-size:12px;text-align:center;padding:12px 24px;border-top:1px solid #e5e7eb;">
      <text>This is an automated message regarding your invoice. Please reply to the address above if you need help.</text>
    </view>
  </view>
</view>`;
  };

  const handleTabChange = tab => {
    setActiveTab(tab);
    setVisibleCount(20);
    setIsDropdownOpen(false);
  };

  const companyMap = useMemo(() => {
    const map = new Map();
    companies.forEach(company => {
      map.set(company._id, company.businessName);
    });
    return map;
  }, [companies]);

  // Updated columns configuration with invoice actions
  const tableColumns = useMemo(() => {
    const baseCols = columns({
      onViewItems: handleViewItems,
      onPreview: handleOpenPreviewDialog,
      onEdit: transaction => {
        if (transaction.type === 'proforma') {
          setIsProformaFormOpen(true);
          setTransactionToEdit(transaction);
        } else {
          handleOpenForm(transaction);
        }
      },
      onDelete: handleOpenDeleteDialog,
      onSendInvoice: handleSendInvoice,
      onDownloadInvoice: handleInvoiceActions,
      onViewInvoice: handleViewInvoice,
      companyMap: companyMap,
      serviceNameById: serviceNameById,
      userRole: role,
      onConvertToSales: transaction => {
        setTransactionToEdit(null);
        setDefaultTransactionType('sales');
        setIsFormOpen(true);
        setPrefillFromTransaction(transaction);
      },
      parties: parties,
    });

    // Remove company column if only one company
    if (companies.length <= 1) {
      return baseCols.filter(col => col.id !== 'company');
    }
    return baseCols;
  }, [companyMap, companies.length, serviceNameById, role]);

  // Provide a transaction manager object (stubs) so the bottom-of-file
  // render calls (action sheet, pdf viewer, dialogs) have a defined
  // object to call. `useColumns` returns columns + renderer stubs.
  const transactionManager = useColumns({
    onViewItems: handleViewItems,
    onPreview: handleOpenPreviewDialog,
    onEdit: transaction => {
      if (transaction.type === 'proforma') {
        setIsProformaFormOpen(true);
        setTransactionToEdit(transaction);
      } else {
        handleOpenForm(transaction);
      }
    },
    onDownloadInvoice: handleInvoiceActions,
    onDelete: handleOpenDeleteDialog,
    companyMap,
    serviceNameById,
    onSendInvoice: handleSendInvoice,
    userRole: role || undefined,
    onConvertToSales: transaction => {
      setTransactionToEdit(null);
      setDefaultTransactionType('sales');
      setIsFormOpen(true);
      setPrefillFromTransaction(transaction);
    },
    parties: parties,
  });

  // Tab icons
  const getTabIcon = tab => {
    switch (tab) {
      case TABS.SALES:
        return 'trending-up';
      case TABS.PURCHASES:
        return 'shopping-cart';
      case TABS.PROFORMA:
        return 'file-text';
      case TABS.RECEIPTS:
        return 'receipt';
      case TABS.PAYMENTS:
        return 'credit-card';
      case TABS.JOURNALS:
        return 'file-text';
      default:
        return 'list';
    }
  };

  // Render tab buttons
  const renderTabButton = (tab, label) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        key={tab}
        style={[styles.tabButton, isActive && styles.activeTabButton]}
        onPress={() => handleTabChange(tab)}
      >
        <Feather
          name={getTabIcon(tab)}
          size={16}
          color={isActive ? '#3b82f6' : '#6b7280'}
        />
        <Text style={[styles.tabText, isActive && styles.activeTabText]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render content based on loading state
  const renderContent = () => {
    const dataForTab = getCurrentData();
    const searchedDataForTab = getCurrentSearchedData();
    const displayData = searchedDataForTab.slice(0, visibleCount);

    if (isLoading && initialLoad) {
      return (
        <View style={styles.skeletonContainer}>
          <LoadingSkeleton isMobile={width <= 768} />
        </View>
      );
    }

    if (dataForTab.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="receipt" size={80} color="#d1d5db" />
          <Text style={styles.emptyText}>No transactions found</Text>
          <Text style={styles.emptySubtext}>
            Create your first transaction to get started
          </Text>
          {canCreateAny && (
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={() => handleOpenForm(null)}
            >
              <Icon name="add" size={20} color="white" />
              <Text style={styles.createFirstButtonText}>
                Create First Transaction
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.tableContainer}>
        <DataTable
          columns={tableColumns}
          data={displayData}
          filter={filter}
          onFilterChange={onFilterChange}
          totalResults={searchedDataForTab.length}
          onLoadMore={handleLoadMore}
          key={`${refreshTrigger}-${activeTab}`}
          refreshing={isLoading ? false : isRefreshing}
          onRefresh={onRefresh}
        />
      </View>
    );
  };

  // Handle refresh (also refresh permissions and companies)
  const onRefresh = useCallback(async () => {
    try {
      console.log('🔄 TransactionsScreen pull-to-refresh triggered...');
      await Promise.all([
        fetchTransactions(true),
        triggerCompaniesRefresh(), // Add company refresh
        refetchClientPermissions
          ? refetchClientPermissions()
          : Promise.resolve(),
        refetchUserPermissions ? refetchUserPermissions() : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    }
  }, [
    fetchTransactions,
    triggerCompaniesRefresh,
    refetchClientPermissions,
    refetchUserPermissions,
  ]);

  // Main render function for content
  const renderMainContent = () => {
    if (companies.length === 0 && !isLoading) {
      return (
        <View style={styles.companySetupContainer}>
          <ScrollView
            contentContainerStyle={styles.companySetupScrollContainer}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
              />
            }
          >
            <View style={styles.companySetupContent}>
              <View style={styles.iconContainer}>
                <Icon name="business" size={64} color="#3b82f6" />
              </View>

              <Text style={styles.companySetupTitle}>
                Company Setup Required
              </Text>
              <Text style={styles.companySetupDescription}>
                Contact us to enable your company account and access all
                features.
              </Text>

              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => Linking.openURL('tel:+918989773689')}
              >
                <Icon name="phone" size={20} color="white" />
                <Text style={styles.contactButtonText}>+91-8989773689</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.emailButton}
                onPress={() => Linking.openURL('mailto:support@company.com')}
              >
                <Icon name="email" size={20} color="#3b82f6" />
                <Text style={styles.emailButtonText}>Email Us</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      );
    }

    return (
      <>
        {/* Header (top safe area provided by global Header) */}
        <View style={[styles.header, styles.headerRow, styles.headerFixed]}>
          <View style={styles.titleContainer}>
            <Text
              style={[
                styles.title,
                { fontSize: largeTitleFontSize, flexShrink: 1 },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Transactions
            </Text>
            <Text
              style={[styles.subtitle, { fontSize: subtitleFontSize }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              A list of all financial activities for the selected company
            </Text>
          </View>

          {canCreateAny && (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.roleBadgeButton,
                  styles.actionButtonPrimary,
                ]}
                onPress={() => handleOpenForm(null)}
              >
                <Text
                  style={[styles.roleBadgeButtonText, styles.actionButtonText]}
                >
                  New Transaction
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.roleBadgeButton]}
                onPress={() => setIsProformaFormOpen(true)}
              >
                <Text
                  style={[styles.roleBadgeButtonText, styles.actionButtonText]}
                >
                  Proforma Invoice
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabs for large screens */}
        {width > 768 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tabContainer}>
              {renderTabButton(TABS.ALL, 'All')}
              {canSales && renderTabButton(TABS.SALES, 'Sales')}
              {canPurchases && renderTabButton(TABS.PURCHASES, 'Purchases')}
              {canSales && renderTabButton(TABS.PROFORMA, 'Proforma')}
              {canReceipt && renderTabButton(TABS.RECEIPTS, 'Receipts')}
              {canPayment && renderTabButton(TABS.PAYMENTS, 'Payments')}
              {canJournal && renderTabButton(TABS.JOURNALS, 'Journals')}
            </View>
          </ScrollView>
        )}

        {/* Mobile horizontal tabs with arrows */}
        {width <= 768 && (
          <View
            style={styles.mobileTabsWrapper}
            onLayout={e => setMobileContainerWidth(e.nativeEvent.layout.width)}
          >
            <ScrollView
              ref={mobileTabScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onScroll={e => setMobileScrollX(e.nativeEvent.contentOffset.x)}
              onContentSizeChange={(w, h) => setMobileContentWidth(w)}
              scrollEventThrottle={16}
              contentContainerStyle={[
                styles.mobileTabContainer,
                { paddingRight: showRightArrow ? 56 : 12 },
              ]}
            >
              {renderTabButton(TABS.ALL, 'All')}
              {canSales && renderTabButton(TABS.SALES, 'Sales')}
              {canPurchases && renderTabButton(TABS.PURCHASES, 'Purchases')}
              {canSales && renderTabButton(TABS.PROFORMA, 'Proforma')}
              {canReceipt && renderTabButton(TABS.RECEIPTS, 'Receipts')}
              {canPayment && renderTabButton(TABS.PAYMENTS, 'Payments')}
              {canJournal && renderTabButton(TABS.JOURNALS, 'Journals')}
            </ScrollView>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {allowedTypes.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.noAccessContainer}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  colors={['#3b82f6']}
                />
              }
            >
              <Icon name="block" size={48} color="#ef4444" />
              <Text style={styles.noAccessTitle}>No transaction access</Text>
              <Text style={styles.noAccessDescription}>
                You don't have permission to view transaction entries. Please
                contact your administrator.
              </Text>
            </ScrollView>
          ) : (
            renderContent()
          )}
        </View>
      </>
    );
  };

  return (
    <AppLayout>
      <View style={styles.container}>
        {/* 1. Jab tak initial loading hai, sirf Skeleton dikhao */}
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <LoadingSkeleton isMobile={width <= 768} />
          </View>
        ) : /* 2. Loading khatam hone ke baad check karo company hai ya nahi */
        companies.length === 0 ? (
          renderMainContent() // Yeh tabhi chalega jab sach mein 0 companies hongi
        ) : (
          <View style={styles.mainContainer}>{renderMainContent()}</View>
        )}

        {/* Modals */}
        {/* Transaction Form Modal */}
        <Modal
          visible={isFormOpen}
          animationType="slide"
          onRequestClose={() => {
            setIsFormOpen(false);
            setTransactionToEdit(null);
            setPrefillFromTransaction(null);
            setDefaultTransactionType(null);
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {transactionToEdit
                  ? 'Edit Transaction'
                  : 'Create a New Transaction'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsFormOpen(false);
                  setTransactionToEdit(null);
                  setPrefillFromTransaction(null);
                  setDefaultTransactionType(null);
                }}
              >
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <TransactionForm
                transactionToEdit={transactionToEdit}
                onFormSubmit={() => {
                  setIsFormOpen(false);
                  setTransactionToEdit(null);
                  setPrefillFromTransaction(null);
                  fetchTransactions();
                  setRefreshTrigger(prev => prev + 1);
                }}
                defaultType={
                  defaultTransactionType ||
                  tabToFormType(activeTab) ||
                  allowedTypes[0] ||
                  'sales'
                }
                serviceNameById={serviceNameById}
                prefillFrom={prefillFromTransaction}
              />
            </ScrollView>
          </View>
        </Modal>

        {/* Proforma Form Modal */}
        <Modal
          visible={isProformaFormOpen}
          animationType="slide"
          onRequestClose={() => {
            setIsProformaFormOpen(false);
            setTransactionToEdit(null);
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {transactionToEdit?.type === 'proforma'
                  ? 'Edit Proforma Invoice'
                  : 'Create Proforma Invoice'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsProformaFormOpen(false);
                  setTransactionToEdit(null);
                }}
              >
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <ProformaForm
                transactionToEdit={transactionToEdit}
                onFormSubmit={() => {
                  setIsProformaFormOpen(false);
                  setTransactionToEdit(null);
                  fetchTransactions();
                  setRefreshTrigger(prev => prev + 1);
                }}
                serviceNameById={serviceNameById}
              />
            </ScrollView>
          </View>
        </Modal>

        {/* Alert Dialog */}
        <Modal
          visible={isAlertOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsAlertOpen(false)}
        >
          <View style={styles.alertOverlay}>
            <View style={styles.alertDialog}>
              <Text style={styles.alertTitle}>Are you absolutely sure?</Text>
              <Text style={styles.alertDescription}>
                This action cannot be undone. This will permanently delete the
                transaction.
              </Text>

              <View style={styles.alertButtons}>
                <TouchableOpacity
                  style={[styles.alertButton, styles.cancelButton]}
                  onPress={() => setIsAlertOpen(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.alertButton, styles.deleteButton]}
                  onPress={handleDeleteTransaction}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Invoice preview now uses navigation; removed modal rendering here */}

        {/* PDF Viewer Modal */}
        <Modal
          visible={isPdfViewOpen}
          animationType="slide"
          onRequestClose={() => {
            setIsPdfViewOpen(false);
            setPdfUri(null);
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invoice PDF</Text>
              <View style={styles.pdfActions}>
                {pdfUri && (
                  <TouchableOpacity
                    style={styles.pdfActionButton}
                    onPress={() =>
                      handleShareInvoice(
                        pdfUri.replace('file://', ''),
                        'invoice.pdf',
                      )
                    }
                  >
                    <Icon name="share" size={20} color="#3b82f6" />
                    <Text style={styles.pdfActionText}>Share</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setIsPdfViewOpen(false);
                    setPdfUri(null);
                  }}
                >
                  <Icon name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.pdfContainer}>
              {isLoadingPdf ? (
                <View style={styles.pdfLoading}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.pdfLoadingText}>Loading PDF...</Text>
                </View>
              ) : pdfUri ? (
                <Pdf
                  source={{ uri: pdfUri, cache: true }}
                  onLoadComplete={(numberOfPages, filePath) => {
                    console.log(`Number of pages: ${numberOfPages}`);
                  }}
                  onPageChanged={(page, numberOfPages) => {
                    console.log(`Current page: ${page}`);
                  }}
                  onError={error => {
                    console.error('PDF Error:', error);
                    toast('Failed to load PDF', 'error');
                  }}
                  onPressLink={uri => {
                    console.log(`Link pressed: ${uri}`);
                  }}
                  style={styles.pdf}
                />
              ) : (
                <View style={styles.pdfError}>
                  <Icon name="error" size={48} color="#ef4444" />
                  <Text style={styles.pdfErrorText}>No PDF available</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Items Dialog Modal */}
        <Modal
          visible={isItemsDialogOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsItemsDialogOpen(false)}
        >
          <View style={styles.itemsDialogContainer}>
            <View style={styles.itemsDialog}>
              <View style={styles.itemsDialogHeader}>
                <Text style={styles.itemsDialogTitle}>Item Details</Text>
                <Text style={styles.itemsDialogDescription}>
                  A detailed list of all items in this transaction
                </Text>
                <TouchableOpacity
                  style={styles.closeItemsButton}
                  onPress={() => setIsItemsDialogOpen(false)}
                >
                  <Icon name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.itemsList}>
                {/* Summary Section */}
                {itemsToView.length > 0 && (
                  <View style={styles.summaryContainer}>
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryValue}>
                          {formatCurrency(
                            itemsToView.reduce(
                              (sum, item) => sum + Number(item.amount || 0),
                              0,
                            ),
                          )}
                        </Text>
                      </View>

                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Tax Total</Text>
                        <Text style={styles.summaryValue}>
                          {formatCurrency(
                            itemsToView.reduce((sum, item) => {
                              const lineTax = item.lineTax;
                              if (lineTax !== undefined && lineTax !== null) {
                                return sum + Number(lineTax);
                              }
                              const gstRate =
                                item.gstPercentage ||
                                item.gstRate ||
                                item.gst ||
                                0;
                              const taxableValue = item.amount || 0;
                              const taxAmount = (taxableValue * gstRate) / 100;
                              return sum + taxAmount;
                            }, 0),
                          )}
                        </Text>
                      </View>

                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Grand Total</Text>
                        <Text style={styles.grandTotal}>
                          {formatCurrency(
                            itemsToView.reduce(
                              (sum, item) => sum + Number(item.amount || 0),
                              0,
                            ) +
                              itemsToView.reduce((sum, item) => {
                                const lineTax = item.lineTax;
                                if (lineTax !== undefined && lineTax !== null) {
                                  return sum + Number(lineTax);
                                }
                                const gstRate =
                                  item.gstPercentage ||
                                  item.gstRate ||
                                  item.gst ||
                                  0;
                                const taxableValue = item.amount || 0;
                                const taxAmount =
                                  (taxableValue * gstRate) / 100;
                                return sum + taxAmount;
                              }, 0),
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Items List */}
                {itemsToView.map((item, index) => {
                  const isService = item.itemType === 'service';
                  const qty =
                    !isService && item.quantity
                      ? `${item.quantity} ${item.unitType || 'Piece'}`
                      : '—';
                  const rate = !isService
                    ? formatCurrency(Number(item.pricePerUnit || 0))
                    : '—';
                  const total = formatCurrency(Number(item.amount || 0));
                  const hsnSacCode = isService ? item.sacCode : item.hsnCode;

                  return (
                    <View key={index} style={styles.itemCard}>
                      {/* Item Header */}
                      <View style={styles.itemHeader}>
                        <Icon
                          name={isService ? 'dns' : 'inventory'}
                          size={20}
                          color="#6b7280"
                        />
                        <View style={styles.itemHeaderInfo}>
                          <Text style={styles.itemName}>
                            {item.name || '—'}
                          </Text>
                          <View style={styles.itemBadges}>
                            <View style={styles.itemTypeBadge}>
                              <Text style={styles.itemTypeText}>
                                {item.itemType || '—'}
                              </Text>
                            </View>
                            <Text style={styles.hsnSacText}>
                              HSN/SAC: {hsnSacCode || '—'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Service Description */}
                      {isService && item.description && (
                        <Text style={styles.itemDescription}>
                          {item.description}
                        </Text>
                      )}

                      {/* Item Details */}
                      <View style={styles.itemDetails}>
                        <View style={styles.detailColumn}>
                          <Text style={styles.detailLabel}>Quantity</Text>
                          <Text style={styles.detailValue}>{qty}</Text>
                        </View>

                        <View style={styles.detailColumn}>
                          <Text style={styles.detailLabel}>Price/Unit</Text>
                          <Text style={styles.detailValue}>{rate}</Text>
                        </View>

                        <View style={styles.totalContainer}>
                          <Text style={styles.totalLabel}>Total Amount</Text>
                          <Text style={styles.totalValue}>{total}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
        {/* Transaction manager modals (action sheet, PDF viewer, email dialogs, copy success) */}
        {transactionManager?.renderActionSheet &&
          transactionManager.renderActionSheet()}
        {transactionManager?.renderMailStatusDialog &&
          transactionManager.renderMailStatusDialog()}
        {transactionManager?.renderPdfViewer &&
          transactionManager.renderPdfViewer()}
        {transactionManager?.renderEmailNotConnectedDialog &&
          transactionManager.renderEmailNotConnectedDialog()}
        {transactionManager?.renderCopySuccess &&
          transactionManager.renderCopySuccess()}

        {/* Email Status Dialog */}
        <Modal
          visible={isEmailDialogOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsEmailDialogOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.emailDialogContainer}>
              <View style={styles.emailDialogContent}>
                <Text style={styles.emailDialogTitle}>{emailDialogTitle}</Text>
                <Text style={styles.emailDialogMessage}>
                  {emailDialogMessage}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.emailDialogButton}
                onPress={() => setIsEmailDialogOpen(false)}
              >
                <Text style={styles.emailDialogButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Gmail Not Connected Dialog */}
        <Modal
          visible={isGmailNotConnected}
          transparent
          animationType="fade"
          onRequestClose={() => setIsGmailNotConnected(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.gmailDialogContainer}>
              <View style={styles.gmailDialogHeader}>
                <Icon name="email" size={32} color="#ef4444" />
                <Text style={styles.gmailDialogTitle}>
                  Email Not Configured
                </Text>
              </View>

              <Text style={styles.gmailDialogMessage}>
                You need to connect your Gmail account to send invoices via
                email. Please go to Settings to configure it.
              </Text>

              <View style={styles.gmailDialogButtons}>
                <TouchableOpacity
                  style={[
                    styles.gmailDialogButton,
                    styles.gmailDialogButtonCancel,
                  ]}
                  onPress={() => setIsGmailNotConnected(false)}
                >
                  <Text style={styles.gmailDialogButtonCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gmailDialogButton,
                    styles.gmailDialogButtonPrimary,
                  ]}
                  onPress={() => {
                    setIsGmailNotConnected(false);
                    navigation.navigate('ProfileScreen', { tab: 'email' });
                  }}
                >
                  <Text style={styles.gmailDialogButtonPrimaryText}>
                    Go to Settings
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  mainContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  skeletonContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 20,
  },
  createFirstButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  header: {
    padding: 12,
    paddingBottom: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 18,
    gap: 4,
    borderWidth: 0,
    backgroundColor: 'transparent',
    minWidth: 56,
    justifyContent: 'center',
    height: 34,
    marginTop: 4,
  },
  actionButtonPrimary: {
    // even smaller primary width so title has more space
    minWidth: 68,
    height: 34,
    marginTop: 4,
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 14,
  },
  /* Role-badge style for buttons (match UserCard/Dashboard) */
  roleBadgeButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 18,
  },
  roleBadgeButtonText: {
    color: '#3b82f6',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  mobileTabsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  arrowButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(17,24,39,0.06)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  arrowPlaceholder: {
    width: 40,
  },
  arrowLeft: {
    position: 'absolute',
    left: 8,
    top: '50%',
    transform: [{ translateY: -12 }],
    zIndex: 20,
  },
  arrowRight: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -12 }],
    zIndex: 20,
  },
  mobileTabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingLeft: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  activeTabButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  dropdownContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    maxHeight: 300,
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  activeDropdownItem: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  activeDropdownItemText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    // padding: 16,
  },
  tableContainer: {
    flex: 1,
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 16,
  },
  noAccessTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  noAccessDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  pdfActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pdfActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  pdfActionText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  modalScroll: {
    flex: 1,
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  pdf: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  pdfLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  pdfError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfErrorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ef4444',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertDialog: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  alertDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  alertButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  alertButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  itemsDialogContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsDialog: {
    backgroundColor: 'white',
    borderRadius: 8,
    width: '95%',
    maxWidth: 600,
    maxHeight: '80%',
  },
  itemsDialogHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  itemsDialogTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  itemsDialogDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  closeItemsButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  itemsList: {
    maxHeight: 400,
  },
  summaryContainer: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  grandTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#059669',
  },
  itemCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  itemHeaderInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  itemBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTypeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  itemTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3b82f6',
  },
  hsnSacText: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailColumn: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  totalContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  companySetupContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  companySetupScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companySetupContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#eff6ff',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  companySetupTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  companySetupDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  contactButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  emailButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 16,
  },
  // Email Dialog Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailDialogContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  emailDialogContent: {
    marginBottom: 16,
  },
  emailDialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emailDialogMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  emailDialogButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  emailDialogButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  // Gmail Not Connected Dialog
  gmailDialogContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  gmailDialogHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  gmailDialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    textAlign: 'center',
  },
  gmailDialogMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  gmailDialogButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  gmailDialogButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  gmailDialogButtonCancel: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  gmailDialogButtonCancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  gmailDialogButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  gmailDialogButtonPrimaryText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default TransactionsScreen;
