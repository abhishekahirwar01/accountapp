// hooks/useProfitLossData.js
import { useState, useEffect } from "react";
import ProfitLossApiService from "../utils/profitLossApiService";

export const useProfitLossData = ({
  fromDate,
  toDate,
  companyId,
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!fromDate || !toDate) {
      console.log("Missing date parameters, skipping fetch");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("Fetching profit loss data for:", { fromDate, toDate, companyId });

      const result = await ProfitLossApiService.fetchProfitLossData({
        fromDate,
        toDate,
        companyId,
      });

      console.log("Profit loss data fetched successfully:", result);
      setData(result);
      
    } catch (err) {
      console.error("Error in useProfitLossData:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      
      // Set default data structure on error
      const defaultData = getDefaultProfitLossData();
      defaultData.success = false;
      defaultData.message = `Could not fetch profit loss data: ${errorMessage}`;
      setData(defaultData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate, companyId]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};

// Helper function for default data (if you don't have it in separate file)
const getDefaultProfitLossData = () => {
  return {
    success: false,
    message: "No data available",
    trading: {
      openingStock: 0,
      purchases: 0,
      sales: {
        total: 0,
        breakdown: {
          cash: 0,
          credit: 0,
          count: 0
        }
      },
      closingStock: 0,
      grossProfit: 0,
      grossLoss: 0
    },
    income: {
      breakdown: {
        productSales: {
          amount: 0,
          label: "Product Sales",
          count: 0,
          paymentMethods: {}
        },
        serviceIncome: {
          amount: 0,
          label: "Service Income",
          count: 0,
          paymentMethods: {}
        },
        receipts: {
          amount: 0,
          label: "Receipts",
          count: 0,
          paymentMethods: {}
        },
        otherIncome: []
      }
    },
    expenses: {
      total: 0,
      breakdown: {
        costOfGoodsSold: {
          amount: 0,
          label: "Cost of Goods Sold",
          count: 0,
          paymentMethods: {},
          components: {}
        },
        purchases: {
          amount: 0,
          label: "Purchases",
          count: 0,
          paymentMethods: {}
        },
        vendorPayments: {
          amount: 0,
          label: "Vendor Payments",
          count: 0,
          paymentMethods: {}
        },
        expensePayments: {
          amount: 0,
          label: "Expense Payments",
          count: 0,
          paymentMethods: {}
        },
        expenseBreakdown: []
      }
    },
    summary: {
      grossProfit: 0,
      netProfit: 0,
      totalIncome: 0,
      totalExpenses: 0,
      profitMargin: 0,
      netMargin: 0,
      expenseRatio: 0,
      isProfitable: false
    },
    quickStats: {
      totalTransactions: 0,
      averageSale: 0,
      averageExpense: 0
    }
  };
};

export default useProfitLossData;