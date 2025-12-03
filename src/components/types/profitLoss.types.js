// types/profitLoss.types.js

// Transaction related interfaces
export const Transaction = {
  _id: String,
  date: String,
  amount: Number,
  totalAmount: Number,
  isExpense: Boolean,
  company: String,
  client: String,
};

export const SalesEntry = {
  ...Transaction,
  totalAmount: Number,
  paymentMethod: String,
};

export const PurchaseEntry = {
  ...Transaction,
  totalAmount: Number,
  paymentMethod: String,
};

export const ReceiptEntry = {
  ...Transaction,
  amount: Number,
};

export const PaymentEntry = {
  ...Transaction,
  amount: Number,
  isExpense: Boolean,
};

export const TransactionData = {
  sales: Array,
  purchases: Array,
  receipts: Array,
  payments: Array,
};

// Breakdown items
export const BreakdownItem = {
  amount: Number,
  label: String,
  count: Number,
  paymentMethods: Object,
};

// Income data
export const IncomeData = {
  total: Number,
  breakdown: {
    sales: BreakdownItem,
    receipts: BreakdownItem,
  },
};

// Expenses data
export const ExpensesData = {
  total: Number,
  breakdown: {
    purchases: BreakdownItem,
    vendorPayments: BreakdownItem,
    expensePayments: BreakdownItem,
  },
};

// Summary data
export const SummaryData = {
  grossProfit: Number,
  netProfit: Number,
  totalIncome: Number,
  totalExpenses: Number,
  profitMargin: Number,
  netMargin: Number,
  expenseRatio: Number,
  isProfitable: Boolean,
};

// Quick stats
export const QuickStats = {
  totalTransactions: Number,
  averageSale: Number,
  averageExpense: Number,
};

// Profit Loss Status
export const ProfitLossStatus = {
  status: String, // 'profit' | 'loss' | 'break-even'
  label: String,
  bgColor: String,
  textColor: String,
  borderColor: String,
  icon: String,
};

// Expense breakdown item
export const ExpenseBreakdownItem = {
  label: String,
  amount: Number,
};

// Income breakdown
export const IncomeBreakdown = {
  otherIncome: Array,
  productSales: BreakdownItem,
  serviceIncome: BreakdownItem,
  receipts: BreakdownItem,
};

// Expenses breakdown
export const ExpensesBreakdown = {
  costOfGoodsSold: { ...BreakdownItem, components: Object },
  purchases: BreakdownItem,
  vendorPayments: BreakdownItem,
  expensePayments: BreakdownItem,
  expenseBreakdown: Array,
};

// Trading account
export const TradingAccount = {
  openingStock: Number,
  closingStock: Number,
  purchases: Number,
  grossProfit: Number,
  grossLoss: Number,
  sales: {
    total: Number,
    breakdown: {
      cash: Number,
      credit: Number,
      count: Number,
    },
  },
};

// Profit loss data
export const ProfitLossData = {
  income: IncomeData,
  expenses: ExpensesData,
  summary: SummaryData,
  quickStats: QuickStats,
};

// Chart data item
export const ChartDataItem = {
  name: String,
  value: Number,
  color: String,
  type: String,
};

// Chart data
export const ChartData = {
  incomeBreakdown: Array,
  expenseBreakdown: Array,
  profitLossComparison: Array,
};

// Growth data
export const GrowthData = {
  netProfitGrowth: Number,
  revenueGrowth: Number,
  isImproving: Boolean,
};

// Profit loss summary
export const ProfitLossSummary = {
  grossProfit: Number,
  netProfit: Number,
  totalIncome: Number,
  totalExpenses: Number,
};

// Main Profit Loss Response
export const ProfitLossResponse = {
  success: Boolean,
  message: String,
  trading: TradingAccount,
  income: {
    breakdown: IncomeBreakdown,
  },
  expenses: {
    total: Number,
    breakdown: ExpensesBreakdown,
  },
  summary: ProfitLossSummary,
};

// Helper function to check object against schema
export const validateProfitLossResponse = (data) => {
  const expectedKeys = ['success', 'message', 'trading', 'income', 'expenses', 'summary'];
  return expectedKeys.every(key => key in data);
};

// Default empty objects for each type
export const DefaultProfitLossResponse = {
  success: false,
  message: '',
  trading: {
    openingStock: 0,
    closingStock: 0,
    purchases: 0,
    grossProfit: 0,
    grossLoss: 0,
    sales: {
      total: 0,
      breakdown: {
        cash: 0,
        credit: 0,
        count: 0,
      },
    },
  },
  income: {
    breakdown: {
      otherIncome: [],
      productSales: { amount: 0, label: 'Product Sales', count: 0, paymentMethods: {} },
      serviceIncome: { amount: 0, label: 'Service Income', count: 0, paymentMethods: {} },
      receipts: { amount: 0, label: 'Receipts', count: 0, paymentMethods: {} },
    },
  },
  expenses: {
    total: 0,
    breakdown: {
      costOfGoodsSold: { amount: 0, label: 'Cost of Goods Sold', count: 0, paymentMethods: {}, components: {} },
      purchases: { amount: 0, label: 'Purchases', count: 0, paymentMethods: {} },
      vendorPayments: { amount: 0, label: 'Vendor Payments', count: 0, paymentMethods: {} },
      expensePayments: { amount: 0, label: 'Expense Payments', count: 0, paymentMethods: {} },
      expenseBreakdown: [],
    },
  },
  summary: {
    grossProfit: 0,
    netProfit: 0,
    totalIncome: 0,
    totalExpenses: 0,
  },
};