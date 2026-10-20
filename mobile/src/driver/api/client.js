import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL, SOCKET_BASE_URL } from "../../config";
export { API_BASE_URL, SOCKET_BASE_URL };

const client = axios.create({ baseURL: API_BASE_URL, timeout: 70000 });

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('driverToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const setDriverToken = async (token) => {
  if (token) await AsyncStorage.setItem('driverToken', token);
  else await AsyncStorage.removeItem('driverToken');
};

export const getDriverToken = () => AsyncStorage.getItem('driverToken');

export default client;
