import { Text, View, StyleSheet } from 'react-native';
import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/Feather';

export class BalanceSheetScreen extends Component {
  render() {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          {/* Icon Container */}
          <View style={styles.iconContainer}>
            <Icon name="bar-chart-2" size={32} color="#3b82f6" />
          </View>

          {/* Coming Soon Badge */}
          <View style={styles.badge}>
            <Icon name="clock" size={16} color="#3b82f6" />
            <Text style={styles.badgeText}>Coming Soon</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            Advanced Analytics Coming Soon
          </Text>

          {/* Description */}
          <Text style={styles.description}>
            We're enhancing your Profit & Loss with interactive charts, 
            historical comparisons, and detailed financial insights.
          </Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
    marginTop:130,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    maxWidth: 320,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#dbeafe',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
    textAlign: 'center',
  },
});

export default BalanceSheetScreen;