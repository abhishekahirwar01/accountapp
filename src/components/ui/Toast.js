import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Printer,
  X,
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

const Toast = ({
  type = 'download',
  title,
  message,
  onClose,
  duration = 4000,
}) => {
  const progressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  const toastConfig = {
    success: { icon: CheckCircle, color: '#059669' },
    error: { icon: XCircle, color: '#dc2626' },
    warning: { icon: AlertTriangle, color: '#d97706' },
    download: { icon: Download, color: '#2563eb' },
    print: { icon: Printer, color: '#4f46e5' },
  };

  const config = toastConfig[type] || toastConfig.success;
  const IconComponent = config.icon;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: duration,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => handleClose(), duration);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  return (
    <Animated.View
      // renderToHardwareTextureAndroid glitch ko khatam karta hai
      renderToHardwareTextureAndroid={true}
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: translateY }],
        },
      ]}
    >
      {/* Border aur Shadow ko humne yahan shift kar diya hai 
        taaki animation ke waqt border 'scatter' na ho
      */}
      <View style={styles.shadowWrapper}>
        <LinearGradient
          colors={['#eff6ff', '#f8fafc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.toastBox}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${config.color}15` },
            ]}
          >
            <IconComponent size={20} color={config.color} strokeWidth={2.5} />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
          </View>

          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <X size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: config.color,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    width: '100%',
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  shadowWrapper: {
    // Shadow aur Elevation ko parent pe rakha hai glitches se bachne ke liye
    borderRadius: 12,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    overflow: 'hidden',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: '#1e3a8a',
    fontSize: 15,
    fontWeight: '700',
  },
  message: {
    color: '#475569',
    fontSize: 12,
    marginTop: 1,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  progressBar: {
    height: '100%',
  },
});

export default Toast;
