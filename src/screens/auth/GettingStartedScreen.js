import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageBackground,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const backgroundPath = require('../../../assets/images/bg1.png');
const logoPath2 = require('../../../assets/images/vinimay.png');

const { width, height } = Dimensions.get('window');
const scaleFont = size => size * (width / 375);

export default function GettingStartedScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ✅ Fullscreen Background Image */}
      <ImageBackground
        source={backgroundPath}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* ✅ Content Section */}
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={logoPath2}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.subtitle}>
              Professional Accounting Services
            </Text>

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
              <View style={styles.button}>
                <Text style={styles.buttonText}>Get Started</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.trustText}>
              Trusted by 10,000+ accounting professionals
            </Text>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

// ✅ Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.08,
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
  subtitle: {
    fontSize: scaleFont(16),
    color: '#1e3a8a',
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
    backgroundColor: '#1d4ed8',
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
