import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useRoute } from '@react-navigation/native'

// Mock data - replace with your actual data
const MOCK_RECEIVABLES = [
  { id: 1, customer: 'ABC Company', amount: 5000, dueDate: '2024-01-15', status: 'Pending' },
  { id: 2, customer: 'XYZ Corp', amount: 3200, dueDate: '2024-01-20', status: 'Overdue' },
  { id: 3, customer: 'Test Client', amount: 1500, dueDate: '2024-01-10', status: 'Paid' },
]

const MOCK_PAYABLES = [
  { id: 1, supplier: 'Supplier A', amount: 2500, dueDate: '2024-01-12', status: 'Pending' },
  { id: 2, supplier: 'Supplier B', amount: 1800, dueDate: '2024-01-18', status: 'Pending' },
  { id: 3, supplier: 'Supplier C', amount: 4200, dueDate: '2024-01-05', status: 'Paid' },
]

// Ledger Item Component
const LedgerItem = ({ item, type }) => (
  <View style={styles.ledgerItem}>
    <View style={styles.itemHeader}>
      <Text style={styles.itemTitle}>
        {type === 'receivables' ? item.customer : item.supplier}
      </Text>
      <Text style={[styles.amount, type === 'receivables' ? styles.receivable : styles.payable]}>
        ${item.amount.toLocaleString()}
      </Text>
    </View>
    <View style={styles.itemDetails}>
      <Text style={styles.dueDate}>Due: {item.dueDate}</Text>
      <View style={[
        styles.statusBadge,
        item.status === 'Paid' ? styles.paid : 
        item.status === 'Overdue' ? styles.overdue : styles.pending
      ]}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </View>
  </View>
)

// Empty State Component
const EmptyState = ({ type }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyStateText}>
      No {type === 'receivables' ? 'receivables' : 'payables'} found
    </Text>
    <Text style={styles.emptyStateSubtext}>
      {type === 'receivables' 
        ? 'Outstanding payments from customers will appear here'
        : 'Bills to be paid will appear here'
      }
    </Text>
  </View>
)

export default function Ledger() {
  const route = useRoute()
  const ledgerType = route.params?.ledgerType || 'receivables'
  const [activeTab, setActiveTab] = useState(ledgerType)

  // Update active tab when params change
  useEffect(() => {
    if (route.params?.ledgerType) {
      setActiveTab(route.params.ledgerType)
    }
  }, [route.params?.ledgerType])

  const data = activeTab === 'receivables' ? MOCK_RECEIVABLES : MOCK_PAYABLES
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Ledger</Text>
        <Text style={styles.subtitle}>
          Manage your {activeTab === 'receivables' ? 'accounts receivable' : 'accounts payable'}
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'receivables' && styles.activeTab]}
          onPress={() => setActiveTab('receivables')}
        >
          <Text style={[styles.tabText, activeTab === 'receivables' && styles.activeTabText]}>
            Receivables
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payables' && styles.activeTab]}
          onPress={() => setActiveTab('payables')}
        >
          <Text style={[styles.tabText, activeTab === 'payables' && styles.activeTabText]}>
            Payables
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Total {activeTab === 'receivables' ? 'Receivables' : 'Payables'}:
          </Text>
          <Text style={[styles.summaryAmount, activeTab === 'receivables' ? styles.receivable : styles.payable]}>
            ${totalAmount.toLocaleString()}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Number of {activeTab === 'receivables' ? 'Customers' : 'Suppliers'}:
          </Text>
          <Text style={styles.summaryCount}>{data.length}</Text>
        </View>
      </View>

      {/* Ledger List */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {data.length > 0 ? (
          data.map((item) => (
            <LedgerItem 
              key={item.id} 
              item={item} 
              type={activeTab}
            />
          ))
        ) : (
          <EmptyState type={activeTab} />
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#007bff',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  activeTabText: {
    color: '#fff',
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6c757d',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  receivable: {
    color: '#28a745', // Green for receivables
  },
  payable: {
    color: '#dc3545', // Red for payables
  },
  listContainer: {
    flex: 1,
  },
  ledgerItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDate: {
    fontSize: 14,
    color: '#6c757d',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  paid: {
    backgroundColor: '#28a745',
  },
  pending: {
    backgroundColor: '#ffc107',
  },
  overdue: {
    backgroundColor: '#dc3545',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
})