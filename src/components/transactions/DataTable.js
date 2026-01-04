import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { getColumnLabel, getColumnValue } from './columns';

export default function DataTable({
  columns,
  data,
  filter,
  onFilterChange,
  totalResults,
  onLoadMore,
  refreshing = false,
  onRefresh = null,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Debouncing for search filter
  const [localFilter, setLocalFilter] = useState(filter);
  useEffect(() => {
    // If filter prop changes from parent (e.g. cleared), update local state
    if (filter !== localFilter) {
      setLocalFilter(filter);
    }
  }, [filter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localFilter !== filter) {
        onFilterChange(localFilter);
      }
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [localFilter, filter, onFilterChange]);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
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
  }, [sortKey, sortDirection, data]);

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

  const renderItem = ({ item, index }) => (
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
          value={localFilter}
          onChangeText={setLocalFilter}
          style={styles.search}
          placeholderTextColor="#9ca3af"
        />
        {localFilter.length > 0 && (
          <TouchableOpacity
            onPress={() => setLocalFilter('')}
            style={styles.clearButton}
          >
            <Feather name="x" size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {filter.length > 0 && (
        <View style={styles.resultsCount}>
          <Text style={styles.resultsText}>
            {totalResults} result{totalResults !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}

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
        <FlatList
          data={sortedData}
          renderItem={renderItem}
          keyExtractor={getItemKey}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() =>
            sortedData.length < totalResults ? (
              <ActivityIndicator
                size="small"
                color="#3b82f6"
                style={{ marginVertical: 20 }}
              />
            ) : null
          }
          // Pull to refresh support
          refreshing={refreshing}
          onRefresh={onRefresh}
          // Optimization props:
          initialNumToRender={10} // Shuruat mein sirf 10 cards render karega
          maxToRenderPerBatch={10} // Scroll karte waqt 10-10 karke naye cards banayega
          windowSize={5} // Sirf screen ke aas-paas ke cards memory mein rakhega
          removeClippedSubviews={true}
        />
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
    alignItems: 'flex-start',
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
