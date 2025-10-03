import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Card, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User, Bell, Send, Building, Package, Contact, Store, Server, FileText, Shield,
  CheckCircle, XCircle, UserCircle, MessageSquare, ArrowLeft
} from 'lucide-react-native';

// ---- Settings screens (your actual components) ----
import VendorSettings from '../../components/settings/VendorSettings';
import CustomerSettings from '../../components/settings/CustomerSettings';
import ProductSettings from '../../components/settings/ProductSettings';
import ProfileTab from '../../components/settings/ProfileTab';
import NotificationsTab from '../../components/settings/NotificationsTab';
import ServiceSettings from '../../components/settings/ServiceSettings';
import BankSettings from '../../components/settings/BankSettings';
import TemplateSettings from '../../components/settings/TemplateSettings';
import EmailSendingConsent from '../../components/settings/EmailSendingConsent';

// ---- Mocked hooks (replace with real ones) ----
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
    maxInventories: 50,
  },
  isLoading: false,
});

const useUserPermissions = () => ({
  permissions: {
    canCreateSaleEntries: true,
    canCreatePurchaseEntries: true,
    canCreateReceiptEntries: true,
    canCreateJournalEntries: true,
    canCreateCustomers: true,
    canCreateVendors: true,
    canCreateInventory: true,
    canSendInvoiceEmail: true,
    canSendInvoiceWhatsapp: true,
    canShowCustomers: true,
    canShowVendors: true,
  },
  isLoading: false,
});

const getCurrentUser = () => ({
  role: 'client', // 'client' | 'customer' | 'user' | 'manager' | 'admin'
  name: 'John Doe',
  email: 'john.doe@example.com',
});

// =================== Permissions Card ===================
const PermissionsTab = ({ isUser = false }) => {
  const { permissions } = usePermissions();
  const { permissions: userCaps } = useUserPermissions();
  const currentUser = getCurrentUser();
  const isCustomer = currentUser?.role === 'customer' || currentUser?.role === 'client';
  const theme = useTheme();

  const permissionItems = [
    { label: 'Create Users', granted: permissions?.canCreateUsers, icon: User },
    { label: 'Create Customers', granted: permissions?.canCreateCustomers, icon: Contact },
    { label: 'Create Vendors', granted: permissions?.canCreateVendors, icon: Store },
    { label: 'Create Products', granted: permissions?.canCreateProducts, icon: Package },
    { label: 'Send Invoice via Email', granted: permissions?.canSendInvoiceEmail, icon: Send },
    { label: 'Send Invoice via WhatsApp', granted: permissions?.canSendInvoiceWhatsapp, icon: MessageSquare },
  ];

  const userPermissionItems = [
    { label: 'Create Sales Entries', granted: userCaps?.canCreateSaleEntries, icon: User },
    { label: 'Create Purchase Entries', granted: userCaps?.canCreatePurchaseEntries, icon: Store },
    { label: 'Create Receipt Entries', granted: userCaps?.canCreateReceiptEntries, icon: Contact },
    { label: 'Create Journal Entries', granted: userCaps?.canCreateJournalEntries, icon: Package },
    { label: 'Create Customers', granted: userCaps?.canCreateCustomers, icon: Contact },
    { label: 'Create Vendors', granted: userCaps?.canCreateVendors, icon: Store },
    { label: 'Create Inventory', granted: userCaps?.canCreateInventory, icon: Package },
    { label: 'Send Invoice via Email', granted: userCaps?.canSendInvoiceEmail, icon: Send },
    { label: 'Send Invoice via WhatsApp', granted: userCaps?.canSendInvoiceWhatsapp, icon: MessageSquare },
    { label: 'Show Customers', granted: userCaps?.canShowCustomers, icon: Contact },
    { label: 'Show Vendors', granted: userCaps?.canShowVendors, icon: Store },
  ];

  const limitItems = [
    { label: 'Max Companies', value: permissions?.maxCompanies, icon: Building },
    { label: 'Max Users', value: permissions?.maxUsers, icon: User },
    { label: 'Max Inventories', value: permissions?.maxInventories, icon: Package },
  ];

  const features = isUser
    ? userPermissionItems.filter((item) => item.granted)
    : permissionItems;

  if (isUser && features.length === 0) {
    return (
      <View style={styles.tabBody}>
        <Text style={styles.noPermissionsText}>No permissions granted.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabBody} showsVerticalScrollIndicator={false}>
      {isCustomer && !isUser && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Shield size={24} color={theme?.colors?.primary || '#3b82f6'} />
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Plan & Permissions</Text>
                <Text style={styles.cardDescription}>
                  Your current feature access and limits
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>USAGE LIMITS</Text>
              <View style={styles.limitsRow}>
                {limitItems.map((item, idx) => (
                  <View
                    key={item.label}
                    style={[styles.limitItem, idx % 3 !== 2 && { marginRight: 12 }]}
                  >
                    <View style={styles.limitItemHeader}>
                      <item.icon size={20} color={'#9ca3af'} />
                      <Text style={styles.limitValue}>{item.value ?? 'N/A'}</Text>
                    </View>
                    <Text style={styles.limitLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>FEATURE ACCESS</Text>
              <View>
                {features.map((item) => (
                  <View key={item.label} style={styles.featureItem}>
                    <View style={styles.featureInfo}>
                      <item.icon size={16} color={'#9ca3af'} />
                      <Text style={styles.featureLabel}>{item.label}</Text>
                    </View>
                    {item.granted ? (
                      <CheckCircle size={20} color="#10b981" />
                    ) : (
                      <XCircle size={20} color="#ef4444" />
                    )}
                  </View>
                ))}
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {isUser && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Shield size={24} color={theme?.colors?.primary || '#3b82f6'} />
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>My Permissions</Text>
                <Text style={styles.cardDescription}>
                  What I'm allowed to do in this account
                </Text>
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>FEATURE ACCESS</Text>
              <View>
                {features.map((item) => (
                  <View key={item.label} style={styles.featureItem}>
                    <View style={styles.featureInfo}>
                      <item.icon size={16} color={'#9ca3af'} />
                      <Text style={styles.featureLabel}>{item.label}</Text>
                    </View>
                    <CheckCircle size={20} color="#10b981" />
                  </View>
                ))}
              </View>
            </View>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

// =================== Main Screen ===================
export default function ProfileScreen({ navigation }) {
  const { permissions, isLoading } = usePermissions();
  const { permissions: userCaps, isLoading: isUserLoading } = useUserPermissions();
  const currentUser = getCurrentUser();
  const role = currentUser?.role;
  const theme = useTheme();

  // 🔥 Updated here to support both "customer" and "client"
  const isClient = role === 'customer' || role === 'client';
  const isUser =
    role === 'user' || role === 'manager' || role === 'admin';
  const isMember = isClient || isUser;

  if (isMember && (isLoading || isUserLoading)) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme?.colors?.primary || '#3b82f6'} />
      </SafeAreaView>
    );
  }

  const allow = (clientFlag, userFlag) =>
    (isClient && !!clientFlag) || (isUser && !!userFlag);

  const adminTabs = [
    { value: 'profile', label: 'Profile', component: <ProfileTab />, icon: UserCircle },
    { value: 'notifications', label: 'Notifications', component: <NotificationsTab />, icon: Bell },
  ];

  const permissionsTab = isUser
    ? { value: 'my-permissions', label: 'My Permissions', component: <PermissionsTab isUser />, icon: Shield }
    : { value: 'permissions', label: 'Permissions', component: <PermissionsTab />, icon: Shield };

  const memberTabs = [permissionsTab];

  if (allow(permissions?.canCreateVendors, userCaps?.canCreateVendors) || userCaps?.canShowVendors) {
    memberTabs.push({ value: 'vendors', label: 'Vendors', component: <VendorSettings />, icon: Store });
  }

  if (allow(permissions?.canCreateCustomers, userCaps?.canCreateCustomers) || userCaps?.canShowCustomers) {
    memberTabs.push({ value: 'customers', label: 'Customers', component: <CustomerSettings />, icon: Contact });
  }

  if (allow(userCaps?.canCreateInventory, userCaps?.canCreateInventory)) {
    memberTabs.push({ value: 'products', label: 'Products', component: <ProductSettings />, icon: Package });
    memberTabs.push({ value: 'services', label: 'Services', component: <ServiceSettings />, icon: Server });
  }

  if (role !== 'user') {
    memberTabs.push({ value: 'templates', label: 'Invoices', component: <TemplateSettings />, icon: FileText });

    if (allow(userCaps?.canCreateInventory, userCaps?.canCreateInventory)) {
      memberTabs.push({ value: 'banks', label: 'Banks', component: <BankSettings />, icon: Building });
    }

    memberTabs.push({ value: 'notifications', label: 'Notifications', component: <NotificationsTab />, icon: Bell });
  }

  if (isClient && permissions?.canSendInvoiceEmail === true) {
    memberTabs.push({ value: 'email-consent', label: 'Email Consent', component: <EmailSendingConsent />, icon: Send });
  }

  const availableTabs = isMember ? memberTabs : adminTabs;

  let defaultTab = 'profile';
  if (isUser) defaultTab = 'my-permissions';
  else if (isMember) defaultTab = 'permissions';

  const [selectedTab, setSelectedTab] = useState(defaultTab);

  // Handle back navigation
  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {/* Header with Back Button */}
          <View style={styles.headerContainer}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={handleBackPress}
              >
                <ArrowLeft size={24} color="#1f2937" />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Settings</Text>
                <Text style={styles.headerSubtitle}>
                  Manage your account and business entities.
                </Text>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
            >
              {availableTabs.map((tab) => {
                const active = selectedTab === tab.value;
                return (
                  <TouchableOpacity
                    key={tab.value}
                    style={[styles.tabItem, active && styles.tabItemActive]}
                    onPress={() => setSelectedTab(tab.value)}
                  >
                    <View style={styles.tabRow}>
                      {tab.icon && (
                        <tab.icon
                          size={18}
                          color={active ? (theme?.colors?.primary || '#3b82f6') : '#9ca3af'}
                          style={{ marginRight: 8 }}
                        />
                      )}
                      <Text
                        style={[styles.tabText, active && styles.tabTextActive]}
                        numberOfLines={1}
                      >
                        {tab.label}
                      </Text>
                    </View>

                    {active && <View style={styles.activeIndicator} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContentWrapper}>
            {availableTabs.find((t) => t.value === selectedTab)?.component}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =================== Styles ===================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  headerContainer: {
    marginBottom: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    marginTop: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 22,
  },

  // Tabs
  tabsContainer: {
    marginBottom: 16,
  },
  tabsScrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tabItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 4,
    position: 'relative',
    minWidth: 110,
    borderRadius: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabItemActive: {
    backgroundColor: '#f8fafc',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: '#3b82f6',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  // Tab Content Wrapper
  tabContentWrapper: {
    flex: 1,
    marginTop: 12,
  },

  // Tab body wrapper (PermissionsTab scroll area)
  tabBody: {
    flex: 1,
  },

  // Cards
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    backgroundColor: '#fff',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 20,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },

  // Limits (3-up row)
  limitsRow: {
    flexDirection: 'row',
  },
  limitItem: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  limitItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  limitValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  limitLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Features list
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  featureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1f2937',
  },

  // Empty state
  noPermissionsText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 24,
  },
});