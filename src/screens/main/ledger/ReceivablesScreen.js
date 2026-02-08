import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
  Alert,
  BackHandler,
  Modal,
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as XLSX from 'xlsx';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../../../config';
import { capitalizeWords } from '../../../lib/utils';
import { useCompany } from '../../../contexts/company-context';

import CustomerListCard from '../../../components/Ledger/receivables/CustomerListCard';
import MobileLedgerCard from '../../../components/Ledger/receivables/MobileLedgerCard';
import ItemDetailsDialog from '../../../components/Ledger/receivables/ItemDetailsDialog';


const { width } = Dimensions.get('window');

const SummaryCard = memo(({ icon, label, value, type, note }) => {
  const cardStyles = useMemo(() => {
    const baseStyle = [styles.summaryCard];
    switch (type) {
      case 'customer':
        return [...baseStyle, styles.customerCard];
      case 'credit':
        return [...baseStyle, styles.creditCard];
      case 'debit':
        return [...baseStyle, styles.debitCard];
      case 'balance':
        return [...baseStyle, styles.balanceCard];
      default:
        return baseStyle;
    }
  }, [type]);

  const valueStyles = useMemo(() => {
    const baseStyle = [styles.summaryValue];
    if (type === 'credit') return [...baseStyle, styles.creditValue];
    if (type === 'debit') return [...baseStyle, styles.debitValue];
    if (type === 'balance') {
      const isPositive = note?.includes('Customer Owes');
      return [...baseStyle, isPositive ? styles.positiveBalance : styles.negativeBalance];
    }
    return baseStyle;
  }, [type, note]);

  const iconColor = useMemo(() => {
    switch (type) {
      case 'customer': return '#DC2626';
      case 'credit': return '#16A34A';
      case 'debit': return '#2563EB';
      case 'balance': return '#EA580C';
      default: return '#6B7280';
    }
  }, [type]);

  return (
    <View style={cardStyles}>
      <View style={styles.summaryContent}>
        <View style={styles.summaryTextContainer}>
          <Text style={styles.summaryLabel}>{label}</Text>
          <Text style={valueStyles} numberOfLines={1}>
            {value}
          </Text>
          {note && <Text style={styles.balanceNote}>{note}</Text>}
        </View>
        <View style={[styles.summaryIconContainer, { backgroundColor: `${iconColor}15` }]}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
      </View>
    </View>
  );
});

SummaryCard.displayName = 'SummaryCard';

// Memoized Section Header Component
const SectionHeader = memo(({ type, subtitle }) => {
  const badgeStyle = type === 'debit' ? styles.debitBadge : styles.creditBadge;
  const iconName = type === 'debit' ? 'arrow-down' : 'arrow-up';
  const iconColor = type === 'debit' ? '#DC2626' : '#16A34A';
  const title = type === 'debit' ? 'Debit Side' : 'Credit Side';

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={badgeStyle}>
          <Icon name={iconName} size={16} color={iconColor} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
});

SectionHeader.displayName = 'SectionHeader';

// Memoized Empty State Component
const EmptyState = memo(({ message, submessage }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <Icon name="file-document-outline" size={64} color="#E5E7EB" />
    </View>
    <Text style={styles.emptyText}>{message}</Text>
    {submessage && <Text style={styles.emptySubtext}>{submessage}</Text>}
  </View>
));

EmptyState.displayName = 'EmptyState';

// Memoized No Data Component
const NoDataState = memo(({ message }) => (
  <View style={styles.noDataContainer}>
    <Icon name="inbox" size={32} color="#E5E7EB" />
    <Text style={styles.noDataText}>{message}</Text>
  </View>
));

NoDataState.displayName = 'NoDataState';

// Memoized Loading Component
const LoadingState = memo(({ message }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#3B82F6" />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
));

LoadingState.displayName = 'LoadingState';

const ReceivablesLedger = () => {
  const navigation = useNavigation();
  const { selectedCompanyId } = useCompany();

  // State variables
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [ledgerData, setLedgerData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: new Date(),
  });
  const [customerBalances, setCustomerBalances] = useState({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [overallTotals, setOverallTotals] = useState({
    totalDebit: 0,
    totalCredit: 0,
    overallBalance: 0,
  });
  const [loadingOverall, setLoadingOverall] = useState(false);
  const [isItemsDialogOpen, setIsItemsDialogOpen] = useState(false);
  const [itemsToView, setItemsToView] = useState([]);
  const [lastTransactionDates, setLastTransactionDates] = useState({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Modal state for customer selection
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  const companyIdForBalances = selectedCompanyId;
  const baseURL = BASE_URL;

  // Memoized format function
  const formatIndianNumber = useCallback((number) => {
    const num = typeof number === 'string' ? parseFloat(number) : number;
    if (isNaN(num)) return '0';
    const [integerPart, decimalPart] = num.toFixed(2).split('.');
    const lastThree = integerPart.slice(-3);
    const otherNumbers = integerPart.slice(0, -3);

    if (otherNumbers !== '') {
      const formattedInteger =
        otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
      return decimalPart
        ? `${formattedInteger}.${decimalPart}`
        : formattedInteger;
    }

    return decimalPart ? `${lastThree}.${decimalPart}` : lastThree;
  }, []);

  // Handle hardware back button and swipe gestures
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedParty) {
          setSelectedParty('');
          return true;
        }
        return false;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        if (selectedParty) {
          e.preventDefault();
          setSelectedParty('');
        }
      });

      return () => {
        backHandler.remove();
        unsubscribe();
      };
    }, [selectedParty, navigation])
  );

  // Calculate balances for all customers
  const calculateAllCustomerBalances = useCallback(async (partiesList, companyId) => {
    setLoadingBalances(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const params = new URLSearchParams();
      if (companyId && companyId !== "all") {
        params.append("companyId", companyId);
      }
      params.append("isDashboard", "true");

      const [salesRes, receiptRes] = await Promise.all([
        fetch(`${baseURL}/api/sales?${params.toString()}`, { 
          headers: { Authorization: `Bearer ${token}` } 
        }),
        fetch(`${baseURL}/api/receipts?${params.toString()}`, { 
          headers: { Authorization: `Bearer ${token}` } 
        }),
      ]);

      const salesData = await salesRes.json();
      const receiptData = await receiptRes.json();
      const allSales = salesData.data || [];
      const allReceipts = receiptData.data || [];

      const balances = {};
      const lastDates = {};

      const startDate = dateRange.startDate 
        ? new Date(new Date(dateRange.startDate).setHours(0, 0, 0, 0))
        : null;
      const endDate = dateRange.endDate 
        ? new Date(new Date(dateRange.endDate).setHours(23, 59, 59, 999))
        : null;

      partiesList.forEach((party) => {
        let totalCredit = 0;
        let totalDebit = 0;
        let latestDate = null;

        allSales.forEach((sale) => {
          if (String(sale.party?._id || sale.party) !== String(party._id)) return;
          
          const sDate = new Date(sale.date);
          if ((!startDate || sDate >= startDate) && (!endDate || sDate <= endDate)) {
            const amt = Number(sale.totalAmount || sale.invoiceTotal || 0);
            totalCredit += amt;
            if (sale.paymentMethod !== "Credit") totalDebit += amt;
            if (!latestDate || sDate > latestDate) latestDate = sDate;
          }
        });

        allReceipts.forEach((receipt) => {
          if (String(receipt.party?._id || receipt.party) !== String(party._id)) return;
          
          const rDate = new Date(receipt.date);
          if ((!startDate || rDate >= startDate) && (!endDate || rDate <= endDate)) {
            totalDebit += Number(receipt.amount || 0);
            if (!latestDate || rDate > latestDate) latestDate = rDate;
          }
        });

        balances[party._id] = totalCredit - totalDebit;
        lastDates[party._id] = latestDate;
      });

      setCustomerBalances(balances);
      setLastTransactionDates(lastDates);
    } catch (error) {
      console.error("Sync Error:", error);
    } finally {
      setLoadingBalances(false);
    }
  }, [baseURL, dateRange.startDate, dateRange.endDate]);

  // Calculate overall totals
  const calculateOverallTotals = useCallback(async () => {
    setLoadingOverall(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const params = new URLSearchParams();
      if (companyIdForBalances && companyIdForBalances !== "all") {
        params.append('companyId', companyIdForBalances);
      }
      params.append('isDashboard', 'true');

      const [salesResponse, receiptResponse] = await Promise.all([
        fetch(`${baseURL}/api/sales?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/receipts?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!salesResponse.ok || !receiptResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const salesData = await salesResponse.json();
      const receiptData = await receiptResponse.json();

      const allSales = salesData.data || salesData.sales || salesData.entries || [];
      const allReceipts = receiptData.data || receiptData.receipts || receiptData.entries || [];

      let totalCredit = 0;
      let totalDebit = 0;

      const startDate = dateRange.startDate
        ? new Date(new Date(dateRange.startDate).setHours(0, 0, 0, 0))
        : null;
      const endDate = dateRange.endDate
        ? new Date(new Date(dateRange.endDate).setHours(23, 59, 59, 999))
        : null;

      allSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const isInDateRange =
          (!startDate || saleDate >= startDate) &&
          (!endDate || saleDate <= endDate);

        if (isInDateRange) {
          const amount = sale.totalAmount || sale.amount || sale.invoiceTotal || 0;
          totalCredit += amount;
          const isCreditTransaction = sale.paymentMethod === 'Credit';
          if (!isCreditTransaction) {
            totalDebit += amount;
          }
        }
      });

      allReceipts.forEach(receipt => {
        const receiptDate = new Date(receipt.date);
        const isInDateRange =
          (!startDate || receiptDate >= startDate) &&
          (!endDate || receiptDate <= endDate);

        if (isInDateRange) {
          const amount = receipt.amount || 0;
          totalDebit += amount;
        }
      });

      const overallBalance = totalCredit - totalDebit;

      setOverallTotals({
        totalDebit,
        totalCredit,
        overallBalance,
      });
    } catch (error) {
      console.error('Error calculating overall totals:', error);
    } finally {
      setLoadingOverall(false);
    }
  }, [baseURL, companyIdForBalances, dateRange.startDate, dateRange.endDate]);

  // Fetch parties
  const fetchParties = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch(`${baseURL}/api/parties`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const partiesList = Array.isArray(data) ? data : data.parties || [];
        setParties(partiesList);

        calculateAllCustomerBalances(partiesList, companyIdForBalances);
        calculateOverallTotals();
      }
    } catch (error) {
      console.error('Error fetching parties:', error);
      Alert.alert('Error', 'Failed to fetch customers');
    }
  }, [baseURL, calculateAllCustomerBalances, calculateOverallTotals, companyIdForBalances]);

  // Fetch ledger data
  const fetchLedgerData = useCallback(async () => {
    if (!selectedParty) {
      setLedgerData([]);
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const params = new URLSearchParams();
      if (companyIdForBalances && companyIdForBalances !== "all") {
        params.append("companyId", companyIdForBalances);
      }
      params.append("isDashboard", "true");

      const [salesResponse, receiptResponse] = await Promise.all([
        fetch(`${baseURL}/api/sales?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/receipts?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const salesData = await salesResponse.json();
      const receiptData = await receiptResponse.json();

      const allSales = salesData.data || salesData.sales || salesData.entries || [];
      const allReceipts = receiptData.data || receiptData.receipts || receiptData.entries || [];

      const filteredSales = allSales.filter(sale => {
        const salePartyId = sale.party?._id || sale.party;
        const matchesParty = String(salePartyId) === String(selectedParty);
        const saleCompanyId =
          typeof sale.company === 'object'
            ? sale.company?._id || sale.company?.id
            : sale.company;
        const matchesCompany =
          !companyIdForBalances || saleCompanyId === companyIdForBalances;
        return matchesParty && matchesCompany;
      });

      const filteredReceipts = allReceipts.filter(receipt => {
        const receiptPartyId = receipt.party?._id || receipt.party;
        const matchesParty = String(receiptPartyId) === String(selectedParty);
        const receiptCompanyId =
          typeof receipt.company === 'object'
            ? receipt.company?._id || receipt.company?.id
            : receipt.company;
        const matchesCompany =
          !companyIdForBalances || receiptCompanyId === companyIdForBalances;
        return matchesParty && matchesCompany;
      });

      const ledgerEntries = [];

      const startDate = dateRange.startDate
        ? new Date(new Date(dateRange.startDate).setHours(0, 0, 0, 0))
        : null;
      const endDate = dateRange.endDate
        ? new Date(new Date(dateRange.endDate).setHours(23, 59, 59, 999))
        : null;

      filteredSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const isInDateRange =
          (!startDate || saleDate >= startDate) &&
          (!endDate || saleDate <= endDate);

        if (isInDateRange) {
          ledgerEntries.push({
            id: sale._id,
            date: sale.date,
            type: 'credit',
            transactionType: 'Sales',
            paymentMethod: sale.paymentMethod || 'Not Specified',
            amount: sale.totalAmount || sale.amount || sale.invoiceTotal || 0,
            referenceNumber: sale.invoiceNumber || sale.referenceNumber,
            description: sale.description,
          });

          const isCreditTransaction = sale.paymentMethod === 'Credit';
          if (!isCreditTransaction) {
            ledgerEntries.push({
              id: sale._id,
              date: sale.date,
              type: 'debit',
              transactionType: 'Sales Payment',
              paymentMethod: sale.paymentMethod || 'Not Specified',
              amount: sale.totalAmount || sale.amount || sale.invoiceTotal || 0,
              referenceNumber: sale.invoiceNumber || sale.referenceNumber,
              description: sale.description,
            });
          }
        }
      });

      filteredReceipts.forEach(receipt => {
        const receiptDate = new Date(receipt.date);
        const isInDateRange =
          (!startDate || receiptDate >= startDate) &&
          (!endDate || receiptDate <= endDate);

        if (isInDateRange) {
          ledgerEntries.push({
            id: receipt._id,
            date: receipt.date,
            type: 'debit',
            transactionType: 'Receipt',
            paymentMethod: receipt.paymentMethod || 'Not Specified',
            amount: receipt.amount || 0,
            referenceNumber: receipt.referenceNumber,
            description: receipt.description,
          });
        }
      });

      ledgerEntries.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      setLedgerData(ledgerEntries);
    } catch (error) {
      console.error('Error fetching ledger data:', error);
      Alert.alert('Error', 'Failed to fetch ledger data');
    } finally {
      setLoading(false);
    }
  }, [baseURL, companyIdForBalances, dateRange.startDate, dateRange.endDate, selectedParty]);

  // Handle viewing items for a transaction
  const handleViewItems = useCallback(async (entry) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      let endpoint = `${baseURL}/api/sales/${entry.id}`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const receiptsEndpoint = `${baseURL}/api/receipts/${entry.id}`;
        const receiptsResponse = await fetch(receiptsEndpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!receiptsResponse.ok) {
          throw new Error('Failed to fetch transaction details');
        }

        const transaction = await receiptsResponse.json();
        processTransactionData(transaction.receipt);
        return;
      }

      const transaction = await response.json();
      processTransactionData(transaction.entry);
    } catch (error) {
      console.error('Error fetching transaction items:', error);
      setItemsToView([]);
      setIsItemsDialogOpen(true);
    }
  }, [baseURL]);

  const processTransactionData = useCallback((transaction) => {
    const prods = (transaction.products || []).map(p => ({
      itemType: 'product',
      name: p.product?.name || p.product || '(product)',
      quantity: p.quantity ?? '',
      unitType: p.unitType ?? '',
      pricePerUnit: p.pricePerUnit ?? '',
      description: '',
      amount: Number(p.amount) || 0,
      hsnCode: p.hsn || p.product?.hsn || '',
      gstPercentage: p.gstPercentage,
      gstRate: p.gstPercentage,
      lineTax: p.lineTax,
    }));

    const svcArr = Array.isArray(transaction.services)
      ? transaction.services
      : Array.isArray(transaction.service)
      ? transaction.service
      : transaction.services
      ? [transaction.services]
      : [];

    const svcs = svcArr.map(s => ({
      itemType: 'service',
      name: s.service?.serviceName || s.service || '(service)',
      quantity: '',
      unitType: '',
      pricePerUnit: '',
      description: s.description || '',
      amount: Number(s.amount) || 0,
      sacCode: s.sac || s.service?.sac || '',
      gstPercentage: s.gstPercentage,
      gstRate: s.gstPercentage,
      lineTax: s.lineTax,
    }));

    const allItems = [...prods, ...svcs];
    setItemsToView(allItems);
    setIsItemsDialogOpen(true);
  }, []);

  // Calculate totals - memoized
  const totals = useMemo(() => {
    return ledgerData.reduce(
      (acc, entry) => {
        if (entry.type === 'debit') {
          acc.totalDebit += entry.amount;
        } else {
          acc.totalCredit += entry.amount;
        }
        return acc;
      },
      { totalDebit: 0, totalCredit: 0 },
    );
  }, [ledgerData]);

  // Filter customers in modal based on search
  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm) return parties;
    
    const lowerSearch = customerSearchTerm.toLowerCase();
    return parties.filter(party =>
      party.name.toLowerCase().includes(lowerSearch) ||
      party.contactNumber?.toLowerCase().includes(lowerSearch)
    );
  }, [parties, customerSearchTerm]);

  // Separate entries - memoized
  const { debitEntries, creditEntries } = useMemo(() => ({
    debitEntries: ledgerData.filter(entry => entry.type === 'debit'),
    creditEntries: ledgerData.filter(entry => entry.type === 'credit'),
  }), [ledgerData]);

  const balance = useMemo(() => totals.totalCredit - totals.totalDebit, [totals]);
  
  const selectedPartyData = useMemo(() => 
    parties.find(p => p._id === selectedParty),
    [parties, selectedParty]
  );

  // Pagination logic - memoized
  const sortedParties = useMemo(() => {
    return parties
      .filter(party => lastTransactionDates[party._id])
      .sort((a, b) => {
        const dateA = lastTransactionDates[a._id];
        const dateB = lastTransactionDates[b._id];
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.getTime() - dateA.getTime();
      });
  }, [parties, lastTransactionDates]);

  const totalItems = sortedParties.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const paginatedParties = useMemo(() => {
    return sortedParties.slice(startIndex, endIndex);
  }, [sortedParties, startIndex, endIndex]);

  const goToNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const goToPrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

// Export to CSV with proper Android permissions
const exportToExcel = useCallback(async () => {
  if (!selectedPartyData) {
    Alert.alert('Error', 'No customer selected');
    return;
  }

  if (ledgerData.length === 0) {
    Alert.alert('No Data', 'No transactions to export');
    return;
  }

  setLoading(true);
  try {
    console.log('Starting Excel export...');
    
    // Prepare headers
    const headers = [
      'Date',
      'Type',
      'Transaction Type',
      'Payment Method',
      'Amount (₹)',
      'Reference',
      'Description'
    ];

    // Prepare data rows
    const dataRows = ledgerData.map(entry => [
      format(new Date(entry.date), 'dd/MM/yyyy'),
      entry.type.toUpperCase(),
      entry.transactionType,
      entry.paymentMethod || '',
      `₹${formatIndianNumber(entry.amount)}`,
      entry.referenceNumber || '',
      entry.description || ''
    ]);

    // Add summary rows
    const summaryRows = [
      [],
      ['SUMMARY'],
      ['Total Transactions', ledgerData.length.toString()],
      ['Total Credit', `₹${formatIndianNumber(totals.totalCredit)}`],
      ['Total Debit', `₹${formatIndianNumber(totals.totalDebit)}`],
      ['Net Balance', `₹${formatIndianNumber(Math.abs(balance))} (${balance >= 0 ? 'Customer Owes' : 'You Owe'})`]
    ];

    // Combine all data
    const allData = [headers, ...dataRows, ...summaryRows];

    // Create worksheet from array of arrays
    const ws = XLSX.utils.aoa_to_sheet(allData);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 },  // Date
      { wch: 10 },  // Type
      { wch: 18 },  // Transaction Type
      { wch: 15 },  // Payment Method
      { wch: 15 },  // Amount
      { wch: 15 },  // Reference
      { wch: 30 }   // Description
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');

    // Generate filename
    const cleanName = selectedPartyData.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Ledger_${cleanName}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
    
    console.log('File name:', fileName);

    // Generate Excel file as base64
    const excelBuffer = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    // Determine file path based on platform
    let filePath;
    if (Platform.OS === 'android') {
      // Use Download folder for Android
      filePath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
    } else {
      // Use Document directory for iOS
      filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    }

    // Write file
    await RNFS.writeFile(filePath, excelBuffer, 'base64');
    console.log('File written successfully at:', filePath);

    // For Android, scan the file so it appears in file manager
    if (Platform.OS === 'android') {
      await RNFS.scanFile(filePath);
    }

    // Verify file was created
    const fileExists = await RNFS.exists(filePath);
    console.log('File exists after write:', fileExists);

    if (!fileExists) {
      throw new Error('File was not created');
    }

    // Show success alert with share option
    Alert.alert(
      'Export Successful! ✅',
      `Excel file has been saved as:\n${fileName}\n\nLocation: ${
        Platform.OS === 'android' ? 'Downloads folder' : 'Documents folder'
      }`,
      [
        { 
          text: 'OK', 
          style: 'default' 
        },
        { 
          text: 'Share File', 
          onPress: async () => {
            try {
              const Share = require('react-native-share').default;
              await Share.open({
                title: 'Share Ledger File',
                message: `Customer Ledger - ${selectedPartyData.name}`,
                url: Platform.OS === 'android' ? `file://${filePath}` : filePath,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                subject: `Ledger Export - ${selectedPartyData.name}`,
              });
            } catch (shareError) {
              console.log('Share error:', shareError);
              if (shareError.message !== 'User did not share') {
                Alert.alert('Info', 'File saved successfully in your Downloads folder.');
              }
            }
          }
        }
      ]
    );

  } catch (error) {
    console.error('Error exporting ledger:', error);
    Alert.alert(
      'Export Failed', 
      `Error: ${error.message || 'Unknown error occurred'}`,
      [{ text: 'OK' }]
    );
  } finally {
    setLoading(false);
  }
}, [balance, formatIndianNumber, ledgerData, selectedPartyData, totals.totalCredit, totals.totalDebit]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setDateRange({
      startDate: null,
      endDate: new Date(),
    });
  }, []);

  // Handle date picker
  const onStartDateChange = useCallback((event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setDateRange(prev => ({ ...prev, startDate: selectedDate }));
    }
  }, []);

  const onEndDateChange = useCallback((event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setDateRange(prev => ({ ...prev, endDate: selectedDate }));
    }
  }, []);

  const handlePartyChange = useCallback((value) => {
    setSelectedParty(value);
    setShowCustomerModal(false);
    setCustomerSearchTerm('');
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedParty('');
  }, []);

  const toggleStartDatePicker = useCallback(() => {
    setShowStartDatePicker(true);
  }, []);

  const toggleEndDatePicker = useCallback(() => {
    setShowEndDatePicker(true);
  }, []);

  // Auto-refresh when company changes
  useEffect(() => {
    if (parties.length > 0) {
      calculateAllCustomerBalances(parties, companyIdForBalances);
      calculateOverallTotals();
    }
  }, [companyIdForBalances]);

  // Refresh data when date range changes
  useEffect(() => {
    if (selectedParty) {
      const timer = setTimeout(() => {
        fetchLedgerData();
      }, 300);

      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        if (parties.length > 0) {
          calculateAllCustomerBalances(parties, companyIdForBalances);
          calculateOverallTotals();
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [dateRange.startDate, dateRange.endDate, companyIdForBalances, selectedParty]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [companyIdForBalances, dateRange.startDate, dateRange.endDate]);

  // Initialize data
  useEffect(() => {
    fetchParties();
  }, []);

  useEffect(() => {
    if (selectedParty) {
      fetchLedgerData();
    }
  }, [selectedParty]);

  // Render
  return (
    <View style={styles.container}>
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBadge}>
              <Icon name="book-open-variant" size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.title}>Customer Ledger</Text>
              <Text style={styles.subtitle}>Manage receivables</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.exportButton,
              (!selectedParty || ledgerData.length === 0) &&
                styles.disabledButton,
            ]}
            onPress={exportToExcel}
            disabled={!selectedParty || ledgerData.length === 0}
            activeOpacity={0.7}
          >
            <Icon name="download" size={18} color="white" />
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Back Button */}
        {selectedParty && (
          <View style={styles.backButtonContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToList}
              activeOpacity={0.7}
            >
              <View style={styles.backButtonContent}>
                <Icon name="arrow-left" size={20} color="#3B82F6" />
                <Text style={styles.backButtonText}>Back to Customers</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.currentCustomerBadge}>
              <Icon name="account-circle" size={16} color="#6B7280" />
              <Text style={styles.currentCustomer}>
                {selectedPartyData?.name}
              </Text>
            </View>
          </View>
        )}

        {/* Filters Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.filterIconContainer}>
                <Icon name="filter-variant" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.cardTitle}>Filters</Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            {/* Customer Selector */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                <Icon name="account-multiple" size={14} color="#6B7280" /> Customer
              </Text>
              <TouchableOpacity
                style={[
                  styles.filterInput,
                  selectedParty && styles.filterInputActive,
                ]}
                onPress={() => setShowCustomerModal(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterInputText,
                    !selectedParty && styles.filterInputPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selectedParty
                    ? parties.find(p => p._id === selectedParty)?.name || 'Select a customer...'
                    : 'All customers'}
                </Text>
                <Icon name="chevron-down" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Date Range */}
            <View style={styles.dateRangeContainer}>
              <View style={styles.dateInput}>
                <Text style={styles.label}>
                  <Icon name="calendar-start" size={14} color="#6B7280" /> From Date
                </Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={toggleStartDatePicker}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dateButtonText}>
                    {dateRange.startDate
                      ? format(dateRange.startDate, 'dd MMM yyyy')
                      : 'Select date'}
                  </Text>
                  <View style={styles.calendarIcon}>
                    <Icon name="calendar" size={18} color="#3B82F6" />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.dateInput}>
                <Text style={styles.label}>
                  <Icon name="calendar-end" size={14} color="#6B7280" /> To Date
                </Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={toggleEndDatePicker}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dateButtonText}>
                    {dateRange.endDate
                      ? format(dateRange.endDate, 'dd MMM yyyy')
                      : 'Select end date'}
                  </Text>
                  <View style={styles.calendarIcon}>
                    <Icon name="calendar" size={18} color="#3B82F6" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Clear Button */}
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={clearFilters}
              activeOpacity={0.7}
            >
              <Icon name="refresh" size={18} color="#6B7280" />
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={dateRange.startDate || new Date()}
            mode="date"
            display="default"
            onChange={onStartDateChange}
            maximumDate={new Date()}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={dateRange.endDate || new Date()}
            mode="date"
            display="default"
            onChange={onEndDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Customer Selection Modal */}
        <Modal
          visible={showCustomerModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCustomerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Customer</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setShowCustomerModal(false);
                    setCustomerSearchTerm('');
                  }}
                >
                  <Icon name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              {/* Search in Modal */}
              <View style={styles.modalSearchWrapper}>
                <Icon name="magnify" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search customers..." 
                  placeholderTextColor="#9CA3AF"
                  value={customerSearchTerm}
                  onChangeText={setCustomerSearchTerm}
                />
                {customerSearchTerm.length > 0 && (
                  <TouchableOpacity onPress={() => setCustomerSearchTerm('')}>
                    <Icon name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={filteredCustomers}
                keyExtractor={item => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedParty === item._id && styles.modalItemSelected,
                    ]}
                    onPress={() => handlePartyChange(item._id)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.modalItemContent}>
                      <Text
                        style={[
                          styles.modalItemText,
                          selectedParty === item._id && styles.modalItemTextSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      {item.contactNumber && (
                        <Text style={styles.modalItemSubtext}>
                          {item.contactNumber}
                        </Text>
                      )}
                    </View>
                    {selectedParty === item._id && (
                      <Icon name="check" size={20} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyModalList}>
                    <Icon name="account-off" size={48} color="#E5E7EB" />
                    <Text style={styles.emptyModalText}>No customers found</Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>

        {!selectedParty ? (
          <CustomerListCard
            parties={paginatedParties}
            customerBalances={customerBalances}
            loadingBalances={loadingBalances}
            setSelectedParty={handlePartyChange}
            formatIndianNumber={formatIndianNumber}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            goToNextPage={goToNextPage}
            goToPrevPage={goToPrevPage}
            capitalizeWords={capitalizeWords}
          />
        ) : (
          <>
            {/* Summary Cards */}
            {selectedPartyData && (
              <View style={styles.summaryGrid}>
                <SummaryCard
                  icon="account"
                  label="Customer"
                  value={selectedPartyData.name}
                  type="customer"
                />
                <SummaryCard
                  icon="cash-plus"
                  label="Total Credit"
                  value={`₹${formatIndianNumber(totals.totalCredit)}`}
                  type="credit"
                />
                <SummaryCard
                  icon="cash-minus"
                  label="Total Debit"
                  value={`₹${formatIndianNumber(totals.totalDebit)}`}
                  type="debit"
                />
                <SummaryCard
                  icon="scale-balance"
                  label="Balance"
                  value={`₹${formatIndianNumber(Math.abs(balance))}`}
                  type="balance"
                  note={balance >= 0 ? 'Customer Owes' : 'You Owe'}
                />
              </View>
            )}

            {/* Ledger Details */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.ledgerIconContainer}>
                    <Icon name="file-document" size={20} color="#3B82F6" />
                  </View>
                  <Text style={styles.cardTitle}>Ledger Details</Text>
                </View>
                <View style={styles.transactionCount}>
                  <Text style={styles.transactionCountText}>
                    {ledgerData.length} transactions
                  </Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                {loading ? (
                  <LoadingState message="Loading ledger data..." />
                ) : ledgerData.length === 0 ? (
                  <EmptyState 
                    message="No transactions found" 
                    submessage="Try adjusting your filters"
                  />
                ) : (
                  <View>
                    {/* Debit Section */}
                    <View style={styles.section}>
                      <SectionHeader type="debit" subtitle="Receipts" />
                      <View style={styles.sectionContent}>
                        {debitEntries.length === 0 ? (
                          <NoDataState message="No debit transactions" />
                        ) : (
                          debitEntries.map((entry, index) => (
                            <MobileLedgerCard
                              key={`debit-${entry.id}-${index}`}
                              entry={entry}
                              type="debit"
                              formatIndianNumber={formatIndianNumber}
                              format={format}
                            />
                          ))
                        )}
                      </View>
                    </View>

                    {/* Credit Section */}
                    <View style={[styles.section, styles.creditSection]}>
                      <SectionHeader type="credit" subtitle="Sales" />
                      <View style={styles.sectionContent}>
                        {creditEntries.length === 0 ? (
                          <NoDataState message="No credit transactions" />
                        ) : (
                          creditEntries.map((entry, index) => (
                            // <TouchableOpacity
                            //   key={`credit-${entry.id}-${index}`}
                            //   onPress={() => handleViewItems(entry)}
                            //   activeOpacity={0.7}
                            // >
                              <MobileLedgerCard
                                key={`credit-${entry.id}-${index}`}
                                entry={entry}
                                type="credit"
                                formatIndianNumber={formatIndianNumber}
                                format={format}
                                showViewDetails={true}
                                onViewDetails={() => handleViewItems(entry)}
                              />
                            // </TouchableOpacity>
                          ))
                        )}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Item Details Dialog */}
      <ItemDetailsDialog
        visible={isItemsDialogOpen}
        onDismiss={() => setIsItemsDialogOpen(false)}
        items={itemsToView}
        formatIndianNumber={formatIndianNumber}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    // marginTop: 2,
    fontWeight: '500',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  backButtonContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 6,
    marginTop: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  currentCustomerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  currentCustomer: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginLeft: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
    marginTop: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  ledgerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  transactionCount: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  transactionCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  cardContent: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
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
    paddingVertical: 13,
    minHeight: 48,
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
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    minHeight: 54,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  dateButtonText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  calendarIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  clearButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
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
  modalSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
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
  modalItemContent: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
    letterSpacing: -0.2,
  },
  modalItemTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  modalItemSubtext: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyModalList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyModalText: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 12,
    fontWeight: '500',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: (width - 56) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  customerCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  creditCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#16A34A',
  },
  debitCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  balanceCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#EA580C',
  },
  summaryContent: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
},
summaryTextContainer: {
  flex: 1,
  marginRight: 8,
},
  summaryIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 10,
      justifyContent: 'center',
  alignItems: 'center',
  },
 summaryLabel: {
  fontSize: 12,
  color: '#6B7280',
  marginBottom: 4,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},
summaryValue: {
  fontSize: 18,
  fontWeight: '700',
  color: '#111827',
  marginBottom: 2,
},
  creditValue: {
    color: '#16A34A',
  },
  debitValue: {
    color: '#DC2626',
  },
  positiveBalance: {
    color: '#16A34A',
  },
  negativeBalance: {
    color: '#DC2626',
  },
  balanceNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  creditSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#F3F4F6',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debitBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  creditBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  sectionContent: {
    gap: 12,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
    fontWeight: '500',
  },
});

export default ReceivablesLedger; 