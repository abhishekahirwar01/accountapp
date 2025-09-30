import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
// ✅ Correct logo path (webp in assets/images)
const logoPath = require('../../../assets/images/logogettingStarted.png');

export default function GettingStartedScreen({ navigation }) {
  const { height } = Dimensions.get('window');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
      <LinearGradient
        colors={['#ffffff', '#e0e7ff']} // White to blue gradient
        style={[styles.background, { minHeight: height }]}
      >
        <View style={styles.content}>
          {/* Header with Logo */}
          <View style={styles.logoContainer}>
            <Image source={logoPath} style={styles.logo} resizeMode="contain" />
          </View>

          <Text style={styles.title}>AccountTech Pro</Text>
          <Text style={styles.subtitle}>Professional Accounting Services</Text>

          {/* Feature Highlights */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>✓</Text>
              </View>
              <Text style={styles.featureText}>Enterprise-Grade Security</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>✓</Text>
              </View>
              <Text style={styles.featureText}>Real-Time Financial Insights</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>✓</Text>
              </View>
              <Text style={styles.featureText}>Compliance Guaranteed</Text>
            </View>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.buttonWrapper}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('OTPVerification')}
          >
            <LinearGradient
              colors={['#2563eb', '#1d4ed8', '#1e40af']}
              style={styles.button}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Trust Indicator */}
          <Text style={styles.trustText}>
            Trusted by 10,000+ accounting professionals
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoContainer: {
    marginBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  logo: {
    width: 140,
    height: 140,
  },
  title: {
  fontSize: 36,
  fontWeight: '800',
  color: '#1e3a8a', // Professional deep blue
  marginBottom: 8,
  letterSpacing: 1,
  textAlign: 'center',
  textShadowColor: 'rgba(0, 0, 0, 0.1)', // softer shadow
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},

  subtitle: {
    fontSize: 17,
    color: '#4b5563',
    textAlign: 'center',
    letterSpacing: 0.6,
    fontWeight: '500',
    marginBottom: 48,
    lineHeight: 24,
  },
  featuresContainer: {
    marginBottom: 48,
    width: '100%',
    alignItems: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    width: '100%',
    justifyContent: 'flex-start',
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  featureIconText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  featureText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
    flex: 1,
  },
  buttonWrapper: {
    width: '85%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginBottom: 32,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 1,
  },
  trustText: {
    color: 'rgba(0, 0, 0, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.4,
    fontStyle: 'italic',
  },
});
