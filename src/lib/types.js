export const Product = {
  _id: '',
  name: '',
  type: 'product', // 'product' or 'service'
  stocks: 0,
  unit: '',
  createdByClient: '',   // required
  createdAt: '',
  updatedAt: '',
  stock: '',
  maxInventories: 0,
};

export const Service = {
  _id: '',
  serviceName: '',
  createdByClient: '',
  createdAt: '',
  updatedAt: '',
};

export const Item = {
  itemType: 'product', // 'product' or 'service'
  // Product fields
  product: null,
  name: '',
  quantity: 0,
  unitType: "Piece", // "Kg", "Litre", "Piece", "Box", "Meter", "Dozen", "Pack", "Other"
  pricePerUnit: 0,
  // Service fields
  service: null,
  serviceName: null,
  description: '',
  // Common field
  amount: 0,
};

export const Transaction = {
  _id: '',
  invoiceNumber: null,
  invoiceYearYY: null,
  date: new Date(),
  party: null, // { email: false, _id: '', name: '' } or string
  vendor: null, // { _id: '', vendorName: '' } or string
  description: '',
  amount: 0, // Fallback for old transactions, new ones use totalAmount
  totalAmount: 0,
  items: [],
  quantity: 0,
  pricePerUnit: 0,
  type: "sales", // "sales", "purchases", "receipt", "payment", "journal"
  unitType: "Piece", // "Kg", "Litre", "Piece", "Box", "Meter", "Dozen", "Pack", "Other"
  category: '',
  product: null,
  company: null, // { businessName: null, _id: '', companyName: '' }
  voucher: '',
  // For Journal Entries
  debitAccount: '',
  creditAccount: '',
  narration: '',
  // For Receipts/Payments
  referenceNumber: '',
  notes: '',
};

export const Kpi = {
  title: '',
  value: '',
  change: '',
  changeType: "increase", // "increase" or "decrease"
  icon: null, // LucideIcon component
};

export const User = {
  _id: '',
  userName: '',
  userId: '',
  contactNumber: '',
  address: '',
  password: '',
  name: '', // For compatibility
  username: '', // For compatibility
  email: '',
  avatar: '',
  initials: '',
  role: "user", // "master", "customer", "Manager", "Accountant", "Viewer", "admin", "manager", "user"
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
  status: "Active", // "Active" or "Inactive"
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
  invoiceDate: new Date(),
  dueDate: new Date(),
  items: [], // { description: '', amount: 0 }[]
  status: "Pending", // "Paid", "Pending", "Overdue"
};

export const ProfitLossStatement = {
  revenue: [], // { name: '', amount: 0 }[]
  totalRevenue: 0,
  expenses: [], // { name: '', amount: 0 }[]
  totalExpenses: 0,
  netIncome: 0,
};

export const BalanceSheet = {
  assets: {
    current: [], // { name: '', amount: 0 }[]
    nonCurrent: [], // { name: '', amount: 0 }[]
    total: 0,
  },
  liabilities: {
    current: [], // { name: '', amount: 0 }[]
    nonCurrent: [], // { name: '', amount: 0 }[]
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
  client: null, // Client object or string
  selectedClient: null, // Client object or string
  // Deprecated fields - use new fields above
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
  gstin: '',
  gstRegistrationType: "Regular", // "Regular", "Composition", "Unregistered", "Consumer", "Overseas", "Special Economic Zone", "Unknown"
  pan: '',
  isTDSApplicable: false,
  tdsRate: 0,
  tdsSection: '',
  vendorName: '', // For vendor compatibility
};

export const Vendor = {
  ...Party,
  vendorName: '',
  city: '',
  state: '',
  gstin: '',
  gstRegistrationType: "Regular",
  pan: '',
  isTDSApplicable: false,
};



// Mock data
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