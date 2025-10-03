import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from 'react-native';
import { Card, Button, useTheme } from 'react-native-paper';
import { 
  User, Bell, Send, Building, Package, Contact, Store, Server, FileText 
} from 'lucide-react-native';

// Import your settings components
import VendorSettings from '../../components/settings/VendorSettings';
import CustomerSettings from '../../components/settings/CustomerSettings';
import ProductSettings from '../../components/settings/ProductSettings';
import ProfileTab from '../../components/settings/ProfileTab';
import NotificationsTab from '../../components/settings/NotificationsTab';
import ServiceSettings from '../../components/settings/ServiceSettings';
import BankSettings from '../../components/settings/BankSettings';
import TemplateSettings from '../../components/settings/TemplateSettings';
import EmailSendingConsent from '../../components/settings/EmailSendingConsent';

// Mocked hooks and functions (replace with real ones)
const usePermissions = () => ({ 
  permissions: {
    canCreateUsers: true,
    canCreateCustomers: true,
    canCreateVendors: true,
    canCreateProducts: true,
    canSendInvoiceEmail: true,
    canSendInvoiceWhatsapp: true,
    maxCompanies: 5,
    maxUsers: 10,
    maxInventories: 50
  }, 
  isLoading: false 
});

const useUserPermissions = () => ({ 
  permissions: {
    canCreateSaleEntries: true,
    canCreatePurchaseEntries: true,
    canCreateReceiptEntries: true,
    canCreatePaymentEntries: true,
    canCreateJournalEntries: true,
    canCreateCustomers: true,
    canCreateVendors: true,
    canCreateInventory: true,
    canSendInvoiceEmail: true,
    canSendInvoiceWhatsapp: true,
    canShowCustomers: true,
    canShowVendors: true
  }, 
  isLoading: false 
});

const getCurrentUser = () => ({ 
  role: 'customer', // change to 'user' to test user view
  name: 'John Doe',
  email: 'john.doe@example.com'
});

export default function ProfileScreen() {
  const { permissions, isLoading } = usePermissions();
  const { permissions: userCaps, isLoading: isUserLoading } = useUserPermissions();
  const currentUser = getCurrentUser();
  const role = currentUser?.role;
  const theme = useTheme();

  const isClient = role === 'customer';
  const isUser = role === 'user' || role === 'manager' || role === 'admin';
  const isMember = isClient || isUser;

  if (isMember && (isLoading || isUserLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const allow = (clientFlag, userFlag) =>
    (isClient && !!clientFlag) || (isUser && !!userFlag);

  // Tabs configuration
  const adminTabs = [
    { value: 'profile', label: 'Profile', component: <ProfileTab />, icon: User },
    { value: 'notifications', label: 'Notifications', component: <NotificationsTab />, icon: Bell },
  ];

  const memberTabs = [];

  if (allow(permissions?.canCreateVendors, userCaps?.canCreateVendors)) {
    memberTabs.push({ value: 'vendors', label: 'Vendors', component: <VendorSettings />, icon: Store });
  }

  if (allow(permissions?.canCreateCustomers, userCaps?.canCreateCustomers)) {
    memberTabs.push({ value: 'customers', label: 'Customers', component: <CustomerSettings />, icon: Contact });
  }

  if (allow(userCaps?.canCreateInventory, userCaps?.canCreateInventory)) {
    memberTabs.push({ value: 'products', label: 'Products', component: <ProductSettings />, icon: Package });
    memberTabs.push({ value: 'services', label: 'Services', component: <ServiceSettings />, icon: Server });
  }

  if (role !== 'user') {
    memberTabs.push({ value: 'templates', label: 'Invoices', component: <TemplateSettings />, icon: FileText });
    memberTabs.push({ value: 'banks', label: 'Banks', component: <BankSettings />, icon: Building });
    memberTabs.push({ value: 'notifications', label: 'Notifications', component: <NotificationsTab />, icon: Bell });
  }

  if (isClient && permissions?.canSendInvoiceEmail) {
    memberTabs.push({ value: 'email-consent', label: 'Email Consent', component: <EmailSendingConsent />, icon: Send });
  }

  const availableTabs = isMember ? memberTabs : adminTabs;
  const initialTab = availableTabs.length > 0 ? availableTabs[0].value : 'profile';
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>
            Manage your account, preferences, and business entities.
          </Text>
        </View>

        {/* Mobile dropdown */}
        <View style={styles.mobileDropdownContainer}>
          <Button
            mode="outlined"
            onPress={() => setDropdownVisible(true)}
            style={styles.dropdownButton}
          >
            <Text>
              {availableTabs.find(tab => tab.value === selectedTab)?.label || 'Select a tab'}
            </Text>
            <Text> ▼</Text>
          </Button>

          <Modal
            visible={dropdownVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setDropdownVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Tab</Text>
                {availableTabs.map(tab => (
                  <TouchableOpacity
                    key={tab.value}
                    style={styles.modalOption}
                    onPress={() => {
                      setSelectedTab(tab.value);
                      setDropdownVisible(false);
                    }}
                  >
                    <View style={styles.modalOptionContent}>
                      {tab.icon && <tab.icon size={16} color={theme.colors.primary} />}
                      <Text style={styles.modalOptionText}>{tab.label}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <Button mode="text" onPress={() => setDropdownVisible(false)} style={styles.modalCancelButton}>
                  Cancel
                </Button>
              </View>
            </View>
          </Modal>

          <View style={styles.mobileTabContent}>
            {availableTabs.find(tab => tab.value === selectedTab)?.component}
          </View>
        </View>

        {/* Desktop tabs */}
        <View style={styles.desktopTabsContainer}>
          <View style={styles.tabHeader}>
            {availableTabs.map(tab => (
              <TouchableOpacity
                key={tab.value}
                style={[
                  styles.tabHeaderItem,
                  selectedTab === tab.value && styles.tabHeaderItemActive
                ]}
                onPress={() => setSelectedTab(tab.value)}
              >
                <Text
                  style={[
                    styles.tabHeaderText,
                    selectedTab === tab.value && styles.tabHeaderTextActive
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.tabContentContainer}>
            {availableTabs.map(tab => (
              <View
                key={tab.value}
                style={[styles.tabContent, selectedTab !== tab.value && styles.tabContentHidden]}
              >
                {tab.component}
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  contentContainer: { gap: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', height: '100%' },
  headerContainer: { marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { color: '#6b7280', marginTop: 8 },
  mobileDropdownContainer: { display: 'none' },
  dropdownButton: { justifyContent: 'space-between' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 8, padding: 16, width: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalOptionContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalOptionText: { fontSize: 14 },
  modalCancelButton: { marginTop: 16 },
  mobileTabContent: { marginTop: 24 },
  desktopTabsContainer: { display: 'flex' },
  tabHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tabHeaderItem: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabHeaderItemActive: { borderBottomColor: '#3b82f6' },
  tabHeaderText: { textAlign: 'center', fontWeight: '500', color: '#6b7280' },
  tabHeaderTextActive: { color: '#3b82f6' },
  tabContentContainer: { marginTop: 24 },
  tabContent: { display: 'flex' },
  tabContentHidden: { display: 'none' },
});
