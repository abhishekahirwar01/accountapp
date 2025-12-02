import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react-native';

export function ClientPagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate middle pages
      const middleCount = maxVisiblePages - 2; // 3 for maxVisiblePages=5
      let middleStart = Math.max(2, currentPage - Math.floor(middleCount / 2));
      let middleEnd = Math.min(totalPages - 1, middleStart + middleCount - 1);

      // Adjust if the range is too small
      if (middleEnd - middleStart + 1 < middleCount) {
        if (middleStart === 2) {
          middleEnd = Math.min(totalPages - 1, middleStart + middleCount - 1);
        } else {
          middleStart = Math.max(2, middleEnd - middleCount + 1);
        }
      }

      // Add ellipsis after first page if needed
      if (middleStart > 2) {
        pages.push('ellipsis-start');
      }

      // Add middle pages
      for (let i = middleStart; i <= middleEnd; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (middleEnd < totalPages - 1) {
        pages.push('ellipsis-end');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <View style={styles.container}>
      {/* Items info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Showing {startItem}-{endItem} of {totalItems} items
        </Text>
      </View>

      <View style={styles.controlsContainer}>
        {/* Page size selector */}
        <View style={styles.pageSizeContainer}>
          <Text style={styles.pageSizeLabel}>Rows per page:</Text>
          <View style={styles.pageSizeButtons}>
            {[10, 20, 50, 100].map(size => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.pageSizeButton,
                  pageSize === size && styles.pageSizeButtonActive,
                ]}
                onPress={() => onPageSizeChange(size)}
              >
                <Text
                  style={[
                    styles.pageSizeButtonText,
                    pageSize === size && styles.pageSizeButtonTextActive,
                  ]}
                >
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Page navigation */}
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[
              styles.navButton,
              currentPage === 1 && styles.navButtonDisabled,
            ]}
            onPress={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft
              size={16}
              color={currentPage === 1 ? '#999' : '#333'}
            />
          </TouchableOpacity>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pagesScrollView}
            contentContainerStyle={styles.pagesContainer}
          >
            {getPageNumbers().map((pageNum, index) => {
              if (pageNum === 'ellipsis-start' || pageNum === 'ellipsis-end') {
                return (
                  <View key={`ellipsis-${index}`} style={styles.ellipsisButton}>
                    <MoreHorizontal size={16} color="#999" />
                  </View>
                );
              }

              const pageNumber = pageNum;
              return (
                <TouchableOpacity
                  key={pageNumber}
                  style={[
                    styles.pageButton,
                    pageNumber === currentPage && styles.pageButtonActive,
                  ]}
                  onPress={() => onPageChange(pageNumber)}
                >
                  <Text
                    style={[
                      styles.pageButtonText,
                      pageNumber === currentPage && styles.pageButtonTextActive,
                    ]}
                  >
                    {pageNumber}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.navButton,
              currentPage === totalPages && styles.navButtonDisabled,
            ]}
            onPress={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight
              size={16}
              color={currentPage === totalPages ? '#999' : '#333'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  infoContainer: {
    alignSelf: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
  },
  controlsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  pageSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageSizeLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  pageSizeButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 2,
  },
  pageSizeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  pageSizeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  pageSizeButtonText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  pageSizeButtonTextActive: {
    color: '#ffffff',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  navButtonDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  pagesScrollView: {
    flex: 1,
    maxWidth: 300,
  },
  pagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  pageButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  pageButtonText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  pageButtonTextActive: {
    color: '#ffffff',
  },
  ellipsisButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
});
