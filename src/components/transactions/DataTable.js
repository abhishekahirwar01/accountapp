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

const DataTable = ({
  data = [],
  companyMap,
  serviceNameById,
  onViewItems,
  onPreview,
  onEdit,
  onDelete,
  pageSize = 10,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedRows, setSelectedRows] = useState([]);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width,
  );

  // Define columns matching web structure
  const columns = [
    {
      key: 'date',
      header: 'Date',
      width: 100,
      render: (item) => (
        <Text style={styles.cellText}>
          {new Date(item.date).toLocaleDateString('en-IN')}
        </Text>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: 100,
      render: (item) => (
        <Text style={[styles.cellText, styles.typeCell]}>
          {item.type?.charAt(0).toUpperCase() + item.type?.slice(1)}
        </Text>
      ),
    },
    {
      key: 'invoiceNumber',
      header: 'Invoice No',
      width: 120,
      render: (item) => (
        <Text style={styles.cellText}>
          {item.invoiceNumber || '—'}
        </Text>
      ),
    },
    {
      key: 'party',
      header: 'Party',
      width: 150,
      render: (item) => (
        <Text style={styles.cellText}>
          {item.party || item.description || '—'}
        </Text>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      width: 120,
      render: (item) => (
        <Text style={[styles.cellText, styles.amountCell]}>
          {new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
          }).format(item.amount || 0)}
        </Text>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 100,
      render: (item) => (
        <View style={[
          styles.statusBadge,
          item.status === 'Paid' && styles.statusPaid,
          item.status === 'Pending' && styles.statusPending,
          item.status === 'Completed' && styles.statusCompleted,
        ]}>
          <Text style={styles.statusText}>
            {item.status || '—'}
          </Text>
        </View>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      width: 120,
      render: (item) => (
        <Text style={styles.cellText}>
          {companyMap?.get(item.company) || '—'}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 120,
      render: (item) => (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => onViewItems?.(item)}
          >
            <Text style={styles.actionButtonText}>View Items</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.previewButton]}
            onPress={() => onPreview?.(item)}
          >
            <Text style={styles.actionButtonText}>Preview</Text>
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  // Filtered and sorted data
  const filteredData = data.filter(item =>
    columns.some(column => {
      if (column.key === 'actions') return false;
      const value = item[column.key];
      return String(value || '').toLowerCase().includes(searchText.toLowerCase());
    }),
  );

  // Sorted data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (sortConfig.key === 'date') {
      return sortConfig.direction === 'asc' 
        ? new Date(aValue) - new Date(bValue)
        : new Date(bValue) - new Date(aValue);
    }
    
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
        <Text style={styles.headerText}>
          {selectedRows.length === paginatedData.length ? '✓' : '☐'}
        </Text>
      </TouchableOpacity>
      {columns.map((column, colIdx) => (
        <TouchableOpacity
          key={column.key || colIdx}
          style={[styles.headerCell, { width: column.width || 120 }]}
          onPress={() => handleSort(column.key)}
        >
          <Text style={styles.headerText}>
            {column.header}
            {sortConfig.key === column.key && (
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
            {selectedRows.includes(item.id || item._id) ? '✓' : '☐'}
          </Text>
        </TouchableOpacity>
      </View>
      {columns.map((column, colIdx) => (
        <View
          key={column.key || colIdx}
          style={[styles.tableCell, { width: column.width || 120 }]}
        >
          {column.render ? column.render(item) : (
            <Text style={styles.cellText}>
              {item[column.key]}
            </Text>
          )}
        </View>
      ))}
    </View>
  );

  // Mobile card renderer
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
        style={styles.mobileCheckbox}
        onPress={() => toggleRowSelection(item.id || item._id)}
      >
        <Text style={styles.checkbox}>
          {selectedRows.includes(item.id || item._id) ? '✓' : '○'}
        </Text>
      </TouchableOpacity>

      {/* Card content */}
      <View style={styles.mobileCardContent}>
        {columns
          .filter(col => col.key !== 'actions')
          .map((column, colIdx) => (
            <View
              key={`${item.id || item._id}-${column.key}`}
              style={styles.mobileCardRow}
            >
              <Text style={styles.mobileLabel}>
                {column.header}:
              </Text>
              <View style={styles.mobileValueContainer}>
                {column.render ? column.render(item) : (
                  <Text style={styles.mobileValue}>
                    {item[column.key] || '—'}
                  </Text>
                )}
              </View>
            </View>
          ))}
        
        {/* Action buttons for mobile */}
        <View style={styles.mobileActions}>
          <TouchableOpacity
            style={[styles.mobileActionButton, styles.viewButton]}
            onPress={() => onViewItems?.(item)}
          >
            <Text style={styles.mobileActionButtonText}>View Items</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mobileActionButton, styles.previewButton]}
            onPress={() => onPreview?.(item)}
          >
            <Text style={styles.mobileActionButtonText}>Preview</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Filter */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by party, product, or description..."
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
        <View style={styles.desktopContainer}>
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
                We couldn't find any matching records. Try adjusting your search.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Pagination */}
      {sortedData.length > 0 && (
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
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 6,
  },
  selectionText: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  desktopContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  headerCell: {
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
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
    marginLeft: 4,
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  selectedRow: {
    backgroundColor: '#f0f9ff',
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
  typeCell: {
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  amountCell: {
    fontWeight: '600',
    color: '#059669',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#6b7280',
  },
  statusPaid: {
    backgroundColor: '#10b981',
  },
  statusPending: {
    backgroundColor: '#f59e0b',
  },
  statusCompleted: {
    backgroundColor: '#3b82f6',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
  },
  viewButton: {
    backgroundColor: '#3b82f6',
  },
  previewButton: {
    backgroundColor: '#8b5cf6',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  checkbox: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
  },
  mobileView: {
    flex: 1,
    padding: 16,
  },
  mobileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
  },
  selectedCard: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  mobileCheckbox: {
    marginRight: 12,
    justifyContent: 'center',
  },
  mobileCardContent: {
    flex: 1,
  },
  mobileCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  mobileLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
  },
  mobileValueContainer: {
    flex: 2,
    alignItems: 'flex-end',
  },
  mobileValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    textAlign: 'right',
  },
  mobileActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  mobileActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
  },
  mobileActionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  noResultsText: {
    fontSize: 16,
    color: '#6b7280',
  },
  noResultsMobile: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
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
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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