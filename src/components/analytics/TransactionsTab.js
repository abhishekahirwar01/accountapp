import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import ExportTransaction from './ExportTransaction';
import DataTable from '../transactions/DataTable';
import TransactionsTable from '../transactions/TransactionsTable';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const formatCurrency = amount => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

export default function TransactionsTab({
  selectedClient,
  selectedCompanyId,
  companyMap,
}) {
  // ... (Hardcoded data and memoizations remain the same)
  // Hardcoded data for demonstration - matching web structure
  const hardcodedProducts = [
    { _id: 'prod1', name: 'Beauty Gel', hsn: '330499', price: 5000 },
    { _id: 'prod2', name: 'Moody Cream', hsn: '330499', price: 3000 },
    { _id: 'prod3', name: 'Raw Material X', hsn: '8471', price: 1600 },
  ];

  const hardcodedServices = [
    {
      _id: 'serv1',
      serviceName: 'Skin Consultation',
      sac: '998311',
      rate: 2000,
    },
    { _id: 'serv2', serviceName: 'Face Dressing', sac: '999723', rate: 1500 },
  ];

  const hardcodedTransactions = [
    {
      _id: '1',
      date: '2024-01-15',
      type: 'sales',
      invoiceNumber: 'INV-001',
      party: 'Customer A',
      amount: 15000,
      status: 'Paid',
      company: 'comp1',
      products: [
        {
          product: 'prod1',
          quantity: 2,
          pricePerUnit: 5000,
          amount: 10000,
          unitType: 'Piece',
        },
        {
          product: 'prod2',
          quantity: 1,
          pricePerUnit: 3000,
          amount: 3000,
          unitType: 'Tube',
        },
      ],
      services: [
        { service: 'serv1', amount: 2000, description: 'Initial consultation' },
      ],
    },
    {
      _id: '2',
      date: '2024-01-10',
      type: 'purchase',
      invoiceNumber: 'PUR-001',
      party: 'Supplier B',
      amount: 8000,
      status: 'Pending',
      company: 'comp1',
      products: [
        {
          product: 'prod3',
          quantity: 5,
          pricePerUnit: 1600,
          amount: 8000,
          unitType: 'Kg',
        },
      ],
    },
    {
      _id: '3',
      date: '2024-01-05',
      type: 'receipt',
      description: 'Payment received from Customer A',
      amount: 12000,
      status: 'Completed',
      company: 'comp1',
    },
    {
      _id: '4',
      date: '2024-01-03',
      type: 'payment',
      description: 'Vendor payment to Supplier B',
      amount: 6500,
      status: 'Completed',
      company: 'comp2',
    },
    {
      _id: '5',
      date: '2024-01-01',
      type: 'journal',
      description: 'Year opening balance adjustment',
      amount: 0,
      status: 'Posted',
      company: 'comp1',
      products: [],
      services: [],
    },
  ];

  const hardcodedClient = selectedClient || {
    _id: 'client1',
    contactName: 'Demo Client',
    email: 'demo@client.com',
    phone: '+91 9876543210',
  };

  const hardcodedCompanyMap =
    companyMap ||
    new Map([
      ['comp1', 'Demo Company 1'],
      ['comp2', 'Demo Company 2'],
    ]);

  // State management
  const [selectedTab, setSelectedTab] = useState('all');
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [itemsToView, setItemsToView] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Memoized data processing
  const productNameById = useMemo(() => {
    const m = new Map();
    for (const p of hardcodedProducts) {
      m.set(String(p._id), p.name || '(unnamed product)');
    }
    return m;
  }, []);

  const serviceNameById = useMemo(() => {
    const m = new Map();
    for (const s of hardcodedServices) {
      m.set(String(s._id), s.serviceName);
    }
    return m;
  }, []);

  // Filter transactions by type - matching web structure
  const sales = useMemo(
    () => hardcodedTransactions.filter(tx => tx.type === 'sales'),
    [],
  );

  const purchases = useMemo(
    () => hardcodedTransactions.filter(tx => tx.type === 'purchase'),
    [],
  );

  const receipts = useMemo(
    () => hardcodedTransactions.filter(tx => tx.type === 'receipt'),
    [],
  );

  const payments = useMemo(
    () => hardcodedTransactions.filter(tx => tx.type === 'payment'),
    [],
  );

  const journals = useMemo(
    () => hardcodedTransactions.filter(tx => tx.type === 'journal'),
    [],
  );

  const allTransactions = useMemo(
    () =>
      [...sales, ...purchases, ...receipts, ...payments, ...journals].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [sales, purchases, receipts, payments, journals],
  );

  // Handlers - matching web functionality
  const handleViewItems = useCallback(
    tx => {
      console.log('Transaction data for items:', tx);

      const prods = (tx.products || []).map(p => {
        const productName = productNameById.get(p.product) || '(product)';
        const productObj = hardcodedProducts.find(
          prod => prod._id === p.product,
        );
        const hsnCode = productObj?.hsn || '8471';

        return {
          itemType: 'product',
          name: productName,
          quantity: p.quantity ?? '',
          unitType:
            p.unitType === 'Other'
              ? p.otherUnit || 'Other'
              : p.unitType || 'Piece',
          pricePerUnit: p.pricePerUnit ?? '',
          description: '',
          amount: Number(p.amount) || 0,
          hsnCode,
        };
      });

      const svcs = (tx.services || []).map(s => {
        const serviceName = serviceNameById.get(s.service) || '(service)';
        const serviceObj = hardcodedServices.find(
          serv => serv._id === s.service,
        );
        const sacCode = serviceObj?.sac || '9984';

        return {
          itemType: 'service',
          name: serviceName,
          quantity: '',
          unitType: '',
          pricePerUnit: '',
          description: s.description || '',
          amount: Number(s.amount) || 0,
          sacCode,
        };
      });

      const allItems = [...prods, ...svcs];
      console.log('Final items to display:', allItems);

      setItemsToView(allItems);
      setIsItemsModalOpen(true);
    },
    [productNameById, serviceNameById],
  );

  const handleAction = useCallback(() => {
    Alert.alert(
      'Action not available',
      'Editing and deleting transactions is not available from the analytics dashboard.',
      [{ text: 'OK' }],
    );
  }, []);

  const onPreview = useCallback(tx => {
    Alert.alert(
      'Preview Invoice',
      `Would open invoice preview for ${tx.invoiceNumber}`,
      [{ text: 'OK' }],
    );
  }, []);

  const onDownloadInvoice = useCallback(tx => {
    Alert.alert(
      'Download Invoice',
      `Would download invoice for ${tx.invoiceNumber}`,
      [{ text: 'OK' }],
    );
  }, []);

  // Tab content rendering
  const getTabData = () => {
    switch (selectedTab) {
      case 'sales':
        return sales;
      case 'purchases':
        return purchases;
      case 'receipts':
        return receipts;
      case 'payments':
        return payments;
      case 'journals':
        return journals;
      default:
        return allTransactions;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text>Loading transactions...</Text>
        </View>
      );
    }

    const data = getTabData();

    if (isMobile) {
      return (
        <TransactionsTable
          data={data}
          companyMap={hardcodedCompanyMap}
          serviceNameById={serviceNameById}
          onPreview={onPreview}
          onEdit={handleAction}
          onDelete={handleAction}
          onViewItems={handleViewItems}
          onSendInvoice={() => {}}
          hideActions={true}
        />
      );
    }

    // For desktop, use DataTable with columns
    return (
      <DataTable
        data={data}
        companyMap={hardcodedCompanyMap}
        serviceNameById={serviceNameById}
        onViewItems={handleViewItems}
        onPreview={onPreview}
        onEdit={handleAction}
        onDelete={handleAction}
      />
    );
  };

  const handleTabChange = tab => {
    setSelectedTab(tab);
    setIsDropdownOpen(false);
  };

  // Tab navigation component
  const TabNavigation = () => (
    <View style={styles.tabContainer}>
      {/* Desktop Tabs */}
      {!isMobile && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabList}
        >
          {[
            'all',
            'sales',
            'purchases',
            'receipts',
            'payments',
            'journals',
          ].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabTrigger,
                selectedTab === tab && styles.activeTab,
              ]}
              onPress={() => handleTabChange(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab && styles.activeTabText,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Mobile Dropdown */}
      {isMobile && (
        <View style={styles.mobileTabContainer}>
          <TouchableOpacity
            style={styles.mobileTabHeader}
            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <Text style={styles.mobileTabText}>
              {selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          {isDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {[
                'all',
                'sales',
                'purchases',
                'receipts',
                'payments',
                'journals',
              ].map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={styles.dropdownItem}
                  onPress={() => handleTabChange(tab)}
                >
                  <Text style={styles.dropdownItemText}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Export Button */}
      <View style={styles.exportSection}>
        <ExportTransaction
          selectedClientId={hardcodedClient._id}
          companyMap={hardcodedCompanyMap}
          defaultCompanyId={selectedCompanyId}
        />
      </View>
    </View>
  );

  // Items Modal Component - matching web dialog
  const ItemsModal = () => (
    <Modal
      visible={isItemsModalOpen}
      animationType="slide"
      onRequestClose={() => setIsItemsModalOpen(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Item Details</Text>
          <Text style={styles.modalDescription}>
            A detailed list of all items in this transaction.
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsItemsModalOpen(false)}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={itemsToView}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemIcon}>
                  <Text style={styles.iconText}>
                    {item.itemType === 'service' ? '⚡' : '📦'}
                  </Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemType}>
                      {item.itemType?.charAt(0).toUpperCase() +
                        item.itemType?.slice(1)}
                    </Text>
                    <Text style={styles.hsnSac}>
                      {item.itemType === 'service' ? 'SAC' : 'HSN'}:{' '}
                      {item.sacCode || item.hsnCode || '—'}
                    </Text>
                  </View>
                  {item.itemType === 'service' && item.description && (
                    <Text style={styles.itemDescription}>
                      {item.description}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.itemDetails}>
                {item.itemType === 'product' && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailText}>
                      Qty: {item.quantity} {item.unitType}
                    </Text>
                    <Text style={styles.detailText}>
                      Rate: {formatCurrency(Number(item.pricePerUnit))}
                    </Text>
                  </View>
                )}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>
                    {formatCurrency(Number(item.amount))}
                  </Text>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.itemsList}
        />
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabSectionWrapper}>
        <TabNavigation />
      </View>

      <ScrollView
        style={styles.contentScrollView}
        contentContainerStyle={styles.contentScrollContainer}
      >
        {renderContent()}
      </ScrollView>

      <ItemsModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 16,
  },
  tabSectionWrapper: {
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    zIndex: 1,
  },

  contentScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentScrollContainer: {
    paddingBottom: 40,
    minHeight: '100%',
  },
  // Tab Navigation Styles
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  tabList: {
    flex: 1,
  },
  tabTrigger: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    minWidth: 80,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  mobileTabContainer: {
    flex: 1,
    position: 'relative',
  },
  mobileTabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mobileTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 4,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  exportSection: {
    marginLeft: 12,
  },
  // Content Styles
  content: {
    // Removed flex: 1 and margin from here.
    // The margin is now in contentScrollContainer.
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    minHeight: 200, // Ensure a minimum height for visibility
  },
  // ... (Modal styles remain the same)
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  itemsList: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 12,
    color: 'white',
    backgroundColor: '#666',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    overflow: 'hidden',
  },
  hsnSac: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  itemDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  itemDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
  },
  totalLabel: {
    fontWeight: '600',
    color: '#333',
    fontSize: 14,
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#007AFF',
    fontSize: 16,
  },
});
