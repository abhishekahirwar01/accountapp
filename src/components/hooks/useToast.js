// useToast.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  PanResponder,
} from 'react-native';

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 3000; // 3 seconds

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const listeners = [];
let memoryState = { toasts: [] };
const toastTimeouts = new Map();

function dispatch(action) {
  switch (action.type) {
    case 'ADD_TOAST':
      memoryState = {
        ...memoryState,
        toasts: [action.toast, ...memoryState.toasts].slice(0, TOAST_LIMIT),
      };
      break;

    case 'UPDATE_TOAST':
      memoryState = {
        ...memoryState,
        toasts: memoryState.toasts.map(t =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };
      break;

    case 'DISMISS_TOAST':
      memoryState = {
        ...memoryState,
        toasts: memoryState.toasts.map(t =>
          t.id === action.toastId || action.toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      };
      if (action.toastId) addToRemoveQueue(action.toastId);
      else memoryState.toasts.forEach(t => addToRemoveQueue(t.id));
      break;

    case 'REMOVE_TOAST':
      memoryState = {
        ...memoryState,
        toasts: memoryState.toasts.filter(t => t.id !== action.toastId),
      };
      toastTimeouts.delete(action.toastId);
      break;
  }
  listeners.forEach(fn => fn(memoryState));
}

function addToRemoveQueue(toastId) {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: 'REMOVE_TOAST', toastId });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
}

// Main toast function
export function toast({ title, description }) {
  const id = genId();
  const newToast = { id, title, description, open: true };

  const update = props => dispatch({ type: 'UPDATE_TOAST', toast: { ...props, id } });
  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id });

  dispatch({ type: 'ADD_TOAST', toast: newToast });
  addToRemoveQueue(id);

  return { id, update, dismiss };
}

// Hook to use toasts
export function useToast() {
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
    update: (toastId, props) => dispatch({ type: 'UPDATE_TOAST', toast: { ...props, id: toastId } }),
  };
}

// Animated Toast Component
function AnimatedToast({ toast, onDismiss }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 100) {
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(onDismiss);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.toast,
        { opacity, transform: [{ translateX }] },
      ]}
    >
      <TouchableOpacity onPress={onDismiss}>
        <Text style={styles.title}>{toast.title}</Text>
        {toast.description && <Text style={styles.desc}>{toast.description}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Container to render toasts
export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map(t => t.open && (
        <AnimatedToast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    minWidth: '60%',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  desc: {
    color: '#fff',
    fontSize: 12,
  },
});
