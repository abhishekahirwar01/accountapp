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

const MENU_WIDTH = 140;
const MENU_HEIGHT = 220;
const EDGE_GAP = 6;

// Gradient colors - just the two you requested
const GRADIENT_COLORS = [
    "#6050be", // Purple/Indigo
    "#2596be", // Light blue
];

const FabMenu = ({ visible, onClose, actions, anchor }) => {
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    const { width: screenWidth, height: screenHeight } =
        Dimensions.get('window');

    useEffect(() => {
        if (visible) {
            // Entry animation
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
            // Exit animation
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

    // fallback anchor (safety)
    const anchorBox = anchor || {
        x: screenWidth - 56,
        y: screenHeight - 100,
        width: 40,
        height: 40,
    };

    /**
     * 🔒 LOCKED POSITIONING
     * - right edge locked
     * - expands upward from +
     */
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
                                { translateY: translateY }, // Additional slide animation
                            ],
                        },
                    ]}
                >
                    {/* Gradient Background - Two colors */}
                    <LinearGradient
                        colors={GRADIENT_COLORS}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradient}
                    >
                        {/* Subtle inner glow for depth */}
                        <View style={styles.glowOverlay} />
                    </LinearGradient>

                    {/* CLOSE */}
                    <TouchableOpacity style={styles.close} onPress={onClose}>
                        <Text style={styles.closeText}>×</Text>
                    </TouchableOpacity>

                    {/* ACTIONS */}
                    <View style={styles.actionsColumn}>
                        {actions.map((a, i) => (
                            <Animated.View
                                key={i}
                                style={{
                                    opacity: opacity,
                                    transform: [{
                                        translateX: opacity.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [20, 0],
                                        })
                                    }]
                                }}
                            >
                                <TouchableOpacity
                                    style={styles.action}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        onClose();
                                        a.onPress();
                                    }}
                                >
                                    <Text style={styles.actionText}>{a.label}</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

export default FabMenu;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.25)',
    },

    menu: {
        position: 'absolute',
        width: MENU_WIDTH,
        height: MENU_HEIGHT,

        // vertical half-circle (left)
        borderTopLeftRadius: MENU_WIDTH,
        borderBottomLeftRadius: MENU_WIDTH,

        paddingTop: 28,
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
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 18, // Space between buttons
        paddingTop: 10,
        paddingLeft: 10,
    },

    action: {
        minWidth: 80,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 18,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
        // backgroundColor: 'rgba(255,255,255,0.15)',
    },

    actionText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});