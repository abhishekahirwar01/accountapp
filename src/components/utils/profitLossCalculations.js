// utils/profitLossCalculations.js

/**
 * Calculate Profit & Loss metrics from raw transaction data
 */
export const calculateProfitLoss = (transactionData) => {
  const {
    sales = [],
    purchases = [],
    receipts = [],
    payments = []
  } = transactionData || {};

  // Calculate totals with proper type handling
  const totalSales = sales.reduce((sum, entry) => sum + (entry.totalAmount || 0), 0);
  const totalPurchases = purchases.reduce((sum, entry) => sum + (entry.totalAmount || 0), 0);
  const totalReceipts = receipts.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  
  // Separate payments into vendor payments and expense payments
  const vendorPayments = payments.filter(p => !p.isExpense);
  const expensePayments = payments.filter(p => p.isExpense);
  
  const totalVendorPayments = vendorPayments.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  const totalExpensePayments = expensePayments.reduce((sum, entry) => sum + (entry.amount || 0), 0);

  // Calculate key metrics
  const grossProfit = totalSales - totalPurchases;
  const totalIncome = totalSales + totalReceipts;
  const totalExpenses = totalPurchases + totalVendorPayments + totalExpensePayments;
  const netProfit = totalIncome - totalExpenses;

  // Calculate percentages with safe division
  const profitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
  const netMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
  const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

  return {
    // Two-side P&L structure
    income: {
      total: totalIncome,
      breakdown: {
        sales: {
          amount: totalSales,
          label: "Sales",
          count: sales.length
        },
        receipts: {
          amount: totalReceipts,
          label: "Receipts",
          count: receipts.length
        }
      }
    },
    
    expenses: {
      total: totalExpenses,
      breakdown: {
        purchases: {
          amount: totalPurchases,
          label: "Purchases",
          count: purchases.length
        },
        vendorPayments: {
          amount: totalVendorPayments,
          label: "Vendor Payments", 
          count: vendorPayments.length
        },
        expensePayments: {
          amount: totalExpensePayments,
          label: "Expense Payments",
          count: expensePayments.length
        }
      }
    },
    
    // Summary section
    summary: {
      grossProfit,
      netProfit,
      totalIncome,
      totalExpenses,
      profitMargin: Math.round(profitMargin * 100) / 100,
      netMargin: Math.round(netMargin * 100) / 100,
      expenseRatio: Math.round(expenseRatio * 100) / 100,
      isProfitable: netProfit > 0
    },
    
    // Quick stats
    quickStats: {
      totalTransactions: sales.length + purchases.length + receipts.length + payments.length,
      averageSale: sales.length > 0 ? totalSales / sales.length : 0,
      averageExpense: (purchases.length + vendorPayments.length + expensePayments.length) > 0 ? 
        totalExpenses / (purchases.length + vendorPayments.length + expensePayments.length) : 0
    }
  };
};




/**
 * Format currency for display
 */
export const formatCurrency = (amount, currency = 'INR') => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0;
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Format percentage for display
 */
export const formatPercentage = (value, decimals = 1) => {
  if (isNaN(value) || value === null || value === undefined) {
    value = 0;
  }
  
  return `${Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)}%`;
};

/**
 * Get profit/loss status and styling for React Native
 */
export const getProfitLossStatus = (netProfit) => {
  if (netProfit > 0) {
    return {
      status: 'profit',
      label: 'Profitable Period',
      bgColor: '#d1fae5', // green-100 equivalent
      textColor: '#065f46', // green-800 equivalent
      borderColor: '#a7f3d0', // green-200 equivalent
      icon: '✅',
      iconName: 'trending-up'
    };
  } else if (netProfit < 0) {
    return {
      status: 'loss',
      label: 'Loss Making Period',
      bgColor: '#fee2e2', // red-100 equivalent
      textColor: '#991b1b', // red-800 equivalent
      borderColor: '#fecaca', // red-200 equivalent
      icon: '⚠️',
      iconName: 'trending-down'
    };
  } else {
    return {
      status: 'break-even',
      label: 'Break-even Period',
      bgColor: '#f3f4f6', // gray-100 equivalent
      textColor: '#374151', // gray-800 equivalent
      borderColor: '#e5e7eb', // gray-200 equivalent
      icon: '⚪',
      iconName: 'minus'
    };
  }
};

/**
 * Generate chart data for visualizations
 */
export const generateChartData = (profitLossData) => {
  const { income, expenses, summary } = profitLossData;
  
  return {
    incomeBreakdown: [
      { name: 'Sales', value: income.breakdown.sales.amount, color: '#10b981' },
      { name: 'Receipts', value: income.breakdown.receipts.amount, color: '#059669' }
    ],
    expenseBreakdown: [
      { name: 'Purchases', value: expenses.breakdown.purchases.amount, color: '#ef4444' },
      { name: 'Vendor Payments', value: expenses.breakdown.vendorPayments.amount, color: '#dc2626' },
      { name: 'Expense Payments', value: expenses.breakdown.expensePayments.amount, color: '#b91c1c' }
    ],
    profitLossComparison: [
      { name: 'Total Income', value: income.total, type: 'income' },
      { name: 'Total Expenses', value: expenses.total, type: 'expense' },
      { name: 'Net Profit/Loss', value: Math.abs(summary.netProfit), type: summary.netProfit >= 0 ? 'profit' : 'loss' }
    ]
  };
};

/**
 * Calculate period-over-period growth
 */
export const calculateGrowth = (currentData, previousData) => {
  if (!previousData) return null;

  const currentNetProfit = currentData.summary.netProfit;
  const previousNetProfit = previousData.summary.netProfit;
  
  const netProfitGrowth = previousNetProfit !== 0 
    ? ((currentNetProfit - previousNetProfit) / Math.abs(previousNetProfit)) * 100 
    : currentNetProfit > 0 ? 100 : currentNetProfit < 0 ? -100 : 0;

  const currentRevenue = currentData.income.total;
  const previousRevenue = previousData.income.total;
  
  const revenueGrowth = previousRevenue !== 0 
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
    : currentRevenue > 0 ? 100 : 0;

  return {
    netProfitGrowth: Math.round(netProfitGrowth * 100) / 100,
    revenueGrowth: Math.round(revenueGrowth * 100) / 100,
    isImproving: netProfitGrowth > 0
  };
};

/**
 * Filter transactions by date range
 */
export const filterTransactionsByDate = (transactions, startDate, endDate) => {
  if (!Array.isArray(transactions)) return [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return transactions.filter(transaction => {
    if (!transaction || !transaction.date) return false;
    
    const transactionDate = new Date(transaction.date);
    return transactionDate >= start && transactionDate <= end;
  });
};

/**
 * Validate profit loss data structure
 */
export const validateProfitLossData = (data) => {
  const requiredFields = ['income', 'expenses', 'summary'];
  const hasAllFields = requiredFields.every(field => data && data[field]);
  
  if (!hasAllFields) {
    console.error('Invalid profit loss data structure');
    return false;
  }

  // Type guard to ensure it's a valid ProfitLossData
  return (
    typeof data.income.total === 'number' &&
    typeof data.expenses.total === 'number' &&
    typeof data.summary.netProfit === 'number'
  );
};

/**
 * Calculate additional financial ratios
 */
export const calculateFinancialRatios = (profitLossData) => {
  if (!profitLossData) {
    return {
      operatingMargin: 0,
      returnOnRevenue: 0,
      expenseToIncomeRatio: 0
    };
  }
  
  const { income, expenses, summary } = profitLossData;
  
  const operatingMargin = income && income.total > 0 ? (summary.grossProfit / income.total) * 100 : 0;
  const returnOnRevenue = income && income.total > 0 ? (summary.netProfit / income.total) * 100 : 0;
  const expenseToIncomeRatio = income && income.total > 0 ? (expenses.total / income.total) * 100 : 0;

  return {
    operatingMargin: Math.round(operatingMargin * 100) / 100,
    returnOnRevenue: Math.round(returnOnRevenue * 100) / 100,
    expenseToIncomeRatio: Math.round(expenseToIncomeRatio * 100) / 100
  };
};

/**
 * Generate insights based on profit loss data
 */
export const generateInsights = (profitLossData) => {
  if (!profitLossData) return [];
  
  const { summary, income, expenses } = profitLossData;
  const insights = [];

  if (summary.netProfit > 0) {
    insights.push(`Your business is profitable with a net profit of ${formatCurrency(summary.netProfit)}`);
  } else if (summary.netProfit < 0) {
    insights.push(`Your business is operating at a loss of ${formatCurrency(Math.abs(summary.netProfit))}`);
  }

  if (summary.profitMargin > 50) {
    insights.push("High profit margin indicates strong pricing power or cost control");
  } else if (summary.profitMargin < 20) {
    insights.push("Consider reviewing costs or pricing strategy to improve margins");
  }

  if (expenses && income && expenses.total > income.total * 0.8) {
    insights.push("High expense ratio - consider cost optimization strategies");
  }

  if (income && income.breakdown && income.breakdown.receipts && income.breakdown.sales) {
    if (income.breakdown.receipts.amount > income.breakdown.sales.amount * 0.5) {
      insights.push("Significant income from receipts - good cash flow management");
    }
  }

  return insights;
};

/**
 * Helper function to calculate running totals for charts
 */
export const calculateRunningTotals = (transactions, dateField = 'date', amountField = 'amount') => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  // Sort by date
  const sorted = [...transactions].sort((a, b) => 
    new Date(a[dateField]) - new Date(b[dateField])
  );

  let runningTotal = 0;
  return sorted.map(transaction => {
    runningTotal += transaction[amountField] || 0;
    return {
      date: transaction[dateField],
      amount: transaction[amountField] || 0,
      runningTotal
    };
  });
};

/**
 * Calculate monthly averages
 */
export const calculateMonthlyAverages = (profitLossDataArray) => {
  if (!Array.isArray(profitLossDataArray) || profitLossDataArray.length === 0) {
    return {
      avgMonthlyRevenue: 0,
      avgMonthlyExpenses: 0,
      avgMonthlyProfit: 0
    };
  }

  const totalRevenue = profitLossDataArray.reduce((sum, data) => sum + (data.income?.total || 0), 0);
  const totalExpenses = profitLossDataArray.reduce((sum, data) => sum + (data.expenses?.total || 0), 0);
  const totalProfit = profitLossDataArray.reduce((sum, data) => sum + (data.summary?.netProfit || 0), 0);

  const count = profitLossDataArray.length;

  return {
    avgMonthlyRevenue: Math.round((totalRevenue / count) * 100) / 100,
    avgMonthlyExpenses: Math.round((totalExpenses / count) * 100) / 100,
    avgMonthlyProfit: Math.round((totalProfit / count) * 100) / 100
  };
};