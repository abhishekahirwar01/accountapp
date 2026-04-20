import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Feather from 'react-native-vector-icons/Feather';

// Custom Button Component
const CustomButton = ({ onPress, disabled, style, textStyle, children, variant = 'outlined' }) => {
  const isFilled = variant === 'filled';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.buttonBase,
        isFilled ? styles.buttonFilled : styles.buttonOutlined,
        style,
        disabled && styles.buttonDisabled,
      ]}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.buttonText,
        isFilled ? styles.buttonTextFilled : styles.buttonTextOutlined,
        textStyle
      ]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

// Custom Card Component
const CustomCard = ({ style, children }) => (
  <View style={[styles.cardBase, style]}>{children}</View>
);

// Helper for Card.Content
const CustomCardContent = ({ style, children }) => (
  <View style={style}>{children}</View>
);

const CustomerListCard = ({
  parties,
  customerBalances,
  loadingBalances,
  setSelectedParty,
  formatIndianNumber,
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  goToNextPage,
  goToPrevPage,
  capitalizeWords,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerIconContainer}>
            <Feather name="users" size={20} color="#5C68D9" />
          </View>
          <Text style={styles.cardTitle}>All Customers</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{totalItems} total</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {loadingBalances ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingSpinner}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
            <Text style={styles.loadingText}>Loading customer balances...</Text>
          </View>
        ) : parties.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="account-group-outline" size={56} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>No customers found</Text>
            <Text style={styles.emptySubtext}>Add customers to see their balances here</Text>
          </View>
        ) : (
          <View style={styles.mainContainer}>
            {/* Customer List Container */}
            <ScrollView
              style={styles.listContainer}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {parties.map((item, index) => {
                const balance = customerBalances[item._id] || 0;
                const isPositive = balance >= 0;

                return (
                  <TouchableOpacity
                    key={item._id}
                    style={[
                      styles.customerCard,
                      index % 2 === 0 ? styles.evenCard : styles.oddCard,
                    ]}
                    onPress={() => setSelectedParty(item._id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.customerCardContent}>
                      <View style={styles.customerRow}>
                        <View style={styles.customerInfo}>
                          <View style={styles.customerNameRow}>
                            <Text style={styles.customerName} numberOfLines={1}>
                              {capitalizeWords(item.name)}
                            </Text>
                          </View>
                          {item.contactNumber && (
                            <View style={styles.contactRow}>
                              <Icon name="phone" size={12} color="#9ca3af" />
                              <Text style={styles.customerContact}>
                                {item.contactNumber}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.customerBalance}>
                          <View style={[
                            styles.balanceBadge,
                            isPositive ? styles.positiveBadge : styles.negativeBadge
                          ]}>
                            <Icon
                              name={isPositive ? "arrow-up" : "arrow-down"}
                              size={12}
                              color={isPositive ? "#16a34a" : "#dc2626"}
                            />
                            <Text style={[
                              styles.balanceAmount,
                              isPositive ? styles.positiveBalance : styles.negativeBalance,
                            ]}>
                              ₹{formatIndianNumber(Math.abs(balance))}
                            </Text>
                          </View>
                          <Text style={[
                            styles.balanceNote,
                            isPositive ? styles.positiveNote : styles.negativeNote,
                          ]}>
                            {isPositive ? 'Customer Owes' : 'You Owe'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.viewButton}
                          onPress={() => setSelectedParty(item._id)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.viewButtonContent}>
                            <View style={styles.buttonIconContainer}>
                              <Feather name="file-text" size={12} color="#ffffff" />
                            </View>
                            <Text style={styles.viewButtonText}>View Ledger</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.chevronButton}
                          onPress={() => setSelectedParty(item._id)}
                        >
                          <Icon name="chevron-right" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Pagination */}
            {totalItems > 7 && (
              <View style={styles.pagination}>
                <View style={styles.paginationInfo}>
                  <Text style={styles.paginationText}>
                    Showing{' '}
                    <Text style={styles.paginationHighlight}>{startIndex + 1}</Text>
                    {' '}to{' '}
                    <Text style={styles.paginationHighlight}>{Math.min(endIndex, totalItems)}</Text>
                    {' '}of{' '}
                    <Text style={styles.paginationHighlight}>{totalItems}</Text>
                    {' '}customers
                  </Text>
                </View>

                <View style={styles.paginationControls}>
                  {/* Previous Button */}
                  <TouchableOpacity
                    onPress={goToPrevPage}
                    disabled={currentPage === 1}
                    style={[
                      styles.paginationBtn,
                      currentPage === 1 && styles.paginationBtnDisabled,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name="chevron-left"
                      size={16}
                      color={currentPage === 1 ? '#9ca3af' : '#5C68D9'}
                    />
                    <Text style={[
                      styles.paginationBtnText,
                      currentPage === 1 && styles.paginationBtnTextDisabled,
                    ]}>
                      Previous
                    </Text>
                  </TouchableOpacity>

                  {/* Page Number Indicator */}
                  <View style={styles.pageNumberContainer}>
                    <Text style={styles.pageNumber}>
                      <Text style={styles.pageNumberCurrent}>{currentPage}</Text>
                      <Text style={styles.pageNumberSeparator}> / </Text>
                      <Text style={styles.pageNumberTotal}>{totalPages}</Text>
                    </Text>
                  </View>

                  {/* Next Button */}
                  <TouchableOpacity
                    onPress={goToNextPage}
                    disabled={currentPage === totalPages}
                    style={[
                      styles.paginationBtn,
                      currentPage === totalPages && styles.paginationBtnDisabled,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.paginationBtnText,
                      currentPage === totalPages && styles.paginationBtnTextDisabled,
                    ]}>
                      Next
                    </Text>
                    <Icon
                      name="chevron-right"
                      size={16}
                      color={currentPage === totalPages ? '#9ca3af' : '#5C68D9'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Button Styles
  buttonBase: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutlined: {
    borderWidth: 1,
    borderColor: '#5C68D9',
    backgroundColor: 'transparent',
  },
  buttonFilled: {
    backgroundColor: '#5C68D9',
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextOutlined: {
    color: '#5C68D9',
  },
  buttonTextFilled: {
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Card Styles
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    margin: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
  },
  cardBody: {
    flex: 1,
    minHeight: 300,
  },

  // Loading & Empty States
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    flex: 1,
  },
  loadingSpinner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    flex: 1,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },

  // Main Container
  mainContainer: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  // Customer Card
  customerCard: {
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 0,
    overflow: 'hidden',
  },
  evenCard: {
    backgroundColor: '#ffffff',
  },
  oddCard: {
    backgroundColor: '#fafbfc',
  },
  customerCardContent: {
    padding: 16,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  customerInfo: {
    flex: 1,
    marginRight: 12,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  customerContact: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 4,
  },
  customerBalance: {
    alignItems: 'flex-end',
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
  },
  positiveBadge: {
    backgroundColor: '#ecfdf5',
  },
  negativeBadge: {
    backgroundColor: '#fef2f2',
  },
  balanceAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 4,
  },
  positiveBalance: {
    color: '#16a34a',
  },
  negativeBalance: {
    color: '#dc2626',
  },
  balanceNote: {
    fontSize: 11,
    fontWeight: '500',
  },
  positiveNote: {
    color: '#16a34a',
  },
  negativeNote: {
    color: '#dc2626',
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewButton: {
    backgroundColor: '#7560ee',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5C68D9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  viewButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  viewButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  chevronButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  // Pagination
  pagination: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  paginationInfo: {
    marginBottom: 12,
  },
  paginationText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  paginationHighlight: {
    fontWeight: '600',
    color: '#374151',
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },

  // Pagination Buttons
  paginationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5C68D9',
    backgroundColor: '#ffffff',
  },
  paginationBtnDisabled: {
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  paginationBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5C68D9',
  },
  paginationBtnTextDisabled: {
    color: '#9ca3af',
  },

  // Page Number Indicator
  pageNumberContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 60,
    alignItems: 'center',
  },
  pageNumber: {
    fontSize: 14,
  },
  pageNumberCurrent: {
    fontWeight: '700',
    color: '#5C68D9',
  },
  pageNumberSeparator: {
    color: '#9ca3af',
  },
  pageNumberTotal: {
    fontWeight: '500',
    color: '#6b7280',
  },
});

export default CustomerListCard;