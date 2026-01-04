// components/dashboard/account-validity-notice.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle, Clock, Ban } from 'lucide-react-native';

export function AccountValidityNotice({
  expiresAt,
  status,
  daysRemaining,
  onContactSupport,
}) {
  // If no validity data provided, don't show notice
  if (!expiresAt || !status || daysRemaining === undefined) {
    return null;
  }

  const formatDate = dateString => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  // Use locale string for expired state to match web behavior
  const getExpiredDateDisplay = dateString => {
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
    } catch (error) {
      return formatDate(dateString);
    }
  };

  const formattedExpiryDate = formatDate(expiresAt);
  const expiredDateDisplay = getExpiredDateDisplay(expiresAt);

  // If account has unlimited validity or is disabled, don't show notice
  if (status === 'unlimited' || status === 'disabled') {
    return null;
  }

  // If account is already expired
  if (daysRemaining < 0) {
    return (
      <View style={[styles.container, styles.expiredContainer]}>
        <Ban size={16} color="#dc2626" style={styles.icon} />
        <View style={styles.content}>
          <Text style={[styles.text, styles.expiredText]}>
            Your account validity has expired on {expiredDateDisplay}. Please
            contact support to renew your account.
          </Text>
          <TouchableOpacity
            onPress={onContactSupport}
            style={[styles.button, styles.expiredButton]}
          >
            <Text style={[styles.buttonText, styles.expiredButtonText]}>
              Contact Support
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // If account is expiring in 3 days or less
  if (daysRemaining <= 3) {
    return (
      <View style={[styles.container, styles.warningContainer]}>
        <View style={styles.innerContainer}>
          <AlertTriangle size={16} color="#d97706" style={styles.icon} />
          <View style={styles.content}>
            <Text style={[styles.text, styles.warningText]}>
              Your account validity expires in {daysRemaining} day
              {daysRemaining === 1 ? '' : 's'}, {formattedExpiryDate}. Please
              contact us to extend your validity.
            </Text>
            <TouchableOpacity
              onPress={onContactSupport}
              style={[styles.button, styles.warningButton]}
            >
              <Text style={[styles.buttonText, styles.warningButtonText]}>
                Contact Us
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // If account is expiring in 7 days or less
  if (daysRemaining <= 7) {
    return (
      <View style={[styles.container, styles.infoContainer]}>
        <View style={styles.innerContainer}>
          <Clock size={16} color="#1d4ed8" style={styles.icon} />
          <View style={styles.content}>
            <Text style={[styles.text, styles.infoText]}>
              Your account validity expires in {daysRemaining} days. Consider
              extending your validity to avoid interruption.
            </Text>
            <TouchableOpacity
              onPress={onContactSupport}
              style={[styles.button, styles.infoButton]}
            >
              <Text style={[styles.buttonText, styles.infoButtonText]}>
                Learn More
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    borderRadius: 8,
    padding: 16,
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  icon: {
    marginTop: 2,
    marginRight: 12,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    minWidth: 200, // Ensure text has minimum space before wrapping
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 6,
    minHeight: 32,
    flexShrink: 0,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Expired styles
  expiredContainer: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  expiredText: {
    color: '#dc2626',
  },
  expiredButton: {
    borderColor: '#dc2626',
    backgroundColor: 'transparent',
  },
  expiredButtonText: {
    color: '#dc2626',
  },
  // Warning styles
  warningContainer: {
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
  },
  warningText: {
    color: '#c2410c',
  },
  warningButton: {
    borderColor: '#f97316',
    backgroundColor: 'transparent',
  },
  warningButtonText: {
    color: '#c2410c',
  },
  // Info styles
  infoContainer: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#dbeafe',
  },
  infoText: {
    color: '#1e40af',
  },
  infoButton: {
    borderColor: '#3b82f6',
    backgroundColor: 'transparent',
  },
  infoButtonText: {
    color: '#1e40af',
  },
});
