import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function GettingStartedScreen({ navigation }) {
  const { height } = Dimensions.get('window');

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { minHeight: height }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AccounTech Pro</Text>
          <Text style={styles.subtitle}>Professional Accounting Services</Text>
        </View>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          <View style={styles.stepBox}>
            <Ionicons name="mail-outline" size={28} color="#2563eb" />
            <Text style={styles.step}>
              Step 1: Verify with Email or Mobile OTP
            </Text>
          </View>
          <View style={styles.stepBox}>
            <Ionicons name="lock-closed-outline" size={28} color="#2563eb" />
            <Text style={styles.step}>Step 2: Login using your credentials</Text>
          </View>
          <View style={styles.stepBox}>
            <Ionicons name="checkmark-done-outline" size={28} color="#2563eb" />
            <Text style={styles.step}>Step 3: Access your dashboard</Text>
          </View>
        </View>

        {/* Get Started Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('OTPVerification')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Progress Bar at Bottom */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, styles.activeDot]} />
        <View style={[styles.progressDot]} />
        <View style={[styles.progressDot]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 120, // header pushed lower
    paddingBottom: 160, // leave space for button above progress
    justifyContent: 'flex-start',
  },
  header: {
    alignItems: 'center', // center title/subtitle
    marginBottom: 60, // spacing between header and steps
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  stepsContainer: {
    marginTop: 0, // keep steps just above button
    marginBottom: 20,
  },
  stepBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12, // slightly tighter spacing
  },
  step: {
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 12,
    flexShrink: 1,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  progressDot: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1d5db',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#2563eb',
  },
});
