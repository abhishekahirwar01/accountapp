import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {
  Card,
  Badge,
  Button,
  Dialog,
  Portal,
  ProgressBar,
  Chip,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BASE_URL } from '../../config';

const UpdateWalkthrough = () => {
  const baseURL = BASE_URL;
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [visible, setVisible] = useState(false);

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
          // Error parsing user data
        }
      }

      if (!token) return null;

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload._id || payload.userId;
      } catch (error) {
        return null;
      }
    } catch (error) {
      return null;
    }
  };

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');

      if (!token || !userData) {
        return;
      }

      const user = JSON.parse(userData);

      if (user.role === 'master') {
        return;
      }

      const userId = await getUserIdFromToken();
      if (!userId) {
        return;
      }

      const response = await axios.get(
        `${baseURL}/api/update-notifications/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const updateNotifications = response.data.notifications || [];

      const completedNotificationsJSON = await AsyncStorage.getItem(
        'completedNotifications',
      );
      const completedNotifications = completedNotificationsJSON
        ? JSON.parse(completedNotificationsJSON)
        : {};
      const now = new Date();

      const filteredNotifications = updateNotifications.filter(n => {
        const completedData = completedNotifications[n._id];
        if (completedData) {
          const autoDismissAt = new Date(completedData.autoDismissAt);
          return now >= autoDismissAt;
        }
        return true;
      });

      setNotifications(filteredNotifications);

      if (filteredNotifications.length > 0) {
        setVisible(true);
      }
    } catch (error) {
      // Error fetching notifications
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const autoDismissInterval = setInterval(() => {
      checkAndAutoDismissNotifications();
    }, 60 * 60 * 1000);

    return () => clearInterval(autoDismissInterval);
  }, []);

  const checkAndAutoDismissNotifications = async () => {
    try {
      const completedNotificationsJSON = await AsyncStorage.getItem(
        'completedNotifications',
      );
      const completedNotifications = completedNotificationsJSON
        ? JSON.parse(completedNotificationsJSON)
        : {};
      const now = new Date();

      for (const [notificationId, data] of Object.entries(
        completedNotifications,
      )) {
        const autoDismissAt = new Date(data.autoDismissAt);

        if (now >= autoDismissAt) {
          try {
            const token = await AsyncStorage.getItem('token');
            const userId = await getUserIdFromToken();

            if (userId) {
              await axios.patch(
                `${baseURL}/api/update-notifications/dismiss/${notificationId}`,
                { userId: userId },
                { headers: { Authorization: `Bearer ${token}` } },
              );
            }

            delete completedNotifications[notificationId];
            await AsyncStorage.setItem(
              'completedNotifications',
              JSON.stringify(completedNotifications),
            );

            fetchNotifications();
          } catch (error) {
            // Error auto-dismissing notification
          }
        }
      }
    } catch (error) {
      // Error in auto-dismiss check
    }
  };

  const markAsReadWithDelay = async notificationId => {
    try {
      const completedNotificationsJSON = await AsyncStorage.getItem(
        'completedNotifications',
      );
      const completedNotifications = completedNotificationsJSON
        ? JSON.parse(completedNotificationsJSON)
        : {};

      completedNotifications[notificationId] = {
        completedAt: new Date().toISOString(),
        autoDismissAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
      };

      await AsyncStorage.setItem(
        'completedNotifications',
        JSON.stringify(completedNotifications),
      );
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setVisible(notifications.length > 1);
    } catch (error) {
      // Error marking notification as dismissed
    }
  };

  const allFeatures = notifications.flatMap(notification =>
    notification.features.map(feature => ({
      ...feature,
      notificationTitle: notification.title,
      version: notification.version,
    })),
  );

  const totalSteps = allFeatures.length;
  const currentFeature = allFeatures[currentStep];

  const renderMarkdown = text => {
    const lines = text.split('\n');

    return lines.map((line, lineIndex) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const processedLine = parts.map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={`${lineIndex}-${partIndex}`} style={styles.boldText}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return part;
      });

      return (
        <Text
          key={lineIndex}
          style={line.trim() === '' ? styles.emptyLine : styles.normalLine}
        >
          {processedLine}
        </Text>
      );
    });
  };

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
      const screenMap = {
        '/dashboard': 'Dashboard',
        '/companies': 'Companies',
        '/settings': 'Settings',
        '/client-management': 'ClientManagement',
        '/analytics': 'Analytics',
        '/transactions': 'Transactions',
      };

      const targetScreen = screenMap[currentFeature.sectionUrl];
      if (targetScreen) {
        navigation.navigate(targetScreen);
      } else {
        Alert.alert(
          'Feature Not Available',
          'This feature is not available in the mobile app yet.',
        );
      }
    }
  };

  const handleComplete = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await getUserIdFromToken();

      for (const notification of notifications) {
        try {
          if (!notification._id) {
            continue;
          }

          await axios.patch(
            `${baseURL}/api/update-notifications/dismiss/${notification._id}`,
            { userId: userId },
            { headers: { Authorization: `Bearer ${token}` } },
          );

          const response = await axios.get(
            `${baseURL}/api/notifications/user/${userId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          const allNotifications =
            response.data.notifications || response.data || [];
          const targetNotification = allNotifications.find(
            n =>
              n.entityId === notification._id &&
              n.type === 'system' &&
              n.action === 'update',
          );

          if (targetNotification) {
            await axios.patch(
              `${baseURL}/api/notifications/mark-as-read/${targetNotification._id}`,
              {},
              { headers: { Authorization: `Bearer ${token}` } },
            );
          }
        } catch (error) {
          // Error dismissing notification
        }
      }

      setIsOpen(false);
      setCurrentStep(0);
      setVisible(false);
      fetchNotifications();
    } catch (error) {
      // Error completing walkthrough
    }
  };

  const handleSkip = () => {
    setIsOpen(false);
    setCurrentStep(0);
  };

  if (notifications.length === 0) {
    return null;
  }

  const progress = totalSteps > 0 ? (currentStep + 1) / totalSteps : 0;

  return (
    <View>
      {visible && (
        <TouchableOpacity
          onPress={() => setIsOpen(true)}
          style={styles.badgeContainer}
        >
          <View style={styles.badge}>
            <Icon name="star" size={16} color="#fff" />
            <Text style={styles.badgeText}>New Updates</Text>
          </View>
        </TouchableOpacity>
      )}

      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleSkip}
      >
        <View style={styles.modalContainer}>
          <StatusBar backgroundColor="#fff" barStyle="dark-content" />

          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.title}>
                🚀 What's New in {currentFeature?.version || 'Latest Update'}
              </Text>
              <TouchableOpacity onPress={handleSkip} style={styles.closeButton}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.progressContainer}>
              <Text style={styles.stepText}>
                Step {currentStep + 1} of {totalSteps}
              </Text>
              <ProgressBar
                progress={progress}
                color="#007AFF"
                style={styles.progressBar}
              />
            </View>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {currentFeature && (
              <Card style={styles.featureCard}>
                <Card.Content>
                  <View style={styles.featureHeader}>
                    <View style={styles.iconContainer}>
                      <Icon name="check-circle" size={24} color="#007AFF" />
                    </View>
                    <View style={styles.featureTitleContainer}>
                      <Text style={styles.featureName}>
                        {currentFeature.name}
                      </Text>
                      <Text style={styles.notificationTitle}>
                        {currentFeature.notificationTitle}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.descriptionContainer}>
                    {renderMarkdown(currentFeature.description)}
                  </View>

                  <View style={styles.tipContainer}>
                    <Text style={styles.tipText}>
                      💡 <Text style={styles.tipBold}>Pro tip:</Text> Try this
                      feature to see the improvements firsthand.
                    </Text>
                    <Text style={styles.noteText}>
                      📅 <Text style={styles.tipBold}>Note:</Text> Click 'Remove
                      Notification' when you've explored all features.
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={handlePrevious}
              disabled={currentStep === 0}
              style={styles.navButton}
            >
              <Icon
                name="chevron-left"
                size={20}
                color={currentStep === 0 ? '#ccc' : '#007AFF'}
              />
              Previous
            </Button>

            <View style={styles.footerRight}>
              <Button
                mode="text"
                onPress={handleSkip}
                style={styles.skipButton}
                textColor="#666"
              >
                Skip Tour
              </Button>

              {currentStep === totalSteps - 1 ? (
                <Button
                  mode="outlined"
                  onPress={handleComplete}
                  style={styles.dismissButton}
                  textColor="#d32f2f"
                  icon="close"
                >
                  Dismiss
                </Button>
              ) : (
                <Button
                  mode="contained"
                  onPress={handleNext}
                  style={styles.nextButton}
                  icon="chevron-right"
                >
                  Next
                </Button>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1000,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'linear-gradient(90deg, #007AFF, #5856D6)',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepText: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
    minWidth: 80,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  featureCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
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
    color: '#000',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    color: '#666',
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  normalLine: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 8,
  },
  emptyLine: {
    height: 8,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#000',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  featureImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  tipContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
    borderRadius: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#666',
  },
  tipBold: {
    fontWeight: 'bold',
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  navButton: {
    minWidth: 100,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipButton: {
    marginRight: 8,
  },
  dismissButton: {
    borderColor: 'rgba(211, 47, 47, 0.3)',
  },
  nextButton: {
    backgroundColor: '#007AFF',
  },
});

export default UpdateWalkthrough;
