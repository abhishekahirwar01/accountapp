import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  StatusBar,
  useWindowDimensions,
  RefreshControl,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Bell,
  Send,
  Building,
  Package,
  Contact,
  Store,
  Server,
  FileText,
  Shield,
  Check,
  X,
  AlertTriangle,
  UserCircle,
  MessageSquare,
  Users,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from 'lucide-react-native';

import { BASE_URL } from '../../config';
import { usePermissions } from '../../contexts/permission-context';
import { useUserPermissions } from '../../contexts/user-permissions-context';
import {
  useSocket,
  usePermissionSocket,
  useUserPermissionSocket,
} from '../../components/hooks/useSocket';
import { getCurrentUser } from '../../lib/auth';

import { VendorSettings } from '../../components/settings/VendorSettings';
import { CustomerSettings } from '../../components/settings/CustomerSettings';
import ProductSettings from '../../components/settings/ProductSettings';
import { ProfileTab } from '../../components/settings/ProfileTab';
import { NotificationsTab } from '../../components/settings/NotificationsTab';
import ServiceSettings from '../../components/settings/ServiceSettings';
import BankSettings from '../../components/settings/BankSettings';
import TemplateSettings from '../../components/settings/TemplateSettings';
import { EmailSendingConsent } from '../../components/settings/EmailSendingConsent';

const PermissionsTab = React.memo(() => {
  const { permissions } = usePermissions();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);
  const [gmailLinked, setGmailLinked] = useState(false);
  const [gmailEmail, setGmailEmail] = useState(null);
  const [loadingGmail, setLoadingGmail] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (mounted) setCurrentUser(u);
      } catch (err) {
        // Error handled silently
      } finally {
        if (mounted) setCurrentUserLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const isCustomer =
    currentUser?.role === 'customer' || currentUser?.role === 'client';

  const permissionItems = useMemo(
    () => [
      {
        label: 'Create Users',
        granted: permissions?.canCreateUsers,
        icon: Users,
      },
      {
        label: 'Create Customers',
        granted: permissions?.canCreateCustomers,
        icon: Contact,
      },
      {
        label: 'Create Vendors',
        granted: permissions?.canCreateVendors,
        icon: Store,
      },
      {
        label: 'Create Products',
        granted: permissions?.canCreateProducts,
        icon: Package,
      },
      {
        label: 'Send Invoice via Email',
        granted: permissions?.canSendInvoiceEmail,
        icon: Send,
      },
      {
        label: 'Send Invoice via WhatsApp',
        granted: permissions?.canSendInvoiceWhatsapp,
        icon: MessageSquare,
      },
    ],
    [permissions],
  );

  const limitItems = useMemo(
    () => [
      {
        label: 'Max Companies',
        value: permissions?.maxCompanies,
        icon: Building,
      },
      { label: 'Max Users', value: permissions?.maxUsers, icon: Users },
      {
        label: 'Max Inventories',
        value: permissions?.maxInventories,
        icon: Package,
      },
    ],
    [permissions],
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (isCustomer && permissions?.canSendInvoiceEmail) {
        setLoadingGmail(true);
        try {
          const token = await AsyncStorage.getItem('token');

          if (!token) return;

          const response = await fetch(
            `${BASE_URL}/api/integrations/gmail/status`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (response.ok && mounted) {
            const data = await response.json();
            setGmailLinked(!!data?.connected);
            setGmailEmail(data?.email);
          }
        } catch (error) {
          if (mounted) {
            setGmailLinked(false);
            setGmailEmail(null);
          }
        } finally {
          if (mounted) {
            setLoadingGmail(false);
          }
        }
      } else {
        setLoadingGmail(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isCustomer, permissions?.canSendInvoiceEmail]);

  const emailPerm = permissions?.canSendInvoiceEmail === true;

  if (!isCustomer) {
    return (
      <View style={styles.permissionsContainer}>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Shield size={24} color="#3b82f6" />
              <Text style={styles.cardTitle}>Permissions</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              Only available for customer accounts.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabBody} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Shield size={24} color="#3b82f6" />
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
                  style={[
                    styles.limitItem,
                    idx % 3 !== 2 && { marginRight: 12 },
                  ]}
                >
                  <View style={styles.limitItemHeader}>
                    <item.icon size={20} color="#9ca3af" />
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
              {permissionItems.map(item => {
                const isEmailRow = item.label === 'Send Invoice via Email';

                return (
                  <View key={item.label} style={styles.featureItem}>
                    <View style={styles.featureInfo}>
                      <item.icon size={16} color="#9ca3af" />
                      <Text style={styles.featureLabel}>{item.label}</Text>

                      {isEmailRow && (
                        <TouchableOpacity
                          onPress={() => {
                            if (emailPerm) {
                              Linking.openURL(`${BASE_URL}/integrations/gmail`);
                            }
                          }}
                          disabled={!emailPerm || loadingGmail}
                          style={styles.emailStatusIndicator}
                        >
                          {loadingGmail ? (
                            <ActivityIndicator size="small" color="#3b82f6" />
                          ) : !emailPerm ? (
                            <AlertTriangle size={16} color="#f59e0b" />
                          ) : gmailLinked ? (
                            <Check size={16} color="#10b981" />
                          ) : (
                            <AlertTriangle size={16} color="#f59e0b" />
                          )}
                        </TouchableOpacity>
                      )}
                    </View>

                    {item.granted ? (
                      <CheckCircle size={20} color="#10b981" />
                    ) : (
                      <XCircle size={20} color="#ef4444" />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {isCustomer && permissions?.canSendInvoiceEmail && (
        <View style={styles.emailConsentSection}>
          <EmailSendingConsent />
        </View>
      )}
    </ScrollView>
  );
});

PermissionsTab.displayName = 'PermissionsTab';

const UserPermissionsTab = React.memo(() => {
  const { permissions: userCaps } = useUserPermissions();

  const yes = useCallback(v => {
    return v === true;
  }, []);

  const features = useMemo(() => {
    const allFeatures = [
      {
        label: 'Create Sales Entries',
        granted: yes(userCaps?.canCreateSaleEntries),
        icon: Users,
      },
      {
        label: 'Create Purchase Entries',
        granted: yes(userCaps?.canCreatePurchaseEntries),
        icon: Store,
      },
      {
        label: 'Create Receipt Entries',
        granted: yes(userCaps?.canCreateReceiptEntries),
        icon: Contact,
      },
      {
        label: 'Create Payment Entries',
        granted: yes(userCaps?.canCreatePaymentEntries),
        icon: Send,
      },
      {
        label: 'Create Journal Entries',
        granted: yes(userCaps?.canCreateJournalEntries),
        icon: Package,
      },
      {
        label: 'Create Customers',
        granted: yes(userCaps?.canCreateCustomers),
        icon: Contact,
      },
      {
        label: 'Create Vendors',
        granted: yes(userCaps?.canCreateVendors),
        icon: Store,
      },
      {
        label: 'Create Inventory',
        granted: yes(userCaps?.canCreateInventory),
        icon: Package,
      },
      {
        label: 'Send Invoice via Email',
        granted: yes(userCaps?.canSendInvoiceEmail),
        icon: Send,
      },
      {
        label: 'Send Invoice via WhatsApp',
        granted: yes(userCaps?.canSendInvoiceWhatsapp),
        icon: MessageSquare,
      },
      {
        label: 'Show Customers',
        granted: yes(userCaps?.canShowCustomers),
        icon: Contact,
      },
      {
        label: 'Show Vendors',
        granted: yes(userCaps?.canShowVendors),
        icon: Store,
      },
    ];

    const filteredFeatures = allFeatures.filter(f => f.granted);
    return filteredFeatures;
  }, [userCaps, yes]);

  if (features.length === 0) {
    return (
      <View style={styles.permissionsContainer}>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.noPermissionsText}>
              No permissions granted.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabBody} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Shield size={24} color="#3b82f6" />
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
              {features.map(feature => (
                <View key={feature.label} style={styles.featureItem}>
                  <View style={styles.featureInfo}>
                    <feature.icon size={16} color="#9ca3af" />
                    <Text style={styles.featureLabel}>{feature.label}</Text>
                  </View>
                  <CheckCircle size={20} color="#10b981" />
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
});

UserPermissionsTab.displayName = 'UserPermissionsTab';

export default function ProfilePage({ navigation, route }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { socket, isConnected } = useSocket();
  const { permissions, refetch: refetchPermissions } = usePermissions();

  const { permissions: userCaps, refetch: refetchUserPermissions } =
    useUserPermissions();

  // Real-time Permission Listeners
  usePermissionSocket(() => {
    refetchPermissions?.();
  });

  useUserPermissionSocket(() => {
    refetchUserPermissions();
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [selectedTab, setSelectedTab] = useState('profile');
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    if (initialLoadComplete && route?.params?.selectTab) {
      setSelectedTab(route.params.selectTab);
    }
  }, [initialLoadComplete, route?.params?.selectTab]);

  const handleBackPress = useCallback(() => {
    try {
      if (navigation && typeof navigation.canGoBack === 'function') {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
      }
    } catch (e) {
      // Error handled silently
    }
    return false;
  }, [navigation]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadCurrentUser();
      } catch (error) {
        // Error handled silently
      } finally {
        setInitialLoadComplete(true);
      }
    };

    initializeData();

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );

    return () => {
      backHandler.remove();
    };
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (user) {
        let initialTab = 'profile';
        if (
          user.role === 'user' ||
          user.role === 'manager' ||
          user.role === 'admin'
        ) {
          initialTab = 'my-permissions';
        } else if (user.role === 'customer') {
          initialTab = 'permissions';
        }
        setSelectedTab(initialTab);
      }
      return user;
    } catch (error) {
      throw error;
    }
  };

  const role = currentUser?.role;
  const isClient = role === 'customer';
  const isUser = role === 'user' || role === 'manager' || role === 'admin';
  const isMember = isClient || isUser;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCurrentUser();

      if (isClient && refetchPermissions) {
        await refetchPermissions();
      }

      if (isUser && refetchUserPermissions) {
        await refetchUserPermissions();
      }
    } catch (error) {
      // Error handled silently
    } finally {
      setRefreshing(false);
    }
  }, [
    isClient,
    isUser,
    refetchPermissions,
    refetchUserPermissions,
    loadCurrentUser,
  ]);

  const allow = useCallback(
    (clientFlag, userFlag) => {
      return (isClient && !!clientFlag) || (isUser && !!userFlag);
    },
    [isClient, isUser],
  );

  const availableTabs = useMemo(() => {
    const adminTabs = [
      {
        value: 'profile',
        label: 'Profile',
        component: <ProfileTab />,
        icon: UserCircle,
      },
      {
        value: 'notifications',
        label: 'Notifications',
        component: <NotificationsTab />,
        icon: Bell,
      },
    ];

    const permissionsTab = isUser
      ? {
          value: 'my-permissions',
          label: 'My Permissions',
          icon: Shield,
          component: <UserPermissionsTab />,
        }
      : {
          value: 'permissions',
          label: 'Permissions',
          icon: Shield,
          component: <PermissionsTab />,
        };

    const memberTabs = [permissionsTab];

    if (
      isClient ||
      allow(permissions?.canShowVendors, userCaps?.canShowVendors) ||
      allow(permissions?.canCreateVendors, userCaps?.canCreateVendors)
    ) {
      memberTabs.push({
        value: 'vendors',
        label: 'Vendors',
        component: <VendorSettings />,
        icon: Store,
      });
    }

    if (
      isClient ||
      allow(permissions?.canShowCustomers, userCaps?.canShowCustomers) ||
      allow(permissions?.canCreateCustomers, userCaps?.canCreateCustomers)
    ) {
      memberTabs.push({
        value: 'customers',
        label: 'Customers',
        icon: Contact,
        component: <CustomerSettings />,
      });
    }

    if (
      isClient ||
      allow(permissions?.canCreateInventory, userCaps?.canCreateInventory)
    ) {
      memberTabs.push({
        value: 'products',
        label: 'Products',
        icon: Package,
        component: <ProductSettings />,
      });
    }

    if (
      isClient ||
      allow(permissions?.canCreateInventory, userCaps?.canCreateInventory)
    ) {
      memberTabs.push({
        value: 'services',
        label: 'Services',
        icon: Server,
        component: <ServiceSettings />,
      });
    }

    if (role !== 'user') {
      memberTabs.push({
        value: 'templates',
        label: 'Invoices',
        icon: FileText,
        component: <TemplateSettings />,
      });
    }

    if (role !== 'user') {
      memberTabs.push({
        value: 'banks',
        label: 'Banks',
        icon: Building,
        component: <BankSettings />,
      });
    }

    if (role !== 'user') {
      memberTabs.push({
        value: 'notifications',
        label: 'Notifications',
        icon: Bell,
        component: <NotificationsTab />,
      });
    }

    return isMember ? memberTabs : adminTabs;
  }, [isMember, isUser, isClient, role, permissions, userCaps, allow]);

  if (!initialLoadComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
            progressViewOffset={Platform.OS === 'android' ? 50 : 0}
          />
        }
      >
        <View style={styles.contentContainer}>
          <View style={styles.headerContainer}>
            <View style={styles.headerTextContainer}>
              <View style={styles.headerTitleRow}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackPress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ArrowLeft size={24} color="#3b82f6" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
              </View>

              <Text style={styles.headerSubtitle}>
                Manage your account, preferences, and business entities.
              </Text>
            </View>
          </View>

          <View style={styles.tabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
            >
              {availableTabs.map(tab => {
                const active = selectedTab === tab.value;

                return (
                  <TouchableOpacity
                    key={tab.value}
                    style={[styles.tabItem, active && styles.tabItemActive]}
                    onPress={() => {
                      setSelectedTab(tab.value);
                    }}
                  >
                    <View style={styles.tabRow}>
                      {tab.icon && (
                        <tab.icon
                          size={18}
                          color={active ? '#3b82f6' : '#9ca3af'}
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

          <View style={styles.tabContentWrapper}>
            {(() => {
              const selectedTabData = availableTabs.find(
                t => t.value === selectedTab,
              );
              return selectedTabData?.component;
            })()}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  headerContainer: {
    marginBottom: 24,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 22,
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabsScrollContent: {
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
  tabContentWrapper: {
    flex: 1,
    marginTop: 8,
  },
  tabBody: {
    flex: 1,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    backgroundColor: '#fff',
  },
  cardContent: {
    padding: 20,
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
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
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
  emailStatusIndicator: {
    marginLeft: 10,
    padding: 4,
  },
  emailConsentSection: {
    marginTop: 0,
  },
  permissionsContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  noPermissionsText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 24,
  },
});
