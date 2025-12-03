import { DollarSign, CreditCard, BarChart, ShoppingCart } from "lucide-react-native";

// KPI Data
export const kpiData = [
  {
    title: "Total Revenue",
    value: "$45,231.89",
    change: "+20.1% from last month",
    changeType: "increase",
    icon: DollarSign,
  },
  {
    title: "Total Expenses",
    value: "$21,120.50",
    change: "+15.2% from last month",
    changeType: "increase",
    icon: CreditCard,
  },
  {
    title: "Net Profit",
    value: "$24,111.39",
    change: "+25.0% from last month",
    changeType: "increase",
    icon: BarChart,
  },
  {
    title: "Open Invoices",
    value: "12",
    change: "-5 from last month",
    changeType: "decrease",
    icon: ShoppingCart,
  },
];

// Profit & Loss Statement Data
export const plStatement = {
  revenue: [
    { name: "Consulting Services", amount: 35000 },
    { name: "Software Sales", amount: 15000 },
  ],
  totalRevenue: 50000,
  expenses: [
    { name: "Salaries and Wages", amount: 18000 },
    { name: "Marketing", amount: 5000 },
    { name: "Rent", amount: 4000 },
    { name: "Software", amount: 2000 },
    { name: "Utilities", amount: 1000 },
  ],
  totalExpenses: 30000,
  netIncome: 20000,
};

// Balance Sheet Data
export const balanceSheetData = {
  assets: {
    current: [
      { name: "Cash", amount: 50000 },
      { name: "Accounts Receivable", amount: 15000 },
    ],
    nonCurrent: [{ name: "Property, Plant, and Equipment", amount: 75000 }],
    total: 140000,
  },
  liabilities: {
    current: [{ name: "Accounts Payable", amount: 10000 }],
    nonCurrent: [{ name: "Long-term Debt", amount: 40000 }],
    total: 50000,
  },
  equity: {
    retainedEarnings: 90000,
    total: 90000,
  },
};