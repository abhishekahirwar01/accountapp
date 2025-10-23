// src/lib/authService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { navigationRef } from '../navigation/RootNavigation';

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

// Save & clear session
export const saveSession = async (token, user) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  await AsyncStorage.setItem(ROLE_KEY, user.role || '');
  if (user.slug) await AsyncStorage.setItem(CLIENT_SLUG_KEY, user.slug);
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove([
    TOKEN_KEY,
    USER_KEY,
    ROLE_KEY,
    CLIENT_SLUG_KEY,
  ]);
};

export const getCurrentUser = async () => {
  const userStr = await AsyncStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

// -----------------------------
// LOGIN FUNCTIONS
// -----------------------------

// 🔹 Master Admin Login
export const loginMasterAdmin = async (username, password) => {
  console.log('🌍 [API] Master Admin login', { username });
  if (!username || !password) throw new Error('Username and password required');

  try {
    const res = await api.post('/api/master-admin/login', { username, password });
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
    console.error('❌ Master Admin login failed:', err);
    throw err;
  }
};

// 🔹 Client Login by Username
export const loginClient = async (clientUsername, password) => {
  console.log('🌍 [API] Client login', { clientUsername });

  if (!clientUsername || !password)
    throw new Error('Username and password required');

  try {
    const res = await api.post('/api/clients/login', { clientUsername, password });
    const data = res.data;

    if (!data?.client || !data?.token)
      throw new Error('Invalid server response');

    const user = {
      name: data.client.contactName,
      username: data.client.clientUsername,
      email: data.client.email,
      role: 'customer',
      token: data.token,
      slug: data.client.slug,
      avatar: '/avatars/02.png',
      initials: data.client.contactName?.substring(0, 2)?.toUpperCase() || 'CU',
    };

    await saveSession(user.token, user);
    return user;
  } catch (err) {
    console.error('❌ Client login failed:', err);
    throw err;
  }
};

// 🔹 Client Login by Slug (added from Next.js)
export const loginClientBySlug = async (clientUsername, password) => {
  console.log('🌍 [API] Client login by slug', { clientUsername });

  if (!clientUsername || !password)
    throw new Error('Username and password required');

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
    console.error('❌ loginClientBySlug failed:', err);
    throw err;
  }
};

// 🔹 Request OTP for client
export const requestClientOtp = async (clientUsername) => {
  if (!clientUsername) throw new Error('Username required');
  try {
    const res = await api.post('/api/clients/request-otp', { clientUsername });
    return res.data;
  } catch (err) {
    console.error('❌ Request OTP failed:', err);
    throw err;
  }
};

// 🔹 Client login with OTP (alias for loginClientBySlugWithOtp)
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
    console.error('❌ Client OTP login failed:', err);
    throw err;
  }
};

// 🔹 Employee/User Login (admin / manager / user)
export const loginUser = async (userId, password) => {
  console.log('🌍 [API] User login', { userId });
  if (!userId || !password) throw new Error('User ID and password required');

  try {
    const res = await api.post('/api/users/login', { userId, password });
    const data = res.data;

    const role = normalizeRole(data.user.role || data.roleName || '');
    const username =
      data.user.username ||
      data.user.userName ||
      data.user.userId ||
      '';

    const user = {
      ...data.user,
      role,
      username,
      token: data.token,
      avatar: '/avatars/03.png',
      initials: (data.user.name || username).substring(0, 2).toUpperCase(),
    };

    await saveSession(data.token, user);
    return user;
  } catch (err) {
    console.error('❌ User login failed:', err);
    throw err;
  }
};

// -----------------------------
// LOGOUT
// -----------------------------
export const logout = async () => {
  await clearSession();
  console.log('👋 User logged out');

  if (navigationRef.isReady()) {
    navigationRef.navigate('GettingStarted');
  }
};
