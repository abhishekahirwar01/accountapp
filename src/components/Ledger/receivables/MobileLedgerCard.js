import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card, Badge } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MobileLedgerCard = ({
  entry,
  type,
  formatIndianNumber,
  format,
  showViewDetails = false,
  onViewDetails,
}) => {
  const isDebit = type === 'debit';
  const borderColor = isDebit ? '#dc2626' : '#16a34a';
  const textColor = isDebit ? '#dc2626' : '#16a34a';
  const bgColor = isDebit ? '#fef2f2' : '#f0fdf4';

  return (
    <Card style={[styles.card, { borderLeftColor: borderColor, borderLeftWidth: 4 }]}>
      <Card.Content style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Badge
            style={[
              styles.badge,
              { backgroundColor: isDebit ? '#fee2e2' : '#dcfce7' },
            ]}
            textStyle={{ color: textColor }}
          >
            {entry.transactionType}
          </Badge>
          <Text style={[styles.amount, { color: textColor }]}>
            ₹{formatIndianNumber(entry.amount)}
          </Text>
        </View>

        {/* Details */}
        <View style={styles.details}>
          {/* Date */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {format(new Date(entry.date), 'dd/MM/yyyy')}
            </Text>
          </View>

          {/* Payment Method */}
          {entry.paymentMethod && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment:</Text>
              <Badge
                style={styles.paymentBadge}
                textStyle={styles.paymentBadgeText}
              >
                {entry.paymentMethod}
              </Badge>
            </View>
          )}

          {/* Reference Number */}
          {entry.referenceNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference:</Text>
              <Text style={styles.referenceText}>{entry.referenceNumber}</Text>
            </View>
          )}

          {/* Description */}
          {entry.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description:</Text>
              <Text style={styles.descriptionText} numberOfLines={2}>
                {entry.description}
              </Text>
            </View>
          )}

          
          {showViewDetails && (
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={onViewDetails}
            >
              <Icon name="eye-outline" size={16} color="#3b82f6" />
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    backgroundColor: 'white',
    // elevation: 1,
    width:'100%'
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8,
    // paddingVertical: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    flex: 2,
    textAlign: 'right',
  },
  paymentBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  paymentBadgeText: {
    fontSize: 12,
    color: '#2563eb',
  },
  referenceText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#4b5563',
    flex: 2,
    textAlign: 'right',
  },
  descriptionText: {
    fontSize: 14,
    color: '#4b5563',
    flex: 2,
    textAlign: 'right',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
});

export default MobileLedgerCard;