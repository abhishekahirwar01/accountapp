import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { Card, Badge } from 'react-native-paper'; // You can use react-native-paper or create custom components

// Custom Badge component if not using react-native-paper
const CustomBadge = ({ children, style, textStyle }) => (
  <View style={[styles.badge, style]}>
    <Text style={[styles.badgeText, textStyle]}>{children}</Text>
  </View>
);

// Custom Card component
const CustomCard = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

function useMediaQuery() {
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  return screenWidth < 768;
}

export default function TransactionsTable({
  data = [],
  onPreview,
  onEdit,
  onDelete,
  onViewItems,
  onSendInvoice,
  companyMap = new Map(),
  serviceNameById = new Map(),
  hideActions = false,
}) {
  const isMobile = useMediaQuery();

  // Format currency function
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Format date function
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isMobile) {
    // 📱 Mobile Card View
    return (
      <View style={styles.mobileContainer}>
        {data.map((tx) => {
          const party =
            (tx.party?.name) || 
            (tx.vendor?.vendorName) || 
            tx.party || 
            'N/A';
          
          const companyId =
            typeof tx.company === 'object' && tx.company !== null
              ? tx.company._id
              : tx.company ?? null;

          const companyName = companyId
            ? companyMap.get(companyId) ?? 'N/A'
            : 'N/A';

          const showViewItems = tx.type === 'sales' || tx.type === 'purchases';
          const amount = tx.totalAmount ?? tx.amount ?? 0;

          // Badge styles based on type
          const getBadgeStyle = (type) => {
            switch (type) {
              case 'sales':
                return styles.badgeSales;
              case 'purchases':
                return styles.badgePurchases;
              case 'receipt':
                return styles.badgeReceipt;
              case 'payment':
                return styles.badgePayment;
              case 'journal':
                return styles.badgeJournal;
              default:
                return styles.badgeDefault;
            }
          };

          return (
            <CustomCard key={tx._id} style={styles.mobileCard}>
              <View style={styles.cardContent}>
                {/* Header Row - Party + View Items Button */}
                <View style={styles.cardHeader}>
                  <View style={styles.partyInfo}>
                    <Text style={styles.partyName}>{party}</Text>
                    <Text style={styles.description}>
                      {tx.description || tx.narration || ''}
                    </Text>
                  </View>
                  
                  {/* View Items Button */}
                  {showViewItems && (
                    <TouchableOpacity
                      style={styles.viewItemsButton}
                      onPress={() => onViewItems?.(tx)}
                    >
                      <Text style={styles.viewItemsIcon}>📦</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Company */}
                <View style={styles.companyRow}>
                  <Text style={styles.label}>Company: </Text>
                  <Text style={styles.companyName}>{companyName}</Text>
                </View>

                {/* Amount and Date Row */}
                <View style={styles.amountDateRow}>
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Amount</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(amount)}
                    </Text>
                  </View>
                  
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateLabel}>Date</Text>
                    <Text style={styles.dateValue}>
                      {formatDate(tx.date)}
                    </Text>
                  </View>
                </View>

                {/* Type Badge */}
                <CustomBadge style={getBadgeStyle(tx.type)}>
                  {tx.type?.charAt(0).toUpperCase() + tx.type?.slice(1)}
                </CustomBadge>

                {/* Actions */}
                {!hideActions && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.previewButton]}
                      onPress={() => onPreview?.(tx)}
                      disabled={tx.type !== 'sales'}
                    >
                      <Text style={styles.actionButtonText}>Preview</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => onEdit?.(tx)}
                    >
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => {
                        Alert.alert(
                          'Delete Transaction',
                          'Are you sure you want to delete this transaction?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                              text: 'Delete', 
                              style: 'destructive',
                              onPress: () => onDelete?.(tx)
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={[styles.actionButtonText, styles.deleteText]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </CustomCard>
          );
        })}
      </View>
    );
  }

  // 🖥 Desktop Table View - You can use your existing DataTable component here
  // For now, we'll show a simple message or you can integrate your DataTable
  return (
    <View style={styles.desktopContainer}>
      <Text style={styles.desktopMessage}>
        Desktop view - Use DataTable component here
      </Text>
      {/* You can integrate your existing DataTable component here */}
      {/* <DataTable
        data={data}
        companyMap={companyMap}
        serviceNameById={serviceNameById}
        onViewItems={onViewItems}
        onPreview={onPreview}
        onEdit={onEdit}
        onDelete={onDelete}
      /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  desktopContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopMessage: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mobileCard: {
    marginHorizontal: 0,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  partyInfo: {
    flex: 1,
    marginRight: 8,
  },
  partyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  viewItemsButton: {
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    marginLeft: 8,
  },
  viewItemsIcon: {
    fontSize: 16,
  },
  companyRow: {
    flexDirection: 'row',
    // alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  companyName: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    flexWrap: 'wrap',
  },
  amountDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  amountContainer: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    color: '#6b7280',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  badgeSales: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  badgePurchases: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  badgeReceipt: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  badgePayment: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  badgeJournal: {
    backgroundColor: '#f3e8ff',
    borderColor: '#e9d5ff',
  },
  badgeDefault: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  previewButton: {
    backgroundColor: '#3b82f6',
  },
  editButton: {
    backgroundColor: '#6b7280',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  deleteText: {
    color: '#dc2626',
  },
}); 