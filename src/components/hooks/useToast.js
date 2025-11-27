import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  PanResponder,
} from 'react-native';

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 5000;

// -----------------------------
// Toast State Management
// -----------------------------
let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const toastTimeouts = new Map();
const listeners = [];
let memoryState = { toasts: [] };

function addToRemoveQueue(toastId) {
  if (toastTimeouts.has(toastId)) return;

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: 'REMOVE_TOAST', toastId });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map(t =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
      };

    case 'DISMISS_TOAST':
      const { toastId } = action;
      if (toastId) addToRemoveQueue(toastId);
      else state.toasts.forEach(t => addToRemoveQueue(t.id));

      return {
        ...state,
        toasts: state.toasts.map(t =>
          t.id === toastId || toastId === undefined ? { ...t, open: false } : t,
        ),
      };

    case 'REMOVE_TOAST':
      if (action.toastId === undefined) return { ...state, toasts: [] };
      return {
        ...state,
        toasts: state.toasts.filter(t => t.id !== action.toastId),
      };

    default:
      return state;
  }
};

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach(listener => listener(memoryState));
}

// -----------------------------
// Toast API
// -----------------------------
function toast({ title, description }) {
  const id = genId();

  const update = props =>
    dispatch({ type: 'UPDATE_TOAST', toast: { ...props, id } });

  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id });

  dispatch({
    type: 'ADD_TOAST',
    toast: {
      id,
      title,
      description,
      open: true,
    },
  });

  return { id, dismiss, update };
}

function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: toastId => dispatch({ type: 'DISMISS_TOAST', toastId }),
  };
}

// -----------------------------
// Toast Container UI
// -----------------------------
export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <View pointerEvents="box-none" style={styles.container}>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </View>
  );
}

// -----------------------------
// Individual Toast with Swipe
// -----------------------------
function ToastItem({ toast, onDismiss }) {
  const slideY = useRef(new Animated.Value(-100)).current;
  const panX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        panX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 100) {
          Animated.timing(slideY, {
            toValue: -100,
            duration: 200,
            useNativeDriver: true,
          }).start(onDismiss);
        } else {
          Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    Animated.timing(slideY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    if (toast.open === false) {
      Animated.timing(slideY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(onDismiss);
    }
  }, [toast.open]);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          transform: [{ translateY: slideY }, { translateX: panX }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Text style={styles.title}>{toast.title}</Text>
      {toast.description && (
        <Text style={styles.description}>{toast.description}</Text>
      )}
      <TouchableOpacity onPress={onDismiss}>
        <Text style={styles.close}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// -----------------------------
// Styles
// -----------------------------
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    width: width,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    backgroundColor: '#333',
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
    minWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  title: { color: '#fff', fontWeight: 'bold' },
  description: { color: '#fff', marginTop: 4 },
  close: {
    color: '#fff',
    marginTop: 8,
    alignSelf: 'flex-end',
    fontWeight: 'bold',
  },
});

export { useToast, toast };
