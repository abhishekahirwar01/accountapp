import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Modal from 'react-native-modal';
import Clipboard from '@react-native-clipboard/clipboard';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

// Hardcoded clients
const CLIENTS = [
  {
    _id: '1',
    clientUsername: 'client1',
    contactName: 'John Doe',
    phone: '1234567890',
    email: 'john@example.com',
    businessName: 'Acme Corp',
    createdAt: '2023-08-15T12:00:00Z',
    validity: { enabled: true, status: 'active', expiresAt: '2024-08-15' },
  },
  {
    _id: '2',
    clientUsername: 'client2',
    contactName: 'Jane Smith',
    phone: '0987654321',
    email: 'jane@example.com',
    businessName: 'Beta LLC',
    createdAt: '2023-07-01T09:00:00Z',
    validity: { enabled: false, status: 'expired', expiresAt: '2024-01-01' },
  },
];

// Hardcoded notifications
const NOTIFICATIONS = {
  1: [
    {
      _id: 'n1',
      title: 'Payment Received',
      message: 'Invoice #123 paid successfully.',
      type: 'success',
      read: false,
      createdAt: '2023-09-29T15:30:00Z',
      triggeredBy: { userName: 'Admin' },
    },
    {
      _id: 'n2',
      title: 'New Login',
      message: 'Logged in from new device.',
      type: 'info',
      read: true,
      createdAt: '2023-09-28T10:15:00Z',
    },
  ],
  2: [
    {
      _id: 'n3',
      title: 'Subscription Expired',
      message: 'Your subscription has expired. Please renew.',
      type: 'warning',
      read: false,
      createdAt: '2023-09-25T08:00:00Z',
    },
  ],
};

// Utils
const formatDate = dateString => new Date(dateString).toLocaleDateString();
const formatTime = dateString =>
  new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
const getInitials = name =>
  name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const StatusBadge = ({ validity }) => {
  const enabled = validity?.enabled ?? false;
  const label = enabled ? 'Active' : 'Inactive';
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: enabled ? '#E8F5E8' : '#FFEBEE' },
      ]}
    >
      <View
        style={[
          styles.badgeDot,
          { backgroundColor: enabled ? '#4CAF50' : '#F44336' },
        ]}
      />
      <Text
        style={[styles.badgeText, { color: enabled ? '#2E7D32' : '#C62828' }]}
      >
        {label}
      </Text>
    </View>
  );
};

const NotificationItem = ({ notification }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />;
      case 'warning':
        return <Ionicons name="warning" size={20} color="#FF9800" />;
      case 'error':
        return <Ionicons name="close-circle" size={20} color="#F44336" />;
      case 'info':
      default:
        return <Ionicons name="information-circle" size={20} color="#2196F3" />;
    }
  };

  const getTypeColor = () => {
    switch (notification.type) {
      case 'success':
        return '#E8F5E8';
      case 'warning':
        return '#FFF3E0';
      case 'error':
        return '#FFEBEE';
      case 'info':
      default:
        return '#E3F2FD';
    }
  };

  return (
    <View
      style={[
        styles.notificationContainer,
        { backgroundColor: getTypeColor() },
        notification.read && styles.readNotification,
      ]}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationTitleRow}>
          {getIcon()}
          <Text style={styles.notificationTitle}>{notification.title}</Text>
        </View>
        {!notification.read && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.notificationMessage}>{notification.message}</Text>
      <View style={styles.notificationFooter}>
        <Text style={styles.notificationTime}>
          {formatDate(notification.createdAt)} •{' '}
          {formatTime(notification.createdAt)}
        </Text>
        {notification.triggeredBy && (
          <Text style={styles.triggeredBy}>
            By: {notification.triggeredBy.userName}
          </Text>
        )}
      </View>
    </View>
  );
};

export default function HistoryPage({ navigation }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copied, setCopied] = useState(false);

  const handleCopy = text => {
    Clipboard.setString(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const filteredClients = CLIENTS.filter(client => {
    const matchesSearch =
      client.clientUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.businessName &&
        client.businessName.toLowerCase().includes(searchQuery.toLowerCase()));
    const isActive = client.validity?.enabled ?? false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'inactive' && !isActive);
    return matchesSearch && matchesStatus;
  });

  const FilterButton = ({ label, value, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterButtonText,
          isActive && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Client History</Text>
            <Text style={styles.headerSubtitle}>
              Manage and view client activities
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={18}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search clients by name, email, or business..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
            keyboardType='visible-password'
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Row */}
        <View style={styles.filterRow}>
          <FilterButton
            label="All Clients"
            value="all"
            isActive={statusFilter === 'all'}
            onPress={() => setStatusFilter('all')}
          />
          <FilterButton
            label="Active"
            value="active"
            isActive={statusFilter === 'active'}
            onPress={() => setStatusFilter('active')}
          />
          <FilterButton
            label="Inactive"
            value="inactive"
            isActive={statusFilter === 'inactive'}
            onPress={() => setStatusFilter('inactive')}
          />
        </View>

        {/* Results Count */}
        <Text style={styles.resultsCount}>
          {filteredClients.length} client
          {filteredClients.length !== 1 ? 's' : ''} found
        </Text>

        {/* Clients List */}
        <FlatList
          data={filteredClients}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.clientCard}
              onPress={() => setSelectedClient(item)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(item.contactName)}
                </Text>
              </View>
              <View style={styles.clientInfo}>
                <View style={styles.clientHeader}>
                  <Text style={styles.clientName}>
                    {item.businessName || item.clientUsername}
                  </Text>
                  <StatusBadge validity={item.validity} />
                </View>
                <Text style={styles.clientContact}>{item.contactName}</Text>
                <View style={styles.clientDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={14} color="#666" />
                    <Text style={styles.clientEmail}>{item.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={14} color="#666" />
                    <Text style={styles.clientPhone}>{item.phone}</Text>
                  </View>
                </View>
                <Text style={styles.clientSince}>
                  Client since {formatDate(item.createdAt)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Client Details Modal */}
        <Modal
          isVisible={!!selectedClient}
          onBackdropPress={() => setSelectedClient(null)}
          style={styles.modalWrapper}
          animationIn="slideInUp"
          animationOut="slideOutDown"
        >
          <View style={styles.modalContent}>
            {selectedClient && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>
                      {getInitials(selectedClient.contactName)}
                    </Text>
                  </View>
                  <View style={styles.modalHeaderInfo}>
                    <Text style={styles.modalTitle}>
                      {selectedClient.businessName ||
                        selectedClient.clientUsername}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedClient.contactName}
                    </Text>
                    <StatusBadge validity={selectedClient.validity} />
                  </View>
                </View>

                {/* Contact Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Contact Information</Text>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactRow}>
                      <Ionicons name="mail-outline" size={18} color="#666" />
                      <Text style={styles.contactText}>
                        {selectedClient.email}
                      </Text>
                    </View>
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={18} color="#666" />
                      <TouchableOpacity
                        onPress={() => handleCopy(selectedClient.phone)}
                      >
                        <Text style={[styles.contactText, styles.copyableText]}>
                          {copied ? 'Copied!' : selectedClient.phone}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Notifications Section */}
                <View style={styles.modalSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <Text style={styles.notificationCount}>
                      {(NOTIFICATIONS[selectedClient._id] || []).length}{' '}
                      notifications
                    </Text>
                  </View>
                  {(NOTIFICATIONS[selectedClient._id] || []).map(notif => (
                    <NotificationItem key={notif._id} notification={notif} />
                  ))}
                  {(NOTIFICATIONS[selectedClient._id] || []).length === 0 && (
                    <View style={styles.emptyNotifications}>
                      <Ionicons
                        name="notifications-off-outline"
                        size={40}
                        color="#CCC"
                      />
                      <Text style={styles.emptyText}>No notifications</Text>
                    </View>
                  )}
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  onPress={() => setSelectedClient(null)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>Close Details</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    padding: 0,
  },
  clearButton: {
    padding: 2,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  resultsCount: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 16,
  },
  clientInfo: {
    flex: 1,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  clientName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  clientContact: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
  },
  clientDetails: {
    gap: 4,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clientEmail: {
    fontSize: 13,
    color: '#64748B',
  },
  clientPhone: {
    fontSize: 13,
    color: '#64748B',
  },
  clientSince: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalWrapper: {
    justifyContent: 'center',
    margin: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    maxHeight: '80%',
    padding: 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalAvatarText: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 18,
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 20,
    color: '#1E293B',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 8,
  },
  modalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1E293B',
  },
  notificationCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  contactInfo: {
    gap: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 15,
    color: '#475569',
  },
  copyableText: {
    color: '#3B82F6',
  },
  notificationContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  notificationTitle: {
    fontWeight: '600',
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 11,
    color: '#64748B',
  },
  triggeredBy: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  readNotification: {
    opacity: 0.7,
  },
  emptyNotifications: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 8,
    color: '#94A3B8',
    fontSize: 14,
  },
  closeButton: {
    margin: 20,
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
