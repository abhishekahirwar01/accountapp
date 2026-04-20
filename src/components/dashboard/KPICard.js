import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ImageBackground,
  Animated,
} from 'react-native';
import { Text } from 'react-native-paper';
import { User, Building } from 'lucide-react-native';
import { useCompany } from '../../contexts/company-context';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);

function KpiCards({
  data,
  selectedCompanyId: selectedCompanyIdProp,
  companies: companiesProp,
}) {
  const {
    selectedCompanyId: contextSelectedCompanyId,
    companies: contextCompanies = [],
  } = useCompany();

  const selectedCompanyId =
    selectedCompanyIdProp !== undefined
      ? selectedCompanyIdProp
      : contextSelectedCompanyId;
  const companies =
    companiesProp !== undefined ? companiesProp : contextCompanies;

  
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    
    Animated.sequence([
      Animated.timing(flipAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(flipAnim, { toValue: 2, duration: 250, useNativeDriver: true }),
      Animated.timing(flipAnim, { toValue: 3, duration: 250, useNativeDriver: true }),
      Animated.timing(flipAnim, { toValue: 4, duration: 250, useNativeDriver: true }),
    ]).start(); 
  }, []); 

 
  const coinScaleX = flipAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [1, 0, -1, 0, 1],
  });

 
  const companyName = useMemo(() => {
    if (!selectedCompanyId) return 'All Companies';
    const company = companies.find((c) => c._id === selectedCompanyId);
    return company ? company.businessName : 'All Companies';
  }, [selectedCompanyId, companies]);

  const totalPurchases = formatCurrency(data?.totalPurchases || 0);
  const totalSales = formatCurrency(data?.totalSales || 0);
  const activeUsers = String(data?.users || 0).padStart(2, '0');
  const totalCompanies = String(data?.companies || 0).padStart(2, '0');

  return (
    <View style={styles.wrapper}>
      <View style={styles.shadowContainer}>

        <View style={styles.bottomShadow} />

        <ImageBackground
          source={require('../../../assets/dashboard/DashboardCard.jpg')}
          style={styles.card}
          imageStyle={styles.cardImage}
          resizeMode="cover"
        >
          <View style={styles.headerRow}>
            <Text style={styles.companyName} numberOfLines={1}>
              {companyName}
            </Text>

            <Animated.Image
              source={require('../../../assets/dashboard/Coin1.png')}
              style={[
                styles.coinImage,
                { transform: [{ scaleX: coinScaleX }] },
              ]}
              resizeMode="contain"
            />
          </View>

          <View style={styles.spacer} />

          <View style={styles.kpiRow}>
            <Text style={styles.kpiLabel}>Total Purchases</Text>
            <Text style={styles.kpiValue}>{totalPurchases}</Text>
          </View>

          <View style={styles.kpiRow}>
            <Text style={styles.kpiLabel}>Total Sales</Text>
            <Text style={styles.kpiValue}>{totalSales}</Text>
          </View>

          <View style={styles.spacer} />

          <View style={styles.bottomRow}>
            <View style={styles.statItem}>
              <User size={15} color="rgba(255,255,255,0.85)" strokeWidth={3} />
              <Text style={styles.statLabel}>ACTIVE USERS</Text>
              <Text style={styles.statValue}>{activeUsers}</Text>
            </View>

            <View style={styles.statItem}>
              <Building size={15} color="rgba(255,255,255,0.85)" strokeWidth={3} />
              <Text style={styles.statLabel}>COMPANIES</Text>
              <Text style={styles.statValue}>{totalCompanies}</Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    </View>
  );
}

export { KpiCards };


// ───────────────── STYLES ─────────────────
const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  shadowContainer: {
    position: 'relative',
  },

  bottomShadow: {
    position: 'absolute',
    bottom: -14,
    left: '1%',
    right: '1%',
    height: 40,
    borderRadius: 24,
    shadowColor: '#050505',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },

  card: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
    elevation: 6,
    shadowColor: '#020202',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },

  cardImage: {
    borderRadius: 12,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  companyName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
    flex: 1,
    marginRight: 12,

  },

  coinImage: {
    width: 35,
    height: 35,
  },

  spacer: {
    height: 18,
  },

  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  kpiLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },

  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },

  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.8,
  },

  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
});
