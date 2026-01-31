import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';
import axios from 'axios';
import io from 'socket.io-client';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const UpdateNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isPropagatingAll, setIsPropagatingAll] = useState(false);
  const [isPropagatingAdmins, setIsPropagatingAdmins] = useState(false);
  const [dismissAlertOpen, setDismissAlertOpen] = useState(false);
  const [notificationToDismiss, setNotificationToDismiss] = useState(null);
  const [changeMode, setChangeMode] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null); // Moved user state to top level

  // Get user data on component mount
  useEffect(() => {
    const getUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Error getting user data:', error);
      }
    };
    getUserData();
  }, []);

  // Helper function to get user ID from storage
  const getUserIdFromToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');

      if (userData) {
        try {
          const user = JSON.parse(userData);
          if (user._id || user.id) {
            return user._id || user.id;
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }

      if (!token) return null;

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload._id || payload.userId;
      } catch (error) {
        console.error('Error decoding token:', error);
        return null;
      }
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  };

  // Initialize socket connection
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (!userData) return;

        const user = JSON.parse(userData);
        const userId = await getUserIdFromToken();
        if (!userId) return;

        const newSocket = io(BASE_URL || 'http://localhost:8745');
        setSocket(newSocket);

        // Join appropriate room based on user role
        if (user.role === 'master') {
          newSocket.emit('joinRoom', {
            userId: userId,
            role: 'master',
          });

          // Listen for new update notifications
          newSocket.on('newUpdateNotification', data => {
            fetchNotifications();
            Alert.alert('New Update Available', data.message);
          });

          // Listen for dismissed notifications
          newSocket.on('updateNotificationDismissed', data => {
            setNotifications(prev =>
              prev.filter(n => n._id !== data.notificationId),
            );
          });
        } else {
          // For clients/users, join user room
          newSocket.emit('joinRoom', {
            userId: userId,
            role: user.role || 'user',
          });

          // Listen for new notifications
          newSocket.on('newNotification', data => {
            fetchNotifications();
            Alert.alert('New Update Available', data.message);
          });
        }

        return () => {
          newSocket.disconnect();
        };
      } catch (error) {
        console.error('Error initializing socket:', error);
      }
    };

    initializeSocket();
  }, []);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');

      if (!token || !userData) return;

      const user = JSON.parse(userData);
      const userId = await getUserIdFromToken();
      if (!userId) {
        console.error('User ID not found in token');
        return;
      }

      let notificationsData = [];

      if (user.role === 'master') {
        // For master admins, fetch update notifications
        const response = await axios.get(
          `${BASE_URL}/api/update-notifications/master/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        let masterNotifications = response.data.notifications || [];

        // Filter out notifications that are in grace period
        const dismissedNotifications = JSON.parse(
          (await AsyncStorage.getItem('dismissedNotifications')) || '{}',
        );
        const now = new Date();

        notificationsData = masterNotifications
          .filter(n => {
            if (!n.dismissed) return true;

            const dismissedData = dismissedNotifications[n._id];
            if (dismissedData) {
              const autoDismissAt = new Date(dismissedData.autoDismissAt);
              return now >= autoDismissAt;
            }

            return false;
          })
          .map(n => ({
            ...n,
            visibility: n.visibility || 'all',
          }));
      } else {
        // For clients/users, fetch regular notifications with update type
        try {
          const response = await axios.get(
            `${BASE_URL}/api/notifications/user/${userId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          const allNotifications =
            response.data.notifications || response.data || [];

          // Filter for update notifications that have been propagated
          const updateNotifications = allNotifications.filter(
            n =>
              n.type === 'system' &&
              n.action === 'update' &&
              n.entityType === 'UpdateNotification',
          );

          // Convert regular notifications to UpdateNotification format
          notificationsData = updateNotifications.map(n => ({
            _id: n.entityId,
            title: n.title,
            description: n.message,
            version: n.metadata?.updateVersion || 'Unknown',
            features: [],
            exploredSections: [],
            dismissed: n.read,
            propagatedToClients: true,
            createdAt: n.createdAt,
          }));
        } catch (clientError) {
          console.error('Error fetching client notifications:', clientError);
        }
      }

      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error fetching update notifications:', error);
      Alert.alert('Error', 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleFeatureClick = async (notification, feature, showDemo = true) => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      if (user.role !== 'master') return;

      // Mark section as explored
      const token = await AsyncStorage.getItem('token');
      await axios.patch(
        `${BASE_URL}/api/update-notifications/explore-section`,
        {
          notificationId: notification._id,
          sectionUrl: feature.sectionUrl,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n._id === notification._id
            ? {
                ...n,
                exploredSections: [...n.exploredSections, feature.sectionUrl],
              }
            : n,
        ),
      );

      // Navigate to the section (you'll need to implement navigation)
      // navigation.navigate(feature.sectionUrl);

      // Show GIF in modal only if requested
      if (showDemo) {
        setSelectedFeature(feature);
      }
    } catch (error) {
      console.error('Error marking section as explored:', error);
      Alert.alert('Error', 'Failed to explore feature');
    }
  };

  const handleViewDemoClick = async (notification, feature) => {
    // Navigate to feature without showing modal
    await handleFeatureClick(notification, feature, false);
  };

  const handleDismiss = async notificationId => {
    const notification = notifications.find(n => n._id === notificationId);
    const userData = await AsyncStorage.getItem('user');

    if (!userData || !notification) return;

    const user = JSON.parse(userData);

    // For master admins, check if notification has been propagated to clients
    if (user.role === 'master' && !notification.propagatedToClients) {
      setNotificationToDismiss(notificationId);
      setDismissAlertOpen(true);
      return;
    }

    // If already propagated or for clients, proceed with dismissal
    performDismiss(notificationId);
  };

  const performDismiss = async notificationId => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');

      if (!userData) return;

      const user = JSON.parse(userData);
      const userId = await getUserIdFromToken();

      if (user.role === 'master') {
        // For master admins, dismiss immediately via API
        await axios.patch(
          `${BASE_URL}/api/update-notifications/dismiss/${notificationId}`,
          {
            userId: userId,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } else {
        // For clients, dismiss via API and mark regular notification as read
        await axios.patch(
          `${BASE_URL}/api/update-notifications/dismiss/${notificationId}`,
          {
            userId: userId,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        // Also mark the regular notification as read
        const response = await axios.get(
          `${BASE_URL}/api/notifications/user/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const allNotifications =
          response.data.notifications || response.data || [];
        const targetNotification = allNotifications.find(
          n =>
            n.entityId === notificationId &&
            n.type === 'system' &&
            n.action === 'update',
        );

        if (targetNotification) {
          await axios.patch(
            `${BASE_URL}/api/notifications/mark-as-read/${targetNotification._id}`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
        }
      }

      // Remove from local state immediately for better UX
      setNotifications(prev => prev.filter(n => n._id !== notificationId));

      Alert.alert('Success', 'Notification dismissed');
    } catch (error) {
      console.error('Error dismissing notification:', error);
      Alert.alert('Error', 'Failed to dismiss notification');
    }
  };

  const handleConfirmDismiss = () => {
    if (notificationToDismiss) {
      performDismiss(notificationToDismiss);
      setDismissAlertOpen(false);
      setNotificationToDismiss(null);
    }
  };

  const handlePropagateToAllUsers = async notificationId => {
    try {
      setIsPropagatingAll(true);
      const token = await AsyncStorage.getItem('token');
      await axios.post(
        `${BASE_URL}/api/update-notifications/propagate-all/${notificationId}`,
        { force: true },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId
            ? { ...n, propagatedToClients: true, visibility: 'all' }
            : n,
        ),
      );

      Alert.alert('Success', 'Update notification sent to all users');
    } catch (error) {
      console.error('Error propagating to all users:', error);
      Alert.alert('Error', 'Failed to send notifications to all users');
    } finally {
      setIsPropagatingAll(false);
    }
  };

  const handlePropagateToAdminsOnly = async notificationId => {
    try {
      setIsPropagatingAdmins(true);
      const token = await AsyncStorage.getItem('token');
      await axios.post(
        `${BASE_URL}/api/update-notifications/propagate-admins/${notificationId}`,
        { force: true },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId
            ? { ...n, propagatedToClients: true, visibility: 'admins' }
            : n,
        ),
      );

      Alert.alert('Success', 'Update notification sent to admins only');
    } catch (error) {
      console.error('Error propagating to admins only:', error);
      Alert.alert('Error', 'Failed to send notifications to admins');
    } finally {
      setIsPropagatingAdmins(false);
    }
  };

  const getExploredCount = notification => {
    return notification.exploredSections.length;
  };

  const getTotalFeatures = notification => {
    return notification.features.length;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  // Helper component for notification item
  const NotificationItem = ({ notification }) => {
    const isMaster = user?.role === 'master';
    const hasFeatures =
      notification.features && notification.features.length > 0;
    const exploredCount = getExploredCount(notification);
    const totalFeatures = getTotalFeatures(notification);

    if (!user) return null;

    return (
      <View style={styles.notificationCard}>
        {/* Header */}
        <View style={styles.notificationHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.versionText}>
              Version {notification.version}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {isMaster && hasFeatures && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {exploredCount}/{totalFeatures} explored
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => handleDismiss(notification._id)}
            >
              <Icon name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>{notification.description}</Text>

        {/* Features List */}
        {isMaster && hasFeatures && (
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>New Features:</Text>
            {notification.features.map((feature, index) => {
              const isExplored = notification.exploredSections.includes(
                feature.sectionUrl,
              );

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.featureItem,
                    isExplored
                      ? styles.exploredFeature
                      : styles.unexploredFeature,
                  ]}
                  onPress={() => handleFeatureClick(notification, feature)}
                >
                  <View style={styles.featureHeader}>
                    <View style={styles.featureInfo}>
                      <Icon
                        name={isExplored ? 'check-circle' : 'play-circle'}
                        size={20}
                        color={isExplored ? '#4CAF50' : '#2196F3'}
                      />
                      <Text style={styles.featureName}>{feature.name}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.viewDemoButton}
                      onPress={e => {
                        e.stopPropagation();
                        handleViewDemoClick(notification, feature);
                      }}
                    >
                      <Text style={styles.viewDemoText}>View Demo</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={styles.separator} />
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.helperText}>
            {isMaster && hasFeatures
              ? exploredCount === totalFeatures
                ? 'All features explored - dismiss when ready'
                : 'Tap features to view demo or "View Demo" to go directly'
              : 'Update notification from your administrator'}
          </Text>

          {/* Notification Propagation Buttons */}
          {isMaster && !notification.propagatedToClients && (
            <View style={styles.propagationButtons}>
              <TouchableOpacity
                style={[styles.propagationButton, styles.primaryButton]}
                onPress={() => handlePropagateToAllUsers(notification._id)}
                disabled={isPropagatingAll}
              >
                {isPropagatingAll ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name="account-multiple" size={16} color="#fff" />
                )}
                <Text style={styles.buttonText}>Notify All Users</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.propagationButton, styles.secondaryButton]}
                onPress={() => handlePropagateToAdminsOnly(notification._id)}
                disabled={isPropagatingAdmins}
              >
                {isPropagatingAdmins ? (
                  <ActivityIndicator size="small" color="#666" />
                ) : (
                  <Icon name="account-supervisor" size={16} color="#666" />
                )}
                <Text style={styles.secondaryButtonText}>
                  Notify Only Admins
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* After notification is sent */}
          {isMaster &&
            notification.propagatedToClients &&
            !changeMode[notification._id] && (
              <View style={styles.notificationSent}>
                <Text style={styles.sentText}>
                  {notification.visibility === 'admins'
                    ? 'Notified clients and admins only'
                    : 'Notifications sent to all users'}
                </Text>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() =>
                    setChangeMode(prev => ({
                      ...prev,
                      [notification._id]: true,
                    }))
                  }
                >
                  <Text style={styles.changeButtonText}>
                    Change Notification
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          {/* Change mode */}
          {isMaster && changeMode[notification._id] && (
            <View style={styles.changeMode}>
              <Text style={styles.changeModeText}>
                Change notification audience:
              </Text>
              <View style={styles.changeModeButtons}>
                <TouchableOpacity
                  style={[styles.propagationButton, styles.primaryButton]}
                  onPress={() => handlePropagateToAllUsers(notification._id)}
                  disabled={isPropagatingAll}
                >
                  {isPropagatingAll ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Icon name="account-multiple" size={16} color="#fff" />
                  )}
                  <Text style={styles.buttonText}>Notify All Users</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.propagationButton, styles.secondaryButton]}
                  onPress={() => handlePropagateToAdminsOnly(notification._id)}
                  disabled={isPropagatingAdmins}
                >
                  {isPropagatingAdmins ? (
                    <ActivityIndicator size="small" color="#666" />
                  ) : (
                    <Icon name="account-supervisor" size={16} color="#666" />
                  )}
                  <Text style={styles.secondaryButtonText}>
                    Notify Only Admins
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() =>
                    setChangeMode(prev => ({
                      ...prev,
                      [notification._id]: false,
                    }))
                  }
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Client badge */}
          {!isMaster && notification.propagatedToClients && (
            <View style={styles.clientBadge}>
              <Icon name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.clientBadgeText}>Update Available</Text>
            </View>
          )}
        </View>

        {/* Complete dismissal button for master */}
        {isMaster && hasFeatures && exploredCount === totalFeatures && (
          <TouchableOpacity
            style={styles.completeDismissButton}
            onPress={() => handleDismiss(notification._id)}
          >
            <Icon name="close" size={16} color="#D32F2F" />
            <Text style={styles.completeDismissText}>Dismiss Notification</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.map(notification => (
          <NotificationItem
            key={notification._id}
            notification={notification}
          />
        ))}
      </ScrollView>

      {/* Dismiss Warning Alert */}
      <Modal
        visible={dismissAlertOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDismissAlertOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertDialog}>
            <Text style={styles.alertTitle}>
              ⚠️ Dismiss Without Notifying Clients?
            </Text>
            <Text style={styles.alertDescription}>
              This update notification has not been propagated to clients yet.
              If you dismiss it now, clients will not receive this important
              update information.
              {'\n\n'}
              <Text style={styles.alertBold}>Recommended:</Text> Click "Notify
              Clients" first to ensure all users are informed about this update
              before dismissing it.
            </Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={[styles.alertButton, styles.cancelButton]}
                onPress={() => {
                  setDismissAlertOpen(false);
                  setNotificationToDismiss(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertButton, styles.dismissButton]}
                onPress={handleConfirmDismiss}
              >
                <Text style={styles.dismissButtonText}>Dismiss Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feature Demo Modal */}
      <Modal
        visible={!!selectedFeature}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedFeature(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.featureModal}>
            <Text style={styles.modalTitle}>{selectedFeature?.name}</Text>

            {selectedFeature && (
              <ScrollView style={styles.modalContent}>
                <Text style={styles.featureDescription}>
                  {selectedFeature.description}
                </Text>

                <Image
                  source={{ uri: selectedFeature.gifUrl }}
                  style={styles.featureImage}
                  resizeMode="contain"
                />

                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setSelectedFeature(null)}
                >
                  <Text style={styles.closeModalText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: -30,
  },
  scrollView: {
    flex: 1,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
  },
  badge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dismissButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  featuresSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  featureItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  unexploredFeature: {
    backgroundColor: '#fff',
    borderColor: '#e0e0e0',
  },
  exploredFeature: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
  },
  viewDemoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 6,
  },
  viewDemoText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  footer: {
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    lineHeight: 16,
  },
  propagationButtons: {
    gap: 8,
  },
  propagationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
  },
  secondaryButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  notificationSent: {
    alignItems: 'center',
    gap: 8,
  },
  sentText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  changeButton: {
    padding: 8,
  },
  changeButtonText: {
    color: '#2196F3',
    fontWeight: '500',
  },
  changeMode: {
    gap: 8,
  },
  changeModeText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  changeModeButtons: {
    gap: 8,
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  clientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e0e0',
    padding: 8,
    borderRadius: 6,
    gap: 4,
  },
  clientBadgeText: {
    color: '#666',
    fontWeight: '500',
  },
  completeDismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  completeDismissText: {
    color: '#D32F2F',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertDialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  alertDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  alertBold: {
    fontWeight: 'bold',
    color: '#333',
  },
  alertButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  alertButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  dismissButton: {
    // backgroundColor: '#D32F2F',
  },
  dismissButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  featureModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  featureImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 16,
  },
  closeModalButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
});

export default UpdateNotification;
