import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Modal, Portal, Card, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ItemDetailsDialog = ({
  visible,
  onDismiss,
  items,
  formatIndianNumber,
}) => {
  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;

    items.forEach((item) => {
      const amount = Number(item.amount || 0);
      subtotal += amount;

      const lineTax = item.lineTax;
      if (lineTax !== undefined && lineTax !== null) {
        taxTotal += Number(lineTax);
      } else {
        const gstRate = item.gstPercentage || item.gstRate || item.gst || 0;
        const taxAmount = (amount * gstRate) / 100;
        taxTotal += taxAmount;
      }
    });

    grandTotal = subtotal + taxTotal;
    return { subtotal, taxTotal, grandTotal };
  };

  const totals = calculateTotals();

  const renderItem = (item, index) => {
    const isService = item.itemType === 'service';
    const quantity = !isService && item.quantity
      ? `${item.quantity} ${item.unitType || 'Piece'}`
      : '—';
    const pricePerUnit = !isService
      ? formatIndianNumber(Number(item.pricePerUnit || 0))
      : '—';
    const total = formatIndianNumber(Number(item.amount || 0));
    const hsnSacCode = isService ? item.sacCode : item.hsnCode;

    return (
      <Card key={index} style={styles.itemCard}>
        <Card.Content>
          {/* Item Header */}
          <View style={styles.itemHeader}>
            <View style={styles.itemTypeIcon}>
              {isService ? (
                <Icon name="server" size={20} color="#6b7280" />
              ) : (
                <Icon name="package-variant" size={20} color="#6b7280" />
              )}
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name || '—'}</Text>
              <View style={styles.itemTags}>
                <Text style={styles.itemTypeTag}>
                  {isService ? 'Service' : 'Product'}
                </Text>
                {hsnSacCode && (
                  <Text style={styles.codeTag}>
                    {isService ? 'SAC' : 'HSN'}: {hsnSacCode}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Service Description */}
          {isService && item.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
          )}

          {/* Item Details Grid */}
          <View style={styles.detailsGrid}>
            {/* Quantity */}
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Quantity</Text>
              <Text style={styles.detailValue}>{quantity}</Text>
            </View>

            {/* Price/Unit */}
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Price/Unit</Text>
              <Text style={styles.detailValue}>₹{pricePerUnit}</Text>
            </View>
          </View>

          {/* Total */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Item Total</Text>
            <Text style={styles.totalAmount}>₹{total}</Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Card style={styles.dialogCard}>
          {/* Header */}
          <Card.Content style={styles.header}>
            <Text style={styles.title}>Item Details</Text>
            <Text style={styles.subtitle}>
              A detailed list of all items in this transaction
            </Text>
          </Card.Content>

          {/* Summary Stats */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>
                  ₹{formatIndianNumber(totals.subtotal)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Tax Total</Text>
                <Text style={styles.summaryValue}>
                  ₹{formatIndianNumber(totals.taxTotal)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Grand Total</Text>
                <Text style={[styles.summaryValue, styles.grandTotal]}>
                  ₹{formatIndianNumber(totals.grandTotal)}
                </Text>
              </View>
            </View>
          </View>

          {/* Items List */}
          <ScrollView style={styles.itemsList}>
            {items.length > 0 ? (
              items.map((item, index) => renderItem(item, index))
            ) : (
              <View style={styles.noItemsContainer}>
                <Icon name="file-document-outline" size={48} color="#9ca3af" />
                <Text style={styles.noItemsText}>No items found</Text>
              </View>
            )}
          </ScrollView>

          {/* Close Button */}
          <Card.Actions style={styles.actions}>
            <Button mode="contained" onPress={onDismiss}>
              Close
            </Button>
          </Card.Actions>
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    padding: 20,
  },
  dialogCard: {
    maxHeight: Dimensions.get('window').height * 0.8,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryContainer: {
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  grandTotal: {
    color: '#16a34a',
  },
  itemsList: {
    maxHeight: 400,
    padding: 16,
  },
  itemCard: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemTags: {
    flexDirection: 'row',
    gap: 8,
  },
  itemTypeTag: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeTag: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  descriptionContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  detailsGrid: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailColumn: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  noItemsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noItemsText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
  actions: {
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});

export default ItemDetailsDialog;