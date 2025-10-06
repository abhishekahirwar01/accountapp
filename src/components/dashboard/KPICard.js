import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const KPICard = ({ title, value, icon: Icon, description }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {Icon && <Icon width={20} height={20} color="#555" />}
      </View>
      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        {description && (
          <Text style={styles.description}>{description}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    marginTop: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default KPICard;
