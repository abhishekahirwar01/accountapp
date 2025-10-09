import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
} from 'react-native';

import { Transaction, Company, Party } from '../../lib/types';

const DataTable = ({
  data,
  columns,
  pageSize = 10,
  ...restProps // for passing companyMap, partyMap, etc.
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedRows, setSelectedRows] = useState([]);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width,
  );

  // Filtered and sorted data
  const filteredData = data
    ? data.filter(item =>
        columns.some(column => {
          // If column has a filterFn, use it
          if (column.filterFn) {
            return column.filterFn(item, searchText);
          }
          return String(item[column.accessorKey || column.key] || '')
            .toLowerCase()
            .includes(searchText.toLowerCase());
        }),
      )
    : [];

  // Sorted data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const key = sortConfig.key;
    const aValue = a[key];
    const bValue = b[key];
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Paginated data
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = sortedData.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Handle sort
  const handleSort = key => {
    setSortConfig(prevConfig => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === 'asc'
          ? 'desc'
          : 'asc',
    }));
  };

  // Handle row selection
  const toggleRowSelection = id => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id],
    );
  };

  // Handle select all
  const toggleSelectAll = () => {
    if (selectedRows.length === paginatedData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedData.map(row => row.id || row._id));
    }
  };

  // Pagination handlers
  const goToPage = page => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Screen width detection for responsive design
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const isDesktop = screenWidth > 768;

  // Render desktop table header
  const renderTableHeader = () => (
    <View style={styles.headerRow}>
      <TouchableOpacity
        style={[styles.headerCell, { width: 50 }]}
        onPress={toggleSelectAll}
      >
        <Text style={styles.headerText}>✓</Text>
      </TouchableOpacity>
      {columns.map((column, colIdx) => (
        <TouchableOpacity
          key={column.accessorKey || column.key || column.id || colIdx}
          style={[styles.headerCell, { width: column.width || 120 }]}
          onPress={() => handleSort(column.accessorKey || column.key)}
        >
          <Text style={styles.headerText}>
            {column.header || column.label}
            {sortConfig.key === (column.accessorKey || column.key) && (
              <Text style={styles.sortIndicator}>
                {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
              </Text>
            )}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render desktop table row
  const renderTableRow = item => (
    <View
      key={item.id || item._id}
      style={[
        styles.tableRow,
        selectedRows.includes(item.id || item._id) && styles.selectedRow,
      ]}
    >
      <View style={[styles.tableCell, { width: 50 }]}>
        <TouchableOpacity
          onPress={() => toggleRowSelection(item.id || item._id)}
        >
          <Text style={styles.checkbox}>
            {selectedRows.includes(item.id || item._id) ? '✓' : ''}
          </Text>
        </TouchableOpacity>
      </View>
      {columns.map((column, colIdx) => (
        <View
          key={column.accessorKey || column.key || column.id || colIdx}
          style={[styles.tableCell, { width: column.width || 120 }]}
        >
          {column.cell ? (
            column.cell({ original: item, ...restProps })
          ) : column.render ? (
            column.render(item, restProps)
          ) : (
            <Text style={styles.cellText}>
              {item[column.accessorKey || column.key]}
            </Text>
          )}
        </View>
      ))}
    </View>
  );

  // Updated mobile card renderer
  const renderMobileCard = item => (
    <View
      key={item.id || item._id}
      style={[
        styles.mobileCard,
        selectedRows.includes(item.id || item._id) && styles.selectedCard,
      ]}
    >
      {/* Checkbox on left */}
      <TouchableOpacity
        style={styles.mobileCheckboxLeft}
        onPress={() => toggleRowSelection(item.id || item._id)}
      >
        <Text style={styles.checkbox}>
          {selectedRows.includes(item.id || item._id) ? '✓' : '○'}
        </Text>
      </TouchableOpacity>

      {/* Actions (three dots) on top right */}
      <View style={styles.mobileActionsRight}>
        {columns
          .filter(col => col.id === 'actions')
          .map((col, idx) => (
            <View key={idx}>
              {col.cell({ original: item, ...restProps })}
            </View>
          ))}
      </View>

      {/* Card content */}
      <View style={styles.mobileCardContent}>
        {columns
          .filter(col => col.id !== 'actions')
          .map((column, colIdx) => (
            <View
              key={`${item.id || item._id}-${column.accessorKey || column.key || column.id || colIdx}`}
              style={styles.mobileCardRow}
            >
              <Text style={styles.mobileLabel}>
                {column.header || column.label}:
              </Text>
              {column.cell ? (
                column.cell({ original: item, ...restProps })
              ) : column.render ? (
                column.render(item, restProps)
              ) : (
                <Text style={styles.mobileValue}>
                  {item[column.accessorKey || column.key]}
                </Text>
              )}
            </View>
          ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Filter */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.filterInput}
          placeholder="Search by party, product, or description..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Selection Info */}
      {selectedRows.length > 0 && (
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedRows.length} of {sortedData.length} items selected
          </Text>
        </View>
      )}

      {/* Desktop Table View */}
      {isDesktop ? (
        <ScrollView horizontal style={styles.desktopTable}>
          <View>
            {renderTableHeader()}
            <ScrollView style={styles.tableBody}>
              {paginatedData.length > 0 ? (
                paginatedData.map(renderTableRow)
              ) : (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No results found.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </ScrollView>
      ) : (
        /* Mobile Card View */
        <ScrollView style={styles.mobileView}>
          {paginatedData.length > 0 ? (
            paginatedData.map(renderMobileCard)
          ) : (
            <View style={styles.noResultsMobile}>
              <Text style={styles.noResultsIcon}>📊</Text>
              <Text style={styles.noResultsTitle}>No records found</Text>
              <Text style={styles.noResultsDescription}>
                We couldn't find any matching records. Try adjusting your
                search.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Pagination: hide on mobile */}
      {isDesktop && sortedData.length > 0 && (
        <View style={styles.pagination}>
          <Text style={styles.paginationInfo}>
            Page {currentPage} of {totalPages} • {sortedData.length} items
          </Text>

          <View style={styles.paginationControls}>
            <TouchableOpacity
              style={[
                styles.paginationButton,
                currentPage === 1 && styles.disabledButton,
              ]}
              onPress={prevPage}
              disabled={currentPage === 1}
            >
              <Text style={styles.paginationButtonText}>Previous</Text>
            </TouchableOpacity>

            {/* Page Numbers */}
            <View style={styles.pageNumbers}>
              {[...Array(Math.min(5, totalPages))].map((_, index) => {
                const pageNumber = index + 1;
                return (
                  <TouchableOpacity
                    key={pageNumber}
                    style={[
                      styles.pageNumber,
                      currentPage === pageNumber && styles.activePageNumber,
                    ]}
                    onPress={() => goToPage(pageNumber)}
                  >
                    <Text
                      style={[
                        styles.pageNumberText,
                        currentPage === pageNumber &&
                          styles.activePageNumberText,
                      ]}
                    >
                      {pageNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.paginationButton,
                currentPage === totalPages && styles.disabledButton,
              ]}
              onPress={nextPage}
              disabled={currentPage === totalPages}
            >
              <Text style={styles.paginationButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    margin: 8,
  },
  filterContainer: {
    padding: 16,
    paddingTop: 0,
  },
  filterInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    fontSize: 14,
  },
  selectionInfo: {
    backgroundColor: '#dbeafe',
    padding: 8,
    borderRadius: 6,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  selectionText: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  desktopTable: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  headerCell: {
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    minHeight: 50,
    justifyContent: 'center',
  },
  headerText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#374151',
  },
  sortIndicator: {
    color: '#2563eb',
  },
  tableBody: {
    maxHeight: 400,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  selectedRow: {
    backgroundColor: '#dbeafe',
  },
  tableCell: {
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    minHeight: 50,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    color: '#374151',
  },
  checkbox: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
  },
  mobileView: {
    flex: 1,
    paddingHorizontal: 0,
  },
  mobileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginVertical: 10,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    width: '100%', // Full width
    minWidth: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  selectedCard: {
    backgroundColor: '#e0f2fe',
    borderColor: '#2563eb',
    borderWidth: 1,
  },
  mobileCheckboxLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 2,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mobileActionsRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 2,
  },
  mobileCardContent: {
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 0,
    marginRight: 0,
  },
  mobileCardRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    overflow: 'visible',
  },
  mobileLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
    textAlign: 'left',
  },
  mobileValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
    flex: 2,
    textAlign: 'right',
  },
  noResults: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  noResultsText: {
    fontSize: 16,
    color: '#6b7280',
  },
  noResultsMobile: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
  },
  noResultsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  noResultsDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  paginationInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    minWidth: 80,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  pageNumbers: {
    flexDirection: 'row',
    gap: 4,
  },
  pageNumber: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    minWidth: 40,
    alignItems: 'center',
  },
  activePageNumber: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pageNumberText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  activePageNumberText: {
    color: 'white',
  },
});

export default DataTable;