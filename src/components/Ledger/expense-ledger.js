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
  CreditCard,
  Calendar,
  FileText,
  Package,
  Server,
  IndianRupee,
  ChevronRight,
  ExternalLink
} from 'lucide-react-native';
import { BASE_URL } from '../../config';

// Placeholder components (you should replace these with your actual components)
const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const CardHeader = ({ children, style }) => (
  <View style={[styles.cardHeader, style]}>{children}</View>
);

const CardTitle = ({ children }) => (
  <Text style={styles.cardTitle}>{children}</Text>
);

const CardContent = ({ children }) => (
  <View style={styles.cardContent}>{children}</View>
);

const Badge = ({ children, variant = 'default' }) => {
  const badgeStyles = [
    styles.badge,
    variant === 'secondary' && styles.badgeSecondary,
    variant === 'outline' && styles.badgeOutline
  ];
  
  return (
    <View style={styles.badge}>
      {typeof children === 'string' ? <Text style={styles.badgeText}>{children}</Text> : children}
    </View>
  );
};

export function ExpenseLedger({ ledgerData, loading, selectedExpense, expenses, dateRange }) {
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [itemsToView, setItemsToView] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getPaymentMethodDisplay = (method) => {
    if (!method) return 'Payment';
    const methodMap = {
      Cash: 'Cash Payment',
      'Bank Transfer': 'Bank Payment',
      UPI: 'UPI Payment',
      Cheque: 'Cheque Payment',
      Credit: 'Credit Purchase',
    };
    return methodMap[method] || `${method} Payment`;
  };

  const getPaymentMethodBadge = (method) => {
    const variantMap = {
      Cash: 'default',
      'Bank Transfer': 'secondary',
      UPI: 'outline',
      Cheque: 'default',
      Credit: 'outline',
    };
    return variantMap[method || ''] || 'outline';
  };

  const selectedExpenseData = expenses.find((e) => e._id === selectedExpense);

  const safeAmount = (n) => Math.abs(Number(n || 0));

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
          throw new Error('Failed to fetch transaction details');
        }

        const transaction = await paymentsResponse.json();
        processTransactionData(transaction.payment);
        return;
      }

      const transaction = await response.json();
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
    const prods = (transaction?.products || []).map((p) => ({
      itemType: 'product',
      name: p.product?.name || p.product || '(product)',
      quantity: p.quantity ?? '',
      unitType: p.unitType ?? '',
      pricePerUnit: p.pricePerUnit ?? '',
      description: '',
      amount: Number(p.amount) || 0,
      hsnCode: p.product?.hsn || '',
      gstPercentage: p.gstPercentage,
      gstRate: p.gstPercentage,
      lineTax: p.lineTax,
    }));

    // Process services
    const svcArr = Array.isArray(transaction?.services)
      ? transaction.services
      : Array.isArray(transaction?.service)
      ? transaction.service
      : transaction?.services
      ? [transaction.services]
      : [];
    
    const svcs = svcArr.map((s) => ({
      itemType: 'service',
      name: s.service?.serviceName || s.service || '(service)',
      quantity: '',
      unitType: '',
      pricePerUnit: '',
      description: s.description || '',
      amount: Number(s.amount) || 0,
      sacCode: s.service?.sac || '',
      gstPercentage: s.gstPercentage,
      gstRate: s.gstPercentage,
      lineTax: s.lineTax,
    }));

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
        <View style={styles.loadingGrid}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} style={styles.loadingCard}>
              <CardContent style={styles.loadingCardContent}>
                <View style={styles.skeleton}>
                  <View style={styles.skeletonLine} />
                  <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
                </View>
              </CardContent>
            </Card>
          ))}
        </View>
        
        <Card style={styles.mainLoadingCard}>
          <CardHeader style={styles.loadingHeader}>
            <View style={styles.loadingTitleContainer}>
              <View style={styles.skeletonDot} />
              <View style={styles.skeletonTextMedium} />
            </View>
            <View style={styles.skeletonTextSmall} />
          </CardHeader>
          <CardContent>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonItem} />
            ))}
          </CardContent>
        </Card>
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
          <Text style={styles.emptyTitle}>No Expense Data</Text>
          <Text style={styles.emptyDescription}>
            No expense transaction history found for the selected expense category.
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

  return (
    <ScrollView style={styles.container}>
      <ItemsModal />
      
      {/* Expense Summary Card */}
      <Card style={styles.summaryCard}>
        <CardContent>
          <View style={styles.summaryHeader}>
            <View style={styles.expenseInfo}>
              <View style={styles.expenseIcon}>
                <FileText size={20} color="#4b5563" />
              </View>
              <View style={styles.expenseDetails}>
                <Text style={styles.expenseName}>
                  {selectedExpenseData?.name || 'Expense'}
                </Text>
                <Text style={styles.expenseDate}>
                  Expense Ledger Summary • {dateRange?.from && dateRange?.to
                    ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
                    : formatDate(new Date().toISOString())}
                </Text>
              </View>
            </View>
            
            <View style={styles.balanceContainer}>
              <Text style={[
                styles.balanceAmount,
                ledgerData.totals.balance > 0 ? styles.balancePositive : 
                ledgerData.totals.balance < 0 ? styles.balanceNegative : styles.balanceNeutral
              ]}>
                {formatCurrency(Math.abs(ledgerData.totals.balance))}
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Expense Payments Card */}
      <Card style={styles.paymentsCard}>
        <CardHeader style={styles.paymentsHeader}>
          <View style={styles.paymentsTitleContainer}>
            <View style={styles.greenDot} />
            <Text style={styles.paymentsTitle}>Expense Payments</Text>
          </View>
        </CardHeader>
        
        <CardContent style={styles.paymentsContent}>
          {allCreditEntries.length === 0 ? (
            <View style={styles.emptyPayments}>
              <CreditCard size={32} color="#94a3b8" />
              <Text style={styles.emptyPaymentsText}>No payment entries found</Text>
              <Text style={styles.emptyPaymentsSubtext}>
                Cash expenses and payment entries will appear here
              </Text>
            </View>
          ) : (
            <FlatList
              data={[...allCreditEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
              keyExtractor={(item, index) => `${item.type || 'debit'}-${item.id}-${index}`}
              scrollEnabled={false}
              renderItem={({ item, index }) => {
                const isPurchase = !item.type || item.type === 'debit';
                return (
                  <TouchableOpacity 
                    style={styles.paymentItem}
                    onPress={() => handleViewItems(item)}
                  >
                    <View style={styles.paymentItemHeader}>
                      <View style={styles.paymentIndex}>
                        <Text style={styles.paymentIndexText}>{index + 1}</Text>
                      </View>
                      <View style={styles.paymentInfo}>
                        <Text style={styles.paymentType}>
                          {isPurchase ? 'Expense' : getPaymentMethodDisplay(item.paymentMethod)}
                        </Text>
                        <View style={styles.paymentDate}>
                          <Calendar size={12} color="#64748b" />
                          <Text style={styles.paymentDateText}>{formatDate(item.date)}</Text>
                        </View>
                      </View>
                      <View style={styles.paymentAmountContainer}>
                        <Text style={styles.paymentAmount}>
                          {formatCurrency(safeAmount(item.amount))}
                        </Text>
                        <ExternalLink size={14} color="#3b82f6" />
                      </View>
                    </View>

                    {(item.invoiceNo || item.referenceNumber) && (
                      <View style={styles.paymentDetails}>
                        {item.invoiceNo && (
                          <View style={styles.paymentDetail}>
                            <Text style={styles.paymentDetailLabel}>Invoice:</Text>
                            <Text style={styles.paymentDetailValue}>{item.invoiceNo}</Text>
                          </View>
                        )}
                        {item.referenceNumber && (
                          <View style={styles.paymentDetail}>
                            <Text style={styles.paymentDetailLabel}>Ref:</Text>
                            <Text style={styles.paymentDetailValue}>{item.referenceNumber}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {item.description && (
                      <Text style={styles.paymentDescription}>{item.description}</Text>
                    )}

                    <View style={styles.paymentFooter}>
                      <Text style={styles.paymentMethodLabel}>Payment Method</Text>
                      <Badge variant={getPaymentMethodBadge(item.paymentMethod)}>
                        <Text style={styles.paymentMethodText}>{item.paymentMethod || 'Not Specified'}</Text>
                      </Badge>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  // Loading styles
  loadingContainer: {
    gap: 16,
    padding: 16,
  },
  loadingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  loadingCard: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  loadingCardContent: {
    padding: 12,
  },
  skeleton: {
    gap: 8,
  },
  skeletonLine: {
    height: 16,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
  },
  skeletonLineShort: {
    width: '50%',
  },
  mainLoadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  loadingHeader: {
    backgroundColor: 'rgba(240, 253, 244, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
    padding: 12,
  },
  loadingTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  skeletonDot: {
    width: 8,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
  },
  skeletonTextMedium: {
    height: 16,
    width: 120,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
  },
  skeletonTextSmall: {
    height: 12,
    width: 80,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
  },
  skeletonItem: {
    height: 64,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 8,
  },
  // Empty state styles
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    margin: 16,
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
    margin: 16,
    marginBottom: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseDetails: {
    flex: 1,
  },
  expenseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  expenseDate: {
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
  },
  balancePositive: {
    color: '#dc2626', // red-600
  },
  balanceNegative: {
    color: '#16a34a', // green-600
  },
  balanceNeutral: {
    color: '#6b7280',
  },
  // Payments card styles
  paymentsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  paymentsHeader: {
    backgroundColor: 'rgba(240, 253, 244, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
  },
  paymentsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greenDot: {
    width: 8,
    height: 8,
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  paymentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
  },
  paymentsContent: {
    padding: 0,
  },
  emptyPayments: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyPaymentsText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyPaymentsSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  // Payment item styles
  paymentItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  paymentItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  paymentIndex: {
    width: 32,
    height: 32,
    backgroundColor: '#d1fae5',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIndexText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  paymentDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentDateText: {
    fontSize: 12,
    color: '#64748b',
  },
  paymentAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  paymentDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  paymentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentDetailLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  paymentDetailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
    fontFamily: 'monospace',
  },
  paymentDescription: {
    fontSize: 12,
    color: '#475569',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  paymentMethodLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  paymentMethodText: {
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
    backgroundColor: '#94a3b8',
  },
  badgeOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '500',
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