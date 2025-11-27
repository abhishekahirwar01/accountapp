import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import {
  Card,
  Badge,
  Button,
  DataTable,
  Portal,
  Dialog,
  Chip,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

/* ---------- helpers ---------- */
const inr = n => {
  const number = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `₹${number.toLocaleString('en-IN')}`;
};

const safeDate = d => {
  const t = d ? new Date(d) : null;
  return t && !isNaN(t.getTime())
    ? new Intl.DateTimeFormat('en-IN').format(t)
    : '-';
};

const capitalizeWords = str => {
  if (!str) return '';
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

// amount per type/shape
const getAmount = tx => {
  switch (tx.type) {
    case 'sales':
      return Number(tx?.amount ?? tx?.totalAmount ?? 0);
    case 'purchases':
      return Number(tx?.totalAmount ?? tx?.amount ?? 0);
    case 'receipt':
    case 'payment':
      return Number(tx?.amount ?? tx?.totalAmount ?? 0);
    case 'journal':
      return 0;
    default:
      return Number(tx?.amount ?? tx?.totalAmount ?? 0);
  }
};

// A single normalized item for the dialog
const getItems = (tx, svcMap) => {
  const productsArr = Array.isArray(tx?.products) ? tx.products : [];
  const servicesArr = Array.isArray(tx?.services)
    ? tx.services
    : Array.isArray(tx?.service)
    ? tx.service
    : tx?.service
    ? [tx.service]
    : [];

  const normalized = [];

  for (const p of productsArr) {
    const name =
      (typeof p.product === 'object' &&
        (p.product?.name || p.product?.productName)) ||
      (typeof tx.product === 'object' &&
        (tx.product?.name || tx.product?.productName)) ||
      '(product)';
    normalized.push({
      itemType: 'product',
      name: capitalizeWords(name),
      quantity: p?.quantity ?? '',
      pricePerUnit: Number(p?.pricePerUnit ?? 0),
      amount: Number(p?.amount ?? 0),
      description: '',
    });
  }

  for (const s of servicesArr) {
    const ref = s?.serviceName ?? s?.service;
    let sName = '(service)';

    if (ref && typeof ref === 'object') {
      sName =
        ref.serviceName ||
        ref.name ||
        (ref._id ? svcMap?.get(String(ref._id)) : '') ||
        '(service)';
    } else if (typeof ref === 'string') {
      sName = svcMap?.get(String(ref)) || '(service)';
    } else if (typeof s?.serviceName === 'string') {
      sName = svcMap?.get(String(s.serviceName)) || '(service)';
    }

    normalized.push({
      itemType: 'service',
      name: capitalizeWords(sName),
      quantity: '',
      pricePerUnit: 0,
      amount: Number(s?.amount ?? 0),
      description: s?.description || '',
    });
  }

  if (normalized.length === 0) {
    return { label: '—', icon: 'none', items: [] };
  }

  const first = normalized[0];
  const extra = normalized.length - 1;
  const label = extra > 0 ? `${first.name} +${extra} more` : first.name;

  return { label, icon: first.itemType, items: normalized };
};

const getPartyName = tx => {
  if (tx.type === 'journal') return 'Journal Entry';
  let partyName = '';
  if (tx.party && typeof tx.party === 'object') {
    partyName = tx.party.name || 'Party';
  } else if (tx.vendor && typeof tx.vendor === 'object') {
    partyName = tx.vendor.vendorName || 'Vendor';
  }
  return capitalizeWords(partyName);
};

const RecentTransactions = ({ transactions, serviceNameById }) => {
  const [isItemsOpen, setIsItemsOpen] = useState(false);
  const [dialogItems, setDialogItems] = useState([]);
  const [dialogTitle, setDialogTitle] = useState('Item Details');
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const typeStyles = {
    sales: { backgroundColor: '#dcfce7', color: '#166534' },
    purchases: { backgroundColor: '#ffedd5', color: '#c2410c' },
    receipt: { backgroundColor: '#dbeafe', color: '#1e40af' },
    payment: { backgroundColor: '#fee2e2', color: '#dc2626' },
    journal: { backgroundColor: '#f3e8ff', color: '#7c3aed' },
  };

  const getTypeStyle = type => {
    return typeStyles[type] || { backgroundColor: '#f3f4f6', color: '#374151' };
  };

  const openItemsDialog = (tx, items) => {
    if (items.length === 0) return;
    setDialogItems(items);
    const party = getPartyName(tx);
    const date = safeDate(tx?.date);
    setDialogTitle(party ? `Items · ${party} · ${date}` : `Items · ${date}`);
    setIsItemsOpen(true);
  };

  const renderTransactionItem = tx => {
    const item = getItems(tx, serviceNameById);
    const amt = getAmount(tx);
    const clickable = item.items.length > 0;
    const partyName = getPartyName(tx);
    const description = tx.description || tx.narration;
    const typeStyle = getTypeStyle(tx.type);

    if (isMobile) {
      return (
        <Card key={tx._id} style={styles.mobileCard}>
          <Card.Content>
            <View style={styles.mobileHeader}>
              <View style={styles.mobilePartyInfo}>
                <Text style={styles.partyName}>{partyName}</Text>
                {description ? (
                  <Text style={styles.description}>{description}</Text>
                ) : null}
              </View>
              <View style={styles.mobileAmount}>
                <Text style={styles.amountText}>{inr(amt)}</Text>
                <Text style={styles.dateText}>{safeDate(tx.date)}</Text>
              </View>
            </View>

            <TouchableOpacity
              disabled={!clickable}
              onPress={() => openItemsDialog(tx, item.items)}
              style={styles.itemSection}
            >
              <View style={styles.itemRow}>
                {item.icon !== 'none' && (
                  <Text style={styles.itemIcon}>
                    {item.icon === 'product' ? '📦' : '🖥️'}
                  </Text>
                )}
                <View style={styles.itemText}>
                  <Text
                    style={[
                      styles.itemLabel,
                      clickable && styles.clickableItem,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {clickable && (
                    <Text style={styles.tapHint}>Tap to view details →</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.badgeContainer}>
              <Chip
                style={[
                  styles.typeChip,
                  { backgroundColor: typeStyle.backgroundColor },
                ]}
                textStyle={[styles.chipText, { color: typeStyle.color }]}
              >
                {tx.type}
              </Chip>
            </View>
          </Card.Content>
        </Card>
      );
    }

    // Desktop table row
    return (
      <DataTable.Row key={tx._id}>
        <DataTable.Cell>
          <View style={styles.partyCell}>
            <Text style={styles.partyName}>{partyName}</Text>
            {description ? (
              <Text style={styles.description} numberOfLines={1}>
                {description}
              </Text>
            ) : null}
          </View>
        </DataTable.Cell>

        <DataTable.Cell>
          {item.icon !== 'none' ? (
            <TouchableOpacity
              disabled={!clickable}
              onPress={() => openItemsDialog(tx, item.items)}
              style={styles.itemCell}
            >
              <View style={styles.itemRow}>
                <Text style={styles.itemIcon}>
                  {item.icon === 'product' ? '📦' : '🖥️'}
                </Text>
                <Text
                  style={[styles.itemLabel, clickable && styles.clickableItem]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <Text>—</Text>
          )}
        </DataTable.Cell>

        <DataTable.Cell>
          <Chip
            style={[
              styles.typeChip,
              { backgroundColor: typeStyle.backgroundColor },
            ]}
            textStyle={[styles.chipText, { color: typeStyle.color }]}
          >
            {tx.type}
          </Chip>
        </DataTable.Cell>

        <DataTable.Cell>
          <Text style={styles.dateText}>{safeDate(tx.date)}</Text>
        </DataTable.Cell>

        <DataTable.Cell numeric>
          <Text style={styles.amountText}>{inr(amt)}</Text>
        </DataTable.Cell>
      </DataTable.Row>
    );
  };

  const renderItemsDialog = () => (
    <Portal>
      <Dialog
        visible={isItemsOpen}
        onDismiss={() => setIsItemsOpen(false)}
        style={styles.dialog}
      >
        <Dialog.Title style={styles.dialogTitle}>{dialogTitle}</Dialog.Title>
        <Dialog.Content style={styles.dialogContent}>
          <ScrollView
            style={styles.dialogScrollView}
            showsVerticalScrollIndicator={true}
          >
            {isMobile ? (
              // Mobile items view
              <View style={styles.mobileItems}>
                {dialogItems.map((li, idx) => {
                  const isService = li.itemType === 'service';
                  const qty = !isService && li.quantity ? li.quantity : '—';
                  const rate = !isService ? inr(li.pricePerUnit) : '—';
                  const total = inr(li.amount);

                  return (
                    <Card key={idx} style={styles.mobileItemCard}>
                      <Card.Content>
                        <View style={styles.mobileItemHeader}>
                          <Text style={styles.itemIcon}>
                            {isService ? '🖥️' : '📦'}
                          </Text>
                          <View style={styles.mobileItemInfo}>
                            <Text style={styles.itemName} numberOfLines={1}>
                              {li.name}
                            </Text>
                            <Chip
                              style={styles.itemTypeChip}
                              textStyle={styles.itemTypeChipText}
                            >
                              {li.itemType}
                            </Chip>
                          </View>
                        </View>

                        {isService && li.description ? (
                          <Text style={styles.serviceDescription}>
                            {li.description}
                          </Text>
                        ) : null}

                        <View style={styles.mobileItemDetails}>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Quantity</Text>
                            <Text style={styles.detailValue}>{qty}</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Price/Unit</Text>
                            <Text style={styles.detailValue}>{rate}</Text>
                          </View>
                          <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total Amount</Text>
                            <Text style={styles.totalValue}>{total}</Text>
                          </View>
                        </View>
                      </Card.Content>
                    </Card>
                  );
                })}
              </View>
            ) : (
              // Desktop table view
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title style={styles.tableHeader}>
                    Item
                  </DataTable.Title>
                  <DataTable.Title style={styles.tableHeader}>
                    Type
                  </DataTable.Title>
                  <DataTable.Title numeric style={styles.tableHeader}>
                    Qty
                  </DataTable.Title>
                  <DataTable.Title numeric style={styles.tableHeader}>
                    Price/Unit
                  </DataTable.Title>
                  <DataTable.Title numeric style={styles.tableHeader}>
                    Total
                  </DataTable.Title>
                </DataTable.Header>

                {dialogItems.map((li, idx) => {
                  const isService = li.itemType === 'service';
                  const qty = !isService && li.quantity ? li.quantity : '—';
                  const rate = !isService ? inr(li.pricePerUnit) : '—';
                  const total = inr(li.amount);

                  return (
                    <DataTable.Row key={idx}>
                      <DataTable.Cell>
                        <View style={styles.itemCell}>
                          <Text style={styles.itemIcon}>
                            {isService ? '🖥️' : '📦'}
                          </Text>
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemName} numberOfLines={1}>
                              {li.name}
                            </Text>
                            {isService && li.description ? (
                              <Text
                                style={styles.serviceDescription}
                                numberOfLines={1}
                              >
                                {li.description}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </DataTable.Cell>

                      <DataTable.Cell>
                        <Text style={styles.capitalize}>{li.itemType}</Text>
                      </DataTable.Cell>

                      <DataTable.Cell numeric>{qty}</DataTable.Cell>

                      <DataTable.Cell numeric>{rate}</DataTable.Cell>

                      <DataTable.Cell numeric>
                        <Text style={styles.totalAmount}>{total}</Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  );
                })}
              </DataTable>
            )}
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setIsItemsOpen(false)}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const renderEmptyState = () => (
    <Card style={styles.emptyCard}>
      <Card.Content style={styles.emptyContent}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No transactions</Text>
        <Text style={styles.emptyText}>
          Your recent transactions will appear here
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Card style={styles.mainCard}>
        <Card.Content style={styles.cardHeader}>
          <Text style={styles.title}>Recent Transactions</Text>
          <Text style={styles.subtitle}>
            A summary of your most recent financial activities.
          </Text>
        </Card.Content>

        <ScrollView
          style={styles.scrollArea}
          showsVerticalScrollIndicator={false}
        >
          {/* Desktop Table View */}
          {!isMobile && (
            <DataTable style={styles.desktopTable}>
              <DataTable.Header>
                <DataTable.Title style={styles.tableHeader}>
                  Party
                </DataTable.Title>
                <DataTable.Title style={styles.tableHeader}>
                  Item
                </DataTable.Title>
                <DataTable.Title style={styles.tableHeader}>
                  Type
                </DataTable.Title>
                <DataTable.Title style={styles.tableHeader}>
                  Date
                </DataTable.Title>
                <DataTable.Title numeric style={styles.tableHeader}>
                  Amount
                </DataTable.Title>
              </DataTable.Header>

              {transactions?.length > 0 ? (
                transactions.map(tx => renderTransactionItem(tx))
              ) : (
                <DataTable.Row>
                  <DataTable.Cell>
                    <View style={styles.noDataCell}>
                      <Text style={styles.noDataText}>
                        No recent transactions.
                      </Text>
                    </View>
                  </DataTable.Cell>
                </DataTable.Row>
              )}
            </DataTable>
          )}

          {/* Mobile Card View */}
          {isMobile && (
            <View style={styles.mobileContainer}>
              {transactions?.length > 0
                ? transactions.map(tx => renderTransactionItem(tx))
                : renderEmptyState()}
            </View>
          )}
        </ScrollView>

        <Card.Actions style={styles.cardActions}>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Transactions')}
            style={styles.viewAllButton}
            labelStyle={styles.viewAllButtonText}
          >
            View All Transactions →
          </Button>
        </Card.Actions>
      </Card>

      {renderItemsDialog()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainCard: {
    flex: 1,
    margin: 8,
    elevation: 2,
    borderRadius: 12,
  },
  cardHeader: {
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  scrollArea: {
    flex: 1,
  },
  desktopTable: {
    flex: 1,
  },
  tableHeader: {
    fontWeight: 'bold',
  },
  mobileContainer: {
    padding: 8,
  },
  mobileCard: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 8,
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mobilePartyInfo: {
    flex: 1,
    marginRight: 8,
  },
  partyCell: {
    flex: 1,
  },
  partyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  description: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  mobileAmount: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  itemSection: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCell: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  itemText: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  clickableItem: {
    color: '#2196F3',
  },
  tapHint: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 2,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  typeChip: {
    marginRight: 8,
    height: 24,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  viewAllButton: {
    marginRight: 8,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: Dimensions.get('window').height * 0.8,
    margin: 20,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dialogContent: {
    paddingHorizontal: 0,
  },
  dialogScrollView: {
    maxHeight: 400,
  },
  itemName: {
    fontWeight: '500',
    fontSize: 14,
    color: '#1f2937',
  },
  capitalize: {
    textTransform: 'capitalize',
    color: '#374151',
  },
  serviceDescription: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#059669',
  },
  mobileItems: {
    paddingHorizontal: 8,
  },
  mobileItemCard: {
    marginBottom: 8,
    borderRadius: 8,
  },
  mobileItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mobileItemInfo: {
    flex: 1,
    marginLeft: 8,
  },
  itemTypeChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    height: 20,
  },
  itemTypeChipText: {
    fontSize: 10,
  },
  mobileItemDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  emptyCard: {
    margin: 16,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: 8,
    color: '#374151',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
  },
  noDataCell: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
  },
  noDataText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
  },
});

export default RecentTransactions;
