import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { Badge, ActivityIndicator, Card, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import SocketListener from './SocketListener';
import { BASE_URL } from '../../config';

// Module-level preload for notifications to reduce badge flicker in header
let preloadedNotifications = null;
(async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    const userData = await AsyncStorage.getItem('user');
    if (!userData) return;
    const user = JSON.parse(userData);
    let apiUrl = '';
    if (user.role === 'admin' || user.role === 'master') {
      const userId = user.id || user._id || user.userId || user.userID;
      apiUrl = `${BASE_URL}/api/notifications/user/${userId}`;
    } else {
      let clientId = user.clientId || user.clientID || user.client;
      if (!clientId && user.companies && user.companies.length > 0) {
        clientId = user.companies[0]._id;
      }
      if (!clientId)
        clientId = user.id || user._id || user.userId || user.userID;
      apiUrl = `${BASE_URL}/api/notifications/client/${clientId}`;
    }
    const response = await axios.get(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (Array.isArray(response.data)) preloadedNotifications = response.data;
    else if (
      response.data.notifications &&
      Array.isArray(response.data.notifications)
    )
      preloadedNotifications = response.data.notifications;
    else if (Array.isArray(response.data.data))
      preloadedNotifications = response.data.data;
    else preloadedNotifications = response.data || [];
  } catch (err) {
    // ignore; component will fetch on mount
    preloadedNotifications = null;
  }
})();

const Notification = ({ socket }) => {
  const [notifications, setNotifications] = useState(
    preloadedNotifications || [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    if (!isModalVisible) {
      setVisibleCount(5);
    }
  }, [isModalVisible]);

  const handleViewMore = useCallback(() => {
    setVisibleCount(prev => prev + 10);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setIsLoading(false);
        return;
      }

      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        setError('User data not found');
        setIsLoading(false);
        return;
      }

      const user = JSON.parse(userData);
      const userId = user.id || user._id || user.userId || user.userID;

      if (!userId) {
        setError('User ID not found');
        setIsLoading(false);
        return;
      }

      let notificationsData = [];
      let apiUrl = '';

      if (user.role === 'admin' || user.role === 'master') {
        apiUrl = `${BASE_URL}/api/notifications/user/${userId}`;
      } else {
        let clientId = user.clientId || user.clientID || user.client;
        if (!clientId && user.companies && user.companies.length > 0) {
          clientId = user.companies[0]._id;
        }
        if (!clientId) {
          clientId = userId;
        }
        apiUrl = `${BASE_URL}/api/notifications/client/${clientId}`;
      }

      try {
        const response = await axios.get(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (Array.isArray(response.data)) {
          notificationsData = response.data;
        } else if (
          response.data.notifications &&
          Array.isArray(response.data.notifications)
        ) {
          notificationsData = response.data.notifications;
        } else if (Array.isArray(response.data.data)) {
          notificationsData = response.data.data;
        } else {
          notificationsData = response.data || [];
        }
      } catch (apiError) {
        let fallbackUrl = '';
        if (apiUrl.includes('/user/')) {
          let clientId =
            user.clientId || user.clientID || user.client || userId;
          fallbackUrl = `${BASE_URL}/api/notifications/client/${clientId}`;
        } else {
          fallbackUrl = `${BASE_URL}/api/notifications/user/${userId}`;
        }

        const fallbackResponse = await axios.get(fallbackUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (Array.isArray(fallbackResponse.data)) {
          notificationsData = fallbackResponse.data;
        } else if (
          fallbackResponse.data.notifications &&
          Array.isArray(fallbackResponse.data.notifications)
        ) {
          notificationsData = fallbackResponse.data.notifications;
        } else if (Array.isArray(fallbackResponse.data.data)) {
          notificationsData = fallbackResponse.data.data;
        } else {
          notificationsData = fallbackResponse.data || [];
        }
      }

      const uniqueNotifications = notificationsData.filter(
        (notification, index, self) =>
          index === self.findIndex(n => n._id === notification._id),
      );

      uniqueNotifications.sort(
        (a, b) =>
          new Date(b.metadata?.createdAt || b.createdAt || 0).getTime() -
          new Date(a.metadata?.createdAt || a.createdAt || 0).getTime(),
      );

      setNotifications(uniqueNotifications);
      setIsLoading(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Notifications endpoint not found');
      } else if (err.response?.status === 401) {
        setError('Authentication failed');
      } else {
        setError(err.response?.data?.message || 'Failed to load notifications');
      }
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (isModalVisible) {
      fetchNotifications();
    }
  }, [isModalVisible, fetchNotifications]);

  const handleNewNotification = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async notificationId => {
    try {
      const token = await AsyncStorage.getItem('token');

      // Optimistically update UI
      setNotifications(prev =>
        prev.map(notification =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification,
        ),
      );

      // Then make API call
      await axios.patch(
        `${BASE_URL}/api/notifications/mark-as-read/${notificationId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch (err) {
      // Revert on error
      setNotifications(prev =>
        prev.map(notification =>
          notification._id === notificationId
            ? { ...notification, read: false }
            : notification,
        ),
      );
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const unreadNotifications = notifications.filter(n => !n.read);

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true })),
      );

      await Promise.allSettled(
        unreadNotifications.map(notification =>
          axios.patch(
            `${BASE_URL}/api/notifications/mark-as-read/${notification._id}`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          ),
        ),
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to mark all notifications as read');
      fetchNotifications();
    }
  }, [notifications, fetchNotifications]);

  const getNotificationIcon = useCallback((type, action) => {
    switch (type) {
      case 'sales':
        return 'cart';
      case 'invoice':
        return 'file-document';
      case 'payment':
        return 'cash';
      case 'reminder':
        return 'clock';
      case 'user':
        return 'account';
      default:
        return action === 'create' ? 'check-circle' : 'alert-circle';
    }
  }, []);

  const getIconColor = useCallback(type => {
    switch (type) {
      case 'sales':
        return '#3b82f6';
      case 'invoice':
        return '#6366f1';
      case 'payment':
        return '#10b981';
      case 'reminder':
        return '#f59e0b';
      case 'user':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  }, []);

  const formatDate = useCallback(dateString => {
    if (!dateString) return 'Unknown date';

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
      } else if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return 'Unknown date';
    }
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications],
  );

  const visibleNotifications = useMemo(
    () => notifications.slice(0, visibleCount),
    [notifications, visibleCount],
  );

  const hasMoreNotifications = useMemo(
    () => notifications.length > visibleCount,
    [notifications, visibleCount],
  );

  const renderNotificationItem = useCallback(
    ({ item: notification }) => (
      <Card
        style={[
          styles.notificationCard,
          notification.read && styles.readNotification,
        ]}
      >
        <Card.Content>
          <View style={styles.notificationContent}>
            <View style={styles.iconContainer}>
              <Icon
                name={getNotificationIcon(
                  notification.type,
                  notification.action,
                )}
                size={20}
                color={getIconColor(notification.type)}
              />
            </View>
            <View style={styles.notificationText}>
              <View style={styles.notificationHeader}>
                <Text
                  style={[
                    styles.notificationTitle,
                    notification.read && styles.readText,
                  ]}
                  numberOfLines={2}
                >
                  {notification.title}
                </Text>
                {!notification.read && (
                  <TouchableOpacity
                    onPress={() => markAsRead(notification._id)}
                    style={styles.markReadButton}
                  >
                    <Text style={styles.markReadText}>Mark read</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.notificationMessage} numberOfLines={3}>
                {notification.message}
              </Text>
              <Text style={styles.notificationTime}>
                {formatDate(
                  notification.metadata?.createdAt || notification.createdAt,
                )}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    ),
    [getNotificationIcon, getIconColor, formatDate, markAsRead],
  );

  // ADDED: Render "View More" button
  const renderFooter = useCallback(() => {
    if (hasMoreNotifications) {
      return (
        <TouchableOpacity
          style={styles.viewMoreButton}
          onPress={handleViewMore}
        >
          <Text style={styles.viewMoreText}>
            View More ({notifications.length - visibleCount} more)
          </Text>
        </TouchableOpacity>
      );
    }
    return null;
  }, [
    hasMoreNotifications,
    notifications.length,
    visibleCount,
    handleViewMore,
  ]);

  const keyExtractor = useCallback(item => item._id, []);

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.centerContent}>
        {isLoading ? (
          <>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </>
        ) : error ? (
          <>
            <Icon name="alert-circle" size={48} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchNotifications}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Icon name="bell" size={48} color="#6b7280" />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              Notifications will appear here when available
            </Text>
          </>
        )}
      </View>
    ),
    [isLoading, error, fetchNotifications],
  );

  return (
    <>
      <SocketListener socket={socket} onNotification={handleNewNotification} />

      <TouchableOpacity
        style={styles.bellContainer}
        onPress={() => setIsModalVisible(true)}
      >
        <Icon name="bell" size={24} color="#000" />
        {unreadCount > 0 && (
          <Badge style={styles.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setIsModalVisible(false)}
                  style={styles.backButton}
                >
                  <Icon name="arrow-left" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
              </View>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllAsRead}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.headerSubtitle}>
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${
                    unreadCount !== 1 ? 's' : ''
                  }`
                : 'You have no unread notifications'}
            </Text>
          </View>

          <Divider />

          <FlatList
            data={visibleNotifications}
            renderItem={renderNotificationItem}
            keyExtractor={keyExtractor}
            ListEmptyComponent={ListEmptyComponent}
            ListFooterComponent={renderFooter}
            contentContainerStyle={[
              styles.notificationsList,
              notifications.length === 0 && styles.emptyListContent,
            ]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 120,
              offset: 120 * index,
              index,
            })}
          />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bellContainer: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  markAllText: {
    color: '#6366f1',
    fontWeight: '500',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  notificationsList: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 12,
    marginBottom: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  notificationCard: {
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  readNotification: {
    backgroundColor: '#f9fafb',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
    flexShrink: 1,
  },
  readText: {
    color: '#6b7280',
  },
  markReadButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markReadText: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 0,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },

  viewMoreButton: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  viewMoreText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default Notification;
