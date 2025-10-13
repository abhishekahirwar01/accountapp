import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  StatusBar,
  PixelRatio,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const logoPath = require('../../../assets/images/account_app_logo.png');
const logoPath2 = require('../../../assets/images/vinimay.png');
const { width, height } = Dimensions.get('window');

// Responsive font scaling helper
const scaleFont = size => size * (width / 375); // base iPhone 11 width ~375

export default function GettingStartedScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
      <LinearGradient colors={['#ffffff', '#e0e7ff']} style={styles.background}>
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={logoPath2}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.subtitle}>Professional Accounting Services</Text>

          {/* Features */}
          <View style={styles.featuresContainer}>
            {[
              'Enterprise-Grade Security',
              'Real-Time Financial Insights',
              'Compliance Guaranteed',
            ].map((item, idx) => (
              <View key={idx} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Text style={styles.featureIconText}>✓</Text>
                </View>
                <Text style={styles.featureText}>{item}</Text>
              </View>
            ))}
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

          {/* Trust Text */}
          <Text style={styles.trustText}>
            Trusted by 10,000+ accounting professionals
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

// Responsive styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: width * 0.08, // 8% of screen width
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoContainer: {
    marginBottom: height * 0.015,
    elevation: 10,
  },
  logo: {
    width: width * 0.55,
    height: height * 0.25,
  },
  title: {
    fontSize: scaleFont(30),
    fontWeight: '800',
    color: '#1e3a8a',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: scaleFont(16),
    color: '#4b5563',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: height * 0.05,
    lineHeight: scaleFont(22),
  },
  featuresContainer: {
    marginBottom: height * 0.06,
    width: '100%',
    alignItems: 'flex-start',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.02,
    width: '100%',
  },
  featureIcon: {
    width: width * 0.08,
    height: width * 0.08,
    borderRadius: (width * 0.08) / 2,
    backgroundColor: '#2563eb20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#2563eb40',
  },
  featureIconText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: scaleFont(16),
  },
  featureText: {
    color: '#000',
    fontSize: scaleFont(15),
    fontWeight: '500',
    flexShrink: 1,
  },
  buttonWrapper: {
    width: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    marginBottom: height * 0.04,
  },
  button: {
    paddingVertical: height * 0.022,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: scaleFont(18),
    letterSpacing: 0.8,
  },
  trustText: {
    color: 'rgba(0, 0, 0, 0.7)',
    fontSize: scaleFont(13),
    textAlign: 'center',
    fontWeight: '400',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
});
