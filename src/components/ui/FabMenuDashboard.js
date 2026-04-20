import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

const MENU_WIDTH = 250;
const MENU_HEIGHT = 310;
const EDGE_GAP = 0;


const GRADIENT_COLORS = [
  '#6050be',
  '#2596be',
];

const FabMenuDashboard = ({ visible, onClose, actions, anchor }) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    if (visible) {

      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {

      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 20,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);


  const anchorBox = anchor || {
    x: screenWidth - 56,
    y: screenHeight - 100,
    width: 40,
    height: 40,
  };


  let top = anchorBox.y - (MENU_HEIGHT - anchorBox.height) + 80;
  let left = screenWidth - MENU_WIDTH - EDGE_GAP;

  // Center of FAB
  const fabCenterX = anchorBox.x + anchorBox.width / 2;
  const fabCenterY = anchorBox.y + anchorBox.height / 2;

  // Center of MENU
  const menuCenterX = left + MENU_WIDTH / 2;
  const menuCenterY = top + MENU_HEIGHT / 2;

  // Delta to align centers
  const translateX = fabCenterX - menuCenterX;
  const translateYOffset = fabCenterY - menuCenterY;

  // vertical safety clamp
  top = Math.max(12, Math.min(top, screenHeight - MENU_HEIGHT - 12));

  return (
    <Modal transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[
            styles.menu,
            {
              top,
              left,
              opacity,
              transform: [
                { translateX },
                { translateY: translateYOffset },
                {
                  scale: scale.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                },
                { translateX: -translateX },
                { translateY: -translateYOffset },
                { translateY: translateY },
              ],
            },
          ]}
        >

          <LinearGradient
            colors={GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >

            <View style={styles.glowOverlay} />
          </LinearGradient>

          {/* CLOSE */}
          <TouchableOpacity style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>

          {/* ACTIONS with Icons */}
          <View style={styles.actionsColumn}>
            {actions.map((a, i) => {
              // Calculate staggered positions
              // This creates a diagonal from bottom to top
              const bottomPosition = 60 + (i * 45); // Bottom positions: 40, 95, 150, 205
              const rightPosition = i * (-20); // Right positions: 0, 30, 60, 90

              return (
                <Animated.View
                  key={i}
                  style={{
                    position: 'absolute',
                    bottom: bottomPosition,
                    right: rightPosition,
                    opacity: opacity,
                    transform: [
                      {
                        translateX: opacity.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={styles.action}
                    activeOpacity={0.85}
                    onPress={() => {
                      onClose();
                      if (a.onPress) a.onPress();
                    }}
                  >
                    {a.icon && (
                      <Icon
                        name={a.icon}
                        size={18}
                        color="#FFFFFF"
                        style={styles.actionIcon}
                      />
                    )}
                    <Text style={styles.actionText}>{a.label}</Text>
                    <Icon
                      name="arrow-forward"
                      size={16}
                      color="#FFFFFF"
                      style={styles.actionChevron}
                    />
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default FabMenuDashboard;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    // backgroundColor: 'rgba(0,0,0,0.25)',
  },

  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    height: MENU_HEIGHT,

    borderTopLeftRadius: 380,
    // borderBottomLeftRadius: 180,

    paddingTop: 18,
    paddingLeft: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 4, height: 8 },
    elevation: 12,
    overflow: 'hidden',
  },

  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  close: {
    position: 'absolute',
    top: 6,
    right: 10,
    zIndex: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  closeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  actionsColumn: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    // Remove flexbox properties since we'll position absolutely
    backgroundColor: 'transparent', // Keep for debugging, remove later
    overflow: 'hidden',
  },

  action: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 200,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderTopEndRadius:0,
    borderBottomEndRadius:0,
    borderColor: 'rgba(255, 255, 255, 0.51)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#32f8ff4f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  actionIcon: {
    marginRight: 8,
    fontWeight: '500',
    fontSize: 22,
    
  },

  actionText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
