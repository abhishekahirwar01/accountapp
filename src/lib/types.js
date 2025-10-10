const getInitialDate = () => new Date();

export const Product = {
  _id: '',
  name: '',
  type: 'product', // ItemProductServiceType
  stocks: 0,
  unit: '',
  hsn: '',
  createdByClient: '', // required
  createdAt: '',
  updatedAt: '',
  stock: '',
  maxInventories: 0,
};

export const Service = {
  _id: '',
  serviceName: '',
  sac: '',
  createdByClient: '',
  createdAt: '',
  updatedAt: '',
};

export const Item = {
  itemType: 'product', // ItemProductServiceType
  product: null,
  name: '',
  quantity: 0,
  unitType: "Piece", // UnitType
  pricePerUnit: 0,
  service: null,
  serviceName: null,
  description: '',
  sacCode: '',
  hsnCode: '',
  amount: 0,
};

export const Transaction = {
  _id: '',
  invoiceNumber: null,
  invoiceYearYY: null,
  date: getInitialDate(),
  dueDate: getInitialDate(),
  party: null,
  vendor: null,
  description: '',
  amount: 0,
  totalAmount: 0,
  items: [],
  quantity: 0,
  pricePerUnit: 0,
  type: "sales", // TransactionType
  unitType: "Piece", // UnitType
  category: '',
  product: null,
  company: null,
  voucher: '',
  debitAccount: '',
  creditAccount: '',
  narration: '',
  referenceNumber: '',
  notes: '',
  fromState: null,
  toState: null,
};

export const Kpi = {
  title: '',
  value: '',
  change: '',
  changeType: "increase", // "increase" or "decrease"
  icon: null, // LucideIcon placeholder
};

export const User = {
  _id: '',
  userName: '',
  userId: '',
  contactNumber: '',
  address: '',
  password: '',
  name: '',
  username: '',
  email: '',
  avatar: '',
  initials: '',
  role: "user", // UserRole
  token: '',
  status: "Active", // "Active" or "Inactive"
  companies: [],
  clientUsername: '',
};

export const Client = {
  _id: '',
  clientUsername: '',
  contactName: '',
  email: '',
  phone: '',
  role: '',
  createdAt: '',
  companyName: '',
  subscriptionPlan: "Basic", // "Premium", "Standard", "Basic"
  status: "Active",
  revenue: 0,
  users: 0,
  companies: 0,
  totalSales: 0,
  totalPurchases: 0,
  maxCompanies: 0,
  maxUsers: 0,
  maxInventories: 0,
  canSendInvoiceEmail: false,
  canSendInvoiceWhatsapp: false,
  canCreateUsers: false,
  canCreateProducts: false,
  canCreateCustomers: false,
  canCreateVendors: false,
  canCreateCompanies: false,
  canCreateInventory: false,
  canUpdateCompanies: false,
  slug: '',
};

export const ClientPermissions = {
  canCreateUsers: false,
  canCreateProducts: false,
  canCreateCustomers: false,
  canCreateVendors: false,
  canCreateCompanies: false,
  canUpdateCompanies: false,
  canSendInvoiceEmail: false,
  canSendInvoiceWhatsapp: false,
};

export const Invoice = {
  id: '',
  invoiceNumber: '',
  companyName: '',
  customerName: '',
  customerEmail: '',
  invoiceDate: getInitialDate(),
  dueDate: getInitialDate(),
  items: [], // { description: '', amount: 0 }[]
  status: "Pending", // "Paid", "Pending", "Overdue"
};

export const ProfitLossStatement = {
  revenue: [],
  totalRevenue: 0,
  expenses: [],
  totalExpenses: 0,
  netIncome: 0,
};

export const BalanceSheet = {
  assets: {
    current: [],
    nonCurrent: [],
    total: 0,
  },
  liabilities: {
    current: [],
    nonCurrent: [],
    total: 0,
  },
  equity: {
    retainedEarnings: 0,
    total: 0,
  },
};

export const Company = {
  _id: '',
  registrationNumber: '',
  businessName: '',
  businessType: '',
  address: '',
  City: '',
  addressState: '',
  Country: '',
  Pincode: '',
  Telephone: '',
  mobileNumber: '',
  emailId: '',
  Website: '',
  PANNumber: '',
  IncomeTaxLoginPassword: '',
  gstin: '',
  gstState: '',
  RegistrationType: '',
  PeriodicityofGSTReturns: '',
  GSTUsername: '',
  GSTPassword: '',
  ewayBillApplicable: false,
  EWBBillUsername: '',
  EWBBillPassword: '',
  TANNumber: '',
  TAXDeductionCollectionAcc: '',
  DeductorType: '',
  TDSLoginUsername: '',
  TDSLoginPassword: '',
  client: null,
  selectedClient: null,
  companyName: '',
  companyType: '',
  companyOwner: '',
  contactNumber: '',
  logo: '',
};

export const Party = {
  _id: '',
  name: '',
  type: "party", // "party" or "vendor"
  createdByClient: '',
  email: '',
  contactNumber: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  gstRegistrationType: "Regular", // GstRegistrationType
  pan: '',
  isTDSApplicable: false,
  tdsRate: 0,
  tdsSection: '',
  vendorName: '',
};

export const Vendor = {
  ...Party,
  vendorName: '',
  city: '',
  state: '',
  gstin: '',
  gstRegistrationType: "Regular", // GstRegistrationType
  pan: '',
  isTDSApplicable: false,
  contactNumber: '',
  email: '',
};

export const ShippingAddress = {
  _id: '',
  party: '',
  label: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  contactNumber: '',
  createdByClient: '',
  createdByUser: '',
  createdAt: '',
  updatedAt: '',
  __v: 0,
};

export const Bank = {
  _id: '',
  client: '',
  user: '',
  company: '',
  bankName: '',
  managerName: '',
  contactNumber: '',
  email: '',
  city: '',
  ifscCode: '',
  branchAddress: '',
  accountNumber: '',
  upiId: '',
  createdAt: '',
  updatedAt: '',
  __v: 0,
};

// --- Mock Data ---

export const mockTransactions = [
  {
    _id: '1',
    type: 'sales',
    party: { name: 'John Doe', email: 'john@example.com' },
    company: { _id: 'comp1', businessName: 'Tech Solutions Inc.' },
    description: 'Website development project',
    totalAmount: 50000,
    date: '2024-01-15',
    items: [
      {
        itemType: 'service',
        serviceName: 'Web Development',
        description: 'Corporate website development',
        amount: 50000
      }
    ]
  },
  {
    _id: '2',
    type: 'purchases',
    vendor: { vendorName: 'ABC Suppliers', contactNumber: '9876543210' },
    company: { _id: 'comp2', businessName: 'Retail Store' },
    description: 'Office supplies purchase',
    totalAmount: 15000,
    date: '2024-01-14',
    items: [
      {
        itemType: 'product',
        name: 'Office Chair',
        quantity: 5,
        unitType: 'Piece',
        pricePerUnit: 3000,
        amount: 15000
      }
    ]
  },
  {
    _id: '3',
    type: 'journal',
    debitAccount: 'Cash',
    creditAccount: 'Sales',
    narration: 'Cash sales entry',
    totalAmount: 25000,
    date: '2024-01-13',
    items: []
  }
];

export const mockCompanies = new Map([
  ['comp1', 'Tech Solutions Inc.'],
  ['comp2', 'Retail Store'],
  ['comp3', 'Manufacturing Corp'],
]);