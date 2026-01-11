import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator, 
  ScrollView
} from 'react-native';
// Removed: import { Card, Button, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// import { capitalizeWords } from '../../../lib/utils';

// Custom Button Component to replace react-native-paper Button
const CustomButton = ({ onPress, disabled, style, textStyle, children }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.buttonBase,
      styles.buttonOutlined,
      style,
      disabled && styles.buttonDisabled,
    ]}
  >
    <Text style={[styles.buttonText, styles.buttonTextOutlined, textStyle]}>
      {children}
    </Text>
  </TouchableOpacity>
);

// Custom Card Component to replace react-native-paper Card
const CustomCard = ({ style, children }) => (
  <View style={[styles.cardBase, style]}>{children}</View>
);

// Helper for Card.Content (just a View with padding)
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
  const renderCustomerItem = ({ item, index }) => (
    <CustomCard
      style={[
        styles.customerCard,
        index % 2 === 0 ? styles.evenCard : styles.oddCard,
      ]}
    >
      <CustomCardContent style={styles.cardContent}>
        <View style={styles.customerRow}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {capitalizeWords(item.name)}
            </Text>
            {item.contactNumber && (
              <Text style={styles.customerContact}>{item.contactNumber}</Text>
            )}
          </View>
          <View style={styles.customerBalance}>
            <Text
              style={[
                styles.balanceAmount,
                (customerBalances[item._id] || 0) >= 0
                  ? styles.positiveBalance
                  : styles.negativeBalance,
              ]}
            >
              ₹{formatIndianNumber(Math.abs(customerBalances[item._id] || 0))}
            </Text>
            <Text style={styles.balanceNote}>
              {(customerBalances[item._id] || 0) >= 0
                ? 'Customer Owes'
                : 'You Owe'}
            </Text>
          </View>
        </View>
        <CustomButton
          onPress={() => setSelectedParty(item._id)}
          style={styles.viewButton}
        >
          View Ledger
        </CustomButton>
      </CustomCardContent>
    </CustomCard>
  );

  return (
    <CustomCard style={styles.card}>
      <CustomCardContent style={styles.cardContentContainer}>
        <Text style={styles.cardTitle}>All Customers</Text>

        {loadingBalances ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading customer balances...</Text>
          </View>
        ) : parties.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="account-group-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No customers found</Text>
          </View>
        ) : (
          <View style={styles.mainContainer}>
            {/* Customer List Container with fixed height */}
            
            <View style={styles.listContainer}>
              <FlatList
                data={parties}
                renderItem={renderCustomerItem}
                keyExtractor={item => item._id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                initialNumToRender={7}
                maxToRenderPerBatch={10}
                windowSize={5}
              />
            </View>

            {/* Pagination */}
            {totalItems > 7 && ( // Only show pagination if more than 7 items
              <View style={styles.pagination}>
                <View style={styles.paginationInfo}>
                  <Text style={styles.paginationText}>
                    Showing {startIndex + 1} to {Math.min(endIndex, totalItems)}{' '}
                    of {totalItems} customers
                  </Text>
                </View>
                <View style={styles.paginationControls}>
                  <CustomButton
                    onPress={goToPrevPage}
                    disabled={currentPage === 1}
                    style={styles.paginationButton}
                  >
                    Previous
                  </CustomButton>
                  <Text style={styles.pageNumber}>
                    Page {currentPage} of {totalPages}
                  </Text>
                  <CustomButton
                    onPress={goToNextPage}
                    disabled={currentPage === totalPages}
                    style={styles.paginationButton}
                  >
                    Next
                  </CustomButton>
                </View>
              </View>
            )}
          </View>
        )}
      </CustomCardContent>
    </CustomCard>
  );
};

// You can use a smaller percentage or calculate a height based on item height
// e.g., if one card is ~60 height, 7 items is ~420.
const LIST_HEIGHT = Dimensions.get('window').height * 0.55;

const styles = StyleSheet.create({
  // --- Custom Button Styles (replaces react-native-paper Button) ---
  buttonBase: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    minHeight: 30, // Approximate compact height
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutlined: {
    borderWidth: 1,
    borderColor: '#3b82f6', // Use a primary color
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextOutlined: {
    color: '#3b82f6',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // -----------------------------------------------------------------

  // --- Custom Card Styles (replaces react-native-paper Card) ---
  cardBase: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  // -----------------------------------------------------------

  card: {
    margin: 10,
    marginTop: 8,
    flex: 1,
    // Note: elevation is now handled by cardBase
  },
  cardContentContainer: {
    padding: 0,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    color: '#1f2937',
  },
  mainContainer: {
    flex: 1,
  },
  listContainer: {
   
    minHeight: 400,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  customerCard: {
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 0, // Remove shadow for inner card
  },
  evenCard: {
    backgroundColor: '#ffffff',
  },
  oddCard: {
    backgroundColor: '#f9fafb',
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
    marginRight: 16,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  customerContact: {
    fontSize: 14,
    color: '#6b7280',
  },
  customerBalance: {
    alignItems: 'flex-end',
    minWidth: 120,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  positiveBalance: {
    color: '#16a34a',
  },
  negativeBalance: {
    color: '#dc2626',
  },
  balanceNote: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },
  viewButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    // compact is now handled by the custom button's default padding
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    height: 200,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
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
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  paginationButton: {
    minWidth: 100,
  },
  pageNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    minWidth: 80,
    textAlign: 'center',
  },
});

export default CustomerListCard;
