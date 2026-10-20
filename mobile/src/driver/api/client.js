import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL, SOCKET_BASE_URL } from "../../config";
export { API_BASE_URL, SOCKET_BASE_URL };

const MAX_RETRIES = 3;
const client = axios.create({ baseURL: API_BASE_URL, timeout: 60000 });

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('driverToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const isNetworkError = !error.response && Boolean(error.request);
    const isBareRenderError =
      [502, 503, 504].includes(error.response?.status) && !error.response?.data?.error;

    if (!config || (!isNetworkError && !isBareRenderError) || (config.__retryCount || 0) >= MAX_RETRIES) {
      return Promise.reject(error);
    }

    config.__retryCount = (config.__retryCount || 0) + 1;
    await new Promise((resolve) => setTimeout(resolve, config.__retryCount * 1000));
    return client(config);
  }
);

export const setDriverToken = async (token) => {
  if (token) await AsyncStorage.setItem('driverToken', token);
  else await AsyncStorage.removeItem('driverToken');
};

export const getDriverToken = () => AsyncStorage.getItem('driverToken');
export const pingHealth = () => client.get(`${SOCKET_BASE_URL}/health`);

export default client;
