// utils/profitLossDataHelpers.js
export const getDefaultProfitLossData = () => {
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

// Helper to check if data is valid
export const isValidProfitLossData = (data) => {
  return data && data.success === true && data.trading && data.income && data.expenses && data.summary;
};

// Helper to merge API data with defaults
export const mergeWithDefaults = (apiData) => {
  const defaults = getDefaultProfitLossData();
  
  if (!apiData || typeof apiData !== 'object') {
    return defaults;
  }
  
  return {
    ...defaults,
    ...apiData,
    trading: {
      ...defaults.trading,
      ...(apiData.trading || {}),
      sales: {
        ...defaults.trading.sales,
        ...(apiData.trading?.sales || {}),
        breakdown: {
          ...defaults.trading.sales.breakdown,
          ...(apiData.trading?.sales?.breakdown || {})
        }
      }
    },
    income: {
      breakdown: {
        ...defaults.income.breakdown,
        ...(apiData.income?.breakdown || {}),
        productSales: {
          ...defaults.income.breakdown.productSales,
          ...(apiData.income?.breakdown?.productSales || {})
        },
        serviceIncome: {
          ...defaults.income.breakdown.serviceIncome,
          ...(apiData.income?.breakdown?.serviceIncome || {})
        },
        receipts: {
          ...defaults.income.breakdown.receipts,
          ...(apiData.income?.breakdown?.receipts || {})
        },
        otherIncome: apiData.income?.breakdown?.otherIncome || defaults.income.breakdown.otherIncome
      }
    },
    expenses: {
      total: apiData.expenses?.total || defaults.expenses.total,
      breakdown: {
        ...defaults.expenses.breakdown,
        ...(apiData.expenses?.breakdown || {}),
        expenseBreakdown: apiData.expenses?.breakdown?.expenseBreakdown || defaults.expenses.breakdown.expenseBreakdown
      }
    },
    summary: {
      ...defaults.summary,
      ...(apiData.summary || {})
    }
  };
};