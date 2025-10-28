import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { Badge } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../../config';

const UpdateNotificationBadge = ({ onPress }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Pulse animation
  useEffect(() => {
    if (notifications.length > 0) {
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]);
      Animated.loop(pulse).start();
    }
  }, [notifications.length]);

  const getUserIdFromToken = async () => {
    const token = await AsyncStorage.getItem("token");
    const userData = await AsyncStorage.getItem("user");

    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user._id || user.id) {
          return user._id || user.id;
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }

    if (!token) return null;

    try {
      // Simple token parsing - for JWT tokens
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || payload._id || payload.userId;
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  };

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("token");
      const userData = await AsyncStorage.getItem("user");

      if (!token || !userData) return;

      const user = JSON.parse(userData);

      // Only show for master admins
      if (user.role !== "master") {
        return;
      }

      const userId = await getUserIdFromToken();
      if (!userId) return;

      const response = await axios.get(`${BASE_URL}/api/update-notifications/master/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const notificationsData = response.data.notifications || [];

      // Filter out notifications that are in grace period
      const dismissedNotificationsJSON = await AsyncStorage.getItem('dismissedNotifications');
      const dismissedNotifications = dismissedNotificationsJSON ? JSON.parse(dismissedNotificationsJSON) : {};
      const now = new Date();

      const filteredNotifications = notificationsData.filter((n) => {
        if (!n.dismissed) return true;

        const dismissedData = dismissedNotifications[n._id];
        if (dismissedData) {
          const autoDismissAt = new Date(dismissedData.autoDismissAt);
          return now >= autoDismissAt;
        }

        return false;
      });

      setNotifications(filteredNotifications);
    } catch (error) {
      console.error("Error fetching update notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Count notifications that are not dismissed OR are in grace period
  const getUnreadCount = async () => {
    const dismissedNotificationsJSON = await AsyncStorage.getItem('dismissedNotifications');
    const dismissedNotifications = dismissedNotificationsJSON ? JSON.parse(dismissedNotificationsJSON) : {};
    const now = new Date();

    return notifications.filter(n => {
      if (!n.dismissed) return true;

      const dismissedData = dismissedNotifications[n._id];
      if (dismissedData) {
        const autoDismissAt = new Date(dismissedData.autoDismissAt);
        return now < autoDismissAt;
      }

      return false;
    }).length;
  };

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const updateUnreadCount = async () => {
      const count = await getUnreadCount();
      setUnreadCount(count);
    };
    updateUnreadCount();
  }, [notifications]);

  if (isLoading || unreadCount === 0) {
    return null;
  }

  return (
    <TouchableOpacity onPress={onPress}>
      <Animated.View style={[styles.badgeContainer, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.badge}>
          <Icon name="bell" size={16} color="#fff" />
          <Text style={styles.badgeText}>
            New Updates ({unreadCount})
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    marginHorizontal: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
    backgroundColor: '#3b82f6', // Fallback solid color
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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
});

export default UpdateNotificationBadge;