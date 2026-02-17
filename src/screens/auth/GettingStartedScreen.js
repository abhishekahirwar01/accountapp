import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// WARNING NOTE: These paths must be correct in your project structure for the code to run
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

// Custom scaling functions for responsive design
const horizontalScale = size => (width / BASE_WIDTH) * size;
const verticalScale = size => (height / BASE_HEIGHT) * size;
const moderateScale = (size, factor = 0.5) =>
  size + (horizontalScale(size) - size) * factor;

const COLORS = {
  primary: '#2563eb',
  primaryDark: '#005AC1',
  background: '#FFFFFF',
  textDark: '#1C1C1E',
  textMuted: '#6A6A6A',
  success: '#34C759',
  border: '#E5E5EA',
  lightGray: '#F5F5F5',
};

export default function GettingStartedScreen({ navigation }) {
  const imageListRef = useRef(null);
  const featureAnimation = useRef(new Animated.Value(0)).current;
  const [imageIndex, setImageIndex] = useState(0);
  const [featureIndex, setFeatureIndex] = useState(0);

  // Dot animation refs
  const dotWidths = useRef(carouselImages.map(() => new Animated.Value(horizontalScale(6)))).current;

  // --- Image Auto-scroll ---
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (imageIndex + 1) % carouselImages.length;
      setImageIndex(nextIndex);
      // Use requestAnimationFrame for smoother scrolling if possible, but standard scrollToIndex is fine
      imageListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 3000);
    return () => clearInterval(interval);
  }, [imageIndex]); // Dependency is correct: re-runs when index changes to set up the next scroll

  // --- Feature Auto-scroll/Animation ---
  useEffect(() => {
    // Initial fade in for the first feature
    Animated.timing(featureAnimation, {
      toValue: 1,
      duration: 500,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();

    const animateFeature = () => {
      // 1. Fade out the current feature
      Animated.timing(featureAnimation, {
        toValue: 0,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start(() => {
        // 2. Update the text (state change)
        const nextFeature = (featureIndex + 1) % featureItems.length;
        setFeatureIndex(nextFeature);

        // 3. Fade in the new feature
        Animated.timing(featureAnimation, {
          toValue: 1,
          duration: 400,
          easing: Easing.ease,
          delay: 50,
          useNativeDriver: true,
        }).start();
      });
    };

    const interval = setInterval(animateFeature, 3500);

    return () => clearInterval(interval);
  }, [featureIndex, featureAnimation]); // Dependency array is clean

  // --- Dot Indicator Animation ---
  useEffect(() => {
    carouselImages.forEach((_, idx) => {
      Animated.timing(dotWidths[idx], {
        toValue: idx === imageIndex ? horizontalScale(14) : horizontalScale(6),
        duration: 300,
        // The `width` property can sometimes require `useNativeDriver: false`
        useNativeDriver: false,
      }).start();
    });
  }, [imageIndex, dotWidths]); // Dependency array is clean

  const currentFeatureText = featureItems[featureIndex];

  // Callback for when the user manually scrolls the FlatList
  const handleScrollEnd = useCallback(e => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    if (newIndex !== imageIndex) {
      setImageIndex(newIndex);
    }
  }, [imageIndex]);

  const renderDotIndicator = () => (
    <View style={styles.dotIndicatorContainer}>
      {carouselImages.map((_, idx) => (
        <Animated.View
          key={`dot-${idx}`}
          style={[
            styles.dot,
            {
              width: dotWidths[idx],
              backgroundColor: idx === imageIndex ? COLORS.primary : COLORS.border,
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
        translucent={Platform.OS === 'ios'} // iOS handles translucent status bar differently
      />

      <View style={styles.mainContainer}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Image source={logoPath2} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>
            Your Accounting <Text style={styles.titleHighlight}>Made Easy</Text>
          </Text>
          <Text style={styles.subtitle}>
            Professional services with enterprise-grade security.
          </Text>
        </View>

        {/* Carousel Section */}
        <View style={styles.carouselContainer}>
          <FlatList
            ref={imageListRef}
            data={carouselImages}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            // Removed onScroll={Animated.event(...)} as it was unused and can cause warnings
            onMomentumScrollEnd={handleScrollEnd}
            keyExtractor={(_, idx) => `img-${idx}`}
            renderItem={({ item }) => (
              // Ensure this image is correctly sized to prevent aspect ratio warnings
              <Image source={item} style={styles.carouselImage} resizeMode="cover" />
            )}
          />
          {renderDotIndicator()}
        </View>

        {/* Dynamic Feature Section */}
        <View style={styles.featureDisplayContainer}>
          <Animated.View
            style={[
              styles.featureItemAnimated,
              {
                opacity: featureAnimation,
                transform: [
                  {
                    translateY: featureAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0], // Smooth slide up effect
                    }),
                  },
                ],
              },
            ]}
          >
            {/* The text string is correctly wrapped in a <Text> component here */}
            <Text style={styles.featureIconText}>✓</Text>
            <Text style={styles.featureTextAnimated}>{currentFeatureText}</Text>
          </Animated.View>
        </View>

        {/* Footer Section */}
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
            Trusted by <Text style={{ fontWeight: '700' }}>10,000+</Text> accounting professionals worldwide.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  mainContainer: {
    flex: 1,
    paddingHorizontal: horizontalScale(24),
    justifyContent: 'space-between',
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(30),
  },
  headerSection: { alignItems: 'center', marginBottom: verticalScale(10) },
  logo: { width: horizontalScale(120), height: verticalScale(80), marginBottom: verticalScale(5) },
  title: {
    fontSize: moderateScale(28, 0.7),
    color: COLORS.textDark,
    textAlign: 'center',
    fontWeight: '800',
    lineHeight: moderateScale(38, 0.7),
    marginBottom: verticalScale(5),
    paddingHorizontal: horizontalScale(10),
  },
  titleHighlight: { color: COLORS.primary },
  subtitle: {
    fontSize: moderateScale(15),
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: moderateScale(22),
    paddingHorizontal: horizontalScale(10),
  },
  carouselContainer: {
    height: verticalScale(200),
    marginBottom: verticalScale(30),
    marginHorizontal: horizontalScale(-24),
  },
  carouselImage: { width: width, height: verticalScale(200) },
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
  },
  featureDisplayContainer: {
    height: verticalScale(50),
    justifyContent: 'center',
    marginBottom: verticalScale(20),
  },
  featureItemAnimated: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: horizontalScale(10),
  },
  featureIconText: { 
    color: COLORS.success, 
    fontWeight: '700', 
    fontSize: moderateScale(20), 
    marginRight: horizontalScale(10) 
  },
  featureTextAnimated: { 
    color: COLORS.textDark, 
    fontSize: moderateScale(16), 
    fontWeight: '600', 
    textAlign: 'center' 
  },
  footer: { alignItems: 'center', width: '100%' },
  buttonWrapper: { width: '100%', marginBottom: verticalScale(15) },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: verticalScale(16),
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 15, shadowColor: COLORS.primaryDark },
    }),
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: moderateScale(17), letterSpacing: 0.5 },
  trustText: { 
    color: COLORS.textMuted, 
    fontSize: moderateScale(12), 
    textAlign: 'center', 
    fontWeight: '400', 
    lineHeight: moderateScale(18) 
  },
});