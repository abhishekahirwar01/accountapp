import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Modal,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Receipt,
  Package,
  Server,
  ArrowRight,
  Calendar,
} from 'lucide-react-native';

/* ---------- helpers ---------- */
const inr = n => {
  const number = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `₹${number.toLocaleString('en-IN')}`;
};

const safeDate = d => {
  const t = d ? new Date(d) : null;
  return t && !isNaN(t.getTime())
    ? new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(t)
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
      // Journal entries store their amount under `amount` or `totalAmount`.
      return Number(tx?.amount ?? tx?.totalAmount ?? 0);
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

const RecentTransactions = ({
  transactions,
  serviceNameById,
  onRefresh,
  refreshing = false,
}) => {
  const [isItemsOpen, setIsItemsOpen] = useState(false);
  const [dialogItems, setDialogItems] = useState([]);
  const [dialogTitle, setDialogTitle] = useState('Item Details');
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const typeStyles = {
    sales: {
      backgroundColor: '#f0fdf4',
      color: '#15803d',
      borderColor: '#bbf7d0',
    },
    purchases: {
      backgroundColor: '#fef3f2',
      color: '#b91c1c',
      borderColor: '#fecaca',
    },
    receipt: {
      backgroundColor: '#eff6ff',
      color: '#1e40af',
      borderColor: '#bfdbfe',
    },
    payment: {
      backgroundColor: '#fef9c3',
      color: '#a16207',
      borderColor: '#fde68a',
    },
    journal: {
      backgroundColor: '#f5f3ff',
      color: '#6b21a8',
      borderColor: '#e9d5ff',
    },
  };

  const getTypeStyle = type => {
    return (
      typeStyles[type] || {
        backgroundColor: '#f9fafb',
        color: '#4b5563',
        borderColor: '#e5e7eb',
      }
    );
  };

  const openItemsDialog = (tx, items) => {
    if (items.length === 0) return;
    setDialogItems(items);
    const party = getPartyName(tx);
    const date = safeDate(tx?.date);
    setDialogTitle(party ? `${party} · ${date}` : date);
    setIsItemsOpen(true);
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.tableHeaderCell, { flex: 2.5 }]}>
        <Text style={styles.tableHeaderText}>Party</Text>
      </View>
      <View style={[styles.tableHeaderCell, { flex: 2 }]}>
        <Text style={styles.tableHeaderText}>Item</Text>
      </View>
      <View style={[styles.tableHeaderCell, { flex: 1 }]}>
        <Text style={styles.tableHeaderText}>Type</Text>
      </View>
      <View style={[styles.tableHeaderCell, { flex: 1 }]}>
        <Text style={styles.tableHeaderText}>Date</Text>
      </View>
      <View style={[styles.tableHeaderCell, styles.numericCell, { flex: 1 }]}>
        <Text style={styles.tableHeaderText}>Amount</Text>
      </View>
    </View>
  );

  const TableRow = ({ tx }) => {
    const item = getItems(tx, serviceNameById);
    const amt = getAmount(tx);
    const clickable = item.items.length > 0;
    const partyName = getPartyName(tx);
    const description = tx.description || tx.narration;
    const typeStyle = getTypeStyle(tx.type);

    return (
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { flex: 2.5 }]}>
          <View style={styles.partyCell}>
            <Text style={styles.partyName} numberOfLines={1}>
              {partyName}
            </Text>
            {description ? (
              <Text style={styles.description} numberOfLines={1}>
                {description}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.tableCell, { flex: 2 }]}>
          {item.icon !== 'none' ? (
            <TouchableOpacity
              disabled={!clickable}
              onPress={() => openItemsDialog(tx, item.items)}
              style={[styles.itemCell, clickable && styles.clickableCell]}
              activeOpacity={clickable ? 0.7 : 1}
            >
              <View style={styles.itemRow}>
                {item.icon === 'product' ? (
                  <Package size={16} color="#64748b" strokeWidth={1.5} />
                ) : (
                  <Server size={16} color="#64748b" strokeWidth={1.5} />
                )}
                <Text
                  style={[styles.itemLabel, clickable && styles.clickableText]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <Text style={styles.noItemsText}>—</Text>
          )}
        </View>

        <View style={[styles.tableCell, { flex: 1 }]}>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: typeStyle.backgroundColor,
                borderColor: typeStyle.borderColor,
              },
            ]}
          >
            <Text style={[styles.typeBadgeText, { color: typeStyle.color }]}>
              {tx.type?.charAt(0).toUpperCase() + tx.type?.slice(1)}
            </Text>
          </View>
        </View>

        <View style={[styles.tableCell, { flex: 1 }]}>
          <View style={styles.dateCell}>
            <Calendar size={14} color="#64748b" strokeWidth={1.5} />
            <Text style={styles.dateText}>{safeDate(tx.date)}</Text>
          </View>
        </View>

        <View style={[styles.tableCell, styles.numericCell, { flex: 1 }]}>
          <Text
            style={[
              styles.amountText,
              amt >= 0 ? styles.positiveAmount : styles.negativeAmount,
            ]}
          >
            {inr(Math.abs(amt))}
          </Text>
        </View>
      </View>
    );
  };

  const MobileTransactionCard = ({ tx }) => {
    const item = getItems(tx, serviceNameById);
    const amt = getAmount(tx);
    const clickable = item.items.length > 0;
    const partyName = getPartyName(tx);
    const description = tx.description || tx.narration;
    const typeStyle = getTypeStyle(tx.type);

    return (
      <TouchableOpacity
        key={tx._id}
        style={styles.mobileCard}
        activeOpacity={0.7}
        onPress={() => clickable && openItemsDialog(tx, item.items)}
      >
        <View style={styles.mobileCardContent}>
          <View style={styles.mobileHeader}>
            <View style={styles.mobilePartyInfo}>
              <Text style={styles.partyName} numberOfLines={1}>
                {partyName}
              </Text>
              {description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {description}
                </Text>
              ) : null}
            </View>
            <View style={styles.mobileAmount}>
              <Text
                style={[
                  styles.amountText,
                  amt >= 0 ? styles.positiveAmount : styles.negativeAmount,
                ]}
              >
                {inr(Math.abs(amt))}
              </Text>
              <View style={styles.dateContainer}>
                <Calendar size={12} color="#64748b" strokeWidth={1.5} />
                <Text style={styles.dateText}>{safeDate(tx.date)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.itemSection}>
            <View style={styles.itemRow}>
              {item.icon !== 'none' ? (
                <>
                  {item.icon === 'product' ? (
                    <Package size={16} color="#64748b" strokeWidth={1.5} />
                  ) : (
                    <Server size={16} color="#64748b" strokeWidth={1.5} />
                  )}
                  <View style={styles.itemText}>
                    <Text
                      style={[
                        styles.itemLabel,
                        clickable && styles.clickableText,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {clickable && (
                      <Text style={styles.tapHint}>Tap for details</Text>
                    )}
                  </View>
                </>
              ) : (
                <Text style={styles.noItemsText}>No items</Text>
              )}
            </View>
          </View>

          <View style={styles.badgeContainer}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: typeStyle.backgroundColor,
                  borderColor: typeStyle.borderColor,
                },
              ]}
            >
              <Text style={[styles.typeBadgeText, { color: typeStyle.color }]}>
                {tx.type?.charAt(0).toUpperCase() + tx.type?.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ItemsDialog = () => {
    const renderItem = (li, index) => {
      const isService = li.itemType === 'service';
      const qty = !isService && li.quantity ? li.quantity : '—';
      const rate = !isService ? inr(li.pricePerUnit) : '—';
      const total = inr(li.amount);

      return (
        <View
          style={styles.dialogItemCard}
          key={`${li.itemType}-${li.name}-${index}`}
        >
          <View style={styles.dialogItemContent}>
            <View style={styles.dialogItemHeader}>
              {isService ? (
                <Server size={18} color="#475569" strokeWidth={1.5} />
              ) : (
                <Package size={18} color="#475569" strokeWidth={1.5} />
              )}
              <View style={styles.dialogItemInfo}>
                <Text style={styles.dialogItemName} numberOfLines={2}>
                  {li.name}
                </Text>
                <View style={styles.itemTypeBadge}>
                  <Text style={styles.itemTypeBadgeText}>
                    {li.itemType?.charAt(0).toUpperCase() +
                      li.itemType?.slice(1)}
                  </Text>
                </View>
              </View>
            </View>

            {isService && li.description ? (
              <Text style={styles.serviceDescription} numberOfLines={3}>
                {li.description}
              </Text>
            ) : null}

            <View style={styles.dialogItemDetails}>
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
          </View>
        </View>
      );
    };

    return (
      <Modal
        visible={isItemsOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsItemsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {dialogTitle}
              </Text>
              <TouchableOpacity
                onPress={() => setIsItemsOpen(false)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.dialogItemsList}>
                {dialogItems.map((li, idx) => renderItem(li, idx))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setIsItemsOpen(false)}
                style={styles.closeModalButton}
                activeOpacity={0.7}
              >
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyCard}>
      <View style={styles.emptyContent}>
        <Receipt size={48} color="#94a3b8" strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>No transactions yet</Text>
        <Text style={styles.emptyText}>
          Your recent transactions will appear here
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.mainCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>Recent Transactions</Text>
          <Text style={styles.subtitle}>
            Overview of your latest financial activity
          </Text>
        </View>

        <ScrollView
          style={styles.scrollArea}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
                tintColor="#3b82f6"
              />
            ) : undefined
          }
        >
          {/* Desktop Table View */}
          {!isMobile && (
            <View style={styles.desktopTable}>
              <TableHeader />
              {transactions?.length > 0
                ? transactions.map(tx => <TableRow key={tx._id} tx={tx} />)
                : renderEmptyState()}
            </View>
          )}

          {/* Mobile Card View */}
          {isMobile && (
            <View style={styles.mobileContainer}>
              {transactions?.length > 0
                ? transactions.map(tx => (
                    <MobileTransactionCard key={tx._id} tx={tx} />
                  ))
                : renderEmptyState()}
            </View>
          )}
        </ScrollView>

        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Transactions')}
            style={styles.viewAllButton}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllButtonText}>View All Transactions</Text>
            <ArrowRight
              size={16}
              color="#3b82f6"
              strokeWidth={2}
              style={styles.arrowIcon}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ItemsDialog />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mainCard: {
    flex: 1,
    margin: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  scrollArea: {
    flex: 1,
  },
  desktopTable: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  tableHeaderCell: {
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  numericCell: {
    alignItems: 'flex-end',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: 68,
    backgroundColor: '#ffffff',
  },
  tableCell: {
    paddingHorizontal: 8,
  },
  partyCell: {
    flex: 1,
  },
  partyName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 3,
    lineHeight: 18,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  positiveAmount: {
    color: '#059669',
  },
  negativeAmount: {
    color: '#dc2626',
  },
  dateCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#64748b',
  },
  itemCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  clickableCell: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#334155',
    flex: 1,
  },
  clickableText: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  noItemsText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  mobileContainer: {
    padding: 16,
  },
  mobileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  mobileCardContent: {
    padding: 16,
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mobilePartyInfo: {
    flex: 1,
    marginRight: 12,
  },
  mobileAmount: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  itemSection: {
    marginBottom: 12,
  },
  itemText: {
    flex: 1,
  },
  tapHint: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 2,
    fontWeight: '500',
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  cardActions: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fafafa',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
    letterSpacing: -0.1,
  },
  arrowIcon: {
    marginLeft: 6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    marginRight: 16,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#475569',
    lineHeight: 20,
  },
  modalBody: {
    maxHeight: 400,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'flex-end',
    backgroundColor: '#fafafa',
  },
  closeModalButton: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
  },
  closeModalButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  // Dialog item styles
  dialogItemsList: {
    padding: 20,
  },
  dialogItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  dialogItemContent: {
    padding: 16,
  },
  dialogItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dialogItemInfo: {
    flex: 1,
  },
  dialogItemName: {
    fontWeight: '500',
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  itemTypeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  itemTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.3,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 18,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
  },
  dialogItemDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  // Empty state
  emptyCard: {
    margin: 24,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyContent: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
    color: '#334155',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default RecentTransactions;
