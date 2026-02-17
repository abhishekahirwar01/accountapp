import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Keyboard,
  Dimensions,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from '../../components/ui/Toast';
import { loginClientBySlug } from '../../lib/auth';
import {
  saveSession,
  scheduleAutoLogout,
  clearSession,
} from '../../lib/authSession';
import { navigateByRole } from '../../utils/roleNavigation';
import { jwtDecode } from 'jwt-decode';
import { BackHandler } from 'react-native';

import { useUserPermissions } from '../../contexts/user-permissions-context';
import { usePermissions } from '../../contexts/permission-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallDevice = SCREEN_WIDTH < 375;
const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 768;
const isLargeDevice = SCREEN_WIDTH >= 768;
const isTablet = SCREEN_WIDTH >= 768;

const scale = size => {
  const baseWidth = 375;
  return (SCREEN_WIDTH / baseWidth) * size;
};

export default function ClientLoginScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Show toast if logoutReason param is present
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const reason = navigation
        ?.getState?.()
        ?.routes?.find(r => r.name === 'ClientLoginScreen')
        ?.params?.logoutReason;
      if (reason) {
        setToast({
          visible: true,
          type: 'warning',
          title: 'Logged Out',
          message: reason,
        });
        navigation.setParams({ logoutReason: undefined });
      }
    });
    return unsubscribe;
  }, [navigation]);

  const { refetch: refetchUserPermissions } = useUserPermissions();
  const { refetch: refetchClientPermissions } = usePermissions();

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () =>
      setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      setIsKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    setCheckingSession(false);
  }, [navigation]);

  useEffect(() => {
    // Back button on login screen should close the app
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        BackHandler.exitApp();
        return true;
      },
    );
    return () => backHandler.remove();
  }, []);

  const completeLoginFlow = async (user, roleLabel) => {
    const decoded = jwtDecode(user.token);
    await saveSession(user.token, {
      role: 'customer',
      username: user.username,
      name: user.name,
      email: user.email,
      id: decoded.id,
      slug: user.slug,
    });

    if (refetchUserPermissions) await refetchUserPermissions();
    if (refetchClientPermissions) await refetchClientPermissions();

    scheduleAutoLogout(user.token);

    // Pehle toast set karein
    setToast({
      visible: true,
      type: 'success',
      title: 'Login Successful',
      message: `Welcome back, ${user.name}!`,
    });

    // 600ms ka delay dein taaki user message padh sake navigation se pehle
    setTimeout(() => {
      navigateByRole(navigation, roleLabel);
    }, 800);
  };

  const handlePasswordLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setToast({
        visible: true,
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter username and password',
      });
      return;
    }

    setLoading(true);
    try {
      const user = await loginClientBySlug(username, password);
      const userRole = String(user?.role || '').toLowerCase();
      const isValidCustomer = userRole === 'customer' || userRole === 'client';

      if (!user?.token || !isValidCustomer) {
        throw new Error('Invalid customer credentials.');
      }

      await completeLoginFlow(user, 'customer');
    } catch (error) {
      // Axios response data se backend ka asli message nikaalein
      const serverMessage =
        error.response?.data?.message ||
        error.message ||
        'Something went wrong';

      const lowerMsg = serverMessage.toLowerCase();
      const isAccountIssue =
        lowerMsg.includes('expired') ||
        lowerMsg.includes('disabled') ||
        lowerMsg.includes('support') ||
        lowerMsg.includes('validity');

      setToast({
        visible: true,
        type: 'error',
        title: isAccountIssue ? 'Account Status' : 'Login Failed',
        message: serverMessage,
      });

      console.log('Login Error Details:', serverMessage);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const responsiveStyles = {
    backButtonTop: isLandscape && isSmallDevice ? 8 : 12,
    logoSize: isLandscape ? (isSmallDevice ? 50 : 60) : isSmallDevice ? 70 : 72,
    logoInnerSize: isLandscape
      ? isSmallDevice
        ? 40
        : 48
      : isSmallDevice
      ? 58
      : 60,
    titleSize: isLandscape ? 20 : isSmallDevice ? 24 : isLargeDevice ? 32 : 22,
    subtitleSize: isLandscape
      ? 12
      : isSmallDevice
      ? 13
      : isLargeDevice
      ? 16
      : 12,
    formPadding: isTablet ? scale(32) : isLandscape ? scale(16) : scale(18),
    inputHeight: isLandscape ? 48 : isSmallDevice ? 48 : 48,
    buttonPadding: isLandscape ? 12 : isSmallDevice ? 14 : 12,
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, isLandscape && styles.safeAreaLandscape]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? (isLandscape ? 20 : 40) : 0
        }
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isLandscape && styles.scrollContentLandscape,
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.contentContainer,
              isTablet && styles.contentContainerTablet,
              isLandscape && styles.contentContainerLandscape,
            ]}
          >
            {/* HEADER */}
            <View
              style={[
                styles.headerContainer,
                isKeyboardVisible && styles.headerCompact,
                isLandscape && styles.headerContainerLandscape,
              ]}
            >
              <View
                style={[
                  styles.logoContainer,
                  isLandscape && styles.logoContainerLandscape,
                ]}
              >
                <View
                  style={[
                    styles.logoOuter,
                    {
                      width: responsiveStyles.logoSize,
                      height: responsiveStyles.logoSize,
                      borderRadius: responsiveStyles.logoSize / 2,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.logoInner,
                      {
                        width: responsiveStyles.logoInnerSize,
                        height: responsiveStyles.logoInnerSize,
                        borderRadius: responsiveStyles.logoInnerSize / 2,
                      },
                    ]}
                  >
                    <Ionicons
                      name="briefcase"
                      size={
                        isLandscape
                          ? scale(24)
                          : isKeyboardVisible
                          ? scale(28)
                          : scale(28)
                      }
                      color="#2563eb"
                    />
                  </View>
                </View>
              </View>

              <Text
                style={[
                  styles.title,
                  { fontSize: responsiveStyles.titleSize },
                  isKeyboardVisible && styles.titleCompact,
                  isLandscape && styles.titleLandscape,
                ]}
              >
                Welcome Back
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  { fontSize: responsiveStyles.subtitleSize },
                  isKeyboardVisible && styles.subtitleCompact,
                  isLandscape && styles.subtitleLandscape,
                ]}
              >
                Sign in to access your client portal
              </Text>
            </View>

            {/* FORM SECTION */}
            <View
              style={[
                styles.formContainer,
                { padding: responsiveStyles.formPadding },
                isTablet && styles.formContainerTablet,
                isLandscape && styles.formContainerLandscape,
              ]}
            >
              {/* Username Input */}
              <View
                style={[
                  styles.inputGroup,
                  isLandscape && styles.inputGroupLandscape,
                ]}
              >
                <Text
                  style={[
                    styles.label,
                    isSmallDevice && styles.labelSmall,
                    isLandscape && styles.labelLandscape,
                  ]}
                >
                  Username
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { height: responsiveStyles.inputHeight },
                    usernameFocused && styles.inputWrapperFocused,
                    isLandscape && styles.inputWrapperLandscape,
                  ]}
                >
                  <View style={styles.inputIconContainer}>
                    <Ionicons
                      name="person-outline"
                      size={isLandscape ? 16 : 18}
                      color={usernameFocused ? '#2563eb' : '#94a3b8'}
                    />
                  </View>
                  <TextInput
                    style={[styles.input, isLandscape && styles.inputLandscape]}
                    value={username}
                    onChangeText={setUsername}
                    onFocus={() => setUsernameFocused(true)}
                    onBlur={() => setUsernameFocused(false)}
                    editable={!loading}
                    placeholder="Enter your username"
                    placeholderTextColor="#cbd5e1"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View
                style={[
                  styles.inputGroup,
                  isLandscape && styles.inputGroupLandscape,
                ]}
              >
                <Text
                  style={[
                    styles.label,
                    isSmallDevice && styles.labelSmall,
                    isLandscape && styles.labelLandscape,
                  ]}
                >
                  Password
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { height: responsiveStyles.inputHeight },
                    passwordFocused && styles.inputWrapperFocused,
                    isLandscape && styles.inputWrapperLandscape,
                  ]}
                >
                  <View style={styles.inputIconContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={isLandscape ? 16 : 18}
                      color={passwordFocused ? '#2563eb' : '#94a3b8'}
                    />
                  </View>
                  <TextInput
                    style={[styles.input, isLandscape && styles.inputLandscape]}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    placeholder="Enter your password"
                    placeholderTextColor="#cbd5e1"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={[
                      styles.eyeButton,
                      isLandscape && styles.eyeButtonLandscape,
                    ]}
                    disabled={loading}
                    activeOpacity={0.6}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={isLandscape ? 18 : 20}
                      color={passwordFocused ? '#2563eb' : '#94a3b8'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[
                  styles.button,
                  { paddingVertical: responsiveStyles.buttonPadding },
                  loading && styles.buttonDisabled,
                  isLandscape && styles.buttonLandscape,
                  isTablet && styles.buttonTablet,
                ]}
                onPress={handlePasswordLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={styles.buttonContent}>
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.buttonText,
                          isSmallDevice && styles.buttonTextSmall,
                          isLandscape && styles.buttonTextLandscape,
                        ]}
                      >
                        Sign In
                      </Text>
                      <View
                        style={[
                          styles.buttonIconContainer,
                          isLandscape && styles.buttonIconContainerLandscape,
                        ]}
                      >
                        <Ionicons
                          name="arrow-forward"
                          size={isLandscape ? 14 : 16}
                          color="#ffffff"
                        />
                      </View>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Security Badge */}
            {!isKeyboardVisible && !isLandscape && (
              <View
                style={[
                  styles.securityBadge,
                  isLandscape && styles.securityBadgeLandscape,
                ]}
              >
                <View
                  style={[
                    styles.securityIconContainer,
                    isLandscape && styles.securityIconContainerLandscape,
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={isLandscape ? 14 : 16}
                    color="#2563eb"
                  />
                </View>
                <Text
                  style={[
                    styles.securityText,
                    isLandscape && styles.securityTextLandscape,
                  ]}
                >
                  Secured Connection
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast Configuration */}
      {toast.visible && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast({ ...toast, visible: false })}
          style={isLandscape && styles.toastLandscape}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f7ff',
  },
  safeAreaLandscape: {
    backgroundColor: '#f0f7ff',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(20),
  },
  scrollContentLandscape: {
    paddingVertical: scale(10),
  },
  contentContainer: {
    width: '100%',
    maxWidth: scale(420),
    alignSelf: 'center',
  },
  contentContainerTablet: {
    maxWidth: scale(500),
  },
  contentContainerLandscape: {
    maxWidth: scale(600),
  },

  // HEADER STYLES
  headerContainer: {
    alignItems: 'center',
    marginBottom: scale(25),
  },
  headerContainerLandscape: {
    marginBottom: scale(20),
  },
  headerCompact: {
    marginBottom: scale(28),
  },
  logoContainer: {
    marginBottom: scale(20),
  },
  logoContainerLandscape: {
    marginBottom: scale(12),
  },
  logoOuter: {
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  logoInner: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  title: {
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: scale(4),
  },
  titleLandscape: {
    marginBottom: scale(4),
  },
  titleCompact: {
    marginBottom: scale(6),
  },
  subtitle: {
    fontWeight: '400',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: scale(22),
    paddingHorizontal: scale(20),
  },
  subtitleLandscape: {
    lineHeight: scale(18),
    paddingHorizontal: scale(10),
  },
  subtitleCompact: {
    lineHeight: scale(18),
  },

  // FORM STYLES
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: '#dbeafe',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  formContainerTablet: {
    borderRadius: scale(24),
  },
  formContainerLandscape: {
    borderRadius: scale(16),
  },
  inputGroup: {
    marginBottom: scale(20),
  },
  inputGroupLandscape: {
    marginBottom: scale(12),
  },
  label: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#334155',
    marginBottom: scale(10),
    letterSpacing: 0.2,
  },
  labelSmall: {
    fontSize: scale(12),
    marginBottom: scale(8),
  },
  labelLandscape: {
    fontSize: scale(12),
    marginBottom: scale(6),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingHorizontal: scale(14),
  },
  inputWrapperLandscape: {
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
  },
  inputWrapperFocused: {
    backgroundColor: '#ffffff',
    borderColor: '#2563eb',
    borderWidth: 1,
  },
  inputIconContainer: {
    marginRight: scale(12),
    width: scale(24),
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: scale(14),
    color: '#0f172a',
    fontWeight: '500',
  },
  inputLandscape: {
    fontSize: scale(13),
  },
  eyeButton: {
    padding: scale(8),
    marginLeft: scale(4),
  },
  eyeButtonLandscape: {
    padding: scale(6),
  },

  // BUTTON STYLES
  button: {
    marginTop: scale(8),
    borderRadius: scale(12),
    overflow: 'hidden',
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonLandscape: {
    marginTop: scale(4),
    borderRadius: scale(8),
  },
  buttonTablet: {
    borderRadius: scale(16),
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.15,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  buttonText: {
    color: '#ffffff',
    fontSize: scale(14),
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonTextSmall: {
    fontSize: scale(14),
  },
  buttonTextLandscape: {
    fontSize: scale(14),
  },
  buttonIconContainer: {
    marginLeft: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIconContainerLandscape: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    marginLeft: scale(6),
  },

  // SECURITY BADGE
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(28),
    paddingVertical: scale(12),
  },
  securityBadgeLandscape: {
    marginTop: scale(12),
    paddingVertical: scale(6),
  },
  securityIconContainer: {
    marginRight: scale(8),
    backgroundColor: '#dbeafe',
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityIconContainerLandscape: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
  },
  securityText: {
    fontSize: scale(13),
    color: '#64748b',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  securityTextLandscape: {
    fontSize: scale(11),
  },

  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },

  toastLandscape: {
    marginBottom: scale(10),
  },
});
