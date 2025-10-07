import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Package, Server, ChevronRight } from 'react-native-feather';

// Hardcoded Transactions
const defaultTransactions = [
  {
    id: '1',
    type: 'sales',
    partyName: 'Vendor A',
    serviceId: '1',
    date: '2025-10-01',
    amount: 5000,
    totalAmount: 5000,
    narration: 'Sale of products',
    items: [
      {
        itemType: 'product',
        name: 'Product A',
        quantity: 2,
        pricePerUnit: 1000,
        amount: 2000,
      },
      {
        itemType: 'product',
        name: 'Product B',
        quantity: 3,
        pricePerUnit: 1000,
        amount: 3000,
      },
    ],
  },
  {
    id: '2',
    type: 'purchases',
    partyName: 'Vendor B',
    serviceId: '2',
    date: '2025-10-02',
    amount: 3000,
    totalAmount: 3000,
    narration: 'Purchase of goods',
    items: [
      {
        itemType: 'product',
        name: 'Product C',
        quantity: 1,
        pricePerUnit: 3000,
        amount: 3000,
      },
    ],
  },
  {
    id: '3',
    type: 'receipt',
    partyName: 'Client X',
    serviceId: '3',
    date: '2025-10-03',
    amount: 7500,
    totalAmount: 7500,
    narration: 'Payment received',
    items: [
      {
        itemType: 'service',
        name: 'Service Fee',
        amount: 7500,
        description: 'Consulting Fee',
      },
    ],
  },
];

const typeConfig = {
  sales: { label: 'SALE', bgColor: '#ecfdf5', textColor: '#065f46' },
  purchases: { label: 'PURCHASE', bgColor: '#fffbeb', textColor: '#92400e' },
  receipt: { label: 'RECEIPT', bgColor: '#eff6ff', textColor: '#1e40af' },
  payment: { label: 'PAYMENT', bgColor: '#fef2f2', textColor: '#991b1b' },
  journal: { label: 'JOURNAL', bgColor: '#faf5ff', textColor: '#6b21a8' },
};

const inr = n =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
    n,
  );

const safeDate = d => {
  const t = new Date(d);
  return !isNaN(t.getTime()) ? t.toLocaleDateString('en-IN') : '-';
};

const RecentTransactions = () => {
  const [isItemsOpen, setIsItemsOpen] = useState(false);
  const [dialogTx, setDialogTx] = useState(null);

  const openItemsDialog = tx => {
    if (!tx.items || tx.items.length === 0) return;
    setDialogTx(tx);
    setIsItemsOpen(true);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Recent Transactions</Text>
      {defaultTransactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Transactions</Text>
          <Text style={styles.emptyDescription}>
            You haven't added any transactions yet.
          </Text>
        </View>
      ) : (
        defaultTransactions.map(item => {
          const type = typeConfig[item.type] || typeConfig.sales;
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View
                  style={[styles.typeBadge, { backgroundColor: type.bgColor }]}
                >
                  <Text style={[styles.typeText, { color: type.textColor }]}>
                    {type.label}
                  </Text>
                </View>
                <Text style={styles.amount}>
                  {inr(item.amount || item.totalAmount)}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.partyName}>{item.partyName}</Text>
                <Text style={styles.narration}>{item.narration || '—'}</Text>
                <View style={styles.metaContainer}>
                  <Text style={styles.metaValue}>{safeDate(item.date)}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.itemButton}
                onPress={() => openItemsDialog(item)}
                disabled={!item.items || item.items.length === 0}
              >
                <Text style={styles.itemButtonText}>
                  {item.items?.length || 0}{' '}
                  {item.items?.length === 1 ? 'Item' : 'Items'}
                </Text>
                <ChevronRight width={16} height={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {/* Modal */}
      <Modal visible={isItemsOpen} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {dialogTx && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor: typeConfig[dialogTx.type].bgColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        { color: typeConfig[dialogTx.type].textColor },
                      ]}
                    >
                      {typeConfig[dialogTx.type].label}
                    </Text>
                  </View>
                  <Text style={styles.modalAmount}>
                    {inr(dialogTx.totalAmount)}
                  </Text>
                </View>

                <Text style={styles.modalParty}>{dialogTx.partyName}</Text>
                <Text style={styles.modalDate}>{safeDate(dialogTx.date)}</Text>

                <View style={styles.separator} />

                <ScrollView style={{ maxHeight: 300 }}>
                  {dialogTx.items.map((li, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.itemRow,
                        {
                          backgroundColor:
                            idx % 2 === 0 ? '#f9fafb' : '#ffffff',
                        },
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          flex: 1,
                        }}
                      >
                        {li.itemType === 'product' ? (
                          <Package width={16} height={16} color="#6b7280" />
                        ) : (
                          <Server width={16} height={16} color="#6b7280" />
                        )}
                        <View style={{ marginLeft: 8 }}>
                          <Text style={styles.itemName}>{li.name}</Text>
                          {li.description && (
                            <Text style={styles.itemDesc}>
                              {li.description}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Text style={styles.itemMeta}>{li.quantity ?? '—'}</Text>
                      <Text style={styles.itemMeta}>
                        {li.pricePerUnit ? inr(li.pricePerUnit) : '—'}
                      </Text>
                      <Text style={[styles.itemMeta, { fontWeight: '700' }]}>
                        {inr(li.amount)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.totalBar}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>
                    {inr(dialogTx.totalAmount)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsItemsOpen(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { padding: 16, backgroundColor: '#f8fafc' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  amount: { fontSize: 18, fontWeight: '700' },
  cardBody: { marginBottom: 12 },
  partyName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  narration: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  metaContainer: { flexDirection: 'row', gap: 16 },
  metaValue: { fontSize: 12, color: '#4b5563' },
  itemButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 8,
  },
  itemButtonText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalAmount: { fontSize: 18, fontWeight: '700' },
  modalParty: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  modalDate: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginVertical: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemName: { fontSize: 15, fontWeight: '500', color: '#374151' },
  itemDesc: { fontSize: 12, color: '#6b7280' },
  itemMeta: { width: 70, textAlign: 'right', fontSize: 14, color: '#1f2937' },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  totalValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  closeButton: {
    marginTop: 14,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  emptyState: { alignItems: 'center', marginTop: 20 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
    color: '#374151',
  },
  emptyDescription: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default RecentTransactions;
