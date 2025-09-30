import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const RecentTransactions = ({ transactions = [], serviceNameById = new Map() }) => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Recent Transactions</Text>
      {transactions.length === 0 ? (
        <Text style={styles.empty}>No transactions</Text>
      ) : (
        transactions.map((t) => (
          <View key={t.id} style={styles.row}>
            <Text style={styles.type}>{t.type?.toUpperCase()}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.primary}>{t.partyName || '—'}</Text>
              <Text style={styles.muted}>
                {t.date} • {t.narration || '—'} • {serviceNameById.get(t.serviceId) || '—'}
              </Text>
            </View>
            <Text style={styles.amount}>
              {t.amount || t.totalAmount ? `₹${(t.amount || t.totalAmount).toLocaleString('en-IN')}` : '—'}
            </Text>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1,
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  empty: { color: '#666' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  type: { fontSize: 10, color: '#555', borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  primary: { fontSize: 14, fontWeight: '600' },
  muted: { fontSize: 12, color: '#777' },
  amount: { fontWeight: '700' },
});

export default RecentTransactions;
