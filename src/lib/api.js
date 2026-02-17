import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleAutoLogout } from './authSession';
import { BASE_URL } from '../config';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-platform': 'mobile', // 👈 Yeh hamesha rahega
  },
  withCredentials: false,
});

api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const status = error?.response?.status;

    // Only auto-logout if token exists (i.e., user is logged in)
    const token = await AsyncStorage.getItem('token');
    if (status === 401 && token) {
      await handleAutoLogout('Token expired or invalid');
      console.log('Token expired or invalid — auto-logout triggered');
    }

    return Promise.reject(error);
  },
);

export default api;
