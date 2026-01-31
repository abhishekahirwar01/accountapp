// hooks/useProfitLossData.js
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';

export const useProfitLossData = ({
  fromDate,
  toDate,
  clientId,
  companyId,
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfitLossData = useCallback(async () => {
    if (!fromDate || !toDate) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found.');
      }

      // ✅ BUILD QUERY PARAMS - Same as Next.js
      const params = new URLSearchParams({
        fromDate,
        toDate,
      });

      if (companyId && companyId.trim() !== '') {
        params.append('companyId', companyId);
      }

      if (clientId && clientId.trim() !== '') {
        params.append('clientId', clientId);
      }

      const url = `${BASE_URL}/api/profitloss/statement?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          const errorText = await response.text();
          errorData = {
            message: errorText || `HTTP error! status: ${response.status}`,
          };
        }
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      const responseData = await response.json();

      if (responseData.success) {
        // Handle different response structures like Next.js
        if (responseData.data) {
          setData(responseData.data); // If response has {success: true, data: {...}}
        } else {
          setData(responseData); // If response is the data directly
        }
      } else {
        throw new Error(responseData.message || 'Failed to load data');
      }
    } catch (err) {
      console.error('❌ Error fetching P&L data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');

      // Set default data on error (optional)
      setData(getDefaultProfitLossData(err.message));
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, clientId, companyId]);

  useEffect(() => {
    fetchProfitLossData();
  }, [fetchProfitLossData]);

  return {
    data,
    loading,
    error,
    refetch: fetchProfitLossData,
  };
};

// Helper function for default data
const getDefaultProfitLossData = (message = 'No data available') => {
  return {
    success: false,
    message,
    trading: {
      openingStock: 0,
      purchases: 0,
      sales: {
        total: 0,
        breakdown: {
          cash: 0,
          credit: 0,
          count: 0,
        },
      },
      closingStock: 0,
      grossProfit: 0,
      grossLoss: 0,
    },
    income: {
      breakdown: {
        productSales: {
          amount: 0,
          label: 'Product Sales',
          count: 0,
          paymentMethods: {},
        },
        serviceIncome: {
          amount: 0,
          label: 'Service Income',
          count: 0,
          paymentMethods: {},
        },
        receipts: {
          amount: 0,
          label: 'Receipts',
          count: 0,
          paymentMethods: {},
        },
        otherIncome: [],
      },
    },
    expenses: {
      total: 0,
      breakdown: {
        costOfGoodsSold: {
          amount: 0,
          label: 'Cost of Goods Sold',
          count: 0,
          paymentMethods: {},
          components: {},
        },
        purchases: {
          amount: 0,
          label: 'Purchases',
          count: 0,
          paymentMethods: {},
        },
        vendorPayments: {
          amount: 0,
          label: 'Vendor Payments',
          count: 0,
          paymentMethods: {},
        },
        expensePayments: {
          amount: 0,
          label: 'Expense Payments',
          count: 0,
          paymentMethods: {},
        },
        expenseBreakdown: [],
      },
    },
    summary: {
      grossProfit: 0,
      netProfit: 0,
      totalIncome: 0,
      totalExpenses: 0,
      profitMargin: 0,
      netMargin: 0,
      expenseRatio: 0,
      isProfitable: false,
    },
    quickStats: {
      totalTransactions: 0,
      averageSale: 0,
      averageExpense: 0,
    },
  };
};

export default useProfitLossData;
