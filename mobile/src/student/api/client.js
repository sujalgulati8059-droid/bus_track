import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config';

const TOKEN_KEY = 'studentToken';
const client = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// AuthContext registers a handler so an expired token drops the user to the login screen.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };
client.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || '';
    const isAuthCall =
      url.includes('/login') ||
      url.includes('/register') ||
      url.includes('/otp') ||
      url.includes('/uid') ||
      url.includes('/signup') ||
      url.includes('/password/setup');
    if (err.response?.status === 401 && !isAuthCall && onUnauthorized) onUnauthorized();
    return Promise.reject(err);
  }
);

export const setStudentToken = async (token) => {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
};
export const getStudentToken = () => AsyncStorage.getItem(TOKEN_KEY);

export default client;
