import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  FlatList,
  Alert,
  
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FileText,
  TrendingUp,
  CreditCard,
  Calendar,
  Package,
  Server,
  IndianRupee,
  ExternalLink
} from 'lucide-react-native';
import { BASE_URL } from '../../config';
import { Badge } from '../ui/Badge';

// Placeholder components (replace with your actual components)
const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const CardHeader = ({ children, style }) => (
  <View style={[styles.cardHeader, style]}>{children}</View>
);

const CardTitle = ({ children }) => (
  <Text style={styles.cardTitle}>{children}</Text>
);

const CardContent = ({ children, style }) => (
  <View style={[styles.cardContent, style]}>{children}</View>
);

const Skeleton = ({ style }) => (
  <View style={[styles.skeleton, style]} />
);

export function VendorLedgerView({
  loading,
  ledgerData,
  selectedVendorData,
  formatDate,
  formatCurrency,
  getPaymentMethodDisplay,
  getPaymentMethodBadge,
  calculateTotals,
  dateRange,
  productsList = []
}) {
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [itemsToView, setItemsToView] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const totals = calculateTotals();

  // Function to handle viewing items for a transaction
  const handleViewItems = async (entry) => {
    try {
      setLoadingItems(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found.');
        return;
      }

      const baseURL = BASE_URL;
      
      // Check if entry has a valid id
      if (!entry.id) {
        Alert.alert('Info', 'No detailed items available for this transaction');
        return;
      }

      // Try purchase endpoint first, then payments if needed
      let endpoint = `${baseURL}/api/purchase/${entry.id}`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // If purchase endpoint fails, try payments endpoint
        const paymentsEndpoint = `${baseURL}/api/payments/${entry.id}`;
        const paymentsResponse = await fetch(paymentsEndpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!paymentsResponse.ok) {
          // If both endpoints fail, show empty modal
          console.log('Failed to fetch transaction details from both endpoints');
          setItemsToView([]);
          setIsItemsModalOpen(true);
          return;
        }

        const transaction = await paymentsResponse.json();
        
        // Check if transaction data exists
        if (!transaction || !transaction.payment) {
          Alert.alert('Info', 'Transaction data not found');
          return;
        }
        
        processTransactionData(transaction.payment);
        return;
      }

      const transaction = await response.json();
      
      // Check if transaction data exists
      if (!transaction || !transaction.entry) {
        Alert.alert('Info', 'Transaction data not found');
        return;
      }
      
      processTransactionData(transaction.entry);
    } catch (error) {
      console.error('Error fetching transaction items:', error);
      Alert.alert('Error', 'Failed to load transaction items');
      setItemsToView([]);
      setIsItemsModalOpen(true);
    } finally {
      setLoadingItems(false);
    }
  };

  const processTransactionData = (transaction) => {
    // Process products
    const prods = (transaction?.products || []).map((p) => {
      // Get HSN code from product - safely handle null/undefined
      let productId = '';
      let productName = '';
      let productObj = null;
      
      if (p.product) {
        if (typeof p.product === 'object') {
          productId = p.product._id || '';
          productName = p.product.name || p.product || '(product)';
        } else {
          productId = p.product;
          productName = p.product || '(product)';
        }
        
        // Find product in productsList if we have productId
        if (productId) {
          productObj = productsList.find((prod) => prod._id === productId);
        }
      }
      
      const hsnCode = productObj?.hsn || p.hsn || p.hsnCode || '';

      return {
        itemType: 'product',
        name: productName || '(product)',
        quantity: p.quantity ?? '',
        unitType: p.unitType ?? '',
        pricePerUnit: p.pricePerUnit ?? '',
        description: '',
        amount: Number(p.amount) || 0,
        hsnCode,
        gstPercentage: p.gstPercentage,
        gstRate: p.gstPercentage,
        lineTax: p.lineTax,
      };
    });

    // Process services
    const svcArr = Array.isArray(transaction?.services)
      ? transaction.services
      : Array.isArray(transaction?.service)
      ? transaction.service
      : transaction?.services
      ? [transaction.services]
      : [];
    
    const svcs = svcArr.map((s) => {
      let serviceName = '';
      let sacCode = '';
      
      if (s.service) {
        if (typeof s.service === 'object') {
          serviceName = s.service.serviceName || s.service || '(service)';
          sacCode = s.service.sac || '';
        } else {
          serviceName = s.service || '(service)';
        }
      }
      
      return {
        itemType: 'service',
        name: serviceName || '(service)',
        quantity: '',
        unitType: '',
        pricePerUnit: '',
        description: s.description || '',
        amount: Number(s.amount) || 0,
        sacCode: sacCode || s.sac || '',
        gstPercentage: s.gstPercentage,
        gstRate: s.gstPercentage,
        lineTax: s.lineTax,
      };
    });

    const allItems = [...prods, ...svcs];
    setItemsToView(allItems);
    setIsItemsModalOpen(true);
  };

  const ItemsModal = () => (
    <Modal
      visible={isItemsModalOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setIsItemsModalOpen(false)}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Item Details</Text>
            <TouchableOpacity onPress={() => setIsItemsModalOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {loadingItems ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.modalLoadingText}>Loading items...</Text>
            </View>
          ) : itemsToView.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Text style={styles.modalEmptyText}>No items found for this transaction</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalContent}>
              {/* Summary Section */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(itemsToView.reduce((sum, item) => sum + Number(item.amount || 0), 0))}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Tax Total</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(itemsToView.reduce((sum, item) => {
                        const lineTax = item.lineTax;
                        if (lineTax !== undefined && lineTax !== null) {
                          return sum + Number(lineTax);
                        }
                        const gstRate = item.gstPercentage || item.gstRate || item.gst || 0;
                        const taxableValue = item.amount || 0;
                        const taxAmount = (taxableValue * gstRate) / 100;
                        return sum + taxAmount;
                      }, 0))}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Grand Total</Text>
                    <Text style={[styles.summaryValue, styles.grandTotal]}>
                      {formatCurrency(
                        itemsToView.reduce((sum, item) => sum + Number(item.amount || 0), 0) +
                        itemsToView.reduce((sum, item) => {
                          const lineTax = item.lineTax;
                          if (lineTax !== undefined && lineTax !== null) {
                            return sum + Number(lineTax);
                          }
                          const gstRate = item.gstPercentage || item.gstRate || item.gst || 0;
                          const taxableValue = item.amount || 0;
                          const taxAmount = (taxableValue * gstRate) / 100;
                          return sum + taxAmount;
                        }, 0)
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Items List */}
              <View style={styles.itemsList}>
                {itemsToView.map((item, index) => {
                  const isService = item.itemType === 'service';
                  const qty = !isService && item.quantity && !isNaN(Number(item.quantity))
                    ? `${item.quantity} ${item.unitType || 'Piece'}`
                    : '—';
                  const rate = !isService ? formatCurrency(Number(item?.pricePerUnit ?? 0)) : '—';
                  const total = formatCurrency(Number(item?.amount ?? 0));
                  const hsnSacCode = isService ? item.sacCode : item.hsnCode;

                  return (
                    <View key={index} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={styles.itemIconContainer}>
                          {isService ? (
                            <Server size={16} color="#6b7280" />
                          ) : (
                            <Package size={16} color="#6b7280" />
                          )}
                        </View>
                        <View style={styles.itemTitleContainer}>
                          <Text style={styles.itemName}>{item?.name ?? '—'}</Text>
                          <View style={styles.itemTags}>
                            <View style={styles.itemTag}>
                              <Text style={styles.itemTagText}>
                                {item.itemType?.toUpperCase() ?? '—'}
                              </Text>
                            </View>
                            {hsnSacCode && (
                              <View style={styles.itemTag}>
                                <Text style={styles.itemTagText}>
                                  HSN/SAC: {hsnSacCode}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      {isService && item?.description && (
                        <Text style={styles.itemDescription}>{item.description}</Text>
                      )}

                      <View style={styles.itemDetails}>
                        <View style={styles.itemDetail}>
                          <Text style={styles.itemDetailLabel}>Quantity</Text>
                          <Text style={styles.itemDetailValue}>{qty}</Text>
                        </View>
                        <View style={styles.itemDetail}>
                          <Text style={styles.itemDetailLabel}>Price/Unit</Text>
                          <Text style={styles.itemDetailValue}>{rate}</Text>
                        </View>
                        <View style={[styles.itemDetail, styles.itemTotal]}>
                          <Text style={styles.itemDetailLabel}>Total</Text>
                          <Text style={styles.itemDetailTotal}>{total}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Skeleton style={styles.loadingSkeletonLarge} />
        <View style={styles.loadingGrid}>
          <Skeleton style={styles.loadingSkeletonHalf} />
          <Skeleton style={styles.loadingSkeletonHalf} />
        </View>
      </View>
    );
  }

  if (!ledgerData) {
    return (
      <Card style={styles.emptyCard}>
        <CardContent style={styles.emptyContent}>
          <View style={styles.emptyIcon}>
            <FileText size={32} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>No Ledger Data</Text>
          <Text style={styles.emptyDescription}>
            No transaction history found for the selected vendor. 
            Transactions will appear here once recorded.
          </Text>
        </CardContent>
      </Card>
    );
  }

  const creditPurchaseEntries = (ledgerData.debit || []).filter(
    (entry) => entry.paymentMethod !== 'Credit'
  );
  const creditPaymentEntries = ledgerData.credit || [];
  const allCreditEntries = [...creditPurchaseEntries, ...creditPaymentEntries];

  const renderTransactionItem = (item, index, isDebit = true) => {
    const isPurchase = !item.type || item.type === 'debit';
    const bgColor = isDebit ? '#fef2f2' : '#f0fdf4';
    const borderColor = isDebit ? '#fecaca' : '#bbf7d0';
    const textColor = isDebit ? '#dc2626' : '#10b981';
    
    const handlePress = () => {
      if (item.id) {
        handleViewItems(item);
      } else {
        Alert.alert('Info', 'No detailed items available for this transaction');
      }
    };
    
    return (
      <TouchableOpacity 
        style={[styles.transactionItem, { backgroundColor: bgColor, borderColor }]}
        onPress={handlePress}
      >
        <View style={styles.transactionHeader}>
          <View style={[styles.transactionIndex, { backgroundColor: textColor }]}>
            <Text style={styles.transactionIndexText}>{index + 1}</Text>
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionType}>
              {isPurchase ? 'Purchase' : getPaymentMethodDisplay(item.paymentMethod)}
            </Text>
            <View style={styles.transactionDate}>
              <Calendar size={12} color="#64748b" />
              <Text style={styles.transactionDateText}>{formatDate(item.date)}</Text>
            </View>
          </View>
          <View style={styles.transactionAmountContainer}>
            <Text style={[styles.transactionAmount, { color: textColor }]}>
              {formatCurrency(item.amount)}
            </Text>
            <ExternalLink size={14} color="#3b82f6" />
          </View>
        </View>

        {(item.invoiceNo || item.referenceNumber) && (
          <View style={styles.transactionDetails}>
            {item.invoiceNo && (
              <View style={styles.transactionDetail}>
                <Text style={styles.transactionDetailLabel}>Invoice:</Text>
                <Text style={styles.transactionDetailValue}>{item.invoiceNo}</Text>
              </View>
            )}
            {item.referenceNumber && (
              <View style={styles.transactionDetail}>
                <Text style={styles.transactionDetailLabel}>Ref:</Text>
                <Text style={styles.transactionDetailValue}>{item.referenceNumber}</Text>
              </View>
            )}
          </View>
        )}

        {item.description && (
          <Text style={styles.transactionDescription}>{item.description}</Text>
        )}

        <View style={styles.transactionFooter}>
          <Text style={styles.transactionMethodLabel}>Payment Method</Text>
          <Badge variant={getPaymentMethodBadge(item.paymentMethod)}>
            <Text style={styles.transactionMethodText}>{item.paymentMethod || 'Not Specified'}</Text>
          </Badge>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <ItemsModal />
      
      {/* Vendor Summary Card */}
      <Card style={styles.summaryCard}>
        <CardContent>
          <View style={styles.summaryHeader}>
            <View style={styles.vendorInfo}>
              <View style={styles.vendorIcon}>
                <FileText size={20} color="#4b5563" />
              </View>
              <View style={styles.vendorDetails}>
                <Text style={styles.vendorName}>
                  {selectedVendorData?.vendorName}
                </Text>
                <Text style={styles.vendorDate}>
                  Vendor Ledger Summary • {dateRange?.from && dateRange?.to
                    ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
                    : formatDate(new Date().toISOString())}
                </Text>
              </View>
            </View>
            
            <View style={styles.balanceContainer}>
              <Text style={[
                styles.balanceAmount,
                totals.balance > 0 ? styles.balancePositive : 
                totals.balance < 0 ? styles.balanceNegative : styles.balanceNeutral
              ]}>
                {formatCurrency(Math.abs(totals.balance))}
              </Text>
              <Badge
                variant="outline"
                style={[
                  totals.balance > 0 ? styles.badgePayable :
                  totals.balance < 0 ? styles.badgeAdvance : styles.badgeSettled
                ]}
              >
                <Text style={[
                  totals.balance > 0 ? styles.badgeTextPayable :
                  totals.balance < 0 ? styles.badgeTextAdvance : styles.badgeTextSettled
                ]}>
                  {totals.balance > 0
                    ? 'Amount Payable'
                    : totals.balance < 0
                    ? 'Advance Paid'
                    : 'Settled'}
                </Text>
              </Badge>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <CardContent style={styles.statContent}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, styles.statIconRed]}>
                <TrendingUp size={16} color="#dc2626" />
              </View>
              <Text style={styles.statLabel}>Total Purchases</Text>
            </View>
            <Text style={styles.statValueRed}>{formatCurrency(totals.debit)}</Text>
          </CardContent>
        </Card>

        <Card style={styles.statCard}>
          <CardContent style={styles.statContent}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, styles.statIconGreen]}>
                <CreditCard size={16} color="#16a34a" />
              </View>
              <Text style={styles.statLabel}>Total Payments</Text>
            </View>
            <Text style={styles.statValueGreen}>{formatCurrency(totals.credit)}</Text>
          </CardContent>
        </Card>

        <Card style={styles.statCard}>
          <CardContent style={styles.statContent}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, styles.statIconBlue]}>
                <Calendar size={16} color="#2563eb" />
              </View>
              <Text style={styles.statLabel}>Net Balance</Text>
            </View>
            <Text style={[
              styles.statValue,
              totals.balance > 0 ? styles.statValueOrange :
              totals.balance < 0 ? styles.statValueEmerald : styles.statValueBlue
            ]}>
              {formatCurrency(Math.abs(totals.balance))}
            </Text>
          </CardContent>
        </Card>

        <Card style={styles.statCard}>
          <CardContent style={styles.statContent}>
            <View style={styles.statHeader}>
              <View style={[
                styles.statIcon,
                totals.balance > 0 ? styles.statIconOrange :
                totals.balance < 0 ? styles.statIconEmerald : styles.statIconBlue
              ]}>
                <FileText size={16} color={
                  totals.balance > 0 ? '#ea580c' :
                  totals.balance < 0 ? '#059669' : '#2563eb'
                } />
              </View>
              <Text style={styles.statLabel}>Status</Text>
            </View>
            <Badge
              variant={
                totals.balance > 0
                  ? 'destructive'
                  : totals.balance < 0
                  ? 'default'
                  : 'secondary'
              }
              style={[
                styles.statusBadge,
                totals.balance > 0 ? styles.statusBadgePayable :
                totals.balance < 0 ? styles.statusBadgeAdvance : styles.statusBadgeSettled
              ]}
            >
              <Text style={[
                totals.balance > 0 ? styles.statusTextPayable :
                totals.balance < 0 ? styles.statusTextAdvance : styles.statusTextSettled
              ]}>
                {totals.balance > 0
                  ? 'Payable'
                  : totals.balance < 0
                  ? 'Advance'
                  : 'Settled'}
              </Text>
            </Badge>
          </CardContent>
        </Card>
      </View>

      {/* Debit and Credit Sections */}
      <View style={styles.sectionsContainer}>
        {/* Debit Side */}
        <Card style={styles.debitCard}>
          <CardHeader style={styles.debitHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.redDot} />
              <Text style={styles.debitTitle}>Debit</Text>
            </View>
            <Badge variant="outline" style={styles.sectionTotalBadge}>
              <Text style={styles.sectionTotalText}>Total: {formatCurrency(totals.debit)}</Text>
            </Badge>
          </CardHeader>
          <CardContent style={styles.sectionContent}>
            {(!ledgerData.debit || ledgerData.debit.length === 0) ? (
              <View style={styles.emptySection}>
                <FileText size={32} color="#94a3b8" />
                <Text style={styles.emptySectionText}>No purchase entries found</Text>
              </View>
            ) : (
              <FlatList
                data={[...ledgerData.debit].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item, index }) => renderTransactionItem(item, index, true)}
              />
            )}
          </CardContent>
        </Card>

        {/* Credit Side */}
        <Card style={styles.creditCard}>
          <CardHeader style={styles.creditHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.greenDot} />
              <Text style={styles.creditTitle}>Credit</Text>
            </View>
            <Badge variant="outline" style={styles.sectionTotalBadge}>
              <Text style={styles.sectionTotalText}>Total: {formatCurrency(totals.credit)}</Text>
            </Badge>
          </CardHeader>
          <CardContent style={styles.sectionContent}>
            {allCreditEntries.length === 0 ? (
              <View style={styles.emptySection}>
                <CreditCard size={32} color="#94a3b8" />
                <Text style={styles.emptySectionText}>No payment entries found</Text>
                <Text style={styles.emptySectionSubtext}>
                  Cash purchases and payment entries will appear here
                </Text>
              </View>
            ) : (
              <FlatList
                data={[...allCreditEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
                keyExtractor={(item, index) => `${item.type || 'debit'}-${item.id}-${index}`}
                scrollEnabled={false}
                renderItem={({ item, index }) => renderTransactionItem(item, index, false)}
              />
            )}
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 2,
    paddingVertical: 12,
  },
  // Loading styles
  loadingContainer: {
    gap: 16,
  },
  loadingSkeletonLarge: {
    height: 96,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
  },
  loadingGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  loadingSkeletonHalf: {
    flex: 1,
    height: 320,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
  },
  // Empty state styles
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 16,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#f1f5f9',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Card styles
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  cardContent: {
    padding: 16,
  },
  // Summary card styles
  summaryCard: {
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vendorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  vendorIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorDetails: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  vendorDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  balancePositive: {
    color: '#dc2626',
  },
  balanceNegative: {
    color: '#16a34a',
  },
  balanceNeutral: {
    color: '#6b7280',
  },
  badgePayable: {
    borderColor: '#fed7d7',
    backgroundColor: '#fef2f2',
  },
  badgeAdvance: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  badgeSettled: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  badgeTextPayable: {
    color: '#991b1b',
  },
  badgeTextAdvance: {
    color: '#065f46',
  },
  badgeTextSettled: {
    color: '#1e40af',
  },
  // Stats grid styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statContent: {
    padding: 12,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconRed: {
    backgroundColor: '#fee2e2',
  },
  statIconGreen: {
    backgroundColor: '#dcfce7',
  },
  statIconBlue: {
    backgroundColor: '#dbeafe',
  },
  statIconOrange: {
    backgroundColor: '#ffedd5',
  },
  statIconEmerald: {
    backgroundColor: '#d1fae5',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statValueRed: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
  },
  statValueGreen: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16a34a',
  },
  statValueOrange: {
    color: '#ea580c',
  },
  statValueEmerald: {
    color: '#059669',
  },
  statValueBlue: {
    color: '#2563eb',
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  statusBadgePayable: {
    backgroundColor: '#fed7d7',
    borderColor: '#fecaca',
  },
  statusBadgeAdvance: {
    backgroundColor: '#bbf7d0',
    borderColor: '#86efac',
  },
  statusBadgeSettled: {
    backgroundColor: '#bfdbfe',
    borderColor: '#a8c1f5ff',
  },
  statusTextPayable: {
    color: '#991b1b',
    fontSize: 12,
  },
  statusTextAdvance: {
    color: '#065f46',
    fontSize: 12,
  },
  statusTextSettled: {
    color: '#1e40af',
    fontSize: 12,
  },
  // Sections styles
  sectionsContainer: {
    gap: 16,
  },
  debitCard: {
    borderColor: '#fecaca',
  },
  creditCard: {
    borderColor: '#bbf7d0',
  },
  debitHeader: {
    backgroundColor: 'rgba(254, 226, 226, 0.5)',
    borderBottomColor: '#fecaca',
  },
  creditHeader: {
    backgroundColor: 'rgba(220, 252, 231, 0.5)',
    borderBottomColor: '#bbf7d0',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  redDot: {
    width: 8,
    height: 8,
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },
  greenDot: {
    width: 8,
    height: 8,
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  debitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  creditTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#16a34a',
  },
  sectionTotalBadge: {
    backgroundColor: 'white',
    borderColor: '#e5e7eb',
  },
  sectionTotalText: {
    fontSize: 12,
    color: '#4b5563',
  },
  sectionContent: {
    padding: 0,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptySectionText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySectionSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  // Transaction item styles
  transactionItem: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    margin: 8,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  transactionIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionIndexText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  transactionDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionDateText: {
    fontSize: 12,
    color: '#64748b',
  },
  transactionAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  transactionDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  transactionDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionDetailLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  transactionDetailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
    fontFamily: 'monospace',
  },
  transactionDescription: {
    fontSize: 12,
    color: '#475569',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  transactionMethodLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  transactionMethodText: {
    fontSize: 11,
    color: '#ffffff',
  },
  // Badge styles
  badge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeSecondary: {
    backgroundColor: '#a3b2c7ff',
  },
  badgeOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  badgeDestructive: {
    backgroundColor: '#ef4444',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
  },
  skeleton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748b',
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  modalEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalEmptyText: {
    fontSize: 16,
    color: '#64748b',
  },
  modalContent: {
    flex: 1,
  },
  summaryContainer: {
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  grandTotal: {
    color: '#10b981',
  },
  itemsList: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  itemIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitleContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  itemTags: {
    flexDirection: 'row',
    gap: 8,
  },
  itemTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  itemTagText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  itemDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  itemDetail: {
    flex: 1,
  },
  itemDetailLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  itemDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  itemTotal: {
    alignItems: 'flex-end',
  },
  itemDetailTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
});