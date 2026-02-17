import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

      {/* Actions Footer - Modern Balanced Look */}
      <View style={styles.footer}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[styles.circleButton, styles.editButtonShadow]}
          onPress={onEdit}
        >
          <Icon name="pencil-outline" size={20} color="#2563eb" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.circleButton, styles.deleteButtonShadow]}
          onPress={onDelete}
        >
          <Icon name="trash-can-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#f9fafb',
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
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    textTransform: 'uppercase', // Business Name Capital Letter mein
    letterSpacing: 0.5,
  },
  businessType: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
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
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  blueIcon: { backgroundColor: '#eff6ff' },
  greenIcon: { backgroundColor: '#f0fdf4' },
  purpleIcon: { backgroundColor: '#f5f3ff' },
  orangeIcon: { backgroundColor: '#fff7ed' },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  detailSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  identifiersContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  identifierItem: {
    flex: 1,
  },
  identifierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  identifierLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  identifierValue: {
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    color: '#374151',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 12,
    paddingTop: 0,
    backgroundColor: '#fff',
    justifyContent: 'flex-end',
    gap: 12,
    paddingBottom: 16,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
  },
  editButtonShadow: {
    borderColor: '#dbeafe',
    backgroundColor: '#eff6ff',
  },
  deleteButtonShadow: {
    borderColor: '#fee2e2',
    backgroundColor: '#fef2f2',
  },
});

export default CompanyCard;
