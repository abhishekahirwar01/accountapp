import React, { useState } from 'react';
import {
  View,
  Text,
  Switch as RNSwitch,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export function NotificationsTab() {
  const [invoiceEmails, setInvoiceEmails] = useState(true);
  const [monthlyReports, setMonthlyReports] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerIcon}>
            <Icon name="bell" size={24} color="#8b77ff" />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.cardTitle}>Notification Settings</Text>
            <Text style={styles.cardDescription}>
              Configure how you receive notifications
            </Text>
          </View>
        </View>

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Invoice Emails */}
          <View style={styles.notificationItem}>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Invoice Emails</Text>
              <Text style={styles.notificationDescription}>
                Receive email notifications for new invoices and payments.
              </Text>
            </View>
            <RNSwitch
              value={invoiceEmails}
              onValueChange={setInvoiceEmails}
              trackColor={{ false: '#d1d5db', true: '#8b77ff' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#d1d5db"
            />
          </View>

          {/* Separator */}
          <View style={styles.separator} />

          {/* Monthly Reports */}
          <View style={styles.notificationItem}>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Monthly Reports</Text>
              <Text style={styles.notificationDescription}>
                Receive monthly financial summary reports via email.
              </Text>
            </View>
            <RNSwitch
              value={monthlyReports}
              onValueChange={setMonthlyReports}
              trackColor={{ false: '#d1d5db', true: '#8b77ff' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#d1d5db"
            />
          </View>

          {/* Separator */}
          <View style={styles.separator} />

          {/* Security Alerts */}
          <View style={styles.notificationItem}>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Security Alerts</Text>
              <Text style={styles.notificationDescription}>
                Receive email notifications for security-related events.
              </Text>
            </View>
            <RNSwitch
              value={securityAlerts}
              onValueChange={setSecurityAlerts}
              trackColor={{ false: '#d1d5db', true: '#8b77ff' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#d1d5db"
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9ff',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 12,
    boxShadow:"0px 2px 4px rgba(0, 0, 0, 0.05)"
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 20,
  },
  cardContent: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  notificationContent: {
    flex: 1,
    marginRight: 16,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 20,
  },
});
