import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Dimensions,
  FlatList,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import { BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Icon names mapping
const iconMap = {
  Bell: 'bell',
  Calendar: 'calendar',
  Building: 'office-building',
  Mail: 'email',
  Clock: 'clock',
  User: 'account',
  Phone: 'phone',
  AlertTriangle: 'alert-triangle',
  CheckCircle: 'check-circle',
  Info: 'information',
  XCircle: 'close-circle',
  Check: 'check',
  Copy: 'content-copy',
  ChevronRight: 'chevron-right',
  Sparkles: 'star-four-points',
  Filter: 'filter',
  Search: 'magnify',
  Eye: 'eye',
  CalendarDays: 'calendar-range',
  UserCheck: 'account-check',
  Building2: 'office-building',
  BadgeCheck: 'badge-account',
  CalendarClock: 'calendar-clock',
  Ban: 'cancel',
  Infinity: 'infinity',
  Loader2: 'loading',
};

// Custom Dropdown Component using Modal
const CustomDropdown = ({ options, selectedValue, onSelect, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0, width: 0 });
  const dropdownRef = useRef(null);

  const handleSelect = (value) => {
    onSelect(value);
    setIsOpen(false);
  };

  const handleOpenDropdown = () => {
    dropdownRef.current?.measure((fx, fy, width, height, px, py) => {
      setDropdownPosition({
        x: px,
        y: py ,
        width: width
      });
      setIsOpen(true);
    });
  };

  return (
    <View style={dropdownStyles.container}>
      <TouchableOpacity
        ref={dropdownRef}
        style={dropdownStyles.dropdownHeader}
        onPress={handleOpenDropdown}
        activeOpacity={0.7}
      >
        <Text style={dropdownStyles.selectedText} numberOfLines={1}>
          {options.find(opt => opt.value === selectedValue)?.label || placeholder}
        </Text>
        <Icon 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#6b7280" 
        />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={dropdownStyles.modalOverlay}>
            <View style={[
              dropdownStyles.dropdownList,
              {
                position: 'absolute',
                top: dropdownPosition.y,
                left: dropdownPosition.x,
                width: dropdownPosition.width,
              }
            ]}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    dropdownStyles.dropdownItem,
                    selectedValue === option.value && dropdownStyles.dropdownItemSelected
                  ]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    dropdownStyles.dropdownItemText,
                    selectedValue === option.value && dropdownStyles.dropdownItemTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {selectedValue === option.value && (
                    <Icon name="check" size={16} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const dropdownStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 44,
  },
  selectedText: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownList: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10000,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemSelected: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownItemTextSelected: {
    color: '#3b82f6',
    fontWeight: '500',
  },
});

const HistoryScreen = () => {
  const navigation = useNavigation();
  const [clients, setClients] = useState([]);
  const [validityByClient, setValidityByClient] = useState({});
  const [isValidityLoading, setIsValidityLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const name = selectedClient?.contactName || '—';
  const phone = selectedClient?.phone || '—';

  const handleCopy = async () => {
    if (!selectedClient?.phone) return;
    try {
      await Clipboard.setString(selectedClient.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const makePhoneCall = phoneNumber => {
    if (phoneNumber && phoneNumber !== '—') {
      Linking.openURL(`tel:${phoneNumber.replace(/\s+/g, '')}`);
    }
  };

  // Fetch clients
  const fetchClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found.');
      }
      const response = await fetch(`${BASE_URL}/api/clients`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching clients', error);
      setError('Failed to load clients. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch validities for all clients
  const fetchValidities = async () => {
    if (clients.length === 0) return;
    setIsValidityLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const results = await Promise.allSettled(
        clients.map(async client => {
          try {
            const response = await fetch(
              `${BASE_URL}/api/account/${client._id}/validity`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );

            if (response.status === 404) {
              return { id: client._id, validity: null };
            }

            if (!response.ok) {
              const body = await response.text().catch(() => '');
              throw new Error(
                `GET validity ${response.status} for ${client.clientUsername}: ${body}`,
              );
            }

            const json = await response.json();
            return { id: client._id, validity: toValidity(json) };
          } catch (error) {
            console.error(
              `Error fetching validity for client ${client._id}:`,
              error,
            );
            return { id: client._id, validity: null };
          }
        }),
      );

      const map = {};
      for (const r of results) {
        if (r.status === 'fulfilled') {
          map[r.value.id] = r.value.validity ?? {
            enabled: false,
            status: 'unknown',
            expiresAt: null,
            startAt: null,
          };
        } else {
          console.warn('[validity] fetch failed:', r.reason);
        }
      }

      clients.forEach(client => {
        if (!map[client._id]) {
          map[client._id] = {
            enabled: false,
            status: 'unknown',
            expiresAt: null,
            startAt: null,
          };
        }
      });
      setValidityByClient(map);
    } catch (error) {
      console.error('Error fetching validities', error);
    } finally {
      setIsValidityLoading(false);
    }
  };

  // Fetch notifications for a specific client
  const fetchNotifications = async clientId => {
    setNotificationsLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        `${BASE_URL}/api/notifications/master/${clientId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await response.json();

      const apiNotifications =
        data.notifications?.map(notif => ({
          _id: notif._id,
          title: notif.title || `${notif.action} - ${notif.entityType}`,
          message: notif.message,
          type: notif.type,
          action: notif.action,
          entityId: notif.entityId,
          entityType: notif.entityType,
          recipient: notif.recipient,
          triggeredBy: notif.triggeredBy,
          client: notif.client,
          read: notif.read,
          createdAt: notif.createdAt,
          updatedAt: notif.updatedAt,
        })) || [];

      setNotifications(apiNotifications);
    } catch (error) {
      console.error('Error fetching notifications', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!selectedClient) return;

    try {
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));

      const token = await AsyncStorage.getItem('token');
      await fetch(
        `${BASE_URL}/api/notifications/master/${selectedClient._id}/mark-all-read`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      console.error('Error marking notifications as read', error);
      fetchNotifications(selectedClient._id);
    }
  };

  const handleClientClick = client => {
    setSelectedClient(client);
    setError(null);
    setNotifications([]);
    setModalVisible(true);
    fetchNotifications(client._id);
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = dateString => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Function to get initials for avatar
  const getInitials = name => {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Notification UI helpers
  const getNotificationIcon = type => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'alert-triangle';
      case 'error':
        return 'close-circle';
      case 'info':
      default:
        return 'information';
    }
  };

  const getNotificationIconColor = type => {
    switch (type) {
      case 'success':
        return '#16a34a';
      case 'warning':
        return '#d97706';
      case 'error':
        return '#dc2626';
      case 'info':
      default:
        return '#2563eb';
    }
  };

  const getNotificationBgColor = type => {
    switch (type) {
      case 'success':
        return '#f0fdf4';
      case 'warning':
        return '#fffbeb';
      case 'error':
        return '#fef2f2';
      case 'info':
      default:
        return '#eff6ff';
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (clients.length > 0) {
      fetchValidities();
    }
  }, [clients]);

  // Filter clients
  const filteredClients = clients.filter(client => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      client.clientUsername.toLowerCase().includes(q) ||
      client.contactName.toLowerCase().includes(q) ||
      client.email.toLowerCase().includes(q) ||
      (client.businessName && client.businessName.toLowerCase().includes(q));

    const validity = validityByClient[client._id];
    const isActive = validity?.enabled ?? false;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'inactive' && !isActive);

    return matchesSearch && matchesStatus;
  });

  const StatusBadge = ({ validity }) => {
    const enabled = validity?.enabled ?? false;
    const label = enabled ? 'Active' : 'Expired';

    return (
      <View
        style={[
          styles.badge,
          enabled ? styles.activeBadge : styles.expiredBadge,
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            enabled ? styles.activeBadgeText : styles.expiredBadgeText,
          ]}
        >
          {label}
        </Text>
      </View>
    );
  };

  const ClientCard = ({ client }) => {
    const validity = validityByClient[client._id];

    return (
      <TouchableOpacity
        style={styles.clientCard}
        onPress={() => handleClientClick(client)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(client.contactName || client.clientUsername)}
              </Text>
            </View>
            <View style={styles.onlineIndicator} />
          </View>

          <View style={styles.clientInfo}>
            <Text style={styles.clientName} numberOfLines={1}>
              {client.businessName || client.clientUsername}
            </Text>
            <View style={styles.clientDetail}>
              <Icon name={iconMap.UserCheck} size={16} color="#6b7280" />
              <Text style={styles.detailText} numberOfLines={1}>
                {client.contactName}
              </Text>
            </View>
            <View style={styles.clientDetail}>
              <Icon name={iconMap.Phone} size={16} color="#6b7280" />
              <Text style={styles.detailText} numberOfLines={1}>
                {client.phone}
              </Text>
            </View>
            <View style={styles.clientDetail}>
              <Icon name={iconMap.Mail} size={16} color="#6b7280" />
              <Text style={styles.detailText} numberOfLines={1}>
                {client.email}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.dateContainer}>
            <Icon name={iconMap.CalendarDays} size={16} color="#6b7280" />
            <Text style={styles.dateText}>
              Joined {formatDate(client.createdAt)}
            </Text>
          </View>

          {isValidityLoading && !validityByClient[client._id] ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading…</Text>
            </View>
          ) : (
            <StatusBadge validity={validity} />
          )}
        </View>

        <View style={styles.cardAction}>
          <View style={styles.actionContent}>
            <Icon name={iconMap.Bell} size={16} color="#6b7280" />
            <Text style={styles.actionText}>View notifications</Text>
          </View>
          <Icon name={iconMap.ChevronRight} size={16} color="#9ca3af" />
        </View>
      </TouchableOpacity>
    );
  };

  const NotificationItem = ({ item }) => {
    const notification = item;
    const iconName = getNotificationIcon(notification.type);
    const iconColor = getNotificationIconColor(notification.type);
    const bgColor = getNotificationBgColor(notification.type);

    return (
      <View
        style={[
          styles.notificationCard,
          { backgroundColor: bgColor },
          !notification.read && styles.unreadNotification,
        ]}
      >
        <View style={styles.notificationHeader}>
          <View style={[styles.notificationIcon, { backgroundColor: bgColor }]}>
            <Icon name={iconName} size={20} color={iconColor} />
          </View>
          <View style={styles.notificationContent}>
            <View style={styles.notificationTitleRow}>
              <Text style={styles.notificationTitle} numberOfLines={1}>
                {notification.title}
              </Text>
              <Text style={styles.notificationTime}>
                {formatTime(notification.createdAt)}
              </Text>
            </View>
            <Text style={styles.notificationMessage}>
              {notification.message}
            </Text>
            <View style={styles.notificationMeta}>
              <Text style={styles.notificationDate}>
                {formatDate(notification.createdAt)}
              </Text>
              {notification.triggeredBy && (
                <>
                  <Text style={styles.metaSeparator}>•</Text>
                  <Text style={styles.triggeredBy}>
                    By:{' '}
                    {notification.triggeredBy.userName ||
                      notification.triggeredBy.email}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render empty state for FlatList
  const renderEmptyNotifications = () => (
    <View style={styles.noNotifications}>
      <View style={styles.noNotificationsIcon}>
        <Icon name={iconMap.Bell} size={32} color="#9ca3af" />
      </View>
      <Text style={styles.noNotificationsTitle}>No notifications yet</Text>
      <Text style={styles.noNotificationsText}>
        Notifications for this client will appear here
      </Text>
    </View>
  );

  // Render loading state for FlatList
  const renderNotificationsLoading = () => (
    <View style={styles.notificationsLoading}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.notificationsLoadingText}>
        Loading notifications...
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={24} color="#1e293b" />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Client History</Text>
              <Text style={styles.headerSubtitle}>
                View client details and notification history
              </Text>
            </View>
          </View>

          <View style={styles.headerStats}>
            <View style={styles.statsIcon}>
              <Icon name={iconMap.Bell} size={20} color="#3b82f6" />
            </View>
            <View>
              <Text style={styles.statsCount}>{clients.length} Clients</Text>
              <Text style={styles.statsLabel}>Total registered</Text>
            </View>
          </View>
        </View>

        {/* Search & Filter */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Icon
              name={iconMap.Search}
              size={20}
              color="#6b7280"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clients by name, email, or business..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.filterContainer}>
            <View style={styles.filterIcon}>
              <Icon name={iconMap.Filter} size={16} color="#6b7280" />
            </View>
            <Text style={styles.filterLabel}>Filter by:</Text>
            <CustomDropdown
              options={[
                { label: 'All Clients', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
              selectedValue={statusFilter}
              onSelect={(value) => setStatusFilter(value)}
              placeholder="Select status"
            />
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Icon name={iconMap.AlertTriangle} size={20} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingTitle}>Loading clients...</Text>
            <Text style={styles.loadingSubtitle}>
              Please wait while we fetch your data
            </Text>
          </View>
        ) : (
          <View style={styles.clientsGrid}>
            <FlatList
              data={filteredClients}
              renderItem={({ item }) => <ClientCard client={item} />}
              keyExtractor={item => item._id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Icon name={iconMap.Building2} size={32} color="#9ca3af" />
                  </View>
                  <Text style={styles.emptyTitle}>No clients found</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? 'No clients match your search criteria. Try a different search term.'
                      : "You don't have any clients yet. Clients will appear here once they're registered."}
                  </Text>
                </View>
              }
            />
          </View>
        )}
      </ScrollView>

      {/* Client Details Modal */}
      <Modal
        visible={modalVisible && !!selectedClient}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.modalContentContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalClientHeader}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>
                    {getInitials(
                      selectedClient?.contactName ||
                        selectedClient?.clientUsername,
                    )}
                  </Text>
                </View>
                <View style={styles.modalClientInfo}>
                  <Text style={styles.modalClientName} numberOfLines={1}>
                    {selectedClient?.businessName ||
                      selectedClient?.clientUsername}
                  </Text>
                  <View style={styles.modalClientEmail}>
                    <Icon name={iconMap.Mail} size={16} color="#6b7280" />
                    <Text style={styles.modalEmailText} numberOfLines={1}>
                      {selectedClient?.email}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Contact Info */}
            <View style={styles.contactInfo}>
              <View style={styles.contactItem}>
                <Icon name={iconMap.User} size={16} color="#6b7280" />
                <Text style={styles.contactText} numberOfLines={1}>
                  {name}
                </Text>
              </View>

              <View style={styles.contactItem}>
                <Icon name={iconMap.Phone} size={16} color="#6b7280" />
                {selectedClient?.phone ? (
                  <TouchableOpacity
                    onPress={() => makePhoneCall(selectedClient.phone)}
                  >
                    <Text
                      style={[styles.contactText, styles.phoneLink]}
                      numberOfLines={1}
                    >
                      {phone}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.contactText} numberOfLines={1}>
                    {phone}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopy}
                  disabled={!selectedClient?.phone}
                >
                  <Icon
                    name={copied ? iconMap.Check : iconMap.Copy}
                    size={16}
                    color={selectedClient?.phone ? '#3b82f6' : '#9ca3af'}
                  />
                  <Text
                    style={[
                      styles.copyText,
                      { color: selectedClient?.phone ? '#3b82f6' : '#9ca3af' },
                    ]}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notifications Section */}
            <View style={styles.notificationsSection}>
              <View style={styles.notificationsHeader}>
                <View style={styles.notificationsTitle}>
                  <View style={styles.notificationsIcon}>
                    <Icon name={iconMap.Bell} size={20} color="#3b82f6" />
                  </View>
                  <Text style={styles.notificationsTitleText}>
                    Notification History
                  </Text>
                </View>
                {notifications.length > 0 && (
                  <TouchableOpacity
                    style={styles.markReadButton}
                    onPress={markAllAsRead}
                  >
                    <Icon
                      name={iconMap.CheckCircle}
                      size={16}
                      color="#3b82f6"
                    />
                    <Text style={styles.markReadText}>Mark all as read</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.notificationsListContainer}>
                {notificationsLoading ? (
                  renderNotificationsLoading()
                ) : (
                  <FlatList
                    data={notifications}
                    renderItem={({ item }) => <NotificationItem item={item} />}
                    keyExtractor={item => item._id}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={[
                      styles.notificationsListContent,
                      notifications.length === 0 && styles.emptyListContent,
                    ]}
                    ListEmptyComponent={renderEmptyNotifications}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    style={styles.notificationsFlatList}
                  />
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Helper to convert validity
function toValidity(raw) {
  const v = raw?.validity ?? raw?.data ?? raw ?? {};
  const allowed = new Set([
    'active',
    'expired',
    'suspended',
    'unlimited',
    'unknown',
    'disabled',
  ]);
  const status = allowed.has(v?.status) ? v.status : 'unknown';
  return {
    enabled: status === 'active' || status === 'unlimited',
    status,
    expiresAt: v?.expiresAt ?? null,
    startAt: v?.startAt ?? null,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#f8fafc',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  backButton: {
    paddingTop: 10,
    // backgroundColor: 'white',
    // borderRadius: 12,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.1,
    // shadowRadius: 2,
    // elevation: 2,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: 'flex-start',
    marginLeft: 56,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsIcon: {
    padding: 6,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    marginRight: 8,
  },
  statsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  statsLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  searchSection: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#1e293b',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginRight: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
    minWidth: 60,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    padding: 12,
    margin: 16,
    borderRadius: 12,
  },
  errorText: {
    color: '#dc2626',
    marginLeft: 8,
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    borderRadius: 16,
  },
  loadingTitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
  },
  clientsGrid: {
    padding: 16,
  },
  clientCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1d4ed8',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    backgroundColor: '#22c55e',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  clientInfo: {
    flex: 1,
    marginLeft: 16,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  clientDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  cardAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
  },
  expiredBadge: {
    backgroundColor: '#fecaca',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeBadgeText: {
    color: '#166534',
  },
  expiredBadgeText: {
    color: '#dc2626',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#f1f5f9',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContentContainer: {
    justifyContent: 'flex-end',
    flex: 1,
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SCREEN_HEIGHT * 0.85,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalClientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1d4ed8',
  },
  modalClientInfo: {
    flex: 1,
  },
  modalClientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  modalClientEmail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalEmailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  contactInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  phoneLink: {
    color: '#3b82f6',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  copyText: {
    fontSize: 12,
    marginLeft: 4,
  },
  notificationsSection: {
    flex: 1,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: 'white',
  },
  notificationsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationsIcon: {
    padding: 6,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    marginRight: 8,
  },
  notificationsTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  markReadText: {
    fontSize: 14,
    color: '#1d4ed8',
    marginLeft: 4,
    fontWeight: '500',
  },
  notificationsListContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  notificationsListContent: {
    padding: 20,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationsFlatList: {
    flex: 1,
  },
  notificationsLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  notificationsLoadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
  },
  noNotifications: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noNotificationsIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#f1f5f9',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noNotificationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  noNotificationsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  notificationCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  unreadNotification: {
    borderLeftColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  notificationHeader: {
    flexDirection: 'row',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  notificationDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  metaSeparator: {
    fontSize: 12,
    color: '#6b7280',
    marginHorizontal: 8,
  },
  triggeredBy: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default HistoryScreen;