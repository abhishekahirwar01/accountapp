import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, ScrollView } from 'react-native';
import { Package, Server, ArrowRight, ChevronRight } from 'react-native-feather';

// Hardcoded data
const transactions = [
  {
    id: '1',
    type: 'sales',
    partyName: 'Vendor A',
    serviceId: '1',
    date: '2025-10-01',
    amount: 5000,
    totalAmount: 5000,
    narration: 'Sale of products',
    items: [{ name: 'Product A', amount: 2000 }, { name: 'Product B', amount: 3000 }],
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
    items: [{ name: 'Product C', amount: 3000 }],
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
    items: [{ name: 'Service Fee', amount: 7500 }],
  },
];

// Hardcoded service names
const serviceNameById = new Map([
  ['1', 'Product Sale'],
  ['2', 'Product Purchase'],
  ['3', 'Service Payment'],
]);

const typeConfig = {
  sales: { label: 'SALE', color: '#10b981', bgColor: '#ecfdf5', textColor: '#065f46' },
  purchases: { label: 'PURCHASE', color: '#f59e0b', bgColor: '#fffbeb', textColor: '#92400e' },
  receipt: { label: 'RECEIPT', color: '#3b82f6', bgColor: '#eff6ff', textColor: '#1e40af' },
  payment: { label: 'PAYMENT', color: '#ef4444', bgColor: '#fef2f2', textColor: '#991b1b' },
  journal: { label: 'JOURNAL', color: '#8b5cf6', bgColor: '#faf5ff', textColor: '#6b21a8' },
};

const inr = (n) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
};

const safeDate = (d) => {
  const t = new Date(d);
  return !isNaN(t.getTime()) ? t.toLocaleDateString('en-IN') : '-';
};

const RecentTransactions = () => {
  const [isItemsOpen, setIsItemsOpen] = useState(false);
  const [dialogItems, setDialogItems] = useState([]);
  const [dialogTitle, setDialogTitle] = useState('Item Details');

  const openItemsDialog = (tx) => {
    setDialogItems(tx.items);
    setDialogTitle(`Items · ${tx.partyName} · ${safeDate(tx.date)}`);
    setIsItemsOpen(true);
  };

  const getPartyName = (tx) => {
    return tx.partyName || 'Party';
  };

  const getTypeConfig = (type) => {
    return typeConfig[type] || typeConfig.sales;
  };

  const TransactionCard = ({ item }) => {
    const typeConfig = getTypeConfig(item.type);
    const amt = item.amount || item.totalAmount;
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.bgColor }]}>
            <Text style={[styles.typeText, { color: typeConfig.textColor }]}>
              {typeConfig.label}
            </Text>
          </View>
          <Text style={styles.amount}>{inr(amt)}</Text>
        </View>
        
        <View style={styles.cardBody}>
          <Text style={styles.partyName}>{getPartyName(item)}</Text>
          <Text style={styles.narration}>{item.narration || '—'}</Text>
          
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{safeDate(item.date)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Service</Text>
              <Text style={styles.metaValue}>{serviceNameById.get(item.serviceId) || '—'}</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.itemButton}
          onPress={() => openItemsDialog(item)}
          disabled={!item.items || item.items.length === 0}
        >
          <Text style={styles.itemButtonText}>
            {item.items?.length || 0} {item.items?.length === 1 ? 'Item' : 'Items'}
          </Text>
          <ChevronRight width={16} height={16} color="#6b7280" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Transactions</Text>
        <Text style={styles.subtitle}>Latest financial activities</Text>
      </View>
      
      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Package width={48} height={48} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No transactions</Text>
          <Text style={styles.emptySubtitle}>Transactions will appear here once added</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionCard item={item} />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal for Item Details */}
      <Modal visible={isItemsOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{dialogTitle}</Text>
            </View>
            
            <ScrollView 
              style={styles.itemsContainer}
              showsVerticalScrollIndicator={false}
            >
              {dialogItems.map((li, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{li.name}</Text>
                  </View>
                  <Text style={styles.itemAmount}>{inr(li.amount)}</Text>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsItemsOpen(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  listContainer: {
    paddingBottom: 8,
    gap: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  cardBody: {
    marginBottom: 12,
  },
  partyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  narration: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  itemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  itemButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  itemsContainer: {
    maxHeight: 300,
    padding: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  closeButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RecentTransactions;