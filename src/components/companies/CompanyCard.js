import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Hardcoded company data
const COMPANY_DATA = {
  businessName: 'Tech Solutions Inc.',
  businessType: 'Information Technology',
  companyOwner: 'John Doe',
  mobileNumber: '+1 (555) 123-4567',
  registrationNumber: 'REG-2024-001',
  gstin: 'GSTIN-123456789',
  PANNumber: 'ABCDE1234F',
  address: '123 Business Street',
  City: 'New York',
  addressState: 'NY',
  Country: 'USA',
  Pincode: '10001',
  emailId: 'contact@techsolutions.com',
  ewayBillApplicable: true,
};

const CompanyCard = ({
  company = COMPANY_DATA,
  clientName,
  onEdit,
  onDelete,
}) => {
  const TableRow = ({ label, value, isMonospace = false }) => (
    <View style={styles.tableRow}>
      <View style={styles.tableCell}>
        <Text style={styles.labelText}>{label}</Text>
      </View>
      <View style={[styles.tableCell, styles.valueCell]}>
        {isMonospace ? (
          <View style={styles.monospaceContainer}>
            <Text style={styles.monospaceText}>{value || 'N/A'}</Text>
          </View>
        ) : (
          <Text style={styles.valueText}>{value || 'N/A'}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Icon name="office-building" size={24} color="#3b82f6" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.cardTitle}>{company.businessName}</Text>
            <Text style={styles.cardDescription}>{company.businessType}</Text>
            {clientName && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Client: {clientName}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.table}>
          <View style={styles.tableBody}>
            <TableRow label="Owner" value={company.companyOwner} />
            <TableRow label="Contact Number" value={company.mobileNumber} />
            <TableRow
              label="Registration No."
              value={company.registrationNumber}
              isMonospace
            />
            <TableRow label="GSTIN" value={company.gstin} isMonospace />
            <TableRow
              label="PAN Number"
              value={company.PANNumber}
              isMonospace
            />
            <TableRow
              label="Address"
              value={`${company.address}, ${company.City}, ${company.addressState}, ${company.Country} - ${company.Pincode}`}
            />
            <TableRow label="Email" value={company.emailId} />
            <TableRow
              label="E-Way Bill"
              value={company.ewayBillApplicable ? 'Yes' : 'No'}
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.footerActions}>
          {onEdit && (
            <TouchableOpacity style={styles.ghostButton} onPress={onEdit}>
              <Icon
                name="pencil"
                size={16}
                color="#3b82f6"
                style={styles.buttonIcon}
              />
              <Text style={styles.ghostButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    flexDirection: 'column',
    maxHeight: Dimensions.get('window').height * 0.7, // reduced for better fit
    overflow: 'hidden',
  },
  // Header
  cardHeader: {
    padding: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    padding: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 6,
  },
  headerText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
  },
  // Content
  cardContent: {
    paddingHorizontal: 0,
  },
  scrollArea: {
    paddingHorizontal: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  table: {
    width: '100%',
  },
  tableBody: {
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    minHeight: 44,
    alignItems: 'center',
  },
  tableCell: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  valueCell: {
    flex: 1,
  },
  labelText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    width: 100,
  },
  valueText: {
    fontSize: 12,
    color: '#1a1a1a',
    flexWrap: 'wrap',
    flex: 1,
  },
  monospaceContainer: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
  },
  monospaceText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  // Footer
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 8,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  buttonIcon: {
    marginRight: 6,
  },
  ghostButtonText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default CompanyCard;
