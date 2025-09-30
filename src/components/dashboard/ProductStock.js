import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ProductStock = ({ items = [] }) => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Product Stock</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>No items</Text>
      ) : (
        items.map((it) => (
          <View key={it.id} style={styles.row}>
            <Text style={styles.name}>{it.name}</Text>
            <Text style={styles.qty}>
              {it.qty} {it.unit}
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
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  name: { fontSize: 14, fontWeight: '600' },
  qty: { fontSize: 14, color: '#333' },
});

export default ProductStock;
