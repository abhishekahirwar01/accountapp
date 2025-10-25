import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Building, Edit, Trash2 } from 'lucide-react-native';

const CompanyCard = ({ company, clientName, onEdit, onDelete }) => {
  const InfoRow = ({ label, value, isMono = false }) => (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, isMono && styles.monoText]}>
        {value || 'N/A'}
      </Text>
    </View>
  );

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Building size={24} color="#007AFF" />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{company.businessName}</Text>
            <Text style={styles.subtitle}>{company.businessType}</Text>
            {clientName && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Client: {clientName}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <InfoRow label="Owner" value={company.companyOwner} />
        <InfoRow label="Contact Number" value={company.mobileNumber} />

        <InfoRow
          label="Registration No."
          value={company.registrationNumber}
          isMono={true}
        />

        <InfoRow label="GSTIN" value={company.gstin} isMono={true} />

        <InfoRow label="PAN Number" value={company.PANNumber} isMono={true} />

        <InfoRow
          label="Address"
          value={`${company.address}, ${company.City}, ${company.addressState}, ${company.Country} - ${company.Pincode}`}
        />

        <InfoRow label="Email" value={company.emailId} />

        <InfoRow
          label="E-Way Bill"
          value={company.ewayBillApplicable ? 'Yes' : 'No'}
        />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {onEdit && (
          <TouchableOpacity style={styles.button} onPress={onEdit}>
            <Edit size={16} color="#007AFF" />
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
        )}

        {/* Uncomment if needed
        {onDelete && (
          <TouchableOpacity style={styles.button} onPress={onDelete}>
            <Trash2 size={16} color="#FF3B30" />
            <Text style={[styles.buttonText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
        )}
        */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    padding: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#666666',
  },
  content: {
    flex: 1,
    maxHeight: 300,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  label: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#000000',
    flex: 2,
    textAlign: 'right',
  },
  monoText: {
    fontFamily: 'monospace',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  deleteText: {
    color: '#FF3B30',
  },
});

export default CompanyCard;
