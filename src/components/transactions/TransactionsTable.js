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


const CustomBadge = ({ children, style, textStyle }) => (
  <View style={[styles.badge, style]}>
    <Text style={[styles.badgeText, textStyle]}>{children}</Text>
  </View>
);


const CustomCard = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const Avatar = ({ name }) => {
  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '??';
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
};

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getBadgeConfig = (type) => {
    switch (type) {
      case 'sales':
        return { style: styles.badgeSales, textStyle: styles.badgeSalesText };
      case 'purchases':
        return { style: styles.badgePurchases, textStyle: styles.badgePurchasesText };
      case 'receipt':
        return { style: styles.badgeReceipt, textStyle: styles.badgeReceiptText };
      case 'payment':
        return { style: styles.badgePayment, textStyle: styles.badgePaymentText };
      case 'journal':
        return { style: styles.badgeJournal, textStyle: styles.badgeJournalText };
      default:
        return { style: styles.badgeDefault, textStyle: styles.badgeDefaultText };
    }
  };

  if (isMobile) {
    return (
      <View style={styles.mobileContainer}>
        {data.map((tx) => {
          const party =
            tx.party?.name ||
            tx.vendor?.vendorName ||
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
          const badgeConfig = getBadgeConfig(tx.type);
          const typeLabel = tx.type
            ? tx.type.charAt(0).toUpperCase() + tx.type.slice(1)
            : '';

          return (
            <CustomCard key={tx._id}>
              
              <View style={styles.topRow}>
              
                <Avatar name={party} />

                <View style={styles.topMiddle}>
                  <Text style={styles.partyName} numberOfLines={1}>
                    {party}
                  </Text>
                  {companyName !== 'N/A' && (
                    <View style={styles.companyRow}>
                      <Text style={styles.companyIcon}>🏢</Text>
                      <Text style={styles.companyName} numberOfLines={1}>
                        {companyName}
                      </Text>
                    </View>
                  )}
                  {(tx.description || tx.narration) ? (
                    <Text style={styles.narration} numberOfLines={1}>
                      {tx.description || tx.narration}
                    </Text>
                  ) : null}
                </View>

               
                <View style={styles.topRight}>
                  <Text style={styles.amountValue}>
                    {formatCurrency(amount)}
                  </Text>
                  
                  <View style={styles.badgeWrapper}>
                    <CustomBadge style={badgeConfig.style} textStyle={badgeConfig.textStyle}>
                      {typeLabel}
                    </CustomBadge>
                  </View>
                </View>
              </View>

              {/* ── Divider ── */}
              <View style={styles.divider} />

              {/* ── Meta row: view items icon + date ── */}
              <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                  {showViewItems && (
                    <TouchableOpacity
                      style={styles.metaChip}
                      onPress={() => onViewItems?.(tx)}
                    >
                      <Text style={styles.metaChipIcon}>📦</Text>
                      <Text style={styles.metaChipText}>Items</Text>
                    </TouchableOpacity>
                  )}
                  {tx.date ? (
                    <View style={styles.metaChip}>
                      {/* <Text style={styles.metaChipIcon}>📅</Text> */}
                      <Text style={styles.metaChipText}>{formatDate(tx.date)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* ── Actions row ── */}
              {!hideActions && (
                <View style={styles.actionsRow}>
                  {/* View Invoice / Preview (primary CTA) */}
                  <TouchableOpacity
                    style={[
                      styles.viewInvoiceButton,
                      tx.type !== 'sales' && styles.viewInvoiceButtonDisabled,
                    ]}
                    onPress={() => onPreview?.(tx)}
                    disabled={tx.type !== 'sales'}
                  >
                    <Text style={styles.viewInvoiceText}>View Invoice</Text>
                    <Text style={styles.viewInvoiceArrow}>›</Text>
                  </TouchableOpacity>

                  <View style={styles.iconActions}>
                    <TouchableOpacity
                      style={styles.iconActionBtn}
                      onPress={() => onEdit?.(tx)}
                    >
                      <Text style={styles.iconActionIcon}>✏️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.iconActionBtn}
                      onPress={() =>
                        Alert.alert(
                          'Delete Transaction',
                          'Are you sure you want to delete this transaction?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => onDelete?.(tx),
                            },
                          ]
                        )
                      }
                    >
                      <Text style={styles.iconActionIcon}>🗑️</Text>
                    </TouchableOpacity>

                    {tx.type === 'sales' && (
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => onSendInvoice?.(tx)}
                      >
                        <Text style={styles.iconActionIcon}>⋮</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </CustomCard>
          );
        })}
      </View>
    );
  }

  // 🖥 Desktop Table View
  return (
    <View style={styles.desktopContainer}>
      <Text style={styles.desktopMessage}>
        Desktop view – Use DataTable component here
      </Text>
    </View>
  );
}

const THEME = '#8b77ff';
const THEME_LIGHT = '#f5f2ff';
const THEME_BORDER = '#c4b8ff';

const styles = StyleSheet.create({
  mobileContainer: {
    padding: 12,
    backgroundColor: '#f4f2ff', 
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: THEME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 1,
    overflow: 'hidden',
  },


  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
    backgroundColor: '#f1efff',
  },
  avatarText: {
    color: '#8b77ff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Top row ───────────────────────────────────────
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  topMiddle: {
    flex: 1,
    justifyContent: 'center',
  },
  partyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 3,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  companyIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  companyName: {
    fontSize: 12,
    color: '#64748b',
  },
  narration: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  topRight: {
    alignItems: 'flex-end', 
    marginLeft: 8,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  
  badgeWrapper: {
    alignSelf: 'flex-end',
  },

  
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-end', 
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  badgeSales: { backgroundColor: '#f0fff5' },
  badgeSalesText: { color: '#15803d' },
  badgePurchases: { backgroundColor: '#dbeafe' },
  badgePurchasesText: { color: '#1d4ed8' },
  badgeReceipt: { backgroundColor: '#fef9c3' },
  badgeReceiptText: { color: '#a16207' },
  badgePayment: { backgroundColor: '#fee2e2' },
  badgePaymentText: { color: '#b91c1c' },
  badgeJournal: { backgroundColor: '#f3e8ff' },
  badgeJournalText: { color: '#7e22ce' },
  badgeDefault: { backgroundColor: '#f1f5f9' },
  badgeDefaultText: { color: '#475569' },

  divider: {
    height: 1,
    backgroundColor: THEME_LIGHT,
    marginHorizontal: 14,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME_LIGHT,
    // borderWidth: 1,
    // borderColor: THEME_BORDER,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginRight: 6,
  },
  metaChipIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  metaChipText: {
    fontSize: 12,
    color: THEME,
    fontWeight: '600',
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: THEME_LIGHT,
  },
  viewInvoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME_LIGHT,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: THEME_BORDER,
  },
  viewInvoiceButtonDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    opacity: 0.5,
  },
  viewInvoiceText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME,
    marginRight: 4,
  },
  viewInvoiceArrow: {
    fontSize: 16,
    color: THEME,
    fontWeight: '700',
    lineHeight: 18,
  },
  iconActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: THEME_LIGHT,
    borderWidth: 1,
    borderColor: THEME_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  iconActionIcon: {
    fontSize: 15,
  },
});