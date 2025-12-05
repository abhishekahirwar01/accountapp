import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Card, Button, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
    <Card style={[
      styles.customerCard,
      index % 2 === 0 ? styles.evenCard : styles.oddCard
    ]}>
      <Card style={styles.cardContent}>
        <View style={styles.customerRow}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {capitalizeWords(item.name)}
            </Text>
            {item.contactNumber && (
              <Text style={styles.customerContact}>
                {item.contactNumber}
              </Text>
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
        <Button
          mode="outlined"
          onPress={() => setSelectedParty(item._id)}
          style={styles.viewButton}
          compact
        >
          View Ledger
        </Button>
      </Card>
    </Card>
  );

  // Calculate how many items we should show (max 7)
  const itemsToShow = Math.min(parties.length, 7);

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContentContainer}>
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
                keyExtractor={(item) => item._id}
                scrollEnabled={true}
                showsVerticalScrollIndicator={true}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                initialNumToRender={7}
                maxToRenderPerBatch={10}
                windowSize={5}
              />
            </View>

            {/* Pagination */}
            {totalItems > 7 && (  // Only show pagination if more than 7 items
              <View style={styles.pagination}>
                <View style={styles.paginationInfo}>
                  <Text style={styles.paginationText}>
                    Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} customers
                  </Text>
                </View>
                <View style={styles.paginationControls}>
                  <Button
                    mode="outlined"
                    onPress={goToPrevPage}
                    disabled={currentPage === 1}
                    style={styles.paginationButton}
                    compact
                  >
                    Previous
                  </Button>
                  <Text style={styles.pageNumber}>
                    Page {currentPage} of {totalPages}
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={goToNextPage}
                    disabled={currentPage === totalPages}
                    style={styles.paginationButton}
                    compact
                  >
                    Next
                  </Button>
                </View>
              </View>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    marginTop: 8,
    elevation: 3,
    flex: 1,
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
    height: Dimensions.get('window').height * 1, // Fixed height for 7 items
    minHeight: 400, // Minimum height
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