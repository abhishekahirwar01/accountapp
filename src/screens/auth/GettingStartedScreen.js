import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageBackground,
  Dimensions,
  Platform, // Use Platform for more precise styling
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Assets ---
const backgroundPath = require('../../../assets/images/bg1.png');
const logoPath2 = require('../../../assets/images/vinimay.png');

// --- Responsive Utilities ---
const { width, height } = Dimensions.get('window');

// Standard reference dimensions (e.g., iPhone 8/X)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812; // A common taller screen height

// Scaling factors for font and general size
const horizontalScale = size => (width / BASE_WIDTH) * size;
const verticalScale = size => (height / BASE_HEIGHT) * size;
const moderateScale = (size, factor = 0.5) =>
  size + (horizontalScale(size) - size) * factor;

// Custom color palette for a professional look
const COLORS = {
  primary: '#1D4ED8', // Deep Blue
  primaryLight: '#2563EB',
  backgroundOverlay: 'rgba(255, 255, 255, 0.95)', // Slight white overlay for contrast
  textDark: '#1F2937', // Dark Slate Gray
  textMuted: '#6B7280',
  successLight: '#EFF6FF', // Very light blue for icon background
  successBorder: '#93C5FD',
};

// --- Component ---
export default function GettingStartedScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={backgroundPath}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* Main Content Container */}
          <View style={styles.content}>
            {/* Logo and Title Section */}
            <View style={styles.headerSection}>
              <Image
                source={logoPath2}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.subtitle}>
                Professional Accounting Services
              </Text>
            </View>

            {/* Features List */}
            <View style={styles.featuresContainer}>
              {[
                'Enterprise-Grade Security & Encryption',
                'Real-Time Financial Insights & Reporting',
                'Tax and Regulatory Compliance Guaranteed',
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
              activeOpacity={0.8}
              onPress={() => navigation.navigate('OTPVerification')}
            >
              <View style={styles.button}>
                <Text style={styles.buttonText}>Get Started Now</Text>
              </View>
            </TouchableOpacity>

            {/* Trust Text */}
            <Text style={styles.trustText}>
              Trusted by **10,000+** accounting professionals worldwide.
            </Text>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  // Added a slight semi-transparent white overlay for contrast
  overlay: {
    flex: 1,
    backgroundColor: COLORS.backgroundOverlay,
    alignItems: 'center',
    justifyContent: 'flex-end', // Align content to the bottom half
    paddingHorizontal: horizontalScale(24),
    paddingBottom: verticalScale(50), // Responsive padding from the bottom
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 500, // Max width for tablet and large screen
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: verticalScale(30),
  },
  logo: {
    // Increased logo size slightly, using verticalScale for height
    width: horizontalScale(220),
    height: verticalScale(140),
    marginBottom: verticalScale(10),
  },
  subtitle: {
    fontSize: moderateScale(18),
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '700', // Made subtitle bolder
    lineHeight: moderateScale(24),
    paddingHorizontal: horizontalScale(10),
  },
  featuresContainer: {
    marginBottom: verticalScale(40),
    width: '100%',
    alignItems: 'flex-start',
    paddingHorizontal: horizontalScale(10),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(18), // Responsive spacing
    width: '100%',
  },
  featureIcon: {
    width: horizontalScale(30),
    height: horizontalScale(30),
    borderRadius: horizontalScale(15),
    backgroundColor: COLORS.successLight, // Light blue background
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: horizontalScale(15),
    borderWidth: 1,
    borderColor: COLORS.successBorder, // Muted border
    // Added a slight shadow for elevation (optional, can be removed)
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      },
      android: { elevation: 2 },
    }),
  },
  featureIconText: {
    color: COLORS.primaryLight,
    fontWeight: '900',
    fontSize: moderateScale(16),
  },
  featureText: {
    color: COLORS.textDark,
    fontSize: moderateScale(15),
    fontWeight: '500',
    flexShrink: 1, // Allows text to wrap
    lineHeight: moderateScale(22),
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    // Removed default elevation for a cleaner button look, used shadows instead
    marginBottom: verticalScale(30),
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: verticalScale(18),
    borderRadius: 12,
    alignItems: 'center',
    // Enhanced button shadow for a modern 3D effect
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 15, shadowColor: COLORS.primary },
    }),
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800', // Extra bold text
    fontSize: moderateScale(18),
    letterSpacing: 0.5,
  },
  trustText: {
    color: COLORS.textMuted,
    fontSize: moderateScale(12),
    textAlign: 'center',
    fontWeight: '400',
    fontStyle: 'italic',
    lineHeight: moderateScale(18),
  },
});
