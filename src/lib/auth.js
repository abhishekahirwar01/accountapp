// src/lib/authService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { navigationRef } from '../navigation/RootNavigation';
// Storage keys
const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const ROLE_KEY = 'role';
const CLIENT_SLUG_KEY = 'tenantSlug';

// -----------------------------
// Helpers
// -----------------------------
export const normalizeRole = (r = '') => {
  const s = r.trim().toLowerCase();
  if (s === 'viewer' || s === 'accountant') return 'user';
  return s;
};

export const saveSession = async (token, user) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  await AsyncStorage.setItem(ROLE_KEY, user.role || '');
  if (user.slug) await AsyncStorage.setItem(CLIENT_SLUG_KEY, user.slug);
};

export const clearSession = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
  await AsyncStorage.removeItem(ROLE_KEY);
  await AsyncStorage.removeItem(CLIENT_SLUG_KEY);
};

// Get current user from AsyncStorage
export const getCurrentUser = async () => {
  const userStr = await AsyncStorage.getItem(USER_KEY);
  if (!userStr) return null;
  return JSON.parse(userStr);
};

// -----------------------------
// Login Functions
// -----------------------------

// Master Admin login
export const loginMasterAdmin = async (username, password) => {
  console.log("Calling API:", `/api/master-admin/login`);
  console.log("Payload:", { username, password });

  if (!username || !password) throw new Error('Username and password required');

  try {
    const res = await api.post('/api/master-admin/login', { username, password });
    console.log("Server response:", res.data);

    const data = res.data;

    const user = {
      name: data.admin.username,
      username: data.admin.username,
      email: `${data.admin.username}@accountech.com`,
      role: 'master',
      token: data.token,
      avatar: '/avatars/01.png',
      initials: data.admin.username.substring(0, 2).toUpperCase(),
    };

    await saveSession(user.token, user);
    return user;
  } catch (err) {
    if (err.response) {
      console.error('Server responded with status:', err.response.status);
      console.error('Server response data:', err.response.data);
    } else if (err.request) {
      console.error('No response received:', err.request);
    } else {
      console.error('Axios error:', err.message);
    }
    throw err;
  }
};


// Client login (password)
export const loginClient = async (clientUsername, password) => {
  if (!clientUsername || !password) throw new Error('Username and password required');

  try {
    const res = await api.post('/api/clients/login', { clientUsername, password });
    const data = res.data;

    const user = {
      name: data.client.contactName,
      username: data.client.clientUsername,
      email: data.client.email,
      role: 'customer',
      token: data.token,
      slug: data.client.slug,
      avatar: '/avatars/02.png',
      initials: data.client.contactName.substring(0, 2).toUpperCase(),
    };

    await saveSession(user.token, user);
    return user;
  } catch (err) {
    console.error('Client login failed:', err);
    throw err;
  }
};

// Client login via OTP
export const loginClientWithOtp = async (clientUsername, otp) => {
  if (!clientUsername || !otp) throw new Error('Username and OTP required');

  try {
    const res = await api.post('/api/clients/login-otp', { clientUsername, otp });
    const data = res.data;

    const user = {
      name: data.client.contactName,
      username: data.client.clientUsername,
      email: data.client.email,
      role: 'customer',
      token: data.token,
      slug: data.client.slug,
      avatar: '/avatars/02.png',
      initials: data.client.contactName.substring(0, 2).toUpperCase(),
    };

    await saveSession(user.token, user);
    return user;
  } catch (err) {
    console.error('Client OTP login failed:', err);
    throw err;
  }
};

// Request OTP for client
export const requestClientOtp = async (clientUsername) => {
  if (!clientUsername) throw new Error('Username required');

  try {
    const res = await api.post('/api/clients/request-otp', { clientUsername });
    return res.data;
  } catch (err) {
    console.error('Request OTP failed:', err);
    throw err;
  }
};

// Employee/User login (admin / manager / user)
export const loginUser = async (userId, password) => {
  if (!userId || !password) throw new Error('User ID and password required');

  try {
    const res = await api.post('/api/users/login', { userId, password });
    const data = res.data;

    const role = normalizeRole(data.user.role || data.roleName || '');
    const username = data.user.username || data.user.userName || data.user.userId || '';

    const user = {
      ...data.user,
      role,
      username,
      avatar: '/avatars/03.png',
      initials: (data.user.name || username).substring(0, 2).toUpperCase(),
    };

    await saveSession(data.token, user);
    return user;
  } catch (err) {
    console.error('User login failed:', err);
    throw err;
  }
};

// -----------------------------
// Logout
// -----------------------------
export const logout = async () => {
  await clearSession();
  console.log('User logged out');
  
  // Direct navigation using ref
  if (navigationRef.isReady()) {
    navigationRef.navigate('GettingStarted');
  }
};
