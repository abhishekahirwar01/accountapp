import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const CompanyCard = ({ company, clientName, onEdit, onDelete }) => {
  return (
    <View style={styles.card}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.companyName} numberOfLines={1}>
              {company.businessName}
            </Text>
            <Text style={styles.businessType}>{company.businessType}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Client</Text>
          </View>
        </View>
      </View>

      {/* Company Details */}
      <View style={styles.content}>
        {/* Assigned Client */}
        <View style={styles.detailRow}>
          <View style={[styles.iconContainer, styles.blueIcon]}>
            <Icon name="account" size={16} color="#2563eb" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Assigned Client</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {clientName}
            </Text>
            <Text style={styles.detailSubtext} numberOfLines={1}>
              {company.emailId || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.detailRow}>
          <View style={[styles.iconContainer, styles.greenIcon]}>
            <Icon name="phone" size={16} color="#16a34a" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Contact</Text>
            <Text style={styles.detailValue}>{company.mobileNumber}</Text>
          </View>
        </View>

        {/* Identifiers - Horizontal Layout */}
        <View style={styles.identifiersContainer}>
          {/* Registration Number */}
          <View style={styles.identifierItem}>
            <View style={styles.identifierHeader}>
              <View style={[styles.iconContainer, styles.purpleIcon]}>
                <Icon name="identifier" size={14} color="#7c3aed" />
              </View>
              <Text style={styles.identifierLabel}>Registration</Text>
            </View>
            <Text style={styles.identifierValue} numberOfLines={1}>
              {company.registrationNumber}
            </Text>
          </View>

          {/* GSTIN */}
          <View style={styles.identifierItem}>
            <View style={styles.identifierHeader}>
              <View style={[styles.iconContainer, styles.orangeIcon]}>
                <Icon name="file-document" size={14} color="#ea580c" />
              </View>
              <Text style={styles.identifierLabel}>GSTIN</Text>
            </View>
            <Text style={styles.identifierValue} numberOfLines={1}>
              {company.gstin || 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={onEdit}
        >
          <Icon name="pencil" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={onDelete}
        >
          <Icon name="trash-can" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: 'linear-gradient(90deg, #f9fafb, #f3f4f6)',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  },
  badge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  content: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  blueIcon: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  greenIcon: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
  },
  purpleIcon: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  orangeIcon: {
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  detailSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  identifiersContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  identifierItem: {
    flex: 1,
  },
  identifierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  identifierLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  identifierValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    color: '#374151',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    padding: 12,
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
    backgroundColor: '#3b82f6',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    width: 40,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CompanyCard;
