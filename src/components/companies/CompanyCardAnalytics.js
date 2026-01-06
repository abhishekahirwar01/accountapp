import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const CompanyCardAnalytics = ({ company, clientName, onEdit, onDelete }) => {
  const { height: screenHeight } = Dimensions.get('window');

  return (
    <View style={styles.card}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Icon name="office-building" size={24} color="#3b82f6" />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.companyName} numberOfLines={1}>
              {company.businessName}
            </Text>
            <Text style={styles.businessType}>{company.businessType}</Text>
            {clientName && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Client: {clientName}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Company Details - Fixed height with proper scrolling */}
      <View style={styles.scrollContainer}>
        <ScrollView 
          style={styles.scrollArea} 
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.content}>
            {/* Company Owner */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <Text style={styles.detailLabel}>Owner</Text>
              </View>
              <Text style={styles.detailValue}>{company.companyOwner}</Text>
            </View>

            {/* Contact Number */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <Text style={styles.detailLabel}>Contact Number</Text>
              </View>
              <Text style={styles.detailValue}>{company.mobileNumber}</Text>
            </View>

            {/* Registration Number */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <Text style={styles.detailLabel}>Registration No.</Text>
              </View>
              <View style={styles.codeContainer}>
                <Text style={styles.codeText}>{company.registrationNumber}</Text>
              </View>
            </View>

            {/* GSTIN */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <Text style={styles.detailLabel}>GSTIN</Text>
              </View>
              <View style={styles.codeContainer}>
                <Text style={styles.codeText}>{company.gstin || "N/A"}</Text>
              </View>
            </View>

            {/* PAN Number */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <Text style={styles.detailLabel}>PAN Number</Text>
              </View>
              <View style={styles.codeContainer}>
                <Text style={styles.codeText}>{company.PANNumber || "N/A"}</Text>
              </View>
            </View>

            {/* Address */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <Text style={styles.detailLabel}>Address</Text>
              </View>
              <Text style={styles.detailValue}>
                {company.address}, {company.City}, {company.addressState},{" "}
                {company.Country} - {company.Pincode}
              </Text>
            </View>

            {/* Email */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <Text style={styles.detailLabel}>Email</Text>
              </View>
              <Text style={styles.detailValue}>{company.emailId || "N/A"}</Text>
            </View>

            {/* E-Way Bill */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <Text style={styles.detailLabel}>E-Way Bill</Text>
              </View>
              <Text style={styles.detailValue}>
                {company.ewayBillApplicable ? "Yes" : "No"}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Actions Footer */}
      <View style={styles.footer}>
        {onEdit && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]} 
            onPress={onEdit}
          >
            <Icon name="pencil" size={16} color="#3b82f6" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
    flex: 1,
    maxHeight: 600, // ✅ Increased overall card height
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    padding: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
  },
  titleContainer: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  businessType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  scrollContainer: {
    flex: 1,
    minHeight: 800, // ✅ Minimum height for scroll area
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabelContainer: {
    width: 140,
    paddingRight: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    flexWrap: 'wrap',
  },
  codeContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  codeText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#374151',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: '#f9fafb',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  editButton: {
    backgroundColor: 'transparent',
  },
  editButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CompanyCardAnalytics; 