import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { IndianRupee, CreditCard, Users, Building } from 'lucide-react-native';

const formatCurrency = amount =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
    amount,
  );

export function KpiCards({ data, selectedCompanyId }) {
  const theme = useTheme();

  const kpiData = [
    {
      title: 'Total Sales',
      value: formatCurrency(data?.totalSales || 0),
      icon: IndianRupee,
      description: selectedCompanyId
        ? 'For selected company'
        : 'Across all companies',
      color: '#3b82f6',
    },
    {
      title: 'Total Purchases',
      value: formatCurrency(data?.totalPurchases || 0),
      icon: CreditCard,
      description: 'All purchases',
      color: '#8b5cf6',
    },
    {
      title: 'Active Users',
      value: (data?.users || 0).toString(),
      icon: Users,
      description: 'Registered users',
      color: '#10b981',
    },
    {
      title: 'Companies',
      value: (data?.companies || 0).toString(),
      icon: Building,
      description: 'Total companies',
      color: '#f59e0b',
    },
  ];

  return (
    <View style={styles.container}>
      {kpiData.map((kpi) => (
        <View key={kpi.title} style={styles.cardWrapper}>
          <View style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.headerRow}>
                <Text variant="labelMedium" style={styles.title} numberOfLines={1}>
                  {kpi.title}
                </Text>
                <View style={[styles.iconContainer, { backgroundColor: kpi.color }]}>
                  <kpi.icon size={18} color="#ffffff" strokeWidth={2.5} />
                </View>
              </View>
              
              <Text variant="headlineMedium" style={styles.value} numberOfLines={1}>
                {kpi.value}
              </Text>
              
              <Text variant="bodySmall" style={styles.description} numberOfLines={1}>
                {kpi.description}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 8,
  },
  cardWrapper: {
    flex: 1,
    minWidth: '45%',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardInner: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 8,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '400',
  },
});