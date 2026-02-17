import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IndianRupee, CreditCard, Users, Building } from 'lucide-react-native';

// Move formatCurrency outside component to prevent recreation
const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR',
    // maximumFractionDigits: 0,
  }).format(amount);

// Move static data outside component
const KPI_CONFIG = [
  {
    key: 'sales',
    title: 'Total Sales',
    icon: IndianRupee,
    color: '#3b82f6',
    getValue: (data) => formatCurrency(data?.totalSales || 0),
    getDescription: (selectedCompanyId) => 
      selectedCompanyId ? 'For selected company' : 'Across all companies',
  },
  {
    key: 'purchases',
    title: 'Total Purchases',
    icon: CreditCard,
    color: '#8b5cf6',
    getValue: (data) => formatCurrency(data?.totalPurchases || 0),
    getDescription: () => 'All purchases',
  },
  {
    key: 'users',
    title: 'Active Users',
    icon: Users,
    color: '#10b981',
    getValue: (data) => (data?.users || 0).toString(),
    getDescription: () => 'Registered users',
  },
  {
    key: 'companies',
    title: 'Companies',
    icon: Building,
    color: '#f59e0b',
    getValue: (data) => (data?.companies || 0).toString(),
    getDescription: () => 'Total companies',
  },
];

// Memoized KPI Card component
const KpiCard = React.memo(({ title, value, icon: Icon, description, color }) => {
  return (
    <View style={styles.cardWrapper}>
      <View style={styles.card}>
        <View style={styles.cardInner}>
          <View style={styles.headerRow}>
            <Text variant="labelMedium" style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <View style={[styles.iconContainer, { backgroundColor: color }]}>
              <Icon size={14} color="#ffffff" strokeWidth={2.5} />
            </View>
          </View>
          
          <Text variant="headlineMedium" style={styles.value} numberOfLines={1}>
            {value}
          </Text>
          
          <Text variant="bodySmall" style={styles.description} numberOfLines={1}>
            {description}
          </Text>
        </View>
      </View>
    </View>
  );
});

KpiCard.displayName = 'KpiCard';

// Main component - CHANGED: Using function declaration instead of const
function KpiCards({ data, selectedCompanyId }) {
  // Memoize kpiData to prevent recalculation on every render
  const kpiData = useMemo(() => {
    return KPI_CONFIG.map(config => ({
      key: config.key,
      title: config.title,
      value: config.getValue(data),
      icon: config.icon,
      description: config.getDescription(selectedCompanyId),
      color: config.color,
    }));
  }, [data, selectedCompanyId]);

  return (
    <View style={styles.container}>
      {kpiData.map((kpi) => (
        <KpiCard
          key={kpi.key}
          title={kpi.title}
          value={kpi.value}
          icon={kpi.icon}
          description={kpi.description}
          color={kpi.color}
        />
      ))}
    </View>
  );
}

// CHANGED: Export using export { } syntax
export { KpiCards };

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
    // padding: 12,
    paddingHorizontal:12,
    paddingVertical:10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // marginBottom: 6,
  },
  title: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 8,
  },
  iconContainer: {
    width: 25,
    height: 25,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    // marginBottom: 6,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '400',
  },
});