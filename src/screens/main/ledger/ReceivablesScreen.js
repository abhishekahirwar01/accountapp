import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  Alert,
  BackHandler,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BASE_URL } from '../../../config';
import { capitalizeWords } from '../../../lib/utils';

// Custom Components
import CustomerListCard from '../../../components/Ledger/receivables/CustomerListCard';
import MobileLedgerCard from '../../../components/Ledger/receivables/MobileLedgerCard';
import ItemDetailsDialog from '../../../components/Ledger/receivables/ItemDetailsDialog';

const ReceivablesLedger = () => {
  const navigation = useNavigation();

  // State variables
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [ledgerData, setLedgerData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: new Date(),
  });
  const [searchTerm, setSearchTerm] = useState('');
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

  // Company context (simplified)
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  const companyIdForBalances = selectedCompanyId || null;
  const baseURL = BASE_URL;

  // Handle hardware back button and swipe gestures
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedParty) {
          // If viewing a specific customer, go back to customer list
          setSelectedParty('');
          return true; // Prevent default back behavior
        }
        // If on customer list, allow default back behavior (go to dashboard)
        return false;
      };

      // Add event listener for Android hardware back button
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      // Add listener for navigation back gesture (iOS swipe)
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        if (selectedParty) {
          // Prevent leaving the screen
          e.preventDefault();
          // Go back to customer list instead
          setSelectedParty('');
        }
      });

      return () => {
        backHandler.remove();
        unsubscribe();
      };
    }, [selectedParty, navigation])
  );

  // Format Indian Number
  const formatIndianNumber = number => {
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
  };

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

  // Calculate balances for all customers
  const calculateAllCustomerBalances = async (partiesList, companyId) => {
    setLoadingBalances(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      let url = `${baseURL}/api/parties/balances`;
      const params = new URLSearchParams();
      if (companyId) {
        params.append('companyId', companyId);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch balances');
      }

      const data = await response.json();
      const storedBalances = data.balances || {};

      const balances = {};
      for (const party of partiesList) {
        balances[party._id] = storedBalances[party._id] || 0;
      }

      setCustomerBalances(balances);

      // Calculate last transaction dates
      await calculateLastTransactionDates(partiesList, companyId);
    } catch (error) {
      console.error('Error fetching customer balances:', error);
      // Fallback to manual calculation
      calculateBalancesManually(partiesList, companyId);
    } finally {
      setLoadingBalances(false);
    }
  };

  // Calculate balances manually (fallback)
  const calculateBalancesManually = async (partiesList, companyId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const [salesResponse, receiptResponse] = await Promise.all([
        fetch(`${baseURL}/api/sales`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/receipts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const salesData = await salesResponse.json();
      const receiptData = await receiptResponse.json();

      const allSales =
        salesData.data || salesData.sales || salesData.entries || [];
      const allReceipts =
        receiptData.data || receiptData.receipts || receiptData.entries || [];

      const balances = {};

      for (const party of partiesList) {
        let totalCredit = 0;
        let totalDebit = 0;

        const partySales = allSales.filter(sale => {
          const salePartyId = sale.party?._id || sale.party;
          const matchesParty = String(salePartyId) === String(party._id);
          const saleCompanyId =
            typeof sale.company === 'object'
              ? sale.company?._id || sale.company?.id
              : sale.company;
          const matchesCompany = !companyId || saleCompanyId === companyId;
          return matchesParty && matchesCompany;
        });

        const partyReceipts = allReceipts.filter(receipt => {
          const receiptPartyId = receipt.party?._id || receipt.party;
          const matchesParty = String(receiptPartyId) === String(party._id);
          const receiptCompanyId =
            typeof receipt.company === 'object'
              ? receipt.company?._id || receipt.company?.id
              : receipt.company;
          const matchesCompany = !companyId || receiptCompanyId === companyId;
          return matchesParty && matchesCompany;
        });

        // Process sales
        partySales.forEach(sale => {
          const saleDate = new Date(sale.date);
          const startDate = dateRange.startDate
            ? new Date(dateRange.startDate.getTime())
            : null;
          const endDate = dateRange.endDate
            ? new Date(dateRange.endDate.getTime())
            : null;

          if (startDate) startDate.setHours(0, 0, 0, 0);
          if (endDate) endDate.setHours(23, 59, 59, 999);

          const isInDateRange =
            (!startDate || saleDate >= startDate) &&
            (!endDate || saleDate <= endDate);

          if (isInDateRange) {
            const amount =
              sale.totalAmount || sale.amount || sale.invoiceTotal || 0;
            const isCreditTransaction = sale.paymentMethod === 'Credit';

            totalCredit += amount;

            if (!isCreditTransaction) {
              totalDebit += amount;
            }
          }
        });

        // Process receipts
        partyReceipts.forEach(receipt => {
          const receiptDate = new Date(receipt.date);
          const startDate = dateRange.startDate
            ? new Date(dateRange.startDate.getTime())
            : null;
          const endDate = dateRange.endDate
            ? new Date(dateRange.endDate.getTime())
            : null;

          if (startDate) startDate.setHours(0, 0, 0, 0);
          if (endDate) endDate.setHours(23, 59, 59, 999);

          const isInDateRange =
            (!startDate || receiptDate >= startDate) &&
            (!endDate || receiptDate <= endDate);

          if (isInDateRange) {
            totalDebit += receipt.amount || 0;
          }
        });

        balances[party._id] = totalCredit - totalDebit;
      }

      setCustomerBalances(balances);
    } catch (error) {
      console.error('Error calculating balances manually:', error);
    }
  };

  // Calculate last transaction dates
  const calculateLastTransactionDates = async (partiesList, companyId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const [salesResponse, receiptResponse] = await Promise.all([
        fetch(`${baseURL}/api/sales`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/receipts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const salesData = await salesResponse.json();
      const receiptData = await receiptResponse.json();

      const allSales =
        salesData.data || salesData.sales || salesData.entries || [];
      const allReceipts =
        receiptData.data || receiptData.receipts || receiptData.entries || [];

      const lastDates = {};

      for (const party of partiesList) {
        let latestDate = null;

        // Check sales
        const partySales = allSales.filter(sale => {
          const salePartyId = sale.party?._id || sale.party;
          const matchesParty = String(salePartyId) === String(party._id);
          const saleCompanyId =
            typeof sale.company === 'object'
              ? sale.company?._id || sale.company?.id
              : sale.company;
          const matchesCompany = !companyId || saleCompanyId === companyId;
          return matchesParty && matchesCompany;
        });

        partySales.forEach(sale => {
          const saleDate = new Date(sale.date);
          if (!latestDate || saleDate > latestDate) {
            latestDate = saleDate;
          }
        });

        // Check receipts
        const partyReceipts = allReceipts.filter(receipt => {
          const receiptPartyId = receipt.party?._id || receipt.party;
          const matchesParty = String(receiptPartyId) === String(party._id);
          const receiptCompanyId =
            typeof receipt.company === 'object'
              ? receipt.company?._id || receipt.company?.id
              : receipt.company;
          const matchesCompany = !companyId || receiptCompanyId === companyId;
          return matchesParty && matchesCompany;
        });

        partyReceipts.forEach(receipt => {
          const receiptDate = new Date(receipt.date);
          if (!latestDate || receiptDate > latestDate) {
            latestDate = receiptDate;
          }
        });

        lastDates[party._id] = latestDate;
      }

      setLastTransactionDates(lastDates);
    } catch (error) {
      console.error('Error calculating last transaction dates:', error);
    }
  };

  // Calculate overall totals
  const calculateOverallTotals = async () => {
    setLoadingOverall(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const salesParams = new URLSearchParams();
      const receiptsParams = new URLSearchParams();

      if (companyIdForBalances) {
        salesParams.append('company', companyIdForBalances);
        receiptsParams.append('company', companyIdForBalances);
      }

      const [salesResponse, receiptResponse] = await Promise.all([
        fetch(`${baseURL}/api/sales?${salesParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/receipts?${receiptsParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!salesResponse.ok || !receiptResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const salesData = await salesResponse.json();
      const receiptData = await receiptResponse.json();

      const allSales =
        salesData.data || salesData.sales || salesData.entries || [];
      const allReceipts =
        receiptData.data || receiptData.receipts || receiptData.entries || [];

      let totalCredit = 0;
      let totalDebit = 0;

      // Process sales
      allSales.forEach(sale => {
        const saleCompanyId =
          typeof sale.company === 'object'
            ? sale.company?._id || sale.company?.id
            : sale.company;
        const matchesCompany =
          !companyIdForBalances || saleCompanyId === companyIdForBalances;

        if (!matchesCompany) return;

        const saleDate = new Date(sale.date);
        const startDate = dateRange.startDate
          ? new Date(dateRange.startDate.getTime())
          : null;
        const endDate = dateRange.endDate
          ? new Date(dateRange.endDate.getTime())
          : null;

        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

        const isInDateRange =
          (!startDate || saleDate >= startDate) &&
          (!endDate || saleDate <= endDate);

        if (isInDateRange) {
          const amount =
            sale.totalAmount || sale.amount || sale.invoiceTotal || 0;
          totalCredit += amount;

          const isCreditTransaction = sale.paymentMethod === 'Credit';
          if (!isCreditTransaction) {
            totalDebit += amount;
          }
        }
      });

      // Process receipts
      allReceipts.forEach(receipt => {
        const receiptCompanyId =
          typeof receipt.company === 'object'
            ? receipt.company?._id || receipt.company?.id
            : receipt.company;
        const matchesCompany =
          !companyIdForBalances || receiptCompanyId === companyIdForBalances;

        if (!matchesCompany) return;

        const receiptDate = new Date(receipt.date);
        const startDate = dateRange.startDate
          ? new Date(dateRange.startDate.getTime())
          : null;
        const endDate = dateRange.endDate
          ? new Date(dateRange.endDate.getTime())
          : null;

        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

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
      calculateOverallTotalsFallback();
    } finally {
      setLoadingOverall(false);
    }
  };

  // Fallback for overall totals
  const calculateOverallTotalsFallback = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const [salesResponse, receiptResponse] = await Promise.all([
        fetch(`${baseURL}/api/sales`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/receipts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const salesData = await salesResponse.json();
      const receiptData = await receiptResponse.json();

      const allSales =
        salesData.data || salesData.sales || salesData.entries || [];
      const allReceipts =
        receiptData.data || receiptData.receipts || receiptData.entries || [];

      let totalCredit = 0;
      let totalDebit = 0;

      // Process sales
      allSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const startDate = dateRange.startDate
          ? new Date(dateRange.startDate.getTime())
          : null;
        const endDate = dateRange.endDate
          ? new Date(dateRange.endDate.getTime())
          : null;

        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

        const isInDateRange =
          (!startDate || saleDate >= startDate) &&
          (!endDate || saleDate <= endDate);

        const saleCompanyId =
          typeof sale.company === 'object'
            ? sale.company?._id || sale.company?.id
            : sale.company;
        const matchesCompany =
          !companyIdForBalances || saleCompanyId === companyIdForBalances;

        if (isInDateRange && matchesCompany) {
          const amount =
            sale.totalAmount || sale.amount || sale.invoiceTotal || 0;
          totalCredit += amount;

          const isCreditTransaction = sale.paymentMethod === 'Credit';
          if (!isCreditTransaction) {
            totalDebit += amount;
          }
        }
      });

      // Process receipts
      allReceipts.forEach(receipt => {
        const receiptDate = new Date(receipt.date);
        const startDate = dateRange.startDate
          ? new Date(dateRange.startDate.getTime())
          : null;
        const endDate = dateRange.endDate
          ? new Date(dateRange.endDate.getTime())
          : null;

        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

        const isInDateRange =
          (!startDate || receiptDate >= startDate) &&
          (!endDate || receiptDate <= endDate);

        const receiptCompanyId =
          typeof receipt.company === 'object'
            ? receipt.company?._id || receipt.company?.id
            : receipt.company;
        const matchesCompany =
          !companyIdForBalances || receiptCompanyId === companyIdForBalances;

        if (isInDateRange && matchesCompany) {
          totalDebit += receipt.amount || 0;
        }
      });

      const overallBalance = totalCredit - totalDebit;

      setOverallTotals({
        totalDebit,
        totalCredit,
        overallBalance,
      });
    } catch (error) {
      console.error('Error in fallback calculation:', error);
    }
  };

  // Fetch parties
  const fetchParties = async () => {
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
  };

  // Fetch ledger data
  const fetchLedgerData = async () => {
    if (!selectedParty) {
      setLedgerData([]);
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const [salesResponse, receiptResponse] = await Promise.all([
        fetch(`${baseURL}/api/sales`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${baseURL}/api/receipts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const salesData = await salesResponse.json();
      const receiptData = await receiptResponse.json();

      const allSales =
        salesData.data || salesData.sales || salesData.entries || [];
      const allReceipts =
        receiptData.data || receiptData.receipts || receiptData.entries || [];

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

      // Process sales
      filteredSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const startDate = dateRange.startDate
          ? new Date(dateRange.startDate.getTime())
          : null;
        const endDate = dateRange.endDate
          ? new Date(dateRange.endDate.getTime())
          : null;

        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

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

      // Process receipts
      filteredReceipts.forEach(receipt => {
        const receiptDate = new Date(receipt.date);
        const startDate = dateRange.startDate
          ? new Date(dateRange.startDate.getTime())
          : null;
        const endDate = dateRange.endDate
          ? new Date(dateRange.endDate.getTime())
          : null;

        if (startDate) startDate.setHours(0, 0, 0, 0);
        if (endDate) endDate.setHours(23, 59, 59, 999);

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

      // Sort by date (newest first)
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
  };

  // Handle viewing items for a transaction
  const handleViewItems = async entry => {
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
  };

  const processTransactionData = transaction => {
    const prods = (transaction.products || []).map(p => {
      return {
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
      };
    });

    const svcArr = Array.isArray(transaction.services)
      ? transaction.services
      : Array.isArray(transaction.service)
      ? transaction.service
      : transaction.services
      ? [transaction.services]
      : [];

    const svcs = svcArr.map(s => {
      return {
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
      };
    });

    const allItems = [...prods, ...svcs];
    setItemsToView(allItems);
    setIsItemsDialogOpen(true);
  };

  // Calculate totals
  const calculateTotals = () => {
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
  };

  // Filter ledger data
  const filteredLedgerData = ledgerData.filter(
    entry =>
      entry.transactionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const debitEntries = filteredLedgerData.filter(
    entry => entry.type === 'debit',
  );
  const creditEntries = filteredLedgerData.filter(
    entry => entry.type === 'credit',
  );

  const totals = calculateTotals();
  const balance = totals.totalCredit - totals.totalDebit;
  const selectedPartyData = parties.find(p => p._id === selectedParty);

  // Pagination logic
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

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [companyIdForBalances, dateRange.startDate, dateRange.endDate]);

  // Export to CSV (simplified for React Native)
  const exportToCSV = async () => {
    if (!selectedPartyData) return;

    setLoading(true);
    try {
      // Create CSV content
      let csvContent =
        'Date,Type,Transaction Type,Payment Method,Amount (₹),Reference,Description\n';

      ledgerData.forEach(entry => {
        csvContent += `${format(new Date(entry.date), 'dd/MM/yyyy')},`;
        csvContent += `${entry.type.toUpperCase()},`;
        csvContent += `${entry.transactionType},`;
        csvContent += `${entry.paymentMethod || ''},`;
        csvContent += `₹${formatIndianNumber(entry.amount)},`;
        csvContent += `${entry.referenceNumber || ''},`;
        csvContent += `${entry.description || ''}\n`;
      });

      // Add totals
      csvContent += '\n';
      csvContent += 'SUMMARY\n';
      csvContent += `Total Transactions,${ledgerData.length}\n`;
      csvContent += `Total Credit,₹${formatIndianNumber(totals.totalCredit)}\n`;
      csvContent += `Total Debit,₹${formatIndianNumber(totals.totalDebit)}\n`;
      csvContent += `Net Balance,₹${formatIndianNumber(Math.abs(balance))} (${
        balance >= 0 ? 'Customer Owes' : 'You Owe'
      })\n`;

      // Save file (React Native implementation would need additional libraries)
      Alert.alert(
        'Export CSV',
        'CSV content has been generated. In a real app, you would save this to a file.',
        [{ text: 'OK' }],
      );
    } catch (error) {
      console.error('Error exporting ledger:', error);
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setDateRange({
      startDate: null,
      endDate: new Date(),
    });
    setSearchTerm('');
  };

  // Handle date picker
  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setDateRange(prev => ({ ...prev, startDate: selectedDate }));
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setDateRange(prev => ({ ...prev, endDate: selectedDate }));
    }
  };

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
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Customer Ledger</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[
              styles.exportButton,
              (!selectedParty || ledgerData.length === 0) &&
                styles.disabledButton,
            ]}
            onPress={exportToCSV}
            disabled={!selectedParty || ledgerData.length === 0}
          >
            <Icon name="download" size={20} color="white" />
            <Text style={styles.exportButtonText}> Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Back to List Button */}
      {selectedParty && (
        <View style={styles.backButtonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedParty('')}
          >
            <Icon name="arrow-left" size={20} color="#3b82f6" />
            <Text style={styles.backButtonText}>Back to Customer List</Text>
          </TouchableOpacity>
          <Text style={styles.currentCustomer}>
            Currently viewing:{' '}
            <Text style={styles.customerName}>{selectedPartyData?.name}</Text>
          </Text>
        </View>
      )}

      {/* Filters Card */}
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Filters</Text>

          {/* Customer Selector */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Select Customer</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedParty}
                onValueChange={setSelectedParty}
                style={styles.picker}
              >
                <Picker.Item label="Select a customer..." value="" />
                {parties.map(party => (
                  <Picker.Item
                    key={party._id}
                    label={`${party.name}${
                      party.contactNumber ? ` (${party.contactNumber})` : ''
                    }`}
                    value={party._id}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Date Range */}
          <View style={styles.dateRangeContainer}>
            <View style={styles.dateInput}>
              <Text style={styles.label}>From Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {dateRange.startDate
                    ? format(dateRange.startDate, 'dd/MM/yyyy')
                    : 'Select date'}
                </Text>
                <Icon name="calendar" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateInput}>
              <Text style={styles.label}>To Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {dateRange.endDate
                    ? format(dateRange.endDate, 'dd/MM/yyyy')
                    : 'Select end date'}
                </Text>
                <Icon name="calendar" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Search</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          {/* Clear Filters Button */}
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
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
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={dateRange.endDate || new Date()}
          mode="date"
          display="default"
          onChange={onEndDateChange}
        />
      )}

      {!selectedParty ? (
        <CustomerListCard
          parties={paginatedParties}
          customerBalances={customerBalances}
          loadingBalances={loadingBalances}
          setSelectedParty={setSelectedParty}
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
          {/* Customer Summary Cards */}
          {selectedPartyData && (
            <View style={styles.summaryGrid}>
              {/* Customer Card */}
              <View
                style={[styles.summaryCard, { borderLeftColor: '#dc2626' }]}
              >
                <View style={styles.summaryContent}>
                  <View style={styles.summaryHeader}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: '#fee2e2' },
                      ]}
                    >
                      <Icon name="account" size={20} color="#dc2626" />
                    </View>
                    <Text style={styles.summaryLabel}>Customer</Text>
                  </View>
                  <Text style={styles.summaryValue}>
                    {selectedPartyData.name}
                  </Text>
                </View>
              </View>

              {/* Total Credit Card */}
              <View
                style={[styles.summaryCard, { borderLeftColor: '#16a34a' }]}
              >
                <View style={styles.summaryContent}>
                  <View style={styles.summaryHeader}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: '#dcfce7' },
                      ]}
                    >
                      <Icon name="cash-plus" size={20} color="#16a34a" />
                    </View>
                    <Text style={styles.summaryLabel}>Total Credit</Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: '#16a34a' }]}>
                    ₹{formatIndianNumber(totals.totalCredit)}
                  </Text>
                </View>
              </View>

              {/* Total Debit Card */}
              <View
                style={[styles.summaryCard, { borderLeftColor: '#2563eb' }]}
              >
                <View style={styles.summaryContent}>
                  <View style={styles.summaryHeader}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: '#dbeafe' },
                      ]}
                    >
                      <Icon name="cash-minus" size={20} color="#2563eb" />
                    </View>
                    <Text style={styles.summaryLabel}>Total Debit</Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: '#dc2626' }]}>
                    ₹{formatIndianNumber(totals.totalDebit)}
                  </Text>
                </View>
              </View>

              {/* Balance Card */}
              <View
                style={[styles.summaryCard, { borderLeftColor: '#ea580c' }]}
              >
                <View style={styles.summaryContent}>
                  <View style={styles.summaryHeader}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: '#ffedd5' },
                      ]}
                    >
                      <Icon name="scale-balance" size={20} color="#ea580c" />
                    </View>
                    <Text style={styles.summaryLabel}>Balance</Text>
                  </View>
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: balance >= 0 ? '#16a34a' : '#dc2626' },
                    ]}
                  >
                    ₹{formatIndianNumber(Math.abs(balance))}
                  </Text>
                  <Text style={styles.balanceNote}>
                    {balance >= 0 ? '(Customer Owes)' : '(You Owe)'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Ledger Details */}
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Ledger Details</Text>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>Loading ledger data...</Text>
                </View>
              ) : filteredLedgerData.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon
                    name="file-document-outline"
                    size={48}
                    color="#9ca3af"
                  />
                  <Text style={styles.emptyText}>No transactions found</Text>
                </View>
              ) : (
                <ScrollView >
                  <View>
                    {/* Debit Side Header */}
                    <View
                      style={[
                        styles.tableHeader,
                        { backgroundColor: '#fef2f2' },
                      ]}
                    >
                      <Text style={[styles.headerText, { color: '#dc2626' }]}>
                        DEBIT SIDE (Receipts)
                      </Text>
                    </View>

                    {/* Debit Transactions */}
                    <ScrollView style={styles.sectionContainer}>
                      {debitEntries.length === 0 ? (
                        <View style={styles.noDataContainer}>
                          <Text style={styles.noDataText}>
                            No debit transactions
                          </Text>
                        </View>
                      ) : (
                        debitEntries.map((entry, index) => (
                          <MobileLedgerCard
                            key={`debit-${index}`}
                            entry={entry}
                            type="debit"
                            formatIndianNumber={formatIndianNumber}
                            format={format}
                          />
                        ))
                      )}
                    </ScrollView>

                    {/* Credit Side Header */}
                    <View
                      style={[
                        styles.tableHeader,
                        { backgroundColor: '#f0fdf4' },
                      ]}
                    >
                      <Text style={[styles.headerText, { color: '#16a34a' }]}>
                        CREDIT SIDE (Sales)
                      </Text>
                    </View>

                    {/* Credit Transactions */}
                    <ScrollView style={styles.sectionContainer}>
                      {creditEntries.length === 0 ? (
                        <View style={styles.noDataContainer}>
                          <Text style={styles.noDataText}>
                            No credit transactions
                          </Text>
                        </View>
                      ) : (
                        creditEntries.map((entry, index) => (
                          <TouchableOpacity
                            key={`credit-${index}`}
                            onPress={() => handleViewItems(entry)}
                          >
                            <MobileLedgerCard
                              entry={entry}
                              type="credit"
                              formatIndianNumber={formatIndianNumber}
                              format={format}
                              showViewDetails={true}
                            />
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>

                    {/* Totals Row */}
                    <View style={styles.totalsRow}>
                      <View style={styles.totalItem}>
                        <Text style={styles.totalLabel}>Total Debit:</Text>
                        <Text style={[styles.totalValue, { color: '#dc2626' }]}>
                          ₹{formatIndianNumber(totals.totalDebit)}
                        </Text>
                      </View>
                      <View style={styles.totalItem}>
                        <Text style={styles.totalLabel}>Total Credit:</Text>
                        <Text style={[styles.totalValue, { color: '#16a34a' }]}>
                          ₹{formatIndianNumber(totals.totalCredit)}
                        </Text>
                      </View>
                    </View>

                    {/* Balance Row */}
                    <View
                      style={[
                        styles.balanceRow,
                        { backgroundColor: '#e0f2fe' },
                      ]}
                    >
                      <Text style={styles.balanceLabel}>Balance:</Text>
                      <Text
                        style={[
                          styles.balanceValue,
                          { color: balance >= 0 ? '#16a34a' : '#dc2626' },
                        ]}
                      >
                        ₹{formatIndianNumber(Math.abs(balance))}{' '}
                        {balance >= 0 ? '(Customer Owes)' : '(You Owe)'}
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </>
      )}

      {/* Item Details Dialog */}
      <ItemDetailsDialog
        visible={isItemsDialogOpen}
        onDismiss={() => setIsItemsDialogOpen(false)}
        items={itemsToView}
        formatIndianNumber={formatIndianNumber}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.7,
  },
  exportButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  backButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 6,
  },
  currentCustomer: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  customerName: {
    fontWeight: '600',
    color: '#374151',
  },
  card: {
    margin: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardContent: {
    padding: 30,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1f2937',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#4b5563',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#374151',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
    minHeight: 48,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#374151',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#374151',
  },
  clearButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  clearButtonText: {
    color: '#4b5563',
    fontWeight: '500',
    fontSize: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: Dimensions.get('window').width / 3 - 24,
    margin: 4,
    backgroundColor: 'white',
    borderRadius: 8,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  summaryContent: {
    padding: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  balanceNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
  tableHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom:10
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionContainer: {
    maxHeight: 300,
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalItem: {
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ReceivablesLedger;