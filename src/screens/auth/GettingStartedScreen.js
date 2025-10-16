import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
  Platform,
  Animated,
  Easing,
  StatusBar, // 👈 IMPORT STATUSBAR
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const logoPath2 = require('../../../assets/images/vinimay.png');
const carouselImages = [
  require('../../../assets/images/firstimage.jpg'),
  require('../../../assets/images/secondimage.jpg'),
  require('../../../assets/images/thirdimage.png'),
];
const featureItems = [
  'Enterprise-Grade Security & Encryption',
  'Real-Time Financial Insights & Reporting',
  'Create and Send Invoices in Seconds',
];

const { width, height } = Dimensions.get('window');
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Scaling functions for responsiveness
const horizontalScale = size => (width / BASE_WIDTH) * size;
const verticalScale = size => (height / BASE_HEIGHT) * size;
const moderateScale = (size, factor = 0.5) =>
  size + (horizontalScale(size) - size) * factor;

const COLORS = {
  primary: '#007AFF', // Standard Blue
  primaryDark: '#005AC1',
  background: '#FFFFFF',
  textDark: '#1C1C1E', // Very dark grey, almost black
  textMuted: '#6A6A6A', // Darker muted text for professionalism
  success: '#34C759', // Green for success/check
  border: '#E5E5EA',
  lightGray: '#F5F5F5', // Lighter background for features
};

export default function GettingStartedScreen({ navigation }) {
  const imageListRef = useRef(null);
  const featureAnimation = useRef(new Animated.Value(0)).current;
  const [imageIndex, setImageIndex] = useState(0);
  const [featureIndex, setFeatureIndex] = useState(0);

  // --- Image Auto-scroll ---
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (imageIndex + 1) % carouselImages.length;
      setImageIndex(nextIndex);
      imageListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 3000); // 3 seconds
    return () => clearInterval(interval);
  }, [imageIndex]);

  // --- Feature Auto-scroll/Animation (Improved) ---
  useEffect(() => {
    const animateFeature = () => {
      // Fade out
      Animated.timing(featureAnimation, {
        toValue: 0,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start(() => {
        // Change text
        const nextFeature = (featureIndex + 1) % featureItems.length;
        setFeatureIndex(nextFeature);

        // Fade in
        Animated.timing(featureAnimation, {
          toValue: 1,
          duration: 400,
          easing: Easing.ease,
          delay: 50, // Short delay after index change
          useNativeDriver: true,
        }).start();
      });
    };

    // Auto-scroll logic
    const interval = setInterval(animateFeature, 3500); // 3.5 seconds
    
    // Initial fade-in
    Animated.timing(featureAnimation, {
        toValue: 1,
        duration: 500,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start();

    return () => clearInterval(interval);
  }, [featureIndex, featureAnimation]);

  const currentFeatureText = featureItems[featureIndex];

  // Feature Dot Indicator for Image Carousel
  const renderDotIndicator = () => (
    <View style={styles.dotIndicatorContainer}>
      {carouselImages.map((_, index) => (
        <View
          key={`dot-${index}`}
          style={[
            styles.dot,
            {
              backgroundColor: index === imageIndex ? COLORS.primary : COLORS.border,
              width: index === imageIndex ? horizontalScale(14) : horizontalScale(6),
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 👈 STATUS BAR CONFIGURATION */}
      <StatusBar 
        barStyle="dark-content" // Light icons/text on a white background (iOS default, good for Android white background)
        backgroundColor={COLORS.background} // Sets the background color of the status bar on Android
        translucent={false} // Ensures the view starts below the status bar on Android
      />
      
      <View style={styles.mainContainer}>
        {/* Logo and Title Section */}
        <View style={styles.headerSection}>
          <Image
            source={logoPath2}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>
            Your Accounting <Text style={styles.titleHighlight}>Made Easy</Text>
          </Text>
          <Text style={styles.subtitle}>
            Professional services with enterprise-grade security.
          </Text>
        </View>
        
        {/* --- Image Carousel --- */}
        <View style={styles.carouselContainer}>
          <FlatList
            ref={imageListRef}
            data={carouselImages}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: new Animated.Value(0) } } }],
                { useNativeDriver: false }
            )}
            onMomentumScrollEnd={e => {
                const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
                setImageIndex(newIndex);
            }}
            keyExtractor={(_, idx) => `img-${idx}`}
            renderItem={({ item }) => (
              <Image
                source={item}
                style={styles.carouselImage}
                resizeMode="cover"
              />
            )}
          />
          {renderDotIndicator()}
        </View>

        {/* --- Animated Feature Display --- */}
        <View style={styles.featureDisplayContainer}>
            <Animated.View style={[styles.featureItemAnimated, { opacity: featureAnimation, transform: [{ translateY: featureAnimation.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
                <Text style={styles.featureIconText}>✓</Text>
                <Text style={styles.featureTextAnimated}>{currentFeatureText}</Text>
            </Animated.View>
        </View>

        {/* --- Footer/CTA Section --- */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.buttonWrapper}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SendOtpScreen')}
          >
            <View style={styles.button}>
              <Text style={styles.buttonText}>Get Started Now</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.trustText}>
            Trusted by **10,000+** accounting professionals worldwide.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: horizontalScale(24),
    justifyContent: 'space-between',
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(30),
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  logo: {
    width: horizontalScale(120),
    height: verticalScale(80),
    marginBottom: verticalScale(5),
  },
  title: {
    fontSize: moderateScale(28, 0.7),
    color: COLORS.textDark,
    textAlign: 'center',
    fontWeight: '800',
    lineHeight: moderateScale(38, 0.7),
    marginBottom: verticalScale(5),
    paddingHorizontal: horizontalScale(10),
  },
  titleHighlight: {
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: moderateScale(15),
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: moderateScale(22),
    paddingHorizontal: horizontalScale(10),
  },
  
  // Carousel Styles
  carouselContainer: {
    height: verticalScale(200),
    marginBottom: verticalScale(30),
    marginHorizontal: horizontalScale(-24), // Extends to screen edges
  },
  carouselImage: {
    width: width, // Full width
    height: verticalScale(200),
    // Removed border radius here to make it full bleed.
  },
  dotIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: verticalScale(10),
    position: 'absolute',
    bottom: verticalScale(10),
    width: '100%',
  },
  dot: {
    height: horizontalScale(6),
    borderRadius: horizontalScale(3),
    marginHorizontal: horizontalScale(3),
    transitionProperty: 'width, background-color',
    transitionDuration: '300ms',
  },

  // Animated Feature Styles
  featureDisplayContainer: {
    height: verticalScale(50), // Reserve space for the feature display
    justifyContent: 'center',
    marginBottom: verticalScale(20),
  },
  featureItemAnimated: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center the animated feature text
    paddingHorizontal: horizontalScale(10),
  },
  featureIconText: {
    color: COLORS.success,
    fontWeight: '700',
    fontSize: moderateScale(20),
    marginRight: horizontalScale(10),
  },
  featureTextAnimated: {
    color: COLORS.textDark,
    fontSize: moderateScale(16),
    fontWeight: '600', // Slightly bolder for prominence
    textAlign: 'center',
  },

  // Footer/CTA Styles
  footer: {
    alignItems: 'center',
    width: '100%',
  },
  buttonWrapper: {
    width: '100%',
    marginBottom: verticalScale(15),
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: verticalScale(16),
    borderRadius: 12,
    alignItems: 'center',
    // Better shadow for professional feel
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: { elevation: 15, shadowColor: COLORS.primaryDark },
    }),
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: moderateScale(17),
    letterSpacing: 0.5,
  },
  trustText: {
    color: COLORS.textMuted,
    fontSize: moderateScale(12),
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: moderateScale(18),
  },
});