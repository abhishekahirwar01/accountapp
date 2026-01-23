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
    },
    {
      title: 'Total Purchases',
      value: formatCurrency(data?.totalPurchases || 0),
      icon: CreditCard,
      description: 'All purchases',
    },
    {
      title: 'Active Users',
      value: (data?.users || 0).toString(),
      icon: Users,
      description: 'Registered users',
    },
    {
      title: 'Companies',
      value: (data?.companies || 0).toString(),
      icon: Building,
      description: 'Total companies',
    },
  ];

  const IconWrapper = ({ IconComponent, size = 16 }) => (
    <IconComponent size={size} color={theme.colors.onSurfaceVariant} />
  );

  return (
    <View style={styles.container}>
      {kpiData.map(kpi => (
        <Card key={kpi.title} style={styles.card} mode="contained">
          <Card.Content style={styles.cardContent}>
            <View style={styles.header}>
              <Text
                variant="titleMedium"
                style={[styles.title, styles.titleText]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {kpi.title}
              </Text>
              <IconWrapper IconComponent={kpi.icon} size={14} />
            </View>
            <Text
              variant="headlineMedium"
              style={[styles.value, styles.valueText]}
            >
              {kpi.value}
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.description, styles.descriptionText]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {kpi.description}
            </Text>
          </Card.Content>
        </Card>
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
  card: {
    flex: 1,
    minWidth: '45%',
    margin: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    borderRadius: 12,
  },
  cardContent: {
    padding: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    marginRight: 8,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 16,
  },
  value: {
    marginBottom: 4,
  },
  valueText: {
    fontWeight: 'bold',
    fontSize: 20,
    lineHeight: 24,
  },
  description: {
    opacity: 0.7,
  },
  descriptionText: {
    fontSize: 12,
    lineHeight: 14,
  },
});