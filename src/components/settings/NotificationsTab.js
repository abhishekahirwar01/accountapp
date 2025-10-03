import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet
} from 'react-native';
import { Bell } from 'lucide-react-native';

const NotificationsTab = () => {
  const [invoiceEmails, setInvoiceEmails] = React.useState(true);
  const [reportEmails, setReportEmails] = React.useState(false);
  const [securityAlerts, setSecurityAlerts] = React.useState(true);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerContent}>
            <Bell size={24} color="#000" />
            <View style={styles.headerText}>
              <Text style={styles.cardTitle}>Notification Settings</Text>
              <Text style={styles.cardDescription}>
                Configure how you receive notifications
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardContent}>
          {/* Invoice Emails */}
          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Text style={styles.label}>Invoice Emails</Text>
              <Text style={styles.description}>
                Receive email notifications for new invoices and payments.
              </Text>
            </View>
            <Switch
              value={invoiceEmails}
              onValueChange={setInvoiceEmails}
            />
          </View>

          <View style={styles.separator} />

          {/* Monthly Reports */}
          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Text style={styles.label}>Monthly Reports</Text>
              <Text style={styles.description}>
                Receive monthly financial summary reports via email.
              </Text>
            </View>
            <Switch
              value={reportEmails}
              onValueChange={setReportEmails}
            />
          </View>

          <View style={styles.separator} />

          {/* Security Alerts */}
          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Text style={styles.label}>Security Alerts</Text>
              <Text style={styles.description}>
                Receive email notifications for security-related events.
              </Text>
            </View>
            <Switch
              value={securityAlerts}
              onValueChange={setSecurityAlerts}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default NotificationsTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
  cardContent: {
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  settingText: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 8,
  },
});
