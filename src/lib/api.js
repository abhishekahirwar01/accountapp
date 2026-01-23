import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearSession } from './authSession';
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

    if (status === 401) {
      await clearSession();
      console.log('Token expired or invalid — cleared session');
      // DO NOT navigate here. Toast will show from handleLogin
    }

    return Promise.reject(error);
  },
);

export default api;
