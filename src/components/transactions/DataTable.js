// components/transactions/DataTable.js
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { getColumnLabel, getColumnValue } from './columns';

export default function DataTable({ columns, data }) {
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const filteredData = useMemo(() => {
    if (!filter.trim()) return data;

    return data.filter(item => {
      const searchableText = Object.values(item)
        .filter(val => typeof val === 'string')
        .join(' ')
        .toLowerCase();

      const partyName =
        typeof item.party === 'object'
          ? item.party.name || ''
          : item.party || '';

      const description = item.description || '';

      const searchString = (
        partyName +
        ' ' +
        description +
        ' ' +
        searchableText
      ).toLowerCase();

      return searchString.includes(filter.toLowerCase());
    });
  }, [filter, data]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const getValue = (obj, key) => {
        const val = obj[key];

        if (key === 'party' && typeof val === 'object') {
          return val.name || '';
        }
        if (key === 'date') {
          return new Date(val).getTime();
        }

        return val;
      };

      const valA = getValue(a, sortKey);
      const valB = getValue(b, sortKey);

      if (valA == null) return sortDirection === 'asc' ? -1 : 1;
      if (valB == null) return sortDirection === 'asc' ? 1 : -1;

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sortKey, sortDirection, filteredData]);

  const getItemKey = (item, index) => {
    if (item._id) return item._id;
    if (item.id) return item.id;
    if (item.invoiceNumber) return item.invoiceNumber;
    return `item-${index}`;
  };

  const renderRightValue = content => (
    <View style={styles.valueContainer}>
      <View style={styles.rightWrap}>
        {typeof content === 'string' || typeof content === 'number' ? (
          <Text style={styles.valueText}>{content}</Text>
        ) : (
          content
        )}
      </View>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {columns
        .filter(col => col.id !== 'select')
        .map(column => (
          <View key={column.id} style={styles.row}>
            <Text style={styles.label}>{getColumnLabel(column)}</Text>
            {renderRightValue(getColumnValue(column, item))}
          </View>
        ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Container - यहीं रहेगा original जगह पर */}
      <View style={styles.searchContainer}>
        <Feather
          name="search"
          size={20}
          color="#6b7280"
          style={styles.searchIcon}
        />
        <TextInput
          placeholder="Filter by party, product, or description..."
          value={filter}
          onChangeText={setFilter}
          style={styles.search}
          placeholderTextColor="#9ca3af"
        />
        {filter.length > 0 && (
          <TouchableOpacity
            onPress={() => setFilter('')}
            style={styles.clearButton}
          >
            <Feather name="x" size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {filter.length > 0 && (
        <View style={styles.resultsCount}>
          <Text style={styles.resultsText}>
            {sortedData.length} result{sortedData.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}

      {/* Render as plain list (not Virtualized) to avoid nested VirtualizedList warnings when
              embedded inside a ScrollView. For large datasets, convert back to FlatList and
              remove the outer ScrollView in the parent. */}
      {sortedData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No transactions found</Text>
          <Text style={styles.emptySubtitle}>
            {filter.length > 0
              ? 'Try adjusting your search'
              : 'Create your first transaction to get started'}
          </Text>
        </View>
      ) : (
        <ScrollView
          nestedScrollEnabled={true}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
        >
          {sortedData.map((item, index) => (
            <View key={getItemKey(item, index)} style={styles.card}>
              {columns
                .filter(col => col.id !== 'select')
                .map(column => (
                  <View key={column.id} style={styles.row}>
                    <Text style={styles.label}>{getColumnLabel(column)}</Text>
                    {renderRightValue(getColumnValue(column, item))}
                  </View>
                ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    marginHorizontal: 4,
  },

  searchIcon: { marginRight: 8 },

  search: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },

  clearButton: { padding: 4 },

  resultsCount: { paddingHorizontal: 4, paddingBottom: 8 },

  resultsText: { fontSize: 12, color: '#6b7280' },

  listContent: { paddingBottom: 20 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    minWidth: 120,
  },

  valueContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },

  rightWrap: {
    width: '100%',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  valueText: {
    textAlign: 'right',
    fontSize: 14,
    color: '#111827',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },

  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
