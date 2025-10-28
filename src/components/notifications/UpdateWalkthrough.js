import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,

} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '../../config';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const UpdateWalkthrough = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to get user ID from token or user data
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

  // Fetch notifications for clients
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');

      if (!token || !userData) {
        console.log('No token or user data');
        return;
      }

      const user = JSON.parse(userData);
      console.log('User role:', user.role);

      // Only show for non-master users (clients)
      if (user.role === 'master') {
        console.log('User is master, not showing notifications');
        return;
      }

      const userId = await getUserIdFromToken();
      console.log('User ID:', userId);
      if (!userId) {
        console.log('No user ID found');
        return;
      }

      console.log('Fetching from:', `${BASE_URL}/api/update-notifications/user/${userId}`);

      // Fetch update notifications directly from backend
      const response = await axios.get(`${BASE_URL}/api/update-notifications/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updateNotifications = response.data.notifications || [];
      console.log('Fetched update notifications:', updateNotifications.length);

      // Filter out notifications that are in grace period (completed but not yet auto-dismissed)
      const completedNotifications = JSON.parse(
        await AsyncStorage.getItem('completedNotifications') || '{}'
      );
      const now = new Date();

      const filteredNotifications = updateNotifications.filter((n) => {
        // Check if it's in grace period
        const completedData = completedNotifications[n._id];
        if (completedData) {
          const autoDismissAt = new Date(completedData.autoDismissAt);
          return now >= autoDismissAt; // Grace period expired, hide it
        }

        return true; // Show if not in grace period
      });

      console.log('Filtered notifications:', filteredNotifications);
      if (filteredNotifications.length > 0) {
        console.log('Features in first notification:', filteredNotifications[0]?.features);
      }

      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Error fetching update notifications:', error);
      Alert.alert('Error', 'Failed to fetch update notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Set up auto-dismissal check every hour
    const autoDismissInterval = setInterval(() => {
      checkAndAutoDismissNotifications();
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(autoDismissInterval);
  }, []);

  // Function to check and auto-dismiss old notifications
  const checkAndAutoDismissNotifications = async () => {
    const completedNotifications = JSON.parse(
      await AsyncStorage.getItem('completedNotifications') || '{}'
    );
    const now = new Date();

    for (const [notificationId, data] of Object.entries(completedNotifications)) {
      const autoDismissAt = new Date(data.autoDismissAt);

      if (now >= autoDismissAt) {
        try {
          const token = await AsyncStorage.getItem('token');
          const userId = await getUserIdFromToken();

          if (userId) {
            // Dismiss the update notification
            await axios.patch(`${BASE_URL}/api/update-notifications/dismiss/${notificationId}`, {
              userId: userId
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Auto-dismissed update notification ${notificationId} after 36 hours`);
          }

          // Remove from AsyncStorage
          delete completedNotifications[notificationId];
          await AsyncStorage.setItem('completedNotifications', JSON.stringify(completedNotifications));

          // Refresh notifications to hide the auto-dismissed one
          fetchNotifications();
        } catch (error) {
          console.error(`Error auto-dismissing notification ${notificationId}:`, error);
        }
      }
    }
  };

  // Mark notification as dismissed with delay (don't remove immediately)
  const markAsReadWithDelay = async (notificationId) => {
    try {
      // Instead of dismissing immediately, we'll hide it from UI
      // The backend will handle auto-dismissal after 36 hours
      console.log(`Notification ${notificationId} completed - will auto-dismiss in 36 hours`);

      // Store completion time in AsyncStorage for UI purposes
      const completedNotifications = JSON.parse(
        await AsyncStorage.getItem('completedNotifications') || '{}'
      );
      completedNotifications[notificationId] = {
        completedAt: new Date().toISOString(),
        autoDismissAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString() // 36 hours
      };
      await AsyncStorage.setItem('completedNotifications', JSON.stringify(completedNotifications));

      // Update local state to hide from UI
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (error) {
      console.error('Error marking notification as dismissed:', error);
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  };

  // Get all features from all notifications for the walkthrough
  const allFeatures = notifications.flatMap(notification =>
    notification.features.map(feature => ({
      ...feature,
      notificationTitle: notification.title,
      version: notification.version
    }))
  );

  const totalSteps = allFeatures.length;
  const currentFeature = allFeatures[currentStep];

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTryItNow = () => {
    if (currentFeature) {
      // You'll need to implement navigation based on your navigation library
      // For example, with React Navigation:
      // navigation.navigate(currentFeature.sectionUrl);
      console.log('Navigate to:', currentFeature.sectionUrl);
      Alert.alert('Navigation', `Would navigate to: ${currentFeature.sectionUrl}`);
    }
  };

  const handleComplete = async () => {
    const token = await AsyncStorage.getItem('token');
    const userId = await getUserIdFromToken();

    // Dismiss all notifications
    for (const notification of notifications) {
      try {
        if (!notification._id) {
          console.error('Notification _id is undefined or null:', notification);
          continue;
        }

        // Dismiss the update notification
        await axios.patch(`${BASE_URL}/api/update-notifications/dismiss/${notification._id}`, {
          userId: userId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Also mark any related regular notifications as read
        const response = await axios.get(`${BASE_URL}/api/notifications/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const allNotifications = response.data.notifications || response.data || [];
        const targetNotification = allNotifications.find((n) =>
          n.entityId === notification._id && n.type === 'system' && n.action === 'update'
        );

        if (targetNotification) {
          await axios.patch(`${BASE_URL}/api/notifications/mark-as-read/${targetNotification._id}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } catch (error) {
        console.error(`Error dismissing notification ${notification._id}:`, error);
      }
    }

    setIsOpen(false);
    setCurrentStep(0);
    // Refresh notifications to hide dismissed ones
    fetchNotifications();
    
    Alert.alert('Success', 'All update notifications have been dismissed');
  };

  const handleSkip = () => {
    setIsOpen(false);
    setCurrentStep(0);
  };

  // Don't show anything for master admins or if no notifications
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUserData = async () => {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    };
    getUserData();
  }, []);

  if (notifications.length === 0 || user?.role === 'master') {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2196F3" />
      </View>
    );
  }

  return (
    <View>
      {/* New Badge */}
      <TouchableOpacity
        style={styles.newUpdatesBadge}
        onPress={() => setIsOpen(true)}
      >
        <Icon name="sparkles" size={16} color="#fff" />
        <Text style={styles.badgeText}>New Updates</Text>
      </TouchableOpacity>

      {/* Walkthrough Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerTop}>
                <Text style={styles.modalTitle}>
                  🚀 What's New in {currentFeature?.version || 'Latest Update'}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleSkip}
                >
                  <Icon name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  Step {currentStep + 1} of {totalSteps}
                </Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { width: `${((currentStep + 1) / totalSteps) * 100}%` }
                    ]} 
                  />
                </View>
              </View>
            </View>

            {/* Content */}
            <ScrollView style={styles.contentScroll}>
              {currentFeature && (
                <View style={styles.featureCard}>
                  <View style={styles.featureHeader}>
                    <View style={styles.featureIcon}>
                      <Icon name="check-circle" size={24} color="#2196F3" />
                    </View>
                    <View style={styles.featureTitleContainer}>
                      <Text style={styles.featureName}>{currentFeature.name}</Text>
                      <Text style={styles.notificationTitle}>
                        {currentFeature.notificationTitle}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureContent}>
                    <Text style={styles.featureDescription}>
                      {currentFeature.description}
                    </Text>

                    {currentFeature.gifUrl && (
                      <View style={styles.gifContainer}>
                        <Image
                          source={{ uri: currentFeature.gifUrl }}
                          style={styles.featureImage}
                          resizeMode="contain"
                        />
                      </View>
                    )}

                    <View style={styles.tipContainer}>
                      <Text style={styles.tipText}>
                        💡 <Text style={styles.tipBold}>Pro tip:</Text> Try this feature to see the improvements firsthand.
                      </Text>
                      <Text style={styles.noteText}>
                        📅 <Text style={styles.noteBold}>Note:</Text> Click 'Remove Notification' when you've explored all features.
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  styles.previousButton,
                  currentStep === 0 && styles.disabledButton
                ]}
                onPress={handlePrevious}
                disabled={currentStep === 0}
              >
                <Icon name="chevron-left" size={20} color={currentStep === 0 ? '#999' : '#2196F3'} />
                <Text style={[
                  styles.navButtonText,
                  currentStep === 0 && styles.disabledButtonText
                ]}>
                  Previous
                </Text>
              </TouchableOpacity>

              <View style={styles.footerRight}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.skipButton]}
                  onPress={handleSkip}
                >
                  <Text style={styles.skipButtonText}>Skip Tour</Text>
                </TouchableOpacity>

                {currentStep === totalSteps - 1 ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.dismissButton]}
                    onPress={handleComplete}
                  >
                    <Icon name="close" size={16} color="#D32F2F" />
                    <Text style={styles.dismissButtonText}>Dismiss</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.nextButton]}
                    onPress={handleNext}
                  >
                    <Text style={styles.nextButtonText}>Next</Text>
                    <Icon name="chevron-right" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 10,
    alignItems: 'center',
  },
  newUpdatesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'linear-gradient(90deg, #2196F3, #9C27B0)',
    backgroundColor: '#2196F3', // Fallback solid color
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    minWidth: 80,
  },
  progressBar: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#2196F3',
    height: '100%',
    borderRadius: 4,
  },
  contentScroll: {
    flex: 1,
    padding: 20,
  },
  featureCard: {
    borderWidth: 2,
    borderColor: 'rgba(33, 150, 243, 0.2)',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  featureIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureTitleContainer: {
    flex: 1,
  },
  featureName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  notificationTitle: {
    fontSize: 14,
    color: '#666',
  },
  featureContent: {
    padding: 16,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  gifContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  featureImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tipContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
    borderRadius: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  tipBold: {
    fontWeight: 'bold',
    color: '#333',
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  noteBold: {
    fontWeight: 'bold',
    color: '#333',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  previousButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2196F3',
    marginLeft: 4,
  },
  disabledButtonText: {
    color: '#999',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  skipButton: {
    backgroundColor: 'transparent',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dismissButton: {
    borderWidth: 1,
    borderColor: '#D32F2F',
    backgroundColor: 'transparent',
    gap: 4,
  },
  dismissButtonText: {
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#2196F3',
    gap: 4,
  },
  nextButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});

export default UpdateWalkthrough;