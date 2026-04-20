import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { getColumnLabel, getColumnValue } from './columns';
import { getUnifiedLines } from '../../lib/utils';

export default function DataTable({
  columns,
  data,
  filter,
  onFilterChange,
  totalResults,
  onLoadMore,
  refreshing = false,
  onRefresh = null,
  onFilterButtonPress,
  isFilterActive = false,
  dateRange = { startDate: '', endDate: '' },
  onFilterReset,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Debouncing for search filter
  const [localFilter, setLocalFilter] = useState(filter);
  useEffect(() => {
    if (filter === '' && localFilter !== '') {
      setLocalFilter('');
    }
  }, [filter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localFilter !== filter) {
        onFilterChange(localFilter);
      }
    }, 300);

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

  // Premium card-based render for each transaction
  const renderItem = ({ item, index }) => {
    // compute unified lines count for items display
    const unifiedLines = getUnifiedLines(item, null);
    // determine whether there are any real lines (products/services arrays)
    const hasRealLines =
      (Array.isArray(item.products) && item.products.length > 0) ||
      (Array.isArray(item.services) && item.services.length > 0) ||
      (Array.isArray(item.service) && item.service.length > 0) ||
      (Array.isArray(item.lines) && item.lines.length > 0);
    const itemCount = hasRealLines ? unifiedLines.length : 0;

    // Find the relevant column renderers
    const partyCol = columns.find(c => c.id === 'party');
    const actionsCol = columns.find(c => c.id === 'actions');
    const linesCol = columns.find(c => c.id === 'lines');
    const amountCol = columns.find(c => c.id === 'totalAmount');
    const dateCol = columns.find(c => c.id === 'date');
    const paymentCol = columns.find(c => c.id === 'paymentMethod');
    const typeCol = columns.find(c => c.id === 'type');
    const companyCol = columns.find(c => c.id === 'company');

    return (
      <View key={getItemKey(item, index)} style={styles.card}>
        {/* Top row: party/company on left, amount+type on right */}
        <View style={styles.cardTopRow}>
          <View style={styles.cardPartySection}>
            {partyCol && getColumnValue(partyCol, item)}
            {companyCol && (
              <View style={styles.cardCompanyRowInline}>
                {getColumnValue(companyCol, item)}
              </View>
            )}
          </View>
          <View style={styles.cardAmountTypeSection}>
            {amountCol && (
              <Text style={styles.amountLarge}>
                {getColumnValue(amountCol, item)}
              </Text>
            )}
            {typeCol && <View style={styles.typeBadgeSection}>{getColumnValue(typeCol, item)}</View>}
          </View>
        </View>

        {/* Details row: items on left, payment/date chips on right */}
        <View style={styles.cardDetailsRow}>
          <View style={styles.cardItemsSection}>
            {itemCount > 0 && linesCol ? (
              getColumnValue(linesCol, item, { compact: true })
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#6b7280', marginRight: 6 }}>Item:</Text>
                <Text style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>—</Text>
              </View>
            )}
          </View>
          <LinearGradient
            colors={[
              // '#b9a6da', 
              // '#eeeaf7', 
              // '#9771ff', 
              // '#f0eef7',
               '#8f86eb',
              '#f6f4ff',
               
                
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.chipsGradient}
          >
              {/* payment info directly on gradient with white text/icon */}
            <View style={styles.paymentInfo}>
              <MaterialCommunityIcons
                name="bank-outline"
                size={16}
                color="#ffffff"
              />
              <View
                style={styles.paymentText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {paymentCol && getColumnValue(paymentCol, item)}
              </View>
            </View>
            {/* vertical white divider */}
            <View style={styles.verticalDivider} />
            {/* date remains a separate white pill */}
            <View style={styles.dateChip}>
              <Feather name="calendar" size={14} color="#4b5563" />
              <Text style={styles.dateChipText}>
                {dateCol && getColumnValue(dateCol, item)}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Action bar */}
        {actionsCol && (
          <View style={styles.cardActionBar}>
            {getColumnValue(actionsCol, item)}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Premium Search Bar */}
      <View style={styles.searchFilterWrapper}>
        <View style={styles.searchContainer}>
          <Feather
            name="search"
            size={18}
            color="#9ca3af"
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search by party name or product"
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
              <Feather name="x" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}

          {/* Date filter inside search bar */}
          <View style={styles.searchDivider} />
          <TouchableOpacity
            style={[
              styles.dateFilterInline,
              isFilterActive && styles.dateFilterInlineActive,
            ]}
            onPress={onFilterButtonPress}
          >
            <Feather
              name="calendar"
              size={14}
              color={isFilterActive ? '#ffffff' : '#6b7280'}
            />
            <Text
              style={[
                styles.dateFilterText,
                isFilterActive && styles.dateFilterTextActive,
              ]}
              numberOfLines={1}
            >
              {isFilterActive && dateRange.startDate
                ? `${new Date(dateRange.startDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })} - ${new Date(dateRange.endDate).toLocaleDateString(
                    'en-IN',
                    {
                      day: 'numeric',
                      month: 'short',
                    },
                  )}`
                : 'Date'}
            </Text>
            <Feather
              name="chevron-down"
              size={12}
              color={isFilterActive ? '#ffffff' : '#6b7280'}
            />
            {isFilterActive && onFilterReset && (
              <TouchableOpacity
                style={styles.dateFilterResetBtn}
                onPress={e => {
                  e.stopPropagation();
                  onFilterReset();
                }}
              >
                <Feather name="x" size={10} color="#ffffff" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>
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
          <View style={styles.emptyIconWrap}>
            <Feather name="inbox" size={48} color="#c7d2fe" />
          </View>
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
                color="#4f46e5"
                style={{ marginVertical: 20 }}
              />
            ) : null
          }
          refreshing={refreshing}
          onRefresh={onRefresh}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // --- Premium Search Bar ---
  searchFilterWrapper: {
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 10,
    backgroundColor: '#ffffff',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    ...Platform.select({
      ios: {
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 0.5,
      },
    }),
  },

  searchIcon: { marginRight: 10 },

  search: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
    color: '#1e1b4b',
  },

  clearButton: { padding: 4, marginRight: 4 },

  searchDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 10,
  },

  dateFilterInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },

  dateFilterInlineActive: {
    backgroundColor: '#4f46e5',
  },

  dateFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },

  dateFilterTextActive: {
    color: '#ffffff',
  },

  dateFilterResetBtn: {
    marginLeft: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    padding: 2,
  },

  resultsCount: { paddingHorizontal: 16, paddingBottom: 4 },

  resultsText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },

  // --- Premium Card ---
  listContent: { paddingBottom: 24, paddingHorizontal: 12, paddingTop: 2 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#4338ca',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 0.5,
      },
    }),
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  cardAmountTypeSection: {
    alignItems: 'flex-end',
  },
  amountLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#074897',
  },
  typeBadgeSection: {
    marginTop: 4,
  },

  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  cardChipsSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    // paddingVertical: 6,
    borderRadius: 15,
    // ensure it doesn't grow too wide
    alignSelf: 'flex-start',
  },

  cardActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },

  cardPartySection: {
    flex: 1,
    marginRight: 8,
  },

  cardActionsSection: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },

  cardCompanyRow: {
    marginBottom: 10,
    marginTop: -2,
  },
  cardCompanyRowInline: {
    marginTop: 2,
  },

  cardItemAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },

  cardItemsSection: {
    flex: 1,
    marginRight: 12,
  },

  cardAmountSection: {
    alignItems: 'flex-end',
  },

  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },

  cardBottomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },

  cardBottomChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  paymentText: {
    fontSize: 12,
    color: '#ffffff',
    marginLeft: 4,
    flexShrink: 1,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dateChipText: {
    fontSize: 12,
    color: '#4b5563',
    marginLeft: 4,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#ffffff',
    marginHorizontal: 6,
    marginVertical: 4,
   
    alignSelf: 'center',
    height: 16,
  },

  cardTypeBadgeWrap: {
    marginLeft: 'auto',
  },

  // --- Empty State ---
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },

  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e1b4b',
    marginBottom: 6,
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
