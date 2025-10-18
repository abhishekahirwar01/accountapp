import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode"; // ✅ named import for v4+

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

let logoutTimer = null;

export async function saveSession(token, user) {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to save session:', error);
    throw error;
  }
}

export async function getToken() {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get token:', error);
    return null;
  }
}

export async function getCurrentUserNew() {
  const token = await getToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode(token); // ✅ use named import
    if (decoded.exp * 1000 <= Date.now()) {
      await clearSession();
      return null;
    }

    const userStr = await AsyncStorage.getItem(USER_KEY);
    const user = userStr ? JSON.parse(userStr) : undefined;
    return { token, decoded, user };
  } catch (error) {
    console.error('Failed to get current user:', error);
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  try {
    if (logoutTimer) clearTimeout(logoutTimer);
    logoutTimer = null;
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  } catch (error) {
    console.error('Failed to clear session:', error);
    throw error;
  }
}

export async function scheduleAutoLogout(token, onLogout) {
  try {
    const decoded = jwtDecode(token); // ✅ use named import
    const msLeft = decoded.exp * 1000 - Date.now();

    if (logoutTimer) clearTimeout(logoutTimer);
    if (msLeft <= 0) return onLogout();

    logoutTimer = setTimeout(() => onLogout(), msLeft);
  } catch (error) {
    console.error('Failed to schedule auto logout:', error);
    onLogout();
  }
}

// Additional utility functions with proper JWT handling
export function decodeTokenPayload(token) {
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Failed to decode token:', error);
    throw new Error('Invalid token format');
  }
}

export function decodeTokenHeader(token) {
  try {
    return jwtDecode(token, { header: true });
  } catch (error) {
    console.error('Failed to decode token header:', error);
    throw new Error('Invalid token format');
  }
}

export function isTokenValid(token) {
  try {
    const decoded = jwtDecode(token);
    return decoded.exp * 1000 > Date.now();
  } catch (error) {
    return false;
  }
}

export function getTokenExpiry(token) {
  try {
    const decoded = jwtDecode(token);
    return new Date(decoded.exp * 1000);
  } catch (error) {
    console.error('Failed to get token expiry:', error);
    return null;
  }
}